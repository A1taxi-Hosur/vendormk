/*
  # Fix scheduled ride commission wallet deduction

  ## Problem
  Scheduled ride completions (outstation, rental, airport) store `driver_name = 'Driver'`
  (a generic placeholder from the booking flow) with the correct `driver_id`. The trigger
  functions resolve the real driver name via `resolve_driver_name()` before calling
  `update_driver_daily_amounts_owed(real_name, date)`. However, inside that function, all
  four completion-table queries filter by `driver_name = driver_name_param` only — so the
  scheduled completion row (stored as 'Driver') is never matched, its commission is
  excluded from the daily total, and no wallet debit is ever created.

  Local rides work correctly because they store the real driver_name in trip_completions.

  ## Fix
  Update `update_driver_daily_amounts_owed` to also resolve the driver_id from the
  passed-in name, then match each completion table by `driver_name = param OR driver_id =
  resolved_id`. This captures scheduled completions regardless of the stored driver_name.

  ## Affected Functions
  - `update_driver_daily_amounts_owed(text, date)` — now resolves driver_id and matches
    by both name and id
*/

CREATE OR REPLACE FUNCTION update_driver_daily_amounts_owed(driver_name_param text, date_param date)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  local_owed numeric := 0;
  rental_owed numeric := 0;
  airport_owed numeric := 0;
  outstation_owed numeric := 0;
  daily_total numeric := 0;
  v_driver_id uuid;
BEGIN
  IF driver_name_param IS NULL OR trim(driver_name_param) = '' THEN
    RETURN;
  END IF;

  -- Safety guard: do not aggregate on generic placeholder names
  IF lower(trim(driver_name_param)) = 'driver' THEN
    RETURN;
  END IF;

  -- Resolve the driver_id from the driver name so we can match scheduled
  -- completions that store driver_name='Driver' but have the correct driver_id.
  SELECT id INTO v_driver_id FROM drivers WHERE name = driver_name_param LIMIT 1;

  SELECT COALESCE(SUM(total_amount_owed), 0) INTO local_owed
  FROM trip_completions
  WHERE (driver_name = driver_name_param OR (v_driver_id IS NOT NULL AND driver_id = v_driver_id))
  AND DATE(completed_at AT TIME ZONE 'Asia/Kolkata') = date_param;

  SELECT COALESCE(SUM(total_amount_owed), 0) INTO rental_owed
  FROM rental_trip_completions
  WHERE (driver_name = driver_name_param OR (v_driver_id IS NOT NULL AND driver_id = v_driver_id))
  AND DATE(completed_at AT TIME ZONE 'Asia/Kolkata') = date_param;

  SELECT COALESCE(SUM(total_amount_owed), 0) INTO airport_owed
  FROM airport_trip_completions
  WHERE (driver_name = driver_name_param OR (v_driver_id IS NOT NULL AND driver_id = v_driver_id))
  AND DATE(completed_at AT TIME ZONE 'Asia/Kolkata') = date_param;

  SELECT COALESCE(SUM(total_amount_owed), 0) INTO outstation_owed
  FROM outstation_trip_completions
  WHERE (driver_name = driver_name_param OR (v_driver_id IS NOT NULL AND driver_id = v_driver_id))
  AND DATE(completed_at AT TIME ZONE 'Asia/Kolkata') = date_param;

  daily_total := local_owed + rental_owed + airport_owed + outstation_owed;

  IF daily_total = 0 THEN
    RETURN;
  END IF;

  INSERT INTO driver_daily_amounts_owed (
    driver_name,
    aggregation_date,
    local_trip_owed,
    rental_trip_owed,
    airport_trip_owed,
    outstation_trip_owed,
    daily_total_owed,
    cumulative_total_owed
  ) VALUES (
    driver_name_param,
    date_param,
    local_owed,
    rental_owed,
    airport_owed,
    outstation_owed,
    daily_total,
    daily_total
  )
  ON CONFLICT (driver_name, aggregation_date)
  DO UPDATE SET
    local_trip_owed = EXCLUDED.local_trip_owed,
    rental_trip_owed = EXCLUDED.rental_trip_owed,
    airport_trip_owed = EXCLUDED.airport_trip_owed,
    outstation_trip_owed = EXCLUDED.outstation_trip_owed,
    daily_total_owed = EXCLUDED.daily_total_owed,
    cumulative_total_owed = EXCLUDED.cumulative_total_owed,
    updated_at = now();
END;
$$;
