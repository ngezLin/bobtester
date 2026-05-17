-- Migration: Change scan IDs from BIGINT to TEXT to support UUID-based scans
-- This allows standalone scans without requiring project_id and target_id

-- Step 1: Drop dependent foreign key constraints
ALTER TABLE findings DROP CONSTRAINT IF EXISTS findings_scan_id_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_scan_id_fkey;

-- Step 2: Backup existing data (optional, for safety)
-- CREATE TABLE scans_backup AS SELECT * FROM scans;
-- CREATE TABLE findings_backup AS SELECT * FROM findings;
-- CREATE TABLE reports_backup AS SELECT * FROM reports;

-- Step 3: Alter the scans table
-- Drop the old primary key constraint
ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_pkey;

-- Change id column type and make it not auto-increment
ALTER TABLE scans ALTER COLUMN id DROP IDENTITY IF EXISTS;
ALTER TABLE scans ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Make project_id and target_id nullable (for standalone scans)
ALTER TABLE scans ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE scans ALTER COLUMN target_id DROP NOT NULL;

-- Re-add primary key
ALTER TABLE scans ADD PRIMARY KEY (id);

-- Step 4: Alter findings table
ALTER TABLE findings ALTER COLUMN scan_id TYPE TEXT USING scan_id::TEXT;

-- Step 5: Alter reports table
ALTER TABLE reports ALTER COLUMN scan_id TYPE TEXT USING scan_id::TEXT;

-- Step 6: Re-add foreign key constraints
ALTER TABLE findings 
  ADD CONSTRAINT findings_scan_id_fkey 
  FOREIGN KEY (scan_id) 
  REFERENCES scans(id) 
  ON DELETE CASCADE;

ALTER TABLE reports 
  ADD CONSTRAINT reports_scan_id_fkey 
  FOREIGN KEY (scan_id) 
  REFERENCES scans(id) 
  ON DELETE CASCADE;

-- Step 7: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_reports_scan_id ON reports(scan_id);

-- Made with Bob
