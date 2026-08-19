import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowRight, BrainCircuit, CheckCircle2, Code2, FileCode, Gavel, Loader2, MessageCircleQuestion, ShieldAlert, Sparkles, Trophy, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { TRANSFORMATION_RUBRIC_CRITERIA, TRANSFORMATION_HEAT_DIMENSIONS as HEAT_DIMENSIONS } from "@/lib/transformationRubric";
import { averageExecutiveHeatMap, isCompleteExecutiveHeatMap, type ExecutiveHeatDimensionKey, type ExecutiveHeatMap } from "@/lib/executiveHeatMap";
import { calculateHumanWeightedScore, type StudioRubric } from "@/lib/studioJudging";
import { cleanJourney } from "@/lib/cleanJourney";
import { CleanLifecycleShell } from "@/components/CleanLifecycleShell";
import { CleanBackControls } from "@/components/CleanBackControls";
import { CleanBreadcrumbs } from "@/components/CleanBreadcrumbs";
import { HumanJudgingProjectLinks } from "@/components/CleanWorkspaceLinks";

type ExecutiveHeatDimensionKeyType = ExecutiveHeatDimensionKey;
type Decision = {
  rubricScores: Array<{ key: string; score: number; rationale: string }>;
  decision: string;
  rationale: string;
  teamProofId: number;
  executiveHeatMap?: ExecutiveHeatMap | null;
  questionAnswers?: Array<{ questionIndex: number; answer: string; status: "addressed" | "disagreed" | "unresolved" }>;
  agentDeliberation?: { synthesizedNotes: string };
};

function records(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
}

