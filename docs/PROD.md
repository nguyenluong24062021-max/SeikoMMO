# Production Deployment Checklist

Checklist triển khai production cho SeikoMMO API. Đọc kỹ và thực hiện đầy đủ trước khi deploy.

---

## 🔐 1. Security Configuration

### 1.1 Environment Variables

**CRITICAL**: Các biến môi trường sau PHẢI được set đúng trong production:

#### JWT Security
```bash
# JWT Secret: PHẢI là chuỗi random >= 32 ký tự
JWT_SECRET="<generate-32-chars-or-longer-random-string>"

# JWT Access Token: 15 phút (security best practice)
JWT_EXPIRATION="15m"

# JWT Refresh Token: 7 ngày (hoặc tùy business requirement)
JWT_REFRESH_EXPIRATION="7d"
```

**Generate JWT_SECRET:**
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32|%{Get-Random -Minimum 0 -Maximum 256}))

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### SePay Configuration
```bash
# SePay Merchant ID (thật, không phải test)
SEPAY_MERCHANT="<your-production-merchant-id>"

# SePay Secret Key (thật, không phải test)
SEPAY_SECRET="<your-production-secret-key>"

# Webhook signature verification: PHẢI BẬT trong production
SEPAY_ALLOW_UNSIGNED="false"

# SePay API base URL (thường không cần thay đổi)
SEPAY_BASE_URL="https://api.sepay.vn"
```

#### Database
```bash
# PostgreSQL connection với SSL trong production
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Timezone PHẢI là UTC sau khi migrate
# Verify: SELECT CURRENT_SETTING('timezone'); -- should return 'UTC'
```

#### CORS
```bash
# Chỉ cho phép domain production, KHÔNG dùng "*"
CORS_ORIGIN="https://yourdomain.com,https://www.yourdomain.com"
```

### 1.2 Security Headers

File [`apps/api/src/main.ts`](apps/api/src/main.ts:5) đã có Helmet, verify config:

```typescript
app.use(helmet({
  contentSecurityPolicy: false, // Nếu cần API-only
  crossOriginEmbedderPolicy: false,
}));
```

### 1.3 Rate Limiting

Rate limit đã được config trong [`apps/api/src/app.module.ts`](apps/api/src/app.module.ts:25):
- Auth endpoints: 10 requests/phút/IP
- Global fallback: có thể thêm nếu cần

**Khuyến nghị**: Add rate limit cho sensitive endpoints khác (wallet, order).

---

## 💾 2. Database Management

### 2.1 Backup Strategy

**REQUIRED**: Setup automated daily backups TRƯỚC KHI deploy production.

#### Backup Script (Linux/Mac)
Tạo file `scripts/backup_postgres.sh`:

```bash
#!/bin/bash

# Configuration
DB_NAME="seiko_mmo_prod"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

# Keep last 30 days
RETENTION_DAYS=30

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "Starting backup: $BACKUP_FILE"
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Backup completed successfully"
  
  # Delete old backups
  find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete
  echo "Old backups cleaned up (retention: $RETENTION_DAYS days)"
else
  echo "Backup FAILED!"
  exit 1
fi
```

#### Backup Script (Windows)
Tạo file `scripts/backup_postgres.ps1`:

```powershell
# Configuration
$DB_NAME = "seiko_mmo_prod"
$DB_USER = "postgres"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$BACKUP_DIR = "C:\Backups\postgres"
$DATE = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR\${DB_NAME}_${DATE}.sql"

# Keep last 30 days
$RETENTION_DAYS = 30

# Create backup directory
New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null

# Perform backup
Write-Host "Starting backup: $BACKUP_FILE"

$env:PGPASSWORD = $env:DB_PASSWORD
& pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME `
  --format=plain --no-owner --no-acl `
  -f $BACKUP_FILE

if ($LASTEXITCODE -eq 0) {
  Write-Host "Backup completed successfully"
  
  # Compress backup
  Compress-Archive -Path $BACKUP_FILE -DestinationPath "$BACKUP_FILE.zip"
  Remove-Item $BACKUP_FILE
  
  # Delete old backups
  Get-ChildItem -Path $BACKUP_DIR -Filter "${DB_NAME}_*.zip" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RETENTION_DAYS) } | 
    Remove-Item
    
  Write-Host "Old backups cleaned up (retention: $RETENTION_DAYS days)"
} else {
  Write-Host "Backup FAILED!"
  exit 1
}
```

#### Schedule Backup

**Linux (crontab)**
```bash
# Run backup daily at 2 AM
0 2 * * * /path/to/scripts/backup_postgres.sh >> /var/log/postgres_backup.log 2>&1
```

**Windows (Task Scheduler)**
```powershell
# Create scheduled task (run as Administrator)
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
  -Argument "-ExecutionPolicy Bypass -File C:\path\to\scripts\backup_postgres.ps1"

$Trigger = New-ScheduledTaskTrigger -Daily -At 2am

Register-ScheduledTask -TaskName "PostgreSQL Backup" `
  -Action $Action -Trigger $Trigger `
  -Description "Daily backup of SeikoMMO database"
```

### 2.2 Database Timezone Migration

**CRITICAL**: Phải thực hiện migration timezone TRƯỚC khi deploy production code mới.

#### Step 1: Backup database
```bash
pg_dump -h localhost -U postgres -d seiko_mmo_prod -F c -f backup_before_timezone_migration.backup
```

#### Step 2: Run timezone migration
```bash
cd apps/api
psql -h localhost -U postgres -d seiko_mmo_prod -f prisma/migrations/010_timezone_to_timestamptz.sql
```

#### Step 3: Set timezone to UTC
```bash
psql -h localhost -U postgres -d seiko_mmo_prod -f prisma/migrations/set_timezone_utc.sql
```

#### Step 4: Verify migration
```sql
-- Verify all columns are timestamptz
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND data_type LIKE '%timestamp%'
ORDER BY table_name, column_name;

-- Check timezone setting
SELECT CURRENT_SETTING('timezone'); -- Should return 'UTC'

-- Verify recent timestamps are correct
SELECT id, "createdAt", NOW() - "createdAt" as age
FROM users
ORDER BY "createdAt" DESC
LIMIT 5;
-- Age should be reasonable (not 7 hours off)
```

### 2.3 Connection Pooling

Prisma connection pool settings trong production:

```env
# Add to DATABASE_URL
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=60"
```

Hoặc config trong schema:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Production settings
  relationMode = "prisma"
}
```

---

## 🚀 3. Deployment Process

### 3.1 Pre-deployment Checklist

- [ ] All tests pass: `npm test`
- [ ] Build successful: `npm run build`
- [ ] Environment variables configured
- [ ] Database backup completed
- [ ] Timezone migration completed
- [ ] SSL certificates valid
- [ ] Domain DNS configured
- [ ] Monitoring setup ready

### 3.2 Deployment Steps

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install --production

# 3. Build packages
cd packages/shared
npm run build
cd ../..

# 4. Run migrations (if any new ones)
cd apps/api
npx prisma migrate deploy

# 5. Generate Prisma client
npx prisma generate

# 6. Build API
npm run build

# 7. Start production server
npm run start:prod
```

### 3.3 Health Check

Verify API is running:
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"2026-09-22T12:27:10.393Z"}
```

---

## 📊 4. Monitoring & Logging

### 4.1 Application Logging

NestJS Logger levels cho production (trong `main.ts`):

```typescript
const app = await NestFactory.create(AppModule, {
  logger: ['error', 'warn', 'log'], // Remove 'debug' in production
});
```

### 4.2 Critical Alerts

Setup monitoring cho:

1. **API Health**
   - Endpoint: `GET /health`
   - Alert if: Status != 200 for > 2 minutes

2. **Database Connections**
   - Monitor: Connection pool usage
   - Alert if: > 80% pool utilization

3. **Cron Jobs**
   - Monitor: Flash sale cron execution (every 5 minutes)
   - Alert if: No execution logged for > 10 minutes
   - Log location: [`apps/api/src/tasks/tasks.service.ts`](apps/api/src/tasks/tasks.service.ts:5)

4. **Payment Processing**
   - Monitor: SePay webhook failures
   - Alert if: > 5 failed webhooks in 1 hour
   - Check: [`apps/api/src/wallets/wallets.service.ts`](apps/api/src/wallets/wallets.service.ts:20)

5. **Wallet Operations**
   - Monitor: Failed deposit/payout transactions
   - Alert if: Any transaction stuck in PENDING for > 1 hour

### 4.3 Log Aggregation

**Recommended**: Ship logs to centralized logging (ELK, Datadog, CloudWatch, etc.)

Example PM2 config với log rotation:
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'seiko-api',
    script: 'dist/main.js',
    instances: 2,
    exec_mode: 'cluster',
    error_file: './logs/api-error.log',
    out_file: './logs/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
  }]
};
```

