const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, phone: true, isEmailVerified: true, emailVerificationOtp: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 6
  });
  console.log('RECENT USERS:', JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
