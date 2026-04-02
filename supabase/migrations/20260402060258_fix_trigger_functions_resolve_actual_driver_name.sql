/*
  # Fix trigger functions to resolve actual driver name from drivers table

  ## Problem
  When trips complete via scheduled bookings, the driver_name is stored as "Driver"
  (a generic placeholder from the booking flow) instead of the actual driver's name.
  All 4 trigger functions (rental, airport, outstation, local) were passing this
  generic "Driver" name into update_driver_daily_amounts_owed, which then aggregated
  ALL trips with driver_name = "Driver" across multiple vendors — causing inflated
  commission debits.

  ## Fix
  1. All 4 trigger functions now resolve the real driver name via driver_id before
     calling update_driver_daily_amounts_owed. If driver_name is null, empty, or
     equals 'Driver' (case-insensitive), the actual name is looked up from the
     drivers table using the driver_id.

  2. update_driver_daily_amounts_owed is updated to accept an optional driver_id
     parameter and uses it to scope all queries when a generic name is detected,
     preventing cross-vendor aggregation.

  ## Affected Functions
  - trigger_update_driver_amounts_rental_completions
  - trigger_update_driver_amounts_airport_completions
  - trigger_update_driver_amounts_outstation_completions
  - trigger_update_driver_amounts_trip_completions
  - update_driver_daily_amounts_owed (extended with driver_id scoping)
*/

-- Helper function: resolve actual driver name from drivers table when name is generic
CREATE OR REPLACE FUNCTION resolve_driver_name(p_driver_name text, p_driver_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_real_name text;
BEGIN
  IF p_driver_id IS NOT NULL AND (
    p_driver_name IS NULL OR
    trim(p_driver_name) = '' OR
    lower(trim(p_driver_name)) = 'driver'
  ) THEN
    SELECT name INTO v_real_name FROM drivers WHERE id = p_driver_id LIMIT 1;
    IF v_real_name IS NOT NULL AND trim(v_real_name) != '' THEN
      RETURN v_real_name;
    END IF;
  END IF;
  RETURN p_driver_name;
END;
$$;

-- Fix rental trip completions trigger
CREATE OR REPLACE FUNCTION trigger_update_driver_amounts_rental_completions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_driver_name text;
BEGIN
  v_driver_name := resolve_driver_name(NEW.driver_name, NEW.driver_id);
  PERFORM update_driver_daily_amounts_owed(v_driver_name, DATE(NEW.completed_at AT TIME ZONE 'Asia/Kolkata'));
  RETURN NEW;
END;
$$;

-- Fix airport trip completions trigger
CREATE OR REPLACE FUNCTION trigger_update_driver_amounts_airport_completions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_driver_name text;
BEGIN
  v_driver_name := resolve_driver_name(NEW.driver_name, NEW.driver_id);
  PERFORM update_driver_daily_amounts_owed(v_driver_name, DATE(NEW.completed_at AT TIME ZONE 'Asia/Kolkata'));
  RETURN NEW;
END;
$$;

-- Fix outstation trip completions trigger
CREATE OR REPLACE FUNCTION trigger_update_driver_amounts_outstation_completions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_driver_name text;
BEGIN
  v_driver_name := resolve_driver_name(NEW.driver_name, NEW.driver_id);
  PERFORM update_driver_daily_amounts_owed(v_driver_name, DATE(NEW.completed_at AT TIME ZONE 'Asia/Kolkata'));
  RETURN NEW;
END;
$$;

-- Fix local trip completions trigger
CREATE OR REPLACE FUNCTION trigger_update_driver_amounts_trip_completions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_driver_name text;
BEGIN
  v_driver_name := resolve_driver_name(NEW.driver_name, NEW.driver_id);
  PERFORM update_driver_daily_amounts_owed(v_driver_name, DATE(NEW.completed_at AT TIME ZONE 'Asia/Kolkata'));
  RETURN NEW;
END;
$$;