---

## 🔄 5. Cron Job Verification

### 5.1 Flash Sale Cron

Location: [`apps/api/src/tasks/tasks.service.ts`](apps/api/src/tasks/tasks.service.ts:5)

**Schedule**: Every 5 minutes via `@Cron(CronExpression.EVERY_5_MINUTES)`

**Verification Test**:
```bash
# 1. Create flash sale that expires soon
curl -X POST http://localhost:3000/flash-sales \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "...",
    "salePrice": 50000,
    "stockCap": 10,
    "startAt": "2026-09-22T12:20:00Z",
    "endAt": "2026-09-22T12:25:00Z"
  }'

# 2. Wait 5-10 minutes after endAt

# 3. Check logs for deactivation message
grep "Deactivated flash sale" logs/api-out.log

# 4. Verify sale is inactive
curl http://localhost:3000/flash-sales/$SALE_ID
# Should show: "isActive": false
```

### 5.2 Monitor Cron Execution

Add health check for cron:
```typescript
// In tasks.service.ts
private lastCronRun: Date;

@Cron(CronExpression.EVERY_5_MINUTES)
async deactivateExpiredFlashSales() {
  this.lastCronRun = new Date();
  // ... existing logic
}

getLastCronRun(): Date {
  return this.lastCronRun;
}
```

---

## 💰 6. Payment System Verification

### 6.1 SePay Integration

**Before going live**:

1. **Test webhook signature verification**
```typescript
// In wallets.service.ts, verify SEPAY_ALLOW_UNSIGNED is false
private verifySePaySignature(transactionId: string, amount: number, signature: string): boolean {
  // This method MUST validate signature in production
  const allowUnsigned = process.env.SEPAY_ALLOW_UNSIGNED === 'true';
  if (allowUnsigned) {
    throw new Error('SEPAY_ALLOW_UNSIGNED must be false in production');
  }
  // ... signature verification logic
}
```

2. **Test deposit flow end-to-end**
   - User initiates deposit
   - SePay processes payment
   - Webhook hits `/wallet/confirm-deposit`
   - Wallet balance updates
   - 24h hold period set correctly

3. **Test payout flow end-to-end**
   - Seller earns from sale
   - Seller requests payout after 24h hold
   - Admin approves payout
   - Wallet balance deducted

### 6.2 Transaction Integrity

**Critical checks**:
```sql
-- No negative wallet balances
SELECT * FROM wallets WHERE balance < 0;
-- Expected: 0 rows

-- No orphaned transactions
SELECT t.* FROM transactions t
LEFT JOIN wallets w ON t."walletId" = w.id
WHERE w.id IS NULL;
-- Expected: 0 rows

-- Verify 24h hold is working
SELECT * FROM transactions
WHERE "canWithdrawAt" > NOW() + INTERVAL '25 hours'
  OR "canWithdrawAt" < NOW() + INTERVAL '23 hours';
-- Expected: 0 rows (all should be ~24h from creation)
```

---

## 🧪 7. Testing Post-Deployment

### 7.1 Critical User Flows

Test these flows manually in production (or staging):

1. **User Registration & Login**
   ```bash
   # Register
   curl -X POST http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"Test123!","name":"Test User"}'
   
   # Login
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"Test123!"}'
   ```

2. **Rate Limiting Test**
   ```bash
   # Should block 11th request
   for i in {1..12}; do
     curl -X POST http://localhost:3000/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@test.com","password":"wrong"}' \
       -w "\nRequest $i: HTTP %{http_code}\n"
   done
   # Expected: First 10 succeed (401), 11th returns 429
   ```

