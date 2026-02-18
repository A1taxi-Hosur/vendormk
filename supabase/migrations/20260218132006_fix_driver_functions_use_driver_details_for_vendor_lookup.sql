/*
  # Fix driver RPC functions to use vendor driver_details for ownership lookup

  ## Problem
  Both get_driver_daily_amounts_for_vendor and get_driver_rides_by_date join the
  drivers table and filter by d.vendor_id = p_vendor_id. However, the majority of
  drivers have vendor_id = NULL because the vendor-driver relationship is stored in
  the vendors.driver_details text field, not as a foreign key on the drivers table.
  This caused rides from those drivers to be excluded entirely.

  ## Solution
  Replace the d.vendor_id = p_vendor_id filter with a check against the vendor's
  driver_details text field. A driver belongs to a vendor if their name appears
  in the vendor's driver_details string. This matches how the app already resolves
  driver ownership everywhere else.

  ## Changes
  - get_driver_daily_amounts_for_vendor: filter using vendor driver_details match
  - get_driver_rides_by_date: filter using driver_name directly (vendor already
    supplies the driver name from their own driver_details, so no extra vendor
    ownership check is needed beyond matching the driver name)
*/

-- Fix get_driver_daily_amounts_for_vendor to use driver_details for ownership
CREATE OR REPLACE FUNCTION get_driver_daily_amounts_for_vendor(
  p_vendor_id uuid,
  p_date date
)
RETURNS TABLE (
  driver_name text,
  daily_total_owed numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dda.driver_name,
    dda.daily_total_owed
  FROM driver_daily_amounts_owed dda
  WHERE dda.aggregation_date = p_date
    AND EXISTS (
      SELECT 1 FROM vendors v
      WHERE v.id = p_vendor_id
        AND v.driver_details ILIKE '%' || dda.driver_name || '%'
    );
END;
$$;

-- Fix get_driver_rides_by_date to not require vendor_id on drivers table
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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the driver belongs to this vendor via driver_details
  IF NOT EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = p_vendor_id
      AND v.driver_details ILIKE '%' || p_driver_name || '%'
  ) THEN
    RETURN;
  END IF;

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
  WHERE tc.driver_name = p_driver_name
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
  WHERE rtc.driver_name = p_driver_name
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
  WHERE atc.driver_name = p_driver_name
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
  WHERE otc.driver_name = p_driver_name
    AND DATE(otc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date

  ORDER BY created_at DESC;
END;
$$;
