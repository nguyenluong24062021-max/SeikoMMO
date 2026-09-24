import { Suspense } from 'react';
import CheckoutClient from './checkout-client';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Đang tải đơn hàng...</div>}>
      <CheckoutClient />
    </Suspense>
  );
}
