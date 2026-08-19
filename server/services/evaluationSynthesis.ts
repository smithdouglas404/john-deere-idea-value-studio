import { invokeLLM, listLLMModels } from "../_core/llm";
import type { SharedEvidencePacket, SpecialistEvaluationResult } from "./specialistEvaluators";

export type EvaluationSynthesisResult = {
  preliminaryRecommendation: "advance_with_conditions" | "needs_more_evidence" | "rework_before_review";
  decisionRationale: string;
  multiModalProofReview: Array<{ modality: "repository_code" | "live_demo" | "video" | "pitch_deck" | "technical_document"; available: boolean; requirementCoverage: "linkable" | "unavailable"; evidence: string; nextRequest: string; references: string[] }>;
  evidenceGraph: Array<{ claim: string; support: "supported" | "partial" | "missing"; sourceCount: number; references: string[] }>;
  crossSkillDeliberation: Array<{ topic: string; agreement: string; conflict: string; uncertainty: string; evidenceNeeded: string; references: string[] }>;
  marketChallenge: Array<{ dimension: "novelty" | "alternatives" | "adoption" | "customer_value"; assessment: string; evidenceStatus: "supported" | "partial" | "missing"; nextTest: string; references: string[] }>;
  valueCaseStressTest: Array<{ assumption: string; condition: string; consequence: string; evidenceNeeded: string; references: string[] }>;
  requirementTrace: Array<{ requirement: string; evidenceStatus: "supported" | "partial" | "missing"; references: string[]; nextValidation: string }>;
  marketRealityCheck: Array<{ question: string; groundedAssessment: string; references: string[]; limitation: string }>;
  deliveryRisks: Array<{ risk: string; impact: "high" | "medium" | "low"; mitigation: string; references: string[] }>;
  teamActions: Array<{ priority: "now" | "next" | "later"; action: string; why: string; references: string[] }>;
  innovationOpportunities: Array<{ opportunity: string; test: string; references: string[] }>;
  humanQuestions: string[];
  limitations: string[];
};

