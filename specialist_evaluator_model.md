# Specialist Evaluator Model

## Purpose

The specialist evaluator panel extends the Hackathon Agent from a single evidence-first co-judge into a set of bounded evaluation skills. It is designed to produce comprehensive, criterion-level evidence for the human judging panel and the sponsor’s investment gate. It does not select winners, decide investment, make legal conclusions, or write into the authoritative human scorecard.

## Shared Evidence Packet

Every evaluator receives the same approved packet, created for a specific project and audit version. The packet contains the participant’s submitted narrative; only explicitly authorized repository, deck, demo, and video evidence; cited research; the originating opportunity and sponsor-owned value case; and the Hackathon Agent’s bounded claim audit. The packet omits participant and team identity from the prompt wherever the evaluation criterion does not require it.

The packet has a stable evidence hash and audit identifier. Each evaluator response must reference only packet evidence and must return source citations, confidence, limitations, and a `supported`, `unclear`, or `contradicted` status for every material finding.

| Skill | Evaluation boundary | Permitted outputs | Explicit exclusions |
|---|---|---|---|
| UX/UI | Task clarity, usability, accessibility signals, responsive-design evidence, and design consistency | Usability findings, accessibility risks, task-flow questions, confidence | It does not infer user satisfaction, invent test results, or rate aesthetics as business value. |
| Cloud architecture | Deployment topology, resilience, observability, data boundaries, and operational suitability | Architecture findings, missing control evidence, operational questions | It does not certify production readiness or claim penetration testing. |
| Security | Authorization, validation, secret handling, dependency and configuration evidence, auditability, and privacy boundaries | Evidence-backed risks, remediation questions, severity labels, confidence | It does not claim a vulnerability was exploited or offer a legal/compliance determination. |
| Development quality | Code structure, test signals, API contracts, maintainability, static evidence, and contribution telemetry | Technical quality findings, test gaps, maintainability questions, confidence | It does not execute code or infer developer ability from identity. |
| Value and feasibility | Alignment to opportunity assumptions, proof design, measurable indicators, and next-test readiness | Assumption-to-evidence map, unresolved conditions, suggested next test, gate rationale | It does not invent economics, approve funding, or replace sponsor judgment. |

## Output Contract

Each specialist evaluator returns a versioned `SpecialistEvaluation` record with the following fields.

```ts
type SpecialistEvaluation = {
  skill: "ux_ui" | "cloud_architecture" | "security" | "development_quality" | "value_feasibility";
  version: string;
  auditId: number;
  evidenceHash: string;
  provisionalScore: number; // 0–10, non-binding and criterion-local
  findings: Array<{
    reference: string;
    criterion: string;
    status: "supported" | "unclear" | "contradicted";
    finding: string;
    confidence: "low" | "medium" | "high";
    citations: Array<{ source: string; reference: string; excerpt: string }>;
    limitations: string[];
  }>;
  questionsForHumanJudge: string[];
  limitations: string[];
};
```

The specialist score is displayed as a **provisional input only**. It never changes the deterministic human leaderboard calculation. Human judges can accept, challenge, override, request secondary review, or disregard individual findings with a recorded rationale.

## Anti-Bias and Governance Controls

The application must remove participant/team names from evaluator prompts unless a criterion requires identity; use a predefined rubric before review begins; keep skills criterion-bound; prohibit unsupported conclusions; require citations for every material claim; display evidence limitations; record model, skill version, prompt-policy version, and evidence hash; and expose a participant challenge path at a claim level.

The human scorecard remains independent from specialist scores. The final ranking is calculated only from finalized human rubric items. The sponsor retains the final investment-gate decision even after a project receives a high human hackathon score.

## Lifecycle Integration

| Lifecycle stage | Specialist-evaluator role | Human control |
|---|---|---|
| Opportunity | Value and feasibility frames assumptions and missing evidence | Sponsor owns economics and gate. |
| Proof-sprint configuration | UX/UI, cloud, security, and development skills translate rubric intent into review questions | Organizer selects skills and rubric visibility. |
| Submission | Skills assess only the approved packet and return cited, non-binding findings | Participants may challenge a finding. |
| Judging | Judge Desk groups findings by rubric criterion and preserves disagreement | Assigned humans score, recuse, override, and request secondary review. |
| Realization | Value and feasibility compares proof evidence with sponsor assumptions and indicators | Sponsor decides whether to defer, run another proof, or advance investment. |

## Implementation Sequence

1. Persist evaluator configuration, evidence hash, status, version, and findings for every skill execution.
2. Build one shared, identity-redacted evidence-packet service and use it for every skill.
3. Run skills through the existing durable queue; each skill becomes an idempotent child job of an approved Hackathon Agent audit.
4. Render grouped skill findings in the Judge Desk and permit claim-level challenge/override without modifying human scorecards.
5. Add the Value and Feasibility summary to the Value Fieldbook cockpit so proof evidence visibly updates the sponsor’s decision context.
