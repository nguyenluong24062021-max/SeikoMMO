# Wallet & Payment System Implementation

## 📋 Tổng quan

Hệ thống ví và thanh toán cho SeikoMMO Marketplace với các tính năng:
- Nạp tiền qua QR SePay (mock)
- Thanh toán tự động khi mua hàng
- Hoa hồng platform 10%
- Giữ tiền 24h trước khi cho rút
- Rút tiền với validation

## 🏗️ Kiến trúc

### Database Schema Changes

```prisma
// Đổi tất cả Float sang Int (VND)
model Product {
  price Int  // VND thay vì Float
}

model Order {
  totalAmount    Int
  commissionRate Int  @default(10)  // % platform fee
  sellerAmount   Int?  // Amount seller receives
  sellerId       String?
}

model OrderItem {
  price Int  // VND
}

model Wallet {
  balance Int @default(0)  // VND
}

model Transaction {
  amount         Int
  type           TransactionType  // Enum
  sePayTransId   String? @unique
  canWithdrawAt  DateTime?  // 24h hold timestamp
}

model Payout {
  amount Int
  status PayoutStatus  // Enum
}

// New model
model Dispute {
  id         String
  orderId    String
  userId     String
  reason     String
  status     DisputeStatus
  resolution String?
}

// New enums
enum TransactionType {
  DEPOSIT
  PAYMENT
  PAYOUT
  REFUND
  COMMISSION
}

enum PayoutStatus {
  PENDING
  COMPLETED
  FAILED
}

enum DisputeStatus {
  OPEN
  INVESTIGATING
  RESOLVED
  REJECTED
}
```

## 🔌 API Endpoints

### Wallet Endpoints

#### `POST /wallet/deposit`
Tạo yêu cầu nạp tiền và nhận QR code SePay

**Request:**
```json
{
  "amount": 500000  // VND, min 10k, max 50M
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/svg+xml;base64,...",
    "transactionId": "SEPAY_1234567890_abc123",
    "amount": 500000,
    "expireAt": "2024-01-01T10:00:00Z"
  }
}
```

#### `POST /wallet/deposit/confirm`
Xác nhận deposit sau khi quét QR (simulate webhook)

