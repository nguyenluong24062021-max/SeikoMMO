# Flash Sale System Documentation (ROO-08)

## Overview
Flash Sale system cho phép seller và admin tạo các đợt sale giới hạn thời gian và số lượng, tăng urgency và thúc đẩy bán hàng.

## Features

### 1. Flash Sale Model
```prisma
model FlashSale {
  id           String    @id @default(uuid())
  productId    String
  salePrice    Int       // Giá sale (VND)
  stockCap     Int       // Số lượng tối đa
  soldCount    Int       @default(0)
  startAt      DateTime  // Thời gian bắt đầu
  endAt        DateTime  // Thời gian kết thúc
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  product      Product   @relation(...)
}
```

### 2. API Endpoints

#### Seller/Admin - Manage Flash Sales
```
POST   /flash-sales              # Tạo flash sale mới
GET    /flash-sales?productId=x  # List flash sales (có filter)
GET    /flash-sales/:id          # Chi tiết flash sale
PATCH  /flash-sales/:id          # Update flash sale
DELETE /flash-sales/:id          # Xóa flash sale
```

#### Public - View Active Flash Sales
```
GET    /flash-sales/active       # Danh sách flash sales đang active
```

### 3. Business Logic

#### Tạo Flash Sale
- **Validation**:
  - `salePrice` < giá gốc product
  - `startAt` < `endAt`
  - Không overlap với flash sale khác trên cùng product
  - Seller phải owns shop hoặc là admin

#### Áp Dụng Flash Sale Khi Order
1. **Check active flash sale**: Khi buyer tạo order, system check xem product có flash sale active không
   ```typescript
   const flashSale = await flashSalesService.findActiveByProductId(productId);
   // Active = isActive=true && startAt <= now <= endAt
   ```

2. **Validate stock capacity**:
   - Nếu `flashSale.soldCount + quantity <= flashSale.stockCap`: Áp dụng `salePrice`
   - Nếu hết cap: Dùng giá gốc
   - Nếu chỉ đủ một phần: Throw error yêu cầu adjust quantity

3. **Update soldCount**: Sau khi order thành công, increment `soldCount` trong transaction

#### Voucher Stacking Rules
- **KHÔNG CHO PHÉP**: Voucher PERCENTAGE + Flash Sale
  - Lý do: Tránh stack discount quá sâu
  - Error: "Cannot use percentage voucher with flash sale items"
  
- **CHO PHÉP**: Voucher FIXED_AMOUNT + Flash Sale
  - Buyer có thể dùng voucher giảm cố định cộng với flash sale

### 4. Order Flow với Flash Sale

```typescript
// Pseudocode
for (item in orderItems) {
  const flashSale = await findActiveFlashSale(item.productId);
  
  if (flashSale && flashSale.remaining >= item.quantity) {
    item.price = flashSale.salePrice;  // Áp dụng giá sale
    item.isFlashSale = true;
    flashSaleUpdates.push({ id: flashSale.id, qty: item.quantity });
  } else {
    item.price = product.price;  // Giá gốc
  }
}

// Validate voucher
if (voucherCode && hasFlashSaleItems && voucher.type === PERCENTAGE) {
  throw Error("Cannot stack PERCENTAGE voucher with flash sale");
}

// In transaction
await incrementFlashSaleSoldCount(flashSaleUpdates);
```

### 5. Edge Cases

#### Case 1: Flash Sale Hết Giờ
- Order được tạo **SAU** `endAt`: Dùng giá gốc
- Order được tạo **TRƯỚC** `endAt` nhưng complete sau: Vẫn giữ `salePrice` đã snapshot

#### Case 2: Flash Sale Hết Slot
- Buyer A mua 5, remaining = 0
- Buyer B try mua 1: Lấy giá gốc (không throw error)
- Buyer C mua 10, remaining = 3: Throw error "only 3 items remaining in flash sale"

#### Case 3: Overlapping Flash Sales
- Không cho phép tạo 2 flash sale overlap thời gian trên cùng product
- Check khi create/update flash sale

### 6. Database Indexes
```sql
CREATE INDEX "flash_sales_productId_idx" ON "flash_sales"("productId");
CREATE INDEX "flash_sales_startAt_endAt_idx" ON "flash_sales"("startAt", "endAt");
CREATE INDEX "flash_sales_isActive_idx" ON "flash_sales"("isActive");
```

## API Examples

### Create Flash Sale
```bash
POST /flash-sales
Authorization: Bearer {seller_token}
Content-Type: application/json

{
  "productId": "prod-123",
  "salePrice": 70000,      # Giá gốc 100,000 VND → sale 30%
  "stockCap": 10,          # Chỉ bán 10 slot
  "startAt": "2026-09-22T12:00:00Z",
  "endAt": "2026-09-22T18:00:00Z"
}

# Response
{
  "success": true,
  "message": "Flash sale created successfully",
  "data": {
    "id": "fs-abc",
    "productId": "prod-123",
    "productName": "Premium Account",
    "originalPrice": 100000,
    "salePrice": 70000,
    "stockCap": 10,
    "soldCount": 0,
    "startAt": "2026-09-22T12:00:00Z",
    "endAt": "2026-09-22T18:00:00Z",
    "isActive": true
  }
}
```

