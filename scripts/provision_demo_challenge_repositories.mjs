import { createPrivateKey } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";

const organization = "Inflexcvi";
const repositories = ["challenge-dealer-service-efficiency", "challenge-dealer-technician-knowledge"];

function normalizePrivateKey(value) {
  const pem = value.replace(/\\n/g, "\n").trim();
  if (pem.includes("BEGIN PRIVATE KEY")) return pem;
  return createPrivateKey(pem).export({ type: "pkcs8", format: "pem" }).toString();
}

const appId = process.env.GITHUB_APP_ID?.trim();
const installationId = process.env.GITHUB_APP_INSTALLATION_ID?.trim();
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.trim();
if (!appId || !installationId || !privateKey) throw new Error("GitHub App configuration is unavailable.");

const now = Math.floor(Date.now() / 1000) - 60;
const key = await importPKCS8(normalizePrivateKey(privateKey), "RS256");
const jwt = await new SignJWT({ iat: now })
  .setProtectedHeader({ alg: "RS256", typ: "JWT" })
  .setIssuer(appId)
  .setIssuedAt(now)
  .setExpirationTime(now + 540)
  .sign(key);

const tokenResponse = await fetch(`https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`, {
  method: "POST",
  headers: { accept: "application/vnd.github+json", authorization: `Bearer ${jwt}`, "user-agent": "John-Deere-Idea-Value-Studio", "x-github-api-version": "2022-11-28" },
});
if (!tokenResponse.ok) throw new Error(`GitHub App token request failed (HTTP ${tokenResponse.status}).`);
const { token } = await tokenResponse.json();
if (!token) throw new Error("GitHub App token response did not include a token.");

async function github(path, init = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "user-agent": "John-Deere-Idea-Value-Studio", "x-github-api-version": "2022-11-28", ...(init.headers || {}) },
  });
}

const output = [];
for (const name of repositories) {
  const existing = await github(`/repos/${organization}/${name}`);
  if (existing.ok) {
    const repository = await existing.json();
    if (!repository.private) throw new Error(`${organization}/${name} already exists but is not private.`);
    output.push({ name, action: "reused_existing_private_repository", id: repository.id, url: repository.html_url, private: repository.private });
    continue;
  }
  if (existing.status !== 404) throw new Error(`GitHub lookup failed for ${organization}/${name} (HTTP ${existing.status}).`);
  const created = await github(`/orgs/${organization}/repos`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, private: true, has_issues: true, has_projects: false, has_wiki: false, auto_init: true, description: "Private challenge-owned project repository provisioned by John Deere Idea Value Studio." }),
  });
  if (!created.ok) throw new Error(`GitHub creation failed for ${organization}/${name} (HTTP ${created.status}).`);
  const repository = await created.json();
  if (!repository.private) throw new Error(`${organization}/${name} was not created as private.`);
  output.push({ name, action: "created_private_repository", id: repository.id, url: repository.html_url, private: repository.private });
}

console.log(JSON.stringify(output, null, 2));
