/**
 * Crypto Payment Gateway Interface
 * 
 * Defines the contract for cryptocurrency payment providers.
 * Implementations: MockCryptoGateway (testing), NowPaymentsGateway (production)
 */

export interface CreateInvoiceRequest {
  amountVND: number;
  coin: string; // e.g., 'USDT_TRC20', 'BTC', 'ETH'
}

export interface CreateInvoiceResponse {
  invoiceId: string; // Provider's invoice/payment ID
  payAddress: string; // Crypto address to send payment
  payAmount: string; // Amount in crypto (e.g., "10.5")
  payCurrency: string; // Currency code (e.g., "usdttrc20", "btc")
  expiresAt: Date; // Invoice expiration time
  invoiceUrl?: string; // Optional URL to view invoice
}

export interface ICryptoGateway {
  /**
   * Create a new crypto payment invoice
   * @param request Invoice creation parameters
   * @returns Invoice details including payment address and amount
   */
  createInvoice(request: CreateInvoiceRequest): Promise<CreateInvoiceResponse>;

  /**
   * Verify webhook signature to ensure request authenticity
   * @param rawBody Raw request body (before parsing)
   * @param signature Signature from webhook header
   * @returns true if signature is valid, false otherwise
   */
  verifyWebhook(rawBody: string, signature: string): boolean;
}
