# RESTART.md - Hướng Dẫn Khởi Động SeikoMMO Platform

Tài liệu này hướng dẫn cách khởi động toàn bộ stack SeikoMMO (PostgreSQL + NestJS API + Next.js Web) sau khi reboot máy hoặc restart môi trường dev.

## Cách Sử Dụng

Từ thư mục root của project (`SeikoMMO/`), chạy:

```cmd
restart-all.bat
```

Script sẽ tự động:
1. **Start PostgreSQL** - Khởi động Postgres portable qua `pg_ctl`
2. **Start API** - Chạy `node apps/api/dist/main.js` (NestJS compiled)
3. **Start Web** - Chạy `next start -p 3000` (hoặc dev mode nếu chưa build)

## Yêu Cầu Trước Khi Chạy

- **PostgreSQL Portable**: Đặt tại `vendor/postgresql/` hoặc sửa đường dẫn trong `restart-all.bat`
- **API đã build**: Chạy `cd apps/api && npm run build` ít nhất 1 lần
- **Web đã build** (optional): Chạy `cd apps/web && npm run build` để dùng production mode

## Logs

Tất cả logs được ghi vào `%TEMP%/opencode/`:
- `postgres.log` - PostgreSQL server logs
- `api.log` - NestJS API output
- `web.log` - Next.js Web output

Script sẽ tự động mở thư mục logs sau khi start xong.

## Ports

- **API**: http://localhost:3001
- **Web**: http://localhost:3000
- **PostgreSQL**: localhost:5432 (default)
