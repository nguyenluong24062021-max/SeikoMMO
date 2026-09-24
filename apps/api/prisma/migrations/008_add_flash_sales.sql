-- Migration: Add FlashSale model
-- Date: 2026-09-22
-- Description: Add flash sale system with stock cap and time-based sales

-- Create flash_sales table
CREATE TABLE "flash_sales" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "salePrice" INTEGER NOT NULL,
    "stockCap" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flash_sales_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "flash_sales" ADD CONSTRAINT "flash_sales_productId_fkey" 
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for performance
CREATE INDEX "flash_sales_productId_idx" ON "flash_sales"("productId");
CREATE INDEX "flash_sales_startAt_endAt_idx" ON "flash_sales"("startAt", "endAt");
CREATE INDEX "flash_sales_isActive_idx" ON "flash_sales"("isActive");

-- Comments for documentation
COMMENT ON TABLE "flash_sales" IS 'Flash sale campaigns with limited stock and time window';
COMMENT ON COLUMN "flash_sales"."salePrice" IS 'Discounted price in VND (must be less than original product price)';
COMMENT ON COLUMN "flash_sales"."stockCap" IS 'Maximum quantity available for this flash sale';
COMMENT ON COLUMN "flash_sales"."soldCount" IS 'Number of items sold during this flash sale';
COMMENT ON COLUMN "flash_sales"."startAt" IS 'When the flash sale begins';
COMMENT ON COLUMN "flash_sales"."endAt" IS 'When the flash sale ends';
