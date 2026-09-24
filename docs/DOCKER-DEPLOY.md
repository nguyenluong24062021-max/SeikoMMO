# Docker Production Deployment Guide

Hướng dẫn triển khai SeikoMMO bằng Docker trên máy local hoặc VPS.

---

## 📋 Overview

ROO-13 cung cấp production-ready Docker setup với:
- **Multi-stage builds** cho API (NestJS) và Web (Next.js)
- **PostgreSQL 16** với volume persistence và health checks
- **Redis 7** cho caching
- **Automated backups** với retention policy
- **Health checks** tự động cho tất cả services
- **Graceful restarts** không mất data

---

## 🎯 Acceptance Criteria

✅ `docker compose -f docker-compose.prod.yml up --build -d` chạy thành công  
✅ `/health` endpoint trả về 200  
✅ Web UI load được tại http://localhost:3000  
✅ E2E flow: deposit mock → order hoạt động trong container  
✅ Dừng và khởi động lại không mất data (volumes persist)  

---

## 🚀 Quick Start

### Prerequisites

```bash
# Kiểm tra Docker đã cài đặt
docker --version          # Cần 20.10+
docker compose version    # Cần v2.0+

# Cần ít nhất:
# - 4GB RAM available
# - 10GB disk space
```

### Step 1: Chuẩn bị Environment File

```bash
# Copy template
cp .env.prod.example .env.prod

# Generate secrets
# Windows PowerShell:
[Convert]::ToBase64String((1..32|%{Get-Random -Minimum 0 -Maximum 256}))

# Linux/Mac:
openssl rand -base64 32
```

**Sửa `.env.prod`** với các giá trị:
- `JWT_ACCESS_SECRET` (32+ ký tự random)
- `JWT_REFRESH_SECRET` (32+ ký tự random)
- `PROVIDER_KEY_SECRET` (đúng 32 ký tự)
- `POSTGRES_PASSWORD` (mật khẩu mạnh)
- `SEPAY_ALLOW_UNSIGNED=false` (BẮT BUỘC)

### Step 2: Build và Start

```bash
# Build images (5-10 phút lần đầu)
docker compose -f docker-compose.prod.yml build

# Start database first
docker compose -f docker-compose.prod.yml up -d postgres redis

# Đợi healthy (~30 giây)
docker compose -f docker-compose.prod.yml ps

# Chạy migrations (quan trọng!)
docker exec -it seiko-postgres-prod psql -U postgres -d seiko_mmo

# Trong psql, chạy:
\i /var/lib/postgresql/data/set_timezone_utc.sql
\i /var/lib/postgresql/data/008_add_flash_sales.sql
\i /var/lib/postgresql/data/009_add_referral_system.sql
\i /var/lib/postgresql/data/010_timezone_to_timestamptz.sql
\i /var/lib/postgresql/data/011_add_smm_providers.sql
\i /var/lib/postgresql/data/012_add_crypto_payment_provider.sql
\q

# Start API và Web
docker compose -f docker-compose.prod.yml up -d api web
```

### Step 3: Verify

```bash
# Health checks
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"..."}

curl http://localhost:3000
# Expected: HTML (200 OK)

# Check logs
docker compose -f docker-compose.prod.yml logs api --tail 50

# Should see: "🚀 API server is running on http://localhost:3001"
```

---

## 🧪 Testing Guide

### Test Suite 1: Basic Functionality

#### Test 1.1: User Registration
```powershell
$body = @{
    email = "docker@test.com"
    password = "Test123!"
    name = "Docker Test User"
} | ConvertTo-Json

curl.exe -X POST http://localhost:3001/auth/register `
  -H "Content-Type: application/json" `
  -d $body
```

**Expected**: JSON response với `accessToken`, `refreshToken`, và user object.

#### Test 1.2: User Login
```powershell
$body = @{
    email = "docker@test.com"
    password = "Test123!"
} | ConvertTo-Json

$response = curl.exe -X POST http://localhost:3001/auth/login `
  -H "Content-Type: application/json" `
  -d $body | ConvertFrom-Json

$token = $response.data.accessToken
Write-Host "Token: $token"
```

**Expected**: Same as registration, tokens returned.

#### Test 1.3: Get Wallet
```powershell
curl.exe http://localhost:3001/wallet `
  -H "Authorization: Bearer $token"
```

**Expected**: Wallet object với `balance: 0`.

### Test Suite 2: Mock Deposit Flow

#### Test 2.1: Create Deposit
```powershell
$body = @{ amount = 500000 } | ConvertTo-Json

$deposit = curl.exe -X POST http://localhost:3001/wallet/deposit `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d $body | ConvertFrom-Json

$transactionId = $deposit.data.transactionId
Write-Host "Transaction ID: $transactionId"
```

**Expected**: Returns transaction with PENDING status.

#### Test 2.2: Confirm Deposit (Mock Webhook)
```powershell
$body = @{
    transactionId = $transactionId
    amount = 500000
    signature = "mock-signature-for-dev-testing"
} | ConvertTo-Json

