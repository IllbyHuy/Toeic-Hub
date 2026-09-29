const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pass = await bcrypt.hash('@admin', 10);
  await prisma.user.upsert({
    where: { email: 'admintoeichub@admin.com' },
    update: {},
    create: { email: 'admintoeichub@admin.com', password: pass, fullName: 'Admin', role: 'ADMIN' }
  });
  console.log('Admin created');
}

main().catch(console.error).finally(() => prisma.$disconnect());
