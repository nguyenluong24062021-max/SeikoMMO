# Hướng Dẫn Deploy Next.js lên Vercel

## Tổng Quan

Tài liệu này hướng dẫn deploy ứng dụng Next.js 14 (thư mục `apps/web`) lên Vercel, kết nối với API backend đã deploy trên Render.

**Yêu cầu:**
- Tài khoản GitHub (repo đã push code)
- Tài khoản Vercel (đăng ký miễn phí tại [vercel.com](https://vercel.com))
- URL API đã deploy trên Render (ví dụ: `https://your-api.onrender.com`)

---

## Bước 1: Chuẩn Bị Repository

### 1.1. Đẩy Code lên GitHub

Đảm bảo code đã được push lên GitHub repository:

```bash
git add .
git commit -m "chore: prepare for Vercel deployment"
git push origin main
```

### 1.2. Kiểm Tra Cấu Trúc Project

Project sử dụng monorepo với cấu trúc:
```
SeikoMMO/
├── apps/
│   └── web/          # Next.js app sẽ deploy
├── packages/
│   └── shared/       # Shared code
└── package.json      # Root package.json
```

---

## Bước 2: Import Project vào Vercel

### 2.1. Đăng Nhập Vercel

1. Truy cập [vercel.com/login](https://vercel.com/login)
2. Chọn **Continue with GitHub**
3. Cho phép Vercel truy cập GitHub repositories

### 2.2. Tạo Project Mới

1. Vào dashboard Vercel, click **Add New** → **Project**
2. Chọn repository **SeikoMMO** từ danh sách
3. Click **Import**

### 2.3. Cấu Hình Project Settings

Trong màn hình **Configure Project**, thiết lập các thông số sau:

| Thiết Lập | Giá Trị |
|-----------|---------|
| **Framework Preset** | Next.js |
| **Root Directory** | `apps/web` |
| **Build Command** | `npm run build` *(để mặc định)* |
| **Output Directory** | `.next` *(để mặc định)* |
| **Install Command** | `npm install` *(để mặc định)* |

> **Lưu ý:** Vercel tự động detect Next.js và sử dụng build commands phù hợp.

---

## Bước 3: Cấu Hình Environment Variables

### 3.1. Thêm Biến Môi Trường

Trong phần **Environment Variables**, thêm biến sau:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://your-api.onrender.com` | Production, Preview, Development |

**Cách thêm:**
1. Nhập **Key**: `NEXT_PUBLIC_API_URL`
2. Nhập **Value**: URL API Render của bạn (ví dụ: `https://seiko-mmo-api.onrender.com`)
3. Chọn tất cả 3 environments: **Production**, **Preview**, **Development**
4. Click **Add**

> **Quan trọng:** 
> - `NEXT_PUBLIC_API_URL` là biến **build-time**, được embed vào code khi build
> - Không có dấu `/` ở cuối URL
> - URL phải bắt đầu bằng `https://`

### 3.2. Ví Dụ Cấu Hình

```
NEXT_PUBLIC_API_URL=https://seiko-mmo-api.onrender.com
```

---

## Bước 4: Deploy

### 4.1. Bắt Đầu Deployment

1. Click **Deploy** để bắt đầu
2. Vercel sẽ:
   - Clone repository
   - Install dependencies (`pnpm install` hoặc `npm install`)
   - Run build (`npm run build` trong `apps/web`)
   - Deploy lên Vercel Edge Network

### 4.2. Theo Dõi Build Progress

Bạn sẽ thấy:
- ✅ Building
- ✅ Deploying
- ✅ Ready

Thời gian deploy: **2-5 phút** cho lần đầu.

### 4.3. Kiểm Tra Deploy Thành Công

Sau khi deploy xong:
1. Vercel hiển thị **Deployment URL** (ví dụ: `https://seiko-mmo-xyz.vercel.app`)
2. Click vào URL để xem site live
3. Kiểm tra các chức năng chính:
   - Trang chủ load đúng
   - Login/Register kết nối đúng API Render
   - Xem sản phẩm, thêm vào giỏ hàng
   - Checkout và thanh toán

---

## Bước 5: Cấu Hình Domain (Tùy Chọn)

### 5.1. Sử Dụng Domain Miễn Phí

Vercel tự động cung cấp domain:
```
https://your-project-name.vercel.app
```

### 5.2. Thêm Custom Domain

Nếu có domain riêng (ví dụ: `seikommo.com`):

1. Vào **Settings** → **Domains**
2. Nhập domain: `seikommo.com`
3. Click **Add**
4. Vercel cung cấp DNS records
5. Thêm records vào domain registrar (Cloudflare, Namecheap, etc.)
6. Chờ DNS propagate (5-10 phút)

---

## Bước 6: Cập Nhật API URL

### 6.1. Khi Nào Cần Cập Nhật

Bạn cần cập nhật `NEXT_PUBLIC_API_URL` khi:
- Thay đổi URL API trên Render
- Di chuyển API sang server khác
- Thay đổi domain API

### 6.2. Cách Cập Nhật Environment Variable

1. Vào **Project Settings** → **Environment Variables**
2. Tìm biến `NEXT_PUBLIC_API_URL`
3. Click icon **Edit** (bút chì)
4. Nhập URL mới: `https://new-api-url.onrender.com`
5. Click **Save**
6. **Quan trọng:** Click **Redeploy** để rebuild với env mới

### 6.3. Trigger Redeploy

**Cách 1: Từ Dashboard**
1. Vào tab **Deployments**
2. Click **...** (3 dots) ở deployment mới nhất
3. Chọn **Redeploy**
4. Click **Redeploy** để confirm

**Cách 2: Git Push**
```bash
git commit --allow-empty -m "redeploy: update API URL"
git push origin main
```

> **Lưu ý:** Phải **Redeploy** sau khi đổi env variables vì `NEXT_PUBLIC_*` được embed vào code lúc build time.

---

## Bước 7: Affiliate Links & Referral Tracking

### 7.1. Cơ Chế Hoạt Động

Affiliate links với query parameter `?ref=` **tự động hoạt động** mà không cần code thêm:

```
https://your-site.vercel.app/product/123?ref=affiliate-code-abc
https://your-site.vercel.app/shop?ref=seller-xyz
```

**Quy trình:**
1. User click vào link có `?ref=`
2. Browser tự động giữ query parameter
3. Frontend JavaScript (đã implement) đọc `ref` từ URL
4. Gửi `ref` lên API khi user checkout
5. API backend xử lý commission tracking

### 7.2. Domain Vercel và Affiliate Links

Affiliate links **tự động theo domain** Vercel deploy:

| Deployment | Affiliate Link Example |
|------------|------------------------|
| Production | `https://seiko-mmo.vercel.app/shop?ref=ABC123` |
| Custom Domain | `https://seikommo.com/shop?ref=ABC123` |
| Preview Deploy | `https://seiko-mmo-git-feature.vercel.app/shop?ref=ABC123` |

**Không cần:**
- ❌ Hardcode domain trong code
- ❌ Cấu hình routing đặc biệt
- ❌ Middleware xử lý query params

**Query parameters hoạt động với:**
- Next.js routing tự động
- Client-side navigation (`useRouter`, `useSearchParams`)
- Server-side rendering (SSR)
- Static site generation (SSG)

### 7.3. Test Affiliate Links

Sau khi deploy, test các scenarios:

```bash
# Test 1: Product page với ref
https://your-site.vercel.app/product/1?ref=TEST001

# Test 2: Shop page với ref
https://your-site.vercel.app/shop?ref=SELLER01

# Test 3: Multiple params
https://your-site.vercel.app/product/5?ref=AFF999&utm_source=facebook
```

Mở browser DevTools → Network → kiểm tra API requests có gửi `ref` parameter đúng không.

---

## Bước 8: Continuous Deployment (Auto Deploy)

### 8.1. Auto Deploy Mặc Định

Vercel tự động deploy khi:
- Push code lên `main` branch → **Production deployment**
- Push lên branch khác → **Preview deployment**
- Tạo Pull Request → **Preview deployment** với URL riêng

### 8.2. Preview Deployments

Mỗi PR/branch có URL riêng:
```
https://seiko-mmo-git-feature-xyz-username.vercel.app
```

Dùng để test trước khi merge vào `main`.

### 8.3. Production Deployment

Chỉ `main` branch deploy lên production URL:
```
https://seiko-mmo.vercel.app
```

---

## Bước 9: Monitoring & Logs

### 9.1. Xem Deployment Logs

1. Vào tab **Deployments**
2. Click vào deployment bất kỳ
3. Xem **Build Logs** để debug build errors

### 9.2. Runtime Logs

1. Vào tab **Logs**
2. Xem real-time logs từ serverless functions
3. Filter theo time range, status code

### 9.3. Analytics (Tùy Chọn)

Nếu muốn xem traffic analytics:
1. Vào **Analytics** tab
2. Enable **Vercel Analytics** (miễn phí tier có giới hạn)

---

## Troubleshooting

### Lỗi: "Build Failed"

**Nguyên nhân:** TypeScript errors, missing dependencies

**Giải pháp:**
1. Kiểm tra logs trong **Build Logs**
2. Fix errors locally: `npm run build`
3. Push fix lên GitHub

### Lỗi: "API không kết nối được"

**Nguyên nhân:** `NEXT_PUBLIC_API_URL` sai hoặc chưa set

**Giải pháp:**
1. Kiểm tra env variable trong **Settings**
2. Đảm bảo URL đúng (không có `/` cuối)
3. **Redeploy** sau khi đổi env

### Lỗi: "404 Not Found" cho các routes

**Nguyên nhân:** Root directory không đúng

**Giải pháp:**
1. Vào **Settings** → **General**
2. Đảm bảo **Root Directory** = `apps/web`
3. Redeploy

### Build Timeout

**Nguyên nhân:** Dependencies quá lớn hoặc build chậm

**Giải pháp:**
1. Optimize dependencies trong `package.json`
2. Xóa unused packages
3. Upgrade Vercel plan nếu cần

### Affiliate Links Không Hoạt Động

**Nguyên nhân:** Frontend code chưa đọc query params đúng

**Giải pháp:**
1. Kiểm tra browser DevTools → Network → API requests
2. Verify `ref` parameter được gửi lên API
3. Check backend API logs để confirm nhận được `ref`

---

## Checklist Deploy

- [ ] Code đã push lên GitHub
- [ ] Import project vào Vercel
- [ ] Set Root Directory = `apps/web`
- [ ] Thêm `NEXT_PUBLIC_API_URL` vào Environment Variables
- [ ] Deploy thành công (xanh ✅)
- [ ] Test trang chủ load đúng
- [ ] Test login/register kết nối API
- [ ] Test mua hàng/checkout
- [ ] Test affiliate link với `?ref=TEST`
- [ ] Verify API requests gửi đúng URL

---

## Cấu Hình Next.js cho Vercel

### next.config.js

File cấu hình hiện tại đã **tương thích Vercel**:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/shared'],
  images: {
    unoptimized: true, // ✅ Compatible với Vercel
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ✅ Không dùng standalone output (để Vercel tự xử lý)
};

module.exports = nextConfig;
```

**Các tùy chọn quan trọng:**
- ✅ `images.unoptimized: true` - Tắt Next.js Image Optimization (vì Vercel có tự động optimize)
- ✅ Không có `output: 'standalone'` - Để Vercel sử dụng serverless functions
- ✅ `transpilePackages` - Hỗ trợ monorepo dependencies

### Environment Variables

File `.env.local` (local development):
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Vercel Production:**
```bash
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
```

> **Quan trọng:** `NEXT_PUBLIC_*` là build-time variables, được embed vào code khi build.

---

## Kết Luận

Sau khi hoàn thành hướng dẫn này:

✅ Next.js app deploy lên Vercel  
✅ Kết nối đúng API Render  
✅ Build pass không lỗi  
✅ Affiliate links tự động hoạt động với domain Vercel  
✅ Có 404 và loading pages đẹp (xanh-đen theme)  
✅ Auto-deploy khi push code

**Production URL mẫu:**
```
https://seiko-mmo.vercel.app
```

**Mỗi lần cần đổi API URL:**
1. Settings → Environment Variables
2. Edit `NEXT_PUBLIC_API_URL`
3. Redeploy

**Support:**
- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Next.js Docs: [nextjs.org/docs](https://nextjs.org/docs)
