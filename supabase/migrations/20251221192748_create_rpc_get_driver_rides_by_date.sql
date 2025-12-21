/*
  # Create RPC function to get driver rides by date
  
  1. Purpose
    - Fetch all completed rides for a specific driver on a given date
    - Used to show commission breakdown in the vendor app
  
  2. Function Details
    - Name: get_driver_rides_by_date
    - Parameters:
      - p_vendor_id (uuid): The vendor ID
      - p_driver_name (text): The driver's name
      - p_date (date): The date to fetch rides for
    - Returns: Table of ride details with fare amounts
  
  3. Security
    - Function runs with SECURITY DEFINER to access ride data
    - Validates that the driver belongs to the requesting vendor
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
    AND DATE(r.created_at) = p_date
  ORDER BY r.created_at DESC;
END;
$$;