curl.exe -X POST http://localhost:3001/wallet/confirm-deposit `
  -H "Content-Type: application/json" `
  -d $body
```

**Expected**: Transaction status → COMPLETED, wallet balance +500k.

#### Test 2.3: Verify Balance
```powershell
curl.exe http://localhost:3001/wallet `
  -H "Authorization: Bearer $token"
```

**Expected**: `balance: 500000`.

### Test Suite 3: Order Flow

**Prerequisite**: Cần có shop và product. Tạo bằng admin hoặc seller account.

#### Test 3.1: Create Order
```powershell
$body = @{
    items = @(
        @{
            productId = "your-product-id"
            quantity = 10
        }
    )
} | ConvertTo-Json

curl.exe -X POST http://localhost:3001/orders `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d $body
```

**Expected**: Order created, wallet balance deducted.

### Test Suite 4: Container Persistence

#### Test 4.1: Stop Containers
```bash
docker compose -f docker-compose.prod.yml stop
```

**Expected**: All containers stop gracefully.

#### Test 4.2: Start Containers
```bash
docker compose -f docker-compose.prod.yml start
```

**Expected**: All containers start, health checks pass.

#### Test 4.3: Verify Data Persists
```powershell
# Login again
$response = curl.exe -X POST http://localhost:3001/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"docker@test.com","password":"Test123!"}' | ConvertFrom-Json

$token = $response.data.accessToken

# Check wallet
curl.exe http://localhost:3001/wallet `
  -H "Authorization: Bearer $token"
```

**Expected**: Wallet still has 500k balance (data persisted).

---

## 🔧 Common Operations

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs

# Follow logs (live)
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs api -f
docker compose -f docker-compose.prod.yml logs web --tail 100

# Search for errors
docker compose -f docker-compose.prod.yml logs api | findstr "error"  # Windows
docker compose -f docker-compose.prod.yml logs api | grep -i error   # Linux/Mac
```

### Restart Services
```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart api
docker compose -f docker-compose.prod.yml restart web
```

### Access Database
```bash
# psql shell
docker exec -it seiko-postgres-prod psql -U postgres -d seiko_mmo

# Run SQL from host
docker exec -i seiko-postgres-prod psql -U postgres -d seiko_mmo -c "SELECT COUNT(*) FROM users;"

# Export data
docker exec seiko-postgres-prod pg_dump -U postgres -d seiko_mmo > backup.sql
```

### Check Container Health
```bash
# Status of all services
docker compose -f docker-compose.prod.yml ps

# Detailed health info
docker inspect seiko-api-prod | findstr -A 10 Health      # Windows
docker inspect seiko-api-prod | grep -A 10 Health         # Linux/Mac

# Container resource usage
docker stats seiko-api-prod seiko-web-prod seiko-postgres-prod
```

---

## 🗄️ Database Backup

### Automated Backup Setup

#### Windows (Task Scheduler)
```powershell
# Run as Administrator
$Action = New-ScheduledTaskAction -Execute "cmd.exe" `
  -Argument "/c C:\path\to\SeikoMMO\scripts\backup-db.bat"

$Trigger = New-ScheduledTaskTrigger -Daily -At 2am

Register-ScheduledTask -TaskName "SeikoMMO DB Backup" `
  -Action $Action -Trigger $Trigger `
  -Description "Daily backup at 2 AM"
```

#### Linux/Mac (cron)
```bash
# Edit crontab
crontab -e

# Add line (runs at 2 AM daily)
0 2 * * * /path/to/SeikoMMO/scripts/backup-db.sh >> /var/log/seiko-backup.log 2>&1
```

### Manual Backup
```bash
# Using script
./scripts/backup-db.sh         # Linux/Mac
scripts\backup-db.bat          # Windows

# Or direct docker command
docker exec seiko-postgres-prod pg_dump -U postgres -d seiko_mmo \
  --format=custom --no-owner --no-acl \
  --file=/tmp/backup_$(date +%Y%m%d_%H%M%S).backup

# Copy from container to host
docker cp seiko-postgres-prod:/tmp/backup_YYYYMMDD_HHMMSS.backup ./backups/
```

### Restore from Backup
```bash
# Stop API first
docker compose -f docker-compose.prod.yml stop api

# Restore
docker exec -i seiko-postgres-prod pg_restore -U postgres -d seiko_mmo \
  --clean --if-exists --no-owner --no-acl \
  /path/to/backup.backup

# Restart API
docker compose -f docker-compose.prod.yml start api
```

---

## 🚨 Troubleshooting

### Issue: Port Already in Use
```
Error: bind: address already in use
```

**Solution**:
```bash
# Check what's using the port (Windows)
netstat -ano | findstr ":3001"
netstat -ano | findstr ":5432"

# Check what's using the port (Linux/Mac)
lsof -i :3001
lsof -i :5432

# Stop conflicting service or change port in docker-compose.prod.yml
```

### Issue: Container Unhealthy
```
seiko-api-prod    Up (unhealthy)
```

**Solution**:
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs api --tail 50

# Common causes:
# - Database not ready: Wait 30-60 seconds
# - Missing env vars: Check .env.prod
# - Failed migration: Run migrations manually

# Restart after fixing
docker compose -f docker-compose.prod.yml restart api
```

