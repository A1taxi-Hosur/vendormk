/*
  # Fix timezone handling in get_driver_rides_by_date
  
  1. Problem
    - Function uses DATE(r.created_at) which uses UTC timezone
    - Users are in India (UTC+5:30), causing date mismatch
    - Commission records are stored with Asia/Kolkata dates
  
  2. Solution
    - Convert created_at to Asia/Kolkata timezone before extracting date
    - Use DATE(r.created_at AT TIME ZONE 'Asia/Kolkata')
    - This ensures dates match Indian Standard Time
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
DECLARE
  v_total_commission numeric;
  v_total_fares numeric;
BEGIN
  -- Get the total commission for this driver on this date
  SELECT COALESCE(dda.allowance_amount, 0)
  INTO v_total_commission
  FROM driver_daily_allowances dda
  INNER JOIN drivers d ON d.name = dda.driver_name AND d.vendor_id = dda.vendor_id
  WHERE dda.vendor_id = p_vendor_id
    AND dda.driver_name = p_driver_name
    AND dda.allowance_date = p_date
  LIMIT 1;

  -- If no commission found, set to 0
  v_total_commission := COALESCE(v_total_commission, 0);

  -- Get total fares for this driver on this date (using Asia/Kolkata timezone)
  SELECT COALESCE(SUM(r.fare_amount), 0)
  INTO v_total_fares
  FROM rides r
  INNER JOIN drivers d ON r.driver_id = d.id
  WHERE d.vendor_id = p_vendor_id
    AND d.name = p_driver_name
    AND r.status = 'completed'
    AND DATE(r.created_at AT TIME ZONE 'Asia/Kolkata') = p_date;

  -- Return rides with proportional commission (using Asia/Kolkata timezone)
  RETURN QUERY
  SELECT 
    r.ride_code,
    r.fare_amount,
    CASE 
      WHEN v_total_fares > 0 THEN 
        ROUND((r.fare_amount / v_total_fares) * v_total_commission, 2)
      ELSE 
        0::numeric
    END AS commission_amount,
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
