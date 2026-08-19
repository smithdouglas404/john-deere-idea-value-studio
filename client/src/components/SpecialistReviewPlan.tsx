import { Code2, Palette, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { trpc } from "@/lib/trpc";

export const specialistReviewPlanItems = [
  { key: "ux_ui", title: "UI & UX reviewer", evidence: "Workflow clarity, accessibility, task completion, and user-facing proof.", icon: Palette },
  { key: "cloud_architecture", title: "Cloud architecture reviewer", evidence: "System boundaries, dependencies, deployment posture, and operational fit.", icon: Workflow },
  { key: "security", title: "Security reviewer", evidence: "Authentication, data handling, exposed risks, and evidence of safeguards.", icon: ShieldCheck },
  { key: "development_quality", title: "Development-quality reviewer", evidence: "Code structure, tests, delivery evidence, and maintainability signals.", icon: Code2 },
  { key: "value_feasibility", title: "Value & feasibility reviewer", evidence: "Proof alignment to the sponsor case, constraints, and evidence gaps.", icon: Sparkles },
] as const;

export function SpecialistReviewPlan({ opportunityId }: { opportunityId: number }) {
  const { data, isLoading } = trpc.opportunities.specialistReviewPlan.useQuery({ opportunityId });
  const completed = new Set(data?.evaluations.filter(item => item.status === "complete").map(item => item.skill) || []);
  const proofAvailable = Boolean(data?.project);

  return <section className="mt-6 border border-[#c8d6c4] bg-[#f3f7ef] p-5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.11em] text-[#356346]">Specialist review plan / advisory only</p><h2 className="mt-1 font-serif text-[28px] text-[#173d2a]">Five reviewers are ready for the proof.</h2><p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#4f6252]">These agents do not score the opportunity, set value, or make an investment decision. After a submitted proof has code, documentation, or a demo, each produces a cited provisional review for the human judge.</p></div><span className="border border-[#b7cdb2] bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-[#356346]">{proofAvailable ? `${completed.size} of 5 completed` : "Activates after proof submission"}</span></div>
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{specialistReviewPlanItems.map(item => { const Icon = item.icon; const isComplete = completed.has(item.key); return <article key={item.key} className="border border-[#d4dfd0] bg-white p-4"><div className="flex items-center gap-2 text-[#1b5e3a]"><Icon className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[.09em]">{isComplete ? "Cited review complete" : proofAvailable ? "Awaiting review" : "Evidence needed"}</p></div><h3 className="mt-3 text-[13px] font-bold text-[#263e2d]">{item.title}</h3><p className="mt-2 text-[11px] leading-5 text-[#56685a]">{item.evidence}</p></article>; })}</div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#d4dfd0] pt-4"><p className="text-[11px] leading-5 text-[#56685a]">Shared packet: identity-redacted project evidence, approved sources, and the Hackathon Agent audit. Every material finding needs a citation and remains challengeable by the team.</p>{proofAvailable ? <a href={`/judging?project=${data!.project!.id}`} className="inline-flex items-center border border-[#1b5e3a] bg-[#173d2a] px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] text-white hover:bg-[#0e2b1e]">Open cited findings in Judge Desk</a> : <span className="text-[11px] font-semibold text-[#5c705e]">Launch a controlled proof sprint to activate reviews.</span>}</div>
  </section>;
}
