import { invokeLLM } from "../_core/llm";

type OpportunityInput = {
  title: string;
  problemStatement: string;
  opportunityNarrative?: string | null;
  targetUser?: string | null;
  domain?: string | null;
  assets: Array<{ assetType: string; transcript?: string | null; extraction?: unknown }>;
};

export type OpportunityBrief = {
  title: string;
  problem: string;
  targetUser: string;
  valueHypothesis: string;
  valueMechanisms: string[];
  assumptions: string[];
  evidenceGaps: string[];
  recommendedGate: "shape_value_case" | "research" | "proof_sprint" | "hold";
  gateRationale: string;
};

export type ResearchFinding = {
  title: string;
  url: string;
  excerpt: string;
  relevance: string;
  evidenceCategory: "market" | "customer" | "operating" | "value" | "other";
  assessment: "potentially_similar" | "relevant_precedent" | "possible_differentiator" | "requires_expert_review";
};

export type OpportunityResearchDossier = {
  ideaNarrative: string;
  customerImpact: { audience: string; problem: string; involvement: string; expectedExperienceShift: string };
  marketAcceptance: { signal: "established_demand" | "emerging_signal" | "mixed_signal" | "insufficient_evidence"; narrative: string };
  operatingImpact: { area: string; narrative: string };
  valuePerspective: { primaryCategory: "cost_optimization" | "customer_satisfaction" | "revenue_growth" | "risk_reduction" | "productivity" | "sustainability" | "other"; narrative: string };
  evidenceGaps: string[];
};

export type ResearchResult = {
  summary: string;
  limitations: string;
  dossier: OpportunityResearchDossier;
  sources: ResearchFinding[];
};

export type DocumentExtraction = {
  summary: string;
  keyClaims: string[];
  evidenceGaps: string[];
};

function responseText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map(part => (part && typeof part === "object" && "text" in part ? String((part as { text?: unknown }).text ?? "") : ""))
      .join("\n");
  }
  return "";
}

function opportunityContext(input: OpportunityInput) {
  const evidence = input.assets
    .map(asset => {
      const text = asset.transcript || (asset.extraction ? JSON.stringify(asset.extraction) : "");
      return text ? `[${asset.assetType}] ${text.slice(0, 5000)}` : "";
    })
    .filter(Boolean)
    .join("\n\n");

  return [
    `Title: ${input.title}`,
    `Problem statement: ${input.problemStatement}`,
    `Narrative: ${input.opportunityNarrative || "Not supplied"}`,
    `Target user: ${input.targetUser || "Not supplied"}`,
    `Domain: ${input.domain || "Not supplied"}`,
    evidence ? `Contributor evidence:\n${evidence}` : "Contributor evidence: None supplied",
  ].join("\n");
}

export async function createOpportunityBrief(input: OpportunityInput): Promise<OpportunityBrief> {
  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content:
          "You are the Opportunity Intake Agent for a governed idea-to-investment system. Extract a concise opportunity brief from contributor material. Explain potential value mechanisms and a non-binding next gate. Do not invent metrics, customers, validation, financial outcomes, or investment decisions. Name uncertainty clearly and make the human sponsor the decision owner.",
      },
      { role: "user", content: opportunityContext(input) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "opportunity_brief",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            problem: { type: "string" },
            targetUser: { type: "string" },
            valueHypothesis: { type: "string" },
            valueMechanisms: { type: "array", items: { type: "string" } },
            assumptions: { type: "array", items: { type: "string" } },
            evidenceGaps: { type: "array", items: { type: "string" } },
            recommendedGate: { type: "string", enum: ["shape_value_case", "research", "proof_sprint", "hold"] },
            gateRationale: { type: "string" },
          },
          required: ["title", "problem", "targetUser", "valueHypothesis", "valueMechanisms", "assumptions", "evidenceGaps", "recommendedGate", "gateRationale"],
          additionalProperties: false,
        },
      },
    },
    maxTokens: 1400,
  });

  return JSON.parse(responseText(response.choices[0]?.message.content)) as OpportunityBrief;
}

