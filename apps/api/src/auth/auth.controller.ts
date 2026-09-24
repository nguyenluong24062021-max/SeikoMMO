import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ApiResponse, AuthTokens } from '@repo/shared';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<ApiResponse<AuthTokens>> {
    const tokens = await this.authService.register(registerDto);
    return {
      success: true,
      data: tokens,
      message: 'User registered successfully',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async login(@Body() loginDto: LoginDto): Promise<ApiResponse<AuthTokens>> {
    const tokens = await this.authService.login(loginDto);
    return {
      success: true,
      data: tokens,
      message: 'Login successful',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  async refresh(@Request() req: any): Promise<ApiResponse<AuthTokens>> {
    const tokens = await this.authService.refresh(
      req.user.sub,
      req.user.refreshToken,
    );
    return {
      success: true,
      data: tokens,
      message: 'Token refreshed successfully',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any): Promise<ApiResponse<void>> {
    await this.authService.logout(req.user.sub);
    return {
      success: true,
      message: 'Logout successful',
    };
  }
}
