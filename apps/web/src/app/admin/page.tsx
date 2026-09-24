'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  PackageIcon,
  WalletIcon,
  ClockIcon,
  ZapIcon,
} from '@/components/icons';

interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  pendingPayouts: number;
  pendingPayoutsAmount: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
      return;
    }

    if (user && user.role === 'ADMIN') {
      api.admin
        .getStats()
        .then((res) => {
          if (res.success && res.data) {
            setStats(res.data);
          }
        })
        .catch(() => {
          // Failed to load stats
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user, isLoading, router]);

  if (isLoading || (user && user.role !== 'ADMIN')) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-slate-400">Đang tải...</div>
      </div>
    );
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Quản lý hệ thống Seiko MMO</p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm">
            Về trang chủ
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Đang tải thống kê...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Orders */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <PackageIcon size={24} className="text-emerald-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wide">Tổng đơn hàng</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-slate-400 mt-2">Tất cả đơn hàng trong hệ thống</p>
          </div>

          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <ZapIcon size={24} className="text-cyan-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wide">Tổng doanh thu</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatPrice(stats?.totalRevenue || 0)}</div>
            <p className="text-xs text-slate-400 mt-2">Tổng giá trị đơn hàng</p>
          </div>

          {/* Pending Payouts Count */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <ClockIcon size={24} className="text-yellow-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wide">Chờ duyệt rút tiền</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats?.pendingPayouts || 0}</div>
            <p className="text-xs text-slate-400 mt-2">Yêu cầu đang chờ xử lý</p>
          </div>

          {/* Pending Payouts Amount */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <WalletIcon size={24} className="text-purple-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wide">Số tiền chờ rút</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatPrice(stats?.pendingPayoutsAmount || 0)}</div>
            <p className="text-xs text-slate-400 mt-2">Tổng giá trị chờ duyệt</p>
          </div>
        </div>
      )}

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <Link
          href="/admin/orders"
          className="group bg-slate-900/90 rounded-2xl p-8 border border-slate-700 hover:border-emerald-500/50 transition-all shadow-lg hover:shadow-emerald-500/10"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <PackageIcon size={32} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                Quản lý đơn hàng
              </h3>
              <p className="text-sm text-slate-400">Xem và lọc tất cả đơn hàng</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/payouts"
          className="group bg-slate-900/90 rounded-2xl p-8 border border-slate-700 hover:border-cyan-500/50 transition-all shadow-lg hover:shadow-cyan-500/10"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
              <WalletIcon size={32} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                Duyệt rút tiền
              </h3>
              <p className="text-sm text-slate-400">Xử lý yêu cầu rút tiền từ seller</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/disputes"
          className="group bg-slate-900/90 rounded-2xl p-8 border border-slate-700 hover:border-rose-500/50 transition-all shadow-lg hover:shadow-rose-500/10"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
              <ZapIcon size={32} className="text-rose-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-rose-400 transition-colors">
                Quản lý khiếu nại
              </h3>
              <p className="text-sm text-slate-400">Xử lý tranh chấp và hoàn tiền</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
