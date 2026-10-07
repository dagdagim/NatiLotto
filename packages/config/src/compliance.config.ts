export interface ComplianceConfig {
  minimumAge: number;
  requireAgeVerificationBeforePurchase: boolean;
  requireKycBeforeClaim: boolean;
  maxDailyTicketsPerUser: number;
  maxDrawTicketsPerUser: number;
  requireLicenseRegistration: boolean;
  permittedJurisdictions: string[];
  selfExclusionCooldownDays: number;
}

export const DEFAULT_COMPLIANCE_CONFIG: ComplianceConfig = {
  minimumAge: 18,
  requireAgeVerificationBeforePurchase: true,
  requireKycBeforeClaim: true,
  maxDailyTicketsPerUser: 100,
  maxDrawTicketsPerUser: 25,
  requireLicenseRegistration: true,
  permittedJurisdictions: ['ET'],
  selfExclusionCooldownDays: 30,
};
