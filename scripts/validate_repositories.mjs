import { createPrivateKey } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";

const organization = "Inflexcvi";
const collaborator = "smithdouglas404";
const repositories = [
  "challenge-dealer-service-efficiency",
  "challenge-dealer-technician-knowledge",
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

async function github(path) {
  const headers = new Headers();
  headers.set("accept", "application/vnd.github+json");
  headers.set("authorization", `Bearer ${token}`);
  headers.set("user-agent", "John-Deere-Idea-Value-Studio");
  headers.set("x-github-api-version", "2022-11-28");
  return fetch(`https://api.github.com${path}`, { headers });
}

const validation = [];
for (const repo of repositories) {
  const base = `/repos/${organization}/${repo}`;
  const collabRes = await github(`${base}/collaborators/${collaborator}/permission`);
  const collabData = collabRes.ok ? await collabRes.json() : null;

  const contentsRes = await github(`${base}/contents`);
  const contents = contentsRes.ok ? await contentsRes.json() : [];

  validation.push({
    repository: repo,
    url: `https://github.com/${organization}/${repo}`,
    collaborator,
    permission: collabData?.permission ?? "unknown",
    roleName: collabData?.role_name ?? "unknown",
    files: Array.isArray(contents) ? contents.map(item => item.path) : [],
  });
}

console.log(JSON.stringify(validation, null, 2));
