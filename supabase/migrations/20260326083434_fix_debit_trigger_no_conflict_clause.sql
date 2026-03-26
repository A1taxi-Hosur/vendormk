/*
  # Fix debit trigger - remove ON CONFLICT (no unique constraint on reference)

  Cleans up the previous migration's ON CONFLICT clause since wallet_transactions
  has no unique constraint on the reference column and no updated_at column.
  The delta-based logic already prevents double-debiting on repeat triggers.
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
BEGIN
  v_new_total := COALESCE(NEW.daily_total_owed, 0);

  IF TG_OP = 'UPDATE' THEN
    v_old_total := COALESCE(OLD.daily_total_owed, 0);
  END IF;

  v_delta := v_new_total - v_old_total;

  IF v_delta <= 0 THEN
    RETURN NEW;
  END IF;

  -- First try: resolve vendor by exact driver name match in drivers table
  SELECT d.vendor_id, d.id INTO v_vendor_id, v_driver_id
  FROM drivers d
  WHERE d.name = NEW.driver_name
  LIMIT 1;

  -- Second try: resolve via driver_id from any completion table for this date
  -- Handles cases where completion stores a generic/wrong driver_name
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
    'commission_' || COALESCE(v_driver_id::text, NEW.driver_name) || '_' || NEW.aggregation_date,
    NEW.aggregation_date
  );

  RETURN NEW;
END;
$function$;
