'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeftIcon,
  PackageIcon,
  RefreshCwIcon,
} from '@/components/icons';
import { OrderDto } from '@repo/shared';

const ORDER_STATUSES = ['ALL', 'PENDING', 'PAID', 'PROCESSING', 'PARTIAL', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'CANCELLED'];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'PAID':
    case 'DELIVERED':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    case 'PROCESSING':
    case 'PARTIAL':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    case 'DISPUTED':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    case 'CANCELLED':
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    default:
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  }
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
      return;
    }

    if (user && user.role === 'ADMIN') {
      loadOrders();
    }
  }, [user, isLoading, router, selectedStatus]);

  const loadOrders = () => {
    setLoading(true);
    const status = selectedStatus === 'ALL' ? undefined : selectedStatus;
    api.admin
      .getOrders(status)
      .then((res) => {
        if (res.success && res.data) {
          setOrders(res.data);
        }
      })
      .catch(() => {
        // Failed to load
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (isLoading || (user && user.role !== 'ADMIN')) {
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
            <h1 className="text-3xl font-bold text-white">Quản lý đơn hàng</h1>
            <p className="text-slate-400 text-sm mt-1">Xem và lọc tất cả đơn hàng trong hệ thống</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadOrders}>
          <RefreshCwIcon size={16} />
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {ORDER_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedStatus === status
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Đang tải đơn hàng...</div>
      ) : orders.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <PackageIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p>Không có đơn hàng nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-slate-900/90 rounded-2xl border border-slate-700 overflow-hidden shadow-lg"
            >
              {/* Order Header */}
              <div
                className="p-6 cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30">
                      {order.id}
                    </code>
                    <Badge className={`text-xs px-3 py-1 ${getStatusColor(order.status)}`}>
                      {order.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-400">{formatPrice(order.totalAmount)}</div>
                    {order.discountAmount && order.discountAmount > 0 && (
                      <div className="text-xs text-slate-400">
                        Giảm giá: {formatPrice(order.discountAmount)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Buyer ID:</span>
                    <span className="ml-2 text-white font-mono">{order.buyerId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Ngày tạo:</span>
                    <span className="ml-2 text-white">{formatDate(order.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Số sản phẩm:</span>
                    <span className="ml-2 text-white">{order.items.length} items</span>
                  </div>
                </div>

                {order.voucherCode && (
                  <div className="mt-3 flex items-center gap-2">
                    <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
                      Voucher: {order.voucherCode}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Order Details (Expandable) */}
              {expandedOrder === order.id && (
                <div className="border-t border-slate-700 p-6 bg-slate-950/50">
                  <h3 className="text-sm font-semibold text-white mb-4">Chi tiết đơn hàng</h3>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4"
                      >
                        <div>
                          <div className="font-medium text-white">{item.productName}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            Product ID: {item.productId}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-white">
                            {item.quantity} × {formatPrice(item.price)}
                          </div>
                          <div className="text-xs text-emerald-400 font-semibold">
                            = {formatPrice(item.quantity * item.price)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.processingStatus && (
                    <div className="mt-4 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                      <div className="text-xs text-yellow-400">
                        Trạng thái xử lý: {order.processingStatus}
                      </div>
                      {order.processedQuantity !== undefined && (
                        <div className="text-xs text-yellow-400 mt-1">
                          Đã xử lý: {order.processedQuantity} / {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                        </div>
                      )}
                    </div>
                  )}

                  {order.deliveredKeys && order.deliveredKeys.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs text-slate-400 mb-2">Keys đã giao:</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {order.deliveredKeys.map((key, idx) => (
                          <code
                            key={idx}
                            className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded border border-emerald-500/30 block"
                          >
                            {key}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
