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
  TicketIcon,
  RefreshCwIcon,
  PlusIcon,
} from '@/components/icons';
import { VoucherDto } from '@repo/shared';

export default function SellerVouchersPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<VoucherDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    value: '',
    maxUses: '1',
    expiresAt: '',
    shopId: '',
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'SELLER')) {
      router.push('/');
      return;
    }

    if (user && user.role === 'SELLER') {
      loadVouchers();
    }
  }, [user, isLoading, router]);

  const loadVouchers = () => {
    setLoading(true);
    api.seller
      .getMyVouchers()
      .then((res) => {
        if (res.success && res.data) {
          setVouchers(res.data);
        }
      })
      .catch(() => {
        // Failed to load
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const value = parseInt(formData.value);
      const maxUses = parseInt(formData.maxUses);

      if (formData.type === 'PERCENTAGE' && (value < 1 || value > 100)) {
        toast({ description: 'Giá trị phần trăm phải từ 1-100', variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      if (formData.type === 'FIXED_AMOUNT' && value < 1000) {
        toast({ description: 'Số tiền giảm tối thiểu 1,000 VND', variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      const payload: any = {
        code: formData.code.toUpperCase(),
        type: formData.type,
        value,
        maxUses,
      };

      if (formData.expiresAt) {
        payload.expiresAt = new Date(formData.expiresAt).toISOString();
      }

      if (formData.shopId) {
        payload.shopId = formData.shopId;
      }

      const res = await api.seller.createVoucher(payload);

      if (res.success) {
        toast({ description: 'Tạo voucher thành công!', variant: 'success' });
        setShowCreateForm(false);
        setFormData({
          code: '',
          type: 'PERCENTAGE',
          value: '',
          maxUses: '1',
          expiresAt: '',
          shopId: '',
        });
        loadVouchers();
      }
    } catch (error: any) {
      toast({ description: error.message || 'Có lỗi xảy ra', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (code: string, currentActive: boolean) => {
    try {
      const res = await api.seller.updateVoucher(code, {
        isActive: !currentActive,
      });

      if (res.success) {
        toast({ description: `Đã ${!currentActive ? 'bật' : 'tắt'} voucher`, variant: 'success' });
        loadVouchers();
      }
    } catch (error: any) {
      toast({ description: error.message || 'Có lỗi xảy ra', variant: 'destructive' });
    }
  };

  if (isLoading || (user && user.role !== 'SELLER')) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-slate-400">Đang tải...</div>
      </div>
    );
  }

  const formatDate = (date: any) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

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
            <h1 className="text-3xl font-bold text-white">Quản lý Voucher</h1>
            <p className="text-slate-400 text-sm mt-1">Tạo và quản lý mã giảm giá cho shop</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadVouchers}>
            <RefreshCwIcon size={16} />
          </Button>
          <Button variant="neon" size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
            <PlusIcon size={16} />
            <span className="ml-2">Tạo voucher</span>
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-slate-900/90 rounded-2xl border border-emerald-500/30 p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Tạo voucher mới</h2>
          <form onSubmit={handleCreateVoucher} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 block mb-2">Mã voucher *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="VD: SUMMER2024"
                  required
                  className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 focus:border-emerald-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-2">Loại giảm giá *</label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as any })
                  }
                  className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="PERCENTAGE">Phần trăm (%)</option>
                  <option value="FIXED_AMOUNT">Số tiền cố định (VND)</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-2">
                  Giá trị * {formData.type === 'PERCENTAGE' ? '(1-100%)' : '(VND)'}
                </label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === 'PERCENTAGE' ? '10' : '50000'}
                  required
                  min={formData.type === 'PERCENTAGE' ? 1 : 1000}
                  max={formData.type === 'PERCENTAGE' ? 100 : undefined}
                  className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-2">Số lần sử dụng tối đa *</label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder="1"
                  required
                  min={1}
                  className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-2">Ngày hết hạn (tùy chọn)</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-2">Shop ID (tùy chọn)</label>
                <input
                  type="text"
                  value={formData.shopId}
                  onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                  placeholder="Để trống = áp dụng toàn sàn"
                  className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" variant="neon" disabled={submitting} className="flex-1">
                {submitting ? 'Đang tạo...' : 'Tạo voucher'}
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

      {/* Vouchers List */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Đang tải vouchers...</div>
      ) : vouchers.length === 0 ? (
        <div className="text-center text-slate-400 py-12 bg-slate-900/50 rounded-2xl border border-slate-700">
          <TicketIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p>Chưa có voucher nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {vouchers.map((voucher) => (
            <div
              key={voucher.id}
              className={`bg-slate-900/90 rounded-2xl border p-6 shadow-lg ${
                voucher.isActive ? 'border-emerald-500/30' : 'border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <code className="text-xl font-bold font-mono text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/30">
                      {voucher.code}
                    </code>
                    <Badge
                      className={`text-xs ${
                        voucher.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                      }`}
                    >
                      {voucher.isActive ? 'Đang hoạt động' : 'Đã tắt'}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-400">
                    {voucher.type === 'PERCENTAGE'
                      ? `Giảm ${voucher.value}%`
                      : `Giảm ${new Intl.NumberFormat('vi-VN').format(voucher.value)} VND`}
                  </div>
                </div>
                <Button
                  variant={voucher.isActive ? 'outline' : 'neon'}
                  size="sm"
                  onClick={() => handleToggleActive(voucher.code, voucher.isActive)}
                >
                  {voucher.isActive ? 'Tắt' : 'Bật'}
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Đã dùng:</span>
                  <span className="ml-2 text-white font-semibold">
                    {voucher.usedCount} / {voucher.maxUses}
                  </span>
                </div>
                {voucher.expiresAt && (
                  <div>
                    <span className="text-slate-400">Hết hạn:</span>
                    <span className="ml-2 text-white">{formatDate(voucher.expiresAt)}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400">Ngày tạo:</span>
                  <span className="ml-2 text-white">{formatDate(voucher.createdAt)}</span>
                </div>
                {voucher.shopId && (
                  <div>
                    <span className="text-slate-400">Shop ID:</span>
                    <span className="ml-2 text-white font-mono">{voucher.shopId}</span>
                  </div>
                )}
              </div>

              {voucher.usedCount >= voucher.maxUses && (
                <div className="mt-3 p-2 bg-rose-500/10 rounded-lg border border-rose-500/30">
                  <div className="text-xs text-rose-400">
                    ⚠️ Voucher đã hết lượt sử dụng
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
