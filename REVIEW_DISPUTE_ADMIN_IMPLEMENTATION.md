# Review, Dispute & Admin Features Implementation

> **ROO-04**: CRUD Review, Dispute Management, và Admin Controls cho SeikoMMO Marketplace

## 📋 Tổng Quan

Implementation này bổ sung 3 tính năng chính:

1. **Review System** - Buyer có thể đánh giá sản phẩm đã mua (1-5 sao)
2. **Dispute Management** - Buyer mở tranh chấp, Admin xử lý refund
3. **Admin Controls** - Admin quản lý orders/payouts, thay đổi status thủ công

## 🗂️ Database Schema Changes

### OrderStatus Enum - Mở Rộng

```prisma
enum OrderStatus {
  PENDING      // Order được tạo, chờ xử lý
  PAID         // Đã thanh toán
  PROCESSING   // Đang xử lý (dành cho SEEDING)
  DELIVERED    // Đã giao hàng (digital goods)
  COMPLETED    // Hoàn thành
  PARTIAL      // Hoàn một phần (partial refund)
  CANCELLED    // Đã hủy (full refund)
  DISPUTED     // Đang tranh chấp
}
```

### Dispute Model - Enhanced

```prisma
model Dispute {
  id            String        @id @default(uuid())
  orderId       String
  userId        String        // Buyer who opened dispute
  reason        String        // Dispute reason
  status        DisputeStatus @default(OPEN)
  resolution    String?       // Admin's resolution text
  refundAmount  Int?          // VND - amount to refund
  adminNote     String?       // Internal admin note
  resolvedBy    String?       // Admin user ID
  resolvedAt    DateTime?     // When resolved
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  order         Order         @relation(...)
  @@map("disputes")
}
```

### Review Model - Đã Có Sẵn

```prisma
model Review {
  id          String   @id @default(uuid())
  productId   String
  userId      String
  rating      Int      // 1-5 stars
  comment     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  product     Product  @relation(...)
  user        User     @relation(...)
  
  @@unique([productId, userId]) // 1 user chỉ review 1 lần
  @@map("reviews")
}
```

## 🔧 API Endpoints

### Reviews Module

#### POST /reviews
Tạo review cho sản phẩm (chỉ BUYER đã mua)

**Request:**
```json
{
  "productId": "uuid",
  "rating": 5,
  "comment": "Excellent product!"
}
```

**Validation:**
- Rating phải từ 1-5
- Buyer phải đã mua sản phẩm (order status DELIVERED/COMPLETED)
- Chỉ được review 1 lần per product

**Response:**
```json
{
  "success": true,
  "message": "Review created successfully",
  "data": {
    "id": "uuid",
    "productId": "uuid",
    "userId": "uuid",
    "userName": "John Doe",
    "rating": 5,
    "comment": "Excellent product!",
    "createdAt": "2026-09-21T...",
    "updatedAt": "2026-09-21T..."
  }
}
```

#### GET /reviews/product/:productId
Lấy tất cả reviews của 1 sản phẩm (public)

#### GET /reviews/my-reviews
Lấy tất cả reviews của user hiện tại (authenticated)

#### PATCH /reviews/:id
Update review của chính mình

#### DELETE /reviews/:id
Xóa review (owner hoặc ADMIN)

---

### Disputes Module

#### POST /disputes
Buyer tạo dispute cho order (chỉ BUYER)

**Request:**
```json
{
  "orderId": "uuid",
  "reason": "Product keys are invalid"
}
```

**Validation:**
- Order phải thuộc về buyer
- Order status phải là DELIVERED hoặc COMPLETED
- Không được tồn tại dispute OPEN/INVESTIGATING khác cho order này

**Side Effects:**
- Order status → DISPUTED

**Response:**
```json
{
  "success": true,
  "message": "Dispute created successfully",
  "data": {
    "id": "uuid",
    "orderId": "uuid",
    "userId": "uuid",
    "reason": "Product keys are invalid",
    "status": "OPEN",
    "createdAt": "2026-09-21T..."
  }
}
```

#### GET /disputes
Lấy danh sách disputes
- BUYER: chỉ thấy disputes của mình
- ADMIN: thấy tất cả

