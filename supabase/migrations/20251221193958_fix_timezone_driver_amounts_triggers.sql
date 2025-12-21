/*
  # Fix Timezone Issues in Driver Amount Triggers
  
  1. Problem
    - Commission allocations appear on wrong dates (day+1)
    - Triggers use DATE(completed_at) which extracts UTC date
    - Users are in India (UTC+5:30), causing date mismatch
  
  2. Solution
    - Update all trigger functions to use Asia/Kolkata timezone
    - Use DATE(completed_at AT TIME ZONE 'Asia/Kolkata')
    - This ensures dates match Indian Standard Time
  
  3. Updated Functions
    - trigger_update_driver_amounts_trip_completions
    - trigger_update_driver_amounts_rental_completions
    - trigger_update_driver_amounts_airport_completions
    - trigger_update_driver_amounts_outstation_completions
*/

-- Fix trigger for regular trip completions
CREATE OR REPLACE FUNCTION trigger_update_driver_amounts_trip_completions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM update_driver_daily_amounts_owed(NEW.driver_name, DATE(NEW.completed_at AT TIME ZONE 'Asia/Kolkata'));
  RETURN NEW;
END;
$$;

-- Fix trigger for rental trip completions
CREATE OR REPLACE FUNCTION trigger_update_driver_amounts_rental_completions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM update_driver_daily_amounts_owed(NEW.driver_name, DATE(NEW.completed_at AT TIME ZONE 'Asia/Kolkata'));
  RETURN NEW;
END;
$$;

-- Fix trigger for airport trip completions
CREATE OR REPLACE FUNCTION trigger_update_driver_amounts_airport_completions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM update_driver_daily_amounts_owed(NEW.driver_name, DATE(NEW.completed_at AT TIME ZONE 'Asia/Kolkata'));
  RETURN NEW;
END;
$$;

-- Fix trigger for outstation trip completions
CREATE OR REPLACE FUNCTION trigger_update_driver_amounts_outstation_completions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM update_driver_daily_amounts_owed(NEW.driver_name, DATE(NEW.completed_at AT TIME ZONE 'Asia/Kolkata'));
  RETURN NEW;
END;
$$;