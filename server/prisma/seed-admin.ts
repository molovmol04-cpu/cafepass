import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const phone = '+998901234567';
  const name = 'CaféPass Admin';

  const user = await prisma.user.upsert({
    where: { phone },
    update: {
      name,
      role: 'PLATFORM_ADMIN',
      isActive: true,
    },
    create: {
      phone,
      name,
      role: 'PLATFORM_ADMIN',
      isActive: true,
    },
  });

  console.log('✅ PLATFORM_ADMIN yaratildi!');
  console.log('📱 Telefon:', user.phone);
  console.log('👤 Ism:', user.name);
  console.log('🔑 Role:', user.role);
}

main()
  .catch((error) => {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });