'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MOCK_PRODUCTS, ProductItem } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { OrderDto, VoucherDto, VoucherType, FlashSaleDto } from '@repo/shared';
import {
  WalletIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  CopyIcon,
  ZapIcon,
  ArrowLeftIcon,
  TicketIcon,
  PercentIcon,
  XIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
} from '@/components/icons';

export default function CheckoutClient() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId') || 'prod-1';
  const quantityParam = parseInt(searchParams.get('quantity') || '1', 10);

  const { user, wallet, refreshWallet, openAuthModal } = useAuth();
  const { toast } = useToast();

  const [quantity, setQuantity] = useState(quantityParam);
  const [product, setProduct] = useState<ProductItem>(() => {
    return MOCK_PRODUCTS.find((p) => p.id === productId) || MOCK_PRODUCTS[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<OrderDto | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [flashSale, setFlashSale] = useState<FlashSaleDto | null>(null);

  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherInfo, setVoucherInfo] = useState<VoucherDto | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  // Fetch real product details to know real availableStock and price
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
            tags: fallback.tags || [p.type],
            features: fallback.features || [],
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
        // No flash sale
      });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const currentBalance = wallet ? wallet.balance : 0;
  
  // Use flash sale price if available, otherwise use regular price
  const effectivePrice = flashSale ? flashSale.salePrice : product.price;
  const subtotal = effectivePrice * quantity;

  // Calculate discount amount from voucher
  const computeDiscountAmount = useCallback(
    (voucher: VoucherDto | null): number => {
      if (!voucher) return 0;
      
      // Block percentage vouchers during flash sale
      if (flashSale && voucher.type === VoucherType.PERCENTAGE) {
        return 0;
      }
      
      if (voucher.type === VoucherType.PERCENTAGE) {
        return Math.floor((subtotal * voucher.value) / 100);
      }
      return Math.min(voucher.value, subtotal);
    },
    [subtotal, flashSale]
  );

  const discountAmount = computeDiscountAmount(voucherInfo);
  const totalAmount = subtotal - discountAmount;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  // Apply voucher: call GET /vouchers/:code
  const handleApplyVoucher = async () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;
    if (!user) {
      openAuthModal('LOGIN');
      return;
    }

    setVoucherError(null);
    setIsApplyingVoucher(true);
    try {
      const res = await api.vouchers.getByCode(code);
      if (res.success && res.data) {
        const v = res.data;
        // Client-side validation
        if (!v.isActive) {
          setVoucherError('Voucher này đã bị vô hiệu hóa.');
          setVoucherInfo(null);
          return;
        }
        if (v.usedCount >= v.maxUses) {
          setVoucherError(`Voucher đã đạt giới hạn sử dụng (${v.maxUses} lần).`);
          setVoucherInfo(null);
          return;
        }
        if (v.expiresAt && new Date(v.expiresAt) < new Date()) {
          setVoucherError('Voucher đã hết hạn.');
          setVoucherInfo(null);
          return;
        }
        setVoucherInfo(v);
        setVoucherCode(code);
        const discount = computeDiscountAmount(v);
        toast({
          title: 'Áp dụng voucher thành công!',
          description: `Giảm ${v.type === VoucherType.PERCENTAGE ? `${v.value}%` : formatPrice(v.value)} — Tiết kiệm được ${formatPrice(discount)}.`,
          variant: 'success',
        });
      } else {
        setVoucherError('Mã voucher không hợp lệ hoặc không tồn tại.');
        setVoucherInfo(null);
      }
    } catch (err: any) {
      setVoucherError(err.message || 'Không tìm thấy mã voucher này.');
      setVoucherInfo(null);
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherInfo(null);
    setVoucherCode('');
    setVoucherInput('');
    setVoucherError(null);
  };

  const handlePayNow = async () => {
    setOrderError(null);

    // 1. Must be logged in
    if (!user) {
      openAuthModal('LOGIN');
      toast({
        title: 'Cần đăng nhập',
        description: 'Vui lòng đăng nhập tài khoản để thanh toán.',
        variant: 'warning',
      });
      return;
    }

    // 2. Validate stock
    if (product.availableStock < quantity) {
      const msg = `Sản phẩm "${product.name}" đã hết hàng hoặc không đủ tồn kho (Còn ${product.availableStock} key).`;
      setOrderError(msg);
      toast({
        title: 'Hết hàng / Không đủ tồn kho',
        description: msg,
        variant: 'destructive',
      });
      return;
    }

    // 3. Validate balance
    if (currentBalance < totalAmount) {
      const msg = `Số dư ví không đủ (Cần: ${formatPrice(totalAmount)}, Hiện có: ${formatPrice(currentBalance)}).`;
      setOrderError(msg);
      toast({
        title: 'Số dư ví không đủ',
        description: msg,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.orders.create({
        items: [
          {
            productId: product.id,
            quantity,
          },
        ],
        ...(voucherCode ? { voucherCode } : {}),
      });

      if (res.success && res.data) {
        setCompletedOrder(res.data);
        await refreshWallet();
        toast({
          title: 'Đặt hàng thành công!',
          description: `Đơn hàng #${res.data.id.slice(0, 8)} đã được thanh toán và giao key ngay lập tức.`,
          variant: 'success',
        });
      } else {
        throw new Error(res.message || 'Không thể tạo đơn hàng');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Có lỗi xảy ra khi tạo đơn hàng';
      setOrderError(errorMsg);
      toast({
        title: 'Lỗi thanh toán',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyKeyToClipboard = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(keyText);
    toast({
      title: 'Đã sao chép!',
      description: 'Mã key bản quyền đã được lưu vào clipboard.',
      variant: 'success',
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Delivered keys returned from backend order
  const deliveredKeys =
    completedOrder?.deliveredKeys && completedOrder.deliveredKeys.length > 0
      ? completedOrder.deliveredKeys
      : completedOrder?.stocks?.map((s) => s.key) || [];

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-emerald-400 flex items-center gap-1">
          <ArrowLeftIcon size={14} /> Tiếp tục mua sắm
        </Link>
        <span>/</span>
        <span className="text-slate-200 font-medium">
          Thanh toán &amp; Nhận hàng tức thì qua API
        </span>
      </div>

      {!completedOrder ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Order Items & Payment Methods */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Item Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center justify-between pb-3 border-b border-slate-800">
                <span>1. Sản phẩm trong đơn hàng</span>
                <Badge variant="digital">Giao tự động 1s</Badge>
              </h2>

              <div className="flex gap-4 items-start">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-20 h-20 rounded-xl object-cover border border-slate-800 bg-slate-950 flex-shrink-0"
                />
                <div className="flex-1 space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                    {product.shopName}
                  </span>
                  <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {formatPrice(product.price)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">SL:</span>
                      <div className="flex items-center border border-slate-700 rounded bg-slate-950">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="px-2 py-0.5 text-xs text-slate-300 hover:text-white"
                        >
                          -
                        </button>
                        <span className="px-2.5 py-0.5 text-xs font-mono">
                          {quantity}
                        </span>
                        <button
                          onClick={() =>
                            setQuantity(
                              Math.min(product.availableStock, quantity + 1)
                            )
                          }
                          className="px-2 py-0.5 text-xs text-slate-300 hover:text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-xs flex items-center justify-between text-slate-400 border-t border-slate-800/60">
                <span>Kho có sẵn:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {product.availableStock} key
                </span>
              </div>
            </div>

            {/* 2. Voucher Input Section */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white pb-3 border-b border-slate-800 flex items-center gap-2">
                <TicketIcon size={16} className="text-amber-400" />
                <span>2. Mã Giảm Giá (Voucher)</span>
                <span className="text-xs font-normal text-slate-400 ml-auto">Tuỳ chọn</span>
              </h2>

              {voucherInfo ? (
                /* Applied voucher display */
                <div className="flex items-center justify-between p-3 rounded-xl border border-amber-500/50 bg-amber-950/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                      <PercentIcon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-300 font-mono">{voucherInfo.code}</p>
                      <p className="text-xs text-slate-400">
                        {voucherInfo.type === VoucherType.PERCENTAGE
                          ? `Giảm ${voucherInfo.value}% tổng đơn`
                          : `Giảm cố định ${formatPrice(voucherInfo.value)}`}
                        {' · '}
                        <span className="text-emerald-400 font-semibold">
                          Tiết kiệm {formatPrice(discountAmount)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveVoucher}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Xoá voucher"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              ) : (
                /* Voucher input */
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập mã voucher (VD: SALE10, NEWUSER50...)"
                      value={voucherInput}
                      onChange={(e) => {
                        setVoucherInput(e.target.value.toUpperCase());
                        setVoucherError(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono transition-colors"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyVoucher}
                      disabled={isApplyingVoucher || !voucherInput.trim()}
                      className="px-4 whitespace-nowrap"
                    >
                      {isApplyingVoucher ? (
                        <RefreshCwIcon size={14} className="animate-spin" />
                      ) : (
                        'Áp dụng'
                      )}
                    </Button>
                  </div>

                  {voucherError && (
                    <p className="text-xs text-rose-400 flex items-center gap-1.5">
                      <span>⚠️</span> {voucherError}
                    </p>
                  )}

                  {flashSale && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-300">
                      <AlertTriangleIcon size={14} className="flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Flash Sale đang diễn ra:</strong> Voucher giảm % không áp dụng được. Chỉ voucher giảm số tiền cố định (VND) mới có hiệu lực.
                      </span>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500">
                    Mã voucher sẽ được xác thực và áp dụng giảm giá trước khi thanh toán.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Payment Method Selector */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white pb-3 border-b border-slate-800 flex items-center justify-between">
                <span>3. Phương thức thanh toán</span>
                <span className="text-xs text-emerald-400 font-normal">
                  Khớp lệnh tự động qua API
                </span>
              </h2>

              <div className="space-y-3">
                {/* Method 1: Seiko Wallet */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500 bg-emerald-950/30 shadow-md shadow-emerald-950/40">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-xs">
                      ✓
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        Ví Seiko MMO (Trừ tiền tự động)
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Bearer Auth
                        </span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {user
                          ? `Đang dùng tài khoản: ${user.email}`
                          : 'Bạn chưa đăng nhập. Nhấn thanh toán để đăng nhập'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">Số dư ví thực tế</p>
                    <p className="text-sm font-bold text-emerald-400 font-mono">
                      {formatPrice(currentBalance)}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Cần nạp thêm tiền vào tài khoản?</span>
                  <Link href="/wallet" className="text-emerald-400 hover:underline font-semibold">
                    Đến trang Quản Lý Ví &amp; Nạp Tiền →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Checkout Button */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-5 sticky top-24">
              <h2 className="text-base font-bold text-white pb-3 border-b border-slate-800">
                Tóm tắt thanh toán
              </h2>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Tiền hàng ({quantity} sản phẩm):
                  </span>
                  <span className="font-mono text-slate-100">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {/* Flash Sale discount display */}
                {flashSale && (
                  <div className="flex items-start justify-between p-3 rounded-xl bg-rose-950/30 border border-rose-500/40">
                    <div className="flex items-start gap-2">
                      <ZapIcon size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-rose-300 font-semibold">Flash Sale đang áp dụng</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Giá gốc: <span className="line-through">{formatPrice(product.price * quantity)}</span>
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-rose-400 font-bold whitespace-nowrap">
                      -{formatPrice((product.price - flashSale.salePrice) * quantity)}
                    </span>
                  </div>
                )}

                {/* Voucher discount row */}
                {voucherInfo && discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <TicketIcon size={12} className="text-amber-400" />
                      Giảm giá voucher ({voucherInfo.code}):
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      -{formatPrice(discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-400">Phí giao dịch nền tảng:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    0 ₫ (Miễn phí)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bảo hiểm Escrow hoàn tiền:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    Đã kích hoạt 100%
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-white">Tổng cộng:</span>
                  <div className="text-right">
                    {voucherInfo && discountAmount > 0 && (
                      <p className="text-xs text-slate-500 line-through font-mono">
                        {formatPrice(subtotal)}
                      </p>
                    )}
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      {formatPrice(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error warning */}
              {orderError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1 text-rose-400">
                    <span>⚠️ Lỗi đặt hàng:</span>
                  </div>
                  <p>{orderError}</p>
                </div>
              )}

              {/* Insufficient balance hint */}
              {user && currentBalance < totalAmount && !orderError && (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs">
                  Số dư ví hiện tại ({formatPrice(currentBalance)}) nhỏ hơn tổng tiền ({formatPrice(totalAmount)}). Bạn cần nạp thêm trước khi đặt.
                </div>
              )}

              {/* Confirm and Pay Button */}
              <Button
                variant="neon"
                size="lg"
                onClick={handlePayNow}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 text-base font-bold py-3.5"
              >
                <ZapIcon size={20} />
                {isSubmitting
                  ? 'ĐANG GỌI API & TRỪ TIỀN VÍ...'
                  : `XÁC NHẬN MUA NGAY (${formatPrice(totalAmount)})`}
              </Button>

              <div className="text-[11px] text-slate-400 space-y-1.5 pt-2 text-center">
                <p className="flex items-center justify-center gap-1 text-emerald-400 font-medium">
                  <ShieldCheckIcon size={14} />
                  Ký quỹ Seiko Escrow bảo vệ người mua 100%
                </p>
                <p>Gọi POST /orders với Bearer token • Giao key tức thì</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ORDER COMPLETED & REAL INSTANT KEY DELIVERY SCREEN */
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 via-slate-900 to-slate-900 p-6 sm:p-10 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
            <CheckCircleIcon size={36} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Giao Dịch Thành Công!
            </h1>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Đơn hàng <strong className="text-emerald-400 font-mono">#{completedOrder.id.slice(0, 8)}</strong> đã được trừ ví và giao key thành công từ hệ thống Seiko MMO.
            </p>
            {completedOrder.voucherCode && completedOrder.discountAmount && completedOrder.discountAmount > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs">
                <TicketIcon size={14} />
                Đã áp dụng voucher <strong className="font-mono">{completedOrder.voucherCode}</strong> — Tiết kiệm {formatPrice(completedOrder.discountAmount)}
              </div>
            )}
          </div>

          {/* Delivered Keys Presentation */}
          <div className="max-w-xl mx-auto rounded-xl border border-emerald-500/40 bg-slate-950 p-5 text-left space-y-3 shadow-inner">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
              <span className="font-semibold text-slate-200">
                Key Bản Quyền Được Giao Tức Thì ({deliveredKeys.length} key):
              </span>
              <span className="text-emerald-400 font-mono">
                Trạng thái: DELIVERED
              </span>
            </div>

            {deliveredKeys.length > 0 ? (
              <div className="space-y-2">
                {deliveredKeys.map((k, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800"
                  >
                    <code className="text-sm sm:text-base font-mono text-emerald-400 font-bold tracking-wider select-all break-all">
                      {k}
                    </code>
                    <button
                      onClick={() => copyKeyToClipboard(k)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex-shrink-0"
                    >
                      <CopyIcon size={14} />
                      {copiedKey === k ? 'Đã chép!' : 'Sao chép'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-slate-900 rounded-lg text-xs text-slate-400">
                Đơn hàng kỹ thuật số đã được ghi nhận.
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              * Key đã được xuất từ kho backend và kích hoạt trực tiếp trên hệ thống.
            </p>
          </div>

          {/* Remaining Balance Display */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
            <WalletIcon size={16} className="text-emerald-400" />
            <span>
              Số dư ví hiện tại:{' '}
              <strong className="text-emerald-400 font-mono">
                {formatPrice(currentBalance)}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/">
              <Button variant="neon" size="md">
                Tiếp Tục Mua Sắm
              </Button>
            </Link>
            <Link href="/orders">
              <Button variant="secondary" size="md">
                Xem Đơn Hàng
              </Button>
            </Link>
            <Button
              variant="outline"
              size="md"
              onClick={() => setCompletedOrder(null)}
            >
              Tạo Đơn Hàng Khác
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
