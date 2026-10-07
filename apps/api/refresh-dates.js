const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  
  // Update Galaxy S23 Ultra: sales end in 5 days, draw in 5 days + 2 hours
  await prisma.draw.updateMany({
    where: { status: 'OPEN', drawNumber: 'NL-000123' },
    data: {
      salesEndDate: new Date(now.getTime() + 5 * 24 * 3600 * 1000),
      drawDate: new Date(now.getTime() + 5 * 24 * 3600 * 1000 + 7200 * 1000)
    }
  });

  // Update MacBook Pro: sales end in 12 days
  await prisma.draw.updateMany({
    where: { status: 'OPEN', drawNumber: 'NL-000124' },
    data: {
      salesEndDate: new Date(now.getTime() + 12 * 24 * 3600 * 1000),
      drawDate: new Date(now.getTime() + 12 * 24 * 3600 * 1000 + 3600 * 1000)
    }
  });

  // Update PS5 Pro: sales end in 2 days (ending soon!)
  await prisma.draw.updateMany({
    where: { status: 'OPEN', drawNumber: 'NL-000125' },
    data: {
      salesEndDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000 + 4 * 3600 * 1000),
      drawDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000 + 5 * 3600 * 1000)
    }
  });

  console.log('Successfully refreshed draw dates to active future countdowns!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
