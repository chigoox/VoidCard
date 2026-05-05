import "server-only";

const VERCEL_API_BASE = "https://api.vercel.com";

type VercelProjectDomainsResponse = {
  domains?: Array<{
    name?: string | null;
  }>;
};

type VercelErrorResponse = {
  error?: {
    message?: string;
  };
  message?: string;
};

export type VercelDomainConfig = {
  configuredBy?: string | null;
  acceptedChallenges?: string[];
  misconfigured?: boolean;
};

type VercelContext = {
  token: string;
  projectId: string;
  teamId: string | null;
};

function getVercelContext(): VercelContext | null {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    return null;
  }

  return {
    token,
    projectId,
    teamId: process.env.VERCEL_TEAM_ID ?? null,
  };
}

function buildUrl(path: string, teamId: string | null) {
  const url = new URL(`${VERCEL_API_BASE}${path}`);
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }
  return url.toString();
}

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as VercelErrorResponse;
    return body.error?.message ?? body.message ?? `Vercel request failed with ${response.status}.`;
  } catch {
    return `Vercel request failed with ${response.status}.`;
  }
}

async function vercelFetch(path: string, init: RequestInit = {}) {
  const context = getVercelContext();
  if (!context) {
    return null;
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${context.token}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(buildUrl(path, context.teamId), {
    ...init,
    headers,
    cache: "no-store",
  });
}

export function hasVercelProjectDomainConfig() {
  return getVercelContext() !== null;
}

export async function listProjectDomains() {
  const context = getVercelContext();
  if (!context) {
    return null;
  }

  const response = await vercelFetch(`/v1/projects/${encodeURIComponent(context.projectId)}/domains`);
  if (!response) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const body = (await response.json()) as VercelProjectDomainsResponse;
  return new Set(
    (body.domains ?? []).flatMap((domain) =>
      typeof domain.name === "string" ? [domain.name.toLowerCase()] : []
    )
  );
}

export async function attachProjectDomain(hostname: string) {
  const context = getVercelContext();
  if (!context) {
    return null;
  }

  const response = await vercelFetch(`/v10/projects/${encodeURIComponent(context.projectId)}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: hostname }),
  });
  if (!response) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return hostname;
}

export async function detachProjectDomain(hostname: string) {
  const context = getVercelContext();
  if (!context) {
    return null;
  }

  const response = await vercelFetch(
    `/v9/projects/${encodeURIComponent(context.projectId)}/domains/${encodeURIComponent(hostname)}`,
    { method: "DELETE" }
  );
  if (!response) {
    return null;
  }
  if (response.status === 404) {
    return false;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return true;
}

export async function getDomainConfig(hostname: string) {
  if (!getVercelContext()) {
    return null;
  }

  const response = await vercelFetch(`/v6/domains/${encodeURIComponent(hostname)}/config`);
  if (!response) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as VercelDomainConfig;
}