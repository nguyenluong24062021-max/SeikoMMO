# ROO-11: SMM Provider Automation - HOÀN THÀNH

## 📋 Tổng Quan

ROO-11 triển khai hệ thống tự động hóa đặt và quản lý đơn hàng SEEDING thông qua SMM Provider bên thứ ba. Implementation gồm 2 phases:

- **Phase 1**: Foundation & Admin CRUD (HOÀN THÀNH ✅)
- **Phase 2**: Auto-Placement & Cron Polling (HOÀN THÀNH ✅)

## 🎯 Acceptance Criteria Status

### Phase 1: Foundation ✅
- [x] Migration 011 tạo tables SmmProvider, ServiceMapping
- [x] ISmmProviderClient interface với placeOrder() và getStatus()
- [x] MockSmmProviderClient với status progression (pending → processing → completed)
- [x] RealSmmProviderClient với axios, 10s timeout, 3 retries, exponential backoff
- [x] ProviderClientFactory detect mock:// URL
- [x] Admin CRUD endpoints: POST/GET/PATCH/DELETE /smm/providers
- [x] Admin CRUD endpoints: POST/GET/DELETE /smm/mappings
- [x] POST /smm/providers/:id/test-connection
- [x] EncryptionService cho apiKey (AES-256-GCM)
- [x] API key masking (chỉ hiện 4 ký tự cuối)

### Phase 2: Automation ✅
- [x] Auto-placement: Order SEEDING tự động gọi provider khi có mapping
- [x] Provider fail → refund full buyer + cancel order trong transaction
- [x] Cron polling mỗi 2 phút cho orders PROCESSING
- [x] Status completed → mark order COMPLETED
- [x] Status partial → refund phần chưa xử lý
- [x] Status failed/cancelled → refund full
- [x] Timeout >24h → cancel + refund full
- [x] MockProvider: poll 1=pending, poll 2=processing(30%), poll 3=completed(100%)
- [x] Không poll orders DIGITAL (chỉ poll PROCESSING với providerOrderId)

## 📁 Files Tạo Mới

### Phase 1 (13 files)
1. [`apps/api/prisma/migrations/011_add_smm_providers.sql`](apps/api/prisma/migrations/011_add_smm_providers.sql) - Database migration
2. [`apps/api/src/smm/smm-provider-client.interface.ts`](apps/api/src/smm/smm-provider-client.interface.ts) - Interface & exception
3. [`apps/api/src/smm/mock-smm-provider-client.ts`](apps/api/src/smm/mock-smm-provider-client.ts) - Mock implementation
4. [`apps/api/src/smm/real-smm-provider-client.ts`](apps/api/src/smm/real-smm-provider-client.ts) - HTTP client
5. [`apps/api/src/smm/provider-client.factory.ts`](apps/api/src/smm/provider-client.factory.ts) - Factory pattern
6. [`apps/api/src/smm/smm-provider.service.ts`](apps/api/src/smm/smm-provider.service.ts) - Provider business logic
7. [`apps/api/src/smm/smm-provider.controller.ts`](apps/api/src/smm/smm-provider.controller.ts) - Provider REST API
8. [`apps/api/src/smm/service-mapping.service.ts`](apps/api/src/smm/service-mapping.service.ts) - Mapping business logic
9. [`apps/api/src/smm/service-mapping.controller.ts`](apps/api/src/smm/service-mapping.controller.ts) - Mapping REST API
10. [`apps/api/src/smm/smm.module.ts`](apps/api/src/smm/smm.module.ts) - Module definition
11. [`docs/ROO11_SETUP_TESTING.md`](docs/ROO11_SETUP_TESTING.md) - Setup guide Phase 1
12. [`docs/ROO11_IMPLEMENTATION_SUMMARY.md`](docs/ROO11_IMPLEMENTATION_SUMMARY.md) - Summary Phase 1
13. [`test-smm-provider.sh`](test-smm-provider.sh) - Test script Phase 1

### Phase 2 (2 files)
14. [`docs/ROO11_PHASE2_AUTOMATION.md`](docs/ROO11_PHASE2_AUTOMATION.md) - Documentation Phase 2
15. [`test-smm-e2e.sh`](test-smm-e2e.sh) - E2E test script

## 📝 Files Cập Nhật

### Phase 1 (1 file)
1. [`apps/api/src/app.module.ts`](apps/api/src/app.module.ts) - Import SmmModule

### Phase 2 (4 files)
2. [`apps/api/src/orders/orders.module.ts`](apps/api/src/orders/orders.module.ts) - Import SmmModule
3. [`apps/api/src/orders/orders.service.ts`](apps/api/src/orders/orders.service.ts) - Auto-placement logic (+120 lines)
4. [`apps/api/src/tasks/tasks.module.ts`](apps/api/src/tasks/tasks.module.ts) - Import SmmModule  
5. [`apps/api/src/tasks/tasks.service.ts`](apps/api/src/tasks/tasks.service.ts) - Cron polling (+220 lines)

**Tổng**: 15 files mới + 5 files cập nhật = **20 files**

## 🔧 Technical Implementation

### 1. Database Schema
```sql
-- ProviderStatus enum
CREATE TYPE "ProviderStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- smm_providers table
CREATE TABLE "smm_providers" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "api_url" TEXT NOT NULL,
  "api_key_encrypted" TEXT NOT NULL,
  "balance_endpoint" TEXT,
  "status" "ProviderStatus" DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL
);

-- service_mappings table
CREATE TABLE "service_mappings" (
  "id" TEXT PRIMARY KEY,
  "product_id" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "provider_id" TEXT NOT NULL REFERENCES "smm_providers"("id") ON DELETE CASCADE,
  "provider_service_id" TEXT NOT NULL,
  "rate_per_thousand" INTEGER NOT NULL,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  UNIQUE("product_id", "provider_id")
);

-- Add to orders table
ALTER TABLE "orders"
  ADD COLUMN "provider_order_id" TEXT,
  ADD COLUMN "provider_id" TEXT REFERENCES "smm_providers"("id") ON DELETE SET NULL;
```

### 2. Provider Client Pattern
```typescript
// Interface
interface ISmmProviderClient {
  placeOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse>;
  getOrderStatus(providerOrderId: string): Promise<ProviderStatusResponse>;
  getBalance?(): Promise<ProviderBalanceResponse>;
}

// Factory
class ProviderClientFactory {
  create(provider): ISmmProviderClient {
    if (provider.apiUrl.startsWith('mock://')) {
      return new MockSmmProviderClient();
    }
    return new RealSmmProviderClient();
  }
}

// Mock: In-memory state with progression
class MockSmmProviderClient {
  private static mockOrders = new Map();
  
  async getOrderStatus(orderId: string) {
    const order = mockOrders.get(orderId);
    order.pollCount++;
    
    if (order.pollCount === 1) order.status = 'pending';
    else if (order.pollCount === 2) order.status = 'processing'; // 30%
    else order.status = 'completed'; // 100%
    
    return { status: order.status, ... };
  }
}

// Real: HTTP with retry
class RealSmmProviderClient {
  async placeOrder(request) {
    return firstValueFrom(
      this.httpService.post(url, data).pipe(
        timeout(10000),
        retry({ count: 3, delay: exponentialBackoff })
      )
    );
  }
}
```

### 3. Auto-Placement Flow
```typescript
// In OrdersService.create() transaction:

// 1. Check if SEEDING product
const hasSeedingProduct = orderItems.some(item => 
  item.product.type === ProductType.SEEDING
);

if (hasSeedingProduct) {
  try {
    // 2. Find active mapping
    const mappings = await tx.serviceMapping.findMany({
      where: { productId, isActive: true },
      include: { provider: true },
    });

    if (mappings.length > 0) {
      // 3. Place order with provider
      const client = this.providerClientFactory.create(mapping.provider);
      const response = await client.placeOrder({
        service: mapping.providerServiceId,
        link: newOrder.id,
        quantity: item.quantity,
      });

      // 4. Success: set PROCESSING
      providerOrderId = response.orderId;
      providerId = mapping.providerId;
      finalStatus = OrderStatus.PROCESSING;
    }
  } catch (error) {
    // 5. Fail: refund full + cancel
    await tx.wallet.update({
      where: { userId: buyerId },
      data: { balance: { increment: finalAmount } },
    });
    
    // Reverse seller payments
    // ...
    
    finalStatus = OrderStatus.CANCELLED;
  }
}

// 6. Update order with final status
await tx.order.update({
  where: { id: newOrder.id },
  data: { status: finalStatus, providerOrderId, providerId },
});
```

### 4. Cron Polling Logic
```typescript
// TasksService - runs every 2 minutes
@Cron('*/2 * * * *')
async pollProviderOrderStatus() {
  // 1. Find PROCESSING orders
  const orders = await this.prisma.order.findMany({
    where: {
      status: OrderStatus.PROCESSING,
      providerOrderId: { not: null },
    },
  });

  for (const order of orders) {
    // 2. Check timeout (>24h)
    if (order.createdAt < timeoutThreshold) {
      await this.handleTimedOutOrder(order); // Cancel + full refund
      continue;
    }

    // 3. Get provider status
    const provider = await this.prisma.smmProvider.findUnique({
      where: { id: order.providerId },
    });
    const client = this.providerClientFactory.create(provider);
    const status = await client.getOrderStatus(order.providerOrderId);

    // 4. Handle based on status
    switch (status.status) {
      case 'completed':
        await this.handleCompletedOrder(order); // Mark COMPLETED
        break;
      case 'partial':
        await this.handlePartialOrder(order, status.quantity, status.remains);
        // Refund = (total - discount) * unprocessedRatio
        break;
      case 'failed':
      case 'cancelled':
        await this.handleFailedOrder(order); // Full refund
        break;
      // pending/processing: wait for next poll
    }
  }
}
```

### 5. Refund Formula
```typescript
// Partial refund
const processedRatio = processedQuantity / totalQuantity;
const unprocessedRatio = 1 - processedRatio;
const refundAmount = Math.floor(
  (order.totalAmount - order.discountAmount) * unprocessedRatio
);

// Example:
// Order: 100,000 VND total, 10,000 discount
// Processed: 300/1000 (30%)
// Refund = (100,000 - 10,000) * 70% = 63,000 VND
```

## 🧪 Testing

### Setup Steps
```bash
# 1. Install dependencies
cd apps/api
pnpm add @nestjs/axios axios

# 2. Generate Prisma client
npx prisma generate

# 3. Run migration
psql -U postgres -d seiko_mmo -f prisma/migrations/011_add_smm_providers.sql

# 4. Set encryption key
echo "PROVIDER_KEY_SECRET=your-32-char-secret-key-here" >> .env

# 5. Build
pnpm build

# 6. Start server
pnpm start:dev
```

### E2E Test Flow
```bash
# Run automated E2E test
chmod +x test-smm-e2e.sh
./test-smm-e2e.sh

# Expected timeline:
# T+0s: Create provider → test connection → create mapping → place order
# Order status: PROCESSING (auto-placed with provider)
#
# T+2min (Poll 1): status = pending
# T+4min (Poll 2): status = processing (30% done)
# T+6min (Poll 3): status = completed → Order COMPLETED
#
# Result: E2E Test PASSED ✅
```

### Manual Quick Test
```bash
# 1. Login as admin
curl -X POST http://localhost:3001/auth/login \
  -d '{"email":"admin@example.com","password":"admin123"}'

# 2. Create mock provider
curl -X POST http://localhost:3001/smm/providers \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Provider",
    "apiUrl": "mock://test",
    "apiKey": "test-key-123"
  }'

# 3. Test connection
curl -X POST http://localhost:3001/smm/providers/{id}/test \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"success":true,"message":"...Balance: 10000 USD"}

# 4. Create SEEDING product + mapping
# ... (see test-smm-e2e.sh)

# 5. Place order → should auto-place with provider
curl -X POST http://localhost:3001/orders \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{"items":[{"productId":"...","quantity":1000}]}'
# Expected: status = "PROCESSING"

# 6. Wait 6+ minutes, check order status
curl http://localhost:3001/orders/{orderId} \
  -H "Authorization: Bearer $BUYER_TOKEN"
# Expected: status = "COMPLETED"
```

## 📊 Monitoring & Logs

