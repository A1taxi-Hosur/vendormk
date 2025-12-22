/*
  # Create payment_transactions table for Zoho Payments

  1. New Tables
    - `payment_transactions`
      - `id` (uuid, primary key) - Unique identifier
      - `vendor_id` (uuid) - Reference to vendor
      - `wallet_transaction_id` (uuid, nullable) - Reference to wallet transaction (after success)
      - `amount` (numeric) - Payment amount
      - `currency` (text) - Currency code (default INR)
      - `payment_gateway` (text) - Gateway name (e.g., 'zoho')
      - `gateway_transaction_id` (text, nullable) - Transaction ID from payment gateway
      - `gateway_payment_id` (text, nullable) - Payment ID from gateway
      - `status` (text) - Payment status: pending, processing, success, failed, cancelled
      - `payment_url` (text, nullable) - URL to redirect user for payment
      - `description` (text) - Description of payment
      - `metadata` (jsonb, nullable) - Additional payment metadata
      - `initiated_at` (timestamptz) - When payment was initiated
      - `completed_at` (timestamptz, nullable) - When payment was completed
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `payment_transactions` table
    - Add policy for vendors to view their own payment transactions
    - Add policy for vendors to create payment transactions
*/

CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  wallet_transaction_id uuid REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  payment_gateway text NOT NULL DEFAULT 'zoho',
  gateway_transaction_id text,
  gateway_payment_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'cancelled')),
  payment_url text,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  initiated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_vendor_id ON payment_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_transaction_id ON payment_transactions(gateway_transaction_id);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own payment transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT vendor_id FROM vendor_credentials 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Vendors can create payment transactions"
  ON payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT vendor_id FROM vendor_credentials 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can update payment transactions"
  ON payment_transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
