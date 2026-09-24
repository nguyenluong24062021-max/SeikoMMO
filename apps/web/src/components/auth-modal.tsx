'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@repo/shared';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ZapIcon } from './icons';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode, login, register } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.BUYER);
  const [referredBy, setReferredBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read ref query param from URL when modal opens
  useEffect(() => {
    if (isAuthModalOpen && mode === 'REGISTER' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref');
      if (refCode) {
        setReferredBy(refCode);
      }
    }
  }, [isAuthModalOpen, mode]);

  // Sync mode if parent opened with mode
  useEffect(() => {
    setMode(authModalMode);
    setError(null);
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'LOGIN') {
        await login({ email, password });
      } else {
        await register({ 
          email, 
          password, 
          name: name.trim() || 'Người dùng MMO', 
          role,
          referredBy: referredBy.trim() || undefined,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (quickRole: 'BUYER' | 'SELLER') => {
    if (quickRole === 'BUYER') {
      setEmail('buyer@test.com');
      setPassword('password123');
      setName('Thành Viên Mua Hàng');
      setRole(UserRole.BUYER);
    } else {
      setEmail('seller@test.com');
      setPassword('password123');
      setName('Chủ Gian Hàng Seller');
      setRole(UserRole.SELLER);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 sm:p-8 shadow-2xl shadow-emerald-950/40">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pb-5 border-b border-slate-800/80">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <ZapIcon size={12} />
            <span>SEIKO MMO ACCESS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {mode === 'LOGIN' ? 'Đăng Nhập Tài Khoản' : 'Tạo Tài Khoản Mới'}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'LOGIN'
              ? 'Đăng nhập để quản lý đơn hàng, kho key và số dư ví'
              : 'Giao dịch an toàn, nhận key bản quyền tự động ngay sau 1s'}
          </p>
        </div>

        {/* Quick fill accounts for fast demo / testing */}
        <div className="pt-4 pb-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-medium">
            <span>Điền nhanh tài khoản test:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillQuickAccount('BUYER')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-xs text-slate-300 hover:text-emerald-400 text-left transition-colors flex items-center justify-between"
            >
              <span>Buyer (Người mua)</span>
              <Badge variant="tool" className="text-[10px] px-1 py-0">Buyer</Badge>
            </button>
            <button
              type="button"
              onClick={() => fillQuickAccount('SELLER')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-xs text-slate-300 hover:text-emerald-400 text-left transition-colors flex items-center justify-between"
            >
              <span>Seller (Người bán)</span>
              <Badge variant="digital" className="text-[10px] px-1 py-0">Seller</Badge>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <p className="leading-snug">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {mode === 'REGISTER' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Họ và tên / Biệt danh
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Nguyễn Văn MMO"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Vai trò tài khoản
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole(UserRole.BUYER)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                      role === UserRole.BUYER
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🛒 Người Mua (Buyer)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole(UserRole.SELLER)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                      role === UserRole.SELLER
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🏪 Người Bán (Seller)
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Địa chỉ Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {mode === 'REGISTER' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mã giới thiệu (Tùy chọn)
              </label>
              <input
                type="text"
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value.toUpperCase())}
                placeholder="Nhập mã giới thiệu nếu có"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono uppercase"
              />
              {referredBy && (
                <p className="text-xs text-emerald-400 mt-1">
                  ✓ Bạn được giới thiệu bởi: <strong>{referredBy}</strong>
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            variant="neon"
            disabled={loading}
            className="w-full py-2.5 font-bold text-sm tracking-wide mt-2"
          >
            {loading
              ? 'Đang xử lý...'
              : mode === 'LOGIN'
              ? 'ĐĂNG NHẬP NGAY'
              : 'HOÀN TẤT ĐĂNG KÝ'}
          </Button>
        </form>

        {/* Footer switcher */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          {mode === 'LOGIN' ? (
            <p>
              Chưa có tài khoản Seiko MMO?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setError(null);
                }}
                className="text-emerald-400 font-semibold hover:underline"
              >
                Đăng ký ngay
              </button>
            </p>
          ) : (
            <p>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setError(null);
                }}
                className="text-emerald-400 font-semibold hover:underline"
              >
                Đăng nhập
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
