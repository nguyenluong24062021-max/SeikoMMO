# ROO-11 Setup & Testing Guide

## 📦 Installation Steps

### 1. Install Dependencies

```bash
# Navigate to API directory
cd apps/api

# Install @nestjs/axios and axios
pnpm add @nestjs/axios axios

# Or using npm
npm install @nestjs/axios axios
```

### 2. Generate Prisma Client

```bash
# Still in apps/api directory
npx prisma generate

# This will generate TypeScript types for new models:
# - SmmProvider
# - ServiceMapping
# - Updated Order with providerOrderId and providerId
```

### 3. Run Migration

```bash
# Make sure PostgreSQL is running
docker-compose up -d postgres

# Run the migration SQL
psql -h localhost -U postgres -d seiko_mmo -f prisma/migrations/011_add_smm_providers.sql

# Or using docker exec if postgres is in container
docker exec -i seiko_mmo-postgres-1 psql -U postgres -d seiko_mmo < apps/api/prisma/migrations/011_add_smm_providers.sql
```

### 4. Rebuild Shared Package (Optional but recommended)

```bash
# Navigate to shared package
cd packages/shared

# Build TypeScript
pnpm build
# or
npm run build

# This ensures all new types are compiled
```

### 5. Set Environment Variable (Optional for development)

```bash
# Add to apps/api/.env
echo "PROVIDER_KEY_SECRET=$(openssl rand -hex 32)" >> apps/api/.env

# Or on Windows (PowerShell)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" | Out-File -Append apps/api/.env -Encoding utf8
```

---

## 🧪 Testing

### Manual API Testing

#### 1. Start API Server

```bash
cd apps/api
pnpm dev
```

#### 2. Login as Admin

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

Save the `accessToken` from response.

#### 3. Create Mock Provider

```bash
curl -X POST http://localhost:3001/smm/providers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Mock Test Provider",
    "apiUrl": "mock://test-provider",
    "apiKey": "test-key-12345",
    "balanceEndpoint": "/balance"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Provider created successfully",
  "data": {
    "id": "uuid-here",
    "name": "Mock Test Provider",
    "apiUrl": "mock://test-provider",
    "apiKey": "****2345",  // Masked: only last 4 chars shown
    "status": "ACTIVE",
    "createdAt": "2026-09-22T13:00:00.000Z",
    "updatedAt": "2026-09-22T13:00:00.000Z"
  }
}
```

#### 4. Test Connection

```bash
curl -X POST http://localhost:3001/smm/providers/PROVIDER_ID/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response (Mock Provider):**
```json
{
  "success": true,
  "message": "Connected successfully. Balance: 999999.99 USD",
  "data": {
    "success": true,
    "message": "Connected successfully. Balance: 999999.99 USD",
    "balance": 999999.99
  }
}
```

#### 5. Create Service Mapping

First, get a SEEDING product ID:
```bash
curl -X GET http://localhost:3001/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Then create mapping:
```bash
curl -X POST http://localhost:3001/smm/mappings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": "PRODUCT_ID",
    "providerId": "PROVIDER_ID",
    "providerServiceId": "service-123",
    "ratePerThousand": 50000
  }'
```

#### 6. List All Mappings

```bash
curl -X GET http://localhost:3001/smm/mappings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 7. Get Mappings by Product

```bash
curl -X GET "http://localhost:3001/smm/mappings?productId=PRODUCT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🧪 Unit Testing Mock Provider Flow

### Test MockProviderClient Directly

Create a test file `apps/api/src/smm/test-mock-client.ts`:

```typescript
import { MockSmmProviderClient } from './mock-smm-provider-client';

async function testMockProvider() {
  const client = new MockSmmProviderClient('Test Provider', 'mock://test');
  
  console.log('1. Placing order...');
  const orderResponse = await client.placeOrder({
    service: 'service-123',
    quantity: 1000,
    link: 'https://example.com',
  });
  
  console.log('Order placed:', orderResponse);
  const orderId = orderResponse.orderId;
  
  // Poll 1: Should be pending
  console.log('\n2. Poll 1 (should be pending)...');
  const status1 = await client.getOrderStatus(orderId);
  console.log('Status:', status1);
  
  // Poll 2: Should be processing (30% done)
  console.log('\n3. Poll 2 (should be processing)...');
  const status2 = await client.getOrderStatus(orderId);
  console.log('Status:', status2);
  
  // Poll 3: Should be completed
  console.log('\n4. Poll 3 (should be completed)...');
  const status3 = await client.getOrderStatus(orderId);
  console.log('Status:', status3);
  
  // Check balance
  console.log('\n5. Check balance...');
  const balance = await client.getBalance();
  console.log('Balance:', balance);
}

testMockProvider().then(() => {
  console.log('\n✓ Test completed successfully');
}).catch(err => {
  console.error('\n✗ Test failed:', err);
});
```

Run the test:
```bash
cd apps/api
npx ts-node src/smm/test-mock-client.ts
```

