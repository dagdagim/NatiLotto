import { UserRole, VerificationStatus } from './enums.js';

export interface UserDto {
  id: string;
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  dateOfBirth?: string;
  isAgeVerified: boolean;
  isSelfExcluded: boolean;
  dailySpendLimitEtb?: number;
  walletBalanceEtb: number;
  createdAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequestDto {
  phone: string;
  password?: string;
}

export interface RegisterRequestDto {
  phone: string;
  password?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  termsAccepted: boolean;
  responsiblePlayAcknowledged: boolean;
}

export interface OtpRequestDto {
  phone: string;
}

export interface OtpVerifyDto {
  phone: string;
  code: string;
}
