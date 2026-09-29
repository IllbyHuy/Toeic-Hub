const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admintoeichub@admin.com';
  
  const exists = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (exists) {
    console.log('Admin account already exists. Skipping.');
    return;
  }

  const hashedPassword = await bcrypt.hash('@admin', 10);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      fullName: 'Admin Toeic-Hub',
      role: 'ADMIN',
      isVerified: true,
    }
  });

  console.log('✅ Admin account created:', admin.email);
}

main()
  .catch(e => {
    console.error('Error seeding admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
