'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { DepositResponseDto } from '@repo/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  WalletIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  ZapIcon,
  ClockIcon,
  CopyIcon,
  RefreshCwIcon,
} from '@/components/icons';
import CryptoDeposit from './crypto-deposit';

export default function WalletPage() {
  const { user, wallet, transactions, refreshWallet, openAuthModal } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'sepay' | 'crypto'>('sepay');
  const [depositAmount, setDepositAmount] = useState<number>(500000);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositInfo, setDepositInfo] = useState<DepositResponseDto | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const prevBalanceRef = useRef<number>(wallet?.balance || 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const formatDate = (dateStr: any) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN');
    } catch {
      return String(dateStr);
    }
  };

  // Poll wallet status every 3s when deposit modal/QR is active
  useEffect(() => {
    if (!depositInfo || !isPolling) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.wallet.getMe();
        if (res.success && res.data) {
          const newBal = res.data.wallet.balance;
          // If balance changed or transaction confirmed
          if (newBal > prevBalanceRef.current) {
            toast({
              title: 'Nạp tiền thành công!',
              description: `Số dư ví của bạn đã được cộng thêm. Số dư mới: ${formatPrice(newBal)}`,
              variant: 'success',
            });
            await refreshWallet();
            setIsPolling(false);
            setDepositInfo(null);
          }
        }
      } catch {
        // Polling retry
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [depositInfo, isPolling, toast, refreshWallet]);

  // Create real deposit request (POST /wallet/deposit)
  const handleCreateDeposit = async () => {
    if (!user) {
      openAuthModal('LOGIN');
      return;
    }

    setIsDepositing(true);
    try {
      prevBalanceRef.current = wallet?.balance || 0;
      const res = await api.wallet.deposit(depositAmount);
      if (res.success && res.data) {
        setDepositInfo(res.data);
        setIsPolling(true);
        toast({
          title: 'Đã tạo lệnh nạp tiền',
          description: `Vui lòng quét mã QR hoặc chuyển khoản đúng số tiền ${formatPrice(depositAmount)}.`,
          variant: 'default',
        });
      } else {
        throw new Error(res.message || 'Không thể tạo mã nạp tiền');
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi nạp tiền',
        description: err.message || 'Không thể kết nối API nạp tiền.',
        variant: 'destructive',
      });
    } finally {
      setIsDepositing(false);
    }
  };

  // Instant simulate confirm payment webhook for rapid developer testing
  const handleSimulatePayment = async () => {
    if (!depositInfo || !user) return;
    try {
      const confirmRes = await api.wallet.confirmDeposit(
        depositInfo.transactionId,
        depositInfo.amount
      );
      if (confirmRes.success) {
        toast({
          title: 'Xác nhận nạp tiền thành công!',
          description: `Đã cộng ${formatPrice(depositInfo.amount)} vào ví tài khoản.`,
          variant: 'success',
        });
        await refreshWallet();
        setIsPolling(false);
        setDepositInfo(null);
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi xác nhận nạp tiền',
        description: err.message || 'Không thể xác nhận thanh toán.',
        variant: 'destructive',
      });
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <Badge variant="success">Nạp tiền</Badge>;
      case 'PAYMENT':
        return <Badge variant="digital">Thanh toán</Badge>;
      case 'COMMISSION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            💰 Hoa hồng
          </span>
        );
      case 'PAYOUT':
        return <Badge variant="tool">Rút tiền</Badge>;
      case 'REFUND':
        return <Badge variant="seeding">Hoàn tiền</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-emerald-400 flex items-center gap-1">
          <ArrowLeftIcon size={14} /> Trang chủ
        </Link>
        <span>/</span>
        <span className="text-slate-200 font-medium">Quản lý Ví & Lịch sử giao dịch</span>
      </div>

      {!user ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <WalletIcon size={28} />
          </div>
          <h2 className="text-xl font-bold text-white">Bạn chưa đăng nhập</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Vui lòng đăng nhập tài khoản Buyer hoặc Seller để xem số dư thực tế và lịch sử giao dịch từ API.
          </p>
          <Button variant="neon" size="md" onClick={() => openAuthModal('LOGIN')}>
            Đăng Nhập Ngay
          </Button>
        </div>
      ) : (
        <>
          {/* Top Wallet Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Balance Card */}
            <div className="md:col-span-3 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <WalletIcon size={18} />
                    </div>
                    <div>
                      <h1 className="text-base font-bold text-white">Ví Tiền Seiko MMO</h1>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant={user.role === 'SELLER' ? 'digital' : 'tool'}>
                    Vai trò: {user.role}
                  </Badge>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-slate-400 mb-1">Số dư khả dụng:</p>
                  <p className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
                    {formatPrice(wallet?.balance || 0)}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <ShieldCheckIcon size={14} /> Hệ thống bảo chứng Escrow 24/7
                  </span>
                  <span>
                    ID Ví: <code className="text-slate-300 font-mono">{wallet?.id.slice(0, 13)}...</code>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Deposit Tabs */}
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-800">
              <button
                onClick={() => setActiveTab('sepay')}
                className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === 'sepay'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <ZapIcon size={14} className="inline mr-2" />
                Nạp SePay QR
              </button>
              <button
                onClick={() => setActiveTab('crypto')}
                className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === 'crypto'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <WalletIcon size={14} className="inline mr-2" />
                Nạp Crypto
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'sepay' ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                    <ZapIcon size={16} className="text-emerald-400" />
                    Nạp Tiền Qua SePay QR
                  </h2>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Tạo yêu cầu nạp tiền, nhận mã QR thanh toán tự động và tự động kiểm tra khớp lệnh.
                  </p>

                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      {[100000, 200000, 500000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDepositAmount(amt)}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                            depositAmount === amt
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {(amt / 1000).toLocaleString()}k
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      min={10000}
                      step={10000}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <Button
                  variant="neon"
                  size="sm"
                  disabled={isDepositing || depositAmount <= 0}
                  onClick={handleCreateDeposit}
                  className="w-full font-bold"
                >
                  {isDepositing ? 'Đang tạo mã QR...' : `TẠO MÃ NẠP ${formatPrice(depositAmount)}`}
                </Button>
              </div>
            ) : (
              <CryptoDeposit />
            )}
          </div>

          {/* Active Deposit QR & Polling Modal / Banner */}
          {depositInfo && (
            <div className="rounded-2xl border border-emerald-500/50 bg-slate-950/90 p-6 shadow-2xl space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-base font-bold text-white">
                    Đang Chờ Quét Mã Thanh Toán SePay
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setDepositInfo(null);
                    setIsPolling(false);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Đóng ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* QR Display */}
                <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-800 shadow-inner">
                  {depositInfo.qrCode.startsWith('data:image') ? (
                    <img
                      src={depositInfo.qrCode}
                      alt="SePay QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-900 font-mono text-xs text-center p-2">
                      Mã QR Thanh Toán SePay ({depositInfo.transactionId})
                    </div>
                  )}
                  <span className="text-[11px] text-slate-600 font-mono mt-1">
                    Quét qua App Ngân hàng
                  </span>
                </div>

                {/* Details & Live Polling Status */}
                <div className="md:col-span-8 space-y-4 text-xs">
                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Số tiền nạp:</span>
                      <strong className="text-emerald-400 font-mono text-sm">
                        {formatPrice(depositInfo.amount)}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Mã giao dịch:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-slate-200 font-mono">{depositInfo.transactionId}</code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(depositInfo.transactionId);
                          }}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          <CopyIcon size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Trạng thái:</span>
                      <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                        <RefreshCwIcon size={12} className="animate-spin" />
                        Đang lắng nghe thanh toán (tự động cập nhật số dư sau khi chuyển)...
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-3">
                    <Button
                      variant="neon"
                      size="sm"
                      onClick={handleSimulatePayment}
                      className="text-xs font-bold"
                    >
                      ⚡ Xác Nhận Thanh Toán Ngay (Test Nhanh)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshWallet()}
                      className="text-xs"
                    >
                      Kiểm tra thủ công
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transaction History Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ClockIcon size={18} className="text-emerald-400" />
                Lịch Sử Giao Dịch ({transactions.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refreshWallet();
                  toast({
                    description: 'Đã cập nhật lịch sử ví mới nhất.',
                    variant: 'default',
                  });
                }}
                className="text-xs"
              >
                Làm mới
              </Button>
            </div>

            {transactions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Chưa có giao dịch nào được ghi nhận trên ví này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Loại GD</th>
                      <th className="pb-3 font-semibold">Mô Tả / Mã Đơn</th>
                      <th className="pb-3 font-semibold text-right">Số Tiền</th>
                      <th className="pb-3 font-semibold text-right">Thời Gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactions.map((tx) => {
                      const isPositive = tx.amount > 0;
                      return (
                        <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 pr-3 whitespace-nowrap">
                            {getTransactionBadge(tx.type)}
                          </td>
                          <td className="py-3 pr-3">
                            <p className="font-medium text-white">{tx.description || 'Giao dịch ví'}</p>
                            {tx.orderId && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Đơn: {tx.orderId.slice(0, 8)}...
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-3 text-right whitespace-nowrap font-mono font-bold">
                            <span 
                              className={
                                tx.type === 'COMMISSION' 
                                  ? 'text-amber-400' 
                                  : isPositive 
                                  ? 'text-emerald-400' 
                                  : 'text-rose-400'
                              }
                            >
                              {isPositive ? '+' : ''}
                              {formatPrice(tx.amount)}
                            </span>
                          </td>
                          <td className="py-3 text-right whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {formatDate(tx.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