3. **Deposit → Order → Commission Flow**
   - Deposit money to wallet
   - Create order
   - Verify seller receives 90% payment
   - Verify platform receives 10% commission
   - Verify 24h hold on seller's funds

4. **Referral Commission Test**
   - User A registers (gets referral code)
   - User B registers with A's code
   - User B places first order
   - Verify User A receives 5% commission
   - Verify User A does NOT receive commission on B's 2nd order

5. **Flash Sale Expiry Test**
   - Create flash sale with near-future endAt
   - Wait for cron (max 5 minutes)
   - Verify sale is deactivated

### 7.2 Timezone Verification

**CRITICAL**: Verify timestamps are correct after timezone migration.

```sql
-- Check recent user registrations
SELECT 
  id,
  email,
  "createdAt",
  "createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh' as vietnam_time,
  NOW() - "createdAt" as age
FROM users
WHERE "createdAt" > NOW() - INTERVAL '1 day'
ORDER BY "createdAt" DESC;

-- Expected: createdAt should be close to current UTC time (±1 minute)
-- Expected: age should be reasonable (not 7 hours off)
```

Test from application:
```bash
# Create new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"timezone.test@test.com","password":"Test123!","name":"TZ Test"}'

# Get user profile
curl http://localhost:3000/users/profile \
  -H "Authorization: Bearer $TOKEN"

# Verify createdAt timestamp is correct UTC time
# Should be: 2026-09-22T12:27:10.393Z (roughly current time)
```

### 7.3 24-Hour Hold Verification

```bash
# 1. Make a deposit
# 2. Check transaction canWithdrawAt
curl http://localhost:3000/wallet \
  -H "Authorization: Bearer $TOKEN"

# 3. Verify canWithdrawAt is ~24 hours from now
# Should be: NOW() + 24 hours (in UTC)

# 4. Try to withdraw before hold expires
# Should fail with error

# 5. Wait 24 hours (or manually update canWithdrawAt in DB for testing)
# Should succeed
```

---

## 🔧 8. Performance Optimization

### 8.1 Database Indexes

Verify critical indexes exist:
```sql
-- Check all indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Required indexes** (should be auto-created by Prisma):
- `users.email` (unique)
- `users.referralCode` (unique)
- `product_stocks.key` (unique)
- `orders.buyerId`
- `transactions.walletId`
- `transactions.sePayTransId` (unique)
- `flash_sales.productId`
- `flash_sales.endAt` (for cron query)

**Consider adding** for better performance:
```sql
-- For flash sale cron query (if slow)
CREATE INDEX idx_flash_sales_active_expired 
ON flash_sales ("isActive", "endAt") 
WHERE "isActive" = true;

-- For order history queries
CREATE INDEX idx_orders_buyer_created 
ON orders ("buyerId", "createdAt" DESC);

-- For transaction history queries
CREATE INDEX idx_transactions_wallet_created 
ON transactions ("walletId", "createdAt" DESC);
```

### 8.2 Query Optimization

Monitor slow queries:
```sql
-- Enable slow query logging (postgresql.conf)
log_min_duration_statement = 1000  # Log queries > 1 second

-- Check slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;
```

---

## 🛡️ 9. Security Hardening

### 9.1 Environment Variables

**Never commit** `.env` files. Use `.env.example` as template.

```bash
# Good: .env.example (template only)
JWT_SECRET="<generate-random-secret>"
SEPAY_MERCHANT="<your-merchant-id>"

