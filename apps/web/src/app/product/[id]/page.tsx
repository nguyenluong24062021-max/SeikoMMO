import { MOCK_PRODUCTS } from '@/lib/mock-data';
import ProductDetailClient from './client-page';

export function generateStaticParams() {
  return MOCK_PRODUCTS.map((product) => ({
    id: product.id,
  }));
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  return <ProductDetailClient productId={params.id} />;
}
