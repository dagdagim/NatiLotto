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
export declare const DEFAULT_COMPLIANCE_CONFIG: ComplianceConfig;
//# sourceMappingURL=compliance.config.d.ts.map