# Bad: .env (real credentials)
JWT_SECRET="actual_secret_key_here"
SEPAY_MERCHANT="123456"
```

### 9.2 Database Access

- [ ] Use dedicated database user (not postgres superuser)
- [ ] Limit database user permissions (no DROP, CREATE DATABASE)
- [ ] Enable SSL for database connections
- [ ] Firewall: Only allow API server to connect to database

### 9.3 API Security

- [ ] HTTPS only in production (no HTTP)
- [ ] CORS whitelist specific domains only
- [ ] Helmet headers enabled
- [ ] Rate limiting on all endpoints
- [ ] Input validation on all DTOs
- [ ] JWT tokens stored securely (httpOnly cookies or secure storage)

---

## 📋 10. Deployment Checklist Summary

### Pre-Deployment
- [ ] JWT_SECRET generated (32+ chars)
- [ ] JWT_EXPIRATION set to 15m
- [ ] JWT_REFRESH_EXPIRATION set to 7d
- [ ] SEPAY_MERCHANT set (production value)
- [ ] SEPAY_SECRET set (production value)
- [ ] SEPAY_ALLOW_UNSIGNED set to false
- [ ] DATABASE_URL configured with SSL
- [ ] CORS_ORIGIN set to specific domains
- [ ] Database backup script created
- [ ] Daily backup scheduled (cron/Task Scheduler)
- [ ] Timezone migration completed
- [ ] PostgreSQL timezone set to UTC
- [ ] All tests passing
- [ ] Build successful

### Post-Deployment
- [ ] Health check returns 200
- [ ] User registration works
- [ ] User login works
- [ ] Rate limiting works (429 on 11th request)
- [ ] Deposit flow works end-to-end
- [ ] Order creation works
- [ ] Commission distribution works
- [ ] Referral commission works
- [ ] Flash sale cron executes
- [ ] Timestamps are correct (UTC)
- [ ] 24h hold period works
- [ ] Monitoring alerts configured
- [ ] Log aggregation working

### Ongoing Maintenance
- [ ] Check backups daily
- [ ] Monitor API health
- [ ] Monitor database performance
- [ ] Review error logs weekly
- [ ] Check for failed transactions
- [ ] Verify cron job execution
- [ ] Update dependencies monthly
- [ ] Security patches applied promptly

---

## 🆘 11. Troubleshooting

### Issue: JWT Token Invalid
**Symptom**: Users getting 401 Unauthorized
**Check**:
1. JWT_SECRET matches between instances
2. JWT_EXPIRATION not too short
3. System clocks synchronized (use NTP)

### Issue: Timestamps 7 Hours Off
**Symptom**: CreatedAt times incorrect
**Check**:
1. `SELECT CURRENT_SETTING('timezone');` returns 'UTC'
2. Migration 010 ran successfully
3. Prisma client regenerated after schema change

### Issue: Cron Not Running
**Symptom**: Flash sales not deactivating
**Check**:
1. `@nestjs/schedule` installed
2. `ScheduleModule.forRoot()` in AppModule
3. TasksModule registered
4. Check logs for cron execution

### Issue: SePay Webhook Failing
**Symptom**: Deposits not confirming
**Check**:
1. SEPAY_SECRET correct
2. SEPAY_ALLOW_UNSIGNED = false
3. Webhook URL accessible from internet
4. Signature verification logic correct

### Issue: Rate Limiting Too Aggressive
**Symptom**: Legitimate users getting 429
**Solution**: Adjust ttl/limit in ThrottlerModule config

---

## 📞 12. Support Contacts

- **API Issues**: Check logs first, then check this guide
- **Database Issues**: Run verification queries in section 2.2.4
- **Payment Issues**: Contact SePay support with transaction ID
- **Security Issues**: Review section 9, rotate secrets if compromised

---

## 📦 13. Docker Production Deployment

### 13.1 Prerequisites

**Local Machine Requirements**:
- Docker Desktop installed (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- 4GB+ available RAM
- 10GB+ available disk space

**Verify Installation**:
```bash
docker --version          # Should be 20.10+
docker compose version    # Should be v2.0+
```

### 13.2 Project Structure

```
SeikoMMO/
├── apps/
│   ├── api/
│   │   └── Dockerfile              # NestJS API multi-stage build
│   └── web/
│       └── Dockerfile              # Next.js standalone build
├── docker-compose.prod.yml         # Production stack definition
├── .env.prod.example               # Production env template
├── .env.prod                       # Actual secrets (DO NOT commit!)
└── scripts/
    ├── backup-db.sh                # Linux/Mac backup script
    └── backup-db.bat               # Windows backup script
```

### 13.3 First-Time Setup

#### Step 1: Prepare Environment File

```bash
# Copy template
cp .env.prod.example .env.prod

