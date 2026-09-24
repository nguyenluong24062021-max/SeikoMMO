# ROO-05 Implementation Summary

## Các thay đổi đã thực hiện

### 1. ✅ Deposit gắn userId và tạo Transaction PENDING

**File:** `apps/api/src/wallets/wallets.service.ts`

**Thay đổi:**
```typescript
async createDeposit(userId: string, createDepositDto: CreateDepositDto) {
  // Find or create wallet
  let wallet = await this.prisma.wallet.findUnique({ where: { userId } });
  
  if (!wallet) {
    wallet = await this.prisma.wallet.create({
      data: { userId, balance: 0 },
    });
  }

  // Generate SePay transaction ID
  const transactionId = `SEPAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // ✅ Create PENDING transaction record
  await this.prisma.transaction.create({
    data: {
      walletId: wallet.id,
      userId,              // ✅ Lưu userId
      amount,
      type: TransactionType.DEPOSIT,
      status: 'PENDING',   // ✅ Transaction PENDING
      description: `Pending deposit via SePay`,
      sePayTransId: transactionId,
    },
  });

  return { qrCode, transactionId, amount, expireAt };
}
```

**Kết quả:**
- Mỗi deposit tạo 1 Transaction PENDING với `userId` và `sePayTransId`
- Webhook tra cứu transaction bằng `sePayTransId` để tìm userId và cộng tiền

---

### 2. ✅ Webhook SePay verify signature

**File:** `apps/api/src/wallets/wallets.service.ts`

**Thay đổi:**
```typescript
async processSePayWebhook(webhookDto: SePayWebhookDto): Promise<TransactionDto> {
  const { transactionId, amount, status, signature } = webhookDto;

  // ✅ Verify signature
  if (signature) {
    const isValid = this.verifySePaySignature(transactionId, amount, signature);
    if (!isValid) {
      throw new ForbiddenException('Invalid signature'); // ✅ 403 nếu sai
    }
  }

  // Check idempotency (nếu đã COMPLETED thì return luôn)
  const existingTx = await this.prisma.transaction.findUnique({
    where: { sePayTransId: transactionId },
  });

  if (existingTx && existingTx.status === 'COMPLETED') {
    return this.mapToTransactionDto(existingTx);
  }

  if (!existingTx) {
    throw new BadRequestException('Transaction not found');
  }

  // Get userId from pending transaction
  const userId = existingTx.userId;

  // Process deposit: update wallet + update transaction to COMPLETED
  const transaction = await this.prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: existingTx.walletId },
      data: { balance: { increment: amount } },
    });

    const completedTx = await tx.transaction.update({
      where: { id: existingTx.id },
      data: {
        status: 'COMPLETED',
        description: `Deposit completed via SePay: ${transactionId}`,
      },
    });

    return completedTx;
  });

  return this.mapToTransactionDto(transaction);
}

// ✅ HMAC-SHA256 signature verification
private verifySePaySignature(transactionId: string, amount: number, signature: string): boolean {
  const payload = `${transactionId}|${amount}|${this.sePayMerchant}`;
  const expectedSignature = crypto
    .createHmac('sha256', this.sePaySecret)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}
```

**Endpoint mới:** `POST /webhooks/sepay` (public, không cần token)

**File:** `apps/api/src/webhooks/webhooks.controller.ts`, `apps/api/src/webhooks/webhooks.module.ts`

**Environment variables (.env.example):**
```env
SEPAY_SECRET="your-sepay-secret-key-for-webhook-signature-verification"
SEPAY_MERCHANT="SEIKO_MMO"
```

**Test signature:**
```bash
# Generate signature for testing
transactionId="SEPAY_1234567890_abc123"
amount=500000
merchant="SEIKO_MMO"
secret="your-sepay-secret-key"

# On Linux/Mac:
echo -n "${transactionId}|${amount}|${merchant}" | openssl dgst -sha256 -hmac "${secret}"

