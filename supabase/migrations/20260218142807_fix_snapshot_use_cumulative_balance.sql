/*
  # Fix vendor_daily_balance_snapshots to use cumulative balance

  ## Problem
  The upsert_vendor_daily_balance_snapshot function was storing `wallet_balance`
  (raw wallet balance) and `total_driver_amounts_owed` (only today's owed amount),
  resulting in a snapshot value that did not match the cumulative balance shown in
  the app via get_cumulative_wallet_balance.

  ## Fix
  Update the function to call get_cumulative_wallet_balance and store the true
  cumulative balance in the wallet_balance column, so the snapshot reflects the
  same value the app displays.
*/

CREATE OR REPLACE FUNCTION upsert_vendor_daily_balance_snapshot(
  vendor_id_param uuid,
  date_param date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vendor_name text;
  v_cumulative_balance numeric := 0;
  v_total_owed numeric := 0;
  v_driver_count integer := 0;
  v_cumulative_row record;
BEGIN
  SELECT company_name INTO v_vendor_name
  FROM vendors WHERE id = vendor_id_param;

  IF v_vendor_name IS NULL THEN
    RETURN;
  END IF;

  SELECT cumulative_balance INTO v_cumulative_balance
  FROM get_cumulative_wallet_balance(vendor_id_param, date_param)
  WHERE balance_date = date_param;

  v_cumulative_balance := COALESCE(v_cumulative_balance, 0);

  SELECT
    COALESCE(SUM(ddao.daily_total_owed), 0),
    COUNT(DISTINCT ddao.driver_name)
  INTO v_total_owed, v_driver_count
  FROM driver_daily_amounts_owed ddao
  JOIN drivers d ON d.name = ddao.driver_name AND d.vendor_id = vendor_id_param
  WHERE ddao.aggregation_date = date_param;

  INSERT INTO vendor_daily_balance_snapshots (
    vendor_id,
    vendor_name,
    snapshot_date,
    wallet_balance,
    total_driver_amounts_owed,
    driver_count
  ) VALUES (
    vendor_id_param,
    v_vendor_name,
    date_param,
    v_cumulative_balance,
    v_total_owed,
    v_driver_count
  )
  ON CONFLICT (vendor_id, snapshot_date)
  DO UPDATE SET
    vendor_name = EXCLUDED.vendor_name,
    wallet_balance = EXCLUDED.wallet_balance,
    total_driver_amounts_owed = EXCLUDED.total_driver_amounts_owed,
    driver_count = EXCLUDED.driver_count,
    updated_at = now();
END;
$$;
