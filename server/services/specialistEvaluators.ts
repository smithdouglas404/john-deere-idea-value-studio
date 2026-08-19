import { createHash } from "node:crypto";
import { invokeLLM, listLLMModels } from "../_core/llm";

export const specialistSkills = ["ux_ui", "cloud_architecture", "security", "development_quality", "value_feasibility"] as const;
export type SpecialistSkill = (typeof specialistSkills)[number];

export type SpecialistFinding = {
  reference: string;
  criterion: string;
  status: "supported" | "unclear" | "contradicted";
  finding: string;
  confidence: "low" | "medium" | "high";
  citations: Array<{ source: string; reference: string; excerpt: string }>;
  limitations: string[];
};

export type SpecialistEvaluationResult = {
  provisionalScore: number | null;
  findings: SpecialistFinding[];
  questionsForHumanJudge: string[];
  limitations: string[];
};

export type SharedEvidencePacketInput = {
  project: { title: string; description: string; techStack?: string[] | null; githubUrl?: string | null; demoUrl?: string | null; videoUrl?: string | null; pitchDeckUrl?: string | null };
  auditReport: Record<string, unknown>;
  opportunity?: { problemStatement?: string | null; valueCaseNarrative?: string | null; economicAssumptions?: string[] | null; investmentGate?: string | null } | null;
  researchSummary?: string | null;
  projectDocuments?: Array<{ id: number; originalName: string; mimeType: string; extraction?: Record<string, unknown> | null }>;
};

export type SharedEvidencePacket = { text: string; evidenceHash: string; policyVersion: string };

export function shouldReuseSpecialistEvaluation(existing: { status: string; evidenceHash: string } | undefined, packetHash: string) {
  return existing?.status === "processing" || existing?.status === "queued" || (existing?.status === "complete" && existing.evidenceHash === packetHash);
}

export function evidencePacketFreshness(packetHash: string, evaluations: Array<{ skill: string; status: string; evidenceHash: string }>, synthesis: { evidenceHash: string } | null) {
  const staleSkills = evaluations.filter(item => item.status === "complete" && item.evidenceHash !== packetHash).map(item => item.skill);
  return { currentEvidenceHash: packetHash, staleSkills, synthesisStale: Boolean(synthesis && synthesis.evidenceHash !== packetHash) };
}

export const specialistSkillInstructions: Record<SpecialistSkill, string> = {
  ux_ui: "Assess only usability evidence, accessibility signals, task clarity, responsive-design clues, and design consistency. Do not infer user satisfaction or rate subjective aesthetics as business value.",
  cloud_architecture: "Assess only architecture, deployment boundaries, resilience, observability, configuration, and operational fit shown in the packet. Do not certify production readiness.",
  security: "Assess only authorization, validation, secret handling, dependency/configuration evidence, auditability, and privacy boundaries. Do not claim exploitation, penetration testing, legal compliance, or a security certification.",
  development_quality: "Assess only code structure, test signals, API contracts, static-analysis evidence, maintainability, and bounded contribution telemetry. Do not execute code or infer developer ability from identities.",
  value_feasibility: "Assess only alignment to the selected opportunity, sponsor-recorded assumptions, proof design, measurable indicators, and next-test readiness. Do not invent economics, approve funding, or replace sponsor judgment.",
};

export function specialistSystemPolicy(skill: SpecialistSkill, retry: boolean) {
  return `You are the ${skill} specialist in an evidence-bounded hackathon review panel. ${specialistSkillInstructions[skill]} Review only the identity-redacted shared packet. Your outputs are non-binding and cannot determine a winner. Every material finding needs one supplied citation. Produce at most two concise findings, one citation per finding, at most two human questions, and at most three limitations. Keep every string concise enough to return complete valid JSON.${retry ? " This is one retry after incomplete JSON. Return only the required JSON schema object." : ""}`;
}

function contentText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(part => (part && typeof part === "object" && "text" in part ? String((part as { text?: unknown }).text || "") : "")).join("\n");
  return "";
}

