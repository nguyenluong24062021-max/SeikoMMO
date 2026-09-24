'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftIcon,
  PlusIcon,
  RefreshCwIcon,
  TrashIcon,
  XIcon,
  LinkIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
} from '@/components/icons';
import { ServiceMappingDto, CreateServiceMappingDto, ProductDto, SmmProviderDto } from '@repo/shared';

function CreateMappingModal({
  onClose,
  onSuccess,
  products,
  providers,
}: {
  onClose: () => void;
  onSuccess: () => void;
  products: ProductDto[];
  providers: SmmProviderDto[];
}) {
  const { toast } = useToast();
  const [productId, setProductId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [providerServiceId, setProviderServiceId] = useState('');
  const [ratePerThousand, setRatePerThousand] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId || !providerId || !providerServiceId.trim() || !ratePerThousand) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin',
        variant: 'destructive',
      });
      return;
    }

    const rate = parseFloat(ratePerThousand);
    if (isNaN(rate) || rate <= 0) {
      toast({
        title: 'Lỗi',
        description: 'Rate phải là số dương',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const data: CreateServiceMappingDto = {
        productId,
        providerId,
        providerServiceId: providerServiceId.trim(),
        ratePerThousand: rate,
      };

      const res = await api.serviceMappings.create(data);

      if (res.success) {
        toast({
          title: 'Thành công',
          description: 'Mapping đã được tạo',
          variant: 'success',
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(res.message || 'Không thể tạo mapping');
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi',
        description: err.message || 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Tạo Service Mapping Mới</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <XIcon size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Product */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Product <span className="text-rose-400">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">-- Chọn sản phẩm --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
          </div>

          {/* Provider */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Provider <span className="text-rose-400">*</span>
            </label>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">-- Chọn provider --</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
          </div>

          {/* Provider Service ID */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Provider Service ID <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={providerServiceId}
              onChange={(e) => setProviderServiceId(e.target.value)}
              placeholder="VD: service_123, instagram_followers"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-xs text-slate-400 mt-1">
              Service ID từ provider để thực hiện order
            </p>
          </div>

          {/* Rate Per Thousand */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Rate Per Thousand (VND) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              value={ratePerThousand}
              onChange={(e) => setRatePerThousand(e.target.value)}
              placeholder="10000"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-xs text-slate-400 mt-1">
              Chi phí trên mỗi 1000 đơn vị (VD: 1000 follower)
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="neon"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo Mapping'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MappingCard({
  mapping,
  onDelete,
  onToggle,
}: {
  mapping: ServiceMappingDto;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!confirm(`Xóa mapping cho "${mapping.productName}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.serviceMappings.delete(mapping.id);
      toast({
        title: 'Đã xóa',
        description: 'Mapping đã được xóa',
        variant: 'success',
      });
      onDelete();
    } catch (err: any) {
      toast({
        title: 'Lỗi',
        description: err.message || 'Không thể xóa mapping',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      const res = await api.serviceMappings.update(mapping.id, {
        isActive: !mapping.isActive,
      });

      if (res.success) {
        toast({
          title: 'Thành công',
          description: `Mapping đã được ${!mapping.isActive ? 'bật' : 'tắt'}`,
          variant: 'success',
        });
        onToggle();
      } else {
        throw new Error(res.message || 'Không thể cập nhật mapping');
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi',
        description: err.message || 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    } finally {
      setIsToggling(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  return (
    <div className={`bg-slate-900/90 rounded-2xl border overflow-hidden shadow-lg ${
      mapping.isActive ? 'border-slate-700' : 'border-slate-800 opacity-60'
    }`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              mapping.isActive ? 'bg-emerald-500/10' : 'bg-slate-800'
            }`}>
              <LinkIcon size={20} className={mapping.isActive ? 'text-emerald-400' : 'text-slate-500'} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{mapping.productName}</h3>
              <p className="text-xs text-slate-400">{mapping.providerName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggle}
              disabled={isToggling}
              className={`p-2 rounded-lg transition-colors ${
                mapping.isActive
                  ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              title={mapping.isActive ? 'Tắt' : 'Bật'}
            >
              {mapping.isActive ? <ToggleRightIcon size={18} /> : <ToggleLeftIcon size={18} />}
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-rose-400 hover:text-rose-300"
            >
              <TrashIcon size={14} />
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-slate-400">Provider Service ID:</span>
            <span className="ml-2 text-white font-mono text-xs">{mapping.providerServiceId}</span>
          </div>
          <div>
            <span className="text-slate-400">Rate per 1000:</span>
            <span className="ml-2 text-emerald-400 font-semibold">
              {formatPrice(mapping.ratePerThousand)}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Trạng thái:</span>
            <span className={`ml-2 font-semibold ${
              mapping.isActive ? 'text-emerald-400' : 'text-slate-500'
            }`}>
              {mapping.isActive ? 'Đang hoạt động' : 'Đã tắt'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SellerMappingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const [mappings, setMappings] = useState<ServiceMappingDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [providers, setProviders] = useState<SmmProviderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, isLoading, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mappingsRes, productsRes, providersRes] = await Promise.all([
        api.serviceMappings.getAll(),
        api.products.getAll(),
        api.smmProviders.getAll(),
      ]);

      if (mappingsRes.success && mappingsRes.data) {
        setMappings(mappingsRes.data);
      }
      if (productsRes.success && productsRes.data) {
        setProducts(productsRes.data);
      }
      if (providersRes.success && providersRes.data) {
        setProviders(providersRes.data);
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi',
        description: err.message || 'Không thể tải dữ liệu',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-slate-400">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Service Mappings</h1>
            <p className="text-slate-400 text-sm mt-1">
              Kết nối sản phẩm với SMM provider
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCwIcon size={16} />
          </Button>
          <Button variant="neon" size="sm" onClick={() => setShowCreateModal(true)}>
            <PlusIcon size={16} />
            Tạo Mapping
          </Button>
        </div>
      </div>

      {/* Mappings List */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Đang tải mappings...</div>
      ) : mappings.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <LinkIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p>Chưa có mapping nào</p>
          <Button
            variant="neon"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="mt-4"
          >
            <PlusIcon size={14} />
            Tạo Mapping Đầu Tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mappings.map((mapping) => (
            <MappingCard
              key={mapping.id}
              mapping={mapping}
              onDelete={loadData}
              onToggle={loadData}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateMappingModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
          products={products}
          providers={providers}
        />
      )}
    </div>
  );
}
