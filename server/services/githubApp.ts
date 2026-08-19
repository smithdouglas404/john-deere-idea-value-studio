import { readFile } from "node:fs/promises";
import { createPrivateKey } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";

type GitHubAppConfig = {
  appId: string;
  installationId: string;
  privateKey: string;
};

type InstallationTokenResponse = {
  token?: string;
  expires_at?: string;
};

function normalizePrivateKey(value: string) {
  const pem = value.replace(/\\n/g, "\n").trim();
  if (pem.includes("BEGIN PRIVATE KEY")) return pem;
  return createPrivateKey(pem).export({ type: "pkcs8", format: "pem" }).toString();
}

async function readDevelopmentKeyFile() {
  const path = process.env.GITHUB_APP_PRIVATE_KEY_PATH;
  if (!path || process.env.NODE_ENV === "production") return null;
  return normalizePrivateKey(await readFile(path, "utf8"));
}

export async function getGitHubAppConfig(): Promise<GitHubAppConfig | null> {
  const appId = process.env.GITHUB_APP_ID?.trim();
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID?.trim();
  const configuredKey = process.env.GITHUB_APP_PRIVATE_KEY?.trim();
  const privateKey = configuredKey ? normalizePrivateKey(configuredKey) : await readDevelopmentKeyFile();
  if (!appId || !installationId || !privateKey) return null;
  return { appId, installationId, privateKey };
}

export async function createGitHubAppJwt(config: GitHubAppConfig) {
  const issuedAt = Math.floor(Date.now() / 1000) - 60;
  const key = await importPKCS8(config.privateKey, "RS256");
  return new SignJWT({ iat: issuedAt })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(config.appId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 540)
    .sign(key);
}

export async function mintInstallationAccessToken(config: GitHubAppConfig) {
  const appJwt = await createGitHubAppJwt(config);
  const response = await fetch(`https://api.github.com/app/installations/${encodeURIComponent(config.installationId)}/access_tokens`, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${appJwt}`,
      "user-agent": "John-Deere-Idea-Value-Studio",
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub App installation token request failed (HTTP ${response.status}).`);
  const body = (await response.json()) as InstallationTokenResponse;
  if (!body.token) throw new Error("GitHub App installation token response did not include a token.");
  return { token: body.token, expiresAt: body.expires_at ?? null };
}

export async function mintCurrentInstallationAccessToken() {
  const config = await getGitHubAppConfig();
  if (!config) throw new Error("Private GitHub evidence is not configured.");
  return mintInstallationAccessToken(config);
}

export async function githubInstallationFetch(path: string, init: RequestInit = {}) {
  const config = await getGitHubAppConfig();
  if (!config) throw new Error("Private GitHub evidence is not configured.");
  const { token } = await mintInstallationAccessToken(config);
  const headers = new Headers(init.headers);
  headers.set("accept", "application/vnd.github+json");
  headers.set("authorization", `Bearer ${token}`);
  headers.set("user-agent", "John-Deere-Idea-Value-Studio");
  headers.set("x-github-api-version", "2022-11-28");
  return fetch(`https://api.github.com${path}`, { ...init, headers });
}

export async function listAuthorizedInstallationRepositories() {
  const response = await githubInstallationFetch("/installation/repositories?per_page=100");
  if (!response.ok) throw new Error(`GitHub App repository listing failed (HTTP ${response.status}).`);
  const body = (await response.json()) as { repositories?: Array<{ id: number; full_name: string; private: boolean; html_url: string }> };
  return body.repositories ?? [];
}

export type ChallengeRepositoryResponse = {
  id: number;
  full_name: string;
  html_url: string;
  private: boolean;
};

function encodeRepositoryPathSegment(value: string) {
  return encodeURIComponent(value.trim());
}

/**
 * Create a private repository in the verified organization, or return the existing
 * private repository when a prior successful request already created it. This is
 * deliberately narrow: it cannot set public visibility or grant collaborators.
 */
export async function provisionPrivateOrganizationRepository(organization: string, repositoryName: string): Promise<ChallengeRepositoryResponse> {
  const normalizedOrganization = organization.trim();
  const normalizedName = repositoryName.trim().toLowerCase();
  if (!normalizedOrganization || !/^[a-z0-9][a-z0-9-]*$/.test(normalizedName)) throw new Error("Invalid private challenge repository name.");

  const existingResponse = await githubInstallationFetch(`/repos/${encodeRepositoryPathSegment(normalizedOrganization)}/${encodeRepositoryPathSegment(normalizedName)}`);
  if (existingResponse.ok) {
    const existing = (await existingResponse.json()) as ChallengeRepositoryResponse;
    if (!existing.private) throw new Error("An existing repository has this name but is not private. It cannot be used as a challenge-owned repository.");
    return existing;
  }
  if (existingResponse.status !== 404) throw new Error(`GitHub repository lookup failed (HTTP ${existingResponse.status}).`);

  const createResponse = await githubInstallationFetch(`/orgs/${encodeRepositoryPathSegment(normalizedOrganization)}/repos`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: normalizedName,
      private: true,
      has_issues: true,
      has_projects: false,
      has_wiki: false,
      auto_init: true,
      description: "Private challenge-owned project repository provisioned by John Deere Idea Value Studio.",
    }),
  });
  if (!createResponse.ok) throw new Error(`GitHub private repository creation failed (HTTP ${createResponse.status}).`);
  const created = (await createResponse.json()) as ChallengeRepositoryResponse;
  if (!created.private) throw new Error("GitHub did not create the repository as private. The assignment was not recorded.");
  return created;
}

/**
 * Add a GitHub user as an administrator/collaborator to a challenge repository.
 */
export async function addRepositoryCollaborator(owner: string, repositoryName: string, username: string, permission: "pull" | "push" | "admin" = "admin"): Promise<void> {
  const normOwner = owner.trim();
  const normRepo = repositoryName.trim();
  const normUser = username.trim();
  if (!normOwner || !normRepo || !normUser) throw new Error("Owner, repository name, and username are required.");

  const response = await githubInstallationFetch(`/repos/${encodeRepositoryPathSegment(normOwner)}/${encodeRepositoryPathSegment(normRepo)}/collaborators/${encodeRepositoryPathSegment(normUser)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ permission }),
  });
  if (!response.ok && response.status !== 204 && response.status !== 201) {
    throw new Error(`Failed to grant repository collaborator access (HTTP ${response.status}).`);
  }
}
