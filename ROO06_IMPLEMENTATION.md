# ROO-06 Implementation: Vouchers, Seeding Order Progress & Production Safety

## Tổng quan

ROO-06 thêm 3 tính năng quan trọng:
1. **Voucher System**: Hỗ trợ mã giảm giá % hoặc số tiền cố định, per-shop hoặc toàn sàn
2. **Seeding Order Lifecycle**: Seller cập nhật tiến độ PROCESSING/PARTIAL/COMPLETED với auto-refund
3. **Production Safety**: Crash server nếu chạy production với SEPAY_ALLOW_UNSIGNED=true

---

## 1. Voucher System

### Database Schema

**VoucherType Enum:**
```prisma
enum VoucherType {
  PERCENTAGE      // 10 = 10% discount
  FIXED_AMOUNT    // 50000 = 50,000 VND discount
}
```

**Voucher Model:**
```prisma
model Voucher {
  id          String      @id @default(uuid())
  code        String      @unique
  type        VoucherType
  value       Int         // Percentage or VND amount
  maxUses     Int         @default(1)
  usedCount   Int         @default(0)
  expiresAt   DateTime?
  shopId      String?     // null = platform-wide
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  shop        Shop?       @relation(...)
  orders      Order[]
}
```

**Order Model Updates:**
```prisma
model Order {
  // ... existing fields
  voucherCode       String?
  discountAmount    Int @default(0)
  processingStatus  String?
  processedQuantity Int @default(0)
  
  voucher     Voucher?  @relation(fields: [voucherCode], references: [code])
}
```

### API Endpoints

#### POST /vouchers (SELLER, ADMIN)
Tạo voucher mới.

**Request:**
```json
{
  "code": "NEWYEAR2024",
  "type": "PERCENTAGE",
  "value": 10,
  "maxUses": 100,
  "expiresAt": "2024-12-31T23:59:59Z",
  "shopId": "shop-uuid"  // null cho platform-wide
}
```

**Validation:**
- PERCENTAGE: value phải từ 1-100
- FIXED_AMOUNT: value phải >= 1000 VND
- Seller chỉ tạo được voucher cho shop của mình (trừ ADMIN)
- Code phải unique

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "voucher-uuid",
    "code": "NEWYEAR2024",
    "type": "PERCENTAGE",
    "value": 10,
    "maxUses": 100,
    "usedCount": 0,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "shopId": "shop-uuid",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET /vouchers
List vouchers (phân quyền theo role).

**Access Control:**
- ADMIN: Xem tất cả vouchers
- SELLER: Xem vouchers của shops mình sở hữu + platform-wide vouchers
- BUYER: Xem vouchers active, chưa hết hạn, còn lượt dùng

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "voucher-uuid",
      "code": "NEWYEAR2024",
      "type": "PERCENTAGE",
      "value": 10,
      "maxUses": 100,
      "usedCount": 45,
      "expiresAt": "2024-12-31T23:59:59.000Z",
      "shopId": null,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### PATCH /vouchers/:code (SELLER, ADMIN)
Update voucher (type, value, maxUses, expiresAt, isActive).

**Request:**
```json
{
  "value": 15,
  "maxUses": 200,
  "isActive": false
}
```

#### DELETE /vouchers/:code (SELLER, ADMIN)
Xóa voucher (chỉ ADMIN cho platform-wide, SELLER cho shop vouchers).

---

### Voucher Application Logic

**Trong OrdersService.create():**

1. **Validate voucher code:**
```typescript
if (createOrderDto.voucherCode) {
  const validation = await vouchersService.validateAndUse(
    createOrderDto.voucherCode,
    shopId,
  );
  
  if (!validation.valid) {
    throw new BadRequestException(validation.error);
  }
}
```

2. **Calculate discount:**
```typescript
if (voucher.type === VoucherType.PERCENTAGE) {
  discountAmount = Math.floor((totalAmount * voucher.value) / 100);
} else {
  discountAmount = voucher.value;
}

// Discount không được vượt quá tổng tiền
if (discountAmount > totalAmount) {
  discountAmount = totalAmount;
}

const finalAmount = totalAmount - discountAmount;
```

