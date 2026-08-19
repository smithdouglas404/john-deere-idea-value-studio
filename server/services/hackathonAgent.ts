import { invokeLLM } from "../_core/llm";
import { githubInstallationFetch, mintCurrentInstallationAccessToken } from "./githubApp";
import fs from "node:fs";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import ts from "typescript";

export type AuditCitation = {
  source: "submission" | "repository" | "research" | "deck" | "video";
  reference: string;
  excerpt: string;
};

export type AgentAudit = {
  technicalScore: number;
  integrityScore: number;
  originalityScore: number;
  pitchFitScore: number;
  claims: Array<{ claimReference: string; claim: string; verdict: "supported" | "unclear" | "contradicted"; rationale: string; citations: AuditCitation[] }>;
  findings: Array<{ category: string; finding: string; severity: "info" | "warning" | "review"; citations: AuditCitation[] }>;
  questionsForJudges: string[];
  limitations: string[];
};

type ProjectContext = {
  title: string;
  description: string;
  techStack?: string[] | null;
  githubUrl?: string | null;
  demoUrl?: string | null;
  videoUrl?: string | null;
  pitchDeckUrl?: string | null;
  opportunityContext?: string | null;
  researchSummary?: string | null;
  repositoryAccessMode?: "public_api" | "github_app" | null;
};

type RepositoryEvidence = {
  text: string;
  citations: AuditCitation[];
  limitation: string | null;
  summary: { extractionMethod: "GITHUB_REST_API" | "LOCAL_SHALLOW_CLONE" | "UNAVAILABLE"; totalCommits: number; bulkCommitFlag: boolean; filesInspected: number; primaryLanguages: string[]; keyDependencies: string[] };
};

function responseText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(part => (part && typeof part === "object" && "text" in part ? String((part as { text?: unknown }).text ?? "") : "")).join("\n");
  return "";
}

function parseGitHubUrl(url: string) {
  const match = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)/i);
  return match ? { owner: match[1], repo: match[2].replace(/\.git$/, "") } : null;
}

const ELIGIBLE_CODE = /\.(ts|tsx|js|jsx|mjs|cjs|py|java|go|rs|sql|cs|rb|php)$/i;
const IGNORED_PATH = /(^|\/)(node_modules|dist|build|vendor|\.git|coverage)(\/|$)|\.min\./i;

function emptyRepositoryEvidence(message: string): RepositoryEvidence {
  return { text: "", citations: [], limitation: message, summary: { extractionMethod: "UNAVAILABLE", totalCommits: 0, bulkCommitFlag: false, filesInspected: 0, primaryLanguages: [], keyDependencies: [] } };
}

