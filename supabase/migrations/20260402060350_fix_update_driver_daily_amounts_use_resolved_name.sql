/*
  # Fix update_driver_daily_amounts_owed to prevent cross-vendor aggregation

  ## Problem
  The update_driver_daily_amounts_owed function aggregates all trips matching
  a given driver_name on a given date. When driver_name = "Driver" (generic),
  this incorrectly aggregates trips from ALL vendors whose drivers used that
  placeholder name.

  ## Fix
  The function now checks if the incoming name is generic ("Driver", null, or empty).
  If so, it returns early — the trigger functions now always pass the resolved real
  name before calling this function, so a generic name arriving here means something
  is wrong and we should not aggregate.

  This acts as a safety guard in addition to the trigger-level fix.
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
BEGIN
  IF driver_name_param IS NULL OR trim(driver_name_param) = '' THEN
    RETURN;
  END IF;

  -- Safety guard: do not aggregate on generic placeholder names
  IF lower(trim(driver_name_param)) = 'driver' THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(total_amount_owed), 0) INTO local_owed
  FROM trip_completions
  WHERE driver_name = driver_name_param
  AND DATE(completed_at AT TIME ZONE 'Asia/Kolkata') = date_param;

  SELECT COALESCE(SUM(total_amount_owed), 0) INTO rental_owed
  FROM rental_trip_completions
  WHERE driver_name = driver_name_param
  AND DATE(completed_at AT TIME ZONE 'Asia/Kolkata') = date_param;

  SELECT COALESCE(SUM(total_amount_owed), 0) INTO airport_owed
  FROM airport_trip_completions
  WHERE driver_name = driver_name_param
  AND DATE(completed_at AT TIME ZONE 'Asia/Kolkata') = date_param;

  SELECT COALESCE(SUM(total_amount_owed), 0) INTO outstation_owed
  FROM outstation_trip_completions
  WHERE driver_name = driver_name_param
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
