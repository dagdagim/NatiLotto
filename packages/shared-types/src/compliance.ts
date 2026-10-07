export interface ComplianceCheckResult {
  isEligible: boolean;
  reasons: string[];
  ageVerified: boolean;
  spendLimitExceeded: boolean;
  isSelfExcluded: boolean;
  jurisdictionAllowed: boolean;
  licenseValid: boolean;
}

export interface ResponsiblePlaySettingsDto {
  userId: string;
  dailySpendLimitEtb?: number;
  weeklySpendLimitEtb?: number;
  monthlySpendLimitEtb?: number;
  selfExclusionUntil?: string;
  coolOffHours?: number;
}
