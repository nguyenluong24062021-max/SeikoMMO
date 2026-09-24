# Seiko MMO - E-commerce Marketplace

Monorepo cho hệ thống marketplace MMO với Next.js 14 frontend và NestJS backend.

## 🏗️ Kiến trúc

```
seiko-mmo/
├── apps/
│   ├── web/          # Next.js 14 + TypeScript + Tailwind
│   └── api/          # NestJS + Prisma + PostgreSQL
├── packages/
│   └── shared/       # Shared TypeScript types
└── docker-compose.yml
```

## ✨ Tính năng

### Backend API (NestJS)
- ✅ **JWT Authentication** với access + refresh tokens
- ✅ **RBAC Guards** cho 3 roles: BUYER, SELLER, ADMIN
- ✅ **9 Prisma Models**: User, Shop, Product, ProductStock, Order, OrderItem, Wallet, Transaction, Payout, Review
- ✅ **Shop CRUD** với ownership validation
- ✅ **Product CRUD** với stock management
- ✅ **Stock Import** từ TXT/CSV (batch import hàng trăm keys)
- ✅ **Order Creation** với automatic stock deduction
- ✅ **Transaction-safe** order processing

### Models Schema
```
User (BUYER/SELLER/ADMIN)
  └── Wallet
  └── Shop (for SELLER)
      └── Product (DIGITAL/TOOL/SEEDING)
          └── ProductStock (AVAILABLE/SOLD)
              └── Order (PENDING/PAID/DELIVERED/DISPUTED)
                  └── OrderItem
                  └── Transaction
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+ (hoặc npm/yarn)
- Docker & Docker Compose
- PostgreSQL 16 (qua Docker)

### 1. Clone và Install

```bash
# Nếu chưa có pnpm
npm install -g pnpm@8.15.0

# Install dependencies
pnpm install

# Hoặc dùng npm
npm install
```

### 2. Setup Database

```bash
# Start PostgreSQL và Redis
docker-compose up -d

# Kiểm tra services đang chạy
docker-compose ps
```

### 3. Setup Environment

```bash
# Copy và config .env cho API
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# apps/api/.env đã có config sẵn, nhưng nên đổi JWT secrets
```

### 4. Prisma Setup

```bash
# Generate Prisma Client
cd apps/api
pnpm prisma:generate

# Push schema to database
pnpm prisma:push

# (Optional) Open Prisma Studio để xem database
pnpm prisma:studio
```

### 5. Run Development

```bash
# Từ root directory
pnpm dev

# Web: http://localhost:3000
# API: http://localhost:3001
```

## 🧪 Testing Acceptance Criteria

### Automated Test (Linux/Mac)
```bash
chmod +x test-api.sh
./test-api.sh
```

### Manual Test (Windows hoặc Postman)

Sử dụng **Postman**, **Thunder Client** (VS Code extension), hoặc **curl**.

Xem chi tiết tại **[`API_DOCS.md`](./API_DOCS.md)** 📖

#### Test Flow:

**1. Register 3 users**
```bash
# Buyer
POST http://localhost:3001/auth/register
{
  "email": "buyer@test.com",
  "password": "123456",
  "name": "Test Buyer",
  "role": "BUYER"
}

# Seller
POST http://localhost:3001/auth/register
{
  "email": "seller@test.com",
  "password": "123456",
  "name": "Test Seller",
  "role": "SELLER"
}

# Admin
POST http://localhost:3001/auth/register
{
  "email": "admin@test.com",
  "password": "123456",
  "name": "Test Admin",
  "role": "ADMIN"
}
```

**2. Login và lấy token**
```bash
POST http://localhost:3001/auth/login
{
  "email": "seller@test.com",
  "password": "123456"
}
# Copy accessToken để dùng cho các request tiếp theo
```

**3. Seller tạo Shop**
```bash
POST http://localhost:3001/shops
Authorization: Bearer <seller_access_token>
{
  "name": "Gaming Shop",
  "description": "Best gaming accounts"
}
# Copy shop ID
```

**4. Seller tạo Product**
```bash
POST http://localhost:3001/products
Authorization: Bearer <seller_access_token>
{
  "name": "League of Legends Account",
  "description": "Level 30 unranked",
  "type": "DIGITAL",
  "price": 50000,
  "shopId": "<shop_id>"
}
# Copy product ID
```

**5. Import 100 keys**

**Option A: Import từ JSON array**
```bash
POST http://localhost:3001/products/stock/import
Authorization: Bearer <seller_access_token>
{
  "productId": "<product_id>",
  "keys": [
    "KEY-001-ABCD-1234",
    "KEY-002-EFGH-5678",
    ... (100 keys total)
  ]
}
```

**Option B: Import từ file TXT/CSV**
```bash
POST http://localhost:3001/products/stock/import-file
Authorization: Bearer <seller_access_token>
Content-Type: multipart/form-data

Form Data:
- file: keys-sample.txt (attached file)
- productId: <product_id>
```

File [`keys-sample.txt`](./keys-sample.txt) đã có sẵn 100 keys mẫu.

**6. Kiểm tra stock**
```bash
GET http://localhost:3001/products/<product_id>
# Xem availableStock: 100
```

**7. Buyer mua 2 items**
```bash
# Login as buyer
POST http://localhost:3001/auth/login
{
  "email": "buyer@test.com",
  "password": "123456"
}

# Create order
POST http://localhost:3001/orders
Authorization: Bearer <buyer_access_token>
{
  "items": [
    {
      "productId": "<product_id>",
      "quantity": 2
    }
  ]
}
```

**8. Verify stock đã trừ**
```bash
GET http://localhost:3001/products/<product_id>
# Xem availableStock: 98 ✅