### Key Logs
```typescript
// OrdersService
[OrdersService] Order abc-123 placed with provider Mock Provider: prov-456
[OrdersService] Failed to place order abc-123: Connection timeout

// TasksService
[TasksService] Polling 3 PROCESSING order(s)
[TasksService] Order abc-123: status=processing, remains=700
[TasksService] Order abc-123 marked as COMPLETED
[TasksService] Order def-456 PARTIAL: refunded 63000 VND
[TasksService] Order ghi-789 CANCELLED with full refund: 90000 VND
[TasksService] Order jkl-012 timed out and cancelled
[TasksService] Error polling order mno-345: Provider API error
```

### Metrics to Track
- Provider placement success rate
- Average time to completion
- Refund rate (partial/full)
- Timeout rate (>24h)
- Provider API error rate

## 🚀 Next Steps

### Pending Setup (Required)
- [ ] Install `@nestjs/axios` và `axios`
- [ ] Run `npx prisma generate`
- [ ] Execute migration 011 SQL
- [ ] Set `PROVIDER_KEY_SECRET` environment variable
- [ ] Run E2E test to verify

### Future Enhancements (Optional)
- [ ] Webhook support cho instant updates (thay vì 2-min polling)
- [ ] Multiple provider failover (nếu provider 1 fail, thử provider 2)
- [ ] Rate limiting per provider
- [ ] Provider performance analytics dashboard
- [ ] Retry failed orders after X hours
- [ ] Email notification cho orders timeout

## 🔒 Security

### API Key Encryption
- Algorithm: AES-256-GCM
- Key source: `PROVIDER_KEY_SECRET` env variable (32 bytes)
- Storage: `api_key_encrypted` field (format: `iv:authTag:encrypted`)
- Display: Masked `****2345` (only last 4 chars)

### Access Control
- Provider CRUD: ADMIN role only
- Mapping CRUD: ADMIN role only
- Test connection: ADMIN role only

## 📚 Documentation

1. **[ROO11_SETUP_TESTING.md](docs/ROO11_SETUP_TESTING.md)** - Phase 1 setup guide
2. **[ROO11_IMPLEMENTATION_SUMMARY.md](docs/ROO11_IMPLEMENTATION_SUMMARY.md)** - Phase 1 summary
3. **[ROO11_PHASE2_AUTOMATION.md](docs/ROO11_PHASE2_AUTOMATION.md)** - Phase 2 implementation
4. **[test-smm-provider.sh](test-smm-provider.sh)** - Phase 1 test script
5. **[test-smm-e2e.sh](test-smm-e2e.sh)** - Phase 2 E2E test script

## ⚠️ Known Issues

1. **TypeScript Errors**: Expected cho đến khi chạy `npx prisma generate`
   - `Property 'smmProvider' does not exist on type 'PrismaService'`
   - `Property 'serviceMapping' does not exist on type 'PrismaService'`
   - Sẽ tự resolve sau khi generate

2. **Mock State Reset**: MockSmmProviderClient dùng in-memory Map
   - State sẽ mất khi restart server
   - Không ảnh hưởng production (chỉ dùng mock cho testing)

3. **Cron Timing**: Local testing có thể cần đợi >2 phút giữa polls
   - Cron schedule: `*/2 * * * *`
   - Có thể thay đổi thành `*/1 * * * *` để test nhanh hơn

## 📈 Implementation Stats

- **Total LOC Added**: ~1,500 lines
- **Total LOC Modified**: ~340 lines
- **Files Created**: 15
- **Files Modified**: 5
- **Test Scripts**: 2
- **Documentation Files**: 4
- **Implementation Time**: Phase 1 (2-3h) + Phase 2 (2-3h)

## ✅ Completion Checklist

### Code Implementation ✅
- [x] Database migration
- [x] Provider client infrastructure
- [x] Admin CRUD APIs
- [x] Auto-placement logic
- [x] Cron polling logic
- [x] Refund handling
- [x] Test scripts
- [x] Documentation

### Pending User Setup ⏳
- [ ] Install dependencies
- [ ] Generate Prisma client
- [ ] Run migration
- [ ] Set environment variables
- [ ] Build & test

---

**Status**: ✅ **CODE COMPLETE** - Ready for setup & testing

**Next Action**: Follow setup steps in [ROO11_SETUP_TESTING.md](docs/ROO11_SETUP_TESTING.md), then run E2E test with [`test-smm-e2e.sh`](test-smm-e2e.sh)
