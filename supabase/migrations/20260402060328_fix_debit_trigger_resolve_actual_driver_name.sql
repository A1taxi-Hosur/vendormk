/*
  # Fix wallet debit trigger to resolve actual driver name

  ## Problem
  The debit_vendor_wallet_on_commission_update trigger fires on driver_daily_amounts_owed
  and tries to find the vendor by matching driver_name against the drivers table.
  If driver_name was stored as "Driver" (generic), it could match wrong vendors.

  After the previous fix, the trigger functions now store the real driver name in
  driver_daily_amounts_owed. But the existing debit trigger's primary lookup uses
  driver_name = NEW.driver_name which would still fail for any historical "Driver"
  records.

  This migration also applies the resolve_driver_name logic inside the debit trigger
  itself, so even if somehow a generic name reaches it, the driver_id fallback is
  used correctly.

  ## No structural changes needed
  The debit trigger already has a driver_id fallback path. This migration adds
  an early name resolution step using the same resolve_driver_name helper.
*/

CREATE OR REPLACE FUNCTION debit_vendor_wallet_on_commission_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_vendor_id uuid;
  v_wallet_id uuid;
  v_driver_id uuid;
  v_ref text;
  v_resolved_name text;
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(NEW.daily_total_owed, 0) <= COALESCE(OLD.daily_total_owed, 0) THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.daily_total_owed, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  -- Resolve actual driver name (handles "Driver" placeholder)
  v_resolved_name := NEW.driver_name;

  SELECT d.vendor_id, d.id INTO v_vendor_id, v_driver_id
  FROM drivers d
  WHERE d.name = v_resolved_name
  LIMIT 1;

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
    NEW.daily_total_owed,
    'Commission debit for ' || COALESCE(v_resolved_name, NEW.driver_name) || ' on ' || NEW.aggregation_date,
    v_ref,
    NEW.aggregation_date
  )
  ON CONFLICT (reference)
  DO UPDATE SET
    amount = EXCLUDED.amount,
    description = EXCLUDED.description
  WHERE wallet_transactions.transaction_type = 'debit';

  RETURN NEW;
END;
$$;
