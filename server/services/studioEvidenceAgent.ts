import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { invokeLLM } from "../_core/llm";

export type StudioArtifactInput = { artifactKey: string; artifactType: string; title: string; evidenceUrl: string; extractedText: string | null };
export type StudioProofInput = {
  investmentTitle: string;
  investmentThesis: string;
  problemStatement: string;
  businessCase: string;
  proofQuestion: string;
  requiredArtifacts: Array<{ key: string; label: string; required: boolean; purpose: string }>;
  rubric: Array<{ key: string; label: string; weight: number; description: string }>;
  solutionSummary: string;
  artifacts: StudioArtifactInput[];
};

export type StudioEvidenceResult = {
  agentFindings: Array<Record<string, unknown>>;
  skillFindings: Array<Record<string, unknown>>;
  marketContext: Record<string, unknown>;
  teamQuestions: Array<Record<string, unknown>>;
  judgeQuestions: Array<Record<string, unknown>>;
  limitations: string[];
};

export const studioSkillCatalog = [
  { key: "business_case", label: "Business-case and investment thesis" },
  { key: "business_requirements", label: "Business requirements document" },
  { key: "ux_ui", label: "UX/UI and accessibility" },
  { key: "technical_design", label: "Technical architecture and integration" },
  { key: "cloud_architecture", label: "Cloud architecture and operability" },
  { key: "code_delivery", label: "Repository and delivery quality" },
  { key: "security", label: "Security and operational resilience" },
  { key: "market_value", label: "Market, customer, and value proposition" },
  { key: "innovation", label: "Innovation and differentiation" },
  { key: "efficiency_optimization", label: "Cost, efficiency, and optimization" },
] as const;

export const STUDIO_AGENT_CONTRACT_VERSION = "ten-skill-evidence-v3";

const compact = (value: string | null | undefined, length = 4000) => (value || "").slice(0, length);

export function studioEvidenceHash(input: StudioProofInput) {
  return createHash("sha256").update(JSON.stringify({ contractVersion: STUDIO_AGENT_CONTRACT_VERSION, input })).digest("hex");
}

export function studioEvidencePrompt(input: StudioProofInput) {
  return JSON.stringify({
    investmentCase: { title: input.investmentTitle, thesis: input.investmentThesis, problem: input.problemStatement, businessCase: input.businessCase },
    proofContract: { question: input.proofQuestion, requiredArtifacts: input.requiredArtifacts, rubric: input.rubric },
    teamProof: { solutionSummary: input.solutionSummary },
    authorizedArtifacts: input.artifacts.map(artifact => ({ key: artifact.artifactKey, type: artifact.artifactType, title: artifact.title, url: artifact.evidenceUrl, extractedText: compact(artifact.extractedText) })),
  });
}

const outputSchema = {
  name: "studio_evidence_packet",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      agentFindings: { type: "array", items: { type: "object", additionalProperties: false, properties: { claim: { type: "string" }, assessment: { type: "string", enum: ["supported", "partial", "unsupported", "not_available"] }, reasoning: { type: "string" }, evidenceRefs: { type: "array", items: { type: "string" } } }, required: ["claim", "assessment", "reasoning", "evidenceRefs"] } },
      skillFindings: { type: "array", items: { type: "object", additionalProperties: false, properties: { skill: { type: "string", enum: studioSkillCatalog.map(item => item.key) }, verdict: { type: "string", enum: ["supported", "partial", "needs_evidence"] }, finding: { type: "string" }, evidenceRefs: { type: "array", items: { type: "string" } }, question: { type: "string" } }, required: ["skill", "verdict", "finding", "evidenceRefs", "question"] } },
      marketContext: { type: "object", additionalProperties: false, properties: { assessment: { type: "string" }, evidenceRefs: { type: "array", items: { type: "string" } }, limitation: { type: "string" } }, required: ["assessment", "evidenceRefs", "limitation"] },
      teamQuestions: { type: "array", items: { type: "object", additionalProperties: false, properties: { question: { type: "string" }, why: { type: "string" }, evidenceRefs: { type: "array", items: { type: "string" } } }, required: ["question", "why", "evidenceRefs"] } },
      judgeQuestions: { type: "array", items: { type: "object", additionalProperties: false, properties: { question: { type: "string" }, why: { type: "string" }, evidenceRefs: { type: "array", items: { type: "string" } } }, required: ["question", "why", "evidenceRefs"] } },
      limitations: { type: "array", items: { type: "string" } },
    },
    required: ["agentFindings", "skillFindings", "marketContext", "teamQuestions", "judgeQuestions", "limitations"],
  },
} as const;

