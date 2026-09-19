# Scan Feature Fix — Deployment Guide

## Problem identified

The scan feature originally stored results in an in-memory `Map`. That loses
results on serverless platforms such as Vercel because separate invocations do
not share process memory.

## Solution

Scan results are persisted to Supabase/PostgreSQL, with an in-memory fallback
when the database is unavailable.

- `gui/server/db/schema.sql` defines the required schema changes.
- `gui/server/db/migration-scan-text-id.sql` converts scan IDs to text and
  makes standalone scans possible.
- `gui/server/src/services/scanJobService.ts` creates, retrieves, and updates
  persisted scan jobs.

## Deployment

Run the migration against the configured database:

```bash
psql $DATABASE_URL -f gui/server/db/migration-scan-text-id.sql
```

Set these environment variables for the GUI server:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url
```

Deploy `gui/server` as the API and `gui/app` as the editor interface. Then run
a scan, wait for it to finish, and open its details to confirm the report and
findings are retained.

If a migration contains existing scan data, back it up before applying schema
changes.
