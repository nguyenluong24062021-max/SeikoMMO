'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { DisputeDto, DisputeStatus } from '@repo/shared';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  ZapIcon,
} from '@/components/icons';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const formatDate = (dateStr: any) => {
  try {
    return new Date(dateStr).toLocaleString('vi-VN');
  } catch {
    return String(dateStr);
  }
};

const DISPUTE_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
    description: string;
  }
> = {
  OPEN: {
    label: 'Đang mở',
    color: 'text-amber-400',
    bg: 'bg-amber-950/30',
    border: 'border-amber-500/40',
    icon: <ClockIcon size={14} />,
    description: 'Khiếu nại đã được ghi nhận, đang chờ hỗ trợ viên xem xét.',
  },
  INVESTIGATING: {
    label: 'Đang điều tra',
    color: 'text-purple-400',
    bg: 'bg-purple-950/30',
    border: 'border-purple-500/40',
    icon: <RefreshCwIcon size={14} className="animate-spin" />,
    description: 'Admin đang điều tra và xem xét bằng chứng của khiếu nại.',
  },
  RESOLVED: {
    label: 'Đã giải quyết',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/30',
    border: 'border-emerald-500/40',
    icon: <CheckCircleIcon size={14} />,
    description: 'Khiếu nại đã được giải quyết, hoàn tiền (nếu có) đã được xử lý.',
  },
  REJECTED: {
    label: 'Bị từ chối',
    color: 'text-rose-400',
    bg: 'bg-rose-950/30',
    border: 'border-rose-500/40',
    icon: <AlertTriangleIcon size={14} />,
    description: 'Khiếu nại không được chấp nhận sau khi xem xét.',
  },
};

