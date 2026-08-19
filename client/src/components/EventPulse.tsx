import { Activity, BadgeCheck, ClipboardCheck, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function EventPulse({ hackathonId }: { hackathonId: number }) {
  const { data, isLoading, error } = trpc.hackathons.eventPulse.useQuery({ hackathonId }, { refetchInterval: 15_000, refetchIntervalInBackground: false });
  if (isLoading) return <section className="mt-5 border border-[#c8d6c4] bg-[#eef4eb] p-5"><p className="text-[11px] font-semibold text-[#4d6551]">Refreshing event pulse…</p></section>;
  if (error || !data) return null;
  const metrics = [
    { label: "Registered", value: data.registrations, icon: UsersRound },
    { label: "Teams", value: data.teams, icon: Activity },
    { label: "Proof submitted", value: `${data.submitted}/${data.projects}`, icon: ClipboardCheck },
    { label: "Audits complete", value: data.auditsComplete, icon: ShieldCheck },
    { label: "Specialist reviews", value: `${data.specialistComplete}/${data.specialistExpected}`, icon: Sparkles },
    { label: "Human decisions", value: data.finalScorecards, icon: BadgeCheck },
  ];
  return <section className="mt-5 border border-[#c8d6c4] bg-[#eef4eb] p-5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.11em] text-[#356346]">Live Event Pulse / factual operations</p><h2 className="mt-1 font-serif text-[28px] text-[#173d2a]">Know where the proof is moving.</h2><p className="mt-2 max-w-3xl text-[12px] leading-5 text-[#506352]">This refreshes while Event HQ is open. It reports recorded activity and blockers; it does not rank teams, predict outcomes, or replace human decision authority.</p></div><span className={`border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[.1em] ${data.decisionReady ? "border-[#9db992] bg-[#dcebd7] text-[#205b36]" : "border-[#d6c78d] bg-[#fff8d8] text-[#78601d]"}`}>{data.decisionReady ? "Decision evidence ready" : "Proof still moving"}</span></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{metrics.map(metric => { const Icon = metric.icon; return <div key={metric.label} className="border border-[#d1ddcc] bg-white p-3"><div className="flex items-center gap-2 text-[#4d6a51]"><Icon className="h-3.5 w-3.5" /><p className="text-[10px] font-bold uppercase tracking-[.09em]">{metric.label}</p></div><p className="mt-2 font-serif text-[25px] text-[#173d2a]">{metric.value}</p></div>; })}</div>
    <div className="mt-5 border-t border-[#d1ddcc] pt-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#58715b]">Current blockers to resolve</p>{data.blockers.length ? <ul className="mt-2 space-y-1.5">{data.blockers.map(blocker => <li key={blocker} className="text-[12px] leading-5 text-[#516552]">• {blocker}</li>)}</ul> : <p className="mt-2 text-[12px] leading-5 text-[#356346]">No operational blocker is currently derived from the recorded event state. Sponsor review still remains human-owned.</p>}</div>
  </section>;
}
