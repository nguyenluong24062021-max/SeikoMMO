'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { CryptoCurrency, CryptoInvoiceDto } from '@repo/shared';
import {
  CopyIcon,
  ClockIcon,
  ZapIcon,
  CheckCircleIcon,
  RefreshCwIcon,
} from '@/components/icons';

const CRYPTO_OPTIONS = [
  { value: CryptoCurrency.USDT_TRC20, label: 'USDT (TRC20)', network: 'Tron' },
  { value: CryptoCurrency.USDT_ERC20, label: 'USDT (ERC20)', network: 'Ethereum' },
  { value: CryptoCurrency.USDT_BEP20, label: 'USDT (BEP20)', network: 'BSC' },
  { value: CryptoCurrency.BTC, label: 'Bitcoin (BTC)', network: 'Bitcoin' },
  { value: CryptoCurrency.ETH, label: 'Ethereum (ETH)', network: 'Ethereum' },
];

const MIN_AMOUNT = 50000; // 50k VND
const MAX_AMOUNT = 500000000; // 500M VND

export default function CryptoDeposit() {
  const { user, wallet, refreshWallet } = useAuth();
  const { toast } = useToast();

  const [selectedCoin, setSelectedCoin] = useState<CryptoCurrency>(CryptoCurrency.USDT_TRC20);
  const [amountVND, setAmountVND] = useState<string>('500000');
  const [isCreating, setIsCreating] = useState(false);
  const [invoice, setInvoice] = useState<CryptoInvoiceDto | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isPolling, setIsPolling] = useState(false);

  const prevBalanceRef = useRef<number>(wallet?.balance || 0);
  const pollCountRef = useRef<number>(0);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  // Countdown timer
  useEffect(() => {
    if (!invoice) return;

    const expiresAt = new Date(invoice.expiresAt).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0) {
        setInvoice(null);
        setIsPolling(false);
        toast({
          title: 'Invoice hết hạn',
          description: 'Vui lòng tạo invoice mới',
          variant: 'destructive',
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [invoice, toast]);

  // Poll wallet balance every 10s for 2 minutes (12 times)
  useEffect(() => {
    if (!invoice || !isPolling) return;

    const interval = setInterval(async () => {
      pollCountRef.current += 1;

      // Stop after 2 minutes (12 polls * 10s = 120s)
      if (pollCountRef.current > 12) {
        setIsPolling(false);
        toast({
          title: 'Hết thời gian chờ',
          description: 'Vui lòng kiểm tra số dư thủ công hoặc liên hệ hỗ trợ',
          variant: 'default',
        });
        return;
      }

      try {
        const res = await api.wallet.getMe();
        if (res.success && res.data) {
          const newBal = res.data.wallet.balance;
          if (newBal > prevBalanceRef.current) {
            toast({
              title: '✅ Nạp crypto thành công!',
              description: `Số dư đã được cộng. Số dư mới: ${formatPrice(newBal)}`,
              variant: 'success',
            });
            await refreshWallet();
            setIsPolling(false);
            setInvoice(null);
            pollCountRef.current = 0;
          }
        }
      } catch {
        // Continue polling
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [invoice, isPolling, toast, refreshWallet]);

  const handleCreateInvoice = async () => {
    const amount = parseFloat(amountVND);
    
    if (isNaN(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      toast({
        title: 'Số tiền không hợp lệ',
        description: `Vui lòng nhập từ ${formatPrice(MIN_AMOUNT)} đến ${formatPrice(MAX_AMOUNT)}`,
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      prevBalanceRef.current = wallet?.balance || 0;
      const res = await api.wallet.depositCrypto({
        amountVND: amount,
        coin: selectedCoin,
      });

      if (res.success && res.data) {
        setInvoice(res.data);
        setIsPolling(true);
        pollCountRef.current = 0;
        toast({
          title: 'Invoice đã tạo',
          description: `Chuyển ${res.data.payAmount} ${res.data.payCurrency} đến địa chỉ bên dưới`,
          variant: 'success',
        });
      } else {
        throw new Error(res.message || 'Không thể tạo invoice');
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi tạo invoice',
        description: err.message || 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Đã sao chép',
      description: 'Nội dung đã được copy vào clipboard',
      variant: 'default',
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="text-center text-slate-400 py-12">
        Vui lòng đăng nhập để nạp crypto
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!invoice ? (
        // Create invoice form
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Nạp Tiền Bằng Crypto</h3>
            <p className="text-xs text-slate-400">
              Chọn loại coin và nhập số tiền VND muốn nạp
            </p>
          </div>

          {/* Coin Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Chọn Cryptocurrency
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CRYPTO_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedCoin(option.value)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedCoin === option.value
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-700 bg-slate-950 hover:border-slate-600'
                  }`}
                >
                  <div className="font-bold text-white text-sm">{option.label}</div>
                  <div className="text-xs text-slate-400 mt-1">Network: {option.network}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Số tiền (VND)
            </label>
            <input
              type="number"
              value={amountVND}
              onChange={(e) => setAmountVND(e.target.value)}
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              step="10000"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-lg focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="500000"
            />
            <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
              <span>Min: {formatPrice(MIN_AMOUNT)}</span>
              <span>Max: {formatPrice(MAX_AMOUNT)}</span>
            </div>
            
            {/* Quick amounts */}
            <div className="flex gap-2 mt-3">
              {[100000, 500000, 1000000, 5000000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountVND(amt.toString())}
                  className="flex-1 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-600 transition-colors text-xs font-mono"
                >
                  {amt >= 1000000 ? `${amt / 1000000}M` : `${amt / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <Button
            variant="neon"
            size="lg"
            onClick={handleCreateInvoice}
            disabled={isCreating}
            className="w-full"
          >
            <ZapIcon size={16} />
            {isCreating ? 'Đang tạo invoice...' : 'Tạo Invoice Crypto'}
          </Button>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300 flex items-center gap-1">
              <ClockIcon size={12} className="text-emerald-400" />
              Lưu ý quan trọng:
            </p>
            <ul className="space-y-0.5 list-disc list-inside pl-1">
              <li>Invoice có hiệu lực trong 15 phút</li>
              <li>Chuyển đúng số tiền crypto hiển thị</li>
              <li>Số dư sẽ tự động cập nhật sau khi xác nhận</li>
              <li>Phí network do bạn thanh toán</li>
            </ul>
          </div>
        </div>
      ) : (
        // Invoice display
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 p-6 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Invoice Crypto</h3>
              <p className="text-xs text-slate-400">
                Invoice ID: <code className="text-emerald-400">{invoice.invoiceId.slice(0, 12)}...</code>
              </p>
            </div>
            {timeLeft > 0 ? (
              <div className="text-right">
                <div className="text-xs text-slate-400 mb-1">Thời gian còn lại:</div>
                <div className={`text-2xl font-bold font-mono ${
                  timeLeft < 180 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {formatTime(timeLeft)}
                </div>
              </div>
            ) : (
              <div className="text-rose-400 text-sm font-semibold">Đã hết hạn</div>
            )}
          </div>

          {/* Payment Amount */}
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
            <div className="text-xs text-slate-400 mb-1">Số tiền cần chuyển:</div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-2xl font-bold text-emerald-400 font-mono">
                {invoice.payAmount} {invoice.payCurrency}
              </code>
              <button
                onClick={() => handleCopy(invoice.payAmount.toString())}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Copy amount"
              >
                <CopyIcon size={16} />
              </button>
            </div>
          </div>

          {/* Payment Address */}
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
            <div className="text-xs text-slate-400 mb-2">Địa chỉ nhận:</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-white font-mono break-all bg-slate-900 px-3 py-2 rounded border border-slate-700">
                {invoice.payAddress}
              </code>
              <button
                onClick={() => handleCopy(invoice.payAddress)}
                className="flex-shrink-0 p-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
                title="Copy address"
              >
                <CopyIcon size={18} />
              </button>
            </div>
          </div>

          {/* QR Code - Simple text representation */}
          <div className="bg-slate-950/50 rounded-xl p-6 border border-slate-800 text-center">
            <div className="text-xs text-slate-400 mb-3">QR Code:</div>
            <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center text-xs text-slate-800 font-mono break-all p-2">
              {invoice.payAddress}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Quét QR code này để chuyển khoản tự động
            </p>
          </div>

          {/* Polling Status */}
          {isPolling && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
              <RefreshCwIcon size={14} className="animate-spin" />
              <span>Đang chờ xác nhận giao dịch... (Poll #{pollCountRef.current}/12)</span>
            </div>
          )}

          {/* Action Button */}
          <Button
            variant={isPolling ? 'outline' : 'neon'}
            size="lg"
            onClick={() => {
              setInvoice(null);
              setIsPolling(false);
              pollCountRef.current = 0;
            }}
            className="w-full"
          >
            {isPolling ? (
              <>
                <CheckCircleIcon size={16} />
                Tôi đã chuyển - Đợi xác nhận
              </>
            ) : (
              'Tạo Invoice Mới'
            )}
          </Button>

          {invoice.invoiceUrl && (
            <a
              href={invoice.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-emerald-400 hover:text-emerald-300 underline"
            >
              Mở trang thanh toán
            </a>
          )}
        </div>
      )}
    </div>
  );
}
