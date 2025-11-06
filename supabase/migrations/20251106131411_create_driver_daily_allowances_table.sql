/*
  # Create Driver Daily Allowances Table

  1. Overview
    - Tracks individual driver earnings (allowances) from external sources
    - Each driver can have their own allowance amount per day
    - Replaces the single driver_allowance column in commissions table
    - Allows wallet deductions based on individual driver earnings

  2. New Tables
    - `driver_daily_allowances`
      - `id` (uuid, primary key) - Unique identifier
      - `vendor_id` (uuid, foreign key) - Reference to vendors table
      - `driver_id` (uuid, foreign key) - Reference to drivers table
      - `driver_name` (text, not null) - Driver name for easy reference
      - `driver_phone` (text) - Driver phone for identification
      - `allowance_date` (date, not null) - Date of the allowance
      - `allowance_amount` (decimal, not null) - Amount driver earned externally
      - `notes` (text) - Additional notes about the allowance
      - `created_at` (timestamptz) - Record creation time
      - `updated_at` (timestamptz) - Record update time

  3. Security
    - Enable RLS on `driver_daily_allowances` table
    - Vendors can only view/manage their own driver allowances
    - Policies for SELECT, INSERT, UPDATE, DELETE

  4. Indexes
    - Index on vendor_id for fast vendor-specific queries
    - Index on driver_id for driver-specific lookups
    - Index on allowance_date for date-based queries
    - Composite index on (vendor_id, allowance_date) for dashboard queries

  5. Business Logic
    - Each row represents one driver's earnings for one date
    - Multiple drivers can have different allowances on the same date
    - Frontend will fetch and display individual driver allowances
    - Wallet will deduct based on each driver's actual earnings
*/

-- Create driver_daily_allowances table
CREATE TABLE IF NOT EXISTS driver_daily_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  driver_name text NOT NULL,
  driver_phone text,
  allowance_date date NOT NULL,
  allowance_amount decimal(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint: one allowance per driver per date per vendor
  UNIQUE(vendor_id, driver_id, allowance_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_daily_allowances_vendor_id 
  ON driver_daily_allowances(vendor_id);

CREATE INDEX IF NOT EXISTS idx_driver_daily_allowances_driver_id 
  ON driver_daily_allowances(driver_id);

CREATE INDEX IF NOT EXISTS idx_driver_daily_allowances_date 
  ON driver_daily_allowances(allowance_date);

CREATE INDEX IF NOT EXISTS idx_driver_daily_allowances_vendor_date 
  ON driver_daily_allowances(vendor_id, allowance_date);

-- Enable RLS
ALTER TABLE driver_daily_allowances ENABLE ROW LEVEL SECURITY;

-- Policy: Vendors can view their own driver allowances
CREATE POLICY "Vendors can view own driver allowances"
  ON driver_daily_allowances
  FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT v.id 
      FROM vendors v
      JOIN vendor_credentials vc ON vc.vendor_id = v.id
      WHERE vc.vendor_id = vendor_id
    )
  );

-- Policy: Vendors can insert their own driver allowances
CREATE POLICY "Vendors can insert own driver allowances"
  ON driver_daily_allowances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT v.id 
      FROM vendors v
      JOIN vendor_credentials vc ON vc.vendor_id = v.id
      WHERE vc.vendor_id = vendor_id
    )
  );

-- Policy: Vendors can update their own driver allowances
CREATE POLICY "Vendors can update own driver allowances"
  ON driver_daily_allowances
  FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT v.id 
      FROM vendors v
      JOIN vendor_credentials vc ON vc.vendor_id = v.id
      WHERE vc.vendor_id = vendor_id
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT v.id 
      FROM vendors v
      JOIN vendor_credentials vc ON vc.vendor_id = v.id
      WHERE vc.vendor_id = vendor_id
    )
  );

-- Policy: Vendors can delete their own driver allowances
CREATE POLICY "Vendors can delete own driver allowances"
  ON driver_daily_allowances
  FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT v.id 
      FROM vendors v
      JOIN vendor_credentials vc ON vc.vendor_id = v.id
      WHERE vc.vendor_id = vendor_id
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_driver_daily_allowances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_driver_daily_allowances_updated_at ON driver_daily_allowances;
CREATE TRIGGER set_driver_daily_allowances_updated_at
  BEFORE UPDATE ON driver_daily_allowances
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_daily_allowances_updated_at();

-- Create function to get total driver allowances for a date
CREATE OR REPLACE FUNCTION get_total_driver_allowances_for_date(
  p_vendor_id uuid,
  p_date date
)
RETURNS decimal AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT SUM(allowance_amount)
      FROM driver_daily_allowances
      WHERE vendor_id = p_vendor_id
      AND allowance_date = p_date
    ),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
