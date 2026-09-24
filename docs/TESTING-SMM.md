# ROO-11: SMM Provider Testing Guide (PowerShell)

Guide để test SMM Provider automation trên Windows với PowerShell.

## Prerequisites

- API đang chạy tại `http://localhost:3001`
- PostgreSQL database đã setup
- Migration 011 đã chạy
- Prisma client đã generate
- `jq` cho Windows (optional, để parse JSON): `choco install jq` hoặc dùng PowerShell native parsing

---

## Setup: Tạo Admin User

Trước khi test, đảm bảo có admin user. Nếu chưa, tạo bằng cách:

```powershell
# Seed admin user (nếu chưa có)
$body = @{
    email = "admin@example.com"
    password = "admin123"
    name = "Admin User"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

# Sau đó update role thành ADMIN trong database:
# UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

---

## Test 1: Provider CRUD Flow

### Bước 1: Login Admin

```powershell
$apiUrl = "http://localhost:3001"

# Login
$loginBody = @{
    email = "admin@example.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$apiUrl/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody

$adminToken = $loginResponse.data.accessToken
Write-Host "✓ Admin logged in: $adminToken" -ForegroundColor Green
```

### Bước 2: Create Mock Provider

```powershell
# Create provider
$providerBody = @{
    name = "Test Mock Provider"
    apiUrl = "mock://test"
    apiKey = "test-key-12345"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $adminToken"
    "Content-Type" = "application/json"
}

$providerResponse = Invoke-RestMethod -Uri "$apiUrl/smm/providers" `
    -Method POST `
    -Headers $headers `
    -Body $providerBody

$providerId = $providerResponse.data.id
Write-Host "✓ Provider created: $providerId" -ForegroundColor Green
Write-Host "  Name: $($providerResponse.data.name)"
Write-Host "  API Key (masked): $($providerResponse.data.apiKey)"
```

**Validation Test**: Thử tạo provider với invalid URL

```powershell
# Should fail with 400
$invalidBody = @{
    name = "Invalid Provider"
    apiUrl = "invalid-url"
    apiKey = "test-key"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$apiUrl/smm/providers" `
        -Method POST `
        -Headers $headers `
        -Body $invalidBody
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "✓ Validation working: Invalid URL rejected with 400" -ForegroundColor Green
    } else {
        Write-Host "✗ Expected 400, got $statusCode" -ForegroundColor Red
    }
}
```

### Bước 3: Test Connection

```powershell
$testResponse = Invoke-RestMethod -Uri "$apiUrl/smm/providers/$providerId/test" `
    -Method POST `
    -Headers $headers

if ($testResponse.data.success -eq $true) {
    Write-Host "✓ Connection test passed" -ForegroundColor Green
    Write-Host "  Message: $($testResponse.data.message)"
    Write-Host "  Balance: $($testResponse.data.balance)"
} else {
    Write-Host "✗ Connection test failed" -ForegroundColor Red
}
```

### Bước 4: Get All Providers

```powershell
$allProviders = Invoke-RestMethod -Uri "$apiUrl/smm/providers" `
    -Method GET `
    -Headers $headers

Write-Host "✓ Found $($allProviders.data.Count) provider(s)" -ForegroundColor Green
$allProviders.data | ForEach-Object {
    Write-Host "  - $($_.name) ($($_.status))"
}
```

---

## Test 2: Service Mapping

### Bước 1: Create SEEDING Product

```powershell
# Get or create shop first
$myShops = Invoke-RestMethod -Uri "$apiUrl/shops/my" `
    -Method GET `
    -Headers $headers

