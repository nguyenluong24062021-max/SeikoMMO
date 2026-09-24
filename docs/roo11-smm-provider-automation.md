# ROO-11: Automated SEEDING Order Processing với SMM Provider Integration

**Date**: 2026-09-22  
**Status**: ⏳ In Progress (Foundation Complete, Implementation Pending)

---

## 📋 Overview

### Objective
Tự động hóa xử lý SEEDING orders thông qua integration với external SMM providers. Thay vì seller update progress thủ công, system sẽ:
1. Tự động place order với provider khi buyer tạo SEEDING order
2. Poll provider API mỗi 2 phút để check status
3. Tự động update order progress và complete/refund dựa trên provider response

### Key Features
- **Admin CRUD**: Quản lý SMM providers và service mappings
- **Encryption**: API keys được encrypt bằng AES-256-GCM
- **Auto Order Placement**: SEEDING orders tự động gửi đến provider
- **Status Polling**: Cron job poll provider status mỗi 2 phút
- **Auto Completion**: Tự động complete hoặc partial refund based on provider status
- **Mock Provider**: Local mock implementation để test mà không cần provider thật

---

## ✅ Completed (Foundation)

### 1. Database Schema
**File**: [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma:1)

**New Enum**:
```prisma
enum ProviderStatus {
  ACTIVE
  INACTIVE
  ERROR
}
```

**New Models**:
```prisma
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
  @@map("smm_providers")
}

model ServiceMapping {
  id                String      @id @default(uuid())
  productId         String
  providerId        String
  providerServiceId String      // Service ID on provider's system
  ratePerThousand   Int         // Cost in VND per 1000 units
  isActive          Boolean     @default(true)
  createdAt         DateTime    @default(now()) @db.Timestamptz(3)
  updatedAt         DateTime    @updatedAt @db.Timestamptz(3)

  product           Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  provider          SmmProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)

  @@unique([productId, providerId])
  @@map("service_mappings")
}
```

**Updated Order Model**:
```prisma
model Order {
  // ... existing fields ...
  providerOrderId   String?     // External provider order ID for SEEDING
  providerId        String?     // Which SMM provider is handling this order
  // ... rest unchanged ...
}
```

**Updated Product Model**:
```prisma
model Product {
  // ... existing relations ...
  serviceMappings   ServiceMapping[]
  // ... rest unchanged ...
}
```

### 2. Shared Types
**File**: [`packages/shared/src/types/index.ts`](packages/shared/src/types/index.ts:1)

**Added**:
- `ProviderStatus` enum
- `CreateSmmProviderDto`, `UpdateSmmProviderDto`, `SmmProviderDto`
- `CreateServiceMappingDto`, `UpdateServiceMappingDto`, `ServiceMappingDto`
- `ProviderOrderRequest`, `ProviderOrderResponse`, `ProviderStatusResponse`, `ProviderBalanceResponse`
- `TestProviderConnectionDto`, `TestProviderConnectionResponse`

### 3. Encryption Utility
**File**: [`apps/api/src/common/encryption.util.ts`](apps/api/src/common/encryption.util.ts:1)

**Features**:
- AES-256-GCM encryption/decryption
- Validates `PROVIDER_KEY_SECRET` env var (32 bytes hex = 64 characters)
- Throws error on boot if missing in production
- Masks API keys for safe display (e.g., "abc***xyz")
- Static method to generate encryption key

**Usage**:
```typescript
// Encrypt API key before storing
const encrypted = encryptionService.encrypt('my-api-key-123');

// Decrypt when calling provider API
const apiKey = encryptionService.decrypt(provider.apiKeyEncrypted);

// Mask for API response
const masked = encryptionService.maskApiKey(apiKey); // "my-***123"
```

**Environment Setup**:
```bash
# Generate encryption key (run once)
openssl rand -hex 32

# Add to .env
PROVIDER_KEY_SECRET=<64-char-hex-string>
```

---

## 🚧 Pending Implementation

### 4. Provider Client Interface & Mock
**File to Create**: `apps/api/src/smm-provider/smm-provider-client.interface.ts`

```typescript
export interface ISmmProviderClient {
  placeOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse>;
  getOrderStatus(orderId: string): Promise<ProviderStatusResponse>;
  getBalance?(): Promise<ProviderBalanceResponse>;
}
```

**File to Create**: `apps/api/src/smm-provider/mock-provider-client.ts`

Mock implementation for local testing:
- `placeOrder()` → returns fake orderId, status "pending"
- `getOrderStatus()` → simulates processing:
  - Call 1-3: status "processing", remains decreasing
  - Call 4+: status "completed", remains 0
- `getBalance()` → returns static 999999 balance
- Add configurable failure modes for testing error handling

**File to Create**: `apps/api/src/smm-provider/provider-client.factory.ts`

Factory to create appropriate client:
```typescript
@Injectable()
export class ProviderClientFactory {
  createClient(provider: SmmProvider): ISmmProviderClient {
    const apiKey = this.encryptionService.decrypt(provider.apiKeyEncrypted);
    
    // For testing: use mock if provider name starts with "Mock"
    if (provider.name.startsWith('Mock')) {
      return new MockProviderClient();
    }
    
    // Real provider: return HTTP client
    return new RealProviderClient(provider.apiUrl, apiKey);
  }
}
```

### 5. SMM Provider Module
**Files to Create**:
- `apps/api/src/smm-provider/smm-provider.service.ts` - Business logic
- `apps/api/src/smm-provider/smm-provider.controller.ts` - Admin endpoints
- `apps/api/src/smm-provider/smm-provider.module.ts` - Module registration

**Service Methods** (`smm-provider.service.ts`):
```typescript
@Injectable()
export class SmmProviderService {
  async create(dto: CreateSmmProviderDto): Promise<SmmProviderDto> {
    const encrypted = this.encryptionService.encrypt(dto.apiKey);
    // Create provider with encrypted API key
  }

  async findAll(): Promise<SmmProviderDto[]> {
    // Return all providers with MASKED API keys
    // Use encryptionService.maskApiKey() for each
  }

  async findOne(id: string): Promise<SmmProviderDto> {
    // Return provider with MASKED API key
  }

  async update(id: string, dto: UpdateSmmProviderDto): Promise<SmmProviderDto> {
    // If dto.apiKey provided, encrypt it before storing
  }

  async remove(id: string): Promise<void> {
    // Delete provider (cascade delete mappings)
  }

  async testConnection(id: string): Promise<TestProviderConnectionResponse> {
    // 1. Find provider
    // 2. Create client using factory
    // 3. Try getBalance() with 10s timeout
    // 4. Return success + balance or error message
  }
}
```

**Controller Routes** (`smm-provider.controller.ts`):
- `POST /admin/smm-providers` - Create provider
- `GET /admin/smm-providers` - List all
- `GET /admin/smm-providers/:id` - Get one
- `PATCH /admin/smm-providers/:id` - Update
- `DELETE /admin/smm-providers/:id` - Delete
- `POST /admin/smm-providers/:id/test-connection` - Test connection

**Guards**: All routes use `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ADMIN')`

### 6. Service Mapping Module
**Files to Create**:
- `apps/api/src/service-mapping/service-mapping.service.ts`
- `apps/api/src/service-mapping/service-mapping.controller.ts`
- `apps/api/src/service-mapping/service-mapping.module.ts`

**Service Methods**:
```typescript
@Injectable()
export class ServiceMappingService {
  async create(dto: CreateServiceMappingDto): Promise<ServiceMappingDto> {
    // Validate productId exists and type is SEEDING
    // Validate providerId exists
    // Create mapping
  }

  async findAll(productId?: string, providerId?: string): Promise<ServiceMappingDto[]> {
    // Query with optional filters
    // Include product.name and provider.name
  }

  async findOne(id: string): Promise<ServiceMappingDto> {
    // Return mapping with product + provider names
  }

  async findByProductId(productId: string): Promise<ServiceMappingDto | null> {
    // Find active mapping for product
    // Used by OrdersService
  }

  async update(id: string, dto: UpdateServiceMappingDto): Promise<ServiceMappingDto> {
    // Update mapping
  }

  async remove(id: string): Promise<void> {
    // Delete mapping
  }
}
```

**Controller Routes**:
- `POST /admin/service-mappings` - Create mapping
- `GET /admin/service-mappings` - List all (with ?productId and ?providerId filters)
- `GET /admin/service-mappings/:id` - Get one
- `PATCH /admin/service-mappings/:id` - Update
- `DELETE /admin/service-mappings/:id` - Delete

### 7. Update OrdersService
**File to Modify**: [`apps/api/src/orders/orders.service.ts`](apps/api/src/orders/orders.service.ts:20)

**Changes in `create()` method** (around line 369, before DELIVERED status update):

