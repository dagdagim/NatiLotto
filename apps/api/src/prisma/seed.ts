import { PrismaClient } from '@prisma/client';
import { 
  DrawStatus, UserRole, VerificationStatus, PrizeCategory, 
  ClaimStatus, TicketStatus, OrderStatus, PaymentMethod, PaymentStatus 
} from '@nati-lotto/shared-types';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Nati Lotto production seed...');

  // 1. Create Admins & Standard Users
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const playerPasswordHash = await bcrypt.hash('Player123!', 10);

  const superAdmin = await prisma.user.upsert({
    where: { phone: '+251911000001' },
    update: {},
    create: {
      phone: '+251911000001',
      passwordHash: adminPasswordHash,
      firstName: 'Natnael',
      lastName: 'Tadesse',
      displayName: 'Natnael T. (SuperAdmin)',
      role: UserRole.SUPER_ADMIN,
      verificationStatus: VerificationStatus.VERIFIED,
      isAgeVerified: true,
      walletBalanceEtb: 10000,
    },
  });

  const opsAdmin = await prisma.user.upsert({
    where: { phone: '+251911000002' },
    update: {},
    create: {
      phone: '+251911000002',
      passwordHash: adminPasswordHash,
      firstName: 'Alemayehu',
      lastName: 'Kebede',
      displayName: 'Alemayehu K. (Ops)',
      role: UserRole.OPERATIONS,
      verificationStatus: VerificationStatus.VERIFIED,
      isAgeVerified: true,
    },
  });

  const demoPlayer = await prisma.user.upsert({
    where: { phone: '+251911223344' },
    update: {},
    create: {
      phone: '+251911223344',
      passwordHash: playerPasswordHash,
      firstName: 'Dawit',
      lastName: 'Mekonnen',
      displayName: 'Dawit M.',
      role: UserRole.USER,
      verificationStatus: VerificationStatus.VERIFIED,
      isAgeVerified: true,
      walletBalanceEtb: 2500,
    },
  });

  console.log('✅ Users & Admins seeded');

  // 2. Seed Draws
  // Featured Draw: Samsung Galaxy S23 Ultra
  const s23Draw = await prisma.draw.upsert({
    where: { drawNumber: 'NL-000123' },
    update: {},
    create: {
      drawNumber: 'NL-000123',
      title: 'Samsung Galaxy S23 Ultra (512GB Phantom Black)',
      description: 'Experience revolutionary mobile performance with the 200MP camera, Snapdragon 8 Gen 2, and embedded S-Pen. Authorized under Ethiopian National Lottery Administration permit NL-ET-2026-0892.',
      ticketPriceEtb: 100,
      totalTickets: 1000,
      soldTickets: 742,
      maxTicketsPerUser: 25,
      status: DrawStatus.OPEN,
      salesStartDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      salesEndDate: new Date(Date.now() + 2 * 60 * 60 * 1000 + 14 * 60 * 1000 + 38 * 1000), // ~02:14:38 remaining
      drawDate: new Date(Date.now() + 2 * 60 * 60 * 1000 + 20 * 60 * 1000),
      permitNumber: 'NL-ET-2026-0892',
      isFeatured: true,
      prize: {
        create: {
          title: 'Samsung Galaxy S23 Ultra (512GB)',
          description: 'Brand new, sealed factory unlocked global edition with full 1-year warranty in Addis Ababa.',
          specifications: {
            Storage: '512GB UFS 4.0',
            RAM: '12GB',
            Display: '6.8" Dynamic AMOLED 2X, 120Hz',
            Camera: '200MP Quad Camera with 100x Space Zoom',
            Battery: '5,000mAh with 45W Fast Charging',
            Color: 'Phantom Black',
          },
          retailValueEtb: 125000,
          category: PrizeCategory.ELECTRONICS,
          images: {
            create: [
              {
                url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=1200&q=80',
                isPrimary: true,
                displayOrder: 0,
              },
              {
                url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=1200&q=80',
                isPrimary: false,
                displayOrder: 1,
              },
            ],
          },
        },
      },
      rules: {
        create: [
          { ruleText: 'Open to legal Ethiopian residents aged 18 and older.', displayOrder: 1 },
          { ruleText: 'Each ticket has an equal 1/1,000 probability of winning.', displayOrder: 2 },
          { ruleText: 'Draw conducted automatically via cryptographically verified CSPRNG.', displayOrder: 3 },
          { ruleText: 'Prize claimable within 30 calendar days with government ID.', displayOrder: 4 },
        ],
      },
    },
  });

  // Seed sample tickets for Demo Player in S23 Draw (#0381 to #0385)
  const existingOrder = await prisma.order.findUnique({
    where: { idempotencyKey: 'SEED-IDEMP-ORDER-001' },
  });

  if (!existingOrder) {
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-NL-00123-0381',
        userId: demoPlayer.id,
        drawId: s23Draw.id,
        quantity: 5,
        unitPriceEtb: 100,
        subtotalEtb: 500,
        feeEtb: 0,
        totalEtb: 500,
        status: OrderStatus.COMPLETED,
        idempotencyKey: 'SEED-IDEMP-ORDER-001',
        paymentMethod: PaymentMethod.TELEBIRR,
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        userId: demoPlayer.id,
        amountEtb: 500,
        paymentMethod: PaymentMethod.TELEBIRR,
        status: PaymentStatus.SUCCESS,
        providerReference: 'TB-REF-0381-0385',
        idempotencyKey: 'SEED-IDEMP-PAY-001',
        verifiedAt: new Date(),
      },
    });

    const ticketNumbers = ['#0381', '#0382', '#0383', '#0384', '#0385'];
    for (let i = 0; i < ticketNumbers.length; i++) {
      const num = ticketNumbers[i];
      const seq = 381 + i;
      const hashSig = crypto
        .createHash('sha256')
        .update(`NL-000123:${num}:${seq}:${demoPlayer.id}:${order.id}`)
        .digest('hex');

      await prisma.ticket.create({
        data: {
          ticketNumber: num,
          sequenceNumber: seq,
          drawId: s23Draw.id,
          userId: demoPlayer.id,
          orderId: order.id,
          status: TicketStatus.CONFIRMED,
          hashSignature: hashSig,
        },
      });
    }
  }

  // Draw 2: Apple MacBook Pro M3 Max
  await prisma.draw.upsert({
    where: { drawNumber: 'NL-000124' },
    update: {},
    create: {
      drawNumber: 'NL-000124',
      title: 'Apple MacBook Pro 16" M3 Max (36GB RAM, 1TB SSD)',
      description: 'The ultimate powerhouse for creatives and engineers. 16-core CPU, 40-core GPU, Liquid Retina XDR display.',
      ticketPriceEtb: 250,
      totalTickets: 2000,
      soldTickets: 1410,
      maxTicketsPerUser: 20,
      status: DrawStatus.OPEN,
      salesStartDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      salesEndDate: new Date(Date.now() + 18 * 60 * 60 * 1000),
      drawDate: new Date(Date.now() + 19 * 60 * 60 * 1000),
      permitNumber: 'NL-ET-2026-0893',
      isFeatured: false,
      prize: {
        create: {
          title: 'MacBook Pro 16" M3 Max Space Black',
          description: 'Official Apple international warranty with Ethiopian power adapter.',
          specifications: {
            Chip: 'Apple M3 Max (16-core CPU, 40-core GPU)',
            Memory: '36GB Unified Memory',
            Storage: '1TB Superfast SSD',
            Display: '16.2-inch Liquid Retina XDR (3456x2234)',
          },
          retailValueEtb: 360000,
          category: PrizeCategory.ELECTRONICS,
          images: {
            create: [
              {
                url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
                isPrimary: true,
                displayOrder: 0,
              },
            ],
          },
        },
      },
    },
  });

  // Draw 3: Sony PlayStation 5 Pro (Ending Soon)
  await prisma.draw.upsert({
    where: { drawNumber: 'NL-000125' },
    update: {},
    create: {
      drawNumber: 'NL-000125',
      title: 'Sony PlayStation 5 Pro + 2 DualSense Controllers + FC 26',
      description: 'Next-gen gaming at 4K 60FPS with advanced ray tracing and 2TB SSD.',
      ticketPriceEtb: 80,
      totalTickets: 800,
      soldTickets: 785,
      maxTicketsPerUser: 15,
      status: DrawStatus.OPEN,
      salesStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      salesEndDate: new Date(Date.now() + 45 * 60 * 1000), // 45 mins left!
      drawDate: new Date(Date.now() + 50 * 60 * 1000),
      permitNumber: 'NL-ET-2026-0895',
      isFeatured: false,
      prize: {
        create: {
          title: 'PlayStation 5 Pro Bundle',
          description: 'Includes console, 2 wireless controllers, and 3 blockbuster games.',
          specifications: {
            Storage: '2TB Ultra-High Speed SSD',
            Resolution: '4K with PlayStation Spectral Super Resolution (PSSR)',
            Controllers: '2x DualSense Wireless Controllers',
          },
          retailValueEtb: 110000,
          category: PrizeCategory.ELECTRONICS,
          images: {
            create: [
              {
                url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80',
                isPrimary: true,
                displayOrder: 0,
              },
            ],
          },
        },
      },
    },
  });

  // Draw 4: Completed Draw with provably fair verification proof!
  const completedDrawNumber = 'NL-000120';
  let completedDraw = await prisma.draw.findUnique({ where: { drawNumber: completedDrawNumber } });
  if (!completedDraw) {
    const seedHex = 'a1f8c942e03947b198c257df9b64219ef834710bc49281726a354b2d1847c9e0';
    const seedHash = crypto.createHash('sha256').update(seedHex).digest('hex');
    const snapshotHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const winningTicketNum = '#0142';
    const winningTicketId = 'seed-winning-ticket-142';
    const resultHash = crypto
      .createHash('sha256')
      .update(`${snapshotHash}:${seedHex}:${winningTicketNum}:${winningTicketId}`)
      .digest('hex');

    completedDraw = await prisma.draw.create({
      data: {
        drawNumber: completedDrawNumber,
        title: 'iPhone 15 Pro Max (256GB Natural Titanium)',
        description: 'Completed draw. Winner selected via verified CSPRNG.',
        ticketPriceEtb: 120,
        totalTickets: 500,
        soldTickets: 500,
        status: DrawStatus.COMPLETED,
        salesStartDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        salesEndDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        drawDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        permitNumber: 'NL-ET-2026-0888',
        snapshotHash,
        resultHash,
        prize: {
          create: {
            title: 'iPhone 15 Pro Max 256GB',
            description: 'Delivered to verified winner in Bole, Addis Ababa.',
            specifications: {
              Color: 'Natural Titanium',
              Storage: '256GB',
            },
            retailValueEtb: 140000,
            category: PrizeCategory.ELECTRONICS,
            images: {
              create: [
                {
                  url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80',
                  isPrimary: true,
                  displayOrder: 0,
                },
              ],
            },
          },
        },
      },
    });

    // Create winning ticket
    const winningTicket = await prisma.ticket.create({
      data: {
        id: winningTicketId,
        ticketNumber: winningTicketNum,
        sequenceNumber: 142,
        drawId: completedDraw.id,
        userId: demoPlayer.id,
        orderId: (await prisma.order.findFirst())?.id || 'seed-order-id',
        status: TicketStatus.WON,
        isWinningTicket: true,
        hashSignature: 'seed-hash-sig-142',
      },
    });

    const randRec = await prisma.randomnessRecord.create({
      data: {
        drawId: completedDraw.id,
        provider: 'NodeCryptoCSPRNG-v1',
        seedHash,
        seedHex,
        entropyTimestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.drawResult.create({
      data: {
        drawId: completedDraw.id,
        winningTicketId: winningTicket.id,
        winningTicketNumber: winningTicketNum,
        winningSequenceNumber: 142,
        winnerUserId: demoPlayer.id,
        snapshotHash,
        resultHash,
        algorithmVersion: '1.0.0-csprng-sha256',
        randomnessRecordId: randRec.id,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.winner.create({
      data: {
        drawId: completedDraw.id,
        userId: demoPlayer.id,
        ticketId: winningTicket.id,
        winningTicketNumber: winningTicketNum,
        winnerDisplayName: 'Dawit M. (Addis Ababa)',
        claimStatus: ClaimStatus.DELIVERED,
        deliveryAddress: 'Bole Medhanealem, Addis Ababa',
        city: 'Addis Ababa',
        trackingNumber: 'ET-POST-892147',
        claimedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('✅ Seed completed successfully with realistic draws and cryptographic proofs!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
