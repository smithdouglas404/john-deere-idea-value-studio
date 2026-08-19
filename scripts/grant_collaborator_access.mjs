import { createPrivateKey } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";

const organization = "Inflexcvi";
const collaborator = "smithdouglas404";
const repositories = [
  { name: "challenge-dealer-service-efficiency", title: "Dealer Service Efficiency Challenge" },
  { name: "challenge-dealer-technician-knowledge", title: "Dealer Technician Knowledge Challenge" },
];

function normalizePrivateKey(value) {
  const pem = value.replace(/\\n/g, "\n").trim();
  if (pem.includes("BEGIN PRIVATE KEY")) return pem;
  return createPrivateKey(pem).export({ type: "pkcs8", format: "pem" }).toString();
}

const appId = process.env.GITHUB_APP_ID?.trim();
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.trim();
const installationId = process.env.GITHUB_APP_INSTALLATION_ID?.trim();
if (!appId || !privateKey || !installationId) throw new Error("GitHub App configuration is not available.");

const issuedAt = Math.floor(Date.now() / 1000) - 60;
const key = await importPKCS8(normalizePrivateKey(privateKey), "RS256");
const jwt = await new SignJWT({ iat: issuedAt })
  .setProtectedHeader({ alg: "RS256", typ: "JWT" })
  .setIssuer(appId)
  .setIssuedAt(issuedAt)
  .setExpirationTime(issuedAt + 540)
  .sign(key);

const tokenResponse = await fetch(`https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`, {
  method: "POST",
  headers: { accept: "application/vnd.github+json", authorization: `Bearer ${jwt}`, "user-agent": "John-Deere-Idea-Value-Studio", "x-github-api-version": "2022-11-28" },
});
if (!tokenResponse.ok) throw new Error(`Installation token request failed (HTTP ${tokenResponse.status}).`);
const { token } = await tokenResponse.json();

async function github(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/vnd.github+json");
  headers.set("authorization", `Bearer ${token}`);
  headers.set("user-agent", "John-Deere-Idea-Value-Studio");
  headers.set("x-github-api-version", "2022-11-28");
  return fetch(`https://api.github.com${path}`, { ...init, headers });
}

const results = [];
for (const repository of repositories) {
  const base = `/repos/${organization}/${repository.name}`;
  const collaboratorResponse = await github(`${base}/collaborators/${encodeURIComponent(collaborator)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ permission: "admin" }),
  });
  if (![201, 204].includes(collaboratorResponse.status)) {
    const errText = await collaboratorResponse.text();
    throw new Error(`Admin collaborator grant for ${collaborator} on ${repository.name} failed (HTTP ${collaboratorResponse.status}): ${errText}`);
  }
  const repoResponse = await github(base);
  const repoData = await repoResponse.json();
  results.push({ repository: repository.name, url: repoData.html_url, collaborator, permission: "admin" });
}

console.log(JSON.stringify({ organization, results }, null, 2));