```typescript
// 4.5. For SEEDING orders: Check if provider mapping exists and place order
const hasSeeding = orderItems.some((item) => item.product.type === ProductType.SEEDING);

if (hasSeeding) {
  // Get first SEEDING product (for simplicity, assume one SEEDING product per order)
  const seedingItem = orderItems.find((item) => item.product.type === ProductType.SEEDING)!;
  
  const mapping = await this.serviceMappingService.findByProductId(seedingItem.productId);
  
  if (mapping && mapping.isActive) {
    try {
      // Get provider
      const provider = await tx.smmProvider.findUnique({
        where: { id: mapping.providerId },
      });
      
      if (!provider || provider.status !== ProviderStatus.ACTIVE) {
        throw new Error('Provider is not active');
      }
      
      // Create provider client
      const client = this.providerClientFactory.createClient(provider);
      
      // Place order with provider
      const providerResponse = await Promise.race([
        client.placeOrder({
          service: mapping.providerServiceId,
          quantity: seedingItem.quantity,
          link: '', // TODO: Get from order metadata if needed
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Provider API timeout')), 10000)
        ),
      ]);
      
      // Update order with provider info and set status to PROCESSING
      await tx.order.update({
        where: { id: newOrder.id },
        data: {
          providerOrderId: providerResponse.orderId,
          providerId: provider.id,
          status: OrderStatus.PROCESSING,
          processingStatus: 'Order placed with provider, awaiting processing',
        },
      });
      
      this.logger.log(
        `SEEDING order ${newOrder.id} placed with provider ${provider.name}, ` +
        `provider order ID: ${providerResponse.orderId}`
      );
      
      // Skip setting to DELIVERED - will be updated by cron
      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: { items: { include: { product: true } }, stocks: true },
      });
      
    } catch (error) {
      this.logger.error(`Failed to place SEEDING order with provider`, error);
      
      // Update order to CANCELLED and refund
      await tx.order.update({
        where: { id: newOrder.id },
        data: {
          status: OrderStatus.CANCELLED,
          processingStatus: `Provider error: ${error.message}`,
        },
      });
      
      // Refund buyer
      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: { balance: { increment: finalAmount } },
      });
      
      await tx.transaction.create({
        data: {
          walletId: buyerWallet.id,
          orderId: newOrder.id,
          amount: finalAmount,
          type: TransactionType.REFUND,
          status: 'COMPLETED',
          description: `Full refund - provider placement failed`,
        },
      });
      
      throw new BadRequestException('Failed to place order with provider. Your payment has been refunded.');
    }
  }
}

// 5. For non-SEEDING orders or SEEDING without mapping: set to DELIVERED immediately
// ... existing DELIVERED logic ...
```

### 8. Update TasksService (Cron Job)
**File to Modify**: [`apps/api/src/tasks/tasks.service.ts`](apps/api/src/tasks/tasks.service.ts:5)

