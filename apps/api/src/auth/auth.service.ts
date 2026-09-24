import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto, AuthTokens, JwtPayload, UserRole } from '@repo/shared';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthTokens> {
    // Check if user exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    // Update refresh token
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async login(loginDto: LoginDto): Promise<AuthTokens> {
    // Find user
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    // Update refresh token
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async refresh(userId: string, refreshToken: string): Promise<AuthTokens> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    // Verify refresh token
    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isTokenValid) {
      throw new UnauthorizedException('Access denied');
    }

    // Generate new tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    // Update refresh token
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.update(userId, { refreshToken: null });
  }

  private async generateTokens(payload: JwtPayload): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }
}
