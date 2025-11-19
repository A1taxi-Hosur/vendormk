/*
  # Create RPC function for cumulative wallet balance calculation

  1. Purpose
    - Calculate cumulative wallet balance for a vendor up to a specific date
    - Carries forward balance from previous days
    - Formula: Previous Balance + Daily Admin Credit - Daily Driver Commission

  2. Function Details
    - `get_cumulative_wallet_balance(p_vendor_id, p_date)`
    - Returns cumulative balance by summing all daily balances up to the specified date
    - Handles missing data gracefully (treats as 0)

  3. Calculation Logic
    - For each date from earliest commission to specified date:
      - Daily Balance = Admin Commission - Driver Commission
    - Cumulative Balance = SUM(all daily balances up to date)

  4. Security
    - Function respects RLS policies on underlying tables
    - Only returns data for the specified vendor
*/

-- Drop function if exists
DROP FUNCTION IF EXISTS get_cumulative_wallet_balance(uuid, date);

-- Create function to calculate cumulative wallet balance
CREATE OR REPLACE FUNCTION get_cumulative_wallet_balance(
  p_vendor_id uuid,
  p_date date
)
RETURNS TABLE(
  balance_date date,
  admin_credit numeric,
  driver_commission numeric,
  daily_balance numeric,
  cumulative_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    -- Get all dates from first commission to specified date
    SELECT generate_series(
      COALESCE(
        (SELECT MIN(commission_date) FROM commissions WHERE vendor_id = p_vendor_id),
        p_date
      ),
      p_date,
      '1 day'::interval
    )::date as calc_date
  ),
  daily_data AS (
    SELECT 
      ds.calc_date,
      COALESCE(c.commission_amount, 0) as admin_credit,
      COALESCE(
        (SELECT SUM(daily_total_owed) 
         FROM get_driver_daily_amounts_for_vendor(p_vendor_id, ds.calc_date)),
        0
      ) as driver_commission,
      COALESCE(c.commission_amount, 0) - COALESCE(
        (SELECT SUM(daily_total_owed) 
         FROM get_driver_daily_amounts_for_vendor(p_vendor_id, ds.calc_date)),
        0
      ) as daily_balance
    FROM date_series ds
    LEFT JOIN commissions c ON c.vendor_id = p_vendor_id AND c.commission_date = ds.calc_date
  )
  SELECT 
    dd.calc_date as balance_date,
    dd.admin_credit,
    dd.driver_commission,
    dd.daily_balance,
    SUM(dd.daily_balance) OVER (ORDER BY dd.calc_date) as cumulative_balance
  FROM daily_data dd
  ORDER BY dd.calc_date;
END;
$$;