**Add new method**:

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Cron(CronExpression.EVERY_2_MINUTES)
async pollProviderOrderStatus() {
  this.logger.debug('Polling provider order status...');
  
  try {
    // Find all PROCESSING orders with providerOrderId
    const processingOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PROCESSING,
        providerOrderId: { not: null },
        providerId: { not: null },
      },
      include: {
        items: { include: { product: true } },
      },
    });
    
    if (processingOrders.length === 0) {
      this.logger.debug('No orders to poll');
      return;
    }
    
    this.logger.log(`Polling ${processingOrders.length} provider order(s)`);
    
    for (const order of processingOrders) {
      try {
        // Get provider
        const provider = await this.prisma.smmProvider.findUnique({
          where: { id: order.providerId! },
        });
        
        if (!provider) {
          this.logger.error(`Provider not found for order ${order.id}`);
          continue;
        }
        
        // Create client
        const client = this.providerClientFactory.createClient(provider);
        
        // Get status with timeout
        const status = await Promise.race([
          client.getOrderStatus(order.providerOrderId!),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Status check timeout')), 10000)
          ),
        ]);
        
        this.logger.debug(
          `Order ${order.id} provider status: ${status.status}, ` +
          `remains: ${status.remains || 0}`
        );
        
        // Handle status
        if (status.status === 'completed') {
          // Full completion
          await this.ordersService.updateProgress(order.id, order.sellerId!, {
            status: OrderStatus.COMPLETED,
            processedQuantity: status.quantity || order.items.reduce((sum, i) => sum + i.quantity, 0),
            processingStatus: 'Completed by provider',
          });
          
          this.logger.log(`Order ${order.id} completed by provider`);
          
        } else if (status.status === 'partial') {
          // Partial completion - need refund
          const totalQuantity = order.items.reduce((sum, i) => sum + i.quantity, 0);
          const processedQuantity = (status.quantity || 0) - (status.remains || 0);
          
          await this.ordersService.updateProgress(order.id, order.sellerId!, {
            status: OrderStatus.PARTIAL,
            processedQuantity,
            processingStatus: `Partial completion by provider: ${processedQuantity}/${totalQuantity}`,
          });
          
          this.logger.log(
            `Order ${order.id} partially completed: ` +
            `${processedQuantity}/${totalQuantity}`
          );
          
        } else if (status.status === 'cancelled' || status.status === 'failed') {
          // Provider cancelled - full refund
          await this.ordersService.updateProgress(order.id, order.sellerId!, {
            status: OrderStatus.CANCELLED,
            processedQuantity: 0,
            processingStatus: `Cancelled by provider: ${status.status}`,
          });
          
          this.logger.warn(`Order ${order.id} cancelled by provider`);
          
        } else if (status.status === 'processing') {
          // Still processing - update progress message
          const totalQuantity = order.items.reduce((sum, i) => sum + i.quantity, 0);
          const processed = (status.quantity || totalQuantity) - (status.remains || totalQuantity);
          
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              processedQuantity: processed,
              processingStatus: `Processing: ${processed}/${totalQuantity} completed`,
            },
          });
        }
        
      } catch (error) {
        this.logger.error(
          `Error polling order ${order.id}`,
          error
        );
      }
    }
    
    this.logger.log('Provider polling completed');
    
  } catch (error) {
    this.logger.error('Error in provider polling cron', error);
  }
}
```

### 9. Module Registration
**File to Modify**: [`apps/api/src/app.module.ts`](apps/api/src/app.module.ts:25)

**Add imports**:
```typescript
import { SmmProviderModule } from './smm-provider/smm-provider.module';
import { ServiceMappingModule } from './service-mapping/service-mapping.module';
import { EncryptionService } from './common/encryption.util';
```

**Update imports array**:
```typescript
@Module({
  imports: [
    // ... existing imports ...
    SmmProviderModule,
    ServiceMappingModule,
  ],
  providers: [AppService, EncryptionService], // Add EncryptionService as global
})
```

### 10. Migration SQL
**File to Create**: `apps/api/prisma/migrations/011_add_smm_providers.sql`

```sql
-- Add provider order tracking to orders table
ALTER TABLE "orders" 
  ADD COLUMN "providerOrderId" TEXT,
  ADD COLUMN "providerId" TEXT;

-- Create ProviderStatus enum
CREATE TYPE "ProviderStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- Create smm_providers table
CREATE TABLE "smm_providers" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT UNIQUE NOT NULL,
  "apiUrl" TEXT NOT NULL,
  "apiKeyEncrypted" TEXT NOT NULL,
  "balanceEndpoint" TEXT,
  "status" "ProviderStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create service_mappings table
CREATE TABLE "service_mappings" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "providerServiceId" TEXT NOT NULL,
  "ratePerThousand" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "service_mappings_productId_fkey" 
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
  CONSTRAINT "service_mappings_providerId_fkey" 
    FOREIGN KEY ("providerId") REFERENCES "smm_providers"("id") ON DELETE CASCADE,
  CONSTRAINT "service_mappings_productId_providerId_key" 
    UNIQUE ("productId", "providerId")
);

-- Create indexes
CREATE INDEX "service_mappings_productId_idx" ON "service_mappings"("productId");
CREATE INDEX "service_mappings_providerId_idx" ON "service_mappings"("providerId");
CREATE INDEX "orders_providerOrderId_idx" ON "orders"("providerOrderId");
CREATE INDEX "orders_status_providerId_idx" ON "orders"("status", "providerId");

-- Comments
COMMENT ON TABLE "smm_providers" IS 'External SMM service providers for SEEDING orders';
COMMENT ON COLUMN "smm_providers"."apiKeyEncrypted" IS 'API key encrypted with AES-256-GCM';
COMMENT ON TABLE "service_mappings" IS 'Maps internal products to external provider services';
COMMENT ON COLUMN "service_mappings"."ratePerThousand" IS 'Cost in VND per 1000 units from provider';
COMMENT ON COLUMN "orders"."providerOrderId" IS 'External provider order ID for SEEDING orders';
```

---

## 🎯 Acceptance Criteria

- [ ] Order SEEDING tự động chuyển PROCESSING sau khi tạo (với mock provider)
- [ ] Cron poll 2 phút cập nhật tiến độ từ provider
- [ ] Provider fail → order CANCELLED + refund full
- [ ] Provider partial → order PARTIAL + refund đúng tỷ lệ
- [ ] Provider complete → order COMPLETED
- [ ] Build 0 errors
- [ ] Migration SQL chạy thành công

---

## 📁 File Structure Summary

### ✅ Completed
```
apps/api/
├── prisma/
│   └── schema.prisma                    ✅ Updated (2 new models, Order/Product updated)
├── src/
│   └── common/
│       └── encryption.util.ts           ✅ Created (AES-256-GCM encryption)
packages/shared/src/types/index.ts       ✅ Updated (Provider DTOs added)
```

### 🚧 To Create
```
apps/api/src/
├── smm-provider/
│   ├── smm-provider.service.ts          [ ] Admin CRUD + test connection
│   ├── smm-provider.controller.ts       [ ] REST endpoints (Admin only)
│   ├── smm-provider.module.ts           [ ] Module registration
│   ├── smm-provider-client.interface.ts [ ] Interface definition
│   ├── mock-provider-client.ts          [ ] Mock implementation
│   ├── real-provider-client.ts          [ ] Real HTTP client
│   └── provider-client.factory.ts       [ ] Client factory
├── service-mapping/
│   ├── service-mapping.service.ts       [ ] CRUD operations
│   ├── service-mapping.controller.ts    [ ] REST endpoints (Admin only)
│   └── service-mapping.module.ts        [ ] Module registration
└── prisma/migrations/
    └── 011_add_smm_providers.sql        [ ] Migration SQL