const synthesisSchema = {
  type: "json_schema" as const,
  json_schema: {
    name: "evidence_grounded_evaluation_synthesis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        preliminaryRecommendation: { type: "string", enum: ["advance_with_conditions", "needs_more_evidence", "rework_before_review"] },
        decisionRationale: { type: "string", maxLength: 900 },
        multiModalProofReview: { type: "array", maxItems: 5, items: { type: "object", properties: { modality: { type: "string", enum: ["repository_code", "live_demo", "video", "pitch_deck", "technical_document"] }, available: { type: "boolean" }, requirementCoverage: { type: "string", enum: ["linkable", "unavailable"] }, evidence: { type: "string", maxLength: 320 }, nextRequest: { type: "string", maxLength: 280 }, references: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 180 } } }, required: ["modality", "available", "requirementCoverage", "evidence", "nextRequest", "references"], additionalProperties: false } },
        evidenceGraph: { type: "array", maxItems: 5, items: { type: "object", properties: { claim: { type: "string", maxLength: 280 }, support: { type: "string", enum: ["supported", "partial", "missing"] }, sourceCount: { type: "integer", minimum: 0, maximum: 20 }, references: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", maxLength: 180 } } }, required: ["claim", "support", "sourceCount", "references"], additionalProperties: false } },
        crossSkillDeliberation: { type: "array", maxItems: 4, items: { type: "object", properties: { topic: { type: "string", maxLength: 240 }, agreement: { type: "string", maxLength: 380 }, conflict: { type: "string", maxLength: 380 }, uncertainty: { type: "string", maxLength: 280 }, evidenceNeeded: { type: "string", maxLength: 280 }, references: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", maxLength: 180 } } }, required: ["topic", "agreement", "conflict", "uncertainty", "evidenceNeeded", "references"], additionalProperties: false } },
        marketChallenge: { type: "array", maxItems: 4, items: { type: "object", properties: { dimension: { type: "string", enum: ["novelty", "alternatives", "adoption", "customer_value"] }, assessment: { type: "string", maxLength: 480 }, evidenceStatus: { type: "string", enum: ["supported", "partial", "missing"] }, nextTest: { type: "string", maxLength: 280 }, references: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", maxLength: 180 } } }, required: ["dimension", "assessment", "evidenceStatus", "nextTest", "references"], additionalProperties: false } },
        valueCaseStressTest: { type: "array", maxItems: 4, items: { type: "object", properties: { assumption: { type: "string", maxLength: 240 }, condition: { type: "string", maxLength: 260 }, consequence: { type: "string", maxLength: 300 }, evidenceNeeded: { type: "string", maxLength: 280 }, references: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", maxLength: 180 } } }, required: ["assumption", "condition", "consequence", "evidenceNeeded", "references"], additionalProperties: false } },
        requirementTrace: { type: "array", maxItems: 4, items: { type: "object", properties: { requirement: { type: "string", maxLength: 220 }, evidenceStatus: { type: "string", enum: ["supported", "partial", "missing"] }, references: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 180 } }, nextValidation: { type: "string", maxLength: 320 } }, required: ["requirement", "evidenceStatus", "references", "nextValidation"], additionalProperties: false } },
        marketRealityCheck: { type: "array", maxItems: 3, items: { type: "object", properties: { question: { type: "string", maxLength: 220 }, groundedAssessment: { type: "string", maxLength: 500 }, references: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 180 } }, limitation: { type: "string", maxLength: 260 } }, required: ["question", "groundedAssessment", "references", "limitation"], additionalProperties: false } },
        deliveryRisks: { type: "array", maxItems: 4, items: { type: "object", properties: { risk: { type: "string", maxLength: 280 }, impact: { type: "string", enum: ["high", "medium", "low"] }, mitigation: { type: "string", maxLength: 320 }, references: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 180 } } }, required: ["risk", "impact", "mitigation", "references"], additionalProperties: false } },
        teamActions: { type: "array", maxItems: 4, items: { type: "object", properties: { priority: { type: "string", enum: ["now", "next", "later"] }, action: { type: "string", maxLength: 280 }, why: { type: "string", maxLength: 380 }, references: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 180 } } }, required: ["priority", "action", "why", "references"], additionalProperties: false } },
        innovationOpportunities: { type: "array", maxItems: 3, items: { type: "object", properties: { opportunity: { type: "string", maxLength: 280 }, test: { type: "string", maxLength: 320 }, references: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 180 } } }, required: ["opportunity", "test", "references"], additionalProperties: false } },
        humanQuestions: { type: "array", maxItems: 4, items: { type: "string", maxLength: 280 } },
        limitations: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", maxLength: 280 } },
      },
      required: ["preliminaryRecommendation", "decisionRationale", "multiModalProofReview", "evidenceGraph", "crossSkillDeliberation", "marketChallenge", "valueCaseStressTest", "requirementTrace", "marketRealityCheck", "deliveryRisks", "teamActions", "innovationOpportunities", "humanQuestions", "limitations"],
      additionalProperties: false,
    },
  },
};

export function buildSynthesisPrompt(packet: SharedEvidencePacket, specialistResults: Array<{ skill: string; result: SpecialistEvaluationResult }>) {
  return JSON.stringify({
    policy: "evidence-synthesis-v1",
    sharedEvidencePacket: JSON.parse(packet.text),
    specialistResults: specialistResults.map(item => ({ skill: item.skill, result: item.result })),
  }, null, 2);
}

export function synthesisSystemPolicy() {
  return "You are the evidence-synthesis lead for a John Deere innovation proof review. Use only supplied evidence, citations, and specialist outputs. Reconcile requirements, architecture, code-quality, security, UX, proof evidence, sponsor assumptions, and cited market research. Produce a preliminary non-binding recommendation and actionable team guidance; it cannot choose a winner, approve investment, overwrite a human scorecard, or invent market facts or economics. First perform a multi-modal proof review that states whether authorized repository/code, live demo, video, pitch deck, and technical document evidence is present and whether explicit authorized requirement anchors make the artifact linkable for inspection; do not claim that an artifact meets a requirement unless a supplied citation establishes it. Then build an evidence graph that traces claims to supplied references, cross-skill deliberation that distinguishes agreement from conflict and uncertainty, a market challenge across novelty, alternatives, adoption, and customer value, and a value-case stress test that challenges supplied assumptions without fabricating economics. Every trace, challenge, risk, action, and innovation opportunity needs at least one supplied reference. Treat missing evidence as missing, not a negative claim. State limitations clearly. Human judges retain all final authority.";
}

function contentText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(part => (part && typeof part === "object" && "text" in part ? String((part as { text?: unknown }).text || "") : "")).join("\n");
  return "";
}

function parseSynthesisResult(output: string): EvaluationSynthesisResult {
  const cleaned = output.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const firstObject = cleaned.indexOf("{");
  const lastObject = cleaned.lastIndexOf("}");
  if (firstObject < 0 || lastObject <= firstObject) throw new SyntaxError("Claude did not return a JSON synthesis object.");
  return JSON.parse(cleaned.slice(firstObject, lastObject + 1)) as EvaluationSynthesisResult;
}

