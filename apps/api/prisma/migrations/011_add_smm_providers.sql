-- Migration: Add SMM Provider and Service Mapping tables
-- Date: 2026-09-22
-- Purpose: Enable automated SEEDING order processing with external SMM providers
-- NOTE: column names are camelCase to match Prisma schema (no @map on fields)

-- Create ProviderStatus enum
DO $$ BEGIN
  CREATE TYPE "ProviderStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create smm_providers table
CREATE TABLE IF NOT EXISTS "smm_providers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "apiUrl" TEXT NOT NULL,
  "apiKeyEncrypted" TEXT NOT NULL,
  "balanceEndpoint" TEXT,
  "status" "ProviderStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create service_mappings table
CREATE TABLE IF NOT EXISTS "service_mappings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "providerServiceId" TEXT NOT NULL,
  "ratePerThousand" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_mappings_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "service_mappings_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "smm_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "service_mappings_productId_providerId_key"
    UNIQUE ("productId", "providerId")
);

-- Add provider fields to orders table
ALTER TABLE "orders" DROP COLUMN IF EXISTS "provider_order_id";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "provider_id";
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='providerOrderId') THEN
    ALTER TABLE "orders" ADD COLUMN "providerOrderId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='providerId') THEN
    ALTER TABLE "orders" ADD COLUMN "providerId" TEXT;
  END IF;
END $$;

-- Add foreign key constraint (nullable - not all orders use providers)
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_provider_id_fkey";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_providerId_fkey";
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "smm_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "orders_providerOrderId_idx" ON "orders"("providerOrderId");
CREATE INDEX IF NOT EXISTS "orders_providerId_idx" ON "orders"("providerId");
CREATE INDEX IF NOT EXISTS "service_mappings_productId_idx" ON "service_mappings"("productId");
CREATE INDEX IF NOT EXISTS "service_mappings_providerId_idx" ON "service_mappings"("providerId");
