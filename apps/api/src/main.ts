import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // CRITICAL PRODUCTION SAFETY CHECK
  // Prevent running in production with unsigned SePay webhooks enabled
  const isProduction = process.env.NODE_ENV === 'production';
  const allowUnsigned = process.env.SEPAY_ALLOW_UNSIGNED === 'true';

  if (isProduction && allowUnsigned) {
    console.error('');
    console.error('❌ FATAL ERROR: Cannot start in production mode with SEPAY_ALLOW_UNSIGNED=true');
    console.error('');
    console.error('This is a critical security risk. Unsigned webhooks allow attackers to:');
    console.error('- Fake payment confirmations');
    console.error('- Credit wallets without actual payment');
    console.error('- Steal funds from your platform');
    console.error('');
    console.error('To fix this:');
    console.error('1. Set SEPAY_ALLOW_UNSIGNED=false or remove it from .env');
    console.error('2. Ensure SEPAY_SECRET is properly configured');
    console.error('3. Restart the server');
    console.error('');
    process.exit(1);
  }

  // rawBody:true preserves exact request bytes for HMAC webhook verification (SePay/NOWPayments)
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Trust proxy: Render/Railway chạy sau reverse proxy, cần đọc X-Forwarded-* headers
  // để rate-limit và security middleware lấy đúng IP thật của client
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Enable CORS: hỗ trợ nhiều domain (cách nhau dấu phẩy)
  const webUrl = process.env.WEB_URL || 'http://localhost:3000';
  const allowedOrigins = webUrl.split(',').map(url => url.trim());
  
  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 API server is running on http://localhost:${port}`);
  console.log(`📚 Prisma Studio: pnpm prisma:studio`);
  
  if (allowUnsigned && !isProduction) {
    console.warn('');
    console.warn('⚠️  WARNING: SEPAY_ALLOW_UNSIGNED is enabled in development mode');
    console.warn('   This should NEVER be used in production!');
    console.warn('');
  }
}
bootstrap();
