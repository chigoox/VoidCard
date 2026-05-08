import { describe, it, expect } from "vitest";
import { entitlementsFor, planWithRole } from "../entitlements";

describe("entitlementsFor", () => {
  it("free plan denies pro features", () => {
    const e = entitlementsFor("free");
    expect(e.removeBranding).toBe(false);
    expect(e.customDomain).toBe(false);
    expect(e.customFontUpload).toBe(false);
    expect(e.abVariants).toBe(false);
    expect(e.brandKit).toBe(false);
    expect(e.profilesMax).toBe(1);
    expect(e.seatsMax).toBe(1);
    expect(e.storageBytes).toBe(5_000_000_000);
  });

  it("pro plan grants all pro features but not brand kit", () => {
    const e = entitlementsFor("pro");
    expect(e.removeBranding).toBe(true);
    expect(e.customDomain).toBe(true);
    expect(e.customFontUpload).toBe(true);
    expect(e.abVariants).toBe(true);
    expect(e.apiAccess).toBe(true);
    expect(e.webhooks).toBe(true);
    expect(e.brandKit).toBe(false);
    expect(e.profilesMax).toBe(10);
    expect(e.seatsMax).toBe(1);
  });

  it("team plan grants brand kit + 10 seats", () => {
    const e = entitlementsFor("team");
    expect(e.brandKit).toBe(true);
    expect(e.seatsMax).toBe(10);
    expect(e.profilesMax).toBe(Infinity);
  });

  it("storage bonuses are capped at +25GB", () => {
    const e = entitlementsFor("free", { extraStorageBytes: 100_000_000_000 });
    expect(e.storageBytes).toBe(5_000_000_000 + 25_000_000_000);
  });

  it("storage bonuses below cap pass through", () => {
    const e = entitlementsFor("free", { extraStorageBytes: 1_000_000_000 });
    expect(e.storageBytes).toBe(5_000_000_000 + 1_000_000_000);
  });

  it("promotes admins and superadmins to enterprise entitlements", () => {
    expect(planWithRole("free", "admin")).toBe("enterprise");
    expect(planWithRole("free", "superadmin")).toBe("enterprise");
    expect(planWithRole("free", "user")).toBe("free");
  });
});
