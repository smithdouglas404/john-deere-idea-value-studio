import { createPrivateKey } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";

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
  headers: {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${jwt}`,
    "user-agent": "John-Deere-Idea-Value-Studio",
    "x-github-api-version": "2022-11-28",
  },
});
if (!tokenResponse.ok) throw new Error(`Installation token request failed (HTTP ${tokenResponse.status}).`);
const { token } = await tokenResponse.json();

const response = await fetch("https://api.github.com/orgs/Inflexcvi/members?role=admin&per_page=100", {
  headers: {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "user-agent": "John-Deere-Idea-Value-Studio",
    "x-github-api-version": "2022-11-28",
  },
});
if (!response.ok) throw new Error(`Organization member lookup failed (HTTP ${response.status}).`);
const members = await response.json();
const owners = [];
for (const member of members) {
  const membershipResponse = await fetch(`https://api.github.com/orgs/Inflexcvi/memberships/${encodeURIComponent(member.login)}`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "user-agent": "John-Deere-Idea-Value-Studio",
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!membershipResponse.ok) continue;
  const membership = await membershipResponse.json();
  if (membership.role === "admin" || membership.role === "owner") owners.push({ login: member.login, role: membership.role });
}
console.log(JSON.stringify({ organization: "Inflexcvi", owners }, null, 2));