# Edit with real values (see .env.prod.example for guidance)
# CRITICAL: Generate secure secrets for:
#   - JWT_ACCESS_SECRET (32+ chars)
#   - JWT_REFRESH_SECRET (32+ chars)
#   - PROVIDER_KEY_SECRET (exactly 32 chars)
#   - POSTGRES_PASSWORD (strong password)
```

**Generate Secure Secrets**:
```powershell
# PowerShell (Windows)
[Convert]::ToBase64String((1..32|%{Get-Random -Minimum 0 -Maximum 256}))
```

```bash
# Linux/Mac
openssl rand -base64 32
```

#### Step 2: Verify Configuration

Before building, verify these critical settings in `.env.prod`:

- [ ] `SEPAY_ALLOW_UNSIGNED=false` (CRITICAL SECURITY)
- [ ] All JWT secrets are 32+ random characters
- [ ] `PROVIDER_KEY_SECRET` is exactly 32 characters
- [ ] `NODE_ENV=production`
- [ ] Database password is strong
- [ ] API_BASE_URL matches your domain (or localhost for testing)

#### Step 3: Build Images

```bash
# Build all services (this will take 5-10 minutes first time)
docker compose -f docker-compose.prod.yml build

# Or build individually
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml build web
```

**Expected Output**:
```
[+] Building 245.3s (47/47) FINISHED
 => [api internal] load build definition...
 => [web internal] load build definition...
 ✓ Successfully built seiko-api-prod
 ✓ Successfully built seiko-web-prod
```

#### Step 4: Start Infrastructure Only

```bash
# Start postgres and redis first
docker compose -f docker-compose.prod.yml up -d postgres redis

# Wait for health checks (30-60 seconds)
docker compose -f docker-compose.prod.yml ps

# Expected: postgres and redis should show "healthy"
```

#### Step 5: Run Database Migrations

**CRITICAL**: Migrations must run in numerical order BEFORE starting API.

```bash
# Connect to postgres container
docker exec -it seiko-postgres-prod psql -U postgres -d seiko_mmo

# Or from host machine (if pg client installed)
psql -h localhost -U postgres -d seiko_mmo
```

**Run migrations in order**:
```sql
-- Set timezone first (MANDATORY)
\i apps/api/prisma/migrations/set_timezone_utc.sql

-- Then run numbered migrations
\i apps/api/prisma/migrations/008_add_flash_sales.sql
\i apps/api/prisma/migrations/009_add_referral_system.sql
\i apps/api/prisma/migrations/010_timezone_to_timestamptz.sql
\i apps/api/prisma/migrations/011_add_smm_providers.sql
\i apps/api/prisma/migrations/012_add_crypto_payment_provider.sql

-- Verify timezone
SELECT CURRENT_SETTING('timezone');  -- Should return 'UTC'

-- Exit
\q
```

**Alternative (from host with migrations folder)**:
```bash
# Windows PowerShell
Get-Content apps\api\prisma\migrations\*.sql | docker exec -i seiko-postgres-prod psql -U postgres -d seiko_mmo

