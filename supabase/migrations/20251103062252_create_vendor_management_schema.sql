/*
  # Vendor Management System Schema

  ## Overview
  This migration creates the complete database schema for a vendor management system where:
  - Vendors have wallets that receive daily credits from admin
  - Vendors can add multiple drivers
  - Vendors can add multiple vehicles and associate them with drivers
  - Daily commissions from drivers are tracked and subtracted from wallet balance

  ## New Tables

  ### `vendors`
  - `id` (uuid, primary key) - Unique vendor identifier
  - `user_id` (uuid, foreign key) - Links to Supabase auth.users
  - `name` (text) - Vendor name
  - `email` (text) - Vendor email
  - `phone` (text) - Contact phone number
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `drivers`
  - `id` (uuid, primary key) - Unique driver identifier
  - `vendor_id` (uuid, foreign key) - Links to vendor who owns this driver
  - `name` (text) - Driver full name
  - `email` (text) - Driver email
  - `phone` (text) - Driver phone number
  - `license_number` (text) - Driver's license number
  - `status` (text) - active/inactive
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `vehicles`
  - `id` (uuid, primary key) - Unique vehicle identifier
  - `vendor_id` (uuid, foreign key) - Links to vendor who owns this vehicle
  - `driver_id` (uuid, foreign key, nullable) - Currently assigned driver
  - `vehicle_number` (text) - License plate/registration number
  - `vehicle_type` (text) - car/bike/van/truck
  - `make` (text) - Vehicle manufacturer
  - `model` (text) - Vehicle model
  - `year` (integer) - Manufacturing year
  - `status` (text) - active/maintenance/inactive
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `wallets`
  - `id` (uuid, primary key) - Unique wallet identifier
  - `vendor_id` (uuid, foreign key) - Links to vendor
  - `balance` (decimal) - Current wallet balance
  - `total_credited` (decimal) - Lifetime total credits added
  - `total_debited` (decimal) - Lifetime total commissions deducted
  - `created_at` (timestamptz) - Wallet creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `wallet_transactions`
  - `id` (uuid, primary key) - Unique transaction identifier
  - `wallet_id` (uuid, foreign key) - Links to wallet
  - `vendor_id` (uuid, foreign key) - Links to vendor
  - `driver_id` (uuid, foreign key, nullable) - Links to driver if commission
  - `transaction_type` (text) - credit/debit
  - `amount` (decimal) - Transaction amount
  - `description` (text) - Transaction description
  - `reference` (text, nullable) - External reference (e.g., driver app transaction ID)
  - `transaction_date` (date) - Date of transaction
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Enable RLS on all tables
  - Vendors can only access their own data
  - Policies enforce vendor ownership checks
*/

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  license_number text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  vehicle_number text NOT NULL,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('car', 'bike', 'van', 'truck')),
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  status text DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vehicle_number)
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance decimal(10, 2) DEFAULT 0.00,
  total_credited decimal(10, 2) DEFAULT 0.00,
  total_debited decimal(10, 2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
  amount decimal(10, 2) NOT NULL,
  description text NOT NULL,
  reference text,
  transaction_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_drivers_vendor_id ON drivers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vendor_id ON vehicles(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_wallets_vendor_id ON wallets(vendor_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_vendor_id ON wallet_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_date ON wallet_transactions(transaction_date);

-- Enable Row Level Security
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Vendors policies
CREATE POLICY "Vendors can view own profile"
  ON vendors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Vendors can update own profile"
  ON vendors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vendors can insert own profile"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Drivers policies
CREATE POLICY "Vendors can view own drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can insert own drivers"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update own drivers"
  ON drivers FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can delete own drivers"
  ON drivers FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Vehicles policies
CREATE POLICY "Vendors can view own vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can insert own vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update own vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can delete own vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Wallets policies
CREATE POLICY "Vendors can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can insert own wallet"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update own wallet"
  ON wallets FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Wallet transactions policies
CREATE POLICY "Vendors can view own transactions"
  ON wallet_transactions FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can insert own transactions"
  ON wallet_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Function to automatically create wallet when vendor is created
CREATE OR REPLACE FUNCTION create_wallet_for_vendor()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (vendor_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create wallet automatically
DROP TRIGGER IF EXISTS on_vendor_created ON vendors;
CREATE TRIGGER on_vendor_created
  AFTER INSERT ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_vendor();

-- Function to update wallet balance on transaction
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'credit' THEN
    UPDATE wallets
    SET 
      balance = balance + NEW.amount,
      total_credited = total_credited + NEW.amount,
      updated_at = now()
    WHERE id = NEW.wallet_id;
  ELSIF NEW.transaction_type = 'debit' THEN
    UPDATE wallets
    SET 
      balance = balance - NEW.amount,
      total_debited = total_debited + NEW.amount,
      updated_at = now()
    WHERE id = NEW.wallet_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update wallet on transaction
DROP TRIGGER IF EXISTS on_transaction_created ON wallet_transactions;
CREATE TRIGGER on_transaction_created
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance();