# Tóm Tắt Cuộc Hội Thoại - Dự Án SeikoMMO

**Ngày tạo:** 2026-09-22  
**Trạng thái:** ROO-11 đang thực hiện (40% hoàn thành)

---

## 📋 Tổng Quan Dự Án

**SeikoMMO** là hệ thống API E-commerce được xây dựng với:
- **Backend:** NestJS + Prisma + PostgreSQL
- **Frontend:** Next.js 14 (App Router) + TailwindCSS
- **Monorepo:** Turborepo với pnpm workspace
- **Database:** PostgreSQL với timezone UTC

### Kiến Trúc Dự Án
```
SeikoMMO/
├── apps/
│   ├── api/          # NestJS backend API
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Shared types & DTOs
└── docs/             # Technical documentation
```

---

## ✅ ROO-09: Cron Jobs, Affiliate System & Rate Limiting

**Trạng thái:** HOÀN THÀNH  
**Ngày hoàn thành:** ~2026-09-20

### Mục Tiêu
1. Cron job tự động tắt flash sales hết hạn (chạy mỗi 5 phút)
2. Hệ thống affiliate/referral với 5% hoa hồng trên đơn hàng đầu tiên
3. Rate limiting trên auth endpoints (10 requests/phút)

### Thay Đổi Thực Hiện

#### 1. Dependencies
```json
{
  "@nestjs/schedule": "^4.0.0",
  "@nestjs/throttler": "^5.1.1"
}
```

#### 2. Database Schema Updates
```prisma
model User {
  referralCode    String   @unique
  referredBy      String?
  referrer        User?    @relation("UserReferrals", fields: [referredBy], references: [referralCode])
  referredUsers   User[]   @relation("UserReferrals")
}
```

#### 3. Modules Mới
- **TasksModule:** Cron job để deactivate flash sales hết hạn
  - `@Cron(CronExpression.EVERY_5_MINUTES)`
  - Check `endsAt < now()` và chuyển `isActive = false`

- **AffiliateModule:** Quản lý affiliate stats
  - `GET /affiliate/stats` - Thống kê hoa hồng và referrals

#### 4. Rate Limiting
```typescript
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('auth')
```

#### 5. Logic Hoa Hồng
- Khi buyer tạo order đầu tiên, check `referredBy`
- Cộng 5% tổng giá trị order vào ví của referrer
- Tạo transaction với type `COMMISSION`

### Files Quan Trọng
- [`apps/api/src/tasks/tasks.service.ts`](../apps/api/src/tasks/tasks.service.ts) - Cron jobs
- [`apps/api/src/affiliate/affiliate.service.ts`](../apps/api/src/affiliate/affiliate.service.ts) - Affiliate logic
- [`apps/api/src/users/users.service.ts`](../apps/api/src/users/users.service.ts) - Referral code generation
- [`apps/api/prisma/migrations/009_add_referral_system.sql`](../apps/api/prisma/migrations/009_add_referral_system.sql)
- [`docs/roo09-cron-affiliate-ratelimit.md`](./roo09-cron-affiliate-ratelimit.md)

### Acceptance Criteria
- ✅ Build 0 errors
- ✅ Migration chạy thành công
- ⏳ Test cron job (cần chạy và đợi 5 phút)
- ⏳ Test referral commission
- ⏳ Test rate limiting (spam login)

---

## ✅ ROO-10: Timezone Migration (Naive → Timestamptz)

**Trạng thái:** HOÀN THÀNH  
**Ngày hoàn thành:** ~2026-09-21

### Vấn Đề
- Database portable PG timezone: +07 (Asia/Ho_Chi_Minh)
- Tất cả cột `DateTime` là `timestamp` (naive, không có timezone)
- Prisma đọc naive timestamps như UTC → lệch +7 giờ
- `createdAt` do DB `default(now())` sinh ra bị sai thời gian

### Giải Pháp

#### 1. Schema Migration
Chuyển **TẤT CẢ** 38 cột `DateTime` sang `@db.Timestamptz(3)`:

```prisma
model User {
  createdAt       DateTime @default(now()) @db.Timestamptz(3)
  updatedAt       DateTime @updatedAt @db.Timestamptz(3)
  canWithdrawAt   DateTime? @db.Timestamptz(3)
}
```

**Models updated:**
- User (4 columns)
- Shop (2 columns)
- Product (2 columns)
- Stock (2 columns)
- Order (3 columns)
- OrderItem (2 columns)
- Wallet (2 columns)
- Transaction (2 columns)
- Payout (3 columns)
- Dispute (2 columns)
- Review (2 columns)
- Voucher (4 columns)
- FlashSale (4 columns)
- SmmProvider (2 columns) - Added in ROO-11
- ServiceMapping (2 columns) - Added in ROO-11

#### 2. Migration SQL
```sql
-- Preserve wall-time: convert naive to timestamptz
ALTER TABLE "users" 
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) 
  USING "created_at" AT TIME ZONE 'Asia/Ho_Chi_Minh';

-- Set PostgreSQL timezone to UTC for future records
ALTER SYSTEM SET timezone = 'UTC';
SELECT pg_reload_conf();
```

#### 3. Production Checklist
Tạo [`docs/PROD.md`](./PROD.md) với 12 sections:
1. Environment Variables Security
2. Database Timezone Configuration
3. Backup Strategy
4. Monitoring & Logging
5. Performance Optimization
6. Security Hardening
7. Deployment Process
8. Health Checks
9. Error Handling
10. Rate Limiting
11. Session Management
12. API Documentation

### Files Quan Trọng
- [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma) - 38 cột updated
- [`apps/api/prisma/migrations/010_timezone_to_timestamptz.sql`](../apps/api/prisma/migrations/010_timezone_to_timestamptz.sql)
- [`apps/api/prisma/migrations/set_timezone_utc.sql`](../apps/api/prisma/migrations/set_timezone_utc.sql)
- [`docs/roo10-timezone-migration.md`](./roo10-timezone-migration.md)
- [`docs/PROD.md`](./PROD.md)

### Acceptance Criteria
- ✅ Build 0 errors
- ✅ Migration files created
- ⏳ Run migration và verify `createdAt` đúng giờ UTC
- ⏳ Test e2e flow: deposit → order → payout

### Verification Queries
```sql
-- Check timezone
SHOW timezone;  -- Should be 'UTC'

-- Verify new records are UTC
SELECT id, created_at, updated_at 
FROM users 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC LIMIT 5;

-- Check old records preserved
SELECT id, created_at, email 
FROM users 
ORDER BY created_at ASC LIMIT 5;
```

---

## 🚧 ROO-11: Automated SEEDING Order Processing

**Trạng thái:** ĐANG THỰC HIỆN (40% hoàn thành)  
**Ngày bắt đầu:** 2026-09-22

### Mục Tiêu
1. Model `SmmProvider` (name, apiUrl, **apiKey encrypted AES-256-GCM**, balanceEndpoint, status)
2. Model `ServiceMapping` (productId ↔ provider serviceId, rateVND per 1000)
3. Khi buyer tạo order SEEDING có mapping:
   - Tự động gọi provider API để place order
   - Mock interface `ISmmProviderClient` (timeout 10s, retry 3)
   - Lưu `providerOrderId`, chuyển status sang `PROCESSING`
4. Cron job **mỗi 2 phút** poll provider status
   - Update `processedQuantity`
   - Auto complete/partial/cancel với refund logic
5. Admin test-connection endpoint
6. ApiKey encryption với `PROVIDER_KEY_SECRET` (32 bytes hex)
   - Throw error on boot nếu thiếu trong production

### 🎯 Progress: Foundation Complete (40%)

#### ✅ Phase 1: Database Schema & Types (COMPLETED)

##### 1. Schema Updates
```prisma
enum ProviderStatus {
  ACTIVE
  INACTIVE
  ERROR
}

model SmmProvider {
  id                String         @id @default(uuid())
  name              String         @unique
  apiUrl            String
  apiKeyEncrypted   String         // AES-256-GCM encrypted
  balanceEndpoint   String?
  status            ProviderStatus @default(ACTIVE)
  createdAt         DateTime       @default(now()) @db.Timestamptz(3)
  updatedAt         DateTime       @updatedAt @db.Timestamptz(3)
  serviceMappings   ServiceMapping[]
  orders            Order[]
  @@map("smm_providers")
}

model ServiceMapping {
  id                String      @id @default(uuid())
  productId         String
  providerId        String
  providerServiceId String
  ratePerThousand   Int
  isActive          Boolean     @default(true)
  createdAt         DateTime    @default(now()) @db.Timestamptz(3)
  updatedAt         DateTime    @updatedAt @db.Timestamptz(3)
  product           Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  provider          SmmProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  @@unique([productId, providerId])
  @@map("service_mappings")
}

model Order {
  // ... existing fields ...
  providerOrderId   String?
  providerId        String?
  provider          SmmProvider? @relation(fields: [providerId], references: [id])
  // ...
}

model Product {
  // ... existing relations ...
  serviceMappings   ServiceMapping[]
}
```

##### 2. Shared Types
File: [`packages/shared/src/types/index.ts`](../packages/shared/src/types/index.ts)

```typescript
export enum ProviderStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
}

// Admin CRUD DTOs
export interface CreateSmmProviderDto {
  name: string;
  apiUrl: string;
  apiKey: string; // Plain text, will be encrypted
  balanceEndpoint?: string;
}

export interface UpdateSmmProviderDto {
  name?: string;
  apiUrl?: string;
  apiKey?: string;
  balanceEndpoint?: string;
  status?: ProviderStatus;
}

export interface SmmProviderDto {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string; // MASKED: "abc***xyz"
  balanceEndpoint?: string;
  status: ProviderStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Service Mapping DTOs
export interface CreateServiceMappingDto {
  productId: string;
  providerId: string;
  providerServiceId: string;
  ratePerThousand: number;
}

export interface UpdateServiceMappingDto {
  providerServiceId?: string;
  ratePerThousand?: number;
  isActive?: boolean;
}

export interface ServiceMappingDto {
  id: string;
  productId: string;
  providerId: string;
  providerServiceId: string;
  ratePerThousand: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  product?: ProductDto;
  provider?: SmmProviderDto;
}

// Provider Client Interfaces
export interface ProviderOrderRequest {
  service: string;
  quantity: number;
  link?: string;
}

export interface ProviderOrderResponse {
  orderId: string;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'cancelled' | 'failed';
  charge?: number;
}

export interface ProviderStatusResponse {
  orderId: string;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'cancelled' | 'failed';
  startCount?: number;
  quantity?: number;
  remains?: number;
}

export interface ProviderBalanceResponse {
  balance: number;
  currency: string;
}

// Test Connection
export interface TestProviderConnectionDto {
  providerId: string;
}

export interface TestProviderConnectionResponse {
  success: boolean;
  balance?: number;
  error?: string;
}
```

##### 3. Encryption Service
File: [`apps/api/src/common/encryption.util.ts`](../apps/api/src/common/encryption.util.ts)

**Đặc điểm:**
- **Algorithm:** AES-256-GCM (Authenticated Encryption)
- **Key Source:** Environment variable `PROVIDER_KEY_SECRET`
- **Key Format:** 64-char hexadecimal string (32 bytes)
- **Storage Format:** `iv:authTag:ciphertext` (all hex-encoded)
- **Production Safety:** Throw error on boot nếu key missing

```typescript
@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 16;
  private readonly AUTH_TAG_LENGTH = 16;
  private readonly KEY_LENGTH = 32;

  private encryptionKey!: Buffer;

  onModuleInit() {
    const keyHex = this.configService.get<string>('PROVIDER_KEY_SECRET');
    
    if (!keyHex) {
      if (this.configService.get('NODE_ENV') === 'production') {
        throw new Error('PROVIDER_KEY_SECRET is required in production');
      }
      // Dev: use random key
      this.encryptionKey = crypto.randomBytes(this.KEY_LENGTH);
    } else {
      if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
        throw new Error('PROVIDER_KEY_SECRET must be 64-char hex');
      }
      this.encryptionKey = Buffer.from(keyHex, 'hex');
    }
  }

  encrypt(plaintext: string): string { /* ... */ }
  decrypt(encrypted: string): string { /* ... */ }
  maskApiKey(apiKey: string): string { /* ... */ }
  static generateKey(): string { return crypto.randomBytes(32).toString('hex'); }
}
```

**Generate Key:**
```bash
# Linux/Mac
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

##### 4. Documentation
File: [`docs/roo11-smm-provider-automation.md`](./roo11-smm-provider-automation.md)

Comprehensive roadmap (~300 lines) bao gồm:
- ✅ Completed work (schema, types, encryption)
- 📝 Pending implementations với code snippets
- 🗄️ Migration SQL
- 🧪 Testing strategy
- 📁 File structure summary

---

### 🔜 Phase 2: Provider Client (NEXT STEP - CRITICAL)

#### Files Cần Tạo

##### 1. Interface
File: `apps/api/src/smm-provider/smm-provider-client.interface.ts`

```typescript
export interface ISmmProviderClient {
  placeOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse>;
  getOrderStatus(orderId: string): Promise<ProviderStatusResponse>;
  getBalance?(): Promise<ProviderBalanceResponse>;
}
```

##### 2. Mock Provider Client
File: `apps/api/src/smm-provider/mock-provider-client.ts`

**Behavior:**
- Detect by provider name starts with "Mock"
- Simulate status progression: pending → processing → completed
- Random delays (5-15 seconds between states)
- In-memory order storage

##### 3. Real Provider Client
File: `apps/api/src/smm-provider/real-provider-client.ts`

**Features:**
- HTTP client with axios/fetch
- **Timeout:** 10 seconds per request
- **Retry:** 3 attempts with exponential backoff
- Decrypt API key before use
- Error handling → throw exceptions

##### 4. Factory
File: `apps/api/src/smm-provider/provider-client.factory.ts`

```typescript
@Injectable()
export class ProviderClientFactory {
  create(provider: SmmProvider): ISmmProviderClient {
    if (provider.name.startsWith('Mock')) {
      return new MockProviderClient(provider);
    }
    return new RealProviderClient(provider, this.encryptionService, this.httpService);
  }
}
```

---

### 📋 Phase 3: Admin Management (PENDING)

#### 1. SmmProvider CRUD

**Service:** `apps/api/src/smm-provider/smm-provider.service.ts`
- `create()` - Encrypt API key trước khi lưu
- `findAll()` - Mask API keys trong response
- `findOne()` - Mask API key
- `update()` - Re-encrypt nếu API key thay đổi
- `remove()`
- `testConnection()` - Use factory to create client, call `getBalance()`

**Controller:** `apps/api/src/smm-provider/smm-provider.controller.ts`
- `POST /admin/smm-providers` - Create
- `GET /admin/smm-providers` - List all
- `GET /admin/smm-providers/:id` - Get one
- `PUT /admin/smm-providers/:id` - Update
- `DELETE /admin/smm-providers/:id` - Remove
- `POST /admin/smm-providers/:id/test` - Test connection

**Guards:** `@Roles(UserRole.ADMIN)` on all endpoints

#### 2. ServiceMapping CRUD

**Service:** `apps/api/src/smm-provider/service-mapping.service.ts`
- `create()` - Validate product & provider exist
- `findAll()` - Filter by productId/providerId
- `findByProductId()`
- `update()`
- `remove()`

**Controller:** `apps/api/src/smm-provider/service-mapping.controller.ts`
- `POST /admin/service-mappings` - Create
- `GET /admin/service-mappings` - List all
- `GET /admin/service-mappings/product/:productId` - By product
- `PUT /admin/service-mappings/:id` - Update
- `DELETE /admin/service-mappings/:id` - Remove

---

### 🔄 Phase 4: Order Integration (PENDING)

#### 1. Update OrdersService

File: [`apps/api/src/orders/orders.service.ts`](../apps/api/src/orders/orders.service.ts)

**Modify [`create()`](../apps/api/src/orders/orders.service.ts:29-391) method:**

```typescript
async create(buyerId: string, createOrderDto: CreateOrderDto): Promise<OrderDto> {
  // ... existing validation ...

  // NEW: Check if product is SEEDING and has mapping
  if (product.type === ProductType.SEEDING) {
    const mapping = await this.prisma.serviceMapping.findFirst({
      where: {
        productId: product.id,
        isActive: true,
      },
      include: { provider: true },
    });

    if (mapping && mapping.provider.status === ProviderStatus.ACTIVE) {
      try {
        // Create client
        const client = this.providerClientFactory.create(mapping.provider);

        // Place order
        const providerResponse = await client.placeOrder({
          service: mapping.providerServiceId,
          quantity: createOrderDto.quantity,
          link: createOrderDto.link,
        });

        // Save providerOrderId
        orderData.providerOrderId = providerResponse.orderId;
        orderData.providerId = mapping.provider.id;
        orderData.status = OrderStatus.PROCESSING;

      } catch (error) {
        this.logger.error(`Provider order failed: ${error.message}`);
        // Continue with PENDING status, manual processing
      }
    }
  }

  // ... existing transaction logic ...
}
```

#### 2. Refund Logic

Reuse existing refund logic trong [`updateProgress()`](../apps/api/src/orders/orders.service.ts:393-472):

```typescript
// Full refund (provider failed)
if (finalStatus === OrderStatus.CANCELLED) {
  await tx.wallet.update({
    where: { userId: order.buyerId },
    data: { balance: { increment: order.totalPrice } },
  });
}

// Partial refund (only processed X out of Y)
if (finalStatus === OrderStatus.PARTIAL) {
  const completed = updateProgressDto.processedQuantity;
  const total = order.items[0].quantity;
  const completionRate = completed / total;
  const refundAmount = Math.round(order.totalPrice * (1 - completionRate));

  await tx.wallet.update({
    where: { userId: order.buyerId },
    data: { balance: { increment: refundAmount } },
  });
}
```

---

### ⏰ Phase 5: Cron Job Polling (PENDING)

#### Update TasksService

File: [`apps/api/src/tasks/tasks.service.ts`](../apps/api/src/tasks/tasks.service.ts)

**Add new cron job:**

```typescript
@Cron(CronExpression.EVERY_2_MINUTES)
async pollProviderOrderStatus() {
  this.logger.debug('Polling provider order status...');

  const processingOrders = await this.prisma.order.findMany({
    where: {
      status: OrderStatus.PROCESSING,
      providerOrderId: { not: null },
      providerId: { not: null },
    },
    include: {
      provider: true,
      items: true,
    },
  });

  for (const order of processingOrders) {
    try {
      // Create client
      const client = this.providerClientFactory.create(order.provider);

      // Get status
      const statusResponse = await client.getOrderStatus(order.providerOrderId);

      // Map status
      let newStatus: OrderStatus;
      let processedQuantity = 0;

      switch (statusResponse.status) {
        case 'completed':
          newStatus = OrderStatus.COMPLETED;
          processedQuantity = order.items[0].quantity;
          break;
        case 'partial':
          newStatus = OrderStatus.PARTIAL;
          processedQuantity = statusResponse.quantity - statusResponse.remains;
          break;
        case 'cancelled':
        case 'failed':
          newStatus = OrderStatus.CANCELLED;
          break;
        default:
          continue; // Still processing
      }

      // Update order via OrdersService
      await this.ordersService.updateProgress(
        order.id,
        { status: newStatus, processedQuantity },
        'system-cron',
        UserRole.ADMIN
      );

      this.logger.log(`Order ${order.id} updated: ${newStatus}`);

    } catch (error) {
      this.logger.error(`Failed to poll order ${order.id}: ${error.message}`);
    }
  }
}
```

---

### 🗃️ Phase 6: Migration (PENDING)

File: `apps/api/prisma/migrations/011_add_smm_providers.sql`

```sql
-- Create ProviderStatus enum
CREATE TYPE "ProviderStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- Create smm_providers table
CREATE TABLE "smm_providers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "api_url" TEXT NOT NULL,
  "api_key_encrypted" TEXT NOT NULL,
  "balance_endpoint" TEXT,
  "status" "ProviderStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL
);

-- Create service_mappings table
CREATE TABLE "service_mappings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "product_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "provider_service_id" TEXT NOT NULL,
  "rate_per_thousand" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "service_mappings_product_id_fkey" 
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
  CONSTRAINT "service_mappings_provider_id_fkey" 
    FOREIGN KEY ("provider_id") REFERENCES "smm_providers"("id") ON DELETE CASCADE
);

-- Create unique index
CREATE UNIQUE INDEX "service_mappings_product_id_provider_id_key" 
  ON "service_mappings"("product_id", "provider_id");

-- Add provider fields to orders
ALTER TABLE "orders" 
  ADD COLUMN "provider_order_id" TEXT,
  ADD COLUMN "provider_id" TEXT;

-- Add foreign key
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_provider_id_fkey" 
  FOREIGN KEY ("provider_id") REFERENCES "smm_providers"("id") ON DELETE SET NULL;

-- Add serviceMappings relation to products (no SQL change needed, just Prisma relation)
```

---

## 📊 Implementation Progress

### Overall Progress: 40%

| Phase | Status | Progress | Files |
|-------|--------|----------|-------|
| **Phase 1: Foundation** | ✅ COMPLETED | 100% | 4 files |
| **Phase 2: Provider Client** | ⏳ PENDING | 0% | 4 files |
| **Phase 3: Admin Management** | ⏳ PENDING | 0% | 6 files |
| **Phase 4: Order Integration** | ⏳ PENDING | 0% | 2 files |
| **Phase 5: Cron Polling** | ⏳ PENDING | 0% | 1 file |
| **Phase 6: Migration & Testing** | ⏳ PENDING | 0% | 2 files |

### Files Created (ROO-11)
1. ✅ `apps/api/prisma/schema.prisma` - Models updated
2. ✅ `packages/shared/src/types/index.ts` - DTOs added
3. ✅ `apps/api/src/common/encryption.util.ts` - NEW
4. ✅ `docs/roo11-smm-provider-automation.md` - NEW

### Files To Create (Next Steps)
5. ⏳ `apps/api/src/smm-provider/smm-provider-client.interface.ts`
6. ⏳ `apps/api/src/smm-provider/mock-provider-client.ts`
7. ⏳ `apps/api/src/smm-provider/real-provider-client.ts`
8. ⏳ `apps/api/src/smm-provider/provider-client.factory.ts`
9. ⏳ `apps/api/src/smm-provider/smm-provider.service.ts`
10. ⏳ `apps/api/src/smm-provider/smm-provider.controller.ts`
11. ⏳ `apps/api/src/smm-provider/smm-provider.module.ts`
12. ⏳ `apps/api/src/smm-provider/service-mapping.service.ts`
13. ⏳ `apps/api/src/smm-provider/service-mapping.controller.ts`
14. ⏳ `apps/api/src/smm-provider/service-mapping.module.ts`
15. ⏳ `apps/api/prisma/migrations/011_add_smm_providers.sql`

### Files To Update (Next Steps)
16. ⏳ `apps/api/src/orders/orders.service.ts` - Add provider integration
17. ⏳ `apps/api/src/tasks/tasks.service.ts` - Add cron polling
18. ⏳ `apps/api/src/app.module.ts` - Import new modules

---

## 🎯 Acceptance Criteria

### ROO-09
- ✅ Build 0 errors
- ⏳ Cron job chạy mỗi 5 phút và tắt flash sales hết hạn
- ⏳ Referral nhận 5% commission trên đơn đầu của referred user
- ⏳ Rate limiting: spam login bị 429 Too Many Requests

### ROO-10
- ✅ Build 0 errors
- ⏳ Migration chạy thành công
- ⏳ `SELECT` verify `createdAt` mới đúng giờ UTC (±1 phút)
- ⏳ E2E flow: deposit → order → payout vẫn hoạt động

### ROO-11
- ✅ Build 0 errors
- ⏳ Migration 011 chạy thành công
- ⏳ Order SEEDING tự chuyển `PROCESSING` sau khi tạo
- ⏳ Dùng Mock Provider local (không gọi API thật)
- ⏳ Cron poll mỗi 2 phút cập nhật tiến độ
- ⏳ Provider fail → order `CANCELLED` + refund full
- ⏳ Provider partial → refund tỷ lệ chưa hoàn thành

---

## 🐛 Bugs & Fixes

### Bug 1: TypeScript - Property has no initializer
**Location:** `apps/api/src/common/encryption.util.ts:17`

**Error:**
```
Property 'encryptionKey' has no initializer and is not definitely assigned in the constructor.
```

**Cause:** TypeScript strict mode yêu cầu property phải được initialize trong constructor, nhưng `encryptionKey` chỉ được set trong `onModuleInit()`.

**Fix:** Sử dụng definite assignment assertion operator
```typescript
private encryptionKey!: Buffer; // ! = trust me, it will be initialized
```

---

## 🚀 Lệnh Thực Thi

### Setup Project
```bash
# Install dependencies
pnpm install

# Setup database (docker)
docker-compose up -d

# Run migrations
cd apps/api
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate
```

### Development
```bash
# Run API
cd apps/api
pnpm dev

# Run Web
cd apps/web
pnpm dev
```

### Generate Encryption Key
```bash
# Linux/Mac
openssl rand -hex 32

# Windows (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
echo "PROVIDER_KEY_SECRET=<generated_key>" >> apps/api/.env
```

### Run Migrations
```bash
cd apps/api

# ROO-09: Referral system
npx prisma migrate deploy --name add_referral_system

# ROO-10: Timezone
npx prisma migrate deploy --name timezone_to_timestamptz
psql -f prisma/migrations/set_timezone_utc.sql

# ROO-11: SMM Providers (PENDING)
npx prisma migrate deploy --name add_smm_providers
```

### Testing
```bash
# Test API health
curl http://localhost:3001/health

# Test auth rate limiting (should get 429 after 10 requests)
for i in {1..15}; do curl -X POST http://localhost:3001/auth/login -d '{"email":"test@test.com","password":"wrong"}' -H "Content-Type: application/json"; done

# Test wallet flow
./test-wallet-flow.sh

# Test review/dispute/admin
./test-review-dispute-admin.sh
```

---

## 📚 Documentation Files

### Core Documentation
1. **[API_DOCS.md](../API_DOCS.md)** - API endpoint documentation
2. **[PROJECT_SUMMARY.md](../PROJECT_SUMMARY.md)** - Project overview
3. **[LOCALHOST_SETUP_GUIDE.md](../LOCALHOST_SETUP_GUIDE.md)** - Local setup instructions
4. **[SETUP.md](../SETUP.md)** - Quick setup guide

### ROO Task Documentation
5. **[roo09-cron-affiliate-ratelimit.md](./roo09-cron-affiliate-ratelimit.md)** - ROO-09 implementation
6. **[roo10-timezone-migration.md](./roo10-timezone-migration.md)** - ROO-10 technical details
7. **[roo11-smm-provider-automation.md](./roo11-smm-provider-automation.md)** - ROO-11 roadmap (current)

### Production
8. **[PROD.md](./PROD.md)** - Production deployment checklist
9. **[flash-sale-system.md](./flash-sale-system.md)** - Flash sale feature documentation

---

## 📞 Next Steps (Immediate Actions)

### Priority 1: Complete ROO-11 Phase 2 (Provider Client)
```bash
# Create interface
touch apps/api/src/smm-provider/smm-provider-client.interface.ts

# Create mock provider
touch apps/api/src/smm-provider/mock-provider-client.ts

# Create real provider
touch apps/api/src/smm-provider/real-provider-client.ts

# Create factory
touch apps/api/src/smm-provider/provider-client.factory.ts
```

**Implementation order:**
1. Interface definition (contracts)
2. Mock provider (for testing)
3. Real provider (HTTP client with retry/timeout)
4. Factory (smart instantiation)

### Priority 2: Admin CRUD Services
After provider client is complete, implement:
1. `SmmProviderService` + `SmmProviderController`
2. `ServiceMappingService` + `ServiceMappingController`
3. Test connection endpoint

### Priority 3: Order Integration
Update existing services:
1. `OrdersService.create()` - Auto place provider order
2. `TasksService` - Add cron polling
3. Error handling + refund logic

### Priority 4: Testing & Migration
1. Run migration 011
2. Test với Mock Provider
3. Verify acceptance criteria

---

## 💡 Design Decisions

### 1. Encryption Strategy
**Decision:** AES-256-GCM  
**Rationale:**
- Authenticated encryption (integrity + confidentiality)
- Industry standard for sensitive data
- Built-in tamper detection
- No need for separate HMAC

**Alternative considered:** AES-256-CBC + HMAC  
**Why rejected:** More complex, GCM is simpler and more secure

### 2. Mock Provider Strategy
**Decision:** Detect by name prefix "Mock"  
**Rationale:**
- Simple detection logic
- No need for separate config flag
- Easy to create multiple mock providers with different behaviors

**Alternative considered:** Separate `isMock` boolean field  
**Why rejected:** Extra schema complexity

### 3. Cron Frequency
**Decision:** Every 2 minutes  
**Rationale:**
- Balance between responsiveness and API load
- Most SMM orders complete within minutes
- 30 polls per hour is reasonable

**Alternative considered:** Every 1 minute or 5 minutes  
**Why rejected:** 1 min too aggressive, 5 min too slow for UX

### 4. Timezone Strategy
**Decision:** UTC storage + client-side conversion  
**Rationale:**
- Industry best practice
- Eliminates DST issues
- Simplifies multi-timezone support
- Prisma/JS Date objects handle conversion

**Alternative considered:** Store in user timezone  
**Why rejected:** Complex, error-prone, hard to query

### 5. Refund Logic
**Decision:** Proportional refund for partial completion  
**Rationale:**
- Fair for both buyer and seller
- Provider charges for completed work
- Simple formula: `refund = total * (1 - completion_rate)`

**Example:**
- Order: 1000 followers, 100,000 VND
- Provider delivers: 600 followers
- Completion rate: 60%
- Refund: 100,000 * (1 - 0.6) = 40,000 VND

---

## 🔐 Security Considerations

### API Key Storage
- ✅ Never store plain text API keys
- ✅ Use AES-256-GCM encryption
- ✅ Mask in all responses (`abc***xyz`)
- ✅ Throw error if encryption key missing in production
- ✅ Generate strong keys (32 bytes = 256 bits)

### Environment Variables
```bash
# Required in production
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>
PROVIDER_KEY_SECRET=<64 hex chars>

# Payment
SEPAY_MERCHANT_ID=<real>
SEPAY_SECRET=<real>
SEPAY_ALLOW_UNSIGNED=false

# Optional
SEPAY_CALLBACK_URL=https://yourdomain.com/webhooks/sepay
```

### Rate Limiting
- Auth endpoints: 10 req/min per IP
- Consider adding rate limits to provider operations
- Prevent abuse of test-connection endpoint

### Input Validation
- Validate all DTOs with `class-validator`
- Sanitize SQL queries (Prisma auto-escapes)
- Validate provider responses before processing

---

## 📈 Metrics & Monitoring

### Key Metrics to Track
1. **Provider API:**
   - Success rate (orders placed successfully)
   - Average response time
   - Timeout rate
   - Retry count

2. **Cron Jobs:**
   - Execution time
   - Orders processed per run
   - Error rate

3. **Orders:**
   - SEEDING orders: PROCESSING → COMPLETED conversion rate
   - Average completion time
   - Refund rate (cancelled + partial)

4. **Business:**
   - Provider cost vs revenue
   - Profit margin per order
   - Top performing providers

### Monitoring Setup (Future)
- Use NestJS Logger
- Export logs to ELK/CloudWatch
- Set up alerts for:
  - Provider API failures (> 10% error rate)
  - Cron job failures
  - High refund rate (> 20%)

---

## 🧪 Testing Strategy

### Unit Tests (TODO)
```typescript
describe('EncryptionService', () => {
  it('should encrypt and decrypt correctly', () => { /* ... */ });
  it('should mask API keys', () => { /* ... */ });
  it('should throw on invalid key format', () => { /* ... */ });
});

