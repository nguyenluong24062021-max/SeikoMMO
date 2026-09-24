'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  UserDto,
  AuthTokens,
  LoginDto,
  RegisterDto,
  WalletDto,
  TransactionDto,
} from '@repo/shared';
import { api } from './api';

interface AuthContextType {
  user: UserDto | null;
  wallet: WalletDto | null;
  transactions: TransactionDto[];
  isLoading: boolean;
  token: string | null;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => void;
  refreshWallet: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: 'LOGIN' | 'REGISTER') => void;
  closeAuthModal: () => void;
  authModalMode: 'LOGIN' | 'REGISTER';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [wallet, setWallet] = useState<WalletDto | null>(null);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal controls
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const openAuthModal = (mode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const refreshWallet = useCallback(async () => {
    try {
      const res = await api.wallet.getMe();
      if (res.success && res.data) {
        setWallet(res.data.wallet);
        setTransactions(res.data.transactions || []);
      }
    } catch {
      // Ignore wallet fetch error on anonymous / unauth
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await api.users.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch {
      setUser(null);
    }
  }, []);

  // Hydrate session on initial load
  useEffect(() => {
    const savedToken = localStorage.getItem('seiko_access_token');
    if (savedToken) {
      setToken(savedToken);
      Promise.allSettled([refreshProfile(), refreshWallet()]).finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [refreshProfile, refreshWallet]);

  const saveTokens = (tokens: AuthTokens) => {
    localStorage.setItem('seiko_access_token', tokens.accessToken);
    localStorage.setItem('seiko_refresh_token', tokens.refreshToken);
    setToken(tokens.accessToken);
  };

  const login = async (dto: LoginDto) => {
    const res = await api.auth.login(dto);
    if (res.success && res.data) {
      saveTokens(res.data);
      await Promise.allSettled([refreshProfile(), refreshWallet()]);
      closeAuthModal();
    }
  };

  const register = async (dto: RegisterDto) => {
    const res = await api.auth.register(dto);
    if (res.success && res.data) {
      saveTokens(res.data);
      await Promise.allSettled([refreshProfile(), refreshWallet()]);
      closeAuthModal();
    }
  };

  const logout = () => {
    api.auth.logout().catch(() => {});
    localStorage.removeItem('seiko_access_token');
    localStorage.removeItem('seiko_refresh_token');
    setToken(null);
    setUser(null);
    setWallet(null);
    setTransactions([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        transactions,
        isLoading,
        token,
        login,
        register,
        logout,
        refreshWallet,
        refreshProfile,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
