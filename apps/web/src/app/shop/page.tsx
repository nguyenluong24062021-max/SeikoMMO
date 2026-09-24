import { Suspense } from 'react';
import ShopClient from './shop-client';

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Đang tải gian hàng...</div>}>
      <ShopClient />
    </Suspense>
  );
}
