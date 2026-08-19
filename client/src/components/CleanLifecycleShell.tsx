import React from "react";
import { Link } from "wouter";
import { cleanJourney } from "@/lib/cleanJourney";

export type CleanLifecycleStage = "campaign" | "case" | "event" | "judging";

const stages: Array<{ key: CleanLifecycleStage; label: string; description: string }> = [
  { key: "campaign", label: "1. Incubate", description: "Community and manager review" },
  { key: "case", label: "2. Prepare", description: "Inherited business case" },
  { key: "event", label: "3. Prove", description: "Shared hackathon" },
  { key: "judging", label: "4. Decide", description: "Human outcome and continuation" },
];

function destination(stage: CleanLifecycleStage, context: { campaignId?: number; caseId?: number; eventId?: number }) {
  if (stage === "campaign" && context.campaignId) return cleanJourney.campaign(context.campaignId);
  if (stage === "case" && context.caseId) return cleanJourney.investmentCase(context.caseId);
  if (stage === "event" && context.eventId) return cleanJourney.event(context.eventId);
  if (stage === "judging" && context.eventId) return cleanJourney.judging(context.eventId);
  return null;
}

export function CleanLifecycleShell({ stage, campaignId, caseId, eventId }: { stage: CleanLifecycleStage; campaignId?: number; caseId?: number; eventId?: number }) {
  const activeIndex = stages.findIndex(item => item.key === stage);
  const context = { campaignId, caseId, eventId };
  return (
    <nav aria-label="Enterprise portfolio lifecycle" className="border-b border-[#d9ded2] bg-[#f1f3ed]">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-stretch px-5 md:px-10">
        {stages.map((item, index) => {
          const href = destination(item.key, context);
          const active = item.key === stage;
          const available = Boolean(href);
          const content = <><span className="block text-[9px] font-bold uppercase tracking-[.12em]">{item.label}</span><span className="mt-1 block text-[10px] font-normal normal-case tracking-normal">{item.description}</span></>;
          const className = `min-w-[160px] border-r border-[#d9ded2] px-4 py-3 ${active ? "bg-[#173d2a] text-white" : available ? "text-[#1b5e3a] hover:bg-[#e5ecdf]" : index > activeIndex ? "text-[#9aa49a]" : "text-[#657466]"}`;
          return href ? <Link key={item.key} href={href} className={className} aria-current={active ? "step" : undefined}>{content}</Link> : <div key={item.key} className={className} aria-disabled="true">{content}</div>;
        })}
      </div>
    </nav>
  );
}
