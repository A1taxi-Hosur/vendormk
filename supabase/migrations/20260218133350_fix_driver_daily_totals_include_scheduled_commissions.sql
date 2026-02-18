/*
  # Fix get_driver_daily_amounts_for_vendor to include scheduled booking commissions

  ## Problem
  When a scheduled booking completes, the trip completion record is stored in
  outstation_trip_completions with driver_name = "Driver" (the generic label from
  the booking flow) but driver_id = the actual driver's UUID.

  The driver_daily_amounts_owed table stores totals keyed by driver_name. So the
  scheduled booking commission ends up stored under "Driver", not the real driver
  name. get_driver_daily_amounts_for_vendor only reads driver_daily_amounts_owed,
  so it never includes the scheduled ride commission in the driver's total.

  ## Solution
  Replace the driver_daily_amounts_owed lookup with a live computation that sums
  commissions directly from all four trip completion tables, matching by EITHER
  driver_name OR driver_id. This ensures scheduled booking completions (which have
  the correct driver_id but wrong driver_name) are always counted.

  ## Changes
  - get_driver_daily_amounts_for_vendor: compute totals live from trip completion
    tables using both driver_name and driver_id matching
*/

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
  WITH vendor_drivers AS (
    SELECT
      d.id AS driver_id,
      d.name AS driver_name
    FROM drivers d
    WHERE EXISTS (
      SELECT 1 FROM vendors v
      WHERE v.id = p_vendor_id
        AND v.driver_details ~ ('(?i)(^|\n)Driver:\s*' || regexp_replace(d.name, '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '\s*(\||$)')
    )
  ),
  driver_totals AS (
    SELECT
      vd.driver_name,
      COALESCE(SUM(tc.total_amount_owed), 0) AS local_total
    FROM vendor_drivers vd
    LEFT JOIN trip_completions tc
      ON (tc.driver_name = vd.driver_name OR tc.driver_id = vd.driver_id)
      AND DATE(tc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
    GROUP BY vd.driver_name

    UNION ALL

    SELECT
      vd.driver_name,
      COALESCE(SUM(rtc.total_amount_owed), 0)
    FROM vendor_drivers vd
    LEFT JOIN rental_trip_completions rtc
      ON (rtc.driver_name = vd.driver_name OR rtc.driver_id = vd.driver_id)
      AND DATE(rtc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
    GROUP BY vd.driver_name

    UNION ALL

    SELECT
      vd.driver_name,
      COALESCE(SUM(atc.total_amount_owed), 0)
    FROM vendor_drivers vd
    LEFT JOIN airport_trip_completions atc
      ON (atc.driver_name = vd.driver_name OR atc.driver_id = vd.driver_id)
      AND DATE(atc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
    GROUP BY vd.driver_name

    UNION ALL

    SELECT
      vd.driver_name,
      COALESCE(SUM(otc.total_amount_owed), 0)
    FROM vendor_drivers vd
    LEFT JOIN outstation_trip_completions otc
      ON (otc.driver_name = vd.driver_name OR otc.driver_id = vd.driver_id)
      AND DATE(otc.completed_at AT TIME ZONE 'Asia/Kolkata') = p_date
    GROUP BY vd.driver_name
  )
  SELECT
    dt.driver_name,
    SUM(dt.local_total) AS daily_total_owed
  FROM driver_totals dt
  GROUP BY dt.driver_name
  HAVING SUM(dt.local_total) > 0;
END;
$$;