describe('MockProviderClient', () => {
  it('should simulate order placement', async () => { /* ... */ });
  it('should progress from pending to completed', async () => { /* ... */ });
});

describe('ProviderClientFactory', () => {
  it('should create mock client for Mock providers', () => { /* ... */ });
  it('should create real client for other providers', () => { /* ... */ });
});
```

### Integration Tests (TODO)
```typescript
describe('SEEDING Order Flow', () => {
  it('should auto place provider order on create', async () => {
    // Create product with mapping
    // Create order
    // Verify providerOrderId saved
    // Verify status = PROCESSING
  });

  it('should poll and complete order via cron', async () => {
    // Create order with providerOrderId
    // Mock provider status = completed
    // Run cron
    // Verify order status = COMPLETED
  });

  it('should refund on provider failure', async () => {
    // Create order
    // Mock provider status = failed
    // Run cron
    // Verify order status = CANCELLED
    // Verify refund transaction
  });
});
```

### E2E Tests (TODO)
```bash
# Test với Mock Provider
1. Create Mock Provider qua admin API
2. Create ServiceMapping
3. Create SEEDING order
4. Verify order auto goes to PROCESSING
5. Wait 2 minutes for cron
6. Verify order completed + keys delivered
```

---

## 🎓 Learning & Best Practices

### Key Takeaways

1. **Timezone Handling:**
   - Always store in UTC
   - Use `timestamptz` in PostgreSQL
   - Convert to user timezone in client

2. **Encryption:**
   - Use authenticated encryption (GCM mode)
   - Never hardcode keys
   - Validate key format on startup
   - Mask sensitive data in logs/responses

3. **Cron Jobs:**
   - Use NestJS `@nestjs/schedule`
   - Handle errors gracefully
   - Log execution stats
   - Use transactions for data consistency

4. **Provider Integration:**
   - Always use timeouts
   - Implement retry logic
   - Mock for testing
   - Factory pattern for flexibility

5. **Refund Logic:**
   - Proportional refunds are fair
   - Always use transactions
   - Log all refund operations
   - Consider edge cases (duplicate refunds)

### Code Quality
- ✅ TypeScript strict mode
- ✅ ESLint + Prettier
- ✅ Shared types in monorepo
- ✅ Comprehensive error handling
- ⏳ Unit tests (TODO)
- ⏳ Integration tests (TODO)

---

## 📋 Summary

### Completed Work (ROO-09 & ROO-10)
- ✅ Cron jobs cho flash sales
- ✅ Affiliate/referral system (5% commission)
- ✅ Rate limiting (10 req/min)
- ✅ Timezone migration (naive → timestamptz)
- ✅ Production checklist (PROD.md)

### Current Work (ROO-11 - 40%)
- ✅ Database schema (SmmProvider, ServiceMapping)
- ✅ Shared types và DTOs
- ✅ Encryption service (AES-256-GCM)
- ✅ Documentation roadmap

### Next Steps (ROO-11 - 60%)
- ⏳ Provider client (interface, mock, real, factory)
- ⏳ Admin CRUD (services + controllers)
- ⏳ Order integration (auto placement)
- ⏳ Cron polling (status updates)
- ⏳ Migration + testing

### Estimated Time to Complete ROO-11
- **Phase 2:** 2-3 hours (provider client)
- **Phase 3:** 3-4 hours (admin CRUD)
- **Phase 4:** 2-3 hours (order integration)
- **Phase 5:** 1-2 hours (cron polling)
- **Phase 6:** 1-2 hours (migration + testing)
- **Total:** ~10-14 hours

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-22  
**Status:** ROO-11 In Progress (40%)

---

## Quick Reference Links

- [Prisma Schema](../apps/api/prisma/schema.prisma)
- [Shared Types](../packages/shared/src/types/index.ts)
- [Encryption Service](../apps/api/src/common/encryption.util.ts)
- [Orders Service](../apps/api/src/orders/orders.service.ts)
- [Tasks Service](../apps/api/src/tasks/tasks.service.ts)
- [ROO-11 Roadmap](./roo11-smm-provider-automation.md)
- [Production Guide](./PROD.md)