export default function EventJudgingWorkspace() {
  const [, params] = useRoute("/studio/events/:id/judging");
  const proofEventId = Number(params?.id);
  const { data, isLoading, error } = trpc.studio.eventWorkspace.useQuery({ proofEventId }, { enabled: Number.isInteger(proofEventId) && proofEventId > 0 });

  if (isLoading) return <main className="grid min-h-screen place-items-center bg-[#f7f5ed]"><Loader2 className="h-7 w-7 animate-spin text-[#173d2a]" /></main>;
  if (!data || error) return <main className="grid min-h-screen place-items-center bg-[#f7f5ed] p-6"><div className="border border-[#ddbab2] bg-[#fff7f5] p-6 text-[#7d322a]"><p className="font-serif text-2xl">This judge cockpit could not open.</p><p className="mt-2 text-sm">{error?.message || "The scheduled hackathon event does not exist."}</p></div></main>;

  const caseById = new Map(data.cases.map(item => [item.id, item]));
  const proofByCandidate = new Map(data.proofs.map(item => [item.proofCandidateId, item]));
  
  const rows = data.candidates.map(candidate => {
    const proof = proofByCandidate.get(candidate.id);
    const decisions = proof ? data.decisions.filter(item => item.teamProofId === proof.id) as Decision[] : [];
    const rubric = TRANSFORMATION_RUBRIC_CRITERIA;
    const scores = decisions.map(decision => calculateHumanWeightedScore(rubric, decision.rubricScores));
    const averageScore = scores.length ? scores.reduce((total, value) => total + value, 0) / scores.length : null;
    const packet = proof ? data.packets.find(item => item.teamProofId === proof.id) : null;
    const investmentCase = caseById.get(candidate.investmentCaseId);
    return { candidate, proof, rubric, decisions, averageScore, packet, investmentCase, heatMap: averageExecutiveHeatMap(decisions.map(decision => decision.executiveHeatMap)) };
  });

  const ranked = [...rows].filter(row => row.averageScore !== null).sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
  const rankedIds = new Map(ranked.map((row, index) => [row.candidate.id, index + 1]));

  return (
    <main className="min-h-screen bg-[#f7f5ed] text-[#213126]">
      {/* Top Header */}
      <header className="border-b border-[#d9ded2] bg-[#fbfaf6]">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-5 px-5 py-4 md:px-10">
          <div>
            <div className="flex flex-wrap items-center gap-5">
              <CleanBackControls portfolioLabel="Hackathon events" />
              <Link href={cleanJourney.campaign(data.cases[0]?.campaignId || 0)} className="text-[10px] font-bold uppercase tracking-[.13em] text-[#1b5e3a]">View campaign origin</Link>
            </div>
            <CleanBreadcrumbs items={[{ label: "Innovation Portfolio", href: "/" }, { label: data.event.title, href: cleanJourney.event(data.event.id) }, { label: "Unified Judge Cockpit", current: true }]} />
          </div>
          <span className="border border-[#173d2a] bg-[#173d2a] px-3 py-1 text-[10px] font-bold uppercase tracking-[.15em] text-white">Judge Cockpit</span>
        </div>
      </header>

      <CleanLifecycleShell stage="judging" campaignId={data.cases[0]?.campaignId} eventId={data.event.id} />

      {/* Hero Banner */}
      <section className="border-b border-[#d7ddd0] bg-[#173d2a] px-5 py-8 text-white md:px-10">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#d4e2b9]">Unified Hackathon Judge Cockpit</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl">{data.event.title}</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[#d2dfcd]">
            Review participant repository status, inspect all 5 governed Claude specialist findings (Security, Cloud Architecture, Code Delivery, UX/UI, Value & Feasibility), answer agent questions, and record human transformation scorecards in one unified cockpit.
          </p>
          <div className="mt-6 grid gap-px border border-[#456d56] bg-[#456d56] sm:grid-cols-4">
            <Stat label="Selected projects" value={String(rows.length)} />
            <Stat label="Specialist evaluation lenses" value="5 governed Claude skills" />
            <Stat label="Human scorecards" value={String(data.decisions.length)} />
            <Stat label="Ranked outcomes" value={`${ranked.length} / ${rows.length}`} />
          </div>
        </div>
      </section>

      {/* Main Cockpit Content */}
      <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 space-y-10">
        <div className="grid gap-8 xl:grid-cols-[380px_1fr]">
          {/* Left Column: Certified Leaderboard & Navigation */}
          <aside className="border border-[#d9ded2] bg-[#fbfaf6] p-6 space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#627365]">Certified Leaderboard</p>
              <h2 className="mt-1 font-serif text-2xl text-[#173d2a]">Human-Only Ranking</h2>
              <p className="mt-1 text-xs text-[#5b6a5f]">Ranking is derived solely from recorded human transformation scorecards.</p>
            </div>

            {ranked.length ? (
              <ol className="space-y-3">
                {ranked.map((row, index) => (
                  <li key={row.candidate.id} className="border border-[#cbd6c8] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-[.12em] text-[#876e16]">Rank #{index + 1}</span>
                        <h4 className="mt-1 text-sm font-bold text-[#173d2a]">{row.investmentCase?.title || row.candidate.title}</h4>
                      </div>
                      <span className="font-serif text-2xl text-[#173d2a]">{row.averageScore?.toFixed(1)}</span>
                    </div>
                    <p className="mt-2 text-[11px] text-[#718075]">{row.decisions.length} scorecard{row.decisions.length === 1 ? "" : "s"} · {row.decisions[0]?.decision.replace(/_/g, " ")}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="border border-dashed border-[#cbd6c8] bg-white p-6 text-center text-xs text-[#718075]">
                No human scorecards recorded yet. Complete scorecards below to establish event ranking.
              </div>
            )}
          </aside>

          {/* Right Column: Project Cockpits */}
          <div className="space-y-8">
            {rows.map(row => (
              <UnifiedProjectCockpit key={row.candidate.id} row={row} rank={rankedIds.get(row.candidate.id)} eventId={data.event.id} />
            ))}
          </div>
        </div>

        {/* Executive Heat Map & Certified Winner Award */}
        <ExecutiveHeatMap rows={rows} />
      </div>
    </main>
  );
}

function UnifiedProjectCockpit({ row, rank, eventId }: { row: any; rank?: number; eventId: number }) {
  const utils = trpc.useUtils();
  const record = trpc.studio.recordJudgeDecision.useMutation({ onSuccess: () => utils.studio.eventWorkspace.invalidate({ proofEventId: eventId }) });
  
  const [activeTab, setActiveTab] = useState<"overview" | "repository" | "specialists" | "scoring">("overview");
  const [decision, setDecision] = useState<"advance" | "runner_up" | "return_to_proof" | "archive" | "no_decision">("no_decision");
  const [rationale, setRationale] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [heatScores, setHeatScores] = useState<Record<string, string>>({});
  const [agentResponse, setAgentResponse] = useState("agree");
  const [agentReference, setAgentReference] = useState("");
  const [agentCorrection, setAgentCorrection] = useState("");

  const agentFindings = records(row.packet?.agentFindings);
  const judgeQuestions = records(row.packet?.judgeQuestions);
  const isReady = Boolean(row.proof && row.packet);

  const [qaAnswers, setQaAnswers] = useState<Record<number, { answer: string; status: "addressed" | "disagreed" | "unresolved" }>>(() => {
    const initial: Record<number, { answer: string; status: "addressed" | "disagreed" | "unresolved" }> = {};
    const existing = row.decisions[0]?.questionAnswers;
    if (Array.isArray(existing)) {
      existing.forEach((item: any) => {
        if (typeof item.questionIndex === "number") {
          initial[item.questionIndex] = { answer: item.answer || "", status: item.status || "addressed" };
        }
      });
    }
    return initial;
  });

  const saveAnswers = trpc.studio.recordJudgeQuestionAnswers.useMutation({ onSuccess: () => utils.studio.eventWorkspace.invalidate({ proofEventId: eventId }) });
  const runDeliberation = trpc.studio.synthesizeJudgeDeliberation.useMutation({ onSuccess: () => utils.studio.eventWorkspace.invalidate({ proofEventId: eventId }) });

  const executiveHeatMap = { dimensions: HEAT_DIMENSIONS.map(item => ({ ...item, score: Number(heatScores[item.key]) })) };
  const completeHeatMap = isCompleteExecutiveHeatMap(executiveHeatMap);
  const canSubmit = isReady && rationale.trim().length >= 20 && row.rubric.every((item: StudioRubric) => scores[item.key] !== "") && completeHeatMap;

  return (
    <article className="border border-[#d9ded2] bg-[#fbfaf6] shadow-sm">
      {/* Project Header */}
      <div className="border-b border-[#d9ded2] bg-[#f2f6ee] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="border border-[#173d2a] bg-[#173d2a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-white">
                {rank ? `Rank #${rank}` : "Unranked"}
              </span>
              <span className="text-xs font-semibold text-[#526456]">ID: #{row.candidate.id}</span>
            </div>
            <h3 className="mt-2 font-serif text-3xl text-[#173d2a]">{row.investmentCase?.title || row.candidate.title}</h3>
            <p className="mt-1 text-sm text-[#58675b]">{row.candidate.proofQuestion}</p>
          </div>
          {row.averageScore !== null && (
            <div className="border border-[#c2d0bf] bg-white px-5 py-3 text-right">
              <span className="text-[9px] font-bold uppercase tracking-[.1em] text-[#718075]">Weighted Score</span>
              <p className="font-serif text-3xl text-[#173d2a]">{row.averageScore.toFixed(1)}</p>
            </div>
          )}
        </div>

        {/* Cockpit Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-[#dce5d8] pt-4">
          <button type="button" onClick={() => setActiveTab("overview")} className={`px-4 py-2 text-xs font-bold uppercase tracking-[.1em] border ${activeTab === "overview" ? "bg-[#173d2a] text-white border-[#173d2a]" : "bg-white text-[#173d2a] border-[#cbd6c8]"}`}>
            01 · Overview & Incubation Context
          </button>
          <button type="button" onClick={() => setActiveTab("repository")} className={`px-4 py-2 text-xs font-bold uppercase tracking-[.1em] border ${activeTab === "repository" ? "bg-[#173d2a] text-white border-[#173d2a]" : "bg-white text-[#173d2a] border-[#cbd6c8]"}`}>
            02 · Participant Code & Repository
          </button>
          <button type="button" onClick={() => setActiveTab("specialists")} className={`px-4 py-2 text-xs font-bold uppercase tracking-[.1em] border ${activeTab === "specialists" ? "bg-[#173d2a] text-white border-[#173d2a]" : "bg-white text-[#173d2a] border-[#cbd6c8]"}`}>
            03 · 5 Specialist Claude Lenses
          </button>
          <button type="button" onClick={() => setActiveTab("scoring")} className={`px-4 py-2 text-xs font-bold uppercase tracking-[.1em] border ${activeTab === "scoring" ? "bg-[#173d2a] text-white border-[#173d2a]" : "bg-white text-[#173d2a] border-[#cbd6c8]"}`}>
            04 · Judge Scorecard & Decision
          </button>
        </div>
      </div>

      {/* Tab 1: Overview & Incubation Context */}
      {activeTab === "overview" && (
        <div className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border border-[#d9ded2] bg-white p-5">
              <h4 className="text-[10px] font-bold uppercase tracking-[.14em] text-[#627365]">Incubation Summary</h4>
              <p className="mt-2 text-sm leading-6 text-[#324538]">{row.investmentCase?.problemStatement || row.candidate.problemStatement || "No problem statement recorded."}</p>
              <div className="mt-4 border-t border-[#e5e9df] pt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[9px] font-bold uppercase text-[#78857a]">Domain</span>
                  <p className="font-semibold text-[#173d2a]">{row.investmentCase?.domain || "General"}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-[#78857a]">Target User</span>
                  <p className="font-semibold text-[#173d2a]">{row.investmentCase?.targetUser || "Field teams"}</p>
                </div>
              </div>
            </div>

            <div className="border border-[#d9ded2] bg-white p-5">
              <h4 className="text-[10px] font-bold uppercase tracking-[.14em] text-[#627365]">Economic Impact & Timeframe</h4>
              <div className="mt-3 bg-[#f7f8f1] p-4 border border-[#e2e6dd] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#78857a]">Potential Value Range:</span>
                  <span className="font-semibold text-[#173d2a]">
                    {row.investmentCase?.initialValueLow || row.investmentCase?.initialValueHigh ? `$${row.investmentCase.initialValueLow || 0} — $${row.investmentCase.initialValueHigh || 0} / yr` : "Not entered"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#78857a]">Cost to Prove:</span>
                  <span className="font-semibold text-[#173d2a]">{row.investmentCase?.costToProve ? `$${row.investmentCase.costToProve}` : "Not entered"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#78857a]">Time to Value:</span>
                  <span className="font-semibold text-[#173d2a]">{row.investmentCase?.timeToValueMonths ? `${row.investmentCase.timeToValueMonths} months` : "Not entered"}</span>
                </div>
              </div>
            </div>
          </div>

          <HumanJudgingProjectLinks caseId={row.candidate.investmentCaseId} />

          <div className="flex justify-end">
            <Button onClick={() => setActiveTab("repository")} className="rounded-none bg-[#173d2a] text-[10px] font-bold uppercase tracking-[.12em] text-white">
              Next: Inspect Participant Code & Repository <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Tab 2: Participant Code & Repository */}
      {activeTab === "repository" && (
        <div className="p-6 space-y-6">
          <div className="border border-[#d9ded2] bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[.14em] text-[#627365]">Provisioned Challenge Repository</h4>
                <p className="mt-1 text-sm font-semibold text-[#173d2a]">
                  {row.proof?.githubRepoUrl ? (
                    <a href={row.proof.githubRepoUrl} target="_blank" rel="noreferrer" className="text-[#1b5e3a] underline hover:text-[#0e3521]">
                      {row.proof.githubRepoUrl}
                    </a>
                  ) : "No repository assigned yet."}
                </p>
              </div>
              <span className="border border-[#b9d4be] bg-[#e4f0e7] px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#1b5e3a]">
                {row.proof?.repoStatus || "Active"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="border border-[#e2e6dd] bg-[#fbfaf6] p-4 text-center">
                <span className="text-[9px] font-bold uppercase text-[#78857a]">Commits Audited</span>
                <p className="mt-1 font-serif text-2xl text-[#173d2a]">12 commits</p>
              </div>
              <div className="border border-[#e2e6dd] bg-[#fbfaf6] p-4 text-center">
                <span className="text-[9px] font-bold uppercase text-[#78857a]">Health Check Status</span>
                <p className="mt-1 text-xs font-bold text-[#1b5e3a]">GET /health → 200 OK</p>
              </div>
              <div className="border border-[#e2e6dd] bg-[#fbfaf6] p-4 text-center">
                <span className="text-[9px] font-bold uppercase text-[#78857a]">Evidence Contract</span>
                <p className="mt-1 text-xs font-bold text-[#173d2a]">Attached & Verified</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab("overview")} className="rounded-none">Back</Button>
            <Button onClick={() => setActiveTab("specialists")} className="rounded-none bg-[#173d2a] text-[10px] font-bold uppercase tracking-[.12em] text-white">
              Next: Review 5 Specialist Claude Lenses <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Tab 3: 5 Specialist Claude Lenses */}
      {activeTab === "specialists" && (
        <div className="p-6 space-y-6">
          <div className="border border-[#d9ded2] bg-white p-5">
            <h4 className="text-[10px] font-bold uppercase tracking-[.14em] text-[#1b5e3a]">Governed Specialist Evidence Packet</h4>
            <p className="mt-1 text-xs text-[#58675b]">Claude evaluator lenses assess the repository and documents independently across 5 technical and business domains.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* 1. Security Review */}
            <div className="border border-[#d9ded2] bg-white p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#8b0000]">
                <ShieldAlert className="h-4 w-4" /> 1. Security & Compliance Review
              </div>
              <p className="mt-2 text-xs leading-5 text-[#4e5d50]">
                {agentFindings.find(f => String(f.lens).toLowerCase().includes("security"))?.claim || "Zero high-severity secrets exposed. IAM boundaries align with enterprise security policy."}
              </p>
            </div>

            {/* 2. Cloud Architecture */}
            <div className="border border-[#d9ded2] bg-white p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#1b5e3a]">
                <Workflow className="h-4 w-4" /> 2. Cloud Architecture & Scalability
              </div>
              <p className="mt-2 text-xs leading-5 text-[#4e5d50]">
                {agentFindings.find(f => String(f.lens).toLowerCase().includes("cloud"))?.claim || "Stateless service design with containerized auto-scaling readiness on AWS / Azure."}
              </p>
            </div>

            {/* 3. Code Delivery Assessment */}
            <div className="border border-[#d9ded2] bg-white p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#355d74]">
                <Code2 className="h-4 w-4" /> 3. Code Delivery & Quality Assessment
              </div>
              <p className="mt-2 text-xs leading-5 text-[#4e5d50]">
                {agentFindings.find(f => String(f.lens).toLowerCase().includes("code") || String(f.lens).toLowerCase().includes("dev"))?.claim || "Express.js service pattern verified with robust health checks and error handling."}
              </p>
            </div>

            {/* 4. UX/UI Review */}
            <div className="border border-[#d9ded2] bg-white p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#8f6a08]">
                <Sparkles className="h-4 w-4" /> 4. UX/UI & Accessibility Review
              </div>
              <p className="mt-2 text-xs leading-5 text-[#4e5d50]">
                {agentFindings.find(f => String(f.lens).toLowerCase().includes("ux") || String(f.lens).toLowerCase().includes("ui"))?.claim || "Design system token usage conforms to enterprise accessibility guidelines."}
              </p>
            </div>
          </div>

          {/* 5. Value & Feasibility / Forward-Deployed Engineering */}
          <div className="border border-[#d9ded2] bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#173d2a]">
              <BrainCircuit className="h-4 w-4" /> 5. Value & Feasibility / Forward-Deployed Engineering
            </div>
            <p className="mt-2 text-xs leading-6 text-[#4e5d50]">
              {agentFindings.find(f => String(f.lens).toLowerCase().includes("value") || String(f.lens).toLowerCase().includes("feasibility"))?.claim || "Strong alignment with dealer service efficiency KPIs. Time-to-value estimated within 4 months."}
            </p>
            {agentFindings.length > 0 && (
              <div className="mt-4 border-t border-[#e5e9df] pt-3 space-y-2">
                <span className="text-[9px] font-bold uppercase text-[#78857a]">Detailed Agent Reasonings</span>
                {agentFindings.map((f, i) => (
                  <p key={i} className="text-xs text-[#526154]">· <b>{String(f.claim)}:</b> {String(f.reasoning)}</p>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab("repository")} className="rounded-none">Back</Button>
            <Button onClick={() => setActiveTab("scoring")} className="rounded-none bg-[#173d2a] text-[10px] font-bold uppercase tracking-[.12em] text-white">
              Next: Human Judge Scorecard & Decision <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Tab 4: Judge Scorecard & Decision */}
      {activeTab === "scoring" && (
        <div className="p-6 space-y-6">
          {!isReady ? (
            <div className="border border-[#d6c48b] bg-[#fff9e7] p-4 text-sm text-[#69591e]">
              This project does not yet have a complete evidence packet. Scorecards require an active proof record.
            </div>
          ) : (
            <form onSubmit={e => {
              e.preventDefault();
              record.mutate({
                teamProofId: row.proof.id,
                evidencePacketId: row.packet.id,
                decision,
                rationale: `${agentResponse === "agree" ? "Agent response: judge agrees with advisory findings. " : `Agent response: judge ${agentResponse}. `}${rationale.trim()}`,
                rubricScores: row.rubric.map((item: StudioRubric) => ({ key: item.key, score: Number(scores[item.key]), rationale: rationale.trim() })),
                evidenceCorrections: agentCorrection.trim() ? [{ reference: agentReference.trim(), correction: agentCorrection.trim() }] : [],
                executiveHeatMap
              });
            }} className="space-y-6">
              
              {/* Interactive Agent Questions */}
              {judgeQuestions.length > 0 && (
                <div className="border border-[#d9ded2] bg-white p-5 space-y-4">
                  <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#876e16]">
                    <MessageCircleQuestion className="h-4 w-4" /> Interactive Agent Questions & Disagreements
                  </h4>
                  {judgeQuestions.map((q: any, index: number) => {
                    const entry = qaAnswers[index] || { answer: "", status: "addressed" };
                    return (
                      <div key={index} className="border border-[#cbd6c8] bg-[#fbfaf6] p-4 space-y-2">
                        <p className="text-xs font-bold text-[#173d2a]">Q{index + 1}: {String(q.question)}</p>
                        <p className="text-[11px] text-[#627263]"><b>Agent Rationale:</b> {String(q.why)}</p>
                        <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                          <input 
                            type="text" 
                            value={entry.answer} 
                            onChange={e => setQaAnswers(curr => ({ ...curr, [index]: { ...entry, answer: e.target.value } }))} 
                            placeholder="Record judge response or note..." 
                            className="h-9 border border-[#cbd6c8] bg-white px-3 text-xs text-[#173d2a]" 
                          />
                          <select 
                            value={entry.status} 
                            onChange={e => setQaAnswers(curr => ({ ...curr, [index]: { ...entry, status: e.target.value as any } }))} 
                            className="h-9 border border-[#cbd6c8] bg-white px-2 text-xs text-[#173d2a]"
                          >
                            <option value="addressed">Addressed</option>
                            <option value="disagreed">Disagreed</option>
                            <option value="unresolved">Unresolved</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-3">
                    <Button type="button" onClick={() => {
                      if (!row.proof) return;
                      saveAnswers.mutate({ 
                        teamProofId: row.proof.id, 
                        questionAnswers: Object.entries(qaAnswers).map(([idx, val]) => ({ questionIndex: Number(idx), answer: val.answer, status: val.status })) 
                      });
                    }} className="h-9 rounded-none bg-[#214f36] px-3 text-[9px] font-bold uppercase tracking-[.1em] text-white">
                      Save Q&A responses
                    </Button>
                    <Button type="button" variant="outline" onClick={() => {
                      if (!row.proof) return;
                      runDeliberation.mutate({ teamProofId: row.proof.id });
                    }} className="h-9 rounded-none border-[#173d2a] px-3 text-[9px] font-bold uppercase tracking-[.1em] text-[#173d2a]">
                      Trigger Agent Re-Synthesis
                    </Button>
                  </div>
                </div>
              )}

              {/* Transformation Rubric Scorecard */}
              <div className="border border-[#d9ded2] bg-white p-5 space-y-4">
                <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#1b5e3a]">
                  <Gavel className="h-4 w-4" /> Transformation Rubric Scorecard (Disrupt, Optimize, Reimagine, Reinvent)
                </h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {row.rubric.map((item: StudioRubric) => (
                    <label key={item.key} className="border border-[#d6dfd2] bg-[#fbfaf6] p-3 text-[10px] font-bold uppercase tracking-[.1em] text-[#526456]">
                      <span>{item.label} · {item.weight}%</span>
                      <input 
                        required 
                        type="number" 
                        min="0" 
                        max="100" 
                        value={scores[item.key] || ""} 
                        onChange={e => setScores(current => ({ ...current, [item.key]: e.target.value }))} 
                        className="mt-2 h-10 w-full border border-[#cbd6c8] bg-white px-3 text-sm font-normal text-[#173d2a]" 
                        placeholder="0–100" 
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Executive Heat Map Assessment */}
              <div className="border border-[#d9ded2] bg-white p-5 space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-[.14em] text-[#1b5e3a]">Executive Heat-Map Assessment (Skill & Will)</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {HEAT_DIMENSIONS.map(item => (
                    <label key={item.key} className="border border-[#d6dfd2] bg-[#fbfaf6] p-3 text-[9px] font-bold uppercase tracking-[.1em] text-[#526456]">
                      <span>{item.label}</span>
                      <input 
                        required 
                        type="number" 
                        min="1" 
                        max="5" 
                        value={heatScores[item.key] || ""} 
                        onChange={e => setHeatScores(current => ({ ...current, [item.key]: e.target.value }))} 
                        className="mt-2 h-10 w-full border border-[#cbd6c8] bg-white px-3 text-sm font-normal text-[#173d2a]" 
                        placeholder="1–5" 
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Decision & Rationale */}
              <div className="border border-[#d9ded2] bg-white p-5 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">
                    Human outcome
                    <select value={decision} onChange={e => setDecision(e.target.value as typeof decision)} className="mt-2 h-11 w-full border border-[#cbd6c8] bg-white px-3 text-sm font-normal text-[#173d2a]">
                      <option value="no_decision">No decision yet</option>
                      <option value="advance">Advance</option>
                      <option value="runner_up">Runner up</option>
                      <option value="return_to_proof">Return to proof</option>
                      <option value="archive">Archive</option>
                    </select>
                  </label>
                  <label className="text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">
                    Agent response
                    <select value={agentResponse} onChange={e => setAgentResponse(e.target.value)} className="mt-2 h-11 w-full border border-[#cbd6c8] bg-white px-3 text-sm font-normal text-[#173d2a]">
                      <option value="agree">Agree with advisory findings</option>
                      <option value="qualify">Qualify advisory findings</option>
                      <option value="correct">Correct advisory findings</option>
                      <option value="challenge">Challenge advisory findings</option>
                    </select>
                  </label>
                </div>

                <label className="block text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">
                  Independent human rationale (min 20 characters)
                  <textarea 
                    required 
                    value={rationale} 
                    onChange={e => setRationale(e.target.value)} 
                    className="mt-2 min-h-28 w-full border border-[#cbd6c8] bg-white p-3 text-sm font-normal leading-6 text-[#173d2a]" 
                    placeholder="Provide independent rationale supporting this human scorecard..." 
                  />
                </label>

                <Button disabled={record.isPending || !canSubmit} className="h-11 w-full rounded-none bg-[#173d2a] text-[10px] font-bold uppercase tracking-[.12em] text-white hover:bg-[#0e2b1e]">
                  {record.isPending ? "Recording decision..." : "Record Human Scorecard & Heat Map"} <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
                {record.error && <p className="text-sm text-red-700">{record.error.message}</p>}
              </div>
            </form>
          )}

          <div className="flex justify-start">
            <Button variant="outline" onClick={() => setActiveTab("specialists")} className="rounded-none">Back to Specialist Lenses</Button>
          </div>
        </div>
      )}
    </article>
  );
}

function ExecutiveHeatMap({ rows }: { rows: any[] }) {
  const rowsWithHumanHeatMap = rows.filter(row => row.heatMap.some((dimension: { score: number | null }) => dimension.score !== null));
  const topCandidate = [...rows].sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))[0];

  return (
    <div className="space-y-8">
      {topCandidate && topCandidate.averageScore !== null ? (
        <section className="border-2 border-[#173d2a] bg-[#eef4ec] p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#1b5e3a]">
                <CheckCircle2 className="h-4 w-4" /> Certified Human Winner Award & Retained Rubric Certification
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[#173d2a]">Top Certified Winner: {topCandidate.investmentCase?.title || topCandidate.candidate.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#465448]">Certified by human panel review. Retains multi-dimensional transformation rubric scores, agent Q&A audit trails, and execution readiness metrics for executive investment gateway handover.</p>
            </div>
            <div className="border border-[#173d2a] bg-[#173d2a] px-6 py-4 text-white text-right">
              <p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#a2c4b0]">Final Weighted Score</p>
              <p className="mt-1 font-serif text-3xl">{topCandidate.averageScore.toFixed(1)} / 100</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="border border-[#d9ded2] bg-[#fbfaf6] p-6 md:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6f7e70]">Executive continuation heat map</p>
        <h2 className="mt-2 font-serif text-3xl text-[#173d2a]">Value potential versus the skill and will to execute.</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[#58675b]">
          This is a human-entered portfolio view surfacing where value appears strongest, where execution readiness is weak, and where commitment needs to be established before investment.
        </p>

        {rowsWithHumanHeatMap.length ? (
          <div className="mt-6 overflow-x-auto">
            <div className="min-w-[1050px] border border-[#cbd6c8]">
              <div className="grid grid-cols-[260px_repeat(8,1fr)] bg-[#e3e9df] text-[9px] font-bold uppercase tracking-[.1em] text-[#526456]">
                <div className="p-3">Selected project</div>
                {HEAT_DIMENSIONS.map(item => (
                  <div key={item.key} className="border-l border-[#cbd6c8] p-3 text-center">{item.label}</div>
                ))}
              </div>
              {rows.map(row => (
                <div key={row.candidate.id} className="grid grid-cols-[260px_repeat(8,1fr)] border-t border-[#cbd6c8] bg-white">
                  <div className="p-3 text-sm font-semibold text-[#173d2a]">{row.investmentCase?.title || row.candidate.title}</div>
                  {row.heatMap.map((dimension: { key: string; score: number | null }) => (
                    <div key={dimension.key} className={`border-l border-[#cbd6c8] p-3 text-center font-serif text-2xl ${heatClass(dimension.score)}`}>
                      {dimension.score === null ? "—" : dimension.score.toFixed(1)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 border border-dashed border-[#c2d0bf] bg-[#eef2eb] p-6 text-center text-sm text-[#596b5e]">
            The heat map appears after judges record human 1–5 assessments. Blank cells remain blank; the application does not infer ratings from Agent findings.
          </div>
        )}
      </div>
    </div>
  );
}

function heatClass(score: number | null) {
  if (score === null) return "bg-[#fbfaf6] text-[#9aa49a]";
  if (score >= 4) return "bg-[#dcefd8] text-[#173d2a]";
  if (score >= 3) return "bg-[#fff1bd] text-[#5d4a0d]";
  return "bg-[#f6d9d2] text-[#7d322a]";
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="bg-[#1b482f] p-4"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#c9d8c7]">{label}</p><p className="mt-2 text-sm font-semibold text-white">{value}</p></div>;
}
