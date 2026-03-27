/*
  # Remove incorrectly backfilled historical wallet debits

  ## Problem
  A bulk backfill migration inserted commission debit transactions for all
  historical ride data going back to November 2025. The wallet only became
  active on 2026-03-08 (first credit of ₹1). This caused a cumulative balance
  of -₹103,000+ because all historical commissions were charged against
  a wallet that never had those credits.

  These historical rides predate the wallet system being set up for this vendor,
  and the driver_daily_amounts_owed entries include test/demo data.

  ## Action
  Delete all wallet debit transactions that were bulk-inserted by the backfill
  (identifiable by their batch insert timestamp). The real-time debit trigger
  will correctly handle all new ride completions going forward.

  ## What is kept
  - The ₹1 credit from 2026-03-08
  - The organic debit for Mark Test driver on 2026-03-22 (₹33.85) — created in real-time
  - Any future real-time debits created by the trigger
*/

DELETE FROM wallet_transactions
WHERE vendor_id = '23ffa19d-d934-422a-9108-b7625678490a'
  AND transaction_type = 'debit'
  AND created_at >= '2026-03-26 08:35:00'
  AND created_at < '2026-03-26 08:36:00';
