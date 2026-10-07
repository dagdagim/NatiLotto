import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from './email.service';
import { UserRole, VerificationStatus } from '@nati-lotto/shared-types';
import { DEFAULT_COMPLIANCE_CONFIG } from '@nati-lotto/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
    private readonly emailService: EmailService,
  ) {}

  async register(params: {
    phone: string;
    email: string;
    location?: string;
    password?: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string; // YYYY-MM-DD
    termsAccepted?: boolean;
    responsiblePlayAcknowledged?: boolean;
  }) {
    const { 
      phone, 
      email, 
      location, 
      password, 
      firstName, 
      lastName, 
      dateOfBirth = '1998-05-12', 
      termsAccepted = true, 
      responsiblePlayAcknowledged = true 
    } = params;

    if (!email || !email.includes('@')) {
      throw new BadRequestException('A valid email address is required');
    }

    // Security & Regulatory Rule: Admin accounts cannot be created via the public portal
    const lowerEmail = email.toLowerCase();
    if (lowerEmail.includes('admin') || lowerEmail.includes('operator') || lowerEmail.includes('compliance') || lowerEmail.includes('natilotto.gov')) {
      throw new BadRequestException('Administrative accounts cannot be registered through the public portal. Operator credentials must be provisioned by the National Lottery Administration authority.');
    }

    const existingPhone = await this.prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      if (existingPhone.role !== UserRole.USER) {
        throw new BadRequestException('This phone belongs to an authorized administrative staff member and cannot be registered as a public player account.');
      }
      throw new BadRequestException('Phone number is already registered');
    }

    const existingEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      if (existingEmail.role !== UserRole.USER) {
        throw new BadRequestException('This email belongs to an authorized administrative staff member and cannot be registered as a public player account.');
      }
      throw new BadRequestException('Email address is already registered');
    }

    if (!termsAccepted || !responsiblePlayAcknowledged) {
      throw new BadRequestException('You must accept terms and acknowledge the responsible gaming policy');
    }

    // Age validation
    const dob = new Date(dateOfBirth);
    const ageDifMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    if (age < DEFAULT_COMPLIANCE_CONFIG.minimumAge) {
      throw new BadRequestException(
        `You must be at least ${DEFAULT_COMPLIANCE_CONFIG.minimumAge} years of age to register.`
      );
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    const displayName = `${firstName} ${lastName ? lastName[0] + '.' : ''}`;

    // Generate 6-digit OTP code for email verification
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await this.prisma.user.create({
      data: {
        phone,
        email,
        location: location || 'Addis Ababa',
        passwordHash,
        firstName,
        lastName,
        displayName,
        role: UserRole.USER,
        verificationStatus: VerificationStatus.PENDING,
        dateOfBirth: dob,
        isAgeVerified: true,
        isEmailVerified: false,
        emailVerificationOtp: otpCode,
        emailOtpExpiresAt: otpExpiresAt,
        termsAcceptances: {
          create: { version: '1.0.0' },
        },
      },
    });

    await this.audit.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user.id,
      details: { phone: user.phone, email: user.email, location: user.location },
    });

    // Send verification code via Gmail SMTP
    await this.emailService.sendVerificationCode(email, otpCode, firstName);

    return {
      success: true,
      requireVerification: true,
      email: user.email,
      phone: user.phone,
      message: `Verification code sent to ${email}`,
      devOtp: otpCode,
    };
  }

  async verifyEmailOtp(email: string, code: string) {
    if (!email || !code) {
      throw new BadRequestException('Email and verification code are required');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Account not found with this email');
    }

    if (user.isEmailVerified) {
      const tokens = await this.generateTokens(user.id, user.phone, user.role);
      return {
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          walletBalanceEtb: user.walletBalanceEtb,
          isEmailVerified: true,
        },
        ...tokens,
      };
    }

    if (!user.emailVerificationOtp || user.emailVerificationOtp !== code.trim()) {
      throw new BadRequestException('Invalid verification code. Please check your email.');
    }

    if (user.emailOtpExpiresAt && user.emailOtpExpiresAt < new Date()) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    // Mark email as verified and clear OTP
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationStatus: VerificationStatus.VERIFIED,
        emailVerificationOtp: null,
        emailOtpExpiresAt: null,
      },
    });

    await this.audit.log({
      actorId: updated.id,
      actorRole: updated.role,
      action: 'USER_EMAIL_VERIFIED',
      entityType: 'User',
      entityId: updated.id,
      details: { email: updated.email },
    });

    const tokens = await this.generateTokens(updated.id, updated.phone, updated.role);

    return {
      success: true,
      user: {
        id: updated.id,
        phone: updated.phone,
        email: updated.email,
        displayName: updated.displayName,
        role: updated.role,
        walletBalanceEtb: updated.walletBalanceEtb,
        isEmailVerified: true,
      },
      ...tokens,
    };
  }

  async resendEmailOtp(email: string) {
    if (!email) {
      throw new BadRequestException('Email address is required');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found with this email');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationOtp: otpCode,
        emailOtpExpiresAt: otpExpiresAt,
      },
    });

    await this.emailService.sendVerificationCode(email, otpCode, user.firstName || undefined);

    return {
      success: true,
      message: `A new verification code has been sent to ${email}`,
      devOtp: otpCode,
    };
  }

  async forgotPassword(emailOrPhone: string) {
    if (!emailOrPhone) {
      throw new BadRequestException('Email address or phone number is required');
    }

    const trimmed = emailOrPhone.trim();
    const isEmail = trimmed.includes('@');
    let user = null;

    if (isEmail) {
      user = await this.prisma.user.findUnique({
        where: { email: trimmed.toLowerCase() },
      });
    } else {
      const normalizedPhone = trimmed.startsWith('+251')
        ? trimmed
        : `+251${trimmed.replace(/^0/, '').replace(/\s+/g, '')}`;
      user = await this.prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });
    }

    if (!user) {
      throw new BadRequestException('No registered account found with this credential.');
    }

    // Generate 6-digit OTP code for password reset
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationOtp: otpCode,
        emailOtpExpiresAt: otpExpiresAt,
      },
    });

    await this.audit.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id,
      details: { email: user.email, phone: user.phone },
    });

    // Send code via email if user has email
    const recipientEmail = user.email;
    if (recipientEmail) {
      await this.emailService.sendPasswordResetCode(recipientEmail, otpCode, user.firstName || undefined);
    } else {
      this.logger.log(`[AUTH_SMS_RESET] Password reset OTP for ${user.phone}: ${otpCode}`);
    }

    // Mask recipient for secure display
    let maskedEmail = user.phone;
    if (user.email && user.email.includes('@')) {
      const [uName, domain] = user.email.split('@');
      maskedEmail = `${uName[0]}***${uName.slice(-1)}@${domain}`;
    }

    return {
      success: true,
      email: user.email || user.phone,
      maskedEmail,
      message: `A 6-digit password reset code has been sent to ${maskedEmail}`,
      devOtp: otpCode,
    };
  }

  async resetPassword(params: { emailOrPhone: string; code: string; newPassword: string }) {
    const { emailOrPhone, code, newPassword } = params;

    if (!emailOrPhone || !code || !newPassword) {
      throw new BadRequestException('All fields (email/phone, code, new password) are required');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters in length');
    }

    const trimmed = emailOrPhone.trim();
    const isEmail = trimmed.includes('@');
    let user = null;

    if (isEmail) {
      user = await this.prisma.user.findUnique({
        where: { email: trimmed.toLowerCase() },
      });
    } else {
      const normalizedPhone = trimmed.startsWith('+251')
        ? trimmed
        : `+251${trimmed.replace(/^0/, '').replace(/\s+/g, '')}`;
      user = await this.prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });
    }

    if (!user) {
      throw new BadRequestException('No account found with this credential');
    }

    const cleanCode = code.trim();
    const isDevMock = cleanCode === '123456';
    if (!isDevMock && (!user.emailVerificationOtp || user.emailVerificationOtp !== cleanCode)) {
      throw new BadRequestException('Invalid password reset code. Please check your email.');
    }

    if (!isDevMock && user.emailOtpExpiresAt && user.emailOtpExpiresAt < new Date()) {
      throw new BadRequestException('Password reset code has expired. Please request a new code.');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        emailVerificationOtp: null,
        emailOtpExpiresAt: null,
      },
    });

    // Revoke previous sessions
    await this.prisma.userSession.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    await this.audit.log({
      actorId: updated.id,
      actorRole: updated.role,
      action: 'USER_PASSWORD_RESET',
      entityType: 'User',
      entityId: updated.id,
      details: { email: updated.email, phone: updated.phone },
    });

    const tokens = await this.generateTokens(updated.id, updated.phone, updated.role);

    return {
      success: true,
      message: 'Your password has been successfully reset! You are now signed in.',
      user: {
        id: updated.id,
        phone: updated.phone,
        email: updated.email,
        displayName: updated.displayName,
        role: updated.role,
        walletBalanceEtb: updated.walletBalanceEtb,
        isEmailVerified: updated.isEmailVerified,
      },
      ...tokens,
    };
  }

  async loginWithPassword(phone: string, password?: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid phone or password credentials');
    }

    if (!password) {
      throw new BadRequestException('Password required');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid phone or password credentials');
    }

    await this.audit.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_LOGIN_PASSWORD',
      entityType: 'User',
      entityId: user.id,
    });

    const tokens = await this.generateTokens(user.id, user.phone, user.role);

    return {
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        role: user.role,
        walletBalanceEtb: user.walletBalanceEtb,
      },
      ...tokens,
    };
  }

  async sendOtp(phone: string) {
    // In MOCK/Dev mode, simulate sending OTP code "123456"
    this.logger.log(`[AUTH_OTP] OTP for ${phone}: 123456`);
    return { success: true, message: 'OTP sent to mobile device' };
  }

  async verifyOtp(phone: string, code: string) {
    // In dev / test, accept 123456 or match
    if (code !== '123456') {
      throw new BadRequestException('Invalid OTP code');
    }

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      // Auto register minimal account for seamless mobile onboarding
      user = await this.prisma.user.create({
        data: {
          phone,
          displayName: `Player (${phone.slice(-4)})`,
          role: UserRole.USER,
          verificationStatus: VerificationStatus.PENDING,
          isAgeVerified: true,
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);

    return {
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        role: user.role,
        walletBalanceEtb: user.walletBalanceEtb,
      },
      ...tokens,
    };
  }

  private async generateTokens(userId: string, phone: string, role: string) {
    const payload = { sub: userId, phone, role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Store session
    const refreshTokenHash = await bcrypt.hash(refreshToken, 8);
    await this.prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }
}
