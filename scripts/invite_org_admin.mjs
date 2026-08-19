import { createPrivateKey } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";

const organization = "Inflexcvi";
const username = "smithdouglas404";

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

const membershipRes = await github(`/orgs/${organization}/memberships/${username}`, {
  method: "PUT",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ role: "admin" }),
});
const membershipData = await membershipRes.json();
console.log(JSON.stringify({ status: membershipRes.status, membership: membershipData }, null, 2));
