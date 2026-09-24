'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import {
  ArrowLeftIcon,
  WalletIcon,
  RefreshCwIcon,
} from '@/components/icons';
import { PayoutDto } from '@repo/shared';

export default function SellerPayoutsPage() {
  const router = useRouter();
  const { user, wallet, isLoading, refreshWallet } = useAuth();
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<PayoutDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'SELLER')) {
      router.push('/');
      return;
    }

    if (user && user.role === 'SELLER') {
      loadPayouts();
    }
  }, [user, isLoading, router]);

  const loadPayouts = () => {
    setLoading(true);
    api.seller
      .getMyPayouts()
      .then((res) => {
        if (res.success && res.data) {
          setPayouts(res.data);
        }
      })
      .catch(() => {
        // Failed to load
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleCreatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const amount = parseInt(formData.amount);

      if (amount < 10000) {
        toast({ description: 'Số tiền rút tối thiểu 10,000 VND', variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      if (wallet && amount > wallet.balance) {
        toast({ description: 'Số dư không đủ', variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      const payload: any = {
        amount,
      };

      if (formData.description) {
        payload.description = formData.description;
      }

      const res = await api.seller.createPayout(payload);

      if (res.success) {
        toast({ description: 'Tạo yêu cầu rút tiền thành công!', variant: 'success' });
        setShowCreateForm(false);
        setFormData({
          amount: '',
          description: '',
        });
        loadPayouts();
        refreshWallet();
      }
    } catch (error: any) {
      toast({ description: error.message || 'Có lỗi xảy ra', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || (user && user.role !== 'SELLER')) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-slate-400">Đang tải...</div>
      </div>
    );
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const formatDate = (date: any) => {
    return new Date(date).toLocaleString('vi-VN');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    }
  };

  const availableBalance = wallet?.balance || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Rút tiền</h1>
            <p className="text-slate-400 text-sm mt-1">Tạo yêu cầu rút tiền về tài khoản</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadPayouts}>
          <RefreshCwIcon size={16} />
        </Button>
      </div>

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-emerald-900/50 to-cyan-900/50 rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400 mb-1">Số dư khả dụng</div>
            <div className="text-4xl font-bold text-white">{formatPrice(availableBalance)}</div>
          </div>
          <div className="w-16 h-16 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <WalletIcon size={32} className="text-emerald-400" />
          </div>
        </div>
        {!showCreateForm && (
          <Button
            variant="neon"
            size="sm"
            onClick={() => setShowCreateForm(true)}
            className="mt-4"
            disabled={availableBalance < 10000}
          >
            Tạo yêu cầu rút tiền
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-slate-900/90 rounded-2xl border border-emerald-500/30 p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Tạo yêu cầu rút tiền</h2>
          <form onSubmit={handleCreatePayout} className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 block mb-2">
                Số tiền rút (VND) * (Tối thiểu 10,000đ)
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="100000"
                required
                min={10000}
                max={availableBalance}
                className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 focus:border-emerald-500 focus:outline-none"
              />
              <div className="text-xs text-slate-400 mt-1">
                Số dư khả dụng: {formatPrice(availableBalance)}
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-2">Lý do rút (tùy chọn)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="VD: Rút lợi nhuận tháng 9..."
                className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 focus:border-emerald-500 focus:outline-none resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" variant="neon" disabled={submitting} className="flex-1">
                {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="flex-1"
              >
                Hủy
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Payouts History */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Lịch sử rút tiền</h2>
        {loading ? (
          <div className="text-center text-slate-400 py-12">Đang tải lịch sử...</div>
        ) : payouts.length === 0 ? (
          <div className="text-center text-slate-400 py-12 bg-slate-900/50 rounded-2xl border border-slate-700">
            <WalletIcon size={48} className="mx-auto mb-4 opacity-50" />
            <p>Chưa có yêu cầu rút tiền nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payouts.map((payout) => (
              <div
                key={payout.id}
                className="bg-slate-900/90 rounded-2xl border border-slate-700 p-6 shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <code className="text-sm font-mono text-slate-400 bg-slate-800 px-3 py-1 rounded-lg">
                      {payout.id}
                    </code>
                    <Badge className={`ml-2 text-xs ${getStatusColor(payout.status)}`}>
                      {payout.status === 'PENDING'
                        ? 'Đang chờ duyệt'
                        : payout.status === 'COMPLETED'
                        ? 'Đã duyệt'
                        : 'Đã từ chối'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{formatPrice(payout.amount)}</div>
                  </div>
                </div>

                {payout.description && (
                  <div className="mb-3 p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-xs text-slate-400 mb-1">Lý do:</div>
                    <div className="text-sm text-white">{payout.description}</div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400">Ngày tạo:</span>
                    <span className="ml-2 text-white">{formatDate(payout.createdAt)}</span>
                  </div>
                  {payout.resolvedAt && (
                    <div>
                      <span className="text-slate-400">Ngày xử lý:</span>
                      <span className="ml-2 text-white">{formatDate(payout.resolvedAt)}</span>
                    </div>
                  )}
                  {payout.resolvedBy && (
                    <div>
                      <span className="text-slate-400">Người duyệt:</span>
                      <span className="ml-2 text-white font-mono">{payout.resolvedBy}</span>
                    </div>
                  )}
                </div>

                {payout.adminNote && (
                  <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Ghi chú từ admin:</div>
                    <div className="text-sm text-white">{payout.adminNote}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
