import * as crypto from 'crypto';

describe('NATI LOTTO - Concurrency & Cryptographic Draw Integrity Suite', () => {
  // =========================================================================
  // 1. CONCURRENCY SAFETY & ANTI-OVERSELLING TESTS
  // =========================================================================
  describe('Ticket Inventory & Concurrency Locking', () => {
    it('should strictly prevent overselling under high concurrency (Pessimistic Locking Simulation)', async () => {
      const TOTAL_CAPACITY = 10;
      let currentSold = 0;
      const allocatedTickets: Array<{ seq: number; num: string; userId: string }> = [];

      // Concurrency lock simulation mimicking PostgreSQL SELECT ... FOR UPDATE transaction
      class MockDrawRepository {
        private isLocked = false;
        private lockQueue: Array<() => void> = [];

        async acquireLock(): Promise<void> {
          if (!this.isLocked) {
            this.isLocked = true;
            return;
          }
          await new Promise<void>((resolve) => this.lockQueue.push(resolve));
        }

        releaseLock(): void {
          if (this.lockQueue.length > 0) {
            const next = this.lockQueue.shift()!;
            next();
          } else {
            this.isLocked = false;
          }
        }

        async purchaseTickets(userId: string, quantity: number): Promise<{ success: boolean; tickets: any[] }> {
          await this.acquireLock();
          try {
            if (currentSold + quantity > TOTAL_CAPACITY) {
              return { success: false, tickets: [] }; // Capacity exceeded
            }

            const newTickets: any[] = [];
            for (let i = 0; i < quantity; i++) {
              currentSold++;
              const ticket = {
                seq: currentSold,
                num: `#${String(currentSold).padStart(4, '0')}`,
                userId,
              };
              allocatedTickets.push(ticket);
              newTickets.push(ticket);
            }
            return { success: true, tickets: newTickets };
          } finally {
            this.releaseLock();
          }
        }
      }

      const repo = new MockDrawRepository();

      // Fire 30 concurrent purchase requests for 1 ticket each, on a draw with only 10 capacity
      const concurrentUsers = Array.from({ length: 30 }, (_, i) => `user_${i + 1}`);
      const results = await Promise.all(
        concurrentUsers.map((userId) => repo.purchaseTickets(userId, 1))
      );

      const successfulPurchases = results.filter((r) => r.success);
      const rejectedPurchases = results.filter((r) => !r.success);

      // Assertions
      expect(successfulPurchases.length).toBe(10);
      expect(rejectedPurchases.length).toBe(20);
      expect(allocatedTickets.length).toBe(10);

      // Verify sequence numbers are strictly 1..10 with zero duplicates or gaps
      const sequenceNumbers = allocatedTickets.map((t) => t.seq).sort((a, b) => a - b);
      expect(sequenceNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      // Verify all ticket numbers are unique
      const ticketNumbers = new Set(allocatedTickets.map((t) => t.num));
      expect(ticketNumbers.size).toBe(10);
    });

    it('should reject purchase requests when remaining tickets are fewer than requested quantity', async () => {
      let sold = 8;
      const MAX_TICKETS = 10;

      const attemptOrder = (qty: number) => {
        if (sold + qty > MAX_TICKETS) {
          throw new Error(`Insufficient tickets remaining. Requested: ${qty}, Available: ${MAX_TICKETS - sold}`);
        }
        sold += qty;
        return { success: true, sold };
      };

      // 8 sold out of 10. Attempting to buy 5 must fail cleanly
      expect(() => attemptOrder(5)).toThrow('Insufficient tickets remaining');
      expect(sold).toBe(8); // Must not have partially allocated

      // Attempting to buy remaining 2 must succeed
      const ok = attemptOrder(2);
      expect(ok.success).toBe(true);
      expect(sold).toBe(10);

      // Subsequent attempt must fail (sold out)
      expect(() => attemptOrder(1)).toThrow('Insufficient tickets remaining');
    });
  });

  // =========================================================================
  // 2. CRYPTOGRAPHIC COMMIT-REVEAL PROTOCOL & VERIFICATION
  // =========================================================================
  describe('Cryptographic Commit-Reveal Draw Protocol (Zero Math.random)', () => {
    it('should produce 100% deterministic, tamper-evident results verified by SHA-256', () => {
      // Step 1: Create sample eligible tickets
      const eligibleTickets = Array.from({ length: 500 }, (_, i) => {
        const seq = i + 1;
        return {
          id: `tkt_uuid_${seq}`,
          sequenceNumber: seq,
          ticketNumber: `#${String(seq).padStart(4, '0')}`,
          userId: `usr_${(i % 50) + 1}`,
        };
      });

      // Step 2: Compute pre-draw SHA-256 snapshot hash (freeze sales)
      const snapshotPayload = eligibleTickets
        .map((t) => `${t.sequenceNumber}:${t.ticketNumber}:${t.id}:${t.userId}`)
        .join('|');
      const snapshotHash = crypto.createHash('sha256').update(snapshotPayload).digest('hex');

      expect(snapshotHash).toHaveLength(64); // Valid SHA-256 hex string

      // Step 3: CSPRNG Entropy Generation (256-bit crypto.randomBytes)
      const entropyBuffer = crypto.randomBytes(32);
      const seedHex = entropyBuffer.toString('hex');
      const seedHash = crypto.createHash('sha256').update(seedHex).digest('hex');

      expect(seedHex).toHaveLength(64);
      expect(seedHash).toHaveLength(64);

      // Step 4: Authoritative Winner Calculation (seed % eligibleCount)
      const eligibleCount = BigInt(eligibleTickets.length);
      const seedBigInt = BigInt('0x' + seedHex);
      const winningIndex = Number(seedBigInt % eligibleCount);
      const authoritativeWinner = eligibleTickets[winningIndex];

      expect(winningIndex).toBeGreaterThanOrEqual(0);
      expect(winningIndex).toBeLessThan(eligibleTickets.length);
      expect(authoritativeWinner).toBeDefined();

      // Step 5: Result Hash Commitment
      const resultHash = crypto
        .createHash('sha256')
        .update(`${snapshotHash}:${seedHex}:${authoritativeWinner.ticketNumber}:${authoritativeWinner.id}`)
        .digest('hex');

      expect(resultHash).toHaveLength(64);

      // =======================================================================
      // Step 6: Independent Public Verification Simulation (/verify endpoint)
      // Anyone with the public snapshotHash, seedHex, and tickets can independently verify:
      // =======================================================================
      const independentRecomputedSnapshot = crypto
        .createHash('sha256')
        .update(snapshotPayload)
        .digest('hex');
      expect(independentRecomputedSnapshot).toBe(snapshotHash);

      const recomputedWinnerIndex = Number(BigInt('0x' + seedHex) % BigInt(eligibleTickets.length));
      const recomputedWinner = eligibleTickets[recomputedWinnerIndex];

      expect(recomputedWinner.ticketNumber).toBe(authoritativeWinner.ticketNumber);
      expect(recomputedWinner.id).toBe(authoritativeWinner.id);

      const recomputedResultHash = crypto
        .createHash('sha256')
        .update(`${snapshotHash}:${seedHex}:${recomputedWinner.ticketNumber}:${recomputedWinner.id}`)
        .digest('hex');

      expect(recomputedResultHash).toBe(resultHash);
    });

    it('should detect any tampering in the ticket set immediately', () => {
      const tickets = [
        { seq: 1, num: '#0001', id: 't1', userId: 'u1' },
        { seq: 2, num: '#0002', id: 't2', userId: 'u2' },
        { seq: 3, num: '#0003', id: 't3', userId: 'u3' },
      ];

      const originalPayload = tickets.map((t) => `${t.seq}:${t.num}:${t.id}:${t.userId}`).join('|');
      const originalHash = crypto.createHash('sha256').update(originalPayload).digest('hex');

      // Attacker attempts to sneak in an unauthorized ticket or modify a userId
      const tamperedTickets = [
        { seq: 1, num: '#0001', id: 't1', userId: 'u1' },
        { seq: 2, num: '#0002', id: 't2', userId: 'attacker_u99' }, // Modified
        { seq: 3, num: '#0003', id: 't3', userId: 'u3' },
      ];

      const tamperedPayload = tamperedTickets.map((t) => `${t.seq}:${t.num}:${t.id}:${t.userId}`).join('|');
      const tamperedHash = crypto.createHash('sha256').update(tamperedPayload).digest('hex');

      // Tampered hash MUST NOT match original snapshot hash
      expect(tamperedHash).not.toBe(originalHash);
    });
  });

  // =========================================================================
  // 3. IDEMPOTENT PAYMENT PROCESSING
  // =========================================================================
  describe('Idempotent Webhook & Payment Callbacks', () => {
    it('should handle duplicate webhook callbacks safely without double-allocating', async () => {
      const processedTransactions = new Set<string>();
      let ticketsAllocatedCount = 0;

      const processWebhook = async (txId: string, quantity: number) => {
        // Idempotency check: if transaction ID is already processed, return existing state
        if (processedTransactions.has(txId)) {
          return { status: 'ALREADY_PROCESSED', allocated: false };
        }

        // Process first time
        processedTransactions.add(txId);
        ticketsAllocatedCount += quantity;
        return { status: 'PROCESSED', allocated: true };
      };

      const txId = 'TEL-ET-20260922-883921';

      // First webhook call (e.g. from Telebirr)
      const res1 = await processWebhook(txId, 5);
      expect(res1.status).toBe('PROCESSED');
      expect(res1.allocated).toBe(true);
      expect(ticketsAllocatedCount).toBe(5);

      // Duplicate retry from Telebirr network timeout
      const res2 = await processWebhook(txId, 5);
      expect(res2.status).toBe('ALREADY_PROCESSED');
      expect(res2.allocated).toBe(false);
      expect(ticketsAllocatedCount).toBe(5); // Still 5, never double-allocated

      // Triplicate delivery
      const res3 = await processWebhook(txId, 5);
      expect(res3.status).toBe('ALREADY_PROCESSED');
      expect(ticketsAllocatedCount).toBe(5);
    });
  });

  // =========================================================================
  // 4. COMPLIANCE & RESPONSIBLE PLAY RULES
  // =========================================================================
  describe('Compliance & Responsible Play Guardrails', () => {
    it('should enforce 18+ minimum legal age requirement', () => {
      const checkAgeEligibility = (birthDate: Date): boolean => {
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          return age - 1 >= 18;
        }
        return age >= 18;
      };

      // 25 years old -> allowed
      expect(checkAgeEligibility(new Date('2000-01-01'))).toBe(true);

      // 16 years old -> rejected
      expect(checkAgeEligibility(new Date('2010-05-15'))).toBe(false);
    });

    it('should enforce daily ticket limits and per-draw participation limits', () => {
      const DAILY_LIMIT = 100;
      const DRAW_LIMIT = 25;

      const validateParticipation = (userDailyBought: number, userDrawBought: number, requested: number) => {
        if (userDailyBought + requested > DAILY_LIMIT) {
          throw new Error(`Daily purchase quota exceeded. Max: ${DAILY_LIMIT}/day`);
        }
        if (userDrawBought + requested > DRAW_LIMIT) {
          throw new Error(`Per-draw ticket quota exceeded. Max: ${DRAW_LIMIT}/draw`);
        }
        return true;
      };

      // User already bought 20 tickets for this draw, tries to buy 5 more (total 25) -> allowed
      expect(validateParticipation(40, 20, 5)).toBe(true);

      // User tries to buy 6 more for this draw (total 26 > 25) -> rejected
      expect(() => validateParticipation(40, 20, 6)).toThrow('Per-draw ticket quota exceeded');

      // User has bought 95 tickets today, tries to buy 10 more (total 105 > 100) -> rejected
      expect(() => validateParticipation(95, 5, 10)).toThrow('Daily purchase quota exceeded');
    });
  });
});
