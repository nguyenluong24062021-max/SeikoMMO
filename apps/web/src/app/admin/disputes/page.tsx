'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  XIcon,
} from '@/components/icons';
import { DisputeDto, DisputeStatus, OrderDto, UpdateDisputeDto, ApiResponse } from '@repo/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper function to call PATCH /disputes/:id/resolve
const resolveDispute = async (disputeId: string, dto: UpdateDisputeDto): Promise<ApiResponse<DisputeDto>> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('seiko_access_token') : null;
  const res = await fetch(`${API_BASE_URL}/disputes/${disputeId}/resolve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(dto),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Không thể xử lý khiếu nại');
  }
  
  return res.json();
};

// Helper function to get order by ID (admin endpoint)
const getOrderById = async (orderId: string): Promise<ApiResponse<OrderDto>> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('seiko_access_token') : null;
  const res = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  
  if (!res.ok) {
    throw new Error('Không thể tải thông tin đơn hàng');
  }
  
  return res.json();
};

const DISPUTE_STATUSES = ['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'REJECTED'];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'OPEN':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'INVESTIGATING':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    case 'RESOLVED':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'REJECTED':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'OPEN':
      return <ClockIcon size={14} />;
    case 'INVESTIGATING':
      return <RefreshCwIcon size={14} className="animate-spin" />;
    case 'RESOLVED':
      return <CheckCircleIcon size={14} />;
    case 'REJECTED':
      return <XIcon size={14} />;
    default:
      return <AlertTriangleIcon size={14} />;
  }
};

interface DisputeWithOrder extends DisputeDto {
  order?: OrderDto;
}

function ResolveDisputeModal({
  dispute,
  onClose,
  onSuccess,
}: {
  dispute: DisputeWithOrder;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [resolution, setResolution] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [resolveAs, setResolveAs] = useState<DisputeStatus.RESOLVED | DisputeStatus.REJECTED>(DisputeStatus.RESOLVED);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resolution.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập kết quả giải quyết',
        variant: 'destructive',
      });
      return;
    }

    const refundVal = refundAmount.trim() ? parseFloat(refundAmount) : 0;
    if (resolveAs === 'RESOLVED' && refundVal < 0) {
      toast({
        title: 'Lỗi',
        description: 'Số tiền hoàn phải >= 0',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resolveDispute(dispute.id, {
        status: resolveAs,
        resolution: resolution.trim(),
        refundAmount: refundVal || undefined,
        adminNote: adminNote.trim() || undefined,
      });

      if (res.success) {
        toast({
          title: 'Thành công',
          description: `Đã ${resolveAs === 'RESOLVED' ? 'giải quyết' : 'từ chối'} khiếu nại`,
          variant: 'success',
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(res.message || 'Không thể xử lý khiếu nại');
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi',
        description: err.message || 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Xử lý khiếu nại</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <XIcon size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Dispute Info */}
          <div className="bg-slate-950/50 rounded-xl p-4 space-y-2 text-sm">
            <div>
              <span className="text-slate-400">Dispute ID:</span>
              <span className="ml-2 text-white font-mono">#{dispute.id.slice(0, 8)}</span>
            </div>
            <div>
              <span className="text-slate-400">Order ID:</span>
              <span className="ml-2 text-white font-mono">#{dispute.orderId.slice(0, 8)}</span>
            </div>
            <div>
              <span className="text-slate-400">User ID:</span>
              <span className="ml-2 text-white font-mono">{dispute.userId.slice(0, 8)}</span>
            </div>
            {dispute.order && (
              <div>
                <span className="text-slate-400">Giá trị đơn:</span>
                <span className="ml-2 text-emerald-400 font-semibold">
                  {formatPrice(dispute.order.totalAmount)}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-800">
              <p className="text-slate-400 text-xs mb-1">Lý do khiếu nại:</p>
              <p className="text-white">{dispute.reason}</p>
            </div>
          </div>

          {/* Resolve Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Resolve As */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Quyết định
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResolveAs(DisputeStatus.RESOLVED)}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    resolveAs === DisputeStatus.RESOLVED
                      ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                      : 'bg-slate-800 border-2 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <CheckCircleIcon size={16} className="inline mr-2" />
                  Chấp nhận & Giải quyết
                </button>
                <button
                  type="button"
                  onClick={() => setResolveAs(DisputeStatus.REJECTED)}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    resolveAs === DisputeStatus.REJECTED
                      ? 'bg-rose-500/20 border-2 border-rose-500 text-rose-400'
                      : 'bg-slate-800 border-2 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <XIcon size={16} className="inline mr-2" />
                  Từ chối khiếu nại
                </button>
              </div>
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Kết quả giải quyết <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Mô tả kết quả sau khi xem xét (hiển thị cho buyer)..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              />
            </div>

            {/* Refund Amount */}
            {resolveAs === DisputeStatus.RESOLVED && (
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Số tiền hoàn (VND)
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1000"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Để trống hoặc 0 nếu không hoàn tiền
                </p>
              </div>
            )}

            {/* Admin Note */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Ghi chú nội bộ (tùy chọn)
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Ghi chú cho admin, hiển thị cho buyer..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="neon"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Đang xử lý...'
                  : resolveAs === DisputeStatus.RESOLVED
                  ? 'Xác nhận giải quyết'
                  : 'Xác nhận từ chối'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function DisputeCard({
  dispute,
  onResolveClick,
}: {
  dispute: DisputeWithOrder;
  onResolveClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const formatDate = (date: any) => {
    return new Date(date).toLocaleString('vi-VN');
  };

  const canResolve = dispute.status === DisputeStatus.OPEN || dispute.status === DisputeStatus.INVESTIGATING;

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <code className="text-sm font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30">
              #{dispute.id.slice(0, 8)}
            </code>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold ${getStatusColor(
                dispute.status
              )}`}
            >
              {getStatusIcon(dispute.status)}
              {dispute.status}
            </span>
          </div>
          {canResolve && (
            <Button variant="neon" size="sm" onClick={onResolveClick}>
              <ShieldCheckIcon size={14} />
              Xử lý
            </Button>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <span className="text-slate-400">Order ID:</span>
            <span className="ml-2 text-white font-mono">#{dispute.orderId.slice(0, 8)}</span>
          </div>
          <div>
            <span className="text-slate-400">User ID:</span>
            <span className="ml-2 text-white font-mono">{dispute.userId.slice(0, 8)}</span>
          </div>
          <div>
            <span className="text-slate-400">Tạo lúc:</span>
            <span className="ml-2 text-white">{formatDate(dispute.createdAt)}</span>
          </div>
          {dispute.order && (
            <div>
              <span className="text-slate-400">Giá trị đơn:</span>
              <span className="ml-2 text-emerald-400 font-semibold">
                {formatPrice(dispute.order.totalAmount)}
              </span>
            </div>
          )}
        </div>

        {/* Reason */}
        <div className="bg-slate-950/50 rounded-xl p-4 mb-4">
          <p className="text-xs text-slate-400 mb-1 font-semibold">Lý do khiếu nại:</p>
          <p className="text-sm text-white">{dispute.reason}</p>
        </div>

        {/* Order Items (if expanded) */}
        {dispute.order && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors mb-3"
          >
            {expanded ? '▲ Ẩn chi tiết đơn hàng' : '▼ Xem chi tiết đơn hàng'}
          </button>
        )}

        {expanded && dispute.order && (
          <div className="bg-slate-950/50 rounded-xl p-4 space-y-2 mb-4">
            {dispute.order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm border-b border-slate-800 pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-white font-medium">{item.productName}</p>
                  <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
                </div>
                <p className="text-emerald-400 font-semibold">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Resolution Info */}
        {(dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.REJECTED) && (
          <div
            className={`rounded-xl p-4 border ${
              dispute.status === DisputeStatus.RESOLVED
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-rose-950/20 border-rose-500/30'
            }`}
          >
            <div className="space-y-2 text-sm">
              {dispute.resolution && (
                <div>
                  <p
                    className={`text-xs font-semibold mb-1 ${
                      dispute.status === DisputeStatus.RESOLVED ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    Kết quả:
                  </p>
                  <p className="text-white">{dispute.resolution}</p>
                </div>
              )}
              {dispute.refundAmount && dispute.refundAmount > 0 && (
                <div>
                  <p className="text-xs text-slate-400">Số tiền đã hoàn:</p>
                  <p className="text-lg font-bold text-emerald-400">{formatPrice(dispute.refundAmount)}</p>
                </div>
              )}
              {dispute.adminNote && (
                <div>
                  <p className="text-xs text-slate-400">Ghi chú:</p>
                  <p className="text-white italic">{dispute.adminNote}</p>
                </div>
              )}
              {dispute.resolvedAt && (
                <p className="text-xs text-slate-500">Xử lý lúc: {formatDate(dispute.resolvedAt)}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDisputesPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const [disputes, setDisputes] = useState<DisputeWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [resolvingDispute, setResolvingDispute] = useState<DisputeWithOrder | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
      return;
    }

    if (user && user.role === 'ADMIN') {
      loadDisputes();
    }
  }, [user, isLoading, router]);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const res = await api.disputes.getAll();
      if (res.success && res.data) {
        // Fetch order details for each dispute
        const disputesWithOrders = await Promise.all(
          res.data.map(async (dispute) => {
            try {
              const orderRes = await getOrderById(dispute.orderId);
              return {
                ...dispute,
                order: orderRes.success && orderRes.data ? orderRes.data : undefined,
              };
            } catch {
              return { ...dispute };
            }
          })
        );
        setDisputes(disputesWithOrders);
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi',
        description: err.message || 'Không thể tải danh sách khiếu nại',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || (user && user.role !== 'ADMIN')) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-slate-400">Đang tải...</div>
      </div>
    );
  }

  const filteredDisputes =
    selectedStatus === 'ALL'
      ? disputes
      : disputes.filter((d) => d.status === selectedStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Quản lý khiếu nại</h1>
            <p className="text-slate-400 text-sm mt-1">Xử lý tranh chấp và hoàn tiền</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadDisputes}>
          <RefreshCwIcon size={16} />
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {DISPUTE_STATUSES.map((status) => {
          const count =
            status === 'ALL'
              ? disputes.length
              : disputes.filter((d) => d.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedStatus === status
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {status} <span className="ml-1 text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Disputes List */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Đang tải khiếu nại...</div>
      ) : filteredDisputes.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <AlertTriangleIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p>Không có khiếu nại nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDisputes.map((dispute) => (
            <DisputeCard
              key={dispute.id}
              dispute={dispute}
              onResolveClick={() => setResolvingDispute(dispute)}
            />
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {resolvingDispute && (
        <ResolveDisputeModal
          dispute={resolvingDispute}
          onClose={() => setResolvingDispute(null)}
          onSuccess={loadDisputes}
        />
      )}
    </div>
  );
}
