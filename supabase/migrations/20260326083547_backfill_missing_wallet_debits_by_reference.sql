/*
  # Backfill missing wallet debits - fix for overlapping dates

  The previous backfill skipped dates where any debit existed for that driver,
  but some dates have a local-ride debit ("Mark Test driver") AND a separate
  scheduled-ride amount ("Driver") that was never debited.

  This migration uses the reference key to check for the specific missing entry.
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
        WHERE wt.reference = 'commission_' || v_driver_id::text || '_' || dda.aggregation_date::text
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
