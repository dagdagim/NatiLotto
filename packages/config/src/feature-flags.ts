export interface FeatureFlags {
  enableRealMoneyDraws: boolean;
  enableTelebirrGateway: boolean;
  enableCbeBirrGateway: boolean;
  enableWalletWithdrawals: boolean;
  enableLiveDrawChat: boolean;
  enableAmharicLocalization: boolean;
  enforceStrictIpJurisdiction: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableRealMoneyDraws: false, // Must be explicitly enabled by regulator compliance clearance
  enableTelebirrGateway: true,
  enableCbeBirrGateway: true,
  enableWalletWithdrawals: false, // Disabled until banking license verification
  enableLiveDrawChat: false,
  enableAmharicLocalization: true,
  enforceStrictIpJurisdiction: false,
};
