/*
  # Fix get_driver_rides_by_date ORDER BY in UNION query

  Wraps the UNION ALL into a subquery so ORDER BY works correctly.
  Also adds scheduled rental and airport ride completion support.
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
  IF NOT EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = p_vendor_id
      AND v.driver_details ~ ('(?i)(^|\n)Driver:\s*' || regexp_replace(p_driver_name, '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '\s*(\||$)')
  ) THEN
    RETURN;
  END IF;

  SELECT id INTO v_driver_id FROM drivers WHERE name = p_driver_name LIMIT 1;

  RETURN QUERY
  SELECT * FROM (

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

    SELECT
      'R-' || SUBSTRING(rtc.ride_id::text, 1, 8),
      rtc.total_fare,
      rtc.total_amount_owed,
      rtc.pickup_address,
      rtc.destination_address,
      rtc.actual_distance_km,
      rtc.completed_at,
      'Rental'::text
    FROM rental_trip_completions rtc
    WHERE (rtc.driver_name = p_driver_name OR (v_driver_id IS NOT NULL AND rtc.driver_id = v_driver_id))
      AND DATE(rtc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
      AND rtc.scheduled_booking_id IS NULL

    UNION ALL

    SELECT
      'A-' || SUBSTRING(atc.ride_id::text, 1, 8),
      atc.total_fare,
      atc.total_amount_owed,
      atc.pickup_address,
      atc.destination_address,
      atc.actual_distance_km,
      atc.completed_at,
      'Airport'::text
    FROM airport_trip_completions atc
    WHERE (atc.driver_name = p_driver_name OR (v_driver_id IS NOT NULL AND atc.driver_id = v_driver_id))
      AND DATE(atc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
      AND atc.scheduled_booking_id IS NULL

    UNION ALL

    SELECT
      'O-' || SUBSTRING(otc.ride_id::text, 1, 8),
      otc.total_fare,
      otc.total_amount_owed,
      otc.pickup_address,
      otc.destination_address,
      otc.actual_distance_km,
      otc.completed_at,
      'Outstation'::text
    FROM outstation_trip_completions otc
    WHERE (otc.driver_name = p_driver_name OR (v_driver_id IS NOT NULL AND otc.driver_id = v_driver_id))
      AND DATE(otc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
      AND otc.scheduled_booking_id IS NULL

    UNION ALL

    SELECT
      'S-' || SUBSTRING(sb.id::text, 1, 8),
      COALESCE(tc.total_fare, sb.final_fare, sb.estimated_fare),
      COALESCE(tc.total_amount_owed, 0),
      sb.pickup_address,
      sb.destination_address,
      COALESCE(tc.actual_distance_km, sb.odometer_distance_km),
      COALESCE(tc.completed_at, sb.updated_at),
      'Scheduled'::text
    FROM scheduled_bookings sb
    INNER JOIN trip_completions tc ON tc.scheduled_booking_id = sb.id
    WHERE sb.assigned_driver_id = v_driver_id
      AND sb.status = 'completed'
      AND DATE(COALESCE(tc.completed_at, sb.updated_at) AT TIME ZONE 'Asia/Kolkata') = p_date

    UNION ALL

    SELECT
      'S-' || SUBSTRING(sb.id::text, 1, 8),
      COALESCE(rtc.total_fare, sb.final_fare, sb.estimated_fare),
      COALESCE(rtc.total_amount_owed, 0),
      sb.pickup_address,
      sb.destination_address,
      COALESCE(rtc.actual_distance_km, sb.odometer_distance_km),
      COALESCE(rtc.completed_at, sb.updated_at),
      'Scheduled'::text
    FROM scheduled_bookings sb
    INNER JOIN rental_trip_completions rtc ON rtc.scheduled_booking_id = sb.id
    WHERE sb.assigned_driver_id = v_driver_id
      AND sb.status = 'completed'
      AND DATE(COALESCE(rtc.completed_at, sb.updated_at) AT TIME ZONE 'Asia/Kolkata') = p_date

    UNION ALL

    SELECT
      'S-' || SUBSTRING(sb.id::text, 1, 8),
      COALESCE(atc.total_fare, sb.final_fare, sb.estimated_fare),
      COALESCE(atc.total_amount_owed, 0),
      sb.pickup_address,
      sb.destination_address,
      COALESCE(atc.actual_distance_km, sb.odometer_distance_km),
      COALESCE(atc.completed_at, sb.updated_at),
      'Scheduled'::text
    FROM scheduled_bookings sb
    INNER JOIN airport_trip_completions atc ON atc.scheduled_booking_id = sb.id
    WHERE sb.assigned_driver_id = v_driver_id
      AND sb.status = 'completed'
      AND DATE(COALESCE(atc.completed_at, sb.updated_at) AT TIME ZONE 'Asia/Kolkata') = p_date

    UNION ALL

    SELECT
      'S-' || SUBSTRING(sb.id::text, 1, 8),
      COALESCE(otc.total_fare, sb.final_fare, sb.estimated_fare),
      COALESCE(otc.total_amount_owed, 0),
      sb.pickup_address,
      sb.destination_address,
      COALESCE(otc.actual_distance_km, sb.odometer_distance_km),
      COALESCE(otc.completed_at, sb.updated_at),
      'Scheduled'::text
    FROM scheduled_bookings sb
    LEFT JOIN outstation_trip_completions otc ON otc.scheduled_booking_id = sb.id
    WHERE sb.assigned_driver_id = v_driver_id
      AND sb.status = 'completed'
      AND DATE(COALESCE(otc.completed_at, sb.updated_at) AT TIME ZONE 'Asia/Kolkata') = p_date
      AND NOT EXISTS (SELECT 1 FROM trip_completions tc2 WHERE tc2.scheduled_booking_id = sb.id)
      AND NOT EXISTS (SELECT 1 FROM rental_trip_completions rtc2 WHERE rtc2.scheduled_booking_id = sb.id)
      AND NOT EXISTS (SELECT 1 FROM airport_trip_completions atc2 WHERE atc2.scheduled_booking_id = sb.id)

  ) rides
  ORDER BY rides.created_at DESC;
END;
$$;
