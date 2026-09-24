'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { AffiliateStatsDto } from '@repo/shared';
import {
  CopyIcon,
  CheckCircleIcon,
  WalletIcon,
  RefreshCwIcon,
  ZapIcon,
  ArrowLeftIcon,
} from '@/components/icons';

export default function AffiliatePage() {
  const { user, openAuthModal } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<AffiliateStatsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    loadStats();
  }, [user]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const res = await api.affiliate.getStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi tải thống kê',
        description: err.message || 'Không thể kết nối API',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: 'Đã copy!',
      description: `${field} đã được sao chép vào clipboard`,
      variant: 'success',
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const formatDate = (date: any) => {
    try {
      return new Date(date).toLocaleDateString('vi-VN');
    } catch {
      return String(date);
    }
  };

  const referralLink = user?.referralCode
    ? `${window.location.origin}/auth?ref=${user.referralCode}`
    : '';

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/" className="hover:text-emerald-400 flex items-center gap-1">
            <ArrowLeftIcon size={14} /> Trang chủ
          </Link>
          <span>/</span>
          <span className="text-slate-200 font-medium">Chương trình Affiliate</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <WalletIcon size={28} />
          </div>
          <h2 className="text-xl font-bold text-white">Bạn chưa đăng nhập</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Vui lòng đăng nhập để xem thông tin affiliate và link giới thiệu của bạn.
          </p>
          <Button variant="neon" size="md" onClick={() => openAuthModal('LOGIN')}>
            Đăng Nhập Ngay
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-emerald-400 flex items-center gap-1">
          <ArrowLeftIcon size={14} /> Trang chủ
        </Link>
        <span>/</span>
        <span className="text-slate-200 font-medium">Chương trình Affiliate</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <WalletIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Chương Trình Affiliate</h1>
            <p className="text-xs text-slate-400">Kiếm hoa hồng từ người bạn giới thiệu</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadStats} disabled={isLoading}>
          <RefreshCwIcon size={14} className={isLoading ? 'animate-spin' : ''} />
          Làm mới
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">
          <RefreshCwIcon size={32} className="mx-auto mb-4 animate-spin" />
          <p>Đang tải thống kê...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Referral Code & Link */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 p-6 space-y-4">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
              Link Giới Thiệu Của Bạn
            </h2>

            {/* Referral Code */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Mã giới thiệu:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={stats?.referralCode || ''}
                  readOnly
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-lg font-bold focus:outline-none focus:border-emerald-500"
                />
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleCopy(stats?.referralCode || '', 'Mã giới thiệu')}
                  className="px-4"
                >
                  {copiedField === 'Mã giới thiệu' ? (
                    <CheckCircleIcon size={16} className="text-emerald-400" />
                  ) : (
                    <CopyIcon size={16} />
                  )}
                </Button>
              </div>
            </div>

            {/* Referral Link */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Link giới thiệu:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
                <Button
                  variant="neon"
                  size="md"
                  onClick={() => handleCopy(referralLink, 'Link giới thiệu')}
                  className="px-4"
                >
                  {copiedField === 'Link giới thiệu' ? (
                    <CheckCircleIcon size={16} />
                  ) : (
                    <CopyIcon size={16} />
                  )}
                  Copy Link
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Chia sẻ link này để bạn bè đăng ký qua giới thiệu của bạn
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Referrals */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Tổng người giới thiệu</span>
                <ZapIcon size={16} className="text-cyan-400" />
              </div>
              <p className="text-3xl font-black text-white font-mono">
                {stats?.totalReferrals || 0}
              </p>
              <p className="text-xs text-slate-500">Người đã đăng ký qua link của bạn</p>
            </div>

            {/* Total Commission */}
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-900 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Tổng hoa hồng</span>
                <WalletIcon size={16} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400 font-mono">
                {formatPrice(stats?.totalCommission || 0)}
              </p>
              <p className="text-xs text-slate-500">Đã nhận về ví của bạn</p>
            </div>

            {/* Active Users */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Người đã mua hàng</span>
                <CheckCircleIcon size={16} className="text-amber-400" />
              </div>
              <p className="text-3xl font-black text-white font-mono">
                {stats?.referredUsers.filter((u) => u.hasOrdered).length || 0}
              </p>
              <p className="text-xs text-slate-500">
                / {stats?.totalReferrals || 0} người đã đăng ký
              </p>
            </div>
          </div>

          {/* Referred Users Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">
                Danh Sách Người Giới Thiệu ({stats?.referredUsers.length || 0})
              </h2>
            </div>

            {!stats?.referredUsers || stats.referredUsers.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <p className="text-sm">Chưa có ai đăng ký qua link giới thiệu của bạn</p>
                <p className="text-xs mt-2">Chia sẻ link để bắt đầu kiếm hoa hồng!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-950/50">
                    <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Tên</th>
                      <th className="px-6 py-3">Ngày tham gia</th>
                      <th className="px-6 py-3">Trạng thái</th>
                      <th className="px-6 py-3 text-right">Hoa hồng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {stats.referredUsers.map((user, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-white font-mono">{user.email}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">{user.name}</td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {formatDate(user.joinedAt)}
                        </td>
                        <td className="px-6 py-4">
                          {user.hasOrdered ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircleIcon size={12} />
                              Đã mua hàng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                              Chưa mua
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`text-sm font-mono font-bold ${
                              user.commissionEarned > 0 ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            {formatPrice(user.commissionEarned)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Cách Thức Hoạt Động</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Chia sẻ link</p>
                  <p className="text-xs text-slate-400">
                    Gửi link giới thiệu của bạn cho bạn bè, trên mạng xã hội hoặc blog
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Họ đăng ký & mua hàng</p>
                  <p className="text-xs text-slate-400">
                    Khi người được giới thiệu mua đơn hàng đầu tiên, bạn nhận hoa hồng
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Nhận tiền vào ví</p>
                  <p className="text-xs text-slate-400">
                    Hoa hồng tự động chuyển vào ví, có thể rút về ngân hàng bất cứ lúc nào
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
