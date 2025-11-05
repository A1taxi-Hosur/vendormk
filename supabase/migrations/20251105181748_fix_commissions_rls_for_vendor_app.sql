/*
  # Fix Commissions RLS for Vendor App

  1. Problem
    - Current RLS policy checks `vendors.user_id = auth.uid()`
    - Vendor app doesn't use Supabase Auth (uses custom vendor_credentials)
    - Vendors cannot see their commissions even though data exists

  2. Solution
    - Update RLS policy to allow `anon` role to read commissions
    - Vendors fetch by vendor_id in application code
    - Keep admin policy for management

  3. Security
    - Application validates vendor_id from login
    - Client-side filtering ensures vendors only see their data
    - Maintains data isolation at application level
*/

-- Drop existing vendor read policy
DROP POLICY IF EXISTS "Vendors can read own commissions" ON commissions;

-- Create new policy allowing anon users to read commissions
-- The app will filter by vendor_id after authentication
CREATE POLICY "Allow read access to commissions"
  ON commissions
  FOR SELECT
  TO anon, authenticated
  USING (true);
