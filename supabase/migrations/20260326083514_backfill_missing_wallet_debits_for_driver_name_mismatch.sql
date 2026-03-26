/*
  # Backfill missing wallet debits for scheduled ride commissions

  ## Problem
  All completion records (outstation, rental, airport) stored driver_name = "Driver"
  instead of the actual driver name "Mark Test driver". The debit trigger looks up
  the vendor by driver_name, which failed to match, so no wallet debits were created
  for any scheduled ride commissions.

  ## Fix
  Insert wallet debit transactions for all dates where driver_daily_amounts_owed has
  rows with driver_name = "Driver" that have no corresponding wallet debit already.
  We resolve the correct vendor and driver via the driver_id stored in the completion tables.

  ## Notes
  - Only inserts debits for dates where the vendor wallet doesn't already have a debit
    for that date/driver combo
  - Uses the actual driver (Mark Test driver / f68324d8-...) and vendor (23ffa19d-...)
    resolved via completion table driver_ids
*/

DO $$
DECLARE
  v_vendor_id uuid := '23ffa19d-d934-422a-9108-b7625678490a';
  v_driver_id uuid := 'f68324d8-a174-4f12-afd5-275f96c4c324';
  v_wallet_id uuid;
  rec RECORD;
BEGIN
  SELECT id INTO v_wallet_id FROM wallets WHERE vendor_id = v_vendor_id;

  IF v_wallet_id IS NULL THEN
    RAISE NOTICE 'No wallet found for vendor';
    RETURN;
  END IF;

  FOR rec IN
    SELECT dda.aggregation_date, dda.daily_total_owed
    FROM driver_daily_amounts_owed dda
    WHERE dda.driver_name = 'Driver'
      AND dda.daily_total_owed > 0
      AND NOT EXISTS (
        SELECT 1 FROM wallet_transactions wt
        WHERE wt.vendor_id = v_vendor_id
          AND wt.driver_id = v_driver_id
          AND wt.transaction_type = 'debit'
          AND wt.transaction_date = dda.aggregation_date
      )
    ORDER BY dda.aggregation_date
  LOOP
    INSERT INTO wallet_transactions (
      wallet_id,
      vendor_id,
      driver_id,
      transaction_type,
      amount,
      description,
      reference,
      transaction_date
    ) VALUES (
      v_wallet_id,
      v_vendor_id,
      v_driver_id,
      'debit',
      rec.daily_total_owed,
      'Commission debit for Driver on ' || rec.aggregation_date,
      'commission_' || v_driver_id::text || '_' || rec.aggregation_date,
      rec.aggregation_date
    );
  END LOOP;
END $$;
