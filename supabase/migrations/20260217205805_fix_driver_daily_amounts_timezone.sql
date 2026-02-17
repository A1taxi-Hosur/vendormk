/*
  # Fix timezone mismatch in update_driver_daily_amounts_owed

  ## Problem
  The trigger passes dates using Asia/Kolkata timezone (IST), but the
  update_driver_daily_amounts_owed function queries trip completions using
  DATE(completed_at) in UTC. This mismatch causes rides completed late in the
  day IST (which are next-day UTC) to return daily_total = 0, so no record is
  written to driver_daily_amounts_owed — causing commission to show as zero.

  ## Fix
  All DATE() comparisons inside update_driver_daily_amounts_owed now use
  DATE(completed_at AT TIME ZONE 'Asia/Kolkata') to match IST dates.
*/

CREATE OR REPLACE FUNCTION update_driver_daily_amounts_owed(
  driver_name_param text,
  date_param date
)
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
  IF driver_name_param IS NULL OR driver_name_param = '' THEN
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
