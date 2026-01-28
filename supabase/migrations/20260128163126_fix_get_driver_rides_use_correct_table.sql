/*
  # Fix get_driver_rides_by_date to use correct commission table
  
  1. Problem
    - Function was querying driver_daily_allowances (manual allowances)
    - Should query driver_daily_amounts_owed (calculated commissions)
    - This caused all rides to show ₹0 commission
  
  2. Solution
    - Query driver_daily_amounts_owed.daily_total_owed instead
    - This table contains the actual calculated commission amounts
    - Match on aggregation_date instead of allowance_date
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
  -- Get the total commission for this driver on this date from driver_daily_amounts_owed
  SELECT COALESCE(ddao.daily_total_owed, 0)
  INTO v_total_commission
  FROM driver_daily_amounts_owed ddao
  WHERE ddao.driver_name = p_driver_name
    AND ddao.aggregation_date = p_date
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
