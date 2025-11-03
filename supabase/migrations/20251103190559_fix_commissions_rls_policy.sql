/*
  # Fix Commissions RLS Policy for Vendor Context

  1. Changes
    - Drop existing vendor read policy that uses auth.uid()
    - Create new policy that uses app.current_vendor_id from vendor context
    - This allows vendors to read their commissions when logged in with custom auth
  
  2. Security
    - Policy checks that vendor_id matches the current vendor context
    - Only authenticated sessions with vendor context can access data
*/

-- Drop the old policy that relies on auth.uid()
DROP POLICY IF EXISTS "Vendors can read own commissions" ON commissions;

-- Create new policy using vendor context
CREATE POLICY "Vendors can read own commissions"
  ON commissions
  FOR SELECT
  USING (
    vendor_id::text = current_setting('app.current_vendor_id', true)
  );
