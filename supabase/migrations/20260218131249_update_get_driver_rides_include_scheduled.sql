/*
  # Update get_driver_rides_by_date to include scheduled rides
  
  1. Problem
    - Current function only queries the 'rides' table for local rides
    - Scheduled rides (rental, airport, outstation) are stored in separate completion tables
    - Driver commissions from scheduled rides are not shown in the Drivers tab
  
  2. Solution
    - Update the function to UNION data from all completion tables:
      - trip_completions (local rides)
      - rental_trip_completions (rental rides)
      - airport_trip_completions (airport rides)
      - outstation_trip_completions (outstation rides)
    - Use ride_id as the unique identifier
    - Show total_amount_owed as commission_amount directly from completion tables
  
  3. Changes
    - Replace query from 'rides' table with UNION of all completion tables
    - Use ride_id to generate ride_code
    - Use total_amount_owed as commission_amount
    - Include booking_type to distinguish ride types
*/

DROP FUNCTION IF EXISTS get_driver_rides_by_date(uuid, text, date);

CREATE OR REPLACE FUNCTION get_driver_rides_by_date(
  p_vendor_id uuid,
  p_driver_name text,
  p_date date
)
RETURNS TABLE (
  ride_code text,
  fare_amount numeric,
  commission_amount numeric,
  pickup_address text,
  destination_address text,
  distance_km numeric,
  created_at timestamptz,
  booking_type text
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Local rides from trip_completions
  SELECT 
    'L-' || SUBSTRING(tc.ride_id::text, 1, 8) AS ride_code,
    tc.total_fare AS fare_amount,
    tc.total_amount_owed AS commission_amount,
    tc.pickup_address,
    tc.destination_address,
    tc.actual_distance_km AS distance_km,
    tc.completed_at AS created_at,
    'Local'::text AS booking_type
  FROM trip_completions tc
  INNER JOIN drivers d ON tc.driver_id = d.id
  WHERE d.vendor_id = p_vendor_id
    AND tc.driver_name = p_driver_name
    AND DATE(tc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
  
  UNION ALL
  
  -- Rental rides from rental_trip_completions
  SELECT 
    'R-' || SUBSTRING(rtc.ride_id::text, 1, 8) AS ride_code,
    rtc.total_fare AS fare_amount,
    rtc.total_amount_owed AS commission_amount,
    rtc.pickup_address,
    rtc.destination_address,
    rtc.actual_distance_km AS distance_km,
    rtc.completed_at AS created_at,
    'Rental'::text AS booking_type
  FROM rental_trip_completions rtc
  INNER JOIN drivers d ON rtc.driver_id = d.id
  WHERE d.vendor_id = p_vendor_id
    AND rtc.driver_name = p_driver_name
    AND DATE(rtc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
  
  UNION ALL
  
  -- Airport rides from airport_trip_completions
  SELECT 
    'A-' || SUBSTRING(atc.ride_id::text, 1, 8) AS ride_code,
    atc.total_fare AS fare_amount,
    atc.total_amount_owed AS commission_amount,
    atc.pickup_address,
    atc.destination_address,
    atc.actual_distance_km AS distance_km,
    atc.completed_at AS created_at,
    'Airport'::text AS booking_type
  FROM airport_trip_completions atc
  INNER JOIN drivers d ON atc.driver_id = d.id
  WHERE d.vendor_id = p_vendor_id
    AND atc.driver_name = p_driver_name
    AND DATE(atc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
  
  UNION ALL
  
  -- Outstation rides from outstation_trip_completions
  SELECT 
    'O-' || SUBSTRING(otc.ride_id::text, 1, 8) AS ride_code,
    otc.total_fare AS fare_amount,
    otc.total_amount_owed AS commission_amount,
    otc.pickup_address,
    otc.destination_address,
    otc.actual_distance_km AS distance_km,
    otc.completed_at AS created_at,
    'Outstation'::text AS booking_type
  FROM outstation_trip_completions otc
  INNER JOIN drivers d ON otc.driver_id = d.id
  WHERE d.vendor_id = p_vendor_id
    AND otc.driver_name = p_driver_name
    AND DATE(otc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
  
  ORDER BY created_at DESC;
END;
$$;
