# Plan: Turborepo Monorepo Setup

## Mục tiêu

Khởi tạo một monorepo Turborepo hoàn chỉnh với:
- **apps/web**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **apps/api**: NestJS + Prisma + PostgreSQL
- **packages/shared**: Shared types và utilities
- **Docker**: PostgreSQL 16 + Redis 7
- **Dev tools**: ESLint, Prettier, TypeScript strict mode

## Kiến trúc tổng quan

```
SeikoMMO/
├── apps/
│   ├── web/                 # Next.js 14 frontend (port 3000)
│   └── api/                 # NestJS backend (port 3001)
├── packages/
│   └── shared/              # Shared types và utils
├── docker-compose.yml       # PostgreSQL 16 + Redis 7
├── turbo.json              # Turborepo pipeline config
├── package.json            # Root workspace config
├── tsconfig.json           # Base TypeScript config (strict)
├── .eslintrc.js            # ESLint config
├── .prettierrc             # Prettier config
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md               # Setup và development guide
```

## Chi tiết từng component

### 1. Root Configuration

**Package Manager**: pnpm (recommended cho monorepo)

**package.json**:
- Workspaces: `apps/*`, `packages/*`
- Scripts:
  - `dev`: Chạy cả web và api đồng thời
  - `build`: Build tất cả apps
  - `lint`: Lint toàn bộ code
  - `format`: Format code với Prettier

**turbo.json**:
- Pipeline tasks: build, dev, lint, test
- Cache configuration để tăng tốc độ build
- Dependencies giữa các packages

**TypeScript (tsconfig.json)**:
- `strict: true`
- `esModuleInterop: true`
- `skipLibCheck: true`
- Base config được extend bởi các packages

**ESLint**:
- @typescript-eslint/parser
- @typescript-eslint/eslint-plugin
- eslint-config-prettier

**Prettier**:
- printWidth: 100
- semi: true
- singleQuote: true
- tabWidth: 2

### 2. apps/web (Next.js 14)

**Tech Stack**:
- Next.js 14.x (App Router)
- TypeScript (strict mode)
- Tailwind CSS 3.x
- shadcn/ui components
- Import từ `@repo/shared`

**Structure**:
```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   └── lib/
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── postcss.config.js
└── .env.example
```

**Features**:
- Home page đơn giản với Tailwind
- Setup shadcn/ui với components.json
- TypeScript strict mode
- Fast Refresh enabled

**Environment Variables (.env.example)**:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. apps/api (NestJS)

**Tech Stack**:
- NestJS 10.x
- TypeScript (strict mode)
- Prisma 5.x
- PostgreSQL 16
- Import từ `@repo/shared`

**Structure**:
```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── prisma/
│       ├── prisma.module.ts
│       └── prisma.service.ts
├── prisma/
│   └── schema.prisma
├── package.json
├── tsconfig.json
└── .env.example
```

**Prisma Schema (rỗng)**:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Thêm models tại đây
```

**Features**:
- Health check endpoint: GET /health
- Prisma service để kết nối DB
- CORS enabled cho web app
- Port: 3001

**Environment Variables (.env.example)**:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seiko_mmo?schema=public"
REDIS_URL="redis://localhost:6379"
PORT=3001
```

### 4. packages/shared

**Purpose**: Shared TypeScript types và utilities giữa web và api