**Expected Output:**
```
1. Placing order...
Order placed: { orderId: 'MOCK-...', status: 'pending', charge: 10 }

2. Poll 1 (should be pending)...
Status: { orderId: 'MOCK-...', status: 'pending', startCount: 0, quantity: 0, remains: 1000 }

3. Poll 2 (should be processing)...
Status: { orderId: 'MOCK-...', status: 'processing', startCount: 0, quantity: 300, remains: 700 }

4. Poll 3 (should be completed)...
Status: { orderId: 'MOCK-...', status: 'completed', startCount: 0, quantity: 1000, remains: 0 }

5. Check balance...
Balance: { balance: 999999.99, currency: 'USD' }

✓ Test completed successfully
```

---

## ✅ Acceptance Criteria Verification

### 1. ✅ Build 0 Errors

```bash
cd apps/api
pnpm build

# Should complete with no TypeScript errors
```

### 2. ✅ Migration 011 Success

```bash
# Run migration
psql -f prisma/migrations/011_add_smm_providers.sql

# Verify tables exist
psql -d seiko_mmo -c "\dt smm*"
psql -d seiko_mmo -c "\dt service_mappings"
```

**Expected:**
```
                List of relations
 Schema |       Name         | Type  |  Owner   
--------+--------------------+-------+----------
 public | service_mappings   | table | postgres
 public | smm_providers      | table | postgres
```

### 3. ✅ Mock Provider Creation & Test Connection

Follow "Manual API Testing" steps 3-4 above.

### 4. ✅ Service Mapping Creation

Follow "Manual API Testing" step 5 above.

### 5. ✅ Provider Client Unit Flow

Follow "Unit Testing Mock Provider Flow" above.

**Expected behavior:**
- First poll: `status = 'pending'`
- Second poll: `status = 'processing'`, `quantity = 300` (30%)
- Third poll: `status = 'completed'`, `quantity = 1000` (100%)

---

## 🐛 Troubleshooting

### Error: Module '@nestjs/axios' not found

```bash
cd apps/api
pnpm add @nestjs/axios axios
```

### Error: Property 'smmProvider' does not exist on type 'PrismaService'

```bash
cd apps/api
npx prisma generate
```

### Error: Module '@repo/shared' has no exported member 'ProviderOrderRequest'

```bash
cd packages/shared
pnpm build

# Then rebuild API
cd ../../apps/api
pnpm build
```

### Error: PROVIDER_KEY_SECRET is not set

Add to `apps/api/.env`:
```bash
PROVIDER_KEY_SECRET=your_64_char_hex_key_here
```

Generate one:
```bash
openssl rand -hex 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📁 Files Created

### Migration
- `apps/api/prisma/migrations/011_add_smm_providers.sql`

### SMM Module
- `apps/api/src/smm/smm-provider-client.interface.ts` - Interface + SmmProviderException
- `apps/api/src/smm/mock-smm-provider-client.ts` - Mock implementation (in-memory)
- `apps/api/src/smm/real-smm-provider-client.ts` - Real HTTP client (timeout + retry)
- `apps/api/src/smm/provider-client.factory.ts` - Factory (mock:// → Mock, else → Real)
- `apps/api/src/smm/smm-provider.service.ts` - Provider CRUD + test connection
- `apps/api/src/smm/smm-provider.controller.ts` - Provider REST endpoints
- `apps/api/src/smm/service-mapping.service.ts` - Mapping CRUD
- `apps/api/src/smm/service-mapping.controller.ts` - Mapping REST endpoints
- `apps/api/src/smm/smm.module.ts` - Module definition

### Common
- `apps/api/src/common/encryption.util.ts` - AES-256-GCM encryption service (already exists)

### Testing
- `test-smm-provider.sh` - Bash script for API testing

### Updated
- `apps/api/src/app.module.ts` - Import SmmModule
- `apps/api/prisma/schema.prisma` - SmmProvider, ServiceMapping models (already updated)
- `packages/shared/src/types/index.ts` - Provider DTOs (already updated)

---

## 🎯 Next Steps (Not included in ROO-11 scope)

These are intentionally left out per requirements:

### Order Integration
- Update `OrdersService.create()` to auto place provider orders
- Handle provider errors with full refund
- See: `docs/roo11-smm-provider-automation.md` Phase 4

### Cron Polling
- Update `TasksService` with `@Cron(CronExpression.EVERY_2_MINUTES)`
- Poll provider status for PROCESSING orders
- Auto complete/partial/cancel with refunds
- See: `docs/roo11-smm-provider-automation.md` Phase 5

### UI (Web Frontend)
- Admin pages for provider/mapping management
- Not in scope for ROO-11

---

## 📚 Documentation

- Full roadmap: `docs/roo11-smm-provider-automation.md`
- Conversation summary: `docs/CONVERSATION_SUMMARY.md`
- Production checklist: `docs/PROD.md`