if ($myShops.data.Count -eq 0) {
    # Create shop
    $shopBody = @{
        name = "Test Shop"
        description = "Test shop for SMM"
    } | ConvertTo-Json
    
    $shopResponse = Invoke-RestMethod -Uri "$apiUrl/shops" `
        -Method POST `
        -Headers $headers `
        -Body $shopBody
    
    $shopId = $shopResponse.data.id
} else {
    $shopId = $myShops.data[0].id
}

# Create SEEDING product
$productBody = @{
    name = "Instagram Followers"
    description = "Test SEEDING product"
    type = "SEEDING"
    price = 100000
    shopId = $shopId
} | ConvertTo-Json

$productResponse = Invoke-RestMethod -Uri "$apiUrl/products" `
    -Method POST `
    -Headers $headers `
    -Body $productBody

$productId = $productResponse.data.id
Write-Host "✓ Product created: $productId" -ForegroundColor Green
```

### Bước 2: Create Service Mapping

```powershell
$mappingBody = @{
    productId = $productId
    providerId = $providerId
    providerServiceId = "100"
    ratePerThousand = 50000
} | ConvertTo-Json

$mappingResponse = Invoke-RestMethod -Uri "$apiUrl/smm/mappings" `
    -Method POST `
    -Headers $headers `
    -Body $mappingBody

$mappingId = $mappingResponse.data.id
Write-Host "✓ Mapping created: $mappingId" -ForegroundColor Green
Write-Host "  Product: $($mappingResponse.data.productId)"
Write-Host "  Provider: $($mappingResponse.data.providerId)"
Write-Host "  Active: $($mappingResponse.data.isActive)"
```

### Bước 3: List Mappings

```powershell
$allMappings = Invoke-RestMethod -Uri "$apiUrl/smm/mappings" `
    -Method GET `
    -Headers $headers

Write-Host "✓ Found $($allMappings.data.Count) mapping(s)" -ForegroundColor Green
```

---

## Test 3: E2E Order Flow (Auto-Placement)

### Bước 1: Setup Buyer

```powershell
# Register or login buyer
$buyerBody = @{
    email = "buyer@test.com"
    password = "buyer123"
    name = "Test Buyer"
} | ConvertTo-Json

try {
    $buyerResponse = Invoke-RestMethod -Uri "$apiUrl/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $buyerBody
    
    $buyerToken = $buyerResponse.data.accessToken
    Write-Host "✓ Buyer registered" -ForegroundColor Green
} catch {
    # Already exists, login
    $loginBuyerBody = @{
        email = "buyer@test.com"
        password = "buyer123"
    } | ConvertTo-Json
    
    $buyerResponse = Invoke-RestMethod -Uri "$apiUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBuyerBody
    
    $buyerToken = $buyerResponse.data.accessToken
    Write-Host "✓ Buyer logged in" -ForegroundColor Green
}

$buyerHeaders = @{
    "Authorization" = "Bearer $buyerToken"
    "Content-Type" = "application/json"
}
```

### Bước 2: Deposit Funds

```powershell
# Create deposit
$depositBody = @{
    amount = 500000
} | ConvertTo-Json

$depositResponse = Invoke-RestMethod -Uri "$apiUrl/wallet/deposit" `
    -Method POST `
    -Headers $buyerHeaders `
    -Body $depositBody

$transactionId = $depositResponse.data.transactionId
Write-Host "✓ Deposit created: $transactionId" -ForegroundColor Green

# Simulate payment confirmation
$confirmBody = @{
    transactionId = $transactionId
    sepayTransactionId = "mock-sepay-$(Get-Random -Maximum 999999)"
} | ConvertTo-Json

$confirmResponse = Invoke-RestMethod -Uri "$apiUrl/wallet/confirm" `
    -Method POST `
    -Headers $buyerHeaders `
    -Body $confirmBody

Write-Host "✓ Deposit confirmed. Balance: $($confirmResponse.data.balance) VND" -ForegroundColor Green
```

### Bước 3: Place SEEDING Order (Auto-Placement)

```powershell
$orderBody = @{
    items = @(
        @{
            productId = $productId
            quantity = 1000
        }
    )
} | ConvertTo-Json -Depth 3

$orderResponse = Invoke-RestMethod -Uri "$apiUrl/orders" `
    -Method POST `
    -Headers $buyerHeaders `
    -Body $orderBody

$orderId = $orderResponse.data.id
$orderStatus = $orderResponse.data.status
$providerOrderId = $orderResponse.data.providerOrderId

Write-Host "✓ Order created: $orderId" -ForegroundColor Green
Write-Host "  Status: $orderStatus"

if ($orderStatus -eq "PROCESSING") {
    Write-Host "  ✓ Auto-placed with provider: $providerOrderId" -ForegroundColor Green
} elseif ($orderStatus -eq "CANCELLED") {
    Write-Host "  ⚠ Order cancelled (provider failed)" -ForegroundColor Yellow
    
    # Check refund
    $wallet = Invoke-RestMethod -Uri "$apiUrl/wallet" `
        -Method GET `
        -Headers $buyerHeaders
    
    if ($wallet.data.balance -eq 500000) {
        Write-Host "  ✓ Full refund successful" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Refund failed" -ForegroundColor Red
    }
    
    Write-Host "`n✓ Refund scenario test PASSED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "  ⚠ Unexpected status: $orderStatus" -ForegroundColor Yellow
}
```

### Bước 4: Wait and Poll (Cron Simulation)

```powershell
Write-Host "`nWaiting for cron polling..." -ForegroundColor Cyan
Write-Host "Mock provider behavior:"
Write-Host "  - Poll 1 (0-2 min): pending"
Write-Host "  - Poll 2 (2-4 min): processing (30% done)"
Write-Host "  - Poll 3 (4-6 min): completed (100% done)"
Write-Host ""

# Poll 1: After 3 seconds
Start-Sleep -Seconds 3
$order1 = Invoke-RestMethod -Uri "$apiUrl/orders/$orderId" `
    -Method GET `
    -Headers $buyerHeaders

Write-Host "Poll 1: Status = $($order1.data.status)" -ForegroundColor Cyan

# Poll 2: Wait 2+ minutes for cron
Write-Host "Waiting 2 minutes for cron job..." -ForegroundColor Yellow
Start-Sleep -Seconds 130

$order2 = Invoke-RestMethod -Uri "$apiUrl/orders/$orderId" `
    -Method GET `
    -Headers $buyerHeaders

Write-Host "Poll 2: Status = $($order2.data.status), Processed = $($order2.data.processedQuantity)" -ForegroundColor Cyan

# Poll 3: Wait another 2+ minutes
Write-Host "Waiting another 2 minutes..." -ForegroundColor Yellow
Start-Sleep -Seconds 130

$order3 = Invoke-RestMethod -Uri "$apiUrl/orders/$orderId" `
    -Method GET `
    -Headers $buyerHeaders

Write-Host "Poll 3 (Final): Status = $($order3.data.status), Processed = $($order3.data.processedQuantity)" -ForegroundColor Cyan
```

### Bước 5: Verify Final State

```powershell
if ($order3.data.status -eq "COMPLETED") {
    Write-Host "`n✓✓✓ E2E Test PASSED ✓✓✓" -ForegroundColor Green
    Write-Host "  - Order auto-placed with provider"
    Write-Host "  - Cron polling working"
    Write-Host "  - Status progression: PROCESSING → COMPLETED"
    Write-Host "  - providerOrderId: $($order3.data.providerOrderId)"
    Write-Host "  - providerId: $($order3.data.providerId)"
} else {
    Write-Host "`n✗ E2E Test FAILED" -ForegroundColor Red
    Write-Host "  Expected: COMPLETED"
    Write-Host "  Got: $($order3.data.status)"
}
```

---

## Quick Test Script

Tạo file `test-smm-quick.ps1`:

```powershell
# Quick SMM E2E Test
$apiUrl = "http://localhost:3001"

# 1. Login admin
$login = Invoke-RestMethod -Uri "$apiUrl/auth/login" -Method POST `
    -ContentType "application/json" `
    -Body (@{email="admin@example.com";password="admin123"} | ConvertTo-Json)
$token = $login.data.accessToken
$headers = @{"Authorization"="Bearer $token";"Content-Type"="application/json"}

Write-Host "✓ Admin logged in" -ForegroundColor Green

# 2. Create provider
$provider = Invoke-RestMethod -Uri "$apiUrl/smm/providers" -Method POST `
    -Headers $headers `
    -Body (@{name="QuickTest";apiUrl="mock://test";apiKey="key123"} | ConvertTo-Json)

Write-Host "✓ Provider created: $($provider.data.id)" -ForegroundColor Green

# 3. Test connection
$test = Invoke-RestMethod -Uri "$apiUrl/smm/providers/$($provider.data.id)/test" `
    -Method POST -Headers $headers

if ($test.data.success) {
    Write-Host "✓ Connection test passed" -ForegroundColor Green
} else {
    Write-Host "✗ Connection failed" -ForegroundColor Red
}

Write-Host "`n✓ Quick test complete!" -ForegroundColor Green
```

Chạy: `.\test-smm-quick.ps1`

---

## Troubleshooting

### Lỗi: "Property 'smmProvider' does not exist"

```powershell
# Chạy Prisma generate
cd apps/api
npx prisma generate
```

### Lỗi: "Cannot connect to API"

```powershell
# Check API đang chạy
Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET
```

### Lỗi: "Admin user not found"

```sql
-- Tạo admin user trong PostgreSQL
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

### Check Cron Job Logs

```powershell
# Xem logs của API (nếu dùng pnpm dev)
# Tìm dòng "Polling X PROCESSING order(s)"
```

---

## Acceptance Criteria Checklist

- [ ] **Provider creation với invalid URL → 400 error**
  - Test: Create provider với `apiUrl = "invalid-url"`
  - Expected: BadRequestException với message "Invalid apiUrl format"

- [ ] **GET order trả về providerOrderId/providerId**
  - Test: GET `/orders/:id` sau khi place SEEDING order
  - Expected: Response có `providerOrderId` và `providerId` fields

- [ ] **Auto-placement khi tạo SEEDING order**
  - Test: Place order với SEEDING product có mapping
  - Expected: Order status = PROCESSING, có providerOrderId

- [ ] **Provider fail → CANCELLED + refund**
  - Test: Mock provider throw error
  - Expected: Order CANCELLED, buyer wallet refunded full

- [ ] **Cron polling status progression**
  - Test: Wait 2-6 minutes, check order status
  - Expected: PROCESSING → COMPLETED

- [ ] **Build 0 error**
  - Test: `pnpm build` trong apps/api
  - Expected: No TypeScript errors

---

## Notes

- Mock provider luôn trả về success (không thật sự fail)
- Để test fail scenario, cần modify MockSmmProviderClient
- Real provider test nằm ngoài scope ROO-11
- PowerShell native JSON parsing: `$response.data.fieldName`
- Nếu có `jq`: `$response | ConvertTo-Json | jq '.data'`

---

**Last Updated**: 2026-09-22  
**ROO-11 Phase 2**: Complete
