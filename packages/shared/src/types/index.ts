// Base API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Health Check
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
}

// Enums
export enum UserRole {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
}

export enum ProductType {
  DIGITAL = 'DIGITAL',
  TOOL = 'TOOL',
  SEEDING = 'SEEDING',
}

export enum StockStatus {
  AVAILABLE = 'AVAILABLE',
  SOLD = 'SOLD',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  PAYMENT = 'PAYMENT',
  PAYOUT = 'PAYOUT',
  REFUND = 'REFUND',
  COMMISSION = 'COMMISSION',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum VoucherType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum PaymentProvider {
  SEPAY = 'SEPAY',
  NOWPAYMENTS = 'NOWPAYMENTS',
  MANUAL = 'MANUAL',
}

export enum CryptoCurrency {
  USDT_TRC20 = 'USDT_TRC20',
  USDT_ERC20 = 'USDT_ERC20',
  USDT_BEP20 = 'USDT_BEP20',
  BTC = 'BTC',
  ETH = 'ETH',
}

// Auth DTOs
export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  referredBy?: string; // Optional referral code from another user
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

// User DTOs
export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  referralCode?: string | null;
  referredBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Shop DTOs
export interface CreateShopDto {
  name: string;
  description?: string;
}

export interface UpdateShopDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface ShopDto {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Product DTOs
export interface CreateProductDto {
  name: string;
  description?: string;
  type: ProductType;
  price: number;
  shopId: string;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  type?: ProductType;
  price?: number;
  isActive?: boolean;
}

export interface ProductDto {
  id: string;
  name: string;
  description: string | null;
  type: ProductType;
  price: number;
  shopId: string;
  isActive: boolean;
  availableStock: number;
  createdAt: Date;
  updatedAt: Date;
}

// Stock DTOs
export interface ImportStockDto {
  productId: string;
  keys: string[];
}

export interface StockDto {
  id: string;
  productId: string;
  key: string;
  status: StockStatus;
  soldAt: Date | null;
  orderId: string | null;
  createdAt: Date;
}

// Order DTOs
export interface CreateOrderDto {
  items: {
    productId: string;
    quantity: number;
  }[];
  voucherCode?: string;
}

export interface OrderItemDto {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface OrderDto {
  id: string;
  buyerId: string;
  buyerName?: string;
  totalAmount: number;
  status: OrderStatus;
  voucherCode?: string;
  discountAmount?: number;
  processingStatus?: string;
  processedQuantity?: number;
  providerOrderId?: string;
  providerId?: string;
  items: OrderItemDto[];
  stocks?: StockDto[];
  deliveredKeys?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Wallet DTOs
export interface WalletDto {
  id: string;
  userId: string;
  balance: number; // VND (Int in DB)
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletWithHistoryDto {
  wallet: WalletDto;
  transactions: TransactionDto[];
}

// Transaction DTOs
export interface TransactionDto {
  id: string;
  walletId: string;
  userId?: string; // User who initiated the transaction
  orderId?: string;
  amount: number; // VND (Int in DB)
  type: TransactionType;
  status?: string; // PENDING, COMPLETED, FAILED
  description?: string;
  sePayTransId?: string; // SePay transaction ID
  canWithdrawAt?: Date;
  createdAt: Date;
}

// Deposit DTOs
export interface CreateDepositDto {
  amount: number; // VND
}

export interface DepositResponseDto {
  qrCode: string; // Base64 QR code or URL
  transactionId: string; // SePay transaction ID
  amount: number;
  expireAt: Date;
}

// SePay Webhook DTO
export interface SePayWebhookDto {
  transactionId: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED';
  signature?: string; // For verification
}

// Crypto Payment DTOs
export interface CreateCryptoDepositDto {
  amountVND: number; // Amount in VND (50,000 - 500,000,000)
  coin: CryptoCurrency; // Which cryptocurrency to use
}

export interface CryptoInvoiceDto {
  invoiceId: string; // Provider's invoice ID
  payAddress: string; // Crypto address to send payment
  payAmount: string; // Amount in crypto (e.g., "10.5" USDT)
  payCurrency: string; // Currency code (e.g., "usdttrc20")
  expiresAt: Date; // When the invoice expires
  invoiceUrl?: string; // Optional URL to view invoice on provider's site
  amountVND: number; // Original VND amount
}

export interface NowPaymentsWebhookDto {
  payment_id: number;
  payment_status: string; // 'waiting' | 'confirming' | 'confirmed' | 'sending' | 'partially_paid' | 'finished' | 'failed' | 'refunded' | 'expired'
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string; // Our transaction ID
  order_description: string;
  purchase_id: string;
  outcome_amount: number;
  outcome_currency: string;
}

// Payout DTOs
export interface CreatePayoutDto {
  amount: number; // VND
  description?: string;
}

export interface PayoutDto {
  id: string;
  walletId: string;
  amount: number; // VND (Int in DB)
  status: PayoutStatus;
  description?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Dispute DTOs
export interface CreateDisputeDto {
  orderId: string;
  reason: string;
}

export interface UpdateDisputeDto {
  status?: DisputeStatus;
  resolution?: string;
  refundAmount?: number;
  adminNote?: string;
}

export interface DisputeDto {
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  status: DisputeStatus;
  resolution?: string;
  refundAmount?: number;
  adminNote?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Review DTOs
export interface CreateReviewDto {
  productId: string;
  rating: number;
  comment?: string;
}

export interface ReviewDto {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Admin DTOs
export interface UpdateOrderStatusDto {
  status: OrderStatus;
}

export interface AdminOrderQueryDto {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export interface AdminPayoutQueryDto {
  status?: PayoutStatus;
  page?: number;
  limit?: number;
}

export interface ApprovePayoutDto {
  status: PayoutStatus;
  adminNote?: string;
}

// Voucher DTOs
export interface CreateVoucherDto {
  code: string;
  type: VoucherType;
  value: number; // Percentage (10 = 10%) or Fixed Amount (VND)
  maxUses?: number;
  expiresAt?: Date;
  shopId?: string; // If null, applies platform-wide
}

export interface UpdateVoucherDto {
  type?: VoucherType;
  value?: number;
  maxUses?: number;
  expiresAt?: Date;
  isActive?: boolean;
}

export interface VoucherDto {
  id: string;
  code: string;
  type: VoucherType;
  value: number;
  maxUses: number;
  usedCount: number;
  expiresAt?: Date;
  shopId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Order update DTOs for sellers
export interface UpdateOrderProgressDto {
  status: OrderStatus; // PROCESSING, COMPLETED, PARTIAL, CANCELLED
  processedQuantity?: number; // For SEEDING orders
  processingStatus?: string; // Status message
}

// Flash Sale DTOs
export interface CreateFlashSaleDto {
  productId: string;
  salePrice: number; // Discounted price in VND
  stockCap: number; // Maximum quantity available
  startAt: Date;
  endAt: Date;
}

export interface UpdateFlashSaleDto {
  salePrice?: number;
  stockCap?: number;
  startAt?: Date;
  endAt?: Date;
  isActive?: boolean;
}

export interface FlashSaleDto {
  id: string;
  productId: string;
  productName?: string; // Optional: product name for convenience
  originalPrice?: number; // Optional: product original price
  salePrice: number;
  stockCap: number;
  soldCount: number;
  startAt: Date;
  endAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Affiliate DTOs
export interface AffiliateStatsDto {
  referralCode: string;
  totalReferrals: number; // Total number of users referred
  totalCommission: number; // Total commission earned in VND
  referredUsers: Array<{
    email: string;
    name: string;
    joinedAt: Date;
    hasOrdered: boolean;
    commissionEarned: number;
  }>;
}

// SMM Provider Enums
export enum ProviderStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
}

// SMM Provider DTOs
export interface CreateSmmProviderDto {
  name: string;
  apiUrl: string;
  apiKey: string; // Will be encrypted before storing
  balanceEndpoint?: string;
}

export interface UpdateSmmProviderDto {
  name?: string;
  apiUrl?: string;
  apiKey?: string; // Will be encrypted before storing
  balanceEndpoint?: string;
  status?: ProviderStatus;
}

export interface SmmProviderDto {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string; // Masked (e.g., "abc***xyz") - never return full key
  balanceEndpoint?: string;
  status: ProviderStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Service Mapping DTOs
export interface CreateServiceMappingDto {
  productId: string;
  providerId: string;
  providerServiceId: string;
  ratePerThousand: number; // VND per 1000 units
}

export interface UpdateServiceMappingDto {
  providerServiceId?: string;
  ratePerThousand?: number;
  isActive?: boolean;
}

export interface ServiceMappingDto {
  id: string;
  productId: string;
  providerId: string;
  providerServiceId: string;
  ratePerThousand: number;
  isActive: boolean;
  productName?: string; // Optional: for convenience
  providerName?: string; // Optional: for convenience
  createdAt: Date;
  updatedAt: Date;
}

// Provider Client Interfaces (for external API calls)
export interface ProviderOrderRequest {
  service: string; // Provider's service ID
  quantity: number;
  link?: string; // Target URL/username (for social media services)
}

export interface ProviderOrderResponse {
  orderId: string; // Provider's order ID
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'cancelled' | 'failed';
  charge?: number; // Cost charged by provider
}

export interface ProviderStatusResponse {
  orderId: string;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'cancelled' | 'failed';
  startCount?: number;
  quantity?: number;
  remains?: number; // How many units remaining to process
}

export interface ProviderBalanceResponse {
  balance: number;
  currency: string;
}

// Provider Test Connection DTO
export interface TestProviderConnectionDto {
  providerId: string;
}

export interface TestProviderConnectionResponse {
  success: boolean;
  message: string;
  balance?: number;
  error?: string;
}
