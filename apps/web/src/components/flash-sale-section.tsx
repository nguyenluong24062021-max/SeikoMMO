'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FlashSaleDto } from '@repo/shared';
import { ZapIcon } from '@/components/icons';

interface FlashSaleCountdownProps {
  endAt: Date;
}

function FlashSaleCountdown({ endAt }: FlashSaleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
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
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endAt]);

  const pad = (num: number) => String(num).padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
      <span>Kết thúc sau:</span>
      <span className="bg-slate-950 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 font-bold">
        {pad(timeLeft.hours)}
      </span>
      :
      <span className="bg-slate-950 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 font-bold">
        {pad(timeLeft.minutes)}
      </span>
      :
      <span className="bg-slate-950 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 font-bold">
        {pad(timeLeft.seconds)}
      </span>
    </div>
  );
}

interface FlashSaleCardProps {
  sale: FlashSaleDto;
}

function FlashSaleCard({ sale }: FlashSaleCardProps) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const discountPercent = sale.originalPrice
    ? Math.round(((sale.originalPrice - sale.salePrice) / sale.originalPrice) * 100)
    : 0;

  const progressPercent = (sale.soldCount / sale.stockCap) * 100;
  const slotsLeft = sale.stockCap - sale.soldCount;

  return (
    <Link
      href={`/product/${sale.productId}`}
      className="block group bg-slate-900/80 rounded-xl border border-slate-800 hover:border-rose-500/50 transition-all overflow-hidden hover:shadow-lg hover:shadow-rose-950/30"
    >
      <div className="p-4 space-y-3">
        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="inline-flex items-center gap-1 bg-rose-600 text-white font-black text-xs px-2.5 py-1 rounded shadow-lg">
            <ZapIcon size={12} />
            -{discountPercent}%
          </div>
        )}

        {/* Product Name */}
        <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-rose-400 transition-colors">
          {sale.productName || `Sản phẩm #${sale.productId.slice(0, 8)}`}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-rose-400 font-mono">
            {formatPrice(sale.salePrice)}
          </span>
          {sale.originalPrice && (
            <span className="text-xs text-slate-500 line-through">
              {formatPrice(sale.originalPrice)}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Đã bán: {sale.soldCount}/{sale.stockCap}</span>
            <span className={`font-semibold ${slotsLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
              Còn {slotsLeft} slot
            </span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="pt-2 border-t border-slate-800">
          <span className="text-xs text-rose-400 font-semibold group-hover:underline">
            Mua ngay →
          </span>
        </div>
      </div>
    </Link>
  );
}

interface FlashSaleSectionProps {
  sales: FlashSaleDto[];
}

export function FlashSaleSection({ sales }: FlashSaleSectionProps) {
  if (sales.length === 0) return null;

  // Get the earliest end time for the countdown
  const earliestEnd = sales.reduce((earliest, sale) => {
    const saleEnd = new Date(sale.endAt);
    return saleEnd < earliest ? saleEnd : earliest;
  }, new Date(sales[0].endAt));

  return (
    <section className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/30 p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-rose-500/20">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-md flex items-center gap-1.5 shadow-lg shadow-rose-600/30">
              <ZapIcon size={14} />
              FLASH SALE GIỜ VÀNG
            </div>
            <FlashSaleCountdown endAt={earliestEnd} />
          </div>
          <span className="text-xs text-rose-400 font-semibold">Ưu đãi độc quyền hôm nay</span>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sales.slice(0, 8).map((sale) => (
            <FlashSaleCard key={sale.id} sale={sale} />
          ))}
        </div>
      </div>
    </section>
  );
}
