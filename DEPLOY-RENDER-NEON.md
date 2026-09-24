# Hướng dẫn Deploy SeikoMMO lên Render + Neon (Free Tier)

> **Mục tiêu**: Deploy production-ready NestJS API lên Render với PostgreSQL database miễn phí từ Neon, không dùng Docker.

## 📋 Checklist Deploy

- [ ] Tạo Neon database và lấy DATABASE_URL
- [ ] Push code lên GitHub (bao gồm render.yaml)
- [ ] Tạo Render Blueprint từ repo
- [ ] Điền các environment variables (secrets)
- [ ] Deploy và verify health check
- [ ] Test API endpoints (register, order)
- [ ] Setup UptimeRobot để giữ service awake
- [ ] Hiểu về cold-start và giới hạn free tier

---

## 🗄️ Bước 1: Tạo Database trên Neon

### 1.1. Đăng ký Neon

1. Truy cập https://neon.tech
2. Đăng nhập bằng GitHub/Google
3. Tạo project mới:
   - **Project name**: `seiko-mmo` (hoặc tên bạn muốn)
   - **Region**: Singapore hoặc gần nhất với Render region
   - **PostgreSQL version**: 16 (mặc định)

### 1.2. Lấy Connection String

1. Sau khi tạo xong, vào tab **Dashboard**
2. Tìm section **Connection Details**
3. Copy **Connection string** có dạng:
   ```
   postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```
4. **QUAN TRỌNG**: Giữ nguyên `?sslmode=require` ở cuối URL

### 1.3. Lưu ý về Free Tier Neon

- ✅ **Miễn phí**: 1 project, 10 branches, 3GB storage
- ⚠️ **Giới hạn**: Database tự động suspend sau 7 ngày không hoạt động
- 🔄 **Auto-wake**: Khi có request mới, DB tự động thức dậy (thêm ~1-2s latency lần đầu)

---

## 🚀 Bước 2: Push Code lên GitHub

### 2.1. Đảm bảo file render.yaml có trong repo

```bash
git status
# Phải thấy render.yaml ở root directory
```

### 2.2. Commit và push

```bash
git add .
git commit -m "feat: add Render deployment config"
git push origin main
```

### 2.3. Kiểm tra không commit secrets

**KHÔNG BAO GIỜ** commit những file này:
- `.env`
- `.env.prod`
- `apps/api/.env`

Đảm bảo `.gitignore` có:
```gitignore
.env
.env.*
!.env.example
```

---

## 🎨 Bước 3: Tạo Service trên Render

### 3.1. Tạo Blueprint

1. Truy cập https://dashboard.render.com
2. Đăng nhập bằng GitHub
3. Click **New** → **Blueprint**
4. Chọn repository `SeikoMMO` (hoặc tên repo của bạn)
5. Branch: `main`
6. Render sẽ tự động phát hiện file `render.yaml`

### 3.2. Điền Environment Variables

Render sẽ hiện form yêu cầu điền các biến có `sync: false`. Điền như sau:

#### **DATABASE_URL** (bắt buộc)
```
postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```
*(Connection string từ Neon - Bước 1.2)*

