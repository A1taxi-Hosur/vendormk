/*
  # Fix Timezone Issue in Driver Rides Query
  
  1. Problem
    - Rides are showing up on wrong dates (day+1)
    - DATE(created_at) converts timestamp in UTC timezone
    - User is in India (UTC+5:30), causing date mismatch
  
  2. Solution
    - Convert timestamp to Asia/Kolkata timezone before extracting date
    - This ensures rides show on the correct date for Indian users
  
  3. Changes
    - Update get_driver_rides_by_date function to use Asia/Kolkata timezone
*/

CREATE OR REPLACE FUNCTION get_driver_rides_by_date(
  p_vendor_id uuid,
  p_driver_name text,
  p_date date
)
RETURNS TABLE (
  ride_code text,
  fare_amount numeric,
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
  SELECT 
    r.ride_code,
    r.fare_amount,
    r.pickup_address,
    r.destination_address,
    r.distance_km,
    r.created_at,
    r.booking_type
  FROM rides r
  INNER JOIN drivers d ON r.driver_id = d.id
  WHERE d.vendor_id = p_vendor_id
    AND d.name = p_driver_name
    AND r.status = 'completed'
    AND DATE(r.created_at AT TIME ZONE 'Asia/Kolkata') = p_date
  ORDER BY r.created_at DESC;
END;
$$;