### Issue: Cannot Connect to Database
```
Error: connect ECONNREFUSED
```

**Solution**:
```bash
# Verify postgres is healthy
docker compose -f docker-compose.prod.yml ps postgres

# Should show "Up (healthy)"
# If not healthy:
docker compose -f docker-compose.prod.yml logs postgres

# Check DATABASE_URL in .env.prod
# Should be: postgresql://postgres:password@postgres:5432/seiko_mmo
```

### Issue: Next.js Build Failed
```
Error: Cannot find module '@repo/shared'
```

**Solution**:
```bash
# Rebuild with no cache
docker compose -f docker-compose.prod.yml build --no-cache web

# Or build shared package first manually
cd packages/shared
pnpm install
pnpm build
cd ../..

# Then rebuild web
docker compose -f docker-compose.prod.yml build web
```

### Issue: Prisma Client Not Generated
```
Error: @prisma/client did not initialize yet
```

**Solution**:
```bash
# Rebuild API
docker compose -f docker-compose.prod.yml build --no-cache api

# Or run manually in container
docker exec seiko-api-prod sh -c "cd /app/apps/api && npx prisma generate"
docker compose -f docker-compose.prod.yml restart api
```

---

## 🧹 Cleanup

### Stop All Services
```bash
# Stop (keeps containers and data)
docker compose -f docker-compose.prod.yml stop

# Stop and remove containers (keeps data volumes)
docker compose -f docker-compose.prod.yml down

# Stop and remove EVERYTHING including data (⚠️ DANGEROUS)
docker compose -f docker-compose.prod.yml down -v
```

### Free Up Disk Space
```bash
# Check Docker disk usage
docker system df

# Remove unused images
docker image prune -a

# Remove unused containers
docker container prune

# Remove unused volumes (⚠️ may delete data)
docker volume prune

# Clean everything (⚠️ DESTRUCTIVE)
docker system prune -a --volumes
```

---

## 📊 Acceptance Criteria Verification

### ✅ Criterion 1: Docker Compose Starts Successfully
```bash
docker compose -f docker-compose.prod.yml up --build -d
```
**Pass if**: All 4 services (postgres, redis, api, web) start without errors.

### ✅ Criterion 2: Health Endpoint Returns 200
```bash
curl http://localhost:3001/health
```
**Pass if**: Returns `{"status":"ok","timestamp":"..."}` with HTTP 200.

### ✅ Criterion 3: Web UI Loads
```bash
curl -I http://localhost:3000
```
**Pass if**: Returns HTTP 200 and page renders in browser.

### ✅ Criterion 4: E2E Deposit → Order Works
1. Register user → ✓
2. Create deposit 500k → ✓
3. Confirm deposit (mock) → ✓
4. Check balance = 500k → ✓
5. Create order → ✓
6. Order status = SEEDING/COMPLETED → ✓

### ✅ Criterion 5: Data Persists After Restart
```bash
# Stop
docker compose -f docker-compose.prod.yml stop

# Start
docker compose -f docker-compose.prod.yml start

# Login and check wallet
# Balance should still be there
```
**Pass if**: User can login and wallet balance unchanged.

---

## 📝 Summary

### Files Created/Modified

| File | Purpose |
|------|---------|
| [`apps/api/Dockerfile`](../apps/api/Dockerfile) | Multi-stage build for NestJS API |
| [`apps/web/Dockerfile`](../apps/web/Dockerfile) | Multi-stage build for Next.js standalone |
| [`apps/web/next.config.js`](../apps/web/next.config.js) | Enable `output: 'standalone'` |
| [`docker-compose.prod.yml`](../docker-compose.prod.yml) | Production stack definition |
| [`.env.prod.example`](../.env.prod.example) | Production environment template |
| [`scripts/backup-db.sh`](../scripts/backup-db.sh) | Linux/Mac backup script |
| [`scripts/backup-db.bat`](../scripts/backup-db.bat) | Windows backup script |
| [`docs/PROD.md`](PROD.md) | Updated with Deploy section |

### Out of Scope
- ❌ VPS deployment (máy local only)
- ❌ Domain/SSL setup
- ❌ Real payment provider keys
- ❌ CI/CD pipeline
- ❌ Kubernetes/orchestration

### Next Steps
1. Test locally với acceptance criteria ở trên
2. Setup automated backups (Task Scheduler hoặc cron)
3. Monitor logs trong vài ngày đầu
4. Khi ready cho production VPS:
   - Mua domain và setup DNS
   - Cài đặt SSL/TLS certificates
   - Setup reverse proxy (Nginx/Traefik)
   - Update `API_BASE_URL` và `WEB_URL` trong `.env.prod`
   - Deploy theo guide trong [`docs/PROD.md`](PROD.md)

---

**Version**: 1.0.0  
**Last Updated**: 2026-09-22 (ROO-13)