function citedReferences(finding: SpecialistEvaluationResult["findings"][number]) {
  return finding.citations.map(citation => `${citation.source}: ${citation.reference}`).slice(0, 3);
}

export function buildDeterministicEvidenceSynthesis(packet: SharedEvidencePacket, specialistResults: Array<{ skill: string; result: SpecialistEvaluationResult }>): EvaluationSynthesisResult {
  const source = JSON.parse(packet.text) as { project?: { description?: string | null; githubUrl?: string | null; demoUrl?: string | null; videoUrl?: string | null; pitchDeckUrl?: string | null }; projectDocuments?: Array<{ originalName: string; extractedText?: string | null }>; opportunity?: { problemStatement?: string | null; valueCaseNarrative?: string | null; economicAssumptions?: string[] } | null; researchSummary?: string | null };
  const findings = specialistResults.flatMap(item => item.result.findings.map(finding => ({ skill: item.skill, finding })));
  const evidenceGraph = findings.slice(0, 5).map(({ finding }) => ({ claim: finding.finding, support: finding.status === "supported" ? "supported" as const : finding.status === "contradicted" ? "partial" as const : "missing" as const, sourceCount: finding.citations.length, references: citedReferences(finding) }));
  const crossSkillDeliberation = specialistResults.slice(0, 4).map(({ skill, result }) => ({ topic: skill.replace(/_/g, " "), agreement: result.findings.length ? `This specialist returned ${result.findings.length} cited finding(s).` : "No cited finding was returned by this specialist.", conflict: "No automatic consensus is inferred; a human reviewer compares the cited findings.", uncertainty: result.limitations.join(" · ") || "The specialist did not state a limitation.", evidenceNeeded: result.questionsForHumanJudge[0] || "Inspect the cited packet and determine the next evidence request.", references: result.findings.flatMap(citedReferences).slice(0, 3).length ? result.findings.flatMap(citedReferences).slice(0, 3) : [`${skill}: no cited finding`] }));
  const researchPresent = Boolean(source.researchSummary?.trim());
  const marketChallenge = (["novelty", "alternatives", "adoption", "customer_value"] as const).map(dimension => ({ dimension, assessment: researchPresent ? "A cited market-research record is present in the authorized packet; its source limitations still require human inspection." : "No cited market-research record is present in the authorized packet.", evidenceStatus: researchPresent ? "partial" as const : "missing" as const, nextTest: researchPresent ? "Compare the submission claim with the cited research record and document the unresolved assumption." : "Add source-backed market research before making a market assertion.", references: [researchPresent ? "Authorized market research summary" : "No authorized market research summary"] }));
  const assumptions = source.opportunity?.economicAssumptions?.filter(Boolean) || [];
  const valueCaseStressTest = (assumptions.length ? assumptions : ["No sponsor-recorded economic assumption supplied"]).slice(0, 4).map((assumption, index) => ({ assumption, condition: "The assumption remains sponsor-owned and must be tested by observed proof evidence.", consequence: "The preliminary recommendation cannot treat the assumption as a confirmed value outcome.", evidenceNeeded: "Record the metric, measurement method, boundary, and proof result needed to validate or revise this assumption.", references: [assumptions.length ? `Sponsor assumption ${index + 1}` : "Opportunity record"] }));
  const modalities = [
    ["repository_code", Boolean(source.project?.githubUrl), "Repository URL", "Provide an authorized repository or attach code evidence."],
    ["live_demo", Boolean(source.project?.demoUrl), "Live demo URL", "Provide a live demo URL or a captured walkthrough."],
    ["video", Boolean(source.project?.videoUrl), "Video URL", "Provide a short recorded proof walkthrough."],
    ["pitch_deck", Boolean(source.project?.pitchDeckUrl), "Pitch deck URL", "Provide a pitch deck that links claims to proof evidence."],
    ["technical_document", Boolean(source.projectDocuments?.length), "Authorized project documents", "Upload a consented BRD, architecture, API, or technical document."],
  ] as const;
  const requirementAnchors = [source.opportunity?.problemStatement, source.opportunity?.valueCaseNarrative, source.project?.description, ...(source.projectDocuments || []).flatMap(document => document.extractedText ? [document.extractedText] : [])].flatMap(value => String(value || "").split(/[\n.!?]/).map(part => part.trim()).filter(part => /\b(must|shall|should|require|acceptance|objective|problem|need)\b/i.test(part) && part.length > 16)).slice(0, 3);
  const requirementCoverage = requirementAnchors.length ? "linkable" as const : "unavailable" as const;
  const multiModalProofReview = modalities.map(([modality, available, reference, nextRequest]) => ({ modality, available, requirementCoverage, evidence: available ? `${reference} is present in the authorized proof packet.${requirementAnchors.length ? ` ${requirementAnchors.length} authorized requirement anchor${requirementAnchors.length === 1 ? " is" : "s are"} available for inspection.` : " No explicit authorized requirement anchor is available yet."}` : `${reference} is not present in the authorized proof packet.`, nextRequest: available ? requirementAnchors.length ? "Inspect this supplied artifact against the listed authorized requirement anchors and record any limitation." : "Add an explicit BRD, acceptance criterion, or problem requirement before interpreting this artifact as proof." : nextRequest, references: [reference, ...(requirementAnchors.length ? ["Authorized requirement anchor"] : [])] }));
  const limitations = specialistResults.flatMap(item => item.result.limitations.map(limitation => `${item.skill.replace(/_/g, " ")}: ${limitation}`)).slice(0, 4);
  return { preliminaryRecommendation: "needs_more_evidence", decisionRationale: "This is a deterministic aggregation of completed cited specialist findings because a new model synthesis was unavailable. It does not create a winner selection, investment decision, or new factual claim.", multiModalProofReview, evidenceGraph, crossSkillDeliberation, marketChallenge, valueCaseStressTest, requirementTrace: findings.slice(0, 4).map(({ finding }) => ({ requirement: finding.criterion, evidenceStatus: finding.status === "supported" ? "supported" as const : "partial" as const, references: citedReferences(finding), nextValidation: finding.limitations[0] || "Inspect the cited evidence with a human reviewer." })), marketRealityCheck: marketChallenge.slice(0, 3).map(item => ({ question: item.dimension.replace(/_/g, " "), groundedAssessment: item.assessment, references: item.references, limitation: item.evidenceStatus === "missing" ? "No cited market record is available." : "Review source limits before relying on this assessment." })), deliveryRisks: limitations.map(limitation => ({ risk: limitation, impact: "medium" as const, mitigation: "Supply the cited missing evidence and have a human reviewer reassess it.", references: ["Specialist limitation"] })), teamActions: findings.filter(item => item.finding.status !== "supported").slice(0, 4).map(({ finding }) => ({ priority: "now" as const, action: finding.limitations[0] || "Address the cited specialist finding with new evidence.", why: finding.finding, references: citedReferences(finding) })), innovationOpportunities: [], humanQuestions: specialistResults.flatMap(item => item.result.questionsForHumanJudge).slice(0, 4), limitations: limitations.length ? limitations : ["No specialist limitation was available for aggregation."] };
}

