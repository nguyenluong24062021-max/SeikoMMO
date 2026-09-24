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
  CheckCircleIcon,
  XIcon,
  RefreshCwIcon,
} from '@/components/icons';
import { PayoutDto } from '@repo/shared';

export default function AdminPayoutsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<PayoutDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
      return;
    }

    if (user && user.role === 'ADMIN') {
      loadPayouts();
    }
  }, [user, isLoading, router]);

  const loadPayouts = () => {
    setLoading(true);
    api.admin
      .getPayouts()
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

  const handleApprovePayout = async (id: string, status: 'COMPLETED' | 'FAILED') => {
    setProcessingId(id);
    try {
      const res = await api.admin.approvePayout(id, {
        status,
        adminNote: adminNotes[id] || undefined,
      });

      if (res.success) {
        toast({
          description: `Đã ${status === 'COMPLETED' ? 'phê duyệt' : 'từ chối'} yêu cầu rút tiền`,
          variant: 'success',
        });
        loadPayouts();
        setAdminNotes((prev) => {
          const newNotes = { ...prev };
          delete newNotes[id];
          return newNotes;
        });
      }
    } catch (error: any) {
      toast({
        description: error.message || 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
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

  const pendingPayouts = payouts.filter((p) => p.status === 'PENDING');
  const processedPayouts = payouts.filter((p) => p.status !== 'PENDING');

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
            <h1 className="text-3xl font-bold text-white">Duyệt rút tiền</h1>
            <p className="text-slate-400 text-sm mt-1">Xử lý yêu cầu rút tiền từ seller</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadPayouts}>
          <RefreshCwIcon size={16} />
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Đang tải yêu cầu rút tiền...</div>
      ) : (
        <div className="space-y-8">
          {/* Pending Payouts */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              Chờ duyệt ({pendingPayouts.length})
            </h2>
            {pendingPayouts.length === 0 ? (
              <div className="text-center text-slate-400 py-8 bg-slate-900/50 rounded-2xl border border-slate-700">
                <WalletIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p>Không có yêu cầu nào đang chờ duyệt</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPayouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="bg-slate-900/90 rounded-2xl border border-yellow-500/30 p-6 shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <code className="text-sm font-mono text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-lg border border-yellow-500/30">
                          {payout.id}
                        </code>
                        <div className="text-xs text-slate-400 mt-2">
                          Wallet ID: {payout.walletId}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-yellow-400">
                          {formatPrice(payout.amount)}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {formatDate(payout.createdAt)}
                        </div>
                      </div>
                    </div>

                    {payout.description && (
                      <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
                        <div className="text-xs text-slate-400 mb-1">Lý do rút:</div>
                        <div className="text-sm text-white">{payout.description}</div>
                      </div>
                    )}

                    {/* Admin Note Input */}
                    <div className="mb-4">
                      <label className="text-xs text-slate-400 block mb-2">Ghi chú admin (tùy chọn):</label>
                      <textarea
                        value={adminNotes[payout.id] || ''}
                        onChange={(e) =>
                          setAdminNotes((prev) => ({
                            ...prev,
                            [payout.id]: e.target.value,
                          }))
                        }
                        placeholder="Nhập ghi chú nếu cần..."
                        className="w-full bg-slate-800 text-white text-sm rounded-lg p-3 border border-slate-700 focus:border-emerald-500 focus:outline-none resize-none"
                        rows={2}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        variant="neon"
                        size="sm"
                        onClick={() => handleApprovePayout(payout.id, 'COMPLETED')}
                        disabled={processingId === payout.id}
                        className="flex-1"
                      >
                        <CheckCircleIcon size={16} />
                        <span className="ml-2">Phê duyệt</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprovePayout(payout.id, 'FAILED')}
                        disabled={processingId === payout.id}
                        className="flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                      >
                        <XIcon size={16} />
                        <span className="ml-2">Từ chối</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Processed Payouts */}
          {processedPayouts.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">
                Đã xử lý ({processedPayouts.length})
              </h2>
              <div className="space-y-4">
                {processedPayouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="bg-slate-900/90 rounded-2xl border border-slate-700 p-6 shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <code className="text-sm font-mono text-slate-400 bg-slate-800 px-3 py-1 rounded-lg">
                          {payout.id}
                        </code>
                        <Badge className={`ml-2 text-xs ${getStatusColor(payout.status)}`}>
                          {payout.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {formatPrice(payout.amount)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-400">Ngày tạo:</span>
                        <span className="ml-2 text-white">{formatDate(payout.createdAt)}</span>
                      </div>
                      {payout.resolvedAt && (
                        <div>
                          <span className="text-slate-400">Ngày duyệt:</span>
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
                      <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                        <div className="text-xs text-slate-400 mb-1">Ghi chú admin:</div>
                        <div className="text-sm text-white">{payout.adminNote}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
