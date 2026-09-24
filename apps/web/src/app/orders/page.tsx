'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { OrderDto, OrderStatus } from '@repo/shared';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftIcon,
  PackageIcon,
  CheckCircleIcon,
  ClockIcon,
  ZapIcon,
  CopyIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
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

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: 'Chờ xử lý',
    color: 'text-amber-400',
    bg: 'bg-amber-950/30',
    border: 'border-amber-500/40',
    icon: <ClockIcon size={14} />,
  },
  PAID: {
    label: 'Đã thanh toán',
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/30',
    border: 'border-cyan-500/40',
    icon: <ZapIcon size={14} />,
  },
  PROCESSING: {
    label: 'Đang xử lý',
    color: 'text-purple-400',
    bg: 'bg-purple-950/30',
    border: 'border-purple-500/40',
    icon: <RefreshCwIcon size={14} className="animate-spin" />,
  },
  DELIVERED: {
    label: 'Đã giao',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/30',
    border: 'border-emerald-500/40',
    icon: <CheckCircleIcon size={14} />,
  },
  COMPLETED: {
    label: 'Hoàn thành',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/30',
    border: 'border-emerald-500/40',
    icon: <CheckCircleIcon size={14} />,
  },
  PARTIAL: {
    label: 'Hoàn thành một phần',
    color: 'text-amber-400',
    bg: 'bg-amber-950/30',
    border: 'border-amber-500/40',
    icon: <AlertTriangleIcon size={14} />,
  },
  CANCELLED: {
    label: 'Đã huỷ',
    color: 'text-rose-400',
    bg: 'bg-rose-950/30',
    border: 'border-rose-500/40',
    icon: <AlertTriangleIcon size={14} />,
  },
  DISPUTED: {
    label: 'Đang tranh chấp',
    color: 'text-rose-400',
    bg: 'bg-rose-950/30',
    border: 'border-rose-500/40',
    icon: <AlertTriangleIcon size={14} />,
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    color: 'text-slate-400',
    bg: 'bg-slate-800',
    border: 'border-slate-700',
    icon: null,
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

function SeedingProgressBar({
  processedQuantity,
  totalQuantity,
  processingStatus,
  status,
}: {
  processedQuantity: number;
  totalQuantity: number;
  processingStatus?: string;
  status: string;
}) {
  const pct =
    totalQuantity > 0
      ? Math.min(100, Math.round((processedQuantity / totalQuantity) * 100))
      : status === OrderStatus.COMPLETED || status === OrderStatus.DELIVERED
      ? 100
      : 0;

  const barColor =
    status === OrderStatus.COMPLETED || status === OrderStatus.DELIVERED
      ? 'bg-emerald-500'
      : status === OrderStatus.PARTIAL
      ? 'bg-amber-500'
      : status === OrderStatus.PROCESSING
      ? 'bg-purple-500'
      : 'bg-slate-600';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">Tiến độ seeding:</span>
        <span
          className={`font-mono font-bold ${
            pct === 100 ? 'text-emerald-400' : pct > 0 ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          {pct}%
          {totalQuantity > 0 && (
            <span className="text-slate-500 font-normal">
              {' '}({processedQuantity}/{totalQuantity})
            </span>
          )}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor} ${
            status === OrderStatus.PROCESSING ? 'animate-pulse' : ''
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {processingStatus && (
        <p className="text-[11px] text-slate-400 italic">
          {processingStatus}
        </p>
      )}
    </div>
  );
}

function OrderCard({ order, onCopyKey }: { order: OrderDto; onCopyKey: (key: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const processedQuantity = order.processedQuantity ?? 0;

  // Detect SEEDING based on status patterns (PROCESSING/PARTIAL) or product type
  const isSeedingType =
    order.status === OrderStatus.PROCESSING ||
    order.status === OrderStatus.PARTIAL ||
    (order.processingStatus !== undefined && order.processingStatus !== null);

  const deliveredKeys =
    order.deliveredKeys && order.deliveredKeys.length > 0
      ? order.deliveredKeys
      : order.stocks?.map((s) => s.key) || [];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-lg hover:border-slate-700 transition-colors">
      {/* Order header */}
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-[11px] text-slate-500">{formatDate(order.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Tổng thanh toán</p>
            <p className="text-lg font-black text-emerald-400 font-mono">
              {formatPrice(order.totalAmount)}
            </p>
            {order.voucherCode && order.discountAmount && order.discountAmount > 0 && (
              <p className="text-[10px] text-amber-400">
                Voucher {order.voucherCode}: -{formatPrice(order.discountAmount)}
              </p>
            )}
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-1.5">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-300 truncate max-w-[70%]">
                {item.productName} × {item.quantity}
              </span>
              <span className="text-slate-400 font-mono">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        {/* Seeding progress bar — shown when PROCESSING/PARTIAL/COMPLETED with processingStatus */}
        {isSeedingType && (
          <div className="pt-2 border-t border-slate-800/60">
            <SeedingProgressBar
              processedQuantity={processedQuantity}
              totalQuantity={totalQuantity}
              processingStatus={order.processingStatus}
              status={order.status}
            />
          </div>
        )}

        {/* Provider Order ID — shown when order is via SMM provider */}
        {order.providerOrderId && (
          <div className="pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Provider Order ID:</span>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/30">
                  {order.providerOrderId}
                </code>
                {order.status === OrderStatus.PROCESSING && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    <RefreshCwIcon size={10} className="animate-spin" />
                    Via Provider
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* For DELIVERED/COMPLETED orders with keys — show toggle */}
        {deliveredKeys.length > 0 && (
          <div className="pt-2 border-t border-slate-800/60">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              <ZapIcon size={12} />
              {expanded
                ? 'Ẩn key đã nhận'
                : `Xem ${deliveredKeys.length} key đã nhận`}
            </button>

            {expanded && (
              <div className="mt-3 space-y-2">
                {deliveredKeys.map((key, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800"
                  >
                    <code className="text-xs font-mono text-emerald-400 break-all select-all">
                      {key}
                    </code>
                    <button
                      onClick={() => onCopyKey(key)}
                      className="flex-shrink-0 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Sao chép key"
                    >
                      <CopyIcon size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer action bar */}
      <div className="px-5 py-3 bg-slate-950/60 border-t border-slate-800/60 flex items-center justify-between gap-3">
        <div className="text-[11px] text-slate-500">
          {order.status === OrderStatus.DELIVERED || order.status === OrderStatus.COMPLETED
            ? 'Đơn hàng đã hoàn thành'
            : order.status === OrderStatus.DISPUTED
            ? 'Đang trong quá trình giải quyết tranh chấp'
            : 'Đơn hàng đang được xử lý'}
        </div>
        <div className="flex gap-2">
          {(order.status === OrderStatus.DELIVERED || order.status === OrderStatus.COMPLETED) && (
            <Link
              href={`/disputes?orderId=${order.id}`}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
            >
              Khiếu nại
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { user, openAuthModal } = useAuth();
  const { toast } = useToast();

  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'SEEDING' | 'DIGITAL'>('ALL');

  const loadOrders = useCallback(async () => {
    try {
      const res = await api.orders.getAll();
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi tải đơn hàng',
        description: err.message || 'Không thể kết nối API.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      loadOrders();
    } else {
      setIsLoading(false);
    }
  }, [user, loadOrders]);

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: 'Đã sao chép key!',
      description: 'Key đã được lưu vào clipboard.',
      variant: 'success',
    });
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (filter === 'ALL') return true;
    if (filter === 'SEEDING') {
      return (
        order.status === OrderStatus.PROCESSING ||
        order.status === OrderStatus.PARTIAL ||
        order.processingStatus !== undefined
      );
    }
    if (filter === 'DIGITAL') {
      return (
        order.status === OrderStatus.DELIVERED ||
        order.status === OrderStatus.COMPLETED
      ) && (order.deliveredKeys?.length ?? 0) > 0;
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-emerald-400 flex items-center gap-1">
          <ArrowLeftIcon size={14} /> Trang chủ
        </Link>
        <span>/</span>
        <span className="text-slate-200 font-medium">Đơn Hàng Của Tôi</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <PackageIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Đơn Hàng Của Tôi</h1>
            <p className="text-xs text-slate-400">
              Theo dõi trạng thái giao key và tiến độ seeding
            </p>
          </div>
        </div>

        {user && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              loadOrders();
            }}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCwIcon size={14} />
            Làm mới
          </Button>
        )}
      </div>

      {!user ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <PackageIcon size={28} />
          </div>
          <h2 className="text-xl font-bold text-white">Bạn chưa đăng nhập</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Vui lòng đăng nhập để xem lịch sử đơn hàng và theo dõi tiến độ seeding.
          </p>
          <Button variant="neon" size="md" onClick={() => openAuthModal('LOGIN')}>
            Đăng Nhập Ngay
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 h-36 animate-pulse"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <PackageIcon size={28} />
          </div>
          <h2 className="text-lg font-bold text-white">Chưa có đơn hàng nào</h2>
          <p className="text-xs text-slate-400">
            Bạn chưa mua sản phẩm nào. Khám phá chợ MMO ngay!
          </p>
          <Link href="/">
            <Button variant="neon" size="md">
              Khám Phá Sản Phẩm
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">Lọc:</span>
            {(['ALL', 'SEEDING', 'DIGITAL'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filter === f
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {f === 'ALL'
                  ? `Tất cả (${orders.length})`
                  : f === 'SEEDING'
                  ? 'Seeding (Có tiến độ)'
                  : 'Digital (Có key)'}
              </button>
            ))}
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Tổng đơn',
                value: orders.length,
                color: 'text-white',
                bg: 'bg-slate-800/60',
              },
              {
                label: 'Đã giao / Hoàn thành',
                value: orders.filter(
                  (o) =>
                    o.status === OrderStatus.DELIVERED ||
                    o.status === OrderStatus.COMPLETED
                ).length,
                color: 'text-emerald-400',
                bg: 'bg-emerald-950/30',
              },
              {
                label: 'Đang xử lý',
                value: orders.filter((o) => o.status === OrderStatus.PROCESSING).length,
                color: 'text-purple-400',
                bg: 'bg-purple-950/30',
              },
              {
                label: 'Tranh chấp',
                value: orders.filter((o) => o.status === OrderStatus.DISPUTED).length,
                color: 'text-rose-400',
                bg: 'bg-rose-950/30',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-xl border border-slate-800 ${stat.bg} p-4 text-center`}
              >
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-[11px] text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Orders list */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">
                Không có đơn hàng nào trong danh mục này.
              </div>
            ) : (
              filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} onCopyKey={handleCopyKey} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
