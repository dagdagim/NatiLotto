import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_COMPLIANCE_CONFIG } from '@nati-lotto/config';
import { UserRole } from '@nati-lotto/shared-types';

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyUserEligibility(userId: string, requestedTicketsCount: number, drawId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        complianceRestrictions: {
          where: { isActive: true },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User does not exist');
    }

    // 0. Regulatory Rule: Staff, Operators, and Administrators are strictly prohibited from purchasing tickets!
    if (user.role !== UserRole.USER) {
      throw new ForbiddenException(
        'Regulatory Compliance Violation: Administrative, operations, and compliance personnel are strictly barred from purchasing lottery tickets under National Lottery Administration (NLA) integrity rules.'
      );
    }

    // 1. Check self-exclusion
    if (user.isSelfExcluded) {
      if (user.selfExclusionUntil && user.selfExclusionUntil > new Date()) {
        throw new ForbiddenException(
          `Account is currently in self-exclusion period until ${user.selfExclusionUntil.toLocaleDateString()}`
        );
      }
    }

    // 2. Check active compliance restrictions (e.g. AML, fraud flag, cooling off)
    if (user.complianceRestrictions && user.complianceRestrictions.length > 0) {
      const activeRestriction = user.complianceRestrictions[0];
      throw new ForbiddenException(`Account restricted for compliance: ${activeRestriction.reason}`);
    }

    // 3. Check age requirement
    if (DEFAULT_COMPLIANCE_CONFIG.requireAgeVerificationBeforePurchase) {
      if (!user.isAgeVerified && user.dateOfBirth) {
        const ageDifMs = Date.now() - user.dateOfBirth.getTime();
        const ageDate = new Date(ageDifMs);
        const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
        if (calculatedAge < DEFAULT_COMPLIANCE_CONFIG.minimumAge) {
          throw new ForbiddenException(
            `Participation is strictly prohibited for individuals under ${DEFAULT_COMPLIANCE_CONFIG.minimumAge} years of age.`
          );
        }
      }
    }

    // 4. Check user ticket count in this specific draw
    const existingDrawTicketsCount = await this.prisma.ticket.count({
      where: {
        userId,
        drawId,
        status: { in: ['CONFIRMED', 'RESERVED'] },
      },
    });

    const draw = await this.prisma.draw.findUnique({ where: { id: drawId } });
    const maxPerUser = draw?.maxTicketsPerUser || DEFAULT_COMPLIANCE_CONFIG.maxDrawTicketsPerUser;

    if (existingDrawTicketsCount + requestedTicketsCount > maxPerUser) {
      throw new BadRequestException(
        `Exceeds maximum allowable tickets per user (${maxPerUser}) for this draw. You currently hold ${existingDrawTicketsCount}.`
      );
    }

    // 5. Check daily ticket limit across all draws (responsible gaming limit)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayTicketsCount = await this.prisma.ticket.count({
      where: {
        userId,
        createdAt: { gte: startOfToday },
        status: { in: ['CONFIRMED', 'RESERVED'] },
      },
    });

    const maxDaily = user.dailySpendLimitEtb || DEFAULT_COMPLIANCE_CONFIG.maxDailyTicketsPerUser;
    if (todayTicketsCount + requestedTicketsCount > maxDaily) {
      throw new BadRequestException(
        `Exceeds daily responsible gaming limit of ${maxDaily} tickets per day. Already acquired: ${todayTicketsCount}.`
      );
    }
  }

  async verifyDrawLicensing(drawId: string): Promise<void> {
    const draw = await this.prisma.draw.findUnique({ where: { id: drawId } });
    if (!draw) {
      throw new BadRequestException('Draw not found');
    }

    if (DEFAULT_COMPLIANCE_CONFIG.requireLicenseRegistration) {
      if (!draw.permitNumber || draw.permitNumber.trim().length < 3) {
        throw new ForbiddenException(
          'Draw cannot be published or opened without a registered National Lottery regulatory permit number.'
        );
      }
    }
  }
}
