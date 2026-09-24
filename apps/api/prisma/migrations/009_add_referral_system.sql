-- Migration: Add referral system to User table
-- Description: Add referralCode, referredBy, and hasReceivedReferral fields for affiliate tracking

-- Add referral columns to users table
ALTER TABLE "users" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "users" ADD COLUMN "referredBy" TEXT;
ALTER TABLE "users" ADD COLUMN "hasReceivedReferral" BOOLEAN NOT NULL DEFAULT false;

-- Create unique index on referralCode
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- Add comments for documentation
COMMENT ON COLUMN "users"."referralCode" IS 'Unique referral code generated for this user to share with others';
COMMENT ON COLUMN "users"."referredBy" IS 'Referral code of the user who referred this user';
COMMENT ON COLUMN "users"."hasReceivedReferral" IS 'Flag to track if referrer has received commission for this referred user (one-time only on first order)';
