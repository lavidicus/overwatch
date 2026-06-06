import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface EncryptedField {
  ciphertext: string; // Base64-encoded encrypted data
  iv: string; // Base64-encoded initialization vector
  authTag: string; // Base64-encoded authentication tag
  keyVersion: number; // Which key version was used
  dekCiphertext?: string; // Base64-encoded encrypted DEK (for envelope encryption)
}

/**
 * Encryption Service - AES-256-GCM Envelope Encryption
 * 
 * Pattern:
 * - Master key encrypts per-record DEKs (Data Encryption Keys)
 * - DEK encrypts actual field data via AES-256-GCM
 * - Key versioning allows progressive re-encryption
 */
export class EncryptionService {
  private static masterKeyCache: Map<number, Buffer> = new Map();

  /**
   * Get master key from configured source
   */
  static async getMasterKey(version: number): Promise<Buffer> {
    // Check cache first
    const cached = this.masterKeyCache.get(version);
    if (cached) return cached;

    const source = process.env.ENCRYPTION_KEY_SOURCE || 'ENV';

    let key: Buffer;

    switch (source) {
      case 'ENV':
        key = await this.getMasterKeyFromEnv(version);
        break;
      case 'AWS_KMS':
        key = await this.getMasterKeyFromAWSKMS(version);
        break;
      case 'GCP_KMS':
        key = await this.getMasterKeyFromGCPKMS(version);
        break;
      case 'VAULT':
        key = await this.getMasterKeyFromVault(version);
        break;
      case 'IMPORTED':
        key = await this.getMasterKeyFromDatabase(version);
        break;
      default:
        throw new Error(`Unknown encryption key source: ${source}`);
    }

    // Cache the key
    this.masterKeyCache.set(version, key);
    return key;
  }

  private static async getMasterKeyFromEnv(version: number): Promise<Buffer> {
    const keyBase64 = process.env.ENCRYPTION_MASTER_KEY;
    
    if (!keyBase64) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable not set');
    }

    // For version 1, use the env key directly
    // For other versions, they should be in database or KMS
    if (version !== 1) {
      const keyRecord = await prisma.encryptionKey.findUnique({
        where: { keyVersion: version },
      });

      if (!keyRecord || !keyRecord.isActive) {
        throw new Error(`Master key version ${version} not found or inactive`);
      }

      // Decrypt stored key if needed
      if (keyRecord.importedCert) {
        // Parse PEM certificate and extract key
        return this.extractKeyFromPEM(keyRecord.importedCert);
      }
    }

    const key = Buffer.from(keyBase64, 'base64');
    
    if (key.length !== 32) {
      throw new Error('Master key must be 32 bytes (256 bits) for AES-256');
    }

