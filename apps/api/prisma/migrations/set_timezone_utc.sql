-- =============================================================================
-- Script: Set PostgreSQL Database Timezone to UTC
-- Purpose: After migrating to timestamptz, set DB timezone to UTC so NOW()
--          generates UTC timestamps instead of +07 local time
-- =============================================================================

-- STEP 1: Check current timezone setting
SELECT name, setting, context, source
FROM pg_settings
WHERE name = 'TimeZone';

-- Current output should show: Asia/Ho_Chi_Minh or UTC+7

-- =============================================================================
-- STEP 2: Set timezone to UTC permanently
-- =============================================================================

-- This command requires superuser privileges
-- It writes to postgresql.auto.conf file
ALTER SYSTEM SET timezone = 'UTC';

-- =============================================================================
-- STEP 3: Reload configuration (apply without restart)
-- =============================================================================

-- This makes the change take effect immediately without restarting PostgreSQL
SELECT pg_reload_conf();

-- =============================================================================
-- STEP 4: Verify the change
-- =============================================================================

-- Check that timezone is now UTC
SELECT name, setting, context, source
FROM pg_settings
WHERE name = 'TimeZone';

-- Expected output: setting = 'UTC', source = 'configuration file'

-- Test that NOW() generates UTC timestamps
SELECT 
  NOW() as current_utc_time,
  CURRENT_TIMESTAMP as current_timestamp,
  EXTRACT(TIMEZONE FROM NOW()) / 3600 as timezone_offset_hours;

-- Expected: timezone_offset_hours = 0 (UTC has no offset)

-- =============================================================================
-- STEP 5: Test with sample data (optional verification)
-- =============================================================================

-- Create a test timestamp to verify behavior
DO $$
DECLARE
  test_time TIMESTAMPTZ;
BEGIN
  test_time := NOW();
  RAISE NOTICE 'Test timestamp: %', test_time;
  RAISE NOTICE 'Test timestamp in +07: %', test_time AT TIME ZONE 'Asia/Ho_Chi_Minh';
  RAISE NOTICE 'Test timestamp in UTC: %', test_time AT TIME ZONE 'UTC';
END $$;

-- =============================================================================
-- NOTES
-- =============================================================================

-- 1. ALTER SYSTEM requires superuser or pg_write_server_files role
-- 2. Changes are written to postgresql.auto.conf in the data directory
-- 3. pg_reload_conf() applies changes without restart (SIGHUP signal)
-- 4. All existing timestamptz data remains unchanged (already has timezone info)
-- 5. New timestamps from NOW(), CURRENT_TIMESTAMP will be in UTC
-- 6. Application code (Prisma) will receive UTC timestamps from now on

-- =============================================================================
-- FOR PORTABLE POSTGRESQL (if you have access to config file directly)
-- =============================================================================

/*
If you cannot use ALTER SYSTEM, manually edit postgresql.conf:

1. Find postgresql.conf in your data directory
2. Add or modify this line:
   timezone = 'UTC'
3. Reload config:
   - Windows: pg_ctl reload -D "path/to/data"
   - Linux/Mac: pg_ctl reload -D /path/to/data
   - Or: SELECT pg_reload_conf();
*/

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================

/*
-- To revert back to Asia/Ho_Chi_Minh:
ALTER SYSTEM SET timezone = 'Asia/Ho_Chi_Minh';
SELECT pg_reload_conf();
*/
