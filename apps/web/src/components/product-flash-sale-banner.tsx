'use client';

import React, { useState, useEffect } from 'react';
import { FlashSaleDto } from '@repo/shared';
import { ZapIcon, ClockIcon, AlertTriangleIcon } from '@/components/icons';

interface ProductFlashSaleBannerProps {
  sale: FlashSaleDto;
}

export function ProductFlashSaleBanner({ sale }: ProductFlashSaleBannerProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(sale.endAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setIsExpired(true);
        return { hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTime = calculateTimeLeft();
      setTimeLeft(newTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [sale.endAt]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const discountPercent = sale.originalPrice
    ? Math.round(((sale.originalPrice - sale.salePrice) / sale.originalPrice) * 100)
    : 0;

  const slotsLeft = sale.stockCap - sale.soldCount;
  const progressPercent = (sale.soldCount / sale.stockCap) * 100;
  const pad = (num: number) => String(num).padStart(2, '0');

  if (isExpired || slotsLeft <= 0) {
    return null; // Don't show if expired or sold out
  }

  return (
    <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-slate-900 to-amber-950/20 p-5 space-y-4 shadow-xl relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header with discount badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-rose-600 text-white font-black text-sm uppercase tracking-wide rounded-lg flex items-center gap-1.5 shadow-lg">
              <ZapIcon size={16} />
              FLASH SALE
            </div>
            {discountPercent > 0 && (
              <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-sm rounded shadow">
                -{discountPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Price comparison */}
        <div className="flex items-baseline gap-3">
          <div className="text-3xl font-black text-rose-400 font-mono">
            {formatPrice(sale.salePrice)}
          </div>
          {sale.originalPrice && (
            <div className="text-lg text-slate-500 line-through">
              {formatPrice(sale.originalPrice)}
            </div>
          )}
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/60 border border-rose-500/30">
          <ClockIcon size={18} className="text-rose-400" />
          <span className="text-sm text-slate-300 font-medium">Kết thúc sau:</span>
          <div className="flex items-center gap-1 font-mono font-bold">
            <span className="bg-rose-600 text-white px-2 py-1 rounded text-sm min-w-[2ch] text-center">
              {pad(timeLeft.hours)}
            </span>
            <span className="text-slate-400">:</span>
            <span className="bg-rose-600 text-white px-2 py-1 rounded text-sm min-w-[2ch] text-center">
              {pad(timeLeft.minutes)}
            </span>
            <span className="text-slate-400">:</span>
            <span className="bg-rose-600 text-white px-2 py-1 rounded text-sm min-w-[2ch] text-center">
              {pad(timeLeft.seconds)}
            </span>
          </div>
        </div>

        {/* Stock progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              Đã bán: <span className="text-white font-semibold">{sale.soldCount}</span> / {sale.stockCap}
            </span>
            <div className="flex items-center gap-1.5">
              <AlertTriangleIcon 
                size={14} 
                className={slotsLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-amber-400'} 
              />
              <span className={`font-bold ${slotsLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                Còn {slotsLeft} slot!
              </span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-rose-400 to-amber-500 transition-all duration-500 rounded-full shadow-lg"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Warning if low stock */}
        {slotsLeft <= 10 && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
            <AlertTriangleIcon size={14} className="flex-shrink-0 mt-0.5 animate-pulse" />
            <span>
              <strong>Sắp hết!</strong> Chỉ còn {slotsLeft} slot cuối cùng. Đặt mua ngay để không bỏ lỡ!
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