export async function preferredSynthesisModel() {
  const { data } = await listLLMModels();
  return data.find(model => model.id === "gpt-5")?.id || data.find(model => model.id.startsWith("gpt-5"))?.id || data.find(model => model.id.startsWith("claude-"))?.id || "gpt-5-mini";
}

export async function runEvaluationSynthesis(packet: SharedEvidencePacket, specialistResults: Array<{ skill: string; result: SpecialistEvaluationResult }>) {
  const model = await preferredSynthesisModel();
  const invoke = async (retry: boolean) => {
    const response = await invokeLLM({
      model,
      messages: [
        { role: "system", content: `${synthesisSystemPolicy()}${retry ? " Your first response was not usable JSON. Return only one JSON object that conforms exactly to the supplied schema, with no Markdown heading, prose, or code fence." : " Return only the structured JSON object required by the schema; do not add Markdown or explanatory prose."}` },
        { role: "user", content: buildSynthesisPrompt(packet, specialistResults) },
      ],
      response_format: synthesisSchema,
      ...(model.startsWith("claude-") ? { thinking: { type: "enabled", budget_tokens: 2048 }, maxTokens: 5000 } : { reasoning: { effort: "high" }, maxCompletionTokens: 5000 }),
    });
    return parseSynthesisResult(contentText(response.choices[0]?.message.content));
  };
  try {
    return { model, result: await invoke(false) };
  } catch (error) {
    if (error instanceof SyntaxError) return { model, result: await invoke(true) };
    if (error instanceof Error && /usage exhausted|412 Precondition Failed/i.test(error.message)) return { model: "deterministic-evidence-aggregation", result: buildDeterministicEvidenceSynthesis(packet, specialistResults) };
    throw error;
  }
}
