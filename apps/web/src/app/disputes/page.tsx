import { Suspense } from 'react';
import DisputesClient from './disputes-client';

export default function DisputesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Đang tải danh sách khiếu nại...</div>}>
      <DisputesClient />
    </Suspense>
  );
}
