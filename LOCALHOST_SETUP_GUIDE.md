# 🚀 Hướng Dẫn Chạy Localhost - SeikoMMO Marketplace

## ⚠️ Lưu Ý Quan Trọng

Do project nằm trong OneDrive, có thể gặp lỗi quyền truy cập. Nếu gặp lỗi `EPERM: operation not permitted`, hãy:
1. Tắt OneDrive sync tạm thời, HOẶC
2. Copy project ra ngoài OneDrive (Desktop, C:/Projects, etc.)

---

## 📋 Prerequisites

Kiểm tra đã cài đặt:
```cmd
node --version        # Cần >= 18.x
pnpm --version        # Cần >= 8.x
docker --version      # Optional, để chạy PostgreSQL
psql --version        # PostgreSQL client
```

Nếu chưa có pnpm:
```cmd
npm install -g pnpm
```

---

## 🗄️ Bước 1: Setup Database

### Option A: Dùng Docker (Khuyến nghị)
```cmd
docker-compose up -d
```

### Option B: PostgreSQL đã cài sẵn
1. Tạo database:
```sql
CREATE DATABASE seiko_mmo;
```

2. Update connection string trong `.env` (bước 2)

---

## ⚙️ Bước 2: Configure Environment

1. **Copy file .env:**
```cmd
cd apps\api
copy .env.example .env
```

2. **Edit `apps/api/.env`** với text editor:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seiko_mmo?schema=public"
JWT_ACCESS_SECRET="dev-secret-key-12345"
JWT_REFRESH_SECRET="dev-refresh-key-67890"
PORT=3001
NODE_ENV="development"
```

**Lưu ý:** Thay `postgres:postgres` bằng username:password thật của bạn nếu khác

---

## 📦 Bước 3: Install Dependencies

**Mở terminal tại root folder:**
```cmd
pnpm install
```

**Nếu gặp lỗi OneDrive EPERM:**
1. Pause OneDrive sync (right-click icon → Pause syncing)
2. Retry: `pnpm install`
3. Hoặc copy project ra Desktop và chạy

**Nếu vẫn lỗi, install từng package:**
```cmd
cd packages\shared
pnpm install

cd ..\..\apps\api
pnpm install

cd ..\web
pnpm install
```

---

## 🗃️ Bước 4: Database Migration

**Từ root folder:**
```cmd
cd apps\api
npx prisma generate
npx prisma migrate dev --name init
```

**Nếu lỗi Prisma v8 (migration → migration):**
```cmd
npx prisma db push
```

**Verify database:**
```cmd
npx prisma studio
```
→ Opens browser at http://localhost:5555 để xem database

---

## 🚀 Bước 5: Start API Server

**Từ `apps/api`:**
```cmd
pnpm dev
```

**Hoặc từ root với turbo:**
```cmd
pnpm turbo run dev --filter=@repo/api
```

**Expected output:**
```
[Nest] INFO [NestFactory] Starting Nest application...
[Nest] INFO [InstanceLoader] AppModule dependencies initialized
[Nest] INFO [RoutesResolver] UsersController {/users}
[Nest] INFO [RoutesResolver] AuthController {/auth}
[Nest] INFO [RoutesResolver] ShopsController {/shops}
[Nest] INFO [RoutesResolver] ProductsController {/products}
[Nest] INFO [RoutesResolver] OrdersController {/orders}
[Nest] INFO [RoutesResolver] WalletsController {/wallet}
[Nest] INFO [RoutesResolver] PayoutsController {/payouts}
[Nest] INFO [RoutesResolver] ReviewsController {/reviews}
[Nest] INFO [RoutesResolver] DisputesController {/disputes}
[Nest] INFO [RoutesResolver] AdminController {/admin}
[Nest] INFO [NestApplication] Nest application successfully started
🚀 API is running on: http://localhost:3001
```

---

## ✅ Bước 6: Test API

### Quick Health Check
**Mở browser hoặc curl:**
```cmd
curl http://localhost:3001
```

**Expected response:**
```json
{
  "message": "Welcome to SeikoMMO API",
  "version": "1.0.0",
  "status": "running"
}
```

### Test Authentication
**Register user:**
```cmd
curl -X POST http://localhost:3001/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@test.com\",\"password\":\"123456\",\"name\":\"Test User\",\"role\":\"BUYER\"}"
```

**Expected:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "test@test.com",
      "name": "Test User",
      "role": "BUYER"
    }
  }
}
```

