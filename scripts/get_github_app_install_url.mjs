import { createPrivateKey } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";

function normalizePrivateKey(value) {
  const pem = value.replace(/\\n/g, "\n").trim();
  if (pem.includes("BEGIN PRIVATE KEY")) return pem;
  return createPrivateKey(pem).export({ type: "pkcs8", format: "pem" }).toString();
}

const appId = process.env.GITHUB_APP_ID?.trim();
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.trim();

if (!appId || !privateKey) {
  throw new Error("GitHub App configuration is not available in this environment.");
}

const issuedAt = Math.floor(Date.now() / 1000) - 60;
const key = await importPKCS8(normalizePrivateKey(privateKey), "RS256");
const jwt = await new SignJWT({ iat: issuedAt })
  .setProtectedHeader({ alg: "RS256", typ: "JWT" })
  .setIssuer(appId)
  .setIssuedAt(issuedAt)
  .setExpirationTime(issuedAt + 540)
  .sign(key);

const response = await fetch("https://api.github.com/app", {
  headers: {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${jwt}`,
    "user-agent": "John-Deere-Idea-Value-Studio",
    "x-github-api-version": "2022-11-28",
  },
});

if (!response.ok) {
  throw new Error(`GitHub App inspection failed (HTTP ${response.status}).`);
}

const app = await response.json();
console.log(JSON.stringify({
  appName: app.name,
  appSlug: app.slug,
  appOwner: app.owner?.login ?? null,
  appOwnerType: app.owner?.type ?? null,
  appUrl: app.html_url,
  installUrl: `https://github.com/apps/${app.slug}/installations/new`,
}, null, 2));
