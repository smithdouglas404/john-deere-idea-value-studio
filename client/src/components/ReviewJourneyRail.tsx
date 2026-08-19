import { FileCheck2, Gavel, ShieldCheck, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export type HumanReviewAgendaState = {
  auditReady: boolean;
  specialistReady: boolean;
  openChallengeCount: number;
  humanScoreRecorded: boolean;
  independentRationaleRecorded: boolean;
};

export function buildReviewJourneySteps(projectId: number | null, state: HumanReviewAgendaState = { auditReady: false, specialistReady: false, openChallengeCount: 0, humanScoreRecorded: false, independentRationaleRecorded: false }) {
  const evidenceHref = projectId ? `/submission-evidence?project=${projectId}` : "/submission-evidence";
  const reviewHref = projectId ? `/judging?project=${projectId}` : "/judging";
  return [
    { label: "Evidence record", detail: state.auditReady ? "Proof packet ready for inspection" : "Establish the cited proof packet", href: evidenceHref, icon: FileCheck2, complete: state.auditReady },
    { label: "Cited inspection", detail: state.specialistReady ? "Agent and five-skill evidence ready" : "Review available evidence and gaps", href: reviewHref, icon: ShieldCheck, complete: state.specialistReady && state.openChallengeCount === 0 },
    { label: "Human score", detail: state.humanScoreRecorded ? "Independent rubric rationale recorded" : "Apply the rubric and record reasoning", href: reviewHref, icon: Gavel, complete: state.humanScoreRecorded },
    { label: "Decision continuation", detail: state.humanScoreRecorded ? "Carry the human decision into realization" : "Available after human decision", href: "/realization", icon: TrendingUp, complete: false },
  ];
}

export function nextHumanReviewAction(state: HumanReviewAgendaState) {
  if (!state.auditReady) return { title: "Establish the evidence packet", detail: "Confirm the submitted proof has a completed cited audit before relying on automated assistance." };
  if (state.openChallengeCount > 0) return { title: "Resolve cited participant challenges", detail: `${state.openChallengeCount} participant challenge${state.openChallengeCount === 1 ? " requires" : "s require"} a human response before you finalize the review.` };
  if (!state.specialistReady) return { title: "Inspect available specialist evidence", detail: "Review the completed skills and their limitations; request or wait for missing specialist evidence as needed." };
  if (!state.humanScoreRecorded) return { title: "Record independent rubric reasoning", detail: "Apply the configured rubric and write the human rationale. AI findings do not populate this decision." };
  if (!state.independentRationaleRecorded) return { title: "Add an independent determination", detail: "Record an evidence correction, voice rationale, or independent determination beside the AI brief before continuing." };
  return { title: "Continue to realization", detail: "The evidence review is complete. Carry the human-owned decision and proof conditions into realization tracking." };
}

export function ReviewJourneyRail({ projectId, state }: { projectId: number | null; state: HumanReviewAgendaState }) {
  const steps = buildReviewJourneySteps(projectId, state);
  const next = nextHumanReviewAction(state);
  return <section className="mt-5 border border-[#c9d7c5] bg-[#173d2a] p-4 text-white"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#b7d1ae]">Human Review Copilot</p><p className="mt-1 font-serif text-[23px] leading-6">{next.title}</p><p className="mt-2 max-w-2xl text-[10px] leading-4 text-[#d2dfcd]">{next.detail}</p></div><div className="max-w-md border-l border-[#4e7157] pl-4"><p className="text-[10px] leading-4 text-[#d2dfcd]">AI evidence organizes this route; it does not select a winner, set an investment gate, or replace the reviewer.</p><p className="mt-2 text-[9px] font-bold uppercase tracking-[.1em] text-[#f8d41d]">{state.openChallengeCount} participant challenge{state.openChallengeCount === 1 ? "" : "s"} require{state.openChallengeCount === 1 ? "s" : ""} review</p></div></div><div className="mt-4 grid gap-px border border-[#4e7157] bg-[#4e7157] sm:grid-cols-4">{steps.map((step, index) => { const Icon = step.icon; return <Link key={step.label} href={step.href} className={`min-h-22 bg-[#173d2a] p-3 hover:bg-[#204934] ${!step.complete && index < 3 ? "bg-[#214c35]" : ""}`}><div className="flex items-center justify-between"><p className="text-[8px] font-bold uppercase tracking-[.1em] text-[#b7d1ae]">0{index + 1} · {step.complete ? "done" : "next"}</p><Icon className="h-3.5 w-3.5 text-[#f8d41d]" /></div><p className="mt-3 text-[11px] font-bold">{step.label}</p><p className="mt-1 text-[9px] leading-4 text-[#d2dfcd]">{step.detail}</p></Link>;})}</div></section>;
}
