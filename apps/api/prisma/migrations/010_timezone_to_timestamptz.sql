-- Migration: Convert all DateTime columns from timestamp (naive) to timestamptz
-- Context: DB currently in +07 timezone, all existing timestamps are wall-time +07
-- Strategy: Use AT TIME ZONE to preserve wall-time meaning, then set DB to UTC

-- =============================================================================
-- STEP 1: Convert all timestamp columns to timestamptz
-- Using "AT TIME ZONE 'Asia/Ho_Chi_Minh'" to preserve existing wall-time values
-- =============================================================================

-- Users table
ALTER TABLE "users" 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Shops table
ALTER TABLE "shops"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Products table
ALTER TABLE "products"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Product stocks table
ALTER TABLE "product_stocks"
  ALTER COLUMN "soldAt" TYPE TIMESTAMPTZ(3) USING "soldAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Orders table
ALTER TABLE "orders"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Order items table
ALTER TABLE "order_items"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Wallets table
ALTER TABLE "wallets"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Transactions table
ALTER TABLE "transactions"
  ALTER COLUMN "canWithdrawAt" TYPE TIMESTAMPTZ(3) USING "canWithdrawAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Payouts table
ALTER TABLE "payouts"
  ALTER COLUMN "resolvedAt" TYPE TIMESTAMPTZ(3) USING "resolvedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Disputes table
ALTER TABLE "disputes"
  ALTER COLUMN "resolvedAt" TYPE TIMESTAMPTZ(3) USING "resolvedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Reviews table
ALTER TABLE "reviews"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Vouchers table
ALTER TABLE "vouchers"
  ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ(3) USING "expiresAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Flash sales table
ALTER TABLE "flash_sales"
  ALTER COLUMN "startAt" TYPE TIMESTAMPTZ(3) USING "startAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "endAt" TYPE TIMESTAMPTZ(3) USING "endAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- =============================================================================
-- STEP 2: Verification query (run after migration to verify)
-- =============================================================================

-- Uncomment and run these queries to verify the migration:

/*
-- Check that all timestamps are now timestamptz
SELECT 
  table_name,
  column_name,
  data_type,
  datetime_precision
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type LIKE '%timestamp%'
ORDER BY table_name, column_name;

-- Verify a sample of recent records (should be close to current UTC time)
SELECT 
  'users' as table_name,
  id,
  "createdAt",
  "createdAt" AT TIME ZONE 'UTC' as utc_time,
  NOW() as current_utc,
  NOW() - "createdAt" as age
FROM users
ORDER BY "createdAt" DESC
LIMIT 5;

-- Check if NOW() produces UTC timestamps (should be roughly 2026-09-22 12:26:00 UTC)
SELECT 
  NOW() as server_now_utc,
  CURRENT_TIMESTAMP as current_timestamp,
  TIMEZONE('UTC', NOW()) as explicit_utc;
*/

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN "users"."createdAt" IS 'User creation timestamp in UTC (timestamptz)';
COMMENT ON COLUMN "users"."updatedAt" IS 'User last update timestamp in UTC (timestamptz)';
COMMENT ON COLUMN "transactions"."canWithdrawAt" IS '24-hour hold period end time in UTC (timestamptz)';
COMMENT ON COLUMN "flash_sales"."startAt" IS 'Flash sale start time in UTC (timestamptz)';
COMMENT ON COLUMN "flash_sales"."endAt" IS 'Flash sale end time in UTC (timestamptz)';
