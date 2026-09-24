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
  ServerIcon,
  ZapIcon,
} from '@/components/icons';
import { SmmProviderDto, CreateSmmProviderDto } from '@repo/shared';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'INACTIVE':
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    case 'ERROR':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  }
};

function CreateProviderModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [balanceEndpoint, setBalanceEndpoint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !apiUrl.trim() || !apiKey.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin bắt buộc',
        variant: 'destructive',
      });
      return;
    }

    // Validate URL format
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://') && !apiUrl.startsWith('mock://')) {
      toast({
        title: 'Lỗi',
        description: 'API URL phải bắt đầu bằng http://, https:// hoặc mock://',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const data: CreateSmmProviderDto = {
        name: name.trim(),
        apiUrl: apiUrl.trim(),
        apiKey: apiKey.trim(),
        balanceEndpoint: balanceEndpoint.trim() || undefined,
      };

      const res = await api.smmProviders.create(data);

      if (res.success) {
        toast({
          title: 'Thành công',
          description: 'Provider đã được tạo',
          variant: 'success',
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(res.message || 'Không thể tạo provider');
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
            <h2 className="text-xl font-bold text-white">Tạo SMM Provider Mới</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <XIcon size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Tên Provider <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Mock Provider, Real SMM API"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* API URL */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              API URL <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.example.com hoặc mock://test"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-xs text-slate-400 mt-1">
              Dùng <code className="text-emerald-400">mock://</code> để test không cần API thật
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              API Key <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API key bảo mật"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-xs text-slate-400 mt-1">
              API key sẽ được mã hóa và không hiện lại sau khi lưu
            </p>
          </div>

          {/* Balance Endpoint */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Balance Endpoint (tùy chọn)
            </label>
            <input
              type="text"
              value={balanceEndpoint}
              onChange={(e) => setBalanceEndpoint(e.target.value)}
              placeholder="/api/balance"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-slate-600 transition-colors"
            />
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
              {isSubmitting ? 'Đang tạo...' : 'Tạo Provider'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  onDelete,
  onTest,
}: {
  provider: SmmProviderDto;
  onDelete: () => void;
  onTest: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; balance?: number; message: string } | null>(null);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!confirm(`Xóa provider "${provider.name}"? Tất cả mapping liên quan sẽ bị ảnh hưởng.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.smmProviders.delete(provider.id);
      toast({
        title: 'Đã xóa',
        description: 'Provider đã được xóa',
        variant: 'success',
      });
      onDelete();
    } catch (err: any) {
      toast({
        title: 'Lỗi',
        description: err.message || 'Không thể xóa provider',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.smmProviders.testConnection(provider.id);
      if (res.success && res.data) {
        setTestResult({
          success: res.data.success,
          balance: res.data.balance,
          message: res.data.message,
        });
        toast({
          title: res.data.success ? 'Kết nối thành công' : 'Kết nối thất bại',
          description: res.data.message,
          variant: res.data.success ? 'success' : 'destructive',
        });
      }
      onTest();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Không thể test kết nối',
      });
      toast({
        title: 'Lỗi',
        description: err.message || 'Không thể test kết nối',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ServerIcon size={20} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{provider.name}</h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-semibold ${getStatusColor(
                  provider.status
                )}`}
              >
                {provider.status}
              </span>
            </div>
          </div>
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

        {/* Info */}
        <div className="space-y-2 text-sm mb-4">
          <div>
            <span className="text-slate-400">API URL:</span>
            <span className="ml-2 text-white font-mono text-xs">{provider.apiUrl}</span>
          </div>
          <div>
            <span className="text-slate-400">API Key:</span>
            <span className="ml-2 text-slate-500 font-mono text-xs">{provider.apiKey}</span>
          </div>
          {provider.balanceEndpoint && (
            <div>
              <span className="text-slate-400">Balance Endpoint:</span>
              <span className="ml-2 text-white font-mono text-xs">{provider.balanceEndpoint}</span>
            </div>
          )}
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={`rounded-xl p-3 mb-4 border ${
              testResult.success
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-rose-950/20 border-rose-500/30'
            }`}
          >
            <p className={`text-sm ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
              {testResult.message}
            </p>
            {testResult.balance !== undefined && (
              <p className="text-lg font-bold text-emerald-400 mt-1">
                Balance: {testResult.balance.toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <Button
          variant="neon"
          size="sm"
          onClick={handleTest}
          disabled={isTesting}
          className="w-full"
        >
          <ZapIcon size={14} />
          {isTesting ? 'Đang test...' : 'Test Connection'}
        </Button>
      </div>
    </div>
  );
}

export default function AdminProvidersPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const [providers, setProviders] = useState<SmmProviderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
      return;
    }

    if (user && user.role === 'ADMIN') {
      loadProviders();
    }
  }, [user, isLoading, router]);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const res = await api.smmProviders.getAll();
      if (res.success && res.data) {
        setProviders(res.data);
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi',
        description: err.message || 'Không thể tải danh sách providers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || (user && user.role !== 'ADMIN')) {
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
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Quản lý SMM Providers</h1>
            <p className="text-slate-400 text-sm mt-1">
              Kết nối với các API SMM bên ngoài
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadProviders}>
            <RefreshCwIcon size={16} />
          </Button>
          <Button variant="neon" size="sm" onClick={() => setShowCreateModal(true)}>
            <PlusIcon size={16} />
            Tạo Provider
          </Button>
        </div>
      </div>

      {/* Providers List */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Đang tải providers...</div>
      ) : providers.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <ServerIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p>Chưa có provider nào</p>
          <Button
            variant="neon"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="mt-4"
          >
            <PlusIcon size={14} />
            Tạo Provider Đầu Tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onDelete={loadProviders}
              onTest={loadProviders}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProviderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadProviders}
        />
      )}
    </div>
  );
}
