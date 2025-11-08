/*
  # Create RPC Function for Vendor to Get Driver Daily Amounts

  1. Overview
    - Vendor app doesn't use Supabase auth, so RLS policies don't work
    - Create RPC function that vendors can call to get their drivers' amounts
    - Function takes vendor_id and date as parameters

  2. Security
    - Function uses SECURITY DEFINER to bypass RLS
    - Filters results to only show drivers belonging to the vendor
    - No authentication bypass - vendor must know their vendor_id

  3. Usage
    - Call: supabase.rpc('get_driver_daily_amounts_for_vendor', { p_vendor_id, p_date })
*/

-- Create RPC function to get driver daily amounts for a vendor
CREATE OR REPLACE FUNCTION get_driver_daily_amounts_for_vendor(
  p_vendor_id uuid,
  p_date date
)
RETURNS TABLE (
  driver_name text,
  daily_total_owed numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dda.driver_name,
    dda.daily_total_owed
  FROM driver_daily_amounts_owed dda
  JOIN drivers d ON d.name = dda.driver_name
  WHERE d.vendor_id = p_vendor_id
  AND dda.aggregation_date = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
