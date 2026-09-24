-- ROO-06: Add Voucher system and Seeding Order Progress tracking

-- Add VoucherType enum
CREATE TYPE "VoucherType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- Create Voucher table
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "VoucherType" NOT NULL,
    "value" INTEGER NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "shopId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- Add voucher-related fields to Order table
ALTER TABLE "orders" 
  ADD COLUMN "voucherCode" TEXT,
  ADD COLUMN "discountAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "processingStatus" TEXT,
  ADD COLUMN "processedQuantity" INTEGER NOT NULL DEFAULT 0;

-- Create indexes for better query performance
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");
CREATE INDEX "vouchers_shopId_idx" ON "vouchers"("shopId");
CREATE INDEX "vouchers_isActive_idx" ON "vouchers"("isActive");
CREATE INDEX "vouchers_expiresAt_idx" ON "vouchers"("expiresAt");
CREATE INDEX "orders_voucherCode_idx" ON "orders"("voucherCode");

-- Add foreign key constraints
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_voucherCode_fkey" FOREIGN KEY ("voucherCode") REFERENCES "vouchers"("code") ON DELETE SET NULL ON UPDATE CASCADE;