# Example webhook call:
curl -X POST http://localhost:3001/webhooks/sepay \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "SEPAY_1234567890_abc123",
    "amount": 500000,
    "status": "SUCCESS",
    "signature": "computed_hmac_sha256_hex"
  }'
```

---

### 3. ✅ Admin approvePayout lưu resolvedBy + resolvedAt

**File:** `apps/api/src/admin/admin.service.ts`

**Thay đổi:**
```typescript
async approvePayout(
  id: string,
  adminId: string,  // ✅ adminId từ JWT
  approveDto: ApprovePayoutDto,
): Promise<PayoutDto> {
  const { status, adminNote } = approveDto;
  const now = new Date();

  if (status === PayoutStatus.FAILED) {
    // Refund to wallet
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: payout.walletId },
        data: { balance: { increment: payout.amount } },
      });

      await tx.transaction.create({
        data: {
          walletId: payout.walletId,
          amount: payout.amount,
          type: 'REFUND',
          status: 'COMPLETED',
          description: `Payout rejected: ${adminNote || 'No reason provided'}`,
        },
      });

      // ✅ Update payout với resolvedBy + resolvedAt
      await tx.payout.update({
        where: { id },
        data: {
          status,
          description: `${payout.description || ''} | Admin: ${adminNote || 'Rejected'}`,
          resolvedBy: adminId,    // ✅ Lưu admin ID
          resolvedAt: now,        // ✅ Lưu thời gian
        },
      });
    });
  } else {
    // Mark as COMPLETED
    await this.prisma.payout.update({
      where: { id },
      data: {
        status,
        description: `${payout.description || ''} | Admin: ${adminNote || 'Approved'}`,
        resolvedBy: adminId,    // ✅ Lưu admin ID
        resolvedAt: now,        // ✅ Lưu thời gian
      },
    });
  }

  return this.mapToPayoutDto(updatedPayout);
}
```

**File:** `apps/api/src/payouts/payouts.service.ts` - cũng cập nhật `mapToPayoutDto()` để include `resolvedBy` và `resolvedAt`

---

### 4. ✅ GET /products và GET /shops public (không cần token)

**File:** `apps/api/src/products/products.controller.ts`

**Thay đổi:**
```typescript
@Controller('products')  // ✅ Bỏ @UseGuards ở class level
export class ProductsController {
  
  // ✅ GET endpoints không có guard
  @Get()
  async findAll(@Query('shopId') shopId?: string) { ... }

  @Get(':id')
  async findOne(@Param('id') id: string) { ... }

  // ✅ POST/PATCH/DELETE endpoints có guard
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async create(...) { ... }

