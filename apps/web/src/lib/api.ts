import {
  ApiResponse,
  AuthTokens,
  LoginDto,
  RegisterDto,
  UserDto,
  ProductDto,
  CreateOrderDto,
  OrderDto,
  VoucherDto,
  DisputeDto,
  CreateDisputeDto,
  DepositResponseDto,
  WalletWithHistoryDto,
  TransactionDto,
  FlashSaleDto,
  AffiliateStatsDto,
  SmmProviderDto,
  CreateSmmProviderDto,
  UpdateSmmProviderDto,
  ServiceMappingDto,
  CreateServiceMappingDto,
  UpdateServiceMappingDto,
  TestProviderConnectionResponse,
  CreateCryptoDepositDto,
  CryptoInvoiceDto,
  CryptoCurrency,
} from '@repo/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.map((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private getHeaders(customHeaders?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('seiko_access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return {
      ...headers,
      ...(customHeaders as Record<string, string>),
    };
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const refreshToken = localStorage.getItem('seiko_refresh_token');
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Refresh token invalid');
      }

      const json = await res.json();
      if (json.success && json.data) {
        localStorage.setItem('seiko_access_token', json.data.accessToken);
        localStorage.setItem('seiko_refresh_token', json.data.refreshToken);
        return json.data.accessToken;
      }
      return null;
    } catch {
      localStorage.removeItem('seiko_access_token');
      localStorage.removeItem('seiko_refresh_token');
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = this.getHeaders(options.headers);

    let res: Response;
    try {
      res = await fetch(url, {
        ...options,
        headers,
      });
    } catch {
      throw new Error(
        `Không thể kết nối máy chủ API (${API_BASE_URL}). Vui lòng đảm bảo backend đang chạy.`
      );
    }

    // Auto-refresh token on 401 Unauthorized if not login/register/refresh
    if (
      res.status === 401 &&
      retryCount === 0 &&
      !endpoint.startsWith('/auth/login') &&
      !endpoint.startsWith('/auth/register') &&
      !endpoint.startsWith('/auth/refresh')
    ) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        const newToken = await this.refreshAccessToken();
        this.isRefreshing = false;

        if (newToken) {
          this.onRefreshed(newToken);
          return this.request<T>(endpoint, options, retryCount + 1);
        }
      } else {
        // Wait for refresh to finish
        const newToken = await new Promise<string>((resolve) => {
          this.subscribeTokenRefresh((token) => resolve(token));
        });
        if (newToken) {
          return this.request<T>(endpoint, options, retryCount + 1);
        }
      }
    }

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      let errorMessage =
        json?.message ||
        json?.error ||
        `Yêu cầu thất bại với mã lỗi HTTP ${res.status}`;
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage.join(', ');
      }
      throw new Error(errorMessage);
    }

    return json as T;
  }

  // Authentication
  auth = {
    register: async (dto: RegisterDto): Promise<ApiResponse<AuthTokens>> => {
      return this.request<ApiResponse<AuthTokens>>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },

    login: async (dto: LoginDto): Promise<ApiResponse<AuthTokens>> => {
      return this.request<ApiResponse<AuthTokens>>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },

    refresh: async (): Promise<string | null> => {
      return this.refreshAccessToken();
    },

    logout: async (): Promise<ApiResponse<void>> => {
      return this.request<ApiResponse<void>>('/auth/logout', {
        method: 'POST',
      });
    },
  };

  // User profile
  users = {
    getMe: async (): Promise<ApiResponse<UserDto>> => {
      return this.request<ApiResponse<UserDto>>('/users/me');
    },
  };

  // Products
  products = {
    getAll: async (shopId?: string): Promise<ApiResponse<ProductDto[]>> => {
      const query = shopId ? `?shopId=${encodeURIComponent(shopId)}` : '';
      return this.request<ApiResponse<ProductDto[]>>(`/products${query}`);
    },

    getById: async (id: string): Promise<ApiResponse<ProductDto>> => {
      return this.request<ApiResponse<ProductDto>>(`/products/${id}`);
    },
  };

  // Orders
  orders = {
    create: async (dto: CreateOrderDto): Promise<ApiResponse<OrderDto>> => {
      return this.request<ApiResponse<OrderDto>>('/orders', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },

    getAll: async (): Promise<ApiResponse<OrderDto[]>> => {
      return this.request<ApiResponse<OrderDto[]>>('/orders');
    },

    getById: async (id: string): Promise<ApiResponse<OrderDto>> => {
      return this.request<ApiResponse<OrderDto>>(`/orders/${id}`);
    },
  };

  // Vouchers
  vouchers = {
    getByCode: async (code: string): Promise<ApiResponse<VoucherDto>> => {
      return this.request<ApiResponse<VoucherDto>>(`/vouchers/${encodeURIComponent(code)}`);
    },
  };

  // Disputes
  disputes = {
    getAll: async (): Promise<ApiResponse<DisputeDto[]>> => {
      return this.request<ApiResponse<DisputeDto[]>>('/disputes');
    },

    getById: async (id: string): Promise<ApiResponse<DisputeDto>> => {
      return this.request<ApiResponse<DisputeDto>>(`/disputes/${id}`);
    },

    create: async (dto: CreateDisputeDto): Promise<ApiResponse<DisputeDto>> => {
      return this.request<ApiResponse<DisputeDto>>('/disputes', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
  };

  // Flash Sales
  flashSales = {
    getActive: async (): Promise<ApiResponse<FlashSaleDto[]>> => {
      return this.request<ApiResponse<FlashSaleDto[]>>('/flash-sales/active');
    },

    getByProductId: async (productId: string): Promise<ApiResponse<FlashSaleDto | null>> => {
      return this.request<ApiResponse<FlashSaleDto | null>>(`/flash-sales?productId=${encodeURIComponent(productId)}`);
    },
  };

  // Wallet
  wallet = {
    getMe: async (): Promise<ApiResponse<WalletWithHistoryDto>> => {
      return this.request<ApiResponse<WalletWithHistoryDto>>('/wallet/me');
    },

    deposit: async (amount: number): Promise<ApiResponse<DepositResponseDto>> => {
      return this.request<ApiResponse<DepositResponseDto>>('/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
    },

    confirmDeposit: async (
      transactionId: string,
      amount: number
    ): Promise<ApiResponse<TransactionDto>> => {
      return this.request<ApiResponse<TransactionDto>>(
        '/wallet/deposit/confirm',
        {
          method: 'POST',
          body: JSON.stringify({ transactionId, amount }),
        }
      );
    },

    depositCrypto: async (dto: CreateCryptoDepositDto): Promise<ApiResponse<CryptoInvoiceDto>> => {
      return this.request<ApiResponse<CryptoInvoiceDto>>('/wallet/deposit-crypto', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
  };

  // Admin endpoints
  admin = {
    getOrders: async (status?: string): Promise<ApiResponse<OrderDto[]>> => {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await this.request<ApiResponse<{ orders: OrderDto[] }>>(`/admin/orders${query}`);
      return { ...res, data: (res.data as unknown as { orders?: OrderDto[] })?.orders ?? (res.data as unknown as OrderDto[]) };
    },

    getPayouts: async (): Promise<ApiResponse<any[]>> => {
      const res = await this.request<ApiResponse<any>>('/admin/payouts');
      return { ...res, data: res.data?.payouts ?? res.data };
    },

    approvePayout: async (id: string, data: { status: string; adminNote?: string }): Promise<ApiResponse<any>> => {
      return this.request<ApiResponse<any>>(`/admin/payouts/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    getStats: async (): Promise<ApiResponse<any>> => {
      return this.request<ApiResponse<any>>('/admin/stats/overview');
    },
  };

  // Seller endpoints
  seller = {
    // Vouchers
    createVoucher: async (data: any): Promise<ApiResponse<VoucherDto>> => {
      return this.request<ApiResponse<VoucherDto>>('/vouchers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getMyVouchers: async (): Promise<ApiResponse<VoucherDto[]>> => {
      return this.request<ApiResponse<VoucherDto[]>>('/vouchers');
    },

    updateVoucher: async (code: string, data: any): Promise<ApiResponse<VoucherDto>> => {
      return this.request<ApiResponse<VoucherDto>>(`/vouchers/${encodeURIComponent(code)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    // Payouts
    createPayout: async (data: { amount: number; description?: string }): Promise<ApiResponse<any>> => {
      return this.request<ApiResponse<any>>('/payouts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getMyPayouts: async (): Promise<ApiResponse<any[]>> => {
      return this.request<ApiResponse<any[]>>('/payouts');
    },
  };

  // Affiliate endpoints
  affiliate = {
    getStats: async (): Promise<ApiResponse<AffiliateStatsDto>> => {
      return this.request<ApiResponse<AffiliateStatsDto>>('/affiliate/stats');
    },
  };

  // SMM Provider endpoints (Admin only)
  smmProviders = {
    create: async (data: CreateSmmProviderDto): Promise<ApiResponse<SmmProviderDto>> => {
      return this.request<ApiResponse<SmmProviderDto>>('/smm/providers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getAll: async (): Promise<ApiResponse<SmmProviderDto[]>> => {
      return this.request<ApiResponse<SmmProviderDto[]>>('/smm/providers');
    },

    getOne: async (id: string): Promise<ApiResponse<SmmProviderDto>> => {
      return this.request<ApiResponse<SmmProviderDto>>(`/smm/providers/${id}`);
    },

    update: async (id: string, data: UpdateSmmProviderDto): Promise<ApiResponse<SmmProviderDto>> => {
      return this.request<ApiResponse<SmmProviderDto>>(`/smm/providers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string): Promise<void> => {
      return this.request<void>(`/smm/providers/${id}`, {
        method: 'DELETE',
      });
    },

    testConnection: async (id: string): Promise<ApiResponse<TestProviderConnectionResponse>> => {
      return this.request<ApiResponse<TestProviderConnectionResponse>>(`/smm/providers/${id}/test`, {
        method: 'POST',
      });
    },
  };

  // Service Mapping endpoints (Admin only)
  serviceMappings = {
    create: async (data: CreateServiceMappingDto): Promise<ApiResponse<ServiceMappingDto>> => {
      return this.request<ApiResponse<ServiceMappingDto>>('/smm/mappings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getAll: async (productId?: string, providerId?: string): Promise<ApiResponse<ServiceMappingDto[]>> => {
      const params = new URLSearchParams();
      if (productId) params.append('productId', productId);
      if (providerId) params.append('providerId', providerId);
      const query = params.toString();
      return this.request<ApiResponse<ServiceMappingDto[]>>(`/smm/mappings${query ? `?${query}` : ''}`);
    },

    getByProduct: async (productId: string): Promise<ApiResponse<ServiceMappingDto[]>> => {
      return this.request<ApiResponse<ServiceMappingDto[]>>(`/smm/mappings/product/${productId}`);
    },

    getOne: async (id: string): Promise<ApiResponse<ServiceMappingDto>> => {
      return this.request<ApiResponse<ServiceMappingDto>>(`/smm/mappings/${id}`);
    },

    update: async (id: string, data: UpdateServiceMappingDto): Promise<ApiResponse<ServiceMappingDto>> => {
      return this.request<ApiResponse<ServiceMappingDto>>(`/smm/mappings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string): Promise<void> => {
      return this.request<void>(`/smm/mappings/${id}`, {
        method: 'DELETE',
      });
    },
  };
}

export const api = new ApiClient();

// Re-export enums for convenience
export { CryptoCurrency };