---

## 🧪 Bước 7: Run Test Scripts

### Test Basic API
```cmd
bash test-api.sh
```

**Hoặc chạy từng bước trong test script với curl/Postman**

### Test Wallet Flow
```cmd
bash test-wallet-flow.sh
```

### Test Reviews/Disputes/Admin
```cmd
bash test-review-dispute-admin.sh
```

**Trên Windows nếu không có bash:**
1. Install Git Bash, HOẶC
2. Install WSL (Ubuntu), HOẶC
3. Dùng Postman/Thunder Client để test manual

---

## 🌐 Bước 8: Start Frontend (Optional)

**Từ terminal mới:**
```cmd
cd apps\web
pnpm dev
```

**Access:**
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Prisma Studio: http://localhost:5555 (nếu chạy `npx prisma studio`)

---

## 🐛 Troubleshooting

### Lỗi: "EPERM: operation not permitted"
**Nguyên nhân:** OneDrive đang sync
**Fix:**
1. Right-click OneDrive icon → Pause syncing for 2 hours
2. Retry command
3. Hoặc copy project ra `C:\Projects\SeikoMMO`

### Lỗi: "Cannot find module '@nestjs/common'"
**Nguyên nhân:** Dependencies chưa install
**Fix:**
```cmd
cd apps\api
pnpm install
```

### Lỗi: "P1001: Can't reach database server"
**Nguyên nhân:** PostgreSQL chưa chạy hoặc sai connection string
**Fix:**
1. Check Docker: `docker ps` (phải thấy postgres container)
2. Hoặc start PostgreSQL service
3. Verify DATABASE_URL trong `.env`

### Lỗi: "Prisma CLI unknown command 'migrate'"
**Nguyên nhân:** Prisma v8 đổi API
**Fix:**
```cmd
npx prisma db push
```

### Lỗi: "Port 3001 already in use"
**Nguyên nhân:** Process khác đang dùng port
**Fix:**
1. Tìm process: `netstat -ano | findstr :3001`
2. Kill process: `taskkill /PID <process_id> /F`
3. Hoặc đổi PORT trong `.env` (ví dụ: `PORT=3002`)

### Lỗi: TypeScript "Cannot find module" sau khi tạo file
**Nguyên nhân:** Chỉ là warning, không ảnh hưởng runtime
**Fix:** Run `pnpm install` và restart TS server trong VS Code

---

## 📊 API Endpoints Overview

Khi server chạy thành công, bạn có thể access:

### Authentication
- POST `/auth/register` - Đăng ký
- POST `/auth/login` - Đăng nhập
- POST `/auth/refresh` - Refresh token

### Users
- GET `/users/me` - Profile hiện tại

### Shops
- POST `/shops` - Tạo shop (SELLER)
- GET `/shops` - List shops
- GET `/shops/:id` - Shop details

### Products
- POST `/products` - Tạo product (SELLER)
- GET `/products` - List products
- POST `/products/:id/stock/import` - Import keys

### Orders
- POST `/orders` - Mua hàng (BUYER)
- GET `/orders` - Orders của mình

### Wallets
- GET `/wallet/me` - Xem ví + lịch sử
- POST `/wallet/deposit` - Nạp tiền (mock)

### Payouts
- POST `/payouts` - Rút tiền (SELLER)
- GET `/payouts` - Lịch sử rút

### Reviews
- POST `/reviews` - Tạo review (BUYER)
- GET `/reviews/product/:id` - Reviews của product

### Disputes
- POST `/disputes` - Mở tranh chấp (BUYER)
- PATCH `/disputes/:id/resolve` - Xử lý (ADMIN)

### Admin
- GET `/admin/orders` - Quản lý orders
- GET `/admin/payouts` - Quản lý payouts
- PATCH `/admin/orders/:id/status` - Update status
- GET `/admin/stats/overview` - Thống kê

---

## 🎯 Quick Test Flow (Manual)

