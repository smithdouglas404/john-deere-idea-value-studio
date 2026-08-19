import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { codeIndexChunks, repositoryConnections, repositorySyncStates, semanticRetrievalAudits } from "../../drizzle/schema";
import { getDb } from "../db";
import { githubInstallationFetch } from "./githubApp";

const EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_MODEL = "deterministic-hash-1536";
const EMBEDDING_VERSION = "mysql-hash-v1";
const MAX_COMMITS_PER_SYNC = 20;
const MAX_PATCH_CHARS = 10_000;
const SKIPPED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "pdf", "zip", "gz", "lock", "svg", "ico"]);

type AuthorizedConnection = {
  id: number;
  githubUrl: string;
  accessMode: "public_api" | "github_app";
  revokedAt: Date | null;
};

function parseGitHubUrl(url: string) {
  const match = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)/i);
  return match ? { owner: match[1], repo: match[2].replace(/\.git$/, "") } : null;
}

function shouldIndex(path: string, patch: string | undefined, status: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  return status !== "removed" && Boolean(patch) && patch!.length <= MAX_PATCH_CHARS && (!extension || !SKIPPED_EXTENSIONS.has(extension));
}

export function deterministicEmbedding(text: string, dimensions = EMBEDDING_DIMENSIONS) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = text.toLowerCase().match(/[a-z0-9_./-]{2,}/g) ?? [];
  for (const token of tokens) {
    const digest = createHash("sha256").update(token).digest();
    const slot = digest.readUInt32BE(0) % dimensions;
    vector[slot] += digest[4] % 2 ? 1 : -1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0));
  return magnitude ? vector.map(item => item / magnitude) : vector;
}

export function fingerprintEvidenceQuery(query: string) {
  return createHash("sha256").update(query.trim().toLowerCase()).digest("hex");
}

export function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  for (let index = 0; index < length; index += 1) dot += left[index] * right[index];
  return dot;
}

async function githubFetch(connection: AuthorizedConnection, path: string) {
  if (connection.accessMode === "github_app") return githubInstallationFetch(path);
  return fetch(`https://api.github.com${path}`, { headers: { accept: "application/vnd.github+json", "user-agent": "John-Deere-Idea-Value-Studio" } });
}

export async function syncAuthorizedRepositoryCode(connectionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable for repository code indexing.");
  const [connection] = await db.select().from(repositoryConnections).where(eq(repositoryConnections.id, connectionId)).limit(1);
  if (!connection || connection.revokedAt) throw new Error("Repository connection is not active.");
  const parsed = parseGitHubUrl(connection.githubUrl);
  if (!parsed) throw new Error("Repository indexing supports GitHub owner/repository URLs only.");
  const [state] = await db.select().from(repositorySyncStates).where(eq(repositorySyncStates.repositoryConnectionId, connection.id)).limit(1);
  const commitsResponse = await githubFetch(connection, `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/commits?per_page=${MAX_COMMITS_PER_SYNC}`);
  if (!commitsResponse.ok) throw new Error(`Repository commit retrieval failed (HTTP ${commitsResponse.status}).`);
  const newestFirst = await commitsResponse.json() as Array<{ sha: string }>;
  const unseen = [] as Array<{ sha: string }>;
  for (const commit of newestFirst) {
    if (state?.lastSyncedCommitSha && commit.sha === state.lastSyncedCommitSha) break;
    unseen.push(commit);
  }
  let latestSha = state?.lastSyncedCommitSha ?? null;
  let indexedChunks = 0;
  for (const commit of unseen.reverse()) {
    const detailResponse = await githubFetch(connection, `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/commits/${encodeURIComponent(commit.sha)}`);
    if (!detailResponse.ok) throw new Error(`Repository commit detail retrieval failed (HTTP ${detailResponse.status}).`);
    const detail = await detailResponse.json() as { sha: string; commit?: { message?: string }; files?: Array<{ filename: string; status: string; patch?: string }> };
    for (const file of detail.files ?? []) {
      if (!shouldIndex(file.filename, file.patch, file.status)) continue;
      const contentChunk = `Repository: ${parsed.owner}/${parsed.repo}\nFile: ${file.filename}\nCommit: ${detail.commit?.message ?? "No commit message"}\nDiff:\n${file.patch}`;
      const id = `${connection.id}:${file.filename}:${detail.sha}`.slice(0, 500);
      const embedding = deterministicEmbedding(contentChunk);
      const contentHash = createHash("sha256").update(contentChunk).digest("hex");
      await db.insert(codeIndexChunks).values({ id, repositoryConnectionId: connection.id, commitSha: detail.sha, filePath: file.filename, contentChunk, contentHash, embedding, embeddingModel: EMBEDDING_MODEL, embeddingVersion: EMBEDDING_VERSION }).onDuplicateKeyUpdate({ set: { contentChunk, contentHash, embedding, embeddingModel: EMBEDDING_MODEL, embeddingVersion: EMBEDDING_VERSION, updatedAt: new Date() } });
      indexedChunks += 1;
    }
    latestSha = detail.sha;
  }
  if (latestSha) await db.insert(repositorySyncStates).values({ repositoryConnectionId: connection.id, lastSyncedCommitSha: latestSha, lastSyncedAt: new Date() }).onDuplicateKeyUpdate({ set: { lastSyncedCommitSha: latestSha, lastSyncedAt: new Date() } });
  await db.update(repositoryConnections).set({ lastObservedAt: new Date() }).where(eq(repositoryConnections.id, connection.id));
  return { connectionId: connection.id, newCommits: unseen.length, indexedChunks, lastSyncedCommitSha: latestSha };
}

export async function searchIndexedCode(input: { projectId: number; connectionId: number; actorId: number; query: string; limit?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable for repository code search.");
  const queryEmbedding = deterministicEmbedding(input.query);
  const chunks = await db.select().from(codeIndexChunks).where(eq(codeIndexChunks.repositoryConnectionId, input.connectionId)).orderBy(desc(codeIndexChunks.updatedAt));
  const results = chunks.map(chunk => ({ id: chunk.id, filePath: chunk.filePath, commitSha: chunk.commitSha, contentChunk: chunk.contentChunk, similarity: cosineSimilarity(queryEmbedding, chunk.embedding), embeddingVersion: chunk.embeddingVersion })).filter(chunk => chunk.similarity > 0).sort((left, right) => right.similarity - left.similarity).slice(0, Math.min(Math.max(input.limit ?? 5, 1), 20));
  await db.insert(semanticRetrievalAudits).values({ projectId: input.projectId, repositoryConnectionId: input.connectionId, actorId: input.actorId, queryFingerprint: fingerprintEvidenceQuery(input.query), retrievalMode: `${EMBEDDING_MODEL}:${EMBEDDING_VERSION}`, resultCount: results.length });
  return results;
}
