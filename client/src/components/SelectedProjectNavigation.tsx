import { ArrowRight, FolderOpen, CalendarDays } from "lucide-react";
import React from "react";
import { Link } from "wouter";
import { cleanJourney } from "@/lib/cleanJourney";

type Candidate = { id: number; title: string; investmentCaseId: number; proofEventId: number };
type CaseRecord = { id: number; title: string };
type EventRecord = { id: number; title: string; status: string };

export function SelectedProjectNavigation({ candidates, cases, events }: { candidates: Candidate[]; cases: CaseRecord[]; events: EventRecord[] }) {
  if (!candidates.length) return null;
  return <section className="mt-8 border border-[#d9ded2] bg-[#f3f6f0] p-6 md:p-8"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6f7e70]">Selected project navigation</p><h2 className="mt-2 font-serif text-3xl text-[#173d2a]">Keep the inherited business case and the event operations distinct—but connected.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-[#58675b]">Open the business case to review the original crowd context, value thesis, evidence, and decision trail. Open the shared hackathon to operate teams, submissions, agent evidence, and human judging across selected projects.</p><div className="mt-6 grid gap-4 lg:grid-cols-2">{candidates.map(candidate => { const businessCase = cases.find(item => item.id === candidate.investmentCaseId); const event = events.find(item => item.id === candidate.proofEventId); return <article key={candidate.id} className="border border-[#d6dfd2] bg-white p-5"><p className="font-semibold text-[#173d2a]">{candidate.title}</p><p className="mt-1 text-xs leading-5 text-[#647166]">{event?.title || "Scheduled hackathon"} · {event?.status.replace(/_/g, " ") || "scheduled"}</p><div className="mt-4 flex flex-wrap gap-3"><Link href={cleanJourney.investmentCase(candidate.investmentCaseId)} className="inline-flex h-10 items-center border border-[#173d2a] px-4 text-[9px] font-bold uppercase tracking-[.1em] text-[#173d2a]"><FolderOpen className="mr-2 h-4 w-4" />Open inherited case</Link><Link href={cleanJourney.event(candidate.proofEventId)} className="inline-flex h-10 items-center bg-[#173d2a] px-4 text-[9px] font-bold uppercase tracking-[.1em] text-white"><CalendarDays className="mr-2 h-4 w-4" />Open shared hackathon<ArrowRight className="ml-2 h-4 w-4" /></Link></div>{businessCase && <p className="mt-3 text-[10px] font-bold uppercase tracking-[.1em] text-[#6f7e70]">Original business case: {businessCase.title}</p>}</article>; })}</div></section>;
}
