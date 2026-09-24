export interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  type: 'DIGITAL' | 'TOOL' | 'SEEDING';
  shopId: string;
  shopName: string;
  rating: number;
  soldCount: number;
  availableStock: number;
  image: string;
  tags: string[];
  features: string[];
  isFlashSale?: boolean;
}

export interface ShopInfo {
  id: string;
  name: string;
  tagline: string;
  rating: number;
  totalProducts: number;
  responseRate: string;
  joinedDate: string;
  avatar: string;
  verified: boolean;
  totalSales: number;
}

export const MOCK_SHOPS: Record<string, ShopInfo> = {
  'shop-seiko-prime': {
    id: 'shop-seiko-prime',
    name: 'Seiko MMO Official Store',
    tagline: 'Chuyên cung cấp Tool MMO, Proxy IPv4/IPv6, Cookie & Tài nguyên sạch 100%',
    rating: 4.9,
    totalProducts: 48,
    responseRate: '100% (trong 5 phút)',
    joinedDate: 'Tháng 1/2024',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    verified: true,
    totalSales: 15420,
  },
  'shop-matrix-tech': {
    id: 'shop-matrix-tech',
    name: 'Matrix Auto Solutions',
    tagline: 'Phần mềm nuôi nick, tương tác tự động TikTok, Facebook, Tele bot',
    rating: 4.8,
    totalProducts: 24,
    responseRate: '98%',
    joinedDate: 'Tháng 3/2024',
    avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150&auto=format&fit=crop&q=80',
    verified: true,
    totalSales: 8900,
  },
};

