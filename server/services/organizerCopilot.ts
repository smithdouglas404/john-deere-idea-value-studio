import { invokeLLM } from "../_core/llm";

export type OrganizerCopilotDraft = {
  tracks: Array<{ title: string; description: string; sourceLabels: string[] }>;
  rubric: Array<{ title: string; description: string; evaluationMethod: string; suggestedWeight: number; sourceLabels: string[] }>;
  requiredEvidence: Array<{ item: string; sourceLabels: string[] }>;
  proofQuestions: Array<{ question: string; sourceLabels: string[] }>;
  limitations: string[];
};

export type OrganizerCopilotEvidence = {
  opportunity: { title: string; problemStatement: string; opportunityNarrative?: string | null; valueCaseNarrative?: string | null; evidenceGaps?: string[] | null };
  research: { summary?: string | null; limitations?: string | null; dossier?: Record<string, unknown> | null } | null;
};

const sourceLabelSchema = { type: "string", enum: ["opportunity brief", "cited research", "evidence gap", "sponsor context"] };
const responseFormat = {
  type: "json_schema" as const,
  json_schema: {
    name: "organizer_copilot_draft",
    strict: true,
    schema: {
      type: "object",
      properties: {
        tracks: { type: "array", minItems: 1, maxItems: 3, items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, sourceLabels: { type: "array", minItems: 1, maxItems: 3, items: sourceLabelSchema } }, required: ["title", "description", "sourceLabels"], additionalProperties: false } },
        rubric: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, evaluationMethod: { type: "string" }, suggestedWeight: { type: "number", minimum: 1, maximum: 100 }, sourceLabels: { type: "array", minItems: 1, maxItems: 3, items: sourceLabelSchema } }, required: ["title", "description", "evaluationMethod", "suggestedWeight", "sourceLabels"], additionalProperties: false } },
        requiredEvidence: { type: "array", minItems: 2, maxItems: 6, items: { type: "object", properties: { item: { type: "string" }, sourceLabels: { type: "array", minItems: 1, maxItems: 3, items: sourceLabelSchema } }, required: ["item", "sourceLabels"], additionalProperties: false } },
        proofQuestions: { type: "array", minItems: 2, maxItems: 5, items: { type: "object", properties: { question: { type: "string" }, sourceLabels: { type: "array", minItems: 1, maxItems: 3, items: sourceLabelSchema } }, required: ["question", "sourceLabels"], additionalProperties: false } },
        limitations: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } },
      },
      required: ["tracks", "rubric", "requiredEvidence", "proofQuestions", "limitations"],
      additionalProperties: false,
    },
  },
};

function contentText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(part => (part && typeof part === "object" && "text" in part ? String((part as { text?: unknown }).text || "") : "")).join("\n");
  return "";
}

export const organizerCopilotPolicy = "You are an evidence-bounded organizer copilot. Draft a compact proof-sprint configuration from only the supplied opportunity and research packet. The output is advisory and starts unadopted. Do not create, copy, calculate, or mention sponsor economics or ROI. Do not select winners, finalists, investments, or human decisions. Do not invent facts, customers, validation results, or citations. Label each item with the supplied evidence category that supports it. Include limitations where evidence is absent or unverified. Return only the required JSON.";

export async function draftEventConfigurationFromEvidence(evidence: OrganizerCopilotEvidence): Promise<OrganizerCopilotDraft> {
  const response = await invokeLLM({
    model: "gpt-5-mini",
    maxCompletionTokens: 2200,
    response_format: responseFormat,
    messages: [
      { role: "system", content: organizerCopilotPolicy },
      { role: "user", content: JSON.stringify({
        policy: "organizer-copilot-evidence-v1",
        opportunityBrief: {
          title: evidence.opportunity.title,
          problemStatement: evidence.opportunity.problemStatement,
          narrative: evidence.opportunity.opportunityNarrative || null,
          sponsorContextNarrative: evidence.opportunity.valueCaseNarrative || null,
          evidenceGaps: evidence.opportunity.evidenceGaps || [],
        },
        citedResearch: evidence.research ? { summary: evidence.research.summary || null, limitations: evidence.research.limitations || null, dossier: evidence.research.dossier || null } : null,
      }, null, 2) },
    ],
  });
  const raw = contentText(response.choices[0]?.message.content).trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(raw) as OrganizerCopilotDraft;
}
