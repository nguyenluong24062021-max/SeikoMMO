'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBagIcon,
  WalletIcon,
  SearchIcon,
  StoreIcon,
  ZapIcon,
  PackageIcon,
  AlertTriangleIcon,
} from './icons';
import { useAuth } from '@/lib/auth-context';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export const Navbar: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const { user, wallet, openAuthModal, logout } = useAuth();

  const formattedBalance = wallet
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(wallet.balance)
    : '0 ₫';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      {/* Top micro banner */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-cyan-950/70 py-1 px-4 text-center text-xs font-medium text-emerald-400 border-b border-emerald-500/20 flex items-center justify-center gap-2">
        <ZapIcon size={14} className="animate-pulse text-emerald-400" />
        <span>Sàn giao dịch tài nguyên & Tool MMO #1 Việt Nam • Hệ thống trả key tự động 24/7 tức thì</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              S
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
                SEIKO <span className="text-emerald-400 font-mono text-sm px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">MMO</span>
              </span>
              <span className="block text-[10px] text-slate-400 -mt-1 font-mono tracking-wider">MARKETPLACE</span>
            </div>
          </Link>

          {/* Shopee-style Search bar */}
          <div className="flex-1 max-w-2xl hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm tool auto, license win 11, proxy, acc gmail, dịch vụ tiktok..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full bg-slate-900/90 text-sm text-slate-100 placeholder-slate-500 rounded-lg pl-10 pr-24 py-2 border border-slate-700/80 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
              />
              <SearchIcon size={18} className="absolute left-3.5 top-2.5 text-slate-400" />
              <button className="absolute right-1.5 top-1 bottom-1 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded transition-colors flex items-center gap-1">
                Tìm kiếm
              </button>
            </div>
          </div>

          {/* Action Navigation */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Shop Page link */}
            <Link
              href="/shop"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-900"
            >
              <StoreIcon size={18} className="text-emerald-400" />
              <span className="hidden sm:inline">Kênh Người Bán</span>
            </Link>

            {/* Orders link - visible when logged in */}
            {user && (
              <Link
                href="/orders"
                className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-900"
              >
                <PackageIcon size={18} className="text-cyan-400" />
                <span className="hidden lg:inline">Đơn Hàng</span>
              </Link>
            )}

            {/* Disputes link - visible when logged in */}
            {user && (
              <Link
                href="/disputes"
                className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-rose-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-900"
              >
                <AlertTriangleIcon size={18} className="text-rose-400" />
                <span className="hidden lg:inline">Khiếu Nại</span>
              </Link>
            )}

            {/* Wallet link */}
            <Link
              href="/wallet"
              className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800/90 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-all group"
            >
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <WalletIcon size={14} />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400 leading-none">Ví số dư</p>
                <p className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300 font-mono">
                  {formattedBalance}
                </p>
              </div>
            </Link>

            {/* User Profile / Login Button */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/wallet"
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold border border-emerald-500/30">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-semibold text-white leading-tight truncate max-w-[100px]">
                      {user.name || user.email}
                    </p>
                    <Badge variant={user.role === 'SELLER' ? 'digital' : 'tool'} className="text-[9px] px-1 py-0 h-3.5">
                      {user.role}
                    </Badge>
                  </div>
                </Link>
                <button
                  onClick={logout}
                  title="Đăng xuất"
                  className="text-xs text-slate-400 hover:text-rose-400 p-1.5 rounded hover:bg-slate-900 transition-colors"
                >
                  Thoát
                </button>
              </div>
            ) : (
              <Button
                variant="neon"
                size="sm"
                onClick={() => openAuthModal('LOGIN')}
                className="text-xs font-bold px-3 py-1.5 h-8"
              >
                Đăng Nhập
              </Button>
            )}

            {/* Cart / Checkout Quick link */}
            <Link
              href="/checkout"
              className="relative p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
              title="Thanh toán"
            >
              <ShoppingBagIcon size={20} />
            </Link>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="pb-3 md:hidden">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm tool auto, key, proxy..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full bg-slate-900 text-sm text-slate-100 placeholder-slate-500 rounded-lg pl-10 pr-4 py-2 border border-slate-800 focus:border-emerald-500 focus:outline-none"
            />
            <SearchIcon size={18} className="absolute left-3.5 top-2.5 text-slate-400" />
          </div>
        </div>
      </div>
    </header>
  );
};

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
              S
            </div>
            <span className="text-lg font-bold text-white">SEIKO MMO</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Nền tảng giao dịch sản phẩm số & công cụ MMO tự động hóa an toàn, minh bạch, bảo chứng giao dịch với hệ thống Escrow và trả key tức thời.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wider">Danh Mục</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/" className="hover:text-emerald-400">Công cụ tự động (Tools)</Link></li>
            <li><Link href="/" className="hover:text-emerald-400">Tài nguyên số & Key bản quyền (Digital)</Link></li>
            <li><Link href="/" className="hover:text-emerald-400">Dịch vụ tăng tương tác (Seeding)</Link></li>
            <li><Link href="/" className="hover:text-emerald-400">Proxy dân cư & Datacenter</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wider">Hỗ Trợ Khách Hàng</h4>
          <ul className="space-y-2 text-xs">
            <li><span className="text-slate-400">Hotline/Tele: @seikommo_support</span></li>
            <li><span className="text-slate-400">Chính sách hoàn tiền & Bảo hành</span></li>
            <li><span className="text-slate-400">Quy chuẩn kiểm duyệt Key tự động</span></li>
            <li><span className="text-slate-400">Tài liệu API cho Seller</span></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wider">Thanh Toán & Bảo Mật</h4>
          <p className="text-xs text-slate-400 mb-2">Hỗ trợ ví nội bộ, Chuyển khoản ngân hàng VietQR, Thẻ cào, USDT TRC20/BEP20.</p>
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[10px] text-emerald-400 font-mono">VietQR</span>
            <span className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[10px] text-cyan-400 font-mono">USDT</span>
            <span className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[10px] text-purple-400 font-mono">SeikoWallet</span>
          </div>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
        © 2026 Seiko MMO Platform. All rights reserved. Made for high-frequency digital commerce.
      </div>
    </footer>
  );
};
