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

async function json(response, label) {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${label} failed (HTTP ${response.status}): ${errorText}`);
  }
  return response.status === 204 ? null : response.json();
}

const nodeTemplateResponse = await github("/gitignore/templates/Node");
const nodeTemplate = await json(nodeTemplateResponse, "Node.js gitignore template");

const results = [];
for (const repository of repositories) {
  const base = `/repos/${organization}/${repository.name}`;
  
  // 1. Add collaborator with admin permission
  const collaboratorResponse = await github(`${base}/collaborators/${encodeURIComponent(collaborator)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ permission: "admin" }),
  });
  if (![201, 204].includes(collaboratorResponse.status)) {
    const errText = await collaboratorResponse.text();
    throw new Error(`Admin collaborator grant for ${collaborator} on ${repository.name} failed (HTTP ${collaboratorResponse.status}): ${errText}`);
  }

  const repositoryResponse = await github(base);
  const repositoryBody = await json(repositoryResponse, `Repository lookup for ${repository.name}`);
  const branch = repositoryBody.default_branch || "main";
  const readmeText = `# ${repository.title}\n\nThis private challenge-owned repository is assigned to the **${repository.title}** proof project in John Deere Idea Value Studio.\n\n## Working agreement\n\n- Develop only against the proof question and evidence contract inherited from the investment case.\n- Keep commits, documentation, tests, and limitations visible to the project team.\n- The platform audit is read-only, bounded, and advisory; human judges and sponsors retain decision authority.\n\n## Start here\n\nAdd the project brief, team working agreement, and first implementation notes before the proof event begins.\n`;

  for (const [path, content, message] of [
    ["README.md", readmeText, "Initialize challenge repository README"],
    [".gitignore", nodeTemplate.source, "Add standard Node.js gitignore"],
  ]) {
    const existingResponse = await github(`${base}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`);
    const existing = existingResponse.ok ? await existingResponse.json() : null;
    const payload = {
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
      ...(existing?.sha ? { sha: existing.sha } : {}),
    };
    const updateResponse = await github(`${base}/contents/${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    await json(updateResponse, `${path} initialization for ${repository.name}`);
  }

  results.push({ repository: repository.name, url: repositoryBody.html_url, collaborator, collaboratorPermission: "admin", initialized: ["README.md", ".gitignore"], branch });
}

console.log(JSON.stringify({ organization, results }, null, 2));
