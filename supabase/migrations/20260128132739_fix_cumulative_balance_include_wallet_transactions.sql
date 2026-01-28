/*
  # Fix cumulative wallet balance to include wallet_transactions
  
  1. Changes
    - Update `get_cumulative_wallet_balance` RPC function to include wallet_transactions
    - Admin credit now includes BOTH:
      - commissions.commission_amount (daily allocations from admin)
      - wallet_transactions with transaction_type='credit' (payment credits)
    - This ensures payment transactions show up in the balance calculation
    
  2. Important Notes
    - Maintains backward compatibility with existing commission logic
    - Only counts credit transactions from wallet_transactions
    - Groups wallet transactions by date for proper daily calculation
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_cumulative_wallet_balance(uuid, date);

-- Create updated function that includes wallet_transactions
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
    -- Get all dates from earliest data to specified date
    SELECT generate_series(
      COALESCE(
        LEAST(
          (SELECT MIN(commission_date) FROM commissions WHERE vendor_id = p_vendor_id),
          (SELECT MIN(transaction_date::date) FROM wallet_transactions WHERE vendor_id = p_vendor_id)
        ),
        p_date
      ),
      p_date,
      '1 day'::interval
    )::date as calc_date
  ),
  daily_data AS (
    SELECT 
      ds.calc_date,
      -- Admin credit = commission amount + wallet credit transactions
      COALESCE(c.commission_amount, 0) + COALESCE(
        (SELECT SUM(amount::numeric)
         FROM wallet_transactions
         WHERE vendor_id = p_vendor_id
         AND transaction_type = 'credit'
         AND transaction_date = ds.calc_date),
        0
      ) as admin_credit,
      -- Driver commission from driver daily amounts
      COALESCE(
        (SELECT SUM(daily_total_owed) 
         FROM get_driver_daily_amounts_for_vendor(p_vendor_id, ds.calc_date)),
        0
      ) as driver_commission,
      -- Daily balance = admin_credit - driver_commission
      (COALESCE(c.commission_amount, 0) + COALESCE(
        (SELECT SUM(amount::numeric)
         FROM wallet_transactions
         WHERE vendor_id = p_vendor_id
         AND transaction_type = 'credit'
         AND transaction_date = ds.calc_date),
        0
      )) - COALESCE(
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