/*
  # Add Vendor Context Function

  ## Purpose
  This function sets the current vendor ID in the session configuration,
  which is used by RLS policies to control access to data.

  ## Changes
  1. Create `set_vendor_context` function to set app.current_vendor_id
  2. This allows RLS policies to work with custom authentication
*/

CREATE OR REPLACE FUNCTION set_vendor_context(vendor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_vendor_id', vendor_id::text, false);
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION set_vendor_context(uuid) TO anon, authenticated;
