-- Add new fields to Transaction table
ALTER TABLE "transactions" 
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'COMPLETED';

-- Add new fields to Payout table
ALTER TABLE "payouts"
  ADD COLUMN "resolvedBy" TEXT,
  ADD COLUMN "resolvedAt" TIMESTAMP(3);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "transactions_userId_idx" ON "transactions"("userId");
CREATE INDEX IF NOT EXISTS "transactions_status_idx" ON "transactions"("status");
CREATE INDEX IF NOT EXISTS "transactions_sePayTransId_idx" ON "transactions"("sePayTransId");
CREATE INDEX IF NOT EXISTS "payouts_resolvedBy_idx" ON "payouts"("resolvedBy");
