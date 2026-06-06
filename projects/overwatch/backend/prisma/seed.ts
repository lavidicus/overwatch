import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Simple hash function for seeding (in production, use bcrypt)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `$pbkdf2-sha512$1000$${salt}$${hash}`;
}

async function main() {
  console.log('🌱 Seeding database...');

  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists. Skipping seed.');
    return;
  }

  // Create initial admin user
  const passwordHash = hashPassword('Admin123!Secure');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@overwatch.local',
      displayName: 'System Administrator',
      passwordHash,
      role: 'ADMIN',
      department: 'Engineering',
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create initial encryption key (version 1)
  const encryptionKey = await prisma.encryptionKey.create({
    data: {
      keyVersion: 1,
      keyType: 'MASTER',
      source: 'ENV',
      keyHint: 'dev-key',
      isActive: true,
      isPrimary: true,
    },
  });

  console.log('✅ Created encryption key version:', encryptionKey.keyVersion);

  // Create some default settings
  const settings = await prisma.setting.createMany({
    data: [
      {
        key: 'app.name',
        value: 'Overwatch',
        category: 'general',
      },
      {
        key: 'app.version',
        value: '0.1.0',
        category: 'general',
      },
      {
        key: 'security.sessionTimeout',
        value: '28800', // 8 hours in seconds
        category: 'security',
      },
      {
        key: 'security.mfaRequired',
        value: 'false',
        category: 'security',
      },
      {
        key: 'encryption.algorithm',
        value: 'AES-256-GCM',
        category: 'security',
      },
    ],
  });

  console.log('✅ Created default settings');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\nDefault credentials:');
  console.log('  Email: admin@overwatch.local');
  console.log('  Password: Admin123!Secure');
  console.log('\n⚠️  Change these credentials immediately after first login!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
