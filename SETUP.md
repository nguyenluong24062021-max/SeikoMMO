# 🚀 Hướng dẫn Setup Nhanh - Seiko MMO

## Bước 1: Cài đặt pnpm (hoặc dùng npm)

### Option A: Sử dụng pnpm (Recommended)

```bash
# Cài đặt pnpm qua npm
npm install -g pnpm

# Verify
pnpm --version
```

### Option B: Sử dụng npm (Alternative)

Nếu không muốn cài pnpm, bạn có thể dùng npm:

```bash
# Thay vì pnpm install
npm install

# Thay vì pnpm dev
npm run dev

# Thay vì pnpm add <package>
npm install <package>
```

**Lưu ý**: Project được thiết kế cho pnpm, nhưng npm cũng hoạt động. Bạn cần xóa dòng `"packageManager": "pnpm@8.15.0"` trong `package.json` nếu dùng npm.

## Bước 2: Cài đặt Dependencies

```bash
# Với pnpm
pnpm install

# Hoặc với npm
npm install
```

## Bước 3: Khởi động Docker Services

```bash
# Đảm bảo Docker Desktop đang chạy
docker-compose up -d

# Kiểm tra services
docker-compose ps
```

Kết quả mong đợi:
```
NAME                IMAGE               STATUS
seiko-postgres      postgres:16         Up (healthy)
seiko-redis         redis:7-alpine      Up (healthy)
```

## Bước 4: Setup Environment Files

```bash
# Windows CMD
copy apps\web\.env.example apps\web\.env.local
copy apps\api\.env.example apps\api\.env

# PowerShell
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/api/.env.example apps/api/.env

# Linux/Mac
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

## Bước 5: Setup Prisma Database

```bash
# Windows CMD
cd apps\api
pnpm prisma generate
pnpm prisma db push
cd ..\..

# Linux/Mac
cd apps/api
pnpm prisma generate
pnpm prisma db push
cd ../..
```

Với npm:
```bash
cd apps/api
npm run prisma:generate
npm run prisma:push
cd ../..
```

## Bước 6: Chạy Development Servers

```bash
# Với pnpm
pnpm dev

# Với npm
npm run dev
```

## ✅ Verification

Sau khi chạy `pnpm dev` hoặc `npm run dev`, kiểm tra:

1. **Web App**: Mở http://localhost:3000
   - Sẽ thấy trang "Seiko MMO" với UI đơn giản
   
2. **API Server**: Mở http://localhost:3001/health
   - Sẽ thấy JSON response:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-09-20T14:13:28.846Z",
     "uptime": 12.345
   }
   ```

3. **PostgreSQL**: 
   ```bash
   docker exec -it seiko-postgres psql -U postgres -d seiko_mmo -c "SELECT version();"
   ```

4. **Redis**:
   ```bash
   docker exec -it seiko-redis redis-cli ping
   # Kết quả: PONG
   ```

## 🎯 Checklist Hoàn Thành

- [ ] pnpm (hoặc npm) đã được cài đặt
- [ ] Docker Desktop đang chạy
- [ ] `pnpm install` chạy thành công
- [ ] Docker services đang chạy (postgres + redis)
- [ ] Environment files đã được tạo
- [ ] Prisma Client đã được generate
- [ ] Database schema đã được push
- [ ] Web app chạy tại port 3000
- [ ] API server chạy tại port 3001
- [ ] Health check endpoint trả về OK

## ❌ Troubleshooting

### Lỗi: "pnpm is not recognized"

**Giải pháp**:
```bash
npm install -g pnpm
# Hoặc dùng npm thay thế
```

### Lỗi: "Port 3000 is already in use"

**Giải pháp**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Lỗi: "Cannot connect to Docker"

**Giải pháp**:
1. Mở Docker Desktop
2. Đợi Docker khởi động hoàn tất
3. Chạy lại `docker-compose up -d`

### Lỗi: Prisma connection error

**Giải pháp**:
```bash
# Kiểm tra PostgreSQL đang chạy
docker-compose ps

# Kiểm tra connection string trong apps/api/.env
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seiko_mmo?schema=public"

# Restart PostgreSQL
docker-compose restart postgres

# Thử lại
cd apps/api
pnpm prisma db push
```

### Lỗi: Module not found

**Giải pháp**:
```bash
# Xóa node_modules và reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install

# Hoặc với npm
npm install
```

## 📋 Next Steps

Sau khi setup xong, bạn có thể:

1. **Xem Prisma Studio**:
   ```bash
   cd apps/api
   pnpm prisma:studio
   ```
   Mở http://localhost:5555

2. **Thêm database models**: 
   - Edit `apps/api/prisma/schema.prisma`
   - Run `pnpm prisma db push`

3. **Tạo API endpoints mới**:
   - Thêm controllers trong `apps/api/src/`
   - Import vào `app.module.ts`

4. **Customize web UI**:
   - Edit `apps/web/src/app/page.tsx`
   - Thêm components mới

5. **Thêm shared types**:
   - Edit `packages/shared/src/types/index.ts`
   - Sử dụng trong cả web và api

## 🆘 Cần Help?

Xem chi tiết trong [`README.md`](../README.md) hoặc check:
- 📁 Project structure: `plans/turborepo-setup-plan.md`
- 🐳 Docker logs: `docker-compose logs -f`
- 📊 API logs: Terminal đang chạy `pnpm dev`