### Get Active Flash Sales
```bash
GET /flash-sales/active

# Response
{
  "success": true,
  "data": [
    {
      "id": "fs-abc",
      "productId": "prod-123",
      "productName": "Premium Account",
      "originalPrice": 100000,
      "salePrice": 70000,
      "stockCap": 10,
      "soldCount": 7,          # Còn 3 slot
      "startAt": "2026-09-22T12:00:00Z",
      "endAt": "2026-09-22T18:00:00Z"
    }
  ]
}
```

### Create Order with Flash Sale
```bash
POST /orders
Authorization: Bearer {buyer_token}
Content-Type: application/json

{
  "items": [
    { "productId": "prod-123", "quantity": 2 }
  ]
}

# Response - Tự động áp dụng flash sale price
{
  "success": true,
  "data": {
    "id": "order-xyz",
    "totalAmount": 140000,   # 2 × 70,000 (flash sale price)
    "items": [
      {
        "productId": "prod-123",
        "quantity": 2,
        "price": 70000         # Flash sale price (không phải 100,000)
      }
    ]
  }
}
```

## Acceptance Criteria

### Test Scenario: Flash Sale 30% với 10 Slots
```bash
# 1. Seller tạo flash sale
POST /flash-sales
{
  "productId": "prod-x",
  "salePrice": 70000,
  "stockCap": 10,
  "startAt": "now",
  "endAt": "now + 1 hour"
}

# 2. Buyer mua 10 items → OK với giá sale
POST /orders { items: [{ productId: "prod-x", quantity: 10 }] }
→ totalAmount = 700,000 (10 × 70,000)

# 3. Buyer khác mua item thứ 11 → Giá gốc
POST /orders { items: [{ productId: "prod-x", quantity: 1 }] }
→ totalAmount = 100,000 (1 × 100,000 giá gốc)

# 4. Flash sale hết giờ → Tự động không active
# Mọi order sau endAt đều lấy giá gốc

# 5. Try stack PERCENTAGE voucher với flash sale → Error 400
POST /orders
{
  "items": [{ "productId": "prod-x", "quantity": 1 }],
  "voucherCode": "PERCENT10"  # Voucher type PERCENTAGE
}
→ 400 Bad Request: "Cannot use percentage voucher with flash sale items"

# 6. Stack FIXED_AMOUNT voucher với flash sale → OK
POST /orders
{
  "items": [{ "productId": "prod-x", "quantity": 1 }],
  "voucherCode": "MINUS5K"  # Voucher type FIXED_AMOUNT, value=5000
}
→ totalAmount = 65,000 (70,000 - 5,000)
```

## Build & Migration

```bash
# 1. Migrate database
cd apps/api
npx prisma migrate dev --name add_flash_sales
# Hoặc run SQL manually:
psql -U postgres -d seiko_marketplace < prisma/migrations/008_add_flash_sales.sql

# 2. Generate Prisma client
npx prisma generate

# 3. Build shared package
cd ../../packages/shared
pnpm build

# 4. Build API
cd ../../apps/api
npm run build

# 5. Start services
npm run start:dev
```

## Notes
- Flash sale price được **snapshot** vào order items (không bị ảnh hưởng nếu flash sale bị xóa/edit sau)
- `soldCount` chỉ tăng, không giảm khi order bị cancel/refund (để tránh gaming system)
- Admin có thể update `isActive=false` để tạm dừng flash sale mà không cần xóa
- Recommend: Set up cron job để auto-disable flash sales đã hết hạn (optional optimization)

## Related Files
- Schema: [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma)
- Migration: [`apps/api/prisma/migrations/008_add_flash_sales.sql`](apps/api/prisma/migrations/008_add_flash_sales.sql)
- Service: [`apps/api/src/flash-sales/flash-sales.service.ts`](apps/api/src/flash-sales/flash-sales.service.ts)
- Controller: [`apps/api/src/flash-sales/flash-sales.controller.ts`](apps/api/src/flash-sales/flash-sales.controller.ts)
- Module: [`apps/api/src/flash-sales/flash-sales.module.ts`](apps/api/src/flash-sales/flash-sales.module.ts)
- Orders Integration: [`apps/api/src/orders/orders.service.ts`](apps/api/src/orders/orders.service.ts:27-340)
- Shared Types: [`packages/shared/src/types/index.ts`](packages/shared/src/types/index.ts:375-418)