### 1. Register 3 users
```cmd
# Buyer
curl -X POST http://localhost:3001/auth/register -H "Content-Type: application/json" -d "{\"email\":\"buyer@test.com\",\"password\":\"123456\",\"name\":\"Buyer\",\"role\":\"BUYER\"}"

# Seller
curl -X POST http://localhost:3001/auth/register -H "Content-Type: application/json" -d "{\"email\":\"seller@test.com\",\"password\":\"123456\",\"name\":\"Seller\",\"role\":\"SELLER\"}"

# Admin
curl -X POST http://localhost:3001/auth/register -H "Content-Type: application/json" -d "{\"email\":\"admin@test.com\",\"password\":\"123456\",\"name\":\"Admin\",\"role\":\"ADMIN\"}"
```

Lưu lại `accessToken` từ mỗi response!

### 2. Seller tạo shop
```cmd
curl -X POST http://localhost:3001/shops ^
  -H "Authorization: Bearer SELLER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test Shop\",\"description\":\"My shop\"}"
```

### 3. Seller tạo product
```cmd
curl -X POST http://localhost:3001/products ^
  -H "Authorization: Bearer SELLER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Game Key\",\"type\":\"DIGITAL\",\"price\":100000,\"shopId\":\"SHOP_ID\"}"
```

### 4. Import stock keys
Tạo file `keys.txt`:
```
KEY-001
KEY-002
KEY-003
```

```cmd
curl -X POST http://localhost:3001/products/PRODUCT_ID/stock/import ^
  -H "Authorization: Bearer SELLER_TOKEN" ^
  -F "file=@keys.txt"
```

### 5. Buyer nạp tiền
```cmd
curl -X POST http://localhost:3001/wallet/deposit ^
  -H "Authorization: Bearer BUYER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"amount\":500000}"
```

Lưu `transactionId`, sau đó confirm:
```cmd
curl -X POST http://localhost:3001/wallet/deposit/confirm ^
  -H "Authorization: Bearer BUYER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"transactionId\":\"TRANSACTION_ID\",\"amount\":500000}"
```

### 6. Buyer mua hàng
```cmd
curl -X POST http://localhost:3001/orders ^
  -H "Authorization: Bearer BUYER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"items\":[{\"productId\":\"PRODUCT_ID\",\"quantity\":2}]}"
```

### 7. Buyer review
```cmd
curl -X POST http://localhost:3001/reviews ^
  -H "Authorization: Bearer BUYER_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"productId\":\"PRODUCT_ID\",\"rating\":5,\"comment\":\"Great!\"}"
```

---

## 🔧 Development Tools

### Prisma Studio
```cmd
cd apps\api
npx prisma studio
```
→ http://localhost:5555 - GUI để xem/edit database

### VS Code Extensions (Khuyến nghị)
- Prisma
- REST Client (test API trong VS Code)
- Thunder Client (Postman alternative)

### API Testing Tools
- **Postman** - https://www.postman.com/
- **Thunder Client** (VS Code extension)
- **curl** (command line)

---

## 📚 Documentation

Đọc thêm chi tiết:
- [`WALLET_IMPLEMENTATION.md`](WALLET_IMPLEMENTATION.md) - Wallet system
- [`REVIEW_DISPUTE_ADMIN_IMPLEMENTATION.md`](REVIEW_DISPUTE_ADMIN_IMPLEMENTATION.md) - Review/Dispute/Admin
- [`PROJECT_SUMMARY.md`](PROJECT_SUMMARY.md) - Tổng quan project

---

## ✅ Success Checklist

Server đã ready khi bạn thấy:
- ✅ `pnpm install` thành công
- ✅ Prisma migration chạy xong
- ✅ API server start: "Nest application successfully started"
- ✅ http://localhost:3001 trả về response
- ✅ Register user thành công
- ✅ Nhận được JWT token

---

## 🆘 Cần Giúp?

Nếu vẫn gặp vấn đề:
1. Check logs trong terminal
2. Verify database connection
3. Kiểm tra port conflicts
4. Thử restart lại từ đầu

**Common Issues:**
- OneDrive EPERM → Pause sync hoặc copy project ra ngoài
- Prisma errors → Check DATABASE_URL
- Port in use → Change PORT trong .env
- Module not found → Run `pnpm install`

---

**Good luck! 🚀**
