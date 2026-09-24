'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MOCK_SHOPS, MOCK_PRODUCTS } from '@/lib/mock-data';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheckIcon,
  StarIcon,
  StoreIcon,
  ArrowLeftIcon,
} from '@/components/icons';

export default function ShopClient() {
  const searchParams = useSearchParams();
  const shopId = searchParams.get('id') || 'shop-seiko-prime';

  const shop = MOCK_SHOPS[shopId] || MOCK_SHOPS['shop-seiko-prime'];
  const [activeTab, setActiveTab] = useState<'ALL' | 'TOOL' | 'DIGITAL' | 'SEEDING'>('ALL');

  // Filter products by shop
  const shopProducts = MOCK_PRODUCTS.filter((p) => {
    const belongsToShop = p.shopId === shop.id;
    if (!belongsToShop) return false;
    if (activeTab === 'ALL') return true;
    return p.type === activeTab;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-emerald-400 flex items-center gap-1">
          <ArrowLeftIcon size={14} /> Trang chủ
        </Link>
        <span>/</span>
        <span className="text-slate-200">Gian hàng</span>
        <span>/</span>
        <span className="text-emerald-400 font-medium">{shop.name}</span>
      </div>

      {/* Shopee-style Shop Header Profile Card */}
      <div className="relative rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* Shop Avatar & Basic Info */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={shop.avatar}
                alt={shop.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-xl"
              />
              {shop.verified && (
                <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-slate-950 rounded-full shadow" title="Shop Uy Tín Đã Ký Quỹ">
                  <ShieldCheckIcon size={16} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">{shop.name}</h1>
                <Badge variant="success">Shop Uy Tín</Badge>
              </div>
              <p className="text-xs text-slate-300 max-w-md">{shop.tagline}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1 text-amber-400">
                  <StarIcon size={14} />
                  <strong className="text-slate-100">{shop.rating}</strong> / 5.0 (Đánh giá)
                </span>
                <span>Đã bán: <strong className="text-emerald-400 font-mono">{shop.totalSales.toLocaleString()}</strong> đơn</span>
              </div>
            </div>
          </div>

          {/* Shop Stats Grid (Shopee style) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6 w-full lg:w-auto">
            <div className="space-y-0.5">
              <p className="text-[11px] text-slate-400">Sản phẩm</p>
              <p className="text-base font-bold text-white font-mono">{shop.totalProducts}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-slate-400">Tỉ lệ phản hồi</p>
              <p className="text-base font-bold text-emerald-400 font-mono">{shop.responseRate}</p>
            </div>
            <div className="space-y-0.5 col-span-2 sm:col-span-1">
              <p className="text-[11px] text-slate-400">Tham gia</p>
              <p className="text-base font-bold text-slate-300">{shop.joinedDate}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-3">
          <Button variant="neon" size="sm" className="flex items-center gap-1.5">
            <StoreIcon size={16} /> Theo Dõi Gian Hàng
          </Button>
          <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
            Chat Với Người Bán (Telegram)
          </Button>
        </div>
      </div>

      {/* Shop Category Tabs */}
      <div className="border-b border-slate-800 flex items-center justify-between pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'ALL'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Tất cả ({MOCK_PRODUCTS.filter((p) => p.shopId === shop.id).length})
          </button>
          <button
            onClick={() => setActiveTab('TOOL')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'TOOL'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Tools
          </button>
          <button
            onClick={() => setActiveTab('DIGITAL')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'DIGITAL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Digital & Keys
          </button>
          <button
            onClick={() => setActiveTab('SEEDING')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'SEEDING'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Seeding
          </button>
        </div>

        <span className="text-xs text-slate-400 hidden sm:inline">
          Giao dịch ký quỹ được giám sát bởi Seiko Escrow
        </span>
      </div>

      {/* Shop Products Grid */}
      {shopProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {shopProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
          <p className="text-slate-400 text-sm">Chưa có sản phẩm nào trong phân loại này của gian hàng.</p>
        </div>
      )}
    </div>
  );
}