# Linux/Mac
cat apps/api/prisma/migrations/*.sql | docker exec -i seiko-postgres-prod psql -U postgres -d seiko_mmo
```

#### Step 6: Start Application Services

```bash
# Start API and Web
docker compose -f docker-compose.prod.yml up -d api web

# Check status (wait for health checks)
docker compose -f docker-compose.prod.yml ps

# Expected output:
# NAME                   STATUS        PORTS
# seiko-postgres-prod    Up (healthy)  0.0.0.0:5432->5432/tcp
# seiko-redis-prod       Up (healthy)  0.0.0.0:6379->6379/tcp
# seiko-api-prod         Up (healthy)  0.0.0.0:3001->3001/tcp
# seiko-web-prod         Up (healthy)  0.0.0.0:3000->3000/tcp
```

#### Step 7: Verify Deployment

```bash
# Health checks
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"2026-09-22T..."}

curl http://localhost:3000
# Expected: HTML response (200 OK)

# Check logs
docker compose -f docker-compose.prod.yml logs api --tail 50
docker compose -f docker-compose.prod.yml logs web --tail 50

# Should see:
# api: "🚀 API server is running on http://localhost:3001"
# web: "Ready on http://localhost:3000"
```

### 13.4 End-to-End Verification

**Test Critical User Flows**:

1. **User Registration**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"docker@test.com","password":"Test123!","name":"Docker Test"}'

# Should return tokens + user object
```

2. **User Login**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"docker@test.com","password":"Test123!"}'

# Save the access token for next tests
```

3. **Mock Deposit Flow**
```bash
# Create deposit (use token from login)
curl -X POST http://localhost:3001/wallet/deposit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":500000}'

# Should return QR code and transaction ID
```

4. **Create Order** (test full flow)
```bash
# First, create a shop and product (admin flow)
# Then place order
curl -X POST http://localhost:3001/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":"...","quantity":10}'

# Should succeed if wallet has balance
```

5. **Access Web UI**
- Open browser: http://localhost:3000
- Should load homepage
- Try login with docker@test.com / Test123!
- Should see dashboard

### 13.5 Stop/Start Operations

```bash
# Stop all services (keeps data)
docker compose -f docker-compose.prod.yml stop

# Start all services
docker compose -f docker-compose.prod.yml start

# Restart specific service
docker compose -f docker-compose.prod.yml restart api

# View logs (follow mode)
docker compose -f docker-compose.prod.yml logs -f api

# Stop and remove containers (keeps volumes/data)
docker compose -f docker-compose.prod.yml down

# Stop and remove EVERYTHING including data (DANGEROUS)
docker compose -f docker-compose.prod.yml down -v  # ⚠️ DELETES ALL DATA
```

### 13.6 Database Backup & Restore

#### Setup Automated Backups

**Windows (Task Scheduler)**:
```powershell
# Run as Administrator
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
  -Argument "-ExecutionPolicy Bypass -File C:\path\to\SeikoMMO\scripts\backup-db.bat"

$Trigger = New-ScheduledTaskTrigger -Daily -At 2am

Register-ScheduledTask -TaskName "SeikoMMO DB Backup" `
  -Action $Action -Trigger $Trigger `
  -Description "Daily backup of SeikoMMO production database"
```

**Linux/Mac (cron)**:
```bash
# Edit crontab
crontab -e

# Add line (daily at 2 AM)
0 2 * * * /path/to/SeikoMMO/scripts/backup-db.sh >> /var/log/seiko-backup.log 2>&1
```

#### Manual Backup

```bash
# Using backup script
./scripts/backup-db.sh         # Linux/Mac
scripts\backup-db.bat          # Windows

# Or directly with docker
docker exec seiko-postgres-prod pg_dump -U postgres -d seiko_mmo \
  --format=custom --no-owner --no-acl \
  --file=/var/lib/postgresql/data/backup_$(date +%Y%m%d_%H%M%S).backup
```

#### Restore from Backup

```bash
# Stop API first
docker compose -f docker-compose.prod.yml stop api

# Restore (custom format)
docker exec -i seiko-postgres-prod pg_restore -U postgres -d seiko_mmo \
  --clean --if-exists --no-owner --no-acl \
  /path/to/backup.backup

# Or restore from host
pg_restore -h localhost -U postgres -d seiko_mmo \
  --clean --if-exists --no-owner --no-acl \
  backup.backup

# Start API
docker compose -f docker-compose.prod.yml start api
```

### 13.7 Rollback Procedure

If deployment fails or breaks production:

```bash
# 1. Stop all services
docker compose -f docker-compose.prod.yml down

# 2. Restore database from last good backup
docker exec -i seiko-postgres-prod pg_restore -U postgres -d seiko_mmo \
  --clean --if-exists --no-owner --no-acl \
  /var/lib/postgresql/data/backup_YYYYMMDD_HHMMSS.backup

# 3. Rebuild previous working version
git checkout <last-good-commit>
docker compose -f docker-compose.prod.yml build

# 4. Start services
docker compose -f docker-compose.prod.yml up -d

# 5. Verify
curl http://localhost:3001/health
curl http://localhost:3000
```

### 13.8 Monitoring & Logs

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs

# Follow logs (live tail)
docker compose -f docker-compose.prod.yml logs -f

# Logs for specific service
docker compose -f docker-compose.prod.yml logs api -f

# Last 100 lines
docker compose -f docker-compose.prod.yml logs api --tail 100

# Search logs for errors
docker compose -f docker-compose.prod.yml logs api | grep -i error

# Check container stats
docker stats seiko-api-prod seiko-web-prod

# Inspect container health
docker inspect seiko-api-prod | grep -A 10 Health
```

### 13.9 Troubleshooting

#### Container Won't Start

```bash
# Check logs for errors
docker compose -f docker-compose.prod.yml logs api

# Common issues:
# - Missing env vars: Check .env.prod
# - Database not ready: Wait for postgres health check
# - Port conflicts: Check if 3000/3001/5432/6379 are free
```

#### Database Connection Failed

```bash
# Verify postgres is running and healthy
docker compose -f docker-compose.prod.yml ps postgres

# Test connection from host
psql -h localhost -U postgres -d seiko_mmo -c "SELECT version();"

# Test connection from API container
docker exec seiko-api-prod node -e "console.log(process.env.DATABASE_URL)"
```

#### "Cannot find module" Errors

```bash
# Rebuild with --no-cache
docker compose -f docker-compose.prod.yml build --no-cache api

# Check if node_modules exist in image
docker run --rm seiko-api-prod ls -la /app/node_modules
```

#### Prisma Client Not Generated

```bash
# Rebuild API with fresh Prisma generation
docker compose -f docker-compose.prod.yml build --no-cache api

# Or manually in running container
docker exec seiko-api-prod npx prisma generate
docker compose -f docker-compose.prod.yml restart api
```

#### Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up unused images/containers
docker system prune -a

# Clean build cache
docker builder prune -a
```

### 13.10 Production Deployment Checklist

Before deploying to actual production server:

#### Pre-Deploy
- [ ] `.env.prod` configured with production values
- [ ] All secrets are 32+ random characters
- [ ] `SEPAY_ALLOW_UNSIGNED=false`
- [ ] `NODE_ENV=production`
- [ ] API_BASE_URL is publicly accessible
- [ ] Domain DNS configured
- [ ] SSL/TLS certificates ready (if using reverse proxy)
- [ ] Backup script tested and scheduled
- [ ] Firewall rules configured (allow 80/443, block 5432/6379)

#### Deploy
- [ ] `docker compose -f docker-compose.prod.yml build`
- [ ] `docker compose -f docker-compose.prod.yml up -d postgres redis`
- [ ] Wait for health checks (postgres/redis healthy)
- [ ] Run migrations in order (008 → 009 → 010 → 011 → 012)
- [ ] Verify timezone is UTC
- [ ] `docker compose -f docker-compose.prod.yml up -d api web`
- [ ] Wait for health checks (api/web healthy)

#### Verify
- [ ] `curl http://localhost:3001/health` returns 200
- [ ] `curl http://localhost:3000` returns 200
- [ ] User registration works
- [ ] User login works
- [ ] Deposit flow works (mock or real)
- [ ] Order creation works
- [ ] Cron jobs are running (check logs after 5 minutes)
- [ ] Webhooks are accessible (if using real payment providers)

#### Monitor
- [ ] Set up health check monitoring (Uptime Robot, Pingdom, etc.)
- [ ] Configure log aggregation (optional but recommended)
- [ ] Verify backup script runs successfully
- [ ] Check disk space weekly
- [ ] Review error logs daily

### 13.11 Performance Tuning

```yaml
# docker-compose.prod.yml optimizations (add to services)

api:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 1G
      reservations:
        cpus: '0.5'
        memory: 512M
  restart: unless-stopped

postgres:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
  command:
    - postgres
    - -c
    - max_connections=200
    - -c
    - shared_buffers=512MB
    - -c
    - effective_cache_size=1GB
```

### 13.12 Security Hardening

**Reverse Proxy (Recommended for Production)**:
- Use Nginx or Traefik in front of API/Web
- Terminate SSL at reverse proxy
- Rate limit at proxy level
- Hide internal ports (don't expose 3000/3001 publicly)

**Example Nginx config**:
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
}
```

---

**Last Updated**: 2026-09-22 (ROO-13)
**Version**: 2.0.0
