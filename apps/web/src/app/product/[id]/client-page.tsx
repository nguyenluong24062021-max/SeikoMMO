'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MOCK_PRODUCTS, MOCK_SHOPS, ProductItem } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductFlashSaleBanner } from '@/components/product-flash-sale-banner';
import { api } from '@/lib/api';
import { FlashSaleDto } from '@repo/shared';
import {
  ZapIcon,
  ShieldCheckIcon,
  ClockIcon,
  StarIcon,
  StoreIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ShoppingBagIcon,
  RefreshCwIcon,
} from '@/components/icons';

interface Props {
  productId: string;
}

export default function ProductDetailClient({ productId }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<ProductItem>(() => {
    return MOCK_PRODUCTS.find((p) => p.id === productId) || MOCK_PRODUCTS[0];
  });
  const [flashSale, setFlashSale] = useState<FlashSaleDto | null>(null);


  // Fetch real product details from GET /products/:id
  useEffect(() => {
    let isMounted = true;
    api.products
      .getById(productId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          const p = res.data;
          const fallback =
            MOCK_PRODUCTS.find((m) => m.id === p.id) || MOCK_PRODUCTS[0];
          setProduct({
            id: p.id,
            name: p.name,
            description: p.description || fallback.description,
            price: p.price,
            originalPrice: fallback.originalPrice || Math.round(p.price * 1.3),
            type: p.type,
            shopId: p.shopId,
            shopName: fallback.shopName || 'Gian Hàng Đối Tác',
            rating: fallback.rating || 5.0,
            soldCount: fallback.soldCount || 100,
            availableStock: p.availableStock,
            image:
              fallback.image ||
              'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&auto=format&fit=crop&q=80',
            tags: fallback.tags || [p.type, 'Auto Delivery'],
            features: fallback.features || [
              'Trả key tự động sau 1s',
              'Bảo hành đầy đủ',
            ],
            isFlashSale: fallback.isFlashSale,
          });
        }
      })
      .catch(() => {
        // Fallback to mock product
      });

    // Fetch flash sale for this product
    api.flashSales
      .getByProductId(productId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setFlashSale(res.data);
        }
      })
      .catch(() => {
        // No flash sale for this product
      });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const shop = MOCK_SHOPS[product.shopId] || MOCK_SHOPS['shop-seiko-prime'];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const discountPercent =
    product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) * 100
        )
      : 0;

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

  const isOutOfStock = product.availableStock <= 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-emerald-400 flex items-center gap-1">
          <ArrowLeftIcon size={14} /> Chợ MMO
        </Link>
        <span>/</span>
        <Link href={`/shop?id=${product.shopId}`} className="hover:text-emerald-400">
          {product.shopName}
        </Link>
        <span>/</span>
        <span className="text-slate-200 truncate max-w-[200px] sm:max-w-md">
          {product.name}
        </span>
      </div>

      {/* Shopee Style Product Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl">
        {/* Left Column: Image gallery */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            {/* Type badge overlay */}
            <div className="absolute top-3 left-3">
              <Badge variant={getBadgeVariant(product.type)} className="text-sm px-3 py-1">
                Phân Loại: {product.type}
              </Badge>
            </div>
            {discountPercent > 0 && (
              <div className="absolute top-3 right-3 bg-rose-600 text-white font-bold text-xs px-2.5 py-1 rounded shadow-lg">
                Giảm {discountPercent}%
              </div>
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
                <span className="px-4 py-2 rounded-xl bg-rose-600/90 text-white font-bold text-base shadow-2xl border border-rose-400 tracking-wider">
                  HẾT HÀNG (TẠM NGƯNG)
                </span>
              </div>
            )}
          </div>

          {/* Quick Security Promises */}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400 pt-2">
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col items-center gap-1">
              <ShieldCheckIcon size={16} className="text-emerald-400" />
              <span>Bảo chứng Escrow</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col items-center gap-1">
              <ClockIcon size={16} className="text-cyan-400" />
              <span>Giao key trong 1s</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col items-center gap-1">
              <RefreshCwIcon size={16} className="text-purple-400" />
              <span>1 đổi 1 nếu lỗi</span>
            </div>
          </div>
        </div>

        {/* Right Column: Information & Actions */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Category tag */}
            <div className="flex items-center gap-2">
              <Badge variant={getBadgeVariant(product.type)}>
                {product.type}
              </Badge>
              {product.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-3xl font-extrabold text-white leading-snug">
              {product.name}
            </h1>

            {/* Ratings & Sold Stats */}
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-300 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="font-bold text-base underline">{product.rating}</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} size={14} />
                  ))}
                </div>
              </div>
              <span className="text-slate-600">|</span>
              <span>
                Đã bán:{' '}
                <strong className="text-white font-mono">
                  {product.soldCount.toLocaleString()}
                </strong>
              </span>
              <span className="text-slate-600">|</span>
              <span
                className={`flex items-center gap-1 font-semibold ${
                  isOutOfStock ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                <CheckCircleIcon size={14} />
                Kho có sẵn:{' '}
                <strong className="font-mono text-white ml-1">
                  {product.availableStock}
                </strong>
                {isOutOfStock && <span className="ml-1 text-xs text-rose-400 font-normal">(Hết hàng)</span>}
              </span>
            </div>

            {/* Shopee Price Display Banner */}
            <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-500/30 flex items-baseline gap-4">
              <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <>
                  <span className="text-sm text-slate-500 line-through font-mono">
                    {formatPrice(product.originalPrice)}
                  </span>
                  <span className="text-xs font-bold text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded">
                    TIẾT KIỆM {formatPrice(product.originalPrice - product.price)}
                  </span>
                </>
              )}
            </div>

            {/* Flash Sale Banner */}
            {flashSale && <ProductFlashSaleBanner sale={flashSale} />}

            {/* Description & Key Features */}
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>{product.description}</p>
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Đặc tính sản phẩm & Quyền lợi:
                </p>
                <ul className="space-y-1 text-xs text-slate-400">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4 pt-2">
              <span className="text-xs text-slate-400 font-medium">Số lượng mua:</span>
              <div className="flex items-center border border-slate-700 rounded-lg bg-slate-950">
                <button
                  disabled={isOutOfStock || quantity <= 1}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                >
                  -
                </button>
                <span className="px-4 py-1.5 text-sm font-mono text-white">
                  {isOutOfStock ? 0 : quantity}
                </span>
                <button
                  disabled={isOutOfStock || quantity >= product.availableStock}
                  onClick={() =>
                    setQuantity(Math.min(product.availableStock, quantity + 1))
                  }
                  className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                (Tổng: {formatPrice(product.price * (isOutOfStock ? 0 : quantity))})
              </span>
            </div>
          </div>

          {/* Action Buy Buttons */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
            {isOutOfStock ? (
              <Button
                variant="secondary"
                size="lg"
                disabled
                className="w-full opacity-50 cursor-not-allowed text-rose-400"
              >
                SẢN PHẨM TẠM HẾT HÀNG (OUT OF STOCK)
              </Button>
            ) : (
              <>
                <Link
                  href={`/checkout?productId=${product.id}&quantity=${quantity}`}
                  className="flex-1"
                >
                  <Button
                    variant="neon"
                    size="lg"
                    className="w-full flex items-center justify-center gap-2 text-base font-bold"
                  >
                    <ZapIcon size={20} />
                    MUA NGAY (TRẢ KEY 1S)
                  </Button>
                </Link>

                <Link
                  href={`/checkout?productId=${product.id}&quantity=${quantity}`}
                  className="sm:w-1/3"
                >
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full flex items-center justify-center gap-2 text-sm"
                  >
                    <ShoppingBagIcon size={18} />
                    Thêm Vào Giỏ
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Seller Mini Profile & Guarantee Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={shop.avatar}
            alt={shop.name}
            className="w-14 h-14 rounded-xl object-cover border border-emerald-500/40"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">{shop.name}</h3>
              <Badge variant="success">Chính hãng</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{shop.tagline}</p>
            <p className="text-[11px] text-emerald-400 mt-1 font-mono">
              Đánh giá {shop.rating}/5.0 • {shop.totalSales} đơn hoàn tất
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Link href={`/shop?id=${shop.id}`} className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full text-xs">
              <StoreIcon size={14} className="mr-1" /> Xem Gian Hàng
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