**Query params:**
- `status`: OPEN | INVESTIGATING | RESOLVED | REJECTED

#### GET /disputes/:id
Chi tiết 1 dispute (owner hoặc ADMIN)

#### PATCH /disputes/:id/resolve
Admin xử lý dispute (chỉ ADMIN)

**Request:**
```json
{
  "status": "RESOLVED",
  "resolution": "Refunding full amount to buyer",
  "refundAmount": 200000,
  "adminNote": "Verified issue with seller"
}
```

**Business Logic:**

**Full Refund (refundAmount = totalAmount):**
1. Refund tiền vào buyer wallet
2. Create REFUND transaction
3. Update dispute status → RESOLVED
4. Update order status → CANCELLED

**Partial Refund (refundAmount < totalAmount):**
1. Refund một phần vào buyer wallet
2. Create REFUND transaction
3. Update dispute status → RESOLVED
4. Update order status → PARTIAL

**Reject (status = REJECTED):**
1. No refund
2. Update dispute status → REJECTED
3. Update order status → COMPLETED

---

### Admin Module

#### GET /admin/orders
Xem tất cả orders với filter (chỉ ADMIN)

**Query params:**
- `status`: OrderStatus enum
- `page`: số trang (default: 1)
- `limit`: số items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

#### GET /admin/orders/:id
Chi tiết 1 order với full info

#### PATCH /admin/orders/:id/status
Thay đổi order status thủ công (dành cho SEEDING orders)

**Request:**
```json
{
  "status": "PROCESSING"
}
```

**Valid Transitions:**
```
PENDING     → PROCESSING, CANCELLED
PAID        → PROCESSING, DELIVERED, CANCELLED
PROCESSING  → DELIVERED, PARTIAL, CANCELLED
DELIVERED   → COMPLETED, DISPUTED
COMPLETED   → (terminal state)
PARTIAL     → COMPLETED, DISPUTED
CANCELLED   → (terminal state)
DISPUTED    → COMPLETED, PARTIAL, CANCELLED
```

**Use Case:** SEEDING orders cần admin manually update:
1. Buyer mua service seeding
2. Order tạo với status DELIVERED
3. Admin chuyển sang PROCESSING khi bắt đầu seeding
4. Admin chuyển sang COMPLETED khi hoàn thành

#### GET /admin/payouts
Xem tất cả payouts với filter (chỉ ADMIN)

**Query params:**
- `status`: PENDING | COMPLETED | FAILED
- `page`, `limit`

#### GET /admin/payouts/:id
Chi tiết 1 payout request

#### PATCH /admin/payouts/:id/approve
Duyệt hoặc reject payout (chỉ ADMIN)

**Request:**
```json
{
  "status": "COMPLETED",
  "adminNote": "Approved by admin"
}
```

**Business Logic:**

**COMPLETED (approve):**
- Payout đã trừ wallet khi tạo, chỉ cần mark as completed
- Status: PENDING → COMPLETED

**FAILED (reject):**
1. Refund amount về seller wallet
2. Create REFUND transaction
3. Status: PENDING → FAILED

#### GET /admin/stats/overview
Xem thống kê tổng quan hệ thống

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": {
      "total": 150,
      "pending": 5,
      "completed": 120,
      "disputed": 3
    },
    "payouts": {
      "total": 45,
      "pending": 2,
      "completed": 40
    },
    "revenue": {
      "total": 15000000
    }
  }
}
```

---

## 🔒 Authorization & Validation

### Review Creation
```typescript
// Check 1: User must be BUYER
@Roles('BUYER')

// Check 2: User must have purchased product
const hasPurchased = await prisma.order.findFirst({
  where: {
    buyerId: userId,
    status: { in: ['DELIVERED', 'COMPLETED'] },
    items: { some: { productId } }
  }
});

if (!hasPurchased) {
  throw new ForbiddenException('You can only review purchased products');
}

// Check 3: One review per product
const existingReview = await prisma.review.findUnique({
  where: { productId_userId: { productId, userId } }
});

if (existingReview) {
  throw new BadRequestException('You already reviewed this product');
}
```

### Dispute Creation
```typescript
// Check 1: Order must belong to buyer
if (order.buyerId !== userId) {
  throw new ForbiddenException('You can only dispute your own orders');
}