3. **Apply discount proportionally to sellers:**
```typescript
const discountRatio = discountAmount > 0 
  ? (totalAmount - discountAmount) / totalAmount 
  : 1;

for (const [sellerId, amount] of sellerPayments.entries()) {
  const adjustedAmount = Math.floor(amount * discountRatio);
  const commissionAmount = Math.floor((adjustedAmount * commissionRate) / 100);
  const sellerAmount = adjustedAmount - commissionAmount;
  
  // Credit seller wallet with adjusted amount
}
```

4. **Increment voucher usage:**
```typescript
await vouchersService.incrementUsage(voucherCode);
```

5. **Store voucher info in order:**
```typescript
await tx.order.create({
  data: {
    // ...
    voucherCode,
    discountAmount,
  }
});
```

**Validation Rules:**
- Voucher must be active
- Not expired (expiresAt > now)
- usedCount < maxUses
- If shopId specified, must match order's shop

---

## 2. Seeding Order Progress Tracking

### Order Status Lifecycle

**Existing statuses:** PENDING → PAID → DELIVERED

**New seeding statuses:**
- **PROCESSING**: Seller đang xử lý order (e.g., chạy được 300/1000 followers)
- **PARTIAL**: Hoàn thành một phần, tự động refund phần chưa chạy
- **COMPLETED**: Hoàn thành 100%
- **CANCELLED**: Hủy order

### API Endpoint

#### PATCH /orders/:id/progress (SELLER, ADMIN)
Seller cập nhật tiến độ seeding order.

**Request:**
```json
{
  "status": "PARTIAL",
  "processedQuantity": 700,
  "processingStatus": "Đã chạy 700/1000 followers, còn lại hết stock"
}
```

**Validation:**
- Chỉ seller của order mới update được
- status = PARTIAL phải có processedQuantity
- processedQuantity <= totalQuantity

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "status": "PARTIAL",
    "processedQuantity": 700,
    "processingStatus": "Đã chạy 700/1000 followers, còn lại hết stock",
    "totalAmount": 1000000,
    "discountAmount": 100000,
    "items": [
      {
        "productId": "product-uuid",
        "quantity": 1000,
        "price": 1000
      }
    ]
  },
  "message": "Order progress updated successfully"
}
```

### Auto-Refund Logic for PARTIAL Orders

**Calculation:**
```typescript
const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
const processedRatio = processedQuantity / totalQuantity;  // 700/1000 = 0.7
const unprocessedRatio = 1 - processedRatio;              // 0.3

const refundAmount = Math.floor(
  (order.totalAmount - order.discountAmount) * unprocessedRatio
);
// (1000000 - 100000) * 0.3 = 270,000 VND
```

**Transaction Flow:**
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Update order status
  await tx.order.update({
    where: { id: orderId },
    data: {
      status: 'PARTIAL',
      processedQuantity,
      processingStatus,
    },
  });

  // 2. Refund buyer
  await tx.wallet.update({
    where: { userId: order.buyerId },
    data: { balance: { increment: refundAmount } },
  });

  // 3. Create refund transaction
  await tx.transaction.create({
    data: {
      walletId: buyerWallet.id,
      orderId: order.id,
      amount: refundAmount,
      type: 'REFUND',
      status: 'COMPLETED',
      description: `Partial refund for order ${order.id}: ${unprocessedRatio * 100}% unprocessed`,
    },
  });
});
```

**Example:**
- Order: 1000 followers @ 1000 VND = 1,000,000 VND
- Voucher 10% = -100,000 VND
- Final paid: 900,000 VND
- Processed: 700/1000 = 70%
- Refund: 900,000 * 30% = 270,000 VND
- Buyer receives back: 270,000 VND

---

## 3. Production Safety Check

### Implementation

**In [`apps/api/src/main.ts`](apps/api/src/main.ts:1):**

