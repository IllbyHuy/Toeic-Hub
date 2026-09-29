const { PrismaClient } = require('@prisma/client');

// Khởi tạo Prisma Client dạng Singleton để tránh mở quá nhiều connection pool trong quá trình dev (nodemon reload)
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