export function parseSpecialistResult(output: string): SpecialistEvaluationResult {
  const trimmed = output.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(trimmed) as Record<string, unknown>;
  if (typeof parsed.provisionalScore === "number" && Array.isArray(parsed.findings)) return parsed as unknown as SpecialistEvaluationResult;
  const legacyFindings = Array.isArray(parsed.findings) ? parsed.findings : [];
  const globalLimitations = Array.isArray(parsed.limitations) ? parsed.limitations.flatMap(item => typeof item === "string" ? [item] : item && typeof item === "object" && "limitation" in item ? [String((item as { limitation: unknown }).limitation)] : []) : [];
  return {
    provisionalScore: null,
    findings: legacyFindings.flatMap((item, index) => {
      if (!item || typeof item !== "object") return [];
      const finding = item as Record<string, unknown>;
      const citation = finding.citation && typeof finding.citation === "object" ? finding.citation as Record<string, unknown> : null;
      if (!citation) return [];
      return [{
        reference: String(finding.id || `CLAUDE-F${index + 1}`),
        criterion: String(finding.category || "Evidence review"),
        status: finding.severity === "blocker" ? "contradicted" : "unclear",
        finding: String(finding.finding || "No finding text returned."),
        confidence: "low",
        citations: [{ source: String(citation.source || "supplied evidence"), reference: String(citation.claimReference || citation.reference || `CLAUDE-F${index + 1}`), excerpt: String(citation.excerpt || "Citation excerpt was not supplied.") }],
        limitations: globalLimitations.slice(0, 2),
      }];
    }),
    questionsForHumanJudge: Array.isArray(parsed.questions_for_team) ? parsed.questions_for_team.flatMap(item => item && typeof item === "object" && "question" in item ? [String((item as { question: unknown }).question)] : []).slice(0, 2) : [],
    limitations: globalLimitations.slice(0, 3),
  };
}

export function buildSharedEvidencePacket(input: SharedEvidencePacketInput): SharedEvidencePacket {
  // Team and participant identity deliberately do not enter this packet.
  const packet = {
    policy: "specialist-evidence-packet-v1",
    project: input.project,
    opportunity: input.opportunity ? { problemStatement: input.opportunity.problemStatement, valueCaseNarrative: input.opportunity.valueCaseNarrative, economicAssumptions: input.opportunity.economicAssumptions || [], investmentGate: input.opportunity.investmentGate } : null,
    researchSummary: input.researchSummary || null,
    projectDocuments: (input.projectDocuments || []).map(document => ({ id: document.id, originalName: document.originalName, mimeType: document.mimeType, extractedText: typeof document.extraction?.text === "string" ? document.extraction.text.slice(0, 12000) : null, extractionMethod: document.extraction?.method || null })),
    hackathonAgentEvidence: input.auditReport,
  };
  const text = JSON.stringify(packet, null, 2);
  return { text, evidenceHash: createHash("sha256").update(text).digest("hex"), policyVersion: "specialist-evidence-packet-v1" };
}

const responseSchema = {
  type: "json_schema" as const,
  json_schema: {
    name: "specialist_evaluation",
    strict: true,
    schema: {
      type: "object",
      properties: {
        provisionalScore: { type: "number", minimum: 0, maximum: 10 },
        findings: { type: "array", maxItems: 2, items: { type: "object", properties: {
          reference: { type: "string" }, criterion: { type: "string" }, status: { type: "string", enum: ["supported", "unclear", "contradicted"] }, finding: { type: "string" }, confidence: { type: "string", enum: ["low", "medium", "high"] },
          citations: { type: "array", minItems: 1, maxItems: 1, items: { type: "object", properties: { source: { type: "string" }, reference: { type: "string" }, excerpt: { type: "string" } }, required: ["source", "reference", "excerpt"], additionalProperties: false } },
          limitations: { type: "array", maxItems: 2, items: { type: "string" } },
        }, required: ["reference", "criterion", "status", "finding", "confidence", "citations", "limitations"], additionalProperties: false } },
        questionsForHumanJudge: { type: "array", maxItems: 2, items: { type: "string" } },
        limitations: { type: "array", maxItems: 3, items: { type: "string" } },
      },
      required: ["provisionalScore", "findings", "questionsForHumanJudge", "limitations"],
      additionalProperties: false,
    },
  },
};

export async function runSpecialistEvaluator(skill: SpecialistSkill, packet: SharedEvidencePacket): Promise<SpecialistEvaluationResult> {
  const { data: models } = await listLLMModels();
  const model = models.find(item => item.id === "claude-sonnet-4-6")?.id || models.find(item => item.id.startsWith("claude-"))?.id || "gpt-5";
  const invokeCompactReview = async (retry: boolean) => {
    const response = await invokeLLM({
      model,
      messages: [
        { role: "system", content: specialistSystemPolicy(skill, retry) },
        { role: "user", content: packet.text },
      ],
      response_format: responseSchema,
      ...(model.startsWith("claude-") ? { thinking: { type: "enabled", budget_tokens: 1024 }, maxTokens: 2600 } : { reasoning: { effort: "medium" }, maxCompletionTokens: 1800 }),
    });
    return parseSpecialistResult(contentText(response.choices[0]?.message.content));
  };

  try {
    return await invokeCompactReview(false);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return invokeCompactReview(true);
  }
}