**Structure**:
```
packages/shared/
├── src/
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Export**:
- Common types: User, Response, Error types
- Constants
- Utility functions

**package.json**:
```json
{
  "name": "@repo/shared",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

### 5. Docker Compose

**Services**:

**PostgreSQL 16**:
- Port: 5432
- Database: seiko_mmo
- User: postgres
- Password: postgres
- Volume: postgres_data

**Redis 7**:
- Port: 6379
- Volume: redis_data

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: seiko-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: seiko_mmo
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7
    container_name: seiko-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## Workflow Development

### 1. Initial Setup
```bash
# Clone/tạo project
cd SeikoMMO

# Install dependencies
pnpm install

# Start Docker services
docker-compose up -d

# Setup database
cd apps/api
pnpm prisma db push
cd ../..
```

### 2. Development
```bash
# Start all dev servers (web + api)
pnpm dev

# Web sẽ chạy tại: http://localhost:3000
# API sẽ chạy tại: http://localhost:3001
```

### 3. Common Commands
```bash
# Build all apps
pnpm build

# Lint code
pnpm lint

# Format code
pnpm format

# Prisma operations
cd apps/api
pnpm prisma generate    # Generate Prisma Client
pnpm prisma studio      # Open Prisma Studio
pnpm prisma db push     # Push schema changes
```

## Acceptance Criteria Checklist

- [ ] `pnpm dev` chạy được web:3000 và api:3001
- [ ] `docker-compose up` khởi động PostgreSQL 16 và Redis 7
- [ ] `pnpm prisma db push` trong apps/api chạy thành công
- [ ] TypeScript strict mode enabled cho tất cả apps
- [ ] ESLint và Prettier hoạt động
- [ ] packages/shared được import thành công trong cả web và api
- [ ] Web app hiển thị trang home với Tailwind
- [ ] API có health check endpoint hoạt động
- [ ] Không có auth, UI phức tạp, payment

## Các quyết định kỹ thuật

### Package Manager: pnpm
- Nhanh hơn npm/yarn
- Tiết kiệm disk space
- Hỗ trợ workspaces tốt

### Turborepo
- Caching thông minh
- Parallel execution
- Remote caching support (future)

### Next.js 14 App Router
- Modern approach
- Server Components
- Better performance

### Prisma
- Type-safe database client
- Great DX với migrations
- Auto-completion

### Docker Compose
- Local development đơn giản
- Consistent environment
- Easy database management

## Next Steps (sau khi skeleton xong)

1. **Authentication**: JWT, Passport, NextAuth
2. **UI Components**: Thêm nhiều shadcn/ui components
3. **Database Schema**: Design models cho MMO game
4. **API Endpoints**: CRUD operations
5. **State Management**: Redux/Zustand cho web
6. **Testing**: Jest, Vitest, Playwright
7. **CI/CD**: GitHub Actions
8. **Deployment**: Vercel (web) + Railway/Render (api)

## Diagrams

### Architecture Flow
```
┌─────────────┐         ┌─────────────┐
│             │         │             │
│  Next.js    │ ──────► │   NestJS    │
│  (Port      │  HTTP   │   (Port     │
│   3000)     │         │    3001)    │
│             │         │             │
└─────────────┘         └──────┬──────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
              ┌─────▼─────┐         ┌────▼────┐
              │PostgreSQL │         │  Redis  │
              │  (5432)   │         │ (6379)  │
              └───────────┘         └─────────┘
```

### Package Dependencies
```
apps/web ──────┐
               ├──► packages/shared
apps/api ──────┘
```

### Development Workflow
```
Developer
    │
    ├─► pnpm dev ──► Turborepo
    │                    │
    │                    ├─► apps/web (3000)
    │                    └─► apps/api (3001)
    │
    ├─► docker-compose up ──► PostgreSQL + Redis
    │
    └─► pnpm prisma db push ──► Database Schema
```

## Estimated Complexity

**Setup Phase**: Các bước setup cơ bản và configuration
**Integration Phase**: Kết nối các components với nhau
**Verification Phase**: Test và đảm bảo tất cả hoạt động

## Risk & Mitigation

**Risk 1**: Dependencies conflict
- Mitigation: Sử dụng pnpm với strict peer dependencies

**Risk 2**: Port đã được sử dụng
- Mitigation: Document ports và cách thay đổi trong .env

**Risk 3**: Docker không chạy
- Mitigation: Hướng dẫn cài đặt Docker trong README

**Risk 4**: Prisma connection issues
- Mitigation: Clear .env.example với correct connection string

## Notes

- Tất cả packages sử dụng TypeScript strict mode
- ESLint và Prettier được enforce
- Không implement authentication/payment/UI phức tạp
- Focus vào skeleton chạy được và scalable architecture
