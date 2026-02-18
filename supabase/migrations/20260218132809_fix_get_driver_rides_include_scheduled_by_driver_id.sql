/*
  # Fix get_driver_rides_by_date to include scheduled booking completions

  ## Problem
  When a scheduled booking is completed, the trip completion record in
  outstation_trip_completions (and other tables) stores driver_name from the
  scheduled booking flow, which may differ from the driver's actual name stored
  in the drivers table. This causes the RPC to miss those records when filtering
  purely by driver_name.

  Additionally, scheduled_bookings that are completed are not shown in the
  ride breakdown at all — they should appear as a separate "Scheduled" type.

  ## Solution
  1. Look up the driver's UUID from the drivers table using their name
  2. For each completion table, match by EITHER driver_name OR driver_id
     so that scheduled booking completions are always included
  3. Add scheduled_bookings as a source, showing completed scheduled rides
     linked via the assigned_driver_id

  ## Changes
  - get_driver_rides_by_date: match trip completions by driver_id in addition
    to driver_name; add scheduled_bookings as a source for the ride list
*/

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
DECLARE
  v_driver_id uuid;
BEGIN
  -- Verify the driver belongs to this vendor via driver_details
  IF NOT EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = p_vendor_id
      AND v.driver_details ILIKE '%' || p_driver_name || '%'
  ) THEN
    RETURN;
  END IF;

  -- Look up the driver's UUID so we can match scheduled booking completions
  SELECT id INTO v_driver_id FROM drivers WHERE name = p_driver_name LIMIT 1;

  RETURN QUERY
  -- Local rides from trip_completions (match by name or driver_id)
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
  WHERE (tc.driver_name = p_driver_name OR (v_driver_id IS NOT NULL AND tc.driver_id = v_driver_id))
    AND DATE(tc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
    AND tc.scheduled_booking_id IS NULL

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
  WHERE (rtc.driver_name = p_driver_name OR (v_driver_id IS NOT NULL AND rtc.driver_id = v_driver_id))
    AND DATE(rtc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
    AND rtc.scheduled_booking_id IS NULL

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
  WHERE (atc.driver_name = p_driver_name OR (v_driver_id IS NOT NULL AND atc.driver_id = v_driver_id))
    AND DATE(atc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
    AND atc.scheduled_booking_id IS NULL

  UNION ALL

  -- Outstation rides from outstation_trip_completions (non-scheduled)
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
  WHERE (otc.driver_name = p_driver_name OR (v_driver_id IS NOT NULL AND otc.driver_id = v_driver_id))
    AND DATE(otc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
    AND otc.scheduled_booking_id IS NULL

  UNION ALL

  -- Scheduled bookings — completed, from outstation_trip_completions linked via scheduled_booking_id
  SELECT 
    'S-' || SUBSTRING(sb.id::text, 1, 8) AS ride_code,
    COALESCE(otc.total_fare, sb.final_fare, sb.estimated_fare) AS fare_amount,
    COALESCE(otc.total_amount_owed, 0) AS commission_amount,
    sb.pickup_address,
    sb.destination_address,
    COALESCE(otc.actual_distance_km, sb.odometer_distance_km) AS distance_km,
    COALESCE(otc.completed_at, sb.updated_at) AS created_at,
    'Scheduled'::text AS booking_type
  FROM scheduled_bookings sb
  LEFT JOIN outstation_trip_completions otc ON otc.scheduled_booking_id = sb.id
  WHERE sb.assigned_driver_id = v_driver_id
    AND sb.status = 'completed'
    AND DATE(COALESCE(otc.completed_at, sb.updated_at) AT TIME ZONE 'Asia/Kolkata') = p_date

  UNION ALL

  -- Scheduled bookings — completed, from trip_completions linked via scheduled_booking_id
  SELECT 
    'S-' || SUBSTRING(sb.id::text, 1, 8) AS ride_code,
    COALESCE(tc.total_fare, sb.final_fare, sb.estimated_fare) AS fare_amount,
    COALESCE(tc.total_amount_owed, 0) AS commission_amount,
    sb.pickup_address,
    sb.destination_address,
    COALESCE(tc.actual_distance_km, sb.odometer_distance_km) AS distance_km,
    COALESCE(tc.completed_at, sb.updated_at) AS created_at,
    'Scheduled'::text AS booking_type
  FROM scheduled_bookings sb
  LEFT JOIN trip_completions tc ON tc.scheduled_booking_id = sb.id
  WHERE sb.assigned_driver_id = v_driver_id
    AND sb.status = 'completed'
    AND tc.scheduled_booking_id IS NOT NULL
    AND DATE(COALESCE(tc.completed_at, sb.updated_at) AT TIME ZONE 'Asia/Kolkata') = p_date

  ORDER BY created_at DESC;
END;
$$;
