import "server-only";

import { importPKCS8, SignJWT } from "jose";
import {
  type WalletProfile,
  walletImageUrl,
  walletObjectIdFragment,
  walletProfileUrl,
  walletSerial,
} from "@/lib/wallet";

type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
  private_key_id?: string;
};

type GoogleWalletConfig = {
  issuerId: string;
  serviceAccount: GoogleServiceAccount;
};

type GoogleWalletResourceKind = "genericClass" | "genericObject";

type GoogleAccessTokenResponse = {
  access_token?: string;
};

function parseServiceAccount(raw: string) {
  try {
    const decoded = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(decoded) as GoogleServiceAccount;
  } catch {
    return null;
  }
}

function googleWalletConfig(): GoogleWalletConfig | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const serviceAccountRaw =
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON ?? process.env.GOOGLE_WALLET_SA_KEY ?? null;
  if (!issuerId || !serviceAccountRaw) {
    return null;
  }

  const serviceAccount = parseServiceAccount(serviceAccountRaw);
  if (!serviceAccount?.client_email || !serviceAccount.private_key) {
    return null;
  }

  return { issuerId, serviceAccount };
}

function localized(value: string) {
  return {
    defaultValue: {
      language: "en-US",
      value,
    },
  };
}

async function googleWalletAccessToken(serviceAccount: GoogleServiceAccount) {
  const privateKey = await importPKCS8(serviceAccount.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token",
  })
    .setProtectedHeader({
      alg: "RS256",
      ...(serviceAccount.private_key_id ? { kid: serviceAccount.private_key_id } : {}),
    })
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60)
    .sign(privateKey);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Google token exchange failed with ${response.status}.`);
  }

  const body = (await response.json()) as GoogleAccessTokenResponse;
  if (!body.access_token) {
    throw new Error("Google token exchange did not return an access token.");
  }

  return { accessToken: body.access_token, privateKey };
}

async function readGoogleWalletError(response: Response) {
  try {
    const body = (await response.json()) as { error?: { message?: string }; message?: string };
    return body.error?.message ?? body.message ?? `Google Wallet request failed with ${response.status}.`;
  } catch {
    return `Google Wallet request failed with ${response.status}.`;
  }
}

async function googleWalletRequest(path: string, accessToken: string, init: RequestInit = {}) {
  return fetch(`https://walletobjects.googleapis.com/walletobjects/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

function googleWalletIds(profile: WalletProfile, issuerId: string) {
  const serial = walletSerial("google", `${profile.userId}:${profile.profileId}`);
  const fragment = walletObjectIdFragment(serial);
  return {
    serial,
    classId: `${issuerId}.voidcard_${fragment}`,
    objectId: `${issuerId}.voidcard_${fragment}_object`,
  };
}

function buildGoogleWalletClass(classId: string) {
  return {
    id: classId,
    issuerName: "VoidCard",
    reviewStatus: "UNDER_REVIEW",
  };
}

function buildGoogleWalletObject(profile: WalletProfile, classId: string, objectId: string) {
  const profileUrl = walletProfileUrl(profile.username);
  return {
    id: objectId,
    classId,
    state: "ACTIVE",
    cardTitle: localized(profile.displayName),
    header: localized(profile.verified ? "Verified profile" : "Public profile"),
    subheader: localized(`@${profile.username}`),
    textModulesData: [
      {
        id: "bio",
        header: "About",
        body: profile.bio?.trim() || "Open the live profile to see the latest links and content.",
      },
    ],
    linksModuleData: {
      uris: [
        {
          id: "profile",
          description: "Open live profile",
          uri: profileUrl,
        },
      ],
    },
    barcode: {
      type: "QR_CODE",
      value: profileUrl,
      alternateText: profileUrl,
    },
    hexBackgroundColor: "#0A0A0B",
    logo: {
      sourceUri: { uri: walletImageUrl(profile) },
      contentDescription: localized("VoidCard logo"),
    },
  };
}

async function upsertGoogleWalletResource(
  kind: GoogleWalletResourceKind,
  id: string,
  payload: Record<string, unknown>,
  accessToken: string
) {
  const response = await googleWalletRequest(`/${kind}/${encodeURIComponent(id)}`, accessToken, {
    method: "GET",
  });

  if (response.status === 404) {
    const insertResponse = await googleWalletRequest(`/${kind}`, accessToken, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!insertResponse.ok) {
      throw new Error(await readGoogleWalletError(insertResponse));
    }
    return;
  }

  if (!response.ok) {
    throw new Error(await readGoogleWalletError(response));
  }

  const updateResponse = await googleWalletRequest(`/${kind}/${encodeURIComponent(id)}`, accessToken, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!updateResponse.ok) {
    throw new Error(await readGoogleWalletError(updateResponse));
  }
}

async function googleWalletSaveUrl(
  serviceAccount: GoogleServiceAccount,
  privateKey: CryptoKey,
  profile: WalletProfile,
  classId: string,
  objectId: string
) {
  const profileUrl = walletProfileUrl(profile.username);
  const payload = {
    genericClasses: [buildGoogleWalletClass(classId)],
    genericObjects: [buildGoogleWalletObject(profile, classId, objectId)],
  };

  const token = await new SignJWT({
    iss: serviceAccount.client_email,
    aud: "google",
    typ: "savetowallet",
    origins: [new URL(profileUrl).origin],
    payload,
  })
    .setProtectedHeader({
      alg: "RS256",
      ...(serviceAccount.private_key_id ? { kid: serviceAccount.private_key_id } : {}),
    })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(privateKey);

  return `https://pay.google.com/gp/v/save/${token}`;
}

export async function syncGoogleWalletPass(profile: WalletProfile) {
  const config = googleWalletConfig();
  if (!config) {
    throw new Error(
      "Google Wallet save link requires GOOGLE_WALLET_ISSUER_ID and GOOGLE_WALLET_SERVICE_ACCOUNT_JSON."
    );
  }

  const ids = googleWalletIds(profile, config.issuerId);
  const { accessToken, privateKey } = await googleWalletAccessToken(config.serviceAccount);

  await upsertGoogleWalletResource(
    "genericClass",
    ids.classId,
    buildGoogleWalletClass(ids.classId),
    accessToken
  );
  await upsertGoogleWalletResource(
    "genericObject",
    ids.objectId,
    buildGoogleWalletObject(profile, ids.classId, ids.objectId),
    accessToken
  );

  return {
    ...ids,
    saveUrl: await googleWalletSaveUrl(config.serviceAccount, privateKey, profile, ids.classId, ids.objectId),
  };
}