// Check 2: Order must be delivered
if (!['DELIVERED', 'COMPLETED'].includes(order.status)) {
  throw new BadRequestException('You can only dispute delivered orders');
}

// Check 3: No active dispute exists
const existingDispute = await prisma.dispute.findFirst({
  where: {
    orderId,
    status: { in: ['OPEN', 'INVESTIGATING'] }
  }
});

if (existingDispute) {
  throw new BadRequestException('Active dispute already exists');
}
```

### Order Status Update (Admin)
```typescript
// Valid transition map
const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [PROCESSING, CANCELLED],
  PAID: [PROCESSING, DELIVERED, CANCELLED],
  PROCESSING: [DELIVERED, PARTIAL, CANCELLED],
  DELIVERED: [COMPLETED, DISPUTED],
  COMPLETED: [],
  PARTIAL: [COMPLETED, DISPUTED],
  CANCELLED: [],
  DISPUTED: [COMPLETED, PARTIAL, CANCELLED]
};

const allowed = validTransitions[currentStatus];
if (!allowed.includes(newStatus)) {
  throw new BadRequestException(
    `Cannot transition from ${currentStatus} to ${newStatus}`
  );
}
```

---

## 🧪 Testing

### Test Script: test-review-dispute-admin.sh

Automated bash script để test acceptance criteria:

```bash
./test-review-dispute-admin.sh
```

**Test Flow:**
1. ✅ Register buyer, seller, admin
2. ✅ Seller creates shop + product + import 5 keys
3. ✅ Buyer deposits 500k VND
4. ✅ Buyer purchases 2 keys (200k VND)
5. ✅ Verify wallets: Buyer 300k, Seller 180k
6. ✅ Buyer creates 5-star review
7. ✅ Buyer opens dispute
8. ✅ Admin resolves dispute with full refund (200k)
9. ✅ Verify buyer wallet: 500k VND (refunded)
10. ✅ Order status → CANCELLED
11. ✅ Admin manually changes seeding order status
12. ✅ Admin views system stats

**Expected Output:**
```
✓ Buyer registered
✓ Seller registered
✓ Admin registered
✓ Shop created
✓ Product created
✓ Imported 5 keys
✓ Deposit confirmed
✓ Order created: DELIVERED
✓ Buyer balance: 300,000 VND ✓
✓ Seller balance: 180,000 VND ✓
✓ Review created: Rating 5/5 ⭐
✓ Dispute created: OPEN
✓ Order status changed to DISPUTED
✓ Dispute resolved with 200000 VND refund
✓ Buyer balance after refund: 500,000 VND ✓
✓ Order status changed to CANCELLED
✓ Admin changed order status to PROCESSING
✓ Admin completed the seeding order
✓ System stats: X orders, X VND revenue

✅ All tests passed!
```

---

## 📊 Use Cases

### Use Case 1: Buyer Reviews Product

**Precondition:** Buyer đã mua và nhận sản phẩm

**Steps:**
1. Buyer calls `POST /reviews`
2. System validates purchase history
3. System creates review với rating 1-5
4. Review appears on product page

**Validation:**
- ❌ Cannot review without purchase
- ❌ Cannot review twice
- ❌ Rating must be 1-5

---

### Use Case 2: Buyer Opens Dispute, Admin Refunds

**Precondition:** Order status DELIVERED/COMPLETED

**Steps:**
1. Buyer calls `POST /disputes` với reason
2. System updates order status → DISPUTED
3. Admin views dispute via `GET /disputes`
4. Admin investigates và calls `PATCH /disputes/:id/resolve`
5. System refunds buyer wallet
6. System updates order status (CANCELLED or PARTIAL)

**Business Rules:**
- Full refund → CANCELLED
- Partial refund → PARTIAL
- Reject → COMPLETED

---

### Use Case 3: Admin Manages SEEDING Order

**Precondition:** Buyer mua SEEDING service

**Steps:**
1. Order created với status DELIVERED (auto)
2. Admin calls `GET /admin/orders?status=DELIVERED`
3. Admin starts seeding, calls `PATCH /admin/orders/:id/status` → PROCESSING
4. Admin finishes, calls `PATCH /admin/orders/:id/status` → COMPLETED

**Why Manual?**
- SEEDING services không có stock keys
- Cần human verification để confirm completion
- Admin control workflow hoàn toàn

---

## 🚀 Deployment Checklist

### 1. Database Migration
```bash
cd apps/api
npx prisma migrate dev --name add_reviews_disputes_admin
npx prisma generate
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Start Services
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Start API
cd apps/api
pnpm dev
```

### 4. Run Tests
```bash
# Make script executable
chmod +x test-review-dispute-admin.sh

