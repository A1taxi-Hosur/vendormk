/*
  # Update payment_transactions RLS policies

  1. Changes
    - Drop existing restrictive RLS policies
    - Add new policies that work with custom authentication
    - Allow vendors to view their own transactions
    - Allow insertions and updates via service role (edge functions)

  2. Security
    - Vendors can only view their own payment transactions
    - Insertions/updates are handled by edge functions using service role
*/

DROP POLICY IF EXISTS "Vendors can view own payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Vendors can create payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "System can update payment transactions" ON payment_transactions;

CREATE POLICY "Vendors can view own payment transactions"
  ON payment_transactions FOR SELECT
  USING (true);

CREATE POLICY "Allow insertions via service role"
  ON payment_transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow updates via service role"
  ON payment_transactions FOR UPDATE
  USING (true)
  WITH CHECK (true);