export const MOCK_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    name: 'Tool Auto Nuôi Nick Facebook & Reg Page Vĩnh Viễn 2026',
    description: 'Bộ công cụ tự động login, lướt newfeed, giải captcha, reg page kháng limit 282/956, tích hợp API proxy đa luồng.',
    price: 350000,
    originalPrice: 700000,
    type: 'TOOL',
    shopId: 'shop-seiko-prime',
    shopName: 'Seiko MMO Official Store',
    rating: 4.9,
    soldCount: 1420,
    availableStock: 85,
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=80',
    tags: ['Tool Auto', 'Hot 2026', 'No Limit'],
    features: ['Hỗ trợ đa luồng (Multi-threading)', 'Auto bypass checkpoint', 'Update tính năng miễn phí 1 năm', 'Bảo hành 1 đổi 1 trong 30 ngày'],
    isFlashSale: true,
  },
  {
    id: 'prod-2',
    name: 'License Key Windows 11 Pro + Office 365 vĩnh viễn (Bản quyền số)',
    description: 'Key digital kích hoạt trực tiếp online từ Microsoft, liên kết tài khoản cá nhân, bảo hành trọn đời máy.',
    price: 180000,
    originalPrice: 450000,
    type: 'DIGITAL',
    shopId: 'shop-seiko-prime',
    shopName: 'Seiko MMO Official Store',
    rating: 5.0,
    soldCount: 3890,
    availableStock: 250,
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&auto=format&fit=crop&q=80',
    tags: ['Key Bản Quyền', 'Bảo Hành Trọn Đời'],
    features: ['Kích hoạt tức thì trong 1s', 'Bản quyền số vĩnh viễn', 'Hỗ trợ nâng cấp Win 11', 'Tặng kèm tài khoản lưu trữ OneDrive'],
    isFlashSale: true,
  },
  {
    id: 'prod-3',
    name: 'Combo 5000 Follower + 10k Like TikTok Thật (Seeding Bảo Hành 60 Ngày)',
    description: 'Dịch vụ kéo tương tác profile, video TikTok chuẩn tệp người dùng thật tại Việt Nam, tăng đề xuất FYP mạnh mẽ.',
    price: 240000,
    originalPrice: 400000,
    type: 'SEEDING',
    shopId: 'shop-matrix-tech',
    shopName: 'Matrix Auto Solutions',
    rating: 4.8,
    soldCount: 960,
    availableStock: 999,
    image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&auto=format&fit=crop&q=80',
    tags: ['Seeding Top', 'Buff Follower'],
    features: ['Người dùng Việt Nam thật 100%', 'Bảo hành tụt trong 60 ngày', 'Tăng tốc độ tự nhiên an toàn kênh', 'Không cần cung cấp mật khẩu'],
    isFlashSale: true,
  },
  {
    id: 'prod-4',
    name: 'Tool Cào Dữ Liệu Khách Hàng Telegram & Auto Add Member Nhóm',
    description: 'Phần mềm quét data thành viên nhóm đối thủ theo từ khóa, lọc user online 24h, add member vào group riêng tự động.',
    price: 520000,
    originalPrice: 950000,
    type: 'TOOL',
    shopId: 'shop-matrix-tech',
    shopName: 'Matrix Auto Solutions',
    rating: 4.9,
    soldCount: 630,
    availableStock: 42,
    image: 'https://images.unsplash.com/photo-1618060932014-4deda4932554?w=500&auto=format&fit=crop&q=80',
    tags: ['Telegram Bot', 'MMO Pro'],
    features: ['Scrape user active cực chuẩn', 'Add 500-1000 mem/ngày', 'Chống ban số điện thoại', 'Tài liệu hướng dẫn video full'],
    isFlashSale: false,
  },
  {
    id: 'prod-5',
    name: 'Gói 100 Tài Khoản Gmail Cổ 2018-2022 Đã Kháng Limit',
    description: 'Tài khoản Gmail lâu năm, ngâm IP sạch, đầy đủ mail khôi phục, chuyên dụng reg app MMO, chạy quảng cáo Ads.',
    price: 490000,
    originalPrice: 750000,
    type: 'DIGITAL',
    shopId: 'shop-seiko-prime',
    shopName: 'Seiko MMO Official Store',
    rating: 4.7,
    soldCount: 2150,
    availableStock: 120,
    image: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=500&auto=format&fit=crop&q=80',
    tags: ['Gmail Cổ', 'Tài Nguyên MMO'],
    features: ['Định dạng Email|Pass|Recovery', 'Bảo hành login lần đầu', 'Live vĩnh viễn không checkpoint', 'Tương thích mọi loại Proxy'],
    isFlashSale: false,
  },
  {
    id: 'prod-6',
    name: 'Dịch Vụ Seeding 100 Đánh Giá 5 Sao Google Maps & Fanpage',
    description: 'Đánh giá địa điểm kinh doanh, shop bán lẻ với tài khoản Local Guide cấp 5+, nội dung tùy chỉnh có đính kèm ảnh.',
    price: 320000,
    originalPrice: 600000,
    type: 'SEEDING',
    shopId: 'shop-matrix-tech',
    shopName: 'Matrix Auto Solutions',
    rating: 4.9,
    soldCount: 810,
    availableStock: 500,
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=80',
    tags: ['Google Review', 'Maps Uy Tín'],
    features: ['Tài khoản Local Guide uy tín', 'Kèm hình ảnh thực tế chất lượng', 'Cam kết không bị rụng bài', 'Tăng thứ hạng SEO Maps'],
    isFlashSale: false,
  },
  {
    id: 'prod-7',
    name: 'Proxy Dân Cư IPv4 Sạch (Residential Proxy) 10GB Data',
    description: 'Proxy xoay và tĩnh từ hơn 100 quốc gia (US, VN, JP, DE...), sạch blacklist, tốc độ cao không giật lag.',
    price: 290000,
    originalPrice: 450000,
    type: 'DIGITAL',
    shopId: 'shop-seiko-prime',
    shopName: 'Seiko MMO Official Store',
    rating: 4.8,
    soldCount: 4320,
    availableStock: 300,
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500&auto=format&fit=crop&q=80',
    tags: ['Proxy Sạch', 'IPv4 Resident'],
    features: ['Băng thông 10GB không giới hạn hạn dùng', 'Hơn 50 triệu IP toàn cầu', 'Hỗ trợ HTTP/SOCKS5', 'Bảng điều khiển API trích xuất nhanh'],
    isFlashSale: true,
  },
  {
    id: 'prod-8',
    name: 'Tool Auto Nuôi Kênh YouTube Shorts & Reup Tự Động Render Video',
    description: 'Tự động tải video từ Douyin/Instagram, lách âm thanh và hình ảnh, gắn watermark và hẹn giờ đăng theo lịch.',
    price: 680000,
    originalPrice: 1200000,
    type: 'TOOL',
    shopId: 'shop-matrix-tech',
    shopName: 'Matrix Auto Solutions',
    rating: 4.9,
    soldCount: 540,
    availableStock: 35,
    image: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=500&auto=format&fit=crop&q=80',
    tags: ['YouTube Shorts', 'Auto Render'],
    features: ['Bộ lọc lách bản quyền AI 2026', 'Hỗ trợ quản lý 50 kênh cùng lúc', 'Tích hợp API ChatGPT tự sinh tiêu đề', 'Bảo trì trọn đời'],
    isFlashSale: false,
  }
];

export const MOCK_WALLET = {
  balance: 2450000,
  formattedBalance: '2.450.000 ₫',
  currency: 'VND',
  pendingDisbursed: 0,
  cryptoEquivalent: '98.5 USDT',
};