# Run tests
./test-review-dispute-admin.sh
```

---

## 🔐 Security Notes

### 1. Authorization
- Reviews: chỉ BUYER đã mua
- Disputes: chỉ BUYER owner
- Admin endpoints: chỉ ADMIN role
- Review delete: owner hoặc ADMIN

### 2. Validation
- Rating: 1-5 only
- Refund amount: 0 < amount ≤ totalAmount
- Order status transitions: theo state machine
- Duplicate review: prevented by unique constraint

### 3. Audit Trail
- Dispute tracks: resolvedBy, resolvedAt
- All transactions logged in Transaction model
- Admin actions linked to admin user ID

---

## 📈 Future Enhancements

### Reviews
- [ ] Photo uploads trong review
- [ ] Helpful votes (upvote/downvote)
- [ ] Seller response to reviews
- [ ] Average rating calculation

### Disputes
- [ ] Auto-escalation sau X ngày
- [ ] Multiple admin messages/comments
- [ ] File attachments (evidence)
- [ ] Email notifications

### Admin
- [ ] Advanced analytics dashboard
- [ ] Bulk actions (approve multiple payouts)
- [ ] Activity logs
- [ ] Custom reports

---

## 🐛 Troubleshooting

### Issue: Review creation fails "Product not found"
**Cause:** ProductId không tồn tại hoặc typo
**Fix:** Verify productId from `GET /products/:id`

### Issue: Dispute creation fails "Cannot dispute orders"
**Cause:** Order status không phải DELIVERED/COMPLETED
**Fix:** Order phải đã được delivered trước

### Issue: Admin status update rejected
**Cause:** Invalid status transition
**Fix:** Follow valid transition map trong documentation

### Issue: Refund không cập nhật wallet
**Cause:** Transaction failed hoặc wallet không tồn tại
**Fix:** Check logs, verify wallet exists

---

## 📞 API Testing với cURL

### Create Review
```bash
curl -X POST http://localhost:3001/reviews \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "uuid",
    "rating": 5,
    "comment": "Great product!"
  }'
```

### Open Dispute
```bash
curl -X POST http://localhost:3001/disputes \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "uuid",
    "reason": "Keys not working"
  }'
```

### Admin Resolve Dispute
```bash
curl -X PATCH http://localhost:3001/disputes/$DISPUTE_ID/resolve \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "RESOLVED",
    "resolution": "Refunding buyer",
    "refundAmount": 200000
  }'
```

### Admin Update Order Status
```bash
curl -X PATCH http://localhost:3001/admin/orders/$ORDER_ID/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "PROCESSING" }'
```

---

## ✅ Acceptance Criteria Verification

### ✓ Review System
- [x] Buyer chỉ review sản phẩm đã mua
- [x] 1 user chỉ review 1 lần per product
- [x] Rating 1-5 stars
- [x] Optional comment
- [x] Public product reviews

### ✓ Dispute Management
- [x] Buyer mở dispute cho order
- [x] Order status → DISPUTED
- [x] Admin xử lý REFUND hoặc REJECT
- [x] Full refund → CANCELLED
- [x] Partial refund → PARTIAL
- [x] Wallet refunded correctly

### ✓ Admin Controls
- [x] GET /admin/orders?status filter
- [x] PATCH /admin/orders/:id/status manual update
- [x] Valid status transitions enforced
- [x] GET /admin/payouts management
- [x] PATCH /admin/payouts/:id/approve duyệt
- [x] System statistics dashboard

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-21  
**Author:** SeikoMMO Dev Team