function DisputeStatusBadge({ status }: { status: string }) {
  const cfg = DISPUTE_STATUS_CONFIG[status] || {
    label: status,
    color: 'text-slate-400',
    bg: 'bg-slate-800',
    border: 'border-slate-700',
    icon: null,
    description: '',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${cfg.color} ${cfg.bg} ${cfg.border}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function DisputeCard({ dispute }: { dispute: DisputeDto }) {
  const cfg = DISPUTE_STATUS_CONFIG[dispute.status] || {};
  const isResolved = dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.REJECTED;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-lg hover:border-slate-700 transition-colors">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-mono">
                Dispute #{dispute.id.slice(0, 8).toUpperCase()}
              </span>
              <DisputeStatusBadge status={dispute.status} />
            </div>
            <p className="text-[11px] text-slate-500">
              Tạo lúc: {formatDate(dispute.createdAt)}
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <p>Mã đơn:</p>
            <p className="font-mono text-slate-300">#{dispute.orderId.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* Status description */}
        {(cfg as any).description && (
          <div
            className={`flex items-start gap-2 p-3 rounded-xl border ${(cfg as any).border} ${(cfg as any).bg} text-xs ${(cfg as any).color}`}
          >
            {(cfg as any).icon}
            <span>{(cfg as any).description}</span>
          </div>
        )}

        {/* Reason */}
        <div className="space-y-1">
          <p className="text-xs text-slate-400 font-medium">Lý do khiếu nại:</p>
          <p className="text-sm text-slate-200 leading-relaxed">{dispute.reason}</p>
        </div>

        {/* Resolution details for RESOLVED/REJECTED disputes - Always visible */}
        {isResolved && (
          <div
            className={`rounded-xl p-4 border space-y-3 ${
              dispute.status === DisputeStatus.RESOLVED
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-rose-950/20 border-rose-500/30'
            }`}
          >
            {/* Refund Amount */}
            {dispute.status === DisputeStatus.RESOLVED && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheckIcon size={18} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 mb-0.5">Số tiền hoàn:</p>
                  <p className="text-lg font-bold text-emerald-400 font-mono">
                    {dispute.refundAmount && dispute.refundAmount > 0
                      ? formatPrice(dispute.refundAmount)
                      : 'Không hoàn tiền'}
                  </p>
                </div>
              </div>
            )}

            {/* Resolution */}
            {dispute.resolution && (
              <div className="space-y-1">
                <p
                  className={`text-xs font-semibold ${
                    dispute.status === DisputeStatus.RESOLVED ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  Kết quả giải quyết:
                </p>
                <p className="text-sm text-white leading-relaxed">{dispute.resolution}</p>
              </div>
            )}

            {/* Admin Note */}
            {dispute.adminNote && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400">Ghi chú từ Admin:</p>
                <p className="text-sm text-slate-200 italic leading-relaxed">{dispute.adminNote}</p>
              </div>
            )}

            {/* Resolved timestamp */}
            {dispute.resolvedAt && (
              <div className="pt-2 border-t border-slate-700/50">
                <p className="text-[11px] text-slate-500">
                  Xử lý lúc: {formatDate(dispute.resolvedAt)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateDisputeForm({
  prefillOrderId,
  onSuccess,
}: {
  prefillOrderId?: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [orderId, setOrderId] = useState(prefillOrderId || '');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonTemplates = [
    'Key không hoạt động / đã được sử dụng trước đó.',
    'Không nhận được key sau khi thanh toán.',
    'Sản phẩm không đúng mô tả so với quảng cáo.',
    'Dịch vụ seeding không được thực hiện đúng số lượng cam kết.',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orderId.trim()) {
      setError('Vui lòng nhập mã đơn hàng.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 20) {
      setError('Lý do khiếu nại phải có ít nhất 20 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.disputes.create({
        orderId: orderId.trim(),
        reason: reason.trim(),
      });

      if (res.success && res.data) {
        toast({
          title: 'Khiếu nại đã được gửi!',
          description: `Dispute #${res.data.id.slice(0, 8)} đã được tạo. Chúng tôi sẽ xem xét trong 24 giờ.`,
          variant: 'success',
        });
        setOrderId('');
        setReason('');
        onSuccess();
      } else {
        throw new Error(res.message || 'Không thể tạo khiếu nại.');
      }
    } catch (err: any) {
      const msg = err.message || 'Có lỗi xảy ra khi gửi khiếu nại.';
      setError(msg);
      toast({
        title: 'Lỗi gửi khiếu nại',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 via-slate-900 to-slate-900 p-6 shadow-xl space-y-5">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
          <AlertTriangleIcon size={16} />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Tạo Khiếu Nại Mới</h2>
          <p className="text-xs text-slate-400">
            Chỉ áp dụng cho đơn hàng đã được giao (DELIVERED/COMPLETED)
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
          <AlertTriangleIcon size={14} className="flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Order ID input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            Mã đơn hàng (Order ID)
          </label>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Dán ID đơn hàng vào đây (UUID)"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-rose-500 transition-colors"
          />
          <p className="text-[11px] text-slate-500">
            Tìm Order ID trong trang{' '}
            <Link href="/orders" className="text-emerald-400 hover:underline">
              Đơn hàng của tôi
            </Link>
            .
          </p>
        </div>

        {/* Reason input */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Lý do khiếu nại <span className="text-rose-400">*</span>
          </label>

          {/* Quick reason templates */}
          <div className="flex flex-wrap gap-2">
            {reasonTemplates.map((tmpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setReason(tmpl)}
                className="px-2.5 py-1 rounded-lg text-[11px] border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-600 transition-colors text-left"
              >
                {tmpl.slice(0, 40)}...
              </button>
            ))}
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Mô tả chi tiết vấn đề bạn gặp phải (tối thiểu 20 ký tự)..."
            rows={4}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors resize-none"
          />
          <p className={`text-[11px] ${reason.length < 20 ? 'text-rose-400' : 'text-slate-500'}`}>
            {reason.length}/20 ký tự tối thiểu
          </p>
        </div>

        {/* Policy note */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300 flex items-center gap-1">
            <ShieldCheckIcon size={12} className="text-emerald-400" />
            Chính sách giải quyết khiếu nại:
          </p>
          <ul className="space-y-0.5 list-disc list-inside pl-1">
            <li>Thời gian xem xét: tối đa 24 giờ làm việc.</li>
            <li>Đơn hàng sẽ bị đánh dấu DISPUTED trong khi điều tra.</li>
            <li>Hoàn tiền toàn bộ hoặc một phần tùy theo kết quả.</li>
          </ul>
        </div>

        <Button
          type="submit"
          variant="neon"
          size="md"
          disabled={isSubmitting}
          className="w-full font-bold"
        >
          <ZapIcon size={16} />
          {isSubmitting ? 'Đang gửi khiếu nại...' : 'Gửi Khiếu Nại'}
        </Button>
      </form>
    </div>
  );
}

export default function DisputesClient() {
  const searchParams = useSearchParams();
  const prefillOrderId = searchParams.get('orderId') || '';

  const { user, openAuthModal } = useAuth();
  const { toast } = useToast();

  const [disputes, setDisputes] = useState<DisputeDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(!!prefillOrderId);
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'ALL'>('ALL');

  const loadDisputes = useCallback(async () => {
    try {
      const res = await api.disputes.getAll();
      if (res.success && res.data) {
        setDisputes(res.data);
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi tải danh sách khiếu nại',
        description: err.message || 'Không thể kết nối API.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      loadDisputes();
    } else {
      setIsLoading(false);
    }
  }, [user, loadDisputes]);

  const handleDisputeCreated = () => {
    setShowCreateForm(false);
    setIsLoading(true);
    loadDisputes();
  };

  const filteredDisputes =
    statusFilter === 'ALL'
      ? disputes
      : disputes.filter((d) => d.status === statusFilter);

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-emerald-400 flex items-center gap-1">
          <ArrowLeftIcon size={14} /> Trang chủ
        </Link>
        <span>/</span>
        <Link href="/orders" className="hover:text-emerald-400">
          Đơn hàng
        </Link>
        <span>/</span>
        <span className="text-slate-200 font-medium">Lịch Sử Khiếu Nại</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <AlertTriangleIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Lịch Sử Khiếu Nại</h1>
            <p className="text-xs text-slate-400">
              Theo dõi trạng thái tranh chấp và hoàn tiền
            </p>
          </div>
        </div>

        {user && (
          <Button
            variant={showCreateForm ? 'outline' : 'neon'}
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-xs flex items-center gap-1.5"
          >
            <AlertTriangleIcon size={14} />
            {showCreateForm ? 'Đóng form khiếu nại' : 'Tạo Khiếu Nại Mới'}
          </Button>
        )}
      </div>

      {!user ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangleIcon size={28} />
          </div>
          <h2 className="text-xl font-bold text-white">Bạn chưa đăng nhập</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Vui lòng đăng nhập để xem và tạo khiếu nại đơn hàng.
          </p>
          <Button variant="neon" size="md" onClick={() => openAuthModal('LOGIN')}>
            Đăng Nhập Ngay
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Create form */}
          {showCreateForm && (
            <CreateDisputeForm
              prefillOrderId={prefillOrderId}
              onSuccess={handleDisputeCreated}
            />
          )}

          {/* Disputes list header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white">
              Danh Sách Khiếu Nại{' '}
              <span className="text-slate-400 font-normal">({disputes.length})</span>
            </h2>

            {/* Status filter */}
            <div className="flex gap-2 flex-wrap">
              {(['ALL', ...Object.values(DisputeStatus)] as const).map((s) => {
                const cfg = s !== 'ALL' ? DISPUTE_STATUS_CONFIG[s] : null;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                      statusFilter === s
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s === 'ALL' ? 'Tất cả' : cfg?.label || s}
                    {s !== 'ALL' && (
                      <span className="ml-1 text-slate-500">
                        ({disputes.filter((d) => d.status === s).length})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 h-32 animate-pulse"
                />
              ))}
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <ShieldCheckIcon size={24} />
              </div>
              <p className="text-base font-semibold text-white">
                {statusFilter === 'ALL'
                  ? 'Chưa có khiếu nại nào'
                  : `Không có khiếu nại ở trạng thái "${DISPUTE_STATUS_CONFIG[statusFilter]?.label || statusFilter}"`}
              </p>
              <p className="text-xs text-slate-400">
                {statusFilter === 'ALL'
                  ? 'Tất cả giao dịch của bạn đều suôn sẻ. Nếu gặp vấn đề, hãy tạo khiếu nại.'
                  : 'Thử xem các trạng thái khác.'}
              </p>
              {statusFilter === 'ALL' && !showCreateForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateForm(true)}
                  className="text-xs"
                >
                  Tạo Khiếu Nại Đầu Tiên
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDisputes.map((dispute) => (
                <DisputeCard key={dispute.id} dispute={dispute} />
              ))}
            </div>
          )}

          {/* Refresh button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(true);
                loadDisputes();
              }}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCwIcon size={14} />
              Làm mới danh sách
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
