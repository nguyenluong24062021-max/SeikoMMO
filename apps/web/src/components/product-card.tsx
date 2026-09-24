import React from 'react';
import Link from 'next/link';
import { ProductItem } from '@/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarIcon, ZapIcon, CheckCircleIcon } from '@/components/icons';

interface ProductCardProps {
  product: ProductItem;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  const getBadgeVariant = (type: ProductItem['type']) => {
    switch (type) {
      case 'DIGITAL':
        return 'digital';
      case 'TOOL':
        return 'tool';
      case 'SEEDING':
        return 'seeding';
      default:
        return 'neutral';
    }
  };

  return (
    <Card className="group overflow-hidden border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-emerald-500/50 transition-all duration-300 flex flex-col h-full hover:shadow-xl hover:shadow-emerald-950/20">
      {/* Product Image & Badges */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

        {/* Type Badge */}
        <div className="absolute top-2.5 left-2.5">
          <Badge variant={getBadgeVariant(product.type)}>
            {product.type}
          </Badge>
        </div>

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2.5 right-2.5 bg-rose-600/90 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow">
            -{discountPercent}%
          </div>
        )}

        {/* Available Stock Tag */}
        <div className="absolute bottom-2 left-2.5 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[11px] text-slate-300 border border-slate-800">
          <CheckCircleIcon size={12} className="text-emerald-400" />
          <span>Kho: <strong className="text-emerald-400 font-mono">{product.availableStock}</strong></span>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Shop name link */}
          <Link
            href={`/shop?id=${product.shopId}`}
            className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 truncate mb-1"
          >
            <span>{product.shopName}</span>
          </Link>

          {/* Product Title */}
          <Link href={`/product/${product.id}`} className="block">
            <h3 className="text-sm font-semibold text-white line-clamp-2 hover:text-emerald-400 transition-colors leading-snug">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Price and Rating */}
        <div className="pt-2 border-t border-slate-800/60">
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-base font-extrabold text-emerald-400 font-mono tracking-tight">
              {formatPrice(product.price)}
            </span>
            <span className="text-xs text-slate-500 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
            <div className="flex items-center gap-1 text-amber-400">
              <StarIcon size={12} />
              <span className="font-semibold text-slate-200">{product.rating}</span>
            </div>
            <span>Đã bán <strong className="text-slate-300 font-mono">{product.soldCount}</strong></span>
          </div>

          {/* Action Button */}
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/product/${product.id}`} className="w-full">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Xem chi tiết
              </Button>
            </Link>
            <Link href={`/checkout?productId=${product.id}`} className="w-full">
              <Button variant="primary" size="sm" className="w-full text-xs flex items-center justify-center gap-1">
                <ZapIcon size={13} />
                Mua ngay
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
