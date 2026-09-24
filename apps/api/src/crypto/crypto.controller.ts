import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  ForbiddenException,
  RawBodyRequest,
  Req,
  Headers,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CryptoService } from './crypto.service';
import {
  CreateCryptoDepositDto,
  CryptoInvoiceDto,
  ApiResponse,
} from '@repo/shared';

/**
 * Crypto Payment Controller
 * 
 * Endpoints:
 * - POST /wallet/deposit-crypto: Create crypto deposit invoice (authenticated)
 * - POST /webhooks/nowpayments: Receive payment status webhooks (public)
 */
@Controller()
export class CryptoController {
  private readonly logger = new Logger(CryptoController.name);

  constructor(private readonly cryptoService: CryptoService) {}

  /**
   * Create a crypto deposit invoice
   * 
   * Authenticated endpoint - creates invoice for logged-in user
   * 
   * @param req Request with user info from JWT
   * @param createDto Deposit parameters (VND amount, cryptocurrency)
   * @returns Invoice with payment address and crypto amount
   */
  @Post('wallet/deposit-crypto')
  @UseGuards(JwtAuthGuard)
  async createCryptoDeposit(
    @Request() req: any,
    @Body() createDto: CreateCryptoDepositDto,
  ): Promise<ApiResponse<CryptoInvoiceDto>> {
    const userId = req.user.sub;

    this.logger.log(
      `User ${userId} creating crypto deposit: ${createDto.amountVND} VND in ${createDto.coin}`,
    );

    const invoice = await this.cryptoService.createCryptoDeposit(userId, createDto);

    return {
      success: true,
      data: invoice,
      message: `Crypto invoice created. Send ${invoice.payAmount} ${invoice.payCurrency} to the payment address.`,
    };
  }

  /**
   * NowPayments IPN webhook endpoint
   * 
   * Public endpoint - receives payment status updates from NowPayments
   * Verifies HMAC-SHA256 signature before processing
   * 
   * @param req Raw request (for signature verification)
   * @param signature HMAC signature from header
   * @param body Parsed webhook payload
   */
  @Post('webhooks/nowpayments')
  async handleNowPaymentsWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-nowpayments-sig') signature: string,
    @Body() body: any,
  ): Promise<{ status: string }> {
    this.logger.log(
      `Received NowPayments webhook: payment_id=${body.payment_id}, status=${body.payment_status}`,
    );

    // Check signature presence
    if (!signature) {
      this.logger.error('Webhook rejected: Missing x-nowpayments-sig header');
      throw new ForbiddenException('Missing signature');
    }

    // Get raw body for signature verification
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(body);

    try {
      await this.cryptoService.processWebhook(rawBody, signature, body);
      
      this.logger.log(`✅ Webhook processed successfully for payment_id=${body.payment_id}`);
      
      return { status: 'ok' };
    } catch (error: any) {
      this.logger.error(
        `Webhook processing failed: ${error.message}`,
        error.stack,
      );
      
      // If signature invalid, throw 403
      if (error.message.includes('signature')) {
        throw new ForbiddenException('Invalid signature');
      }
      
      // Other errors - return 200 but log (to avoid webhook retries)
      return { status: 'error' };
    }
  }
}
