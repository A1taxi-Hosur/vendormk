/*
  # Create Vendor Credentials Table

  1. New Tables
    - `vendor_credentials`
      - `id` (uuid, primary key) - Unique identifier for credentials
      - `vendor_id` (uuid, foreign key) - Reference to vendors table
      - `username` (text, unique, not null) - Login username
      - `password_hash` (text, not null) - Hashed password using pgcrypto
      - `created_at` (timestamptz) - When credentials were created
      - `updated_at` (timestamptz) - When credentials were last updated

  2. Security
    - Enable RLS on `vendor_credentials` table
    - NO public access policies (authentication functions use SECURITY DEFINER to bypass RLS)
    - Only internal functions can access credentials for security

  3. Migration
    - Migrate existing credentials from vendors table
    - Handle both password_hash and plaintext password columns

  4. Notes
    - Separates authentication credentials from vendor business data
    - Improves security by isolating sensitive credentials
    - Allows for future authentication enhancements
*/

-- Create vendor_credentials table
CREATE TABLE IF NOT EXISTS vendor_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL UNIQUE REFERENCES vendors(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS (no public policies - only SECURITY DEFINER functions can access)
ALTER TABLE vendor_credentials ENABLE ROW LEVEL SECURITY;

-- Create index for fast username lookup
CREATE INDEX IF NOT EXISTS idx_vendor_credentials_username ON vendor_credentials(username);
CREATE INDEX IF NOT EXISTS idx_vendor_credentials_vendor_id ON vendor_credentials(vendor_id);

-- Migrate existing credentials from vendors table
-- First, migrate vendors with password_hash (already hashed)
INSERT INTO vendor_credentials (vendor_id, username, password_hash, created_at)
SELECT 
  id,
  username,
  password_hash,
  created_at
FROM vendors
WHERE username IS NOT NULL 
  AND password_hash IS NOT NULL
  AND username NOT IN (SELECT username FROM vendor_credentials)
ON CONFLICT (vendor_id) DO NOTHING;

-- Then, migrate vendors with plaintext password (hash them first)
INSERT INTO vendor_credentials (vendor_id, username, password_hash, created_at)
SELECT 
  id,
  username,
  crypt(password, gen_salt('bf')),
  created_at
FROM vendors
WHERE username IS NOT NULL 
  AND password IS NOT NULL
  AND password_hash IS NULL
  AND username NOT IN (SELECT username FROM vendor_credentials)
ON CONFLICT (vendor_id) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_vendor_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_vendor_credentials_updated_at ON vendor_credentials;
CREATE TRIGGER set_vendor_credentials_updated_at
  BEFORE UPDATE ON vendor_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_credentials_updated_at();
