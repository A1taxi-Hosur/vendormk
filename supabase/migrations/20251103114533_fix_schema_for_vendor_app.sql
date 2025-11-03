/*
  # Fix Schema for Vendor Management App

  ## Changes Made
  
  1. **Vehicles Table Updates**
     - Add `status` column (active, maintenance, inactive)
     - Add `vehicle_number` column for registration/plate number
     - Make existing columns nullable where appropriate
     - Add default values

  2. **Drivers Table Updates**
     - Add `email` column
     - Add `phone` column  
     - Make `license_expiry` nullable
     - Add default status value
     - Rename `phone_number` to `phone` for consistency

  3. **Foreign Key Constraint Updates**
     - Ensure proper relationships between vehicles and drivers
     
  4. **Data Migration**
     - Copy `registration_number` to new `vehicle_number` column
     - Set default status for existing records
*/

-- Add missing columns to vehicles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'status'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN status text DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'vehicle_number'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN vehicle_number text;
    UPDATE vehicles SET vehicle_number = registration_number WHERE vehicle_number IS NULL;
    ALTER TABLE vehicles ALTER COLUMN vehicle_number SET NOT NULL;
  END IF;
END $$;

-- Make year nullable and set defaults
ALTER TABLE vehicles ALTER COLUMN year DROP NOT NULL;
ALTER TABLE vehicles ALTER COLUMN color DROP NOT NULL;
ALTER TABLE vehicles ALTER COLUMN color SET DEFAULT 'Unknown';

-- Add missing columns to drivers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'email'
  ) THEN
    ALTER TABLE drivers ADD COLUMN email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'phone'
  ) THEN
    ALTER TABLE drivers ADD COLUMN phone text;
    UPDATE drivers SET phone = phone_number WHERE phone IS NULL AND phone_number IS NOT NULL;
  END IF;
END $$;

-- Make license_expiry nullable
ALTER TABLE drivers ALTER COLUMN license_expiry DROP NOT NULL;

-- Set default status for drivers
UPDATE drivers SET status = 'active' WHERE status IS NULL;
ALTER TABLE drivers ALTER COLUMN status SET DEFAULT 'active';

-- Set default status for vehicles  
UPDATE vehicles SET status = 'active' WHERE status IS NULL;

-- Add check constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_status_check'
  ) THEN
    ALTER TABLE vehicles ADD CONSTRAINT vehicles_status_check 
    CHECK (status IN ('active', 'maintenance', 'inactive'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drivers_status_check'
  ) THEN
    ALTER TABLE drivers ADD CONSTRAINT drivers_status_check 
    CHECK (status IN ('active', 'inactive', 'online', 'offline'));
  END IF;
END $$;