```

### 🔧 To Modify
```
apps/api/src/
├── orders/orders.service.ts             [ ] Add provider order placement logic
├── tasks/tasks.service.ts               [ ] Add provider status polling cron
└── app.module.ts                        [ ] Register new modules + EncryptionService
```

---

## 🔐 Environment Variables

**Required in `.env`**:
```bash
# Provider API Key Encryption (32 bytes = 64 hex chars)
PROVIDER_KEY_SECRET=<generate-with-openssl-rand-hex-32>

# Example:
# PROVIDER_KEY_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Generate Key**:
```bash
openssl rand -hex 32
```

**Validation**: App throws error on boot if missing in production.

---

## 🧪 Testing Strategy

### 1. Unit Tests
- EncryptionService: encrypt/decrypt/mask
- MockProviderClient: status progression
- SmmProviderService: CRUD + masking
- ServiceMappingService: CRUD + validation

### 2. Integration Tests
- Create SEEDING order → verify providerOrderId set
- Poll cron → verify status updates
- Provider fail → verify full refund
- Provider partial → verify proportional refund

### 3. Manual Testing
1. Setup mock provider: `name: "Mock Provider A"`
2. Create service mapping: product (SEEDING) ↔ mock provider
3. Create SEEDING order → should go to PROCESSING
4. Wait 2 minutes → check order status updated
5. Wait 6+ minutes → should complete

---

## 📝 Implementation Checklist

### Phase 1: Provider Client (Foundation)
- [ ] Create `ISmmProviderClient` interface
- [ ] Implement `MockProviderClient`
- [ ] Implement `RealProviderClient` (HTTP with retry)
- [ ] Create `ProviderClientFactory`
- [ ] Unit test mock client

### Phase 2: Admin Management
- [ ] Create `SmmProviderService` (CRUD + encryption)
- [ ] Create `SmmProviderController` (Admin endpoints)
- [ ] Create `SmmProviderModule`
- [ ] Create `ServiceMappingService`
- [ ] Create `ServiceMappingController`
- [ ] Create `ServiceMappingModule`
- [ ] Add test-connection endpoint
- [ ] Test CRUD operations

### Phase 3: Order Integration
- [ ] Update `OrdersService.create()` - provider placement logic
- [ ] Handle provider errors + refund
- [ ] Update `TasksService` - add polling cron
- [ ] Handle status updates (completed/partial/cancelled)
- [ ] Test end-to-end flow

### Phase 4: Database & Documentation
- [ ] Create migration SQL (`011_add_smm_providers.sql`)
- [ ] Run migration
- [ ] Verify schema
- [ ] Create comprehensive documentation
- [ ] Document API endpoints
- [ ] Document error handling

---

## 🚨 Important Notes

1. **Encryption Key**: MUST be set before starting app in production
2. **Provider Timeout**: All provider API calls have 10s timeout
3. **Cron Frequency**: 2 minutes = balance between responsiveness and API load
4. **Error Handling**: Provider errors result in CANCELLED + full refund
5. **Partial Orders**: Refund calculated proportionally based on unprocessed quantity
6. **Mock vs Real**: Mock provider identified by name starting with "Mock"
7. **Admin Only**: All provider/mapping endpoints require ADMIN role

---

**Implementation Status**: Foundation Complete (40%)  
**Next Steps**: Implement Provider Client → Admin Management → Order Integration  
**Estimated Remaining**: ~15-20 files, ~1500-2000 lines of code  
**Priority**: Provider Client & Mock (critical for testing)