# Xem chi tiết stocks (SELLER only)
GET http://localhost:3001/products/<product_id>/stocks
Authorization: Bearer <seller_access_token>
# Sẽ thấy 2 stocks có status: "SOLD"
```

## 📁 Project Structure

```
apps/api/src/
├── auth/               # JWT authentication + guards
│   ├── guards/         # JwtAuthGuard, JwtRefreshGuard, RolesGuard
│   ├── strategies/     # JWT strategies
│   ├── decorators/     # @Roles(), @CurrentUser()
│   ├── auth.service.ts
│   └── auth.controller.ts
├── users/              # User management
├── shops/              # Shop CRUD
├── products/           # Product CRUD + Stock import
├── orders/             # Order creation + stock allocation
└── prisma/             # Prisma service + schema
```

## 🔑 API Endpoints

### Auth
- `POST /auth/register` - Đăng ký (BUYER/SELLER/ADMIN)
- `POST /auth/login` - Đăng nhập
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Đăng xuất

### Users
- `GET /users/me` - Lấy profile

### Shops (SELLER, ADMIN)
- `POST /shops` - Tạo shop
- `GET /shops` - List shops
- `GET /shops/my-shops` - My shops
- `PATCH /shops/:id` - Update shop
- `DELETE /shops/:id` - Delete shop

### Products (SELLER owner, ADMIN)
- `POST /products` - Tạo product
- `GET /products` - List products
- `GET /products/:id` - Get product
- `PATCH /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `POST /products/stock/import` - Import keys từ JSON
- `POST /products/stock/import-file` - Import keys từ file
- `GET /products/:id/stocks` - Xem stocks

### Orders (BUYER, ADMIN)
- `POST /orders` - Tạo order (tự động trừ stock)
- `GET /orders` - My orders
- `GET /orders/:id` - Get order detail

Xem chi tiết tại **[`API_DOCS.md`](./API_DOCS.md)**

## 📊 Database Schema

Xem Prisma schema tại [`apps/api/prisma/schema.prisma`](./apps/api/prisma/schema.prisma)

9 models:
- `User` - Users với 3 roles
- `Shop` - Shops owned by sellers
- `Product` - Products với 3 types (DIGITAL/TOOL/SEEDING)
- `ProductStock` - Individual keys/stocks
- `Order` - Orders với 4 statuses
- `OrderItem` - Order line items
- `Wallet` - User wallets
- `Transaction` - Financial transactions
- `Payout` - Seller payouts
- `Review` - Product reviews

## 🛠️ Commands

### Root
```bash
pnpm dev          # Run all apps in dev mode
pnpm build        # Build all apps
pnpm lint         # Lint all apps
```

### API
```bash
cd apps/api
pnpm dev                  # Run in watch mode (port 3001)
pnpm build                # Build for production
pnpm prisma:generate      # Generate Prisma Client
pnpm prisma:push          # Push schema to DB
pnpm prisma:studio        # Open Prisma Studio
```

### Web
```bash
cd apps/web
pnpm dev          # Run Next.js dev server (port 3000)
pnpm build        # Build for production
pnpm start        # Start production server
```

## 🐳 Docker

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Reset database
docker-compose down -v
docker-compose up -d
```

## 🔧 Tech Stack

### Frontend (apps/web)
- Next.js 14 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui

### Backend (apps/api)
- NestJS 10
- Prisma ORM
- PostgreSQL 16
- JWT Authentication
- bcrypt
- csv-parse

### DevOps
- Docker & Docker Compose
- Turborepo
- pnpm workspaces
- ESLint + Prettier

## ✅ Acceptance Criteria Status

- [x] Register/login cho 3 roles (BUYER, SELLER, ADMIN) ✅
- [x] Seller tạo shop ✅
- [x] Seller tạo product ✅
- [x] Seller import 100 keys từ file ✅
- [x] Buyer mua product ✅
- [x] Stock tự động trừ đúng số lượng ✅
- [x] Transaction-safe order processing ✅

## 📝 Notes

- **JWT Secrets**: Nhớ đổi JWT secrets trong `.env` khi deploy production
- **Password**: Demo password là "123456", nên validate mạnh hơn trong production
- **File Upload**: Multer đã config để accept `.txt` và `.csv` files
- **Stock Allocation**: FIFO (First-In-First-Out) - keys import trước sẽ bán trước
- **Transaction**: Order creation dùng Prisma transaction để đảm bảo consistency

## 🚧 Not Implemented (theo yêu cầu)

- ❌ Payment integration thật (chỉ có pending orders)
- ❌ Beautiful UI (chỉ có skeleton)
- ❌ Email verification
- ❌ Password reset
- ❌ Real-time notifications

## 📚 Documentation

- **[API_DOCS.md](./API_DOCS.md)** - Đầy đủ API endpoints và examples
- **[keys-sample.txt](./keys-sample.txt)** - 100 keys mẫu để test import
- **[test-api.sh](./test-api.sh)** - Automated test script (Linux/Mac)
- **[test-api.bat](./test-api.bat)** - Windows test helper

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 3000/3001
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### Prisma Client not generated
```bash
cd apps/api
pnpm prisma:generate
```

### Database connection error
```bash
# Check Docker containers
docker-compose ps

# Restart containers
docker-compose restart postgres
```

### Module not found errors
```bash
# Clean install
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
pnpm install
```

## 📄 License

Private project for Seiko MMO.

---

**Happy coding! 🚀**