```typescript
async function bootstrap() {
  // CRITICAL PRODUCTION SAFETY CHECK
  const isProduction = process.env.NODE_ENV === 'production';
  const allowUnsigned = process.env.SEPAY_ALLOW_UNSIGNED === 'true';

  if (isProduction && allowUnsigned) {
    console.error('');
    console.error('❌ FATAL ERROR: Cannot start in production mode with SEPAY_ALLOW_UNSIGNED=true');
    console.error('');
    console.error('This is a critical security risk. Unsigned webhooks allow attackers to:');
    console.error('- Fake payment confirmations');
    console.error('- Credit wallets without actual payment');
    console.error('- Steal funds from your platform');
    console.error('');
    console.error('To fix this:');
    console.error('1. Set SEPAY_ALLOW_UNSIGNED=false or remove it from .env');
    console.error('2. Ensure SEPAY_SECRET is properly configured');
    console.error('3. Restart the server');
    console.error('');
    process.exit(1);
  }
  
  // ... rest of bootstrap
}
```

### Test Cases

**Test 1: Development with unsigned allowed (OK)**
```bash
NODE_ENV=development
SEPAY_ALLOW_UNSIGNED=true
# Server starts with warning
```

**Test 2: Production with unsigned allowed (CRASH)**
```bash
NODE_ENV=production
SEPAY_ALLOW_UNSIGNED=true
# Server exits with code 1 and error message
```

**Test 3: Production with signature verification (OK)**
```bash
NODE_ENV=production
SEPAY_SECRET=your-secret-key
SEPAY_MERCHANT=SEIKO_MMO
# Server starts successfully
```

---

## Database Migration

**Run migration:**
```bash
cd apps/api
psql -U your_user -d your_database -f prisma/migrations/add_vouchers_and_order_progress.sql
```

**Or with Prisma:**
```bash
npx prisma db push
npx prisma generate
```

---

## Build & Test

**1. Build shared package:**
```bash
cd packages/shared
pnpm build
```

**2. Generate Prisma client:**
```bash
cd apps/api
npx prisma generate
```

**3. Build API:**
```bash
npm run build
```

**4. Run migrations:**
```bash
npx prisma db push
```

**5. Start server:**
```bash
node dist/main
```

---

## Acceptance Test Cases

### Test 1: Voucher Creation & Usage

**Create voucher:**
```bash
curl -X POST http://localhost:3001/vouchers \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "DISCOUNT10",
    "type": "PERCENTAGE",
    "value": 10,
    "maxUses": 10,
    "shopId": null
  }'
```

**Create order with voucher:**
```bash
curl -X POST http://localhost:3001/orders \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": "product-id", "quantity": 2}],
    "voucherCode": "DISCOUNT10"
  }'
```

**Expected:**
- Total: 200,000 VND
- Discount: 20,000 VND (10%)
- Final: 180,000 VND charged from wallet
- Voucher usedCount: 1

**Verify:**
```bash
curl http://localhost:3001/vouchers/DISCOUNT10 \
  -H "Authorization: Bearer $SELLER_TOKEN"
# Should show usedCount: 1
```

### Test 2: Voucher Usage Limit

**Use voucher 10 times:**
```bash
# Repeat order 10 times...
```

**11th attempt should fail:**
```bash
curl -X POST http://localhost:3001/orders \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": "product-id", "quantity": 1}],
    "voucherCode": "DISCOUNT10"
  }'

# Expected: 400 Bad Request
# {"success": false, "message": "Voucher usage limit reached"}
```

### Test 3: Seeding Order PARTIAL with Refund

**Create seeding order:**
```bash
# Assume order-id exists with 1000 quantity @ 100 VND = 100,000 VND
```

**Update to PARTIAL (700/1000 processed):**
```bash
curl -X PATCH http://localhost:3001/orders/$ORDER_ID/progress \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PARTIAL",
    "processedQuantity": 700,
    "processingStatus": "Processed 700/1000, remaining out of stock"
  }'
```

