/*
  # Update Vendor Credentials to Use Plaintext Password

  1. Changes
    - Drop `password_hash` column from vendor_credentials
    - Add `password` column (plaintext) to vendor_credentials
    - Copy passwords from vendors table to vendor_credentials table
    - Set default password for vendors without password in vendors table
    - Update verify_vendor_login function to use plaintext password comparison
    - Update create_vendor function to store plaintext password

  2. Security Note
    - This migration changes from bcrypt hashed passwords to plaintext passwords
    - Passwords will be stored in plaintext in vendor_credentials table
    - This is for development/testing purposes

  3. Data Migration
    - Existing vendor credentials will have passwords copied from vendors table
    - Vendors without password in vendors table will get default password "123456"
*/

-- Step 1: Add password column to vendor_credentials (allow NULL temporarily)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_credentials' AND column_name = 'password'
  ) THEN
    ALTER TABLE vendor_credentials ADD COLUMN password text;
  END IF;
END $$;

-- Step 2: Copy passwords from vendors table to vendor_credentials
UPDATE vendor_credentials vc
SET password = v.password
FROM vendors v
WHERE vc.vendor_id = v.id
  AND v.password IS NOT NULL
  AND vc.password IS NULL;

-- Step 3: Set default password for vendors without password
UPDATE vendor_credentials
SET password = '123456'
WHERE password IS NULL;

-- Step 4: Also update vendors table for consistency
UPDATE vendors v
SET password = '123456'
WHERE password IS NULL
  AND EXISTS (
    SELECT 1 FROM vendor_credentials vc
    WHERE vc.vendor_id = v.id
  );

-- Step 5: Drop password_hash column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_credentials' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE vendor_credentials DROP COLUMN password_hash;
  END IF;
END $$;

-- Step 6: Make password NOT NULL (after data migration)
ALTER TABLE vendor_credentials ALTER COLUMN password SET NOT NULL;

-- Step 7: Update verify_vendor_login function to use plaintext password
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
    AND vc.password = p_password;
END;
$$;

-- Step 8: Update create_vendor function to store plaintext password
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
  INSERT INTO vendors (company_name, license_number, address, username, password)
  VALUES (p_company_name, p_license_number, p_address, p_username, p_password)
  RETURNING id INTO v_vendor_id;

  -- Insert credentials with plaintext password
  INSERT INTO vendor_credentials (vendor_id, username, password)
  VALUES (v_vendor_id, p_username, p_password);

  RETURN v_vendor_id;
END;
$$;

-- Step 9: Update update_vendor_password function to use plaintext password
DROP FUNCTION IF EXISTS update_vendor_password(uuid, text, text);

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
      AND password = p_old_password
  ) THEN
    RAISE EXCEPTION 'Invalid old password';
  END IF;

  -- Update to new password in vendor_credentials
  UPDATE vendor_credentials
  SET password = p_new_password
  WHERE vendor_id = p_vendor_id;

  -- Also update password in vendors table
  UPDATE vendors
  SET password = p_new_password
  WHERE id = p_vendor_id;

  RETURN true;
END;
$$;

-- Grant execute permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION verify_vendor_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION verify_vendor_login(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_vendor(text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION create_vendor(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_vendor_password(uuid, text, text) TO authenticated;
