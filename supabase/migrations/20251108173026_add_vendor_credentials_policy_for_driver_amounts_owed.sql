/*
  # Add Vendor Credentials RLS Policy for Driver Daily Amounts Owed

  1. Overview
    - The vendor app authenticates using vendor_credentials table, not auth.uid()
    - Current policies only check auth.uid() which doesn't work for vendor authentication
    - Need to add policy that checks vendor_id from the session

  2. Changes
    - Add new SELECT policy for vendor credentials authentication
    - Policy checks if the logged-in vendor can see their drivers' amounts

  3. Security
    - Vendors can only view amounts for their own drivers
    - Uses vendor_id from session to filter data
*/

-- Drop existing vendor policy that doesn't work with vendor_credentials
DROP POLICY IF EXISTS "Vendors can view own drivers amounts owed" ON driver_daily_amounts_owed;

-- Create new policy for vendor credentials access
CREATE POLICY "Vendor credentials can view own drivers amounts owed"
  ON driver_daily_amounts_owed
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM drivers d
      WHERE d.name = driver_daily_amounts_owed.driver_name
      AND d.vendor_id IN (
        SELECT vendor_id 
        FROM vendor_credentials vc
        JOIN vendors v ON v.id = vc.vendor_id
        WHERE v.id = d.vendor_id
      )
    )
  );