#### **JWT_SECRET** (bắt buộc)
```bash
# Tạo random string 64 ký tự:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy output và paste vào Render.

#### **JWT_REFRESH_SECRET** (bắt buộc)
```bash
# Tạo random string khác:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### **PROVIDER_KEY_SECRET** (bắt buộc)
```bash
# Tạo encryption key cho SMM provider:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### **SePay** (VND payment gateway - tùy chọn)
- `SEPAY_API_TOKEN`: Lấy từ https://my.sepay.vn/userapi/info
- `SEPAY_SECRET`: Lấy từ SePay dashboard

*Nếu không dùng SePay ngay, bỏ trống. API sẽ chỉ hỗ trợ crypto payment.*

#### **NOWPayments** (Crypto gateway - tùy chọn)
- `NOWPAYMENTS_API_KEY`: Lấy từ https://account.nowpayments.io/
- `NOWPAYMENTS_IPN_SECRET`: Tạo trong NOWPayments → Settings → IPN

*Nếu không dùng crypto payment ngay, bỏ trống.*

#### **WEB_URL** (frontend URL)
```
https://seiko-mmo-web.onrender.com
```
*Thay bằng URL frontend của bạn. Hỗ trợ nhiều domain:*
```
https://domain1.com,https://domain2.com,https://localhost:3000
```

### 3.3. Deploy

1. Click **Apply** để tạo service
2. Render sẽ bắt đầu build (mất ~5-10 phút lần đầu)
3. Theo dõi logs trong tab **Logs**

---

## ✅ Bước 4: Verify Deployment

### 4.1. Kiểm tra Health Endpoint

Sau khi deploy thành công (status: **Live**), test health check:

```bash
# Thay YOUR_APP_NAME bằng tên service Render của bạn
curl https://YOUR_APP_NAME.onrender.com/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-24T10:00:00.000Z",
  "database": "connected"
}
```

### 4.2. Test Registration API

```bash
curl -X POST https://YOUR_APP_NAME.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'
```

**Expected response:**
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User",
    "role": "BUYER"
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

### 4.3. Test Order Flow (End-to-End)

1. **Login** với user vừa tạo
2. **Nạp tiền** vào wallet (giả lập SePay webhook hoặc dùng manual deposit)
3. **Tạo order** cho một product
4. **Kiểm tra order status** qua `/orders`

---

## ⚡ Bước 5: Giữ Service Awake (Quan trọng!)

### 5.1. Vấn đề Cold Start

**Free tier Render** sẽ:
- ❄️ **Tự động sleep** service sau 15 phút không có request
- 🐌 **Cold start**: Mất 30-60 giây để thức dậy lần đầu
- ⚠️ **Timeout**: Nếu health check timeout, Render báo "failed"

### 5.2. Giải pháp: UptimeRobot

**UptimeRobot** ping health endpoint mỗi 5-10 phút để giữ service awake.

#### Setup UptimeRobot:

1. Truy cập https://uptimerobot.com (free plan: 50 monitors)
2. Đăng ký tài khoản
3. Click **Add New Monitor**
4. Điền:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: SeikoMMO API Health
   - **URL**: `https://YOUR_APP_NAME.onrender.com/health`
   - **Monitoring Interval**: 10 minutes (free tier tối thiểu 5 phút)
5. Click **Create Monitor**

#### Cảnh báo (optional):

- Thêm **Alert Contacts** (email/Telegram) để nhận thông báo khi API down
- Tích hợp Slack webhook nếu có team

### 5.3. Giới hạn Free Tier Render

- ⏱️ **750 giờ/tháng** runtime miễn phí
- 🔄 Service awake 24/7 = 720 giờ/tháng → **vừa đủ**
- 🚫 Nếu vượt, service bị suspend đến đầu tháng sau

---

## 🔒 Bước 6: Security Checklist

### 6.1. Verify Trust Proxy hoạt động

Render chạy sau reverse proxy. Check IP thật qua header:

```bash
curl -H "X-Forwarded-For: 1.2.3.4" https://YOUR_APP_NAME.onrender.com/health
```

Logs phải thấy IP `1.2.3.4`, không phải internal IP của Render.

### 6.2. Verify CORS

```bash
curl -H "Origin: https://your-frontend.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://YOUR_APP_NAME.onrender.com/auth/login
```

**Expected header:**
```
Access-Control-Allow-Origin: https://your-frontend.com
```

### 6.3. Verify Rate Limiting

```bash
# Gửi 15 requests liên tiếp (limit là 10/phút)
for i in {1..15}; do
  curl https://YOUR_APP_NAME.onrender.com/health
done
```

Request thứ 11-15 phải nhận **429 Too Many Requests**.

---

## 🛠️ Troubleshooting

### ❌ Build Failed: "Cannot find module '@repo/shared'"

**Nguyên nhân**: Workspace dependencies chưa build.