**Request:**
```json
{
  "transactionId": "SEPAY_1234567890_abc123",
  "amount": 500000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "trans-id",
    "amount": 500000,
    "type": "DEPOSIT",
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

#### `GET /wallet/me`
Lấy thông tin ví và lịch sử 50 giao dịch gần nhất

**Response:**
```json
{
  "success": true,
  "data": {
    "wallet": {
      "id": "wallet-id",
      "userId": "user-id",
      "balance": 300000,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "transactions": [
      {
        "id": "trans-1",
        "amount": 500000,
        "type": "DEPOSIT",
        "description": "Deposit via SePay",
        "canWithdrawAt": null,
        "createdAt": "2024-01-01T10:00:00Z"
      },
      {
        "id": "trans-2",
        "amount": -200000,
        "type": "PAYMENT",
        "description": "Payment for order xyz",
        "canWithdrawAt": null,
        "createdAt": "2024-01-01T11:00:00Z"
      }
    ]
  }
}
```

### Payout Endpoints

#### `POST /payouts` (SELLER/ADMIN only)
Yêu cầu rút tiền

**Request:**
```json
{
  "amount": 100000,  // min 50k
  "description": "Withdrawal to bank"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": "payout-id",
    "amount": 100000,
    "status": "PENDING",
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

**Response (Failed - Funds on hold):**
```json
{
  "success": false,
  "message": "Insufficient withdrawable balance. Total: 180000 VND, On hold: 180000 VND, Available: 0 VND. Funds will be available at 2024-01-02T11:00:00Z"
}
```

#### `GET /payouts` (SELLER/ADMIN only)
Lấy danh sách payouts của user

#### `GET /payouts/:id` (SELLER/ADMIN only)
Lấy chi tiết một payout

### Order Changes

#### `POST /orders`
Tạo order - Giờ yêu cầu đủ số dư ví

**Behavior thay đổi:**
1. Check buyer wallet balance >= totalAmount
2. Deduct từ buyer wallet
3. Allocate stock (FIFO)
4. Calculate commission (10% platform fee)
5. Add to seller wallet (90% of total)
6. Create transaction with `canWithdrawAt` = now + 24h
7. Mark order as DELIVERED (instant for digital goods)

**Flow ví:**
```
Buyer: -200,000 VND (payment)
Seller: +180,000 VND (payment, hold 24h)
Platform: 20,000 VND commission (tracked but not added to any wallet)
```

## 💰 Commission & Hold Logic

### Commission Calculation
```typescript
const commissionRate = 10; // 10%
const totalAmount = 200000; // 2 keys x 100k
const commissionAmount = Math.floor(totalAmount * 10 / 100); // 20,000
const sellerAmount = totalAmount - commissionAmount; // 180,000
```

### 24h Hold Implementation
```typescript
const canWithdrawAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

// Transaction có canWithdrawAt
await tx.transaction.create({
  data: {
    walletId: sellerWallet.id,
    amount: sellerAmount,
    type: TransactionType.PAYMENT,
    canWithdrawAt, // 24h from now
  }
});
```

### Payout Validation
```typescript
// Get all held transactions
const heldTransactions = wallet.transactions.filter(
  tx => tx.canWithdrawAt && tx.canWithdrawAt > new Date()
);

const totalHeld = heldTransactions.reduce((sum, tx) => sum + tx.amount, 0);
const availableBalance = wallet.balance - totalHeld;

if (availableBalance < requestedAmount) {
  throw new BadRequestException('Funds on hold...');
}
```

## 🧪 Testing

### Automated Test Script

**Linux/Mac:**
```bash
chmod +x test-wallet-flow.sh
./test-wallet-flow.sh
```

**Windows:**
```bash
test-wallet-flow.bat
# hoặc xem hướng dẫn manual testing
```

### Test Flow

1. **Register Users**
   - Buyer: buyer@test.com
   - Seller: seller@test.com

2. **Seller Setup**
   - Create shop
   - Create product (100,000 VND)
   - Import 100 keys

3. **Buyer Deposit**
   - Request deposit 500,000 VND
   - Receive QR code
   - Confirm deposit
   - ✓ Balance: 500,000 VND

4. **Buyer Purchase**
   - Buy 2 keys (200,000 VND)
   - ✓ Buyer balance: 300,000 VND
   - ✓ Seller balance: 180,000 VND (90% after commission)
   - ✓ Stock: 98 remaining

5. **Payout Attempt**
   - Seller tries to withdraw 100,000 VND
   - ✗ Failed: Funds on 24h hold
   - Shows next available time

### Expected Results

| Metric | Initial | After Purchase |
|--------|---------|----------------|
| Buyer Balance | 500,000 | 300,000 |
| Seller Balance | 0 | 180,000 |
| Platform Commission | 0 | 20,000 |
| Product Stock | 100 | 98 |
| Order Status | - | DELIVERED |
| Seller Can Withdraw | - | ❌ (24h hold) |

## 📝 Implementation Files

### New Modules
- `apps/api/src/wallets/` - Wallet management
  - `wallets.service.ts` - Deposit, transactions, balance
  - `wallets.controller.ts` - Wallet endpoints
  - `wallets.module.ts`
  
- `apps/api/src/payouts/` - Payout management
  - `payouts.service.ts` - Withdrawal with hold validation
  - `payouts.controller.ts` - Payout endpoints
  - `payouts.module.ts`

### Updated Modules
- `apps/api/src/orders/orders.service.ts`
  - Wallet balance check
  - Deduct buyer balance
  - Add seller balance with commission
  - 24h hold timestamp
  
- `apps/api/src/orders/orders.module.ts`
  - Import WalletsModule

- `apps/api/src/app.module.ts`
  - Register WalletsModule and PayoutsModule

### Schema & Types
- `apps/api/prisma/schema.prisma` - Updated models
- `packages/shared/src/types/index.ts` - New DTOs and enums

### Test Scripts
- `test-wallet-flow.sh` - Automated Bash test
- `test-wallet-flow.bat` - Windows manual guide

## 🔐 Security Notes

1. **Mock QR Code**: Production cần integrate real SePay API
2. **Webhook Validation**: Cần verify signature từ SePay
3. **Idempotency**: Duplicate transaction check bằng `sePayTransId`
4. **Hold Period**: Có thể adjust dựa vào policy
5. **Commission Rate**: Hiện tại hardcode 10%, có thể move to config

## 🚀 Next Steps

1. ✅ Schema migration
2. ✅ Wallet service implementation
3. ✅ Payout service implementation
4. ✅ Orders integration
5. ✅ Test script creation
6. ⏳ Run migration
7. ⏳ Test acceptance criteria
8. 🔜 Real SePay integration
9. 🔜 Admin dashboard cho payouts
10. 🔜 Dispute resolution flow
