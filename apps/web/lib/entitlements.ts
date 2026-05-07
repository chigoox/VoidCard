import type { Plan } from "./auth";

export type Entitlements = {
  profilesMax: number;
  pairedCardsMax: number;
  storageBytes: number;
  seatsMax: number;
  removeBranding: boolean;
  customDomain: boolean;
  customFontUpload: boolean;
  passwordProtected: boolean;
  scheduledPublish: boolean;
  abVariants: boolean;
  multiProfileVariants: boolean;
  twoWayExchange: boolean;
  leadCaptureForms: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  csvExport: boolean;
  weeklyDigest: boolean;
  brandKit: boolean;
  // free for everyone
  allThemes: true;
  customCss: true;
  walletPass: true;
  embedWidget: true;
  analytics: true;
  contactCapture1Way: true;
  allSectionTypes: true;
  sellerStorefront: true;
};

const FREE_FOR_ALL = {
  allThemes: true as const,
  customCss: true as const,
  walletPass: true as const,
  embedWidget: true as const,
  analytics: true as const,
  contactCapture1Way: true as const,
  allSectionTypes: true as const,
  sellerStorefront: true as const,
};

const STORAGE_BONUS_CAP = 25_000_000_000; // +25 GB cap

export function entitlementsFor(
  plan: Plan,
  bonuses: { extraStorageBytes?: number } = {}
): Entitlements {
  const extra = Math.min(bonuses.extraStorageBytes ?? 0, STORAGE_BONUS_CAP);

  const proFeatures = {
    removeBranding: true,
    customDomain: true,
    customFontUpload: true,
    passwordProtected: true,
    scheduledPublish: true,
    abVariants: true,
    multiProfileVariants: true,
    twoWayExchange: true,
    leadCaptureForms: true,
    apiAccess: true,
    webhooks: true,
    csvExport: true,
    weeklyDigest: true,
    brandKit: false,
  };

  switch (plan) {
    case "free":
      return {
        ...FREE_FOR_ALL,
        profilesMax: 1,
        pairedCardsMax: 1,
        storageBytes: 5_000_000_000 + extra,
        seatsMax: 1,
        removeBranding: false,
        customDomain: false,
        customFontUpload: false,
        passwordProtected: false,
        scheduledPublish: false,
        abVariants: false,
        multiProfileVariants: false,
        twoWayExchange: false,
        leadCaptureForms: false,
        apiAccess: false,
        webhooks: false,
        csvExport: false,
        weeklyDigest: false,
        brandKit: false,
      };
    case "pro":
      return {
        ...FREE_FOR_ALL,
        ...proFeatures,
        profilesMax: 10,
        pairedCardsMax: Infinity,
        storageBytes: 50_000_000_000 + extra,
        seatsMax: 1,
      };
    case "team":
      return {
        ...FREE_FOR_ALL,
        ...proFeatures,
        brandKit: true,
        profilesMax: Infinity,
        pairedCardsMax: Infinity,
        storageBytes: 250_000_000_000 + extra,
        seatsMax: 10,
      };
    case "enterprise":
      return {
        ...FREE_FOR_ALL,
        ...proFeatures,
        brandKit: true,
        profilesMax: Infinity,
        pairedCardsMax: Infinity,
        storageBytes: 1_000_000_000_000 + extra,
        seatsMax: Infinity,
      };
  }
}

export function isProFeature(key: keyof Entitlements): boolean {
  const free = entitlementsFor("free");
  return free[key] === false;
}
