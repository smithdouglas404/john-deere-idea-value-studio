import { githubInstallationFetch } from "./githubApp";
import { syncAuthorizedRepositoryCode } from "./repositoryCodeIndex";

type Connection = {
  id: number;
  githubUrl: string;
  accessMode: "public_api" | "github_app";
};

function parseGitHubUrl(url: string) {
  const match = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)/i);
  return match ? { owner: match[1], repo: match[2].replace(/\.git$/, "") } : null;
}

export async function observeAuthorizedRepository(connection: Connection) {
  const parsed = parseGitHubUrl(connection.githubUrl);
  if (!parsed) throw new Error("Repository monitoring supports GitHub owner/repository URLs only.");
  const path = `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
  const response = connection.accessMode === "github_app"
    ? await githubInstallationFetch(path)
    : await fetch(`https://api.github.com${path}`, { headers: { accept: "application/vnd.github+json", "user-agent": "John-Deere-Idea-Value-Studio" } });
  if (!response.ok) throw new Error(`Repository observation failed (HTTP ${response.status}).`);
  const repository = await response.json() as { id: number; full_name: string; private: boolean; html_url: string; default_branch: string; pushed_at?: string | null; updated_at?: string | null };
  const index = await syncAuthorizedRepositoryCode(connection.id);
  return {
    checkedAt: new Date().toISOString(),
    repositoryId: String(repository.id),
    fullName: repository.full_name,
    htmlUrl: repository.html_url,
    private: repository.private,
    defaultBranch: repository.default_branch,
    pushedAt: repository.pushed_at ?? null,
    updatedAt: repository.updated_at ?? null,
    index,
  };
}
