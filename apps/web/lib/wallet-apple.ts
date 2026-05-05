import "server-only";

import { PKPass } from "passkit-generator";
import {
  type WalletProfile,
  walletLogoAssetBuffers,
  walletProfileUrl,
  walletSiteUrl,
  walletSummary,
} from "@/lib/wallet";

function applePassTypeIdentifier() {
  return process.env.APPLE_PASS_TYPE_ID ?? null;
}

export function configuredApplePassTypeIdentifier() {
  return applePassTypeIdentifier();
}

function appleWebServiceUrl() {
  return `${walletSiteUrl()}/api/wallet/apple/web`;
}

export function isApplePassTypeIdentifierSupported(passTypeIdentifier: string) {
  const configured = applePassTypeIdentifier();
  return !!configured && configured === passTypeIdentifier;
}

export function buildAppleWalletPass(profile: WalletProfile, serial: string, authToken: string) {
  const passTypeIdentifier = process.env.APPLE_PASS_TYPE_ID;
  const teamIdentifier = process.env.APPLE_PASS_TEAM_ID;
  const signerCert = process.env.APPLE_PASS_CERT;
  const signerKey = process.env.APPLE_PASS_KEY;
  const signerKeyPassphrase = process.env.APPLE_PASS_KEY_PASSPHRASE;
  const wwdr = process.env.APPLE_WWDR;

  if (!passTypeIdentifier || !teamIdentifier || !signerCert || !signerKey || !wwdr) {
    throw new Error(
      "Apple Wallet pass generation requires APPLE_PASS_TYPE_ID, APPLE_PASS_TEAM_ID, APPLE_PASS_CERT, APPLE_PASS_KEY, and APPLE_WWDR."
    );
  }

  const assets = walletLogoAssetBuffers();
  const profileUrl = walletProfileUrl(profile.username);

  const pass = new PKPass(
    {
      "icon.png": assets.icon,
      "icon@2x.png": assets.icon2x,
      "logo.png": assets.logo,
      "logo@2x.png": assets.logo2x,
    },
    {
      wwdr: Buffer.from(wwdr, "base64"),
      signerCert: Buffer.from(signerCert, "base64"),
      signerKey: Buffer.from(signerKey, "base64"),
      signerKeyPassphrase,
    },
    {
      description: "VoidCard digital profile pass",
      organizationName: "VoidCard",
      passTypeIdentifier,
      serialNumber: serial,
      teamIdentifier,
      foregroundColor: "rgb(247, 243, 234)",
      backgroundColor: "rgb(10, 10, 11)",
      labelColor: "rgb(212, 175, 55)",
      logoText: profile.displayName,
      authenticationToken: authToken,
      webServiceURL: appleWebServiceUrl(),
    }
  );

  pass.type = "storeCard";
  pass.primaryFields.push({ key: "name", label: "PROFILE", value: profile.displayName });
  pass.secondaryFields.push({ key: "handle", label: "HANDLE", value: `@${profile.username}` });
  pass.auxiliaryFields.push({ key: "status", label: "STATUS", value: profile.verified ? "Verified" : "Live" });
  pass.backFields.push({ key: "url", label: "Open profile", value: profileUrl });
  pass.backFields.push({ key: "summary", label: "About", value: walletSummary(profile) });
  pass.setBarcodes(profileUrl);

  return {
    buffer: pass.getAsBuffer(),
    mimeType: pass.mimeType ?? "application/vnd.apple.pkpass",
  };
}