    return key;
  }

  private static async getMasterKeyFromAWSKMS(version: number): Promise<Buffer> {
    // TODO: Implement AWS KMS integration
    // Use @aws-sdk/client-kms to decrypt data key
    throw new Error('AWS KMS integration not yet implemented');
  }

  private static async getMasterKeyFromGCPKMS(version: number): Promise<Buffer> {
    // TODO: Implement GCP KMS integration
    throw new Error('GCP KMS integration not yet implemented');
  }

  private static async getMasterKeyFromVault(version: number): Promise<Buffer> {
    // TODO: Implement HashiCorp Vault integration
    throw new Error('HashiCorp Vault integration not yet implemented');
  }

  private static async getMasterKeyFromDatabase(version: number): Promise<Buffer> {
    const keyRecord = await prisma.encryptionKey.findUnique({
      where: { keyVersion: version },
    });

    if (!keyRecord || !keyRecord.isActive) {
      throw new Error(`Master key version ${version} not found or inactive`);
    }

    if (!keyRecord.importedCert) {
      throw new Error('No certificate found for imported key');
    }

    return this.extractKeyFromPEM(keyRecord.importedCert);
  }

  private static extractKeyFromPEM(pem: string): Buffer {
    // Extract base64 content from PEM format
    const match = pem.match(/-----BEGIN CERTIFICATE-----\n([\s\S]+?)\n-----END CERTIFICATE-----/);
    if (!match) {
      throw new Error('Invalid PEM format');
    }

    return Buffer.from(match[1].replace(/\s/g, ''), 'base64');
  }

  /**
   * Generate a random 256-bit Data Encryption Key (DEK)
   */
  static generateDEK(): Buffer {
    return crypto.randomBytes(32);
  }

  /**
   * Encrypt plaintext using envelope encryption
   * Returns EncryptedField with ciphertext, IV, auth tag, and encrypted DEK
   */
  static async encrypt(plaintext: string, keyVersion: number = 1): Promise<EncryptedField> {
    // Generate random DEK for this record
    const dek = this.generateDEK();
    
    // Generate random IV for AES-GCM
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM

    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    
    // Encrypt
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    // Get auth tag
    const authTag = cipher.getAuthTag().toString('base64');

    // Encrypt DEK with master key (envelope encryption)
    const masterKey = await this.getMasterKey(keyVersion);
    const dekIv = crypto.randomBytes(12);
    const dekCipher = crypto.createCipheriv('aes-256-gcm', masterKey, dekIv);
    const dekCipherChunks = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
    const dekCiphertext = dekCipherChunks.toString('base64');
    const dekAuthTag = dekCipher.getAuthTag().toString('base64');

    return {
      ciphertext,
      iv: iv.toString('base64'),
      authTag,
      keyVersion,
      dekCiphertext: JSON.stringify({
        ciphertext: dekCiphertext,
        iv: dekIv.toString('base64'),
        authTag: dekAuthTag,
      }),
    };
  }

  /**
   * Decrypt an EncryptedField back to plaintext
   */
  static async decrypt(encrypted: EncryptedField): Promise<string> {
    // Get master key for this version
    const masterKey = await this.getMasterKey(encrypted.keyVersion);

    // Decrypt DEK
    const dekEnvelope = JSON.parse(encrypted.dekCiphertext!);
    const dekDecipher = crypto.createDecipheriv(
      'aes-256-gcm',
      masterKey,
      Buffer.from(dekEnvelope.iv, 'base64')
    );
    dekDecipher.setAuthTag(Buffer.from(dekEnvelope.authTag, 'base64'));
    
    let dek = dekDecipher.update(dekEnvelope.ciphertext, 'base64');
    dek = Buffer.concat([dek, dekDecipher.final()]);

    // Decrypt actual data with DEK
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      dek,
      Buffer.from(encrypted.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));

    let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  /**
   * Check if a record needs key rotation
   */
  static async needsRotation(currentVersion: number): Promise<boolean> {
    // Get current primary key version
    const primaryVersion = await this.getPrimaryKeyVersion();
    return currentVersion < primaryVersion;
  }

  /**
   * Get the current primary key version
   */
  static async getPrimaryKeyVersion(): Promise<number> {
    const primaryKey = await prisma.encryptionKey.findFirst({
      where: { isPrimary: true, isActive: true },
      orderBy: { keyVersion: 'desc' },
    });

    return primaryKey?.keyVersion || 1;
  }

  /**
   * Progressive re-encryption: decrypt with old key, encrypt with new key
   */
  static async rotateKey(encrypted: EncryptedField, newVersion: number): Promise<EncryptedField> {
    const plaintext = await this.decrypt(encrypted);
    return this.encrypt(plaintext, newVersion);
  }

  /**
   * Register a new master key
   */
  static async registerMasterKey(params: {
    keyType?: 'MASTER' | 'DEK';
    source: 'ENV' | 'AWS_KMS' | 'GCP_KMS' | 'VAULT' | 'IMPORTED';
    keyHint?: string;
    importedCert?: string;
    expiresAt?: Date;
  }): Promise<void> {
    const existingPrimary = await prisma.encryptionKey.findFirst({
      where: { isPrimary: true, isActive: true },
    });

    const newVersion = (existingPrimary?.keyVersion || 0) + 1;

    await prisma.encryptionKey.create({
      data: {
        keyVersion: newVersion,
        keyType: params.keyType || 'MASTER',
        source: params.source,
        keyHint: params.keyHint,
        importedCert: params.importedCert,
        importedCertFingerprint: params.importedCert 
          ? this.calculateCertFingerprint(params.importedCert)
          : undefined,
        isActive: true,
        isPrimary: true,
        expiresAt: params.expiresAt,
      },
    });

    // Demote old primary
    if (existingPrimary) {
      await prisma.encryptionKey.update({
        where: { id: existingPrimary.id },
        data: { isPrimary: false },
      });
    }

    // Clear cache
    this.masterKeyCache.clear();
  }

  private static calculateCertFingerprint(pem: string): string {
    const cert = Buffer.from(
      pem.replace(/-----BEGIN CERTIFICATE-----|\n|-----END CERTIFICATE-----/g, ''),
      'base64'
    );
    return crypto.createHash('sha256').update(cert).digest('hex');
  }
}