**Expected:**
- Order status: PARTIAL
- processedQuantity: 700
- Refund amount: 100,000 * 30% = 30,000 VND
- Buyer wallet: +30,000 VND
- Transaction type: REFUND created

**Verify buyer wallet:**
```bash
curl http://localhost:3001/wallet/me \
  -H "Authorization: Bearer $BUYER_TOKEN"
# Should show balance increased by 30,000 VND
```

### Test 4: Production Safety

**Start with unsafe config:**
```bash
NODE_ENV=production SEPAY_ALLOW_UNSIGNED=true node dist/main
```

**Expected:**
```
❌ FATAL ERROR: Cannot start in production mode with SEPAY_ALLOW_UNSIGNED=true

This is a critical security risk. Unsigned webhooks allow attackers to:
- Fake payment confirmations
- Credit wallets without actual payment
- Steal funds from your platform

To fix this:
1. Set SEPAY_ALLOW_UNSIGNED=false or remove it from .env
2. Ensure SEPAY_SECRET is properly configured
3. Restart the server

Process exited with code 1
```

---

## API Summary

### Vouchers
- `POST /vouchers` - Create voucher (SELLER, ADMIN)
- `GET /vouchers` - List vouchers (role-based filtering)
- `GET /vouchers/:code` - Get voucher details
- `PATCH /vouchers/:code` - Update voucher (SELLER, ADMIN)
- `DELETE /vouchers/:code` - Delete voucher (SELLER, ADMIN)

### Orders
- `POST /orders` - Create order (with optional voucherCode)
- `PATCH /orders/:id/progress` - Update seeding progress (SELLER, ADMIN)

---

## Security Notes

1. **Voucher validation** happens server-side, không trust client
2. **Discount application** proportional to sellers prevents abuse
3. **Production safety check** prevents unsigned webhook attacks
4. **Refund calculation** based on actual paid amount after discount
5. **Seller authorization** checked trước khi update order progress

---

## Files Modified/Created

### Database
- [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma:1) - Added VoucherType enum, Voucher model, Order fields
- [`apps/api/prisma/migrations/add_vouchers_and_order_progress.sql`](apps/api/prisma/migrations/add_vouchers_and_order_progress.sql:1) - Migration SQL

### Shared Types
- [`packages/shared/src/types/index.ts`](packages/shared/src/types/index.ts:1) - Added VoucherType enum, Voucher DTOs, UpdateOrderProgressDto, updated OrderDto

### Backend Modules
- [`apps/api/src/vouchers/vouchers.service.ts`](apps/api/src/vouchers/vouchers.service.ts:1) - Voucher CRUD + validation logic
- [`apps/api/src/vouchers/vouchers.controller.ts`](apps/api/src/vouchers/vouchers.controller.ts:1) - Voucher REST endpoints
- [`apps/api/src/vouchers/vouchers.module.ts`](apps/api/src/vouchers/vouchers.module.ts:1) - Voucher module definition
- [`apps/api/src/orders/orders.service.ts`](apps/api/src/orders/orders.service.ts:1) - Apply voucher + seeding progress logic
- [`apps/api/src/orders/orders.controller.ts`](apps/api/src/orders/orders.controller.ts:1) - Added PATCH /orders/:id/progress endpoint
- [`apps/api/src/orders/orders.module.ts`](apps/api/src/orders/orders.module.ts:1) - Import VouchersModule
- [`apps/api/src/app.module.ts`](apps/api/src/app.module.ts:1) - Register VouchersModule
- [`apps/api/src/main.ts`](apps/api/src/main.ts:1) - Production safety check

---

## Kết luận

ROO-06 hoàn thành 3 tasks:
✅ Voucher system với % và fixed amount, per-shop/platform-wide
✅ Seeding order lifecycle với auto-refund cho PARTIAL
✅ Production safety crash khi SEPAY_ALLOW_UNSIGNED=true

Tất cả logic được implement, test cases documented, ready to build & test!
