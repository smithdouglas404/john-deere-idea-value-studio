import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { cleanJourney } from "@/lib/cleanJourney";

const linkClass = "text-[10px] font-bold uppercase tracking-[.12em] text-[#1b5e3a]";

export function InvestmentCaseContextLinks({ campaignId, eventId }: { campaignId: number; eventId?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-5">
      <Link href={cleanJourney.campaign(campaignId)} className={linkClass}>Campaign context</Link>
      {eventId && <Link href={cleanJourney.event(eventId)} className={linkClass}>Shared hackathon</Link>}
    </div>
  );
}

export function PortfolioActiveLinks({ caseId, eventId }: { caseId?: number; eventId?: number }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link href={caseId ? cleanJourney.investmentCase(caseId) : "/studio"} className="inline-flex h-11 items-center bg-[#173d2a] px-5 text-[10px] font-bold uppercase tracking-[.12em] text-white">
        Continue the record <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
      {eventId && <Link href={cleanJourney.event(eventId)} className="inline-flex h-11 items-center border border-[#173d2a] px-5 text-[10px] font-bold uppercase tracking-[.12em] text-[#173d2a]">
        Open shared hackathon <ArrowRight className="ml-2 h-4 w-4" />
      </Link>}
    </div>
  );
}

export function EventProjectLinks({ caseId, eventId, hasEvidence }: { caseId: number; eventId: number; hasEvidence: boolean }) {
  return (
    <div className="mt-4 flex flex-wrap gap-4">
      <Link href={cleanJourney.investmentCase(caseId)} className="text-[10px] font-bold uppercase tracking-[.12em] text-[#1b5e3a]">Open complete project record</Link>
      {hasEvidence && <Link href={cleanJourney.evidence(caseId)} className="text-[10px] font-bold uppercase tracking-[.12em] text-[#1b5e3a]">Open Agent & Claude skills</Link>}
      <Link href={cleanJourney.judging(eventId)} className="text-[10px] font-bold uppercase tracking-[.12em] text-[#1b5e3a]">Open human judging & ranking <ArrowRight className="ml-2 inline h-4 w-4" /></Link>
    </div>
  );
}

export function HumanJudgingProjectLinks({ caseId }: { caseId: number }) {
  return (
    <div className="mt-4 flex flex-wrap gap-4">
      <Link href={cleanJourney.evidence(caseId)} className="text-[9px] font-bold uppercase tracking-[.12em] text-[#1b5e3a]">Open full Agent & Claude skills <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
      <Link href={cleanJourney.investmentCase(caseId)} className="text-[9px] font-bold uppercase tracking-[.12em] text-[#1b5e3a]">Open inherited project context <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
    </div>
  );
}
