-- Migration 012: Add Crypto Payment Provider Support
-- Adds PaymentProvider enum and providerTxId to Transaction model
-- Backfills existing sePayTransId data to providerTxId

-- Step 1: Create PaymentProvider enum
CREATE TYPE "PaymentProvider" AS ENUM ('SEPAY', 'NOWPAYMENTS', 'MANUAL');

-- Step 2: Add new columns to transactions table
ALTER TABLE "transactions" 
  ADD COLUMN "provider" "PaymentProvider" DEFAULT 'SEPAY' NOT NULL,
  ADD COLUMN "providerTxId" TEXT;

-- Step 3: Backfill providerTxId from sePayTransId for existing records
UPDATE "transactions"
SET "providerTxId" = "sePayTransId",
    "provider" = 'SEPAY'
WHERE "sePayTransId" IS NOT NULL;

-- Step 4: Add unique constraint on providerTxId
CREATE UNIQUE INDEX "transactions_providerTxId_key" ON "transactions"("providerTxId");

-- Step 5: Add comment for documentation
COMMENT ON COLUMN "transactions"."provider" IS 'Payment provider: SEPAY (bank transfer), NOWPAYMENTS (crypto), or MANUAL (admin adjustment)';
COMMENT ON COLUMN "transactions"."providerTxId" IS 'Universal provider transaction ID - replaces sePayTransId for new transactions';
COMMENT ON COLUMN "transactions"."sePayTransId" IS 'DEPRECATED: Legacy SePay transaction ID - kept for backward compatibility only';
