/*
  # Update Authentication Functions

  1. Changes
    - Update `verify_vendor_login` to use vendor_credentials table
    - Update `create_vendor` to create credentials in vendor_credentials table
    - Keep SECURITY DEFINER to bypass RLS and access credentials securely

  2. Security
    - Functions remain SECURITY DEFINER for credential access
    - No direct table access policies needed
    - Credentials isolated from public access
*/

-- Drop and recreate verify_vendor_login function
DROP FUNCTION IF EXISTS verify_vendor_login(text, text);

CREATE OR REPLACE FUNCTION verify_vendor_login(p_username text, p_password text)
RETURNS TABLE(vendor_id uuid, name text, email text, phone text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.company_name,
    v.company_name,
    ''::text
  FROM vendors v
  INNER JOIN vendor_credentials vc ON vc.vendor_id = v.id
  WHERE vc.username = p_username
    AND vc.password_hash = crypt(p_password, vc.password_hash);
END;
$$;

-- Update create_vendor function to use vendor_credentials
DROP FUNCTION IF EXISTS create_vendor(text, text, text, text, text);

CREATE OR REPLACE FUNCTION create_vendor(
  p_username text,
  p_password text,
  p_company_name text,
  p_license_number text,
  p_address text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vendor_id uuid;
BEGIN
  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM vendor_credentials WHERE username = p_username) THEN
    RAISE EXCEPTION 'Username already exists';
  END IF;

  -- Insert vendor
  INSERT INTO vendors (company_name, license_number, address)
  VALUES (p_company_name, p_license_number, p_address)
  RETURNING id INTO v_vendor_id;

  -- Insert credentials
  INSERT INTO vendor_credentials (vendor_id, username, password_hash)
  VALUES (v_vendor_id, p_username, crypt(p_password, gen_salt('bf')));

  RETURN v_vendor_id;
END;
$$;

-- Create function to update vendor password
CREATE OR REPLACE FUNCTION update_vendor_password(
  p_vendor_id uuid,
  p_old_password text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify old password
  IF NOT EXISTS (
    SELECT 1 FROM vendor_credentials
    WHERE vendor_id = p_vendor_id
      AND password_hash = crypt(p_old_password, password_hash)
  ) THEN
    RAISE EXCEPTION 'Invalid old password';
  END IF;

  -- Update to new password
  UPDATE vendor_credentials
  SET password_hash = crypt(p_new_password, gen_salt('bf'))
  WHERE vendor_id = p_vendor_id;

  RETURN true;
END;
$$;