**Giải pháp**: Đảm bảo `buildCommand` trong `render.yaml` có:
```bash
npx tsc -p packages/shared/tsconfig.json
```

### ❌ "Prisma Client did not initialize yet"

**Nguyên nhân**: Thiếu `prisma generate` trong build.

**Giải pháp**: Đảm bảo `buildCommand` có:
```bash
npm run prisma:generate -w @repo/api
```

### ❌ Deploy thành công nhưng health check failed

**Nguyên nhân**: 
1. DATABASE_URL sai hoặc thiếu `?sslmode=require`
2. DB chưa có tables (migration chưa chạy)

**Giải pháp**:
```bash
# Check logs trong Render Dashboard
# Tìm dòng lỗi Prisma connection
```

Fix DATABASE_URL trong Environment Variables → **Manual Deploy**.

### ❌ "Error: P1001: Can't reach database server"

**Nguyên nhân**: Neon DB đã suspend.

**Giải pháp**: Truy cập Neon dashboard → **Resume** project. Database sẽ wake trong 1-2 giây.

### ❌ CORS error từ frontend

**Nguyên nhân**: WEB_URL không khớp với domain frontend.

**Giải pháp**: Update WEB_URL trong Render → Environment Variables:
```
https://frontend-domain.com
```
Sau đó **Manual Deploy**.

---

## 🎯 Migration Strategy

### Free Tier (hiện tại)

- Dùng `prisma db push` trong `buildCommand`
- ⚠️ **Không có migration history**
- ⚠️ Schema changes có thể **mất data** (--accept-data-loss)

### Production (trả phí)

Khi nâng lên paid tier, chuyển sang:

1. **Tạo migration files**:
   ```bash
   npx prisma migrate dev --name init
   ```

2. **Update buildCommand** trong render.yaml:
   ```bash
   # Thay thế
   npx prisma db push --accept-data-loss
   
   # Bằng
   npx prisma migrate deploy
   ```

3. **Backup database** trước mỗi migration:
   ```bash
   pg_dump $DATABASE_URL > backup.sql
   ```

---

## 📊 Monitoring & Maintenance

### Weekly Checklist

- [ ] Check UptimeRobot status (uptime > 99%)
- [ ] Review Render logs cho errors
- [ ] Check Neon dashboard cho database usage
- [ ] Verify scheduled jobs chạy đúng (affiliate commission, flash sales)

### Monthly Checklist

- [ ] Review Render usage (~720h/750h limit)
- [ ] Backup database (export từ Neon)
- [ ] Update dependencies nếu có security patches
- [ ] Review API response times (p95 < 500ms)

---

## 🚀 Scale-Up Path (Tương lai)

Khi traffic tăng, nâng cấp theo thứ tự:

1. **Render Starter Plan** ($7/tháng):
   - Không bị sleep
   - 512MB RAM → 1GB RAM
   - Faster cold starts

2. **Neon Pro Plan** ($19/tháng):
   - Không bị auto-suspend
   - Connection pooling
   - Point-in-time recovery

3. **Add Redis** (Upstash free tier):
   - Cache products, flash sales
   - Session store
   - Rate limiting với Redis

4. **CDN** (Cloudflare free tier):
   - Cache static assets
   - DDoS protection
   - Faster response times

---

## 📞 Support

- **Render Issues**: https://render.com/docs
- **Neon Issues**: https://neon.tech/docs
- **Project Issues**: Tạo GitHub issue trong repo SeikoMMO

---

## ✨ Tổng kết

Sau khi hoàn thành guide này, bạn có:

✅ API production-ready chạy trên Render free tier  
✅ PostgreSQL database trên Neon với SSL  
✅ Auto-deploy khi push code lên GitHub  
✅ Health monitoring với UptimeRobot  
✅ CORS, rate limiting, trust proxy đúng config  
✅ Migration tự động chạy mỗi lần deploy  

**Total cost: $0/tháng** 🎉

---

**Last updated**: 2026-09-24  
**Tested on**: Render Free Tier + Neon Free Tier  
**Repository**: https://github.com/yourusername/SeikoMMO