function languageFor(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  return ({ ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript", ".py": "Python", ".java": "Java", ".go": "Go", ".rs": "Rust", ".sql": "SQL", ".cs": "C#", ".rb": "Ruby", ".php": "PHP" } as Record<string, string>)[extension] || "Text";
}

function sourceLine(node: ts.Node, source: ts.SourceFile) {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

function summarizeTypeScriptAst(filePath: string, content: string) {
  const isTsx = /\.tsx$/i.test(filePath);
  const source = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports: string[] = [];
  const declarations: string[] = [];
  const routeSignals: string[] = [];
  const testSignals: string[] = [];
  const visit = (node: ts.Node) => {
    const line = sourceLine(node, source);
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) imports.push(`L${line}: ${node.moduleSpecifier.text}`);
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name) declarations.push(`L${line}: ${ts.SyntaxKind[node.kind].replace("Declaration", "")} ${node.name.text}`);
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      if (ts.isIdentifier(expression) && ["describe", "it", "test"].includes(expression.text)) testSignals.push(`L${line}: ${expression.text}(…)`);
      if (ts.isPropertyAccessExpression(expression) && ["get", "post", "put", "delete", "route"].includes(expression.name.text)) routeSignals.push(`L${line}: ${expression.getText(source).slice(0, 140)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const sections = [
    imports.length ? `[AST Imports]\n${imports.slice(0, 20).join("\n")}` : "",
    declarations.length ? `[AST Declarations]\n${declarations.slice(0, 30).join("\n")}` : "",
    routeSignals.length ? `[AST Route Signals]\n${routeSignals.slice(0, 20).join("\n")}` : "",
    testSignals.length ? `[AST Test Signals]\n${testSignals.slice(0, 20).join("\n")}` : "",
  ].filter(Boolean);
  const lines = content.split(/\r?\n/).length;
  return { summary: sections.length ? sections.join("\n") : content.slice(0, 2200), range: `L1-L${Math.min(lines, 500)}` };
}

function summarizePythonStructure(content: string) {
  const lines = content.split(/\r?\n/);
  const records = lines.map((line, index) => ({ line: line.trim(), number: index + 1 })).filter(item => /^(from\s+\S+\s+import|import\s+|async\s+def\s+|def\s+|class\s+|@)/.test(item.line)).slice(0, 50);
  return { summary: records.length ? `[Python structural imports and declarations]\n${records.map(item => `L${item.number}: ${item.line}`).join("\n")}` : content.slice(0, 2200), range: `L1-L${Math.min(lines.length, 500)}` };
}

export function summarizeSource(filePath: string, content: string) {
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(filePath)) return summarizeTypeScriptAst(filePath, content);
  if (/\.py$/i.test(filePath)) return summarizePythonStructure(content);
  const lines = content.split(/\r?\n/);
  const relevant = lines.map((line, index) => ({ line, index: index + 1 })).filter(item => /^(\s*(export\s+)?(async\s+)?(function|class|interface|type)\b|\s*(import|from)\b|\s*@|\s*(app|router)\.)/.test(item.line)).slice(0, 30);
  const summary = relevant.length ? relevant.map(item => `L${item.index}: ${item.line.trim()}`).join("\n") : content.slice(0, 2200);
  const range = relevant.length ? `L${relevant[0].index}-L${relevant[relevant.length - 1].index}` : `L1-L${Math.min(lines.length, 80)}`;
  return { summary, range };
}

function packageDependencies(content: string) {
  try {
    const manifest = JSON.parse(content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    return Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).slice(0, 25);
  } catch { return []; }
}

async function cloneFallback(parsed: { owner: string; repo: string }, url: string, accessMode: ProjectContext["repositoryAccessMode"]): Promise<RepositoryEvidence> {
  const directory = await mkdtemp(path.join(tmpdir(), "value-fieldbook-audit-"));
  try {
    const token = accessMode === "github_app" ? (await mintCurrentInstallationAccessToken()).token : undefined;
    await git.clone({ fs, http, dir: directory, url: `https://github.com/${parsed.owner}/${parsed.repo}.git`, singleBranch: true, depth: 1, onAuth: () => token ? { username: "x-access-token", password: token } : {} });
    const commits = await git.log({ fs, dir: directory, depth: 20 });
    const candidates: string[] = [];
    const visit = async (relative = "") => {
      if (candidates.length >= 40) return;
      for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
        const child = path.posix.join(relative, entry.name);
        if (IGNORED_PATH.test(child) || candidates.length >= 40) continue;
        if (entry.isDirectory()) await visit(child);
        else if (ELIGIBLE_CODE.test(child) || ["README.md", "package.json", "requirements.txt", "Cargo.toml", "Dockerfile"].includes(entry.name)) candidates.push(child);
      }
    };
    await visit();
    const citations: AuditCitation[] = [];
    const chunks: string[] = [];
    const languages = new Set<string>();
    let dependencies: string[] = [];
    for (const filePath of candidates) {
      const content = (await readFile(path.join(directory, filePath), "utf8")).slice(0, 8000);
      if (filePath === "package.json") dependencies = packageDependencies(content);
      if (ELIGIBLE_CODE.test(filePath)) languages.add(languageFor(filePath));
      const extracted = summarizeSource(filePath, content);
      const reference = `${url.replace(/\.git$/, "")}/blob/HEAD/${filePath}#${extracted.range.replace("-", "-")}`;
      citations.push({ source: "repository", reference, excerpt: extracted.summary.slice(0, 900) });
      chunks.push(`FILE: ${filePath} (${extracted.range})\n${extracted.summary}`);
    }
    const commitTimes = commits.map(commit => commit.commit.author.timestamp).sort((a, b) => a - b);
    const bulkCommitFlag = commitTimes.length >= 10 && (commitTimes[commitTimes.length - 1] - commitTimes[0]) < 1800;
    return { text: chunks.join("\n\n"), citations, limitation: null, summary: { extractionMethod: "LOCAL_SHALLOW_CLONE", totalCommits: commits.length, bulkCommitFlag, filesInspected: candidates.length, primaryLanguages: Array.from(languages), keyDependencies: dependencies } };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function loadRepositoryEvidence(url?: string | null, accessMode: ProjectContext["repositoryAccessMode"] = "public_api"): Promise<RepositoryEvidence> {
  if (!url) return emptyRepositoryEvidence("No repository URL was supplied.");
  const parsed = parseGitHubUrl(url);
  if (!parsed) return emptyRepositoryEvidence("Repository inspection supports GitHub repository URLs only.");
  try {
    const githubRequest = (requestPath: string) => accessMode === "github_app" ? githubInstallationFetch(requestPath) : fetch(`https://api.github.com${requestPath}`, { headers: { accept: "application/vnd.github+json", "user-agent": "Value-Fieldbook-Agent" } });
    const [metadataResponse, commitsResponse, treeResponse] = await Promise.all([
      githubRequest(`/repos/${parsed.owner}/${parsed.repo}`),
      githubRequest(`/repos/${parsed.owner}/${parsed.repo}/commits?per_page=20`),
      githubRequest(`/repos/${parsed.owner}/${parsed.repo}/git/trees/HEAD?recursive=1`),
    ]);
    if ([metadataResponse, commitsResponse, treeResponse].some(response => response.status === 403 || response.status === 429)) return cloneFallback(parsed, url, accessMode);
    if (!metadataResponse.ok || !treeResponse.ok) return emptyRepositoryEvidence(`Repository metadata or file tree could not be retrieved (HTTP ${metadataResponse.status}/${treeResponse.status}).`);
    const metadata = await metadataResponse.json() as { default_branch?: string; html_url?: string };
    const commits = commitsResponse.ok ? await commitsResponse.json() as Array<{ commit?: { author?: { date?: string } } }> : [];
    const tree = await treeResponse.json() as { tree?: Array<{ path?: string; type?: string }> };
    const selected = (tree.tree || []).filter(item => item.type === "blob" && item.path && !IGNORED_PATH.test(item.path) && (ELIGIBLE_CODE.test(item.path) || /(^|\/)(README\.md|package\.json|requirements\.txt|Cargo\.toml|Dockerfile)$/i.test(item.path))).slice(0, 40);
    const citations: AuditCitation[] = [];
    const chunks: string[] = [];
    const languages = new Set<string>();
    let dependencies: string[] = [];
    for (const item of selected) {
      const filePath = item.path!;
      const contentResponse = await githubRequest(`/repos/${parsed.owner}/${parsed.repo}/contents/${filePath.split("/").map(encodeURIComponent).join("/")}`);
      if (!contentResponse.ok) continue;
      const payload = await contentResponse.json() as { content?: string; html_url?: string };
      const content = payload.content ? Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8").slice(0, 8000) : "";
      if (!content) continue;
      if (filePath === "package.json") dependencies = packageDependencies(content);
      if (ELIGIBLE_CODE.test(filePath)) languages.add(languageFor(filePath));
      const extracted = summarizeSource(filePath, content);
      citations.push({ source: "repository", reference: `${payload.html_url || `${metadata.html_url || url}/blob/${metadata.default_branch || "HEAD"}/${filePath}`}#${extracted.range}`, excerpt: extracted.summary.slice(0, 900) });
      chunks.push(`FILE: ${filePath} (${extracted.range})\n${extracted.summary}`);
    }
    const dates = commits.map(commit => commit.commit?.author?.date ? Date.parse(commit.commit.author.date) / 1000 : 0).filter(Boolean).sort((a, b) => a - b);
    const bulkCommitFlag = dates.length >= 10 && (dates[dates.length - 1] - dates[0]) < 1800;
    return { text: chunks.join("\n\n"), citations, limitation: chunks.length ? null : "No eligible source files could be read from the repository.", summary: { extractionMethod: "GITHUB_REST_API", totalCommits: commits.length, bulkCommitFlag, filesInspected: chunks.length, primaryLanguages: Array.from(languages), keyDependencies: dependencies } };
  } catch {
    try { return await cloneFallback(parsed, url, accessMode); }
    catch { return emptyRepositoryEvidence("Repository retrieval and bounded shallow-clone fallback both failed; use human review or attach evidence."); }
  }
}

export async function runHackathonAgent(context: ProjectContext): Promise<AgentAudit & { finalSuggestedScore: number }> {
  const repo = await loadRepositoryEvidence(context.githubUrl, context.repositoryAccessMode);
  const reviewParts: any[] = [{
    type: "text",
    text: [
      `Project: ${context.title}`,
      `Submission description: ${context.description}`,
      `Tech stack: ${(context.techStack || []).join(", ") || "Not supplied"}`,
      `Demo: ${context.demoUrl || "Not supplied"}`,
      `Video: ${context.videoUrl || "Not supplied"}`,
      `Pitch deck: ${context.pitchDeckUrl || "Not supplied"}`,
      `GitHub repository: ${context.githubUrl || "Not supplied"}`,
      `Opportunity baseline: ${context.opportunityContext || "Not supplied"}`,
      `Research context: ${context.researchSummary || "Not supplied"}`,
      `Repository evidence (${context.repositoryAccessMode === "github_app" ? "authorized private GitHub App access" : "public GitHub API"}):\n${repo.text || "Not available"}`,
    ].join("\n\n"),
  }];
  if (context.pitchDeckUrl?.toLowerCase().includes(".pdf")) reviewParts.push({ type: "file_url", file_url: { url: context.pitchDeckUrl, mime_type: "application/pdf" } });
  if (context.videoUrl?.toLowerCase().match(/\.(mp4|mov|webm)(\?|$)/)) reviewParts.push({ type: "file_url", file_url: { url: context.videoUrl, mime_type: "video/mp4" } });
  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content:
          "You are the Hackathon Agent, an evidence-first co-judge. Assess only evidence supplied in the submission, bounded GitHub repository inspection that is either public or explicitly App-authorized, attached deck or video, and approved research context. Do not execute code, fabricate verification, decide legal originality, or determine winners. Produce at most four concise claim records and four concise findings, with stable references such as CLAIM-01. Every verdict and finding requires a cited supplied source. Score each dimension from 0 to 10 as a provisional rubric input and return limitations when evidence is missing.",
      },
      {
        role: "user",
        content: reviewParts,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "hackathon_agent_audit",
        strict: true,
        schema: {
          type: "object",
          properties: {
            technicalScore: { type: "number", minimum: 0, maximum: 10 },
            integrityScore: { type: "number", minimum: 0, maximum: 10 },
            originalityScore: { type: "number", minimum: 0, maximum: 10 },
            pitchFitScore: { type: "number", minimum: 0, maximum: 10 },
            claims: {
              type: "array",
              maxItems: 4,
              items: {
                type: "object",
                properties: {
                  claimReference: { type: "string" },
                  claim: { type: "string" },
                  verdict: { type: "string", enum: ["supported", "unclear", "contradicted"] },
                  rationale: { type: "string" },
                  citations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        source: { type: "string", enum: ["submission", "repository", "research", "deck", "video"] },
                        reference: { type: "string" },
                        excerpt: { type: "string" },
                      },
                      required: ["source", "reference", "excerpt"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["claimReference", "claim", "verdict", "rationale", "citations"],
                additionalProperties: false,
              },
            },
            findings: {
              type: "array",
              maxItems: 4,
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  finding: { type: "string" },
                  severity: { type: "string", enum: ["info", "warning", "review"] },
                  citations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        source: { type: "string", enum: ["submission", "repository", "research", "deck", "video"] },
                        reference: { type: "string" },
                        excerpt: { type: "string" },
                      },
                      required: ["source", "reference", "excerpt"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["category", "finding", "severity", "citations"],
                additionalProperties: false,
              },
            },
            questionsForJudges: { type: "array", maxItems: 5, items: { type: "string" } },
            limitations: { type: "array", maxItems: 5, items: { type: "string" } },
          },
          required: ["technicalScore", "integrityScore", "originalityScore", "pitchFitScore", "claims", "findings", "questionsForJudges", "limitations"],
          additionalProperties: false,
        },
      },
    },
    maxTokens: 4000,
  });

  const audit = JSON.parse(responseText(response.choices[0]?.message.content)) as AgentAudit;
  if (repo.limitation) audit.limitations.push(repo.limitation);
  if (repo.summary.bulkCommitFlag) audit.limitations.push("Commit telemetry shows 10 or more observed commits within a 30-minute window; judges should inspect contribution timing rather than infer intent.");
  if (repo.citations.length) audit.findings.push({ category: "Repository extraction", finding: `${repo.summary.extractionMethod} inspected ${repo.summary.filesInspected} bounded files across ${repo.summary.totalCommits} observed commits.`, severity: "info", citations: repo.citations.slice(0, 5) });
  // Deterministic score calculation. The model provides the four rubric inputs; it does not calculate the final score.
  const finalSuggestedScore = Number((audit.technicalScore * 0.35 + audit.integrityScore * 0.25 + audit.originalityScore * 0.2 + audit.pitchFitScore * 0.2).toFixed(2));
  return { ...audit, finalSuggestedScore };
}