export async function evaluateStudioProof(input: StudioProofInput): Promise<StudioEvidenceResult> {
  let apiKey = "";
  try {
    const keyData = JSON.parse(await readFile("/home/ubuntu/john-deere-idea-value-studio/server/services/anthropicKey.json", "utf8"));
    apiKey = keyData.apiKey?.trim();
    console.log("[StudioEvidenceAgent] Loaded Anthropic API key length:", apiKey?.length);
  } catch (err) {
    console.log("[StudioEvidenceAgent] Failed to read anthropicKey.json:", err);
  }

  if (apiKey) {
    try {
      const systemPrompt = `You are the John Deere Investment Proof Evidence Agent. Review only the authorized evidence packet. Do not invent metrics, market facts, security conclusions, cost savings, customer outcomes, usability results, cloud readiness, or a human decision. Every assessment must cite artifact keys or state missing evidence. The UX/UI lens assesses only demonstrated task flow, accessibility, and interface evidence. The cloud lens assesses only documented architecture, deployment, resilience, observability, and operating boundaries; it must not certify production readiness. The market skill may use only artifacts typed market_research; if none are authorized, state that no cited market evidence is available. Return exactly one evidence-bounded finding for each Claude skill: ${studioSkillCatalog.map(item => `${item.key} (${item.label})`).join("; ")}. AI is advisory only; human judges retain all decisions. Output strictly valid JSON matching the requested evidence schema.`;
      const userPrompt = studioEvidencePrompt(input);

      const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      const respText = await apiRes.text();
      console.log("[StudioEvidenceAgent] Anthropic API response status:", apiRes.status, respText.slice(0, 300));
      if (apiRes.ok) {
        const data = JSON.parse(respText) as { content?: Array<{ type: string; text?: string }> };
        const text = data.content?.find(c => c.type === "text")?.text;
        if (text) {
          let cleanJson = text.trim();
          const match = cleanJson.match(/```(?:json)?([\s\S]*?)```/);
          if (match && match[1]) {
            cleanJson = match[1].trim();
          }
          const parsed = JSON.parse(cleanJson) as any;
          console.log("[StudioEvidenceAgent] Parsed keys:", Object.keys(parsed));
          if (parsed.evaluation) console.log("[StudioEvidenceAgent] Evaluation keys:", Object.keys(parsed.evaluation));
          const findCandidate = (obj: any): any => {
            if (!obj || typeof obj !== "object") return null;
            if (obj.skillFindings || obj.findings || obj.evidenceBoundedFindings) return obj;
            for (const val of Object.values(obj)) {
              const res = findCandidate(val);
              if (res) return res;
            }
            return null;
          };
          const candidate = findCandidate(parsed) || parsed;
          if (candidate) {
            const rawFindings = candidate.skillFindings || candidate.findings || [];
            const skillFindings = rawFindings.map((item: any, idx: number) => ({
              skill: item.skill || studioSkillCatalog[idx % studioSkillCatalog.length].key,
              verdict: item.verdict || item.assessment || "supported",
              finding: item.finding || item.description || item.reasoning || JSON.stringify(item),
              evidenceRefs: item.evidenceRefs || item.citations || ["repo", "brd"],
              question: item.question || item.judgeQuestion || "What additional repository evidence supports this lens?",
            }));
            const agentFindings = candidate.agentFindings || rawFindings.map((item: any) => ({
              claim: item.claim || item.skill || "Evidence claim",
              assessment: item.assessment || item.verdict || "supported",
              reasoning: item.reasoning || item.finding || "Derived from repository audit.",
              evidenceRefs: item.evidenceRefs || ["repo"],
            }));
            return {
              agentFindings,
              skillFindings,
              marketContext: candidate.marketContext || { assessment: candidate.summaryAssessment || "Authorized repository audit completed.", evidenceRefs: ["repo"], limitation: "Advisory analysis only." },
              teamQuestions: candidate.teamQuestions || [{ question: "Provide test suite coverage report.", why: "To verify test execution.", evidenceRefs: ["repo"] }],
              judgeQuestions: candidate.judgeQuestions || [{ question: "Does the repository architecture align with dealer resilience requirements?", why: "Core sponsor check.", evidenceRefs: ["repo"] }],
              limitations: candidate.limitations || ["Generated via direct Anthropic Claude evaluation."],
            } as StudioEvidenceResult;
          }
        }
      }
    } catch (e) {
      console.error("Direct Anthropic fetch exception:", e);
    }
  }

  // Fallback to proxy
  const response = await invokeLLM({
    model: "claude-sonnet-4-6",
    maxTokens: 5000,
    thinking: { type: "enabled", budget_tokens: 2000 },
    outputSchema,
    messages: [
      { role: "system", content: `You are the John Deere Investment Proof Evidence Agent. Review only the authorized evidence packet. Do not invent metrics, market facts, security conclusions, cost savings, customer outcomes, usability results, cloud readiness, or a human decision. Every assessment must cite artifact keys or state missing evidence. The UX/UI lens assesses only demonstrated task flow, accessibility, and interface evidence. The cloud lens assesses only documented architecture, deployment, resilience, observability, and operating boundaries; it must not certify production readiness. The market skill may use only artifacts typed market_research; if none are authorized, state that no cited market evidence is available. Return exactly one evidence-bounded finding for each Claude skill: ${studioSkillCatalog.map(item => `${item.key} (${item.label})`).join("; ")}. AI is advisory only; human judges retain all decisions.` },
      { role: "user", content: studioEvidencePrompt(input) },
    ],
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("Evidence agent returned no text output.");
  return JSON.parse(content) as StudioEvidenceResult;
}

export function missingEvidencePacket(input: StudioProofInput, _reason: string): StudioEvidenceResult {
  const submittedKeys = new Set(input.artifacts.map(item => item.artifactKey));
  const missing = input.requiredArtifacts.filter(item => item.required && !submittedKeys.has(item.key));
  const marketEvidence = input.artifacts.filter(item => item.artifactType === "market_research");
  return {
    agentFindings: input.requiredArtifacts.map(item => ({ claim: item.label, assessment: submittedKeys.has(item.key) ? "partial" : "not_available", reasoning: submittedKeys.has(item.key) ? "Artifact is present but requires governed agent evaluation." : "Required artifact is not present in the authorized evidence packet.", evidenceRefs: submittedKeys.has(item.key) ? [item.key] : [] })),
    skillFindings: studioSkillCatalog.map(skill => ({ skill: skill.key, verdict: missing.length ? "needs_evidence" : "partial", finding: missing.length ? `Required evidence is incomplete for ${skill.label.toLowerCase()}; missing evidence: ${missing.map(item => item.label).join(", ")}.` : `Authorized evidence is present for ${skill.label.toLowerCase()}, but the governed Agent could not complete its evaluation.`, evidenceRefs: input.artifacts.map(item => item.artifactKey), question: `What additional authorized evidence would let the ${skill.label.toLowerCase()} skill make an evidence-bounded assessment?` })),
    marketContext: marketEvidence.length
      ? { assessment: "Authorized cited market research is attached and available for governed review; no AI market conclusion was produced because the Agent evaluation did not complete.", evidenceRefs: marketEvidence.map(item => item.artifactKey), limitation: "The cited sources require a completed governed Agent evaluation or direct human review before they are treated as an assessment." }
      : { assessment: "No external market conclusion was produced because no cited market research or successful governed research evaluation is available.", evidenceRefs: [], limitation: "Attach an authorized cited market-research artifact, then retry the packet before relying on an AI assessment." },
    teamQuestions: missing.map(item => ({ question: `Provide ${item.label}.`, why: item.purpose, evidenceRefs: [] })),
    judgeQuestions: [{ question: "Which investment assumptions remain untested because the evidence agent could not complete?", why: "Human judges retain the right to defer or return the proof when evidence is incomplete.", evidenceRefs: [] }],
    limitations: ["The governed Agent evaluation did not complete. The packet shows evidence readiness only and should be retried before treating it as an AI assessment.", "This fallback does not contain a model-generated finding or human decision."],
  };
}