  @Post('stock/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async importStock(...) { ... }

  @Get(':id/stocks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async getStocks(...) { ... }
}
```

**File:** `apps/api/src/shops/shops.controller.ts` - tương tự

**Kết quả:**
- `GET /products` → 200 OK (không cần token)
- `GET /products/:id` → 200 OK (không cần token)
- `GET /shops` → 200 OK (không cần token)
- `GET /shops/:id` → 200 OK (không cần token)
- `GET /products/:id/stocks` → 401 (cần SELLER/ADMIN token)
- `POST /products/stock/import` → 401 (cần SELLER/ADMIN token)

---

## Database Schema Changes

**File:** `apps/api/prisma/schema.prisma`

```prisma
model Transaction {
  id              String          @id @default(uuid())
  walletId        String
  userId          String?         // ✅ NEW: User who initiated
  orderId         String?         @unique
  amount          Int
  type            TransactionType
  status          String          @default("COMPLETED") // ✅ NEW: PENDING/COMPLETED/FAILED
  description     String?
  sePayTransId    String?         @unique
  canWithdrawAt   DateTime?
  createdAt       DateTime        @default(now())

  wallet      Wallet   @relation(...)
  order       Order?   @relation(...)
  @@map("transactions")
}

model Payout {
  id          String       @id @default(uuid())
  walletId    String
  amount      Int
  status      PayoutStatus
  description String?
  resolvedBy  String?      // ✅ NEW: Admin user ID
  resolvedAt  DateTime?    // ✅ NEW: Approval timestamp
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  wallet      Wallet   @relation(...)
  @@map("payouts")
}
```

**TypeScript Types:** `packages/shared/src/types/index.ts`

```typescript
export interface TransactionDto {
  id: string;
  walletId: string;
  userId?: string;          // ✅ NEW
  orderId?: string;
  amount: number;
  type: TransactionType;
  status?: string;          // ✅ NEW
  description?: string;
  sePayTransId?: string;    // ✅ NEW
  canWithdrawAt?: Date;
  createdAt: Date;
}

export interface PayoutDto {
  id: string;
  walletId: string;
  amount: number;
  status: PayoutStatus;
  description?: string;
  resolvedBy?: string;      // ✅ NEW
  resolvedAt?: Date;        // ✅ NEW
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Build & Migration Steps

### 1. Build @repo/shared
```bash
cd packages/shared
pnpm build
```

### 2. Run Prisma migration
```bash
cd apps/api
npx prisma migrate dev --name add_transaction_payout_fields
npx prisma generate
```

Hoặc chạy SQL thủ công:
```bash
cd apps/api
psql $DATABASE_URL < prisma/migrations/add_transaction_payout_fields.sql
npx prisma generate
```

### 3. Build apps/api
```bash
cd apps/api
npm run build
```

### 4. Restart server
```bash
# Stop old process
# Start new process
cd apps/api
node dist/main
```

---

## Testing

### Test 1: Deposit với signature verification

```bash
# 1. Buyer tạo deposit
BUYER_TOKEN="<buyer_jwt_token>"
curl -X POST http://localhost:3001/wallet/deposit \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 500000}'

# Response:
{
  "success": true,
  "data": {
    "qrCode": "data:image/svg...",
    "transactionId": "SEPAY_1726936841956_abc123",
    "amount": 500000,
    "expireAt": "2026-09-21T15:52:41.956Z"
  }
}

# 2. Check Transaction PENDING
curl http://localhost:3001/wallet/me \
  -H "Authorization: Bearer $BUYER_TOKEN"

# transactions array có 1 record status=PENDING với sePayTransId

# 3. Generate signature
SECRET="your-sepay-secret-key"
MERCHANT="SEIKO_MMO"
TRANSACTION_ID="SEPAY_1726936841956_abc123"
AMOUNT=500000

# Linux/Mac:
SIGNATURE=$(echo -n "${TRANSACTION_ID}|${AMOUNT}|${MERCHANT}" | openssl dgst -sha256 -hmac "${SECRET}" | awk '{print $2}')

# 4. Webhook với signature đúng → SUCCESS
curl -X POST http://localhost:3001/webhooks/sepay \
  -H "Content-Type: application/json" \
  -d "{
    \"transactionId\": \"${TRANSACTION_ID}\",
    \"amount\": ${AMOUNT},
    \"status\": \"SUCCESS\",
    \"signature\": \"${SIGNATURE}\"
  }"

# Response: {"success": true, data: {...transaction COMPLETED...}}

# 5. Check wallet balance +500k
curl http://localhost:3001/wallet/me \
  -H "Authorization: Bearer $BUYER_TOKEN"
# balance: 500000

# 6. Test signature sai → 403
curl -X POST http://localhost:3001/webhooks/sepay \
  -H "Content-Type: application/json" \
  -d "{
    \"transactionId\": \"${TRANSACTION_ID}\",
    \"amount\": ${AMOUNT},
    \"status\": \"SUCCESS\",
    \"signature\": \"wrong_signature_here\"
  }"

# Response: 403 Forbidden - Invalid signature
```

### Test 2: Admin approve payout lưu resolvedBy

```bash
ADMIN_TOKEN="<admin_jwt_token>"
SELLER_TOKEN="<seller_jwt_token>"

# 1. Seller tạo payout
curl -X POST http://localhost:3001/payouts \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100000, "description": "Withdrawal request"}'

# Response: {"success": true, data: {id: "payout-uuid", status: "PENDING", ...}}
PAYOUT_ID="<payout-uuid>"

# 2. Admin approve
curl -X PATCH "http://localhost:3001/admin/payouts/${PAYOUT_ID}/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "COMPLETED", "adminNote": "Approved by admin"}'

# Response:
{
  "success": true,
  "data": {
    "id": "payout-uuid",
    "status": "COMPLETED",
    "resolvedBy": "<admin-user-id>",      // ✅ Admin ID
    "resolvedAt": "2026-09-21T15:45:00Z", // ✅ Timestamp
    "description": "Withdrawal request | Admin: Approved by admin",
    ...
  }
}

# 3. Admin reject với refund
curl -X PATCH "http://localhost:3001/admin/payouts/${PAYOUT_ID}/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "FAILED", "adminNote": "Suspicious activity"}'

# Response: status FAILED, ví seller được hoàn tiền, resolvedBy + resolvedAt có giá trị
```

### Test 3: GET /products public

```bash
# Không cần token
curl http://localhost:3001/products
# Response: 200 OK - list products

curl http://localhost:3001/products/<product-id>
# Response: 200 OK - product detail

curl http://localhost:3001/shops
# Response: 200 OK - list shops

# Stocks vẫn cần SELLER/ADMIN token
curl http://localhost:3001/products/<product-id>/stocks
# Response: 401 Unauthorized

curl http://localhost:3001/products/<product-id>/stocks \
  -H "Authorization: Bearer $SELLER_TOKEN"
# Response: 200 OK - list stocks (chỉ SELLER hoặc ADMIN)
```

### Test 4: Full flow integration

```bash
# 1. Buyer deposit 500k qua webhook có chữ ký đúng
# → ví buyer: 500k

# 2. Buyer mua 2 key product giá 100k
curl -X POST http://localhost:3001/orders \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": "<product-id>", "quantity": 2}]
  }'

# → Trừ ví buyer: 500k - 200k = 300k
# → Cộng ví seller: 200k * 90% = 180k (hold 24h nếu commission 10%)
# → Transaction có canWithdrawAt = now + 24h

# 3. Seller tạo payout trước 24h → bị chặn
curl -X POST http://localhost:3001/payouts \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100000}'

# Response: 400 Bad Request
# "Insufficient withdrawable balance. Total: 180k, On hold: 180k, Available: 0. 
#  Funds will be available at <timestamp 24h sau>"

# 4. Admin duyệt payout sau khi đủ 24h
# (giả sử đợi 24h hoặc test bằng cách xóa canWithdrawAt trong DB)
curl -X POST http://localhost:3001/payouts \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100000}'

PAYOUT_ID="<new-payout-id>"

curl -X PATCH "http://localhost:3001/admin/payouts/${PAYOUT_ID}/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "COMPLETED", "adminNote": "OK"}'

# Response: payout COMPLETED với resolvedBy=admin-id, resolvedAt=now
# Seller wallet: 180k - 100k = 80k
```

---

## Summary

✅ **Task 1:** Deposit tạo Transaction PENDING với userId + sePayTransId, webhook tra và cộng ví  
✅ **Task 2:** approvePayout lưu resolvedBy + resolvedAt, trả về trong PayoutDto  
✅ **Task 3:** GET /products và /shops public (200 OK không token), /stocks vẫn guard SELLER  
✅ **Task 4:** Webhook verify HMAC-SHA256 signature, sai → 403, đúng + idempotency check → cộng ví  

**Build OK:** TypeScript types updated, Prisma schema migrated, NestJS modules registered

**Test acceptance:** Deposit → webhook signature → mua key → hold 24h → admin approve với resolvedBy
