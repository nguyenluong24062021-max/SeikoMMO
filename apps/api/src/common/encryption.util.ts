import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Encryption utility for sensitive data (e.g., API keys)
 * Uses AES-256-GCM for encryption with authentication
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly AUTH_TAG_LENGTH = 16; // 128 bits
  private readonly KEY_LENGTH = 32; // 256 bits

  private encryptionKey!: Buffer; // Will be initialized in onModuleInit

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const keyHex = this.configService.get<string>('PROVIDER_KEY_SECRET');
    
    if (!keyHex) {
      const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
      
      if (isProduction) {
        this.logger.error('PROVIDER_KEY_SECRET is not set in production environment!');
        throw new Error(
          'PROVIDER_KEY_SECRET environment variable is required in production. ' +
          'Generate a 32-byte hex key using: openssl rand -hex 32'
        );
      } else {
        // Development: Generate a temporary key and warn
        this.logger.warn(
          'PROVIDER_KEY_SECRET is not set. Using temporary key for development. ' +
          'Set PROVIDER_KEY_SECRET in .env for persistence.'
        );
        this.encryptionKey = crypto.randomBytes(this.KEY_LENGTH);
      }
    } else {
      // Validate key format (must be 64 hex characters = 32 bytes)
      if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
        throw new Error(
          'PROVIDER_KEY_SECRET must be a 64-character hexadecimal string (32 bytes). ' +
          'Generate one using: openssl rand -hex 32'
        );
      }
      
      this.encryptionKey = Buffer.from(keyHex, 'hex');
      this.logger.log('Encryption service initialized with PROVIDER_KEY_SECRET');
    }
  }

  /**
   * Encrypt a plaintext string using AES-256-GCM
   * @param plaintext The text to encrypt
   * @returns Encrypted string in format: iv:authTag:ciphertext (all hex-encoded)
   */
  encrypt(plaintext: string): string {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.ALGORITHM, this.encryptionKey, iv);
      
      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get auth tag
      const authTag = cipher.getAuthTag();
      
      // Return format: iv:authTag:ciphertext (all hex)
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt an encrypted string using AES-256-GCM
   * @param encrypted Encrypted string in format: iv:authTag:ciphertext
   * @returns Decrypted plaintext string
   */
  decrypt(encrypted: string): string {
    try {
      // Parse encrypted data
      const parts = encrypted.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const ciphertext = parts[2];
      
      // Validate lengths
      if (iv.length !== this.IV_LENGTH || authTag.length !== this.AUTH_TAG_LENGTH) {
        throw new Error('Invalid IV or auth tag length');
      }
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.ALGORITHM, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt
      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Mask an API key for safe display
   * Shows first 3 and last 3 characters, masks the rest
   * @param apiKey The API key to mask
   * @returns Masked string (e.g., "abc***xyz")
   */
  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 6) {
      return '***';
    }
    
    const start = apiKey.substring(0, 3);
    const end = apiKey.substring(apiKey.length - 3);
    return `${start}***${end}`;
  }

  /**
   * Generate a random 32-byte encryption key (for setup/testing)
   * @returns 64-character hex string
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