export async function extractPdfEvidence(fileUrl: string): Promise<DocumentExtraction> {
  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "Extract a concise, factual evidence record from the attached opportunity document. Do not infer validation, financial value, or legal conclusions that are not explicitly present. Separate missing evidence from stated claims.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the opportunity summary, stated claims, and evidence gaps from this PDF." },
          { type: "file_url", file_url: { url: fileUrl, mime_type: "application/pdf" } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "opportunity_document_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            keyClaims: { type: "array", items: { type: "string" } },
            evidenceGaps: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "keyClaims", "evidenceGaps"],
          additionalProperties: false,
        },
      },
    },
    maxTokens: 1800,
  });
  return JSON.parse(responseText(response.choices[0]?.message.content)) as DocumentExtraction;
}

export async function conductOpportunityResearch(input: OpportunityInput, attempt = 0): Promise<ResearchResult> {
  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content:
          "You are the Opportunity Research Agent. Build a concise, decision-grade research dossier from publicly accessible sources. Separate the idea narrative, customer or user impact, market acceptance signals, operating impact, and primary value category. Use only source-backed evidence and say when evidence is insufficient; do not invent customer demand, market size, adoption, savings, revenue, ROI, validation, or numerical outcomes. Cite direct URLs only. Do not make legal, patentability, novelty, infringement, funding, or investment conclusions. Research coverage remains limited and requires human IP, customer, and domain review.",
      },
      {
        role: "user",
        content: attempt === 0
          ? `Research this opportunity and return a rich but concise dossier plus 3 to 6 sourced findings. Classify every source as market, customer, operating, value, or other.\n\n${opportunityContext(input)}`
          : `The previous structured response was incomplete. Return only complete valid JSON matching the required schema. Keep every field concise and return exactly 3 sourced findings. Do not substitute unsourced findings.\n\n${opportunityContext(input)}`,
      },
    ],
    tools: [{ type: "web_search", search_context_size: "medium" }],
    tool_choice: "auto",
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "opportunity_research",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            limitations: { type: "string" },
            dossier: { type: "object", properties: {
              ideaNarrative: { type: "string" },
              customerImpact: { type: "object", properties: { audience: { type: "string" }, problem: { type: "string" }, involvement: { type: "string" }, expectedExperienceShift: { type: "string" } }, required: ["audience", "problem", "involvement", "expectedExperienceShift"], additionalProperties: false },
              marketAcceptance: { type: "object", properties: { signal: { type: "string", enum: ["established_demand", "emerging_signal", "mixed_signal", "insufficient_evidence"] }, narrative: { type: "string" } }, required: ["signal", "narrative"], additionalProperties: false },
              operatingImpact: { type: "object", properties: { area: { type: "string" }, narrative: { type: "string" } }, required: ["area", "narrative"], additionalProperties: false },
              valuePerspective: { type: "object", properties: { primaryCategory: { type: "string", enum: ["cost_optimization", "customer_satisfaction", "revenue_growth", "risk_reduction", "productivity", "sustainability", "other"] }, narrative: { type: "string" } }, required: ["primaryCategory", "narrative"], additionalProperties: false },
              evidenceGaps: { type: "array", maxItems: 6, items: { type: "string" } },
            }, required: ["ideaNarrative", "customerImpact", "marketAcceptance", "operatingImpact", "valuePerspective", "evidenceGaps"], additionalProperties: false },
            sources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  url: { type: "string" },
                  excerpt: { type: "string" },
                  relevance: { type: "string" },
                  evidenceCategory: { type: "string", enum: ["market", "customer", "operating", "value", "other"] },
                  assessment: {
                    type: "string",
                    enum: ["potentially_similar", "relevant_precedent", "possible_differentiator", "requires_expert_review"],
                  },
                },
                required: ["title", "url", "excerpt", "relevance", "evidenceCategory", "assessment"],
                additionalProperties: false,
              },
            },
          },
          required: ["summary", "limitations", "dossier", "sources"],
          additionalProperties: false,
        },
      },
    },
    maxCompletionTokens: attempt === 0 ? 4200 : 2800,
  });

  const content = responseText(response.choices[0]?.message.content).trim();
  try {
    return JSON.parse(content) as ResearchResult;
  } catch (error) {
    if (attempt === 0) return conductOpportunityResearch(input, 1);
    throw new Error("Research returned an incomplete structured response after one retry. No unsourced fallback was created.", { cause: error });
  }
}
