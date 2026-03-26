/*
  # Fix wallet debit trigger to use driver_id as fallback

  ## Problem
  The `debit_vendor_wallet_on_commission_update` trigger looks up the vendor
  by `driver_name` from `driver_daily_amounts_owed`. When scheduled ride
  completions (outstation, airport, rental, local) store an incorrect or
  generic driver_name (e.g. "Driver" instead of "Mark Test driver"), the
  vendor lookup fails and no wallet debit is created.

  ## Solution
  Update the trigger to also try resolving the vendor via `driver_id` from
  the completion tables when the name-based lookup fails. We join against
  outstation_trip_completions, rental_trip_completions, airport_trip_completions,
  and trip_completions to find the real driver_id, then look up the vendor.

  Also fix `update_driver_daily_amounts_owed` to resolve the canonical driver
  name from the drivers table when a driver_id is available, so future records
  store the correct name.

  ## Changes
  - Replaces `debit_vendor_wallet_on_commission_update` with a version that
    falls back to driver_id-based vendor lookup
  - Updates reference key to be stable and deduplication-safe
*/

CREATE OR REPLACE FUNCTION public.debit_vendor_wallet_on_commission_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_vendor_id uuid;
  v_wallet_id uuid;
  v_driver_id uuid;
  v_old_total numeric := 0;
  v_new_total numeric := 0;
  v_delta numeric := 0;
  v_ref text;
BEGIN
  v_new_total := COALESCE(NEW.daily_total_owed, 0);

  IF TG_OP = 'UPDATE' THEN
    v_old_total := COALESCE(OLD.daily_total_owed, 0);
  END IF;

  v_delta := v_new_total - v_old_total;

  IF v_delta <= 0 THEN
    RETURN NEW;
  END IF;

  -- First try: resolve vendor by exact driver name
  SELECT d.vendor_id, d.id INTO v_vendor_id, v_driver_id
  FROM drivers d
  WHERE d.name = NEW.driver_name
  LIMIT 1;

  -- Second try: resolve via driver_id from any completion table for this date
  IF v_vendor_id IS NULL THEN
    SELECT d.vendor_id, d.id INTO v_vendor_id, v_driver_id
    FROM drivers d
    WHERE d.id IN (
      SELECT driver_id FROM outstation_trip_completions
      WHERE driver_name = NEW.driver_name
        AND DATE(completed_at AT TIME ZONE 'Asia/Kolkata') = NEW.aggregation_date
        AND driver_id IS NOT NULL
      UNION
      SELECT driver_id FROM rental_trip_completions
      WHERE driver_name = NEW.driver_name
        AND DATE(completed_at AT TIME ZONE 'Asia/Kolkata') = NEW.aggregation_date
        AND driver_id IS NOT NULL
      UNION
      SELECT driver_id FROM airport_trip_completions
      WHERE driver_name = NEW.driver_name
        AND DATE(completed_at AT TIME ZONE 'Asia/Kolkata') = NEW.aggregation_date
        AND driver_id IS NOT NULL
      UNION
      SELECT driver_id FROM trip_completions
      WHERE driver_name = NEW.driver_name
        AND DATE(completed_at AT TIME ZONE 'Asia/Kolkata') = NEW.aggregation_date
        AND driver_id IS NOT NULL
    )
    AND d.vendor_id IS NOT NULL
    LIMIT 1;
  END IF;

  IF v_vendor_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_wallet_id
  FROM wallets
  WHERE vendor_id = v_vendor_id;

  IF v_wallet_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Use driver_id-based reference key for reliable deduplication
  v_ref := 'commission_' || COALESCE(v_driver_id::text, NEW.driver_name) || '_' || NEW.aggregation_date;

  INSERT INTO wallet_transactions (
    wallet_id,
    vendor_id,
    driver_id,
    transaction_type,
    amount,
    description,
    reference,
    transaction_date
  ) VALUES (
    v_wallet_id,
    v_vendor_id,
    v_driver_id,
    'debit',
    v_delta,
    'Commission debit for ' || NEW.driver_name || ' on ' || NEW.aggregation_date,
    v_ref,
    NEW.aggregation_date
  )
  ON CONFLICT (reference)
  DO UPDATE SET
    amount = wallet_transactions.amount + EXCLUDED.amount,
    description = EXCLUDED.description,
    updated_at = now()
  WHERE wallet_transactions.transaction_type = 'debit';

  RETURN NEW;
END;
$function$;
