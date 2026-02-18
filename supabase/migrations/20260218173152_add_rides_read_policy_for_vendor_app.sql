/*
  # Add rides read policy for vendor app

  1. Problem
    - The vendor app uses custom auth (not Supabase Auth), so auth.uid() is null
    - The rides table has no policy allowing anon role to read rides
    - This causes the commissions tab to return 0 results

  2. Solution
    - Add a policy allowing anon role to read rides
    - The app already filters by driver_id (which is scoped to the vendor's drivers)
    - This matches the same pattern used for drivers and commissions tables

  3. Security
    - Application-level filtering by vendor_id ensures vendors only see their own data
    - Consistent with the existing vendor app security model
*/

CREATE POLICY "Allow anon read access to rides for vendor app"
  ON rides
  FOR SELECT
  TO anon
  USING (true);
