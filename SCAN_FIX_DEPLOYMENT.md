# Scan Feature Fix - Deployment Guide

## Problem Identified

The scan feature was not working properly in deployment because:

1. **In-Memory Storage Issue**: The `scanJobService` was using an in-memory `Map` to store scan results
2. **Serverless Environment**: On platforms like Vercel, serverless functions don't maintain state between invocations
3. **Result Loss**: When a scan completed, the results were stored in memory, but when the user tried to view them, a new function instance was created without access to that data

## Solution Implemented

The scan results are now persisted to the database (Supabase/PostgreSQL) instead of in-memory storage:

### Changes Made

1. **Database Schema Updates** (`api/db/schema.sql`):
   - Changed `scans.id` from auto-increment BIGINT to TEXT (to support UUID-based IDs)
   - Made `project_id` and `target_id` nullable (to support standalone scans)
   - Updated `findings.scan_id` and `reports.scan_id` to TEXT type

2. **Scan Job Service** (`api/src/services/scanJobService.ts`):
   - Updated all functions to be async and interact with Supabase
   - `createScanJob()`: Now inserts scan records into the database
   - `getScanJob()`: Retrieves scan data from database (with report and findings)
   - `updateScanJob()`: Updates scan status, saves report and findings to database
   - Maintains in-memory fallback for when database is unavailable

3. **Scan Controller** (`api/src/controllers/scanController.ts`):
   - Updated to use async versions of scanJobService functions
   - All database operations now use `await`

## Deployment Steps

### 1. Run Database Migration

Connect to your Supabase database and run the migration script:

```bash
# Using Supabase CLI
supabase db push

# Or manually execute the migration
psql $DATABASE_URL -f api/db/migration-scan-text-id.sql
```

The migration script (`api/db/migration-scan-text-id.sql`) will:
- Convert scan IDs from BIGINT to TEXT
- Make project_id and target_id nullable
- Update foreign key relationships
- Add performance indexes

### 2. Verify Environment Variables

Ensure these environment variables are set in your deployment:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database URL (if using direct PostgreSQL connection)
DATABASE_URL=your_database_url
```

### 3. Deploy the Updated Code

```bash
# Deploy API
cd api
vercel --prod

# Deploy Web
cd ../web
vercel --prod
```

### 4. Test the Scan Feature

1. Navigate to the scan page
2. Create a new scan with a target URL
3. Wait for the scan to complete
4. Click "View Details" on the completed scan
5. Verify that the report and findings are displayed correctly

## How It Works Now

### Scan Creation Flow:
1. User submits a scan request
2. `createScanJob()` generates a UUID and inserts a record into the `scans` table
3. Scan engine processes the target URL
4. Results are saved to database via `updateScanJob()`

### Scan Retrieval Flow:
1. User views scan details
2. `getScanJob()` queries the database for:
   - Scan metadata from `scans` table
   - Report data from `reports` table
   - Findings from `findings` table
3. Data is returned and displayed to the user

### Benefits:
- ✅ Scan results persist across serverless function invocations
- ✅ Multiple users can view the same scan results
- ✅ Scan history is maintained in the database
- ✅ Graceful fallback to in-memory storage if database is unavailable

## Troubleshooting

### Scans still showing empty results:

1. **Check database connection**:
   ```bash
   # Test Supabase connection
   curl -X GET "https://your-project.supabase.co/rest/v1/scans" \
     -H "apikey: your-anon-key" \
     -H "Authorization: Bearer your-anon-key"
   ```

2. **Verify migration was applied**:
   ```sql
   -- Check if scans.id is TEXT type
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'scans' AND column_name = 'id';
   ```

3. **Check API logs** for database errors:
   ```bash
   vercel logs api-project-name
   ```

4. **Verify RLS policies** (if using Supabase Row Level Security):
   - Ensure the service role key has access to insert/update/select on scans, findings, and reports tables

### Database migration fails:

If you have existing scan data with BIGINT IDs:
1. Backup your data first
2. Clear the scans, findings, and reports tables
3. Run the migration
4. Or modify the migration to preserve existing data by converting IDs to TEXT

## Rollback Plan

If issues occur, you can rollback by:

1. Revert the code changes:
   ```bash
   git revert HEAD
   git push
   ```

2. Restore the original schema (if needed):
   ```sql
   -- Restore original schema
   -- (Keep a backup of your original schema before migration)
   ```

## Notes

- The in-memory fallback ensures the system continues to work even if the database is temporarily unavailable
- Scan results are now permanent and can be accessed at any time
- Consider implementing a cleanup job to remove old scan results after a certain period