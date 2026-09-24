'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MOCK_PRODUCTS, ProductItem } from '@/lib/mock-data';
import { ProductCard } from '@/components/product-card';
import { FlashSaleSection } from '@/components/flash-sale-section';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { FlashSaleDto } from '@repo/shared';
import {
  ZapIcon,
  ShieldCheckIcon,
  ClockIcon,
  FilterIcon,
  KeyIcon,
  BotIcon,
  TrendingUpIcon,
} from '@/components/icons';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'TOOL' | 'DIGITAL' | 'SEEDING'>('ALL');
  const [sortOption, setSortOption] = useState<'POPULAR' | 'PRICE_LOW' | 'PRICE_HIGH'>('POPULAR');
  const [products, setProducts] = useState<ProductItem[]>(MOCK_PRODUCTS);
  const [isLiveApi, setIsLiveApi] = useState<boolean>(false);
  const [flashSales, setFlashSales] = useState<FlashSaleDto[]>([]);

  // Fetch real products from GET /products
  useEffect(() => {
    let isMounted = true;
    api.products
      .getAll()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data && res.data.length > 0) {
          // Map backend ProductDto to ProductItem format for rich display
          const mapped: ProductItem[] = res.data.map((p) => {
            const fallback = MOCK_PRODUCTS.find((m) => m.id === p.id) || MOCK_PRODUCTS[0];
            return {
              id: p.id,
              name: p.name,
              description: p.description || fallback.description,
              price: p.price,
              originalPrice: fallback.originalPrice || Math.round(p.price * 1.3),
              type: p.type,
              shopId: p.shopId,
              shopName: fallback.shopName || 'Gian Hàng Đối Tác',
              rating: fallback.rating || 4.9,
              soldCount: fallback.soldCount || 120,
              availableStock: p.availableStock,
              image: fallback.image || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&auto=format&fit=crop&q=80',
              tags: fallback.tags || [p.type, 'Auto Delivery'],
              features: fallback.features || ['Trả key tự động sau 1s', 'Bảo hành đầy đủ'],
              isFlashSale: fallback.isFlashSale,
            };
          });
          setProducts(mapped);
          setIsLiveApi(true);
        }
      })
      .catch(() => {
        // Keep mock data if backend not reachable
      });

    // Fetch flash sales
    api.flashSales
      .getActive()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setFlashSales(res.data);
        }
      })
      .catch(() => {
        // No flash sales available
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter and sort catalog
  const filteredProducts = products
    .filter((p) => {
      if (selectedCategory === 'ALL') return true;
      return p.type === selectedCategory;
    })
    .sort((a, b) => {
      if (sortOption === 'PRICE_LOW') return a.price - b.price;
      if (sortOption === 'PRICE_HIGH') return b.price - a.price;
      return b.soldCount - a.soldCount; // POPULAR
    });

  return (
    <div className="space-y-10 pb-16">
      {/* 1. HERO SECTION - Cyberpunk MMO Marketplace Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <ZapIcon size={14} className="animate-bounce" />
            <span>KHO TÀI NGUYÊN SỐ & PHẦN MỀM TỰ ĐỘNG HÓA MMO #1</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Sàn Giao Dịch Số{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Chuyên Nghiệp
            </span>{' '}
            Cho Dân MMO
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Tự động giao key bản quyền tức thì trong 1 giây qua API. Mua bán Tool Auto, Tài khoản cổ, Proxy dân cư và dịch vụ Seeding an toàn tuyệt đối với cơ chế ký quỹ Escrow bảo hiểm 100%.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="#products-catalog">
              <Button variant="neon" size="lg" className="flex items-center gap-2">
                <ZapIcon size={18} />
                Khám Phá Chợ MMO
              </Button>
            </Link>
            <Link href="/shop">
              <Button variant="secondary" size="lg" className="flex items-center gap-2">
                Mở Gian Hàng Seller
              </Button>
            </Link>
            {isLiveApi && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Backend API Connected
              </span>
            )}
          </div>

          {/* Value props badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ShieldCheckIcon size={16} />
              </div>
              <span>Bảo chứng Escrow 100%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <ClockIcon size={16} />
              </div>
              <span>Nhận Key ngay sau 1s</span>
            </div>
            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <ZapIcon size={16} />
              </div>
              <span>Hỗ trợ kỹ thuật 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORIES MMO SECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Danh Mục Tài Nguyên MMO
          </h2>
          <span className="text-xs text-slate-400">Đồng bộ từ kho hàng API thật</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => setSelectedCategory('TOOL')}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedCategory === 'TOOL'
                ? 'bg-purple-950/30 border-purple-500/60 shadow-lg shadow-purple-950/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-purple-500/30 hover:bg-slate-900'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <BotIcon size={22} />
            </div>
            <h3 className="text-sm font-bold text-white">Tool & Phần Mềm</h3>
            <p className="text-[11px] text-slate-400 mt-1">Tool reg nick, auto nuôi, spam bot, scrape data</p>
            <span className="inline-block mt-2 text-[10px] text-purple-400 font-mono">Tự động hoá MMO</span>
          </button>

          <button
            onClick={() => setSelectedCategory('DIGITAL')}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedCategory === 'DIGITAL'
                ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-950/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/30 hover:bg-slate-900'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
              <KeyIcon size={22} />
            </div>
            <h3 className="text-sm font-bold text-white">Digital & License</h3>
            <p className="text-[11px] text-slate-400 mt-1">Key Win/Office, Proxy dân cư, Acc Gmail, BM</p>
            <span className="inline-block mt-2 text-[10px] text-cyan-400 font-mono">Giao tức thì 1s</span>
          </button>

          <button
            onClick={() => setSelectedCategory('SEEDING')}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedCategory === 'SEEDING'
                ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-950/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-amber-500/30 hover:bg-slate-900'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <TrendingUpIcon size={22} />
            </div>
            <h3 className="text-sm font-bold text-white">Dịch Vụ Seeding</h3>
            <p className="text-[11px] text-slate-400 mt-1">Buff follow TikTok, sub YouTube, review Maps</p>
            <span className="inline-block mt-2 text-[10px] text-amber-400 font-mono">Bảo hành tụt</span>
          </button>

          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/30 hover:bg-slate-900'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <ZapIcon size={22} />
            </div>
            <h3 className="text-sm font-bold text-white">Tất Cả Sản Phẩm</h3>
            <p className="text-[11px] text-slate-400 mt-1">Xem toàn bộ kho hàng MMO được bảo hiểm</p>
            <span className="inline-block mt-2 text-[10px] text-emerald-400 font-mono">Xem toàn bộ</span>
          </button>
        </div>
      </section>

      {/* 3. FLASH SALE */}
      <FlashSaleSection sales={flashSales} />

      {/* 4. PRODUCT GRID WITH FILTERS & SORT */}
      <section id="products-catalog" className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FilterIcon size={18} className="text-emerald-400" />
              Chợ Sản Phẩm & Dịch Vụ MMO
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Đang hiển thị {filteredProducts.length} sản phẩm theo danh mục:{' '}
              <strong className="text-emerald-400 ml-1 uppercase">{selectedCategory}</strong>
            </p>
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 mr-1">Sắp xếp:</span>
            <button
              onClick={() => setSortOption('POPULAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                sortOption === 'POPULAR'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Phổ biến nhất
            </button>
            <button
              onClick={() => setSortOption('PRICE_LOW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                sortOption === 'PRICE_LOW'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Giá thấp → cao
            </button>
            <button
              onClick={() => setSortOption('PRICE_HIGH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                sortOption === 'PRICE_HIGH'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Giá cao → thấp
            </button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
