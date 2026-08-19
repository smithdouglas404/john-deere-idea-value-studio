import React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cleanJourney } from "@/lib/cleanJourney";
import { CAMPAIGN_STANDARD_ARTIFACTS, CAMPAIGN_STANDARD_RUBRIC } from "@/lib/campaignScheduling";

export type CampaignSchedulingEvent = { id: number; title: string; status: string };

export type CampaignSchedulingPanelProps = {
  sharedEvent: CampaignSchedulingEvent | null;
  selectedProjectCount: number;
  eventSetupOpen: boolean;
  eventTitle: string;
  eventRules: string;
  eventUpdateExpectations: string;
  eventProofStartsAt: string;
  eventSubmissionClosesAt: string;
  eventJudgingStartsAt: string;
  eventJudgingClosesAt: string;
  canSubmit: boolean;
  isPending: boolean;
  errorMessage?: string | null;
  onToggleSetup: () => void;
  onTitleChange: (value: string) => void;
  onRulesChange: (value: string) => void;
  onUpdateExpectationsChange: (value: string) => void;
  onProofStartsAtChange: (value: string) => void;
  onSubmissionClosesAtChange: (value: string) => void;
  onJudgingStartsAtChange: (value: string) => void;
  onJudgingClosesAtChange: (value: string) => void;
  onCreateEvent: () => void;
};

export function CampaignSchedulingPanel({
  sharedEvent,
  selectedProjectCount,
  eventSetupOpen,
  eventTitle,
  eventRules,
  eventUpdateExpectations,
  eventProofStartsAt,
  eventSubmissionClosesAt,
  eventJudgingStartsAt,
  eventJudgingClosesAt,
  canSubmit,
  isPending,
  errorMessage,
  onToggleSetup,
  onTitleChange,
  onRulesChange,
  onUpdateExpectationsChange,
  onProofStartsAtChange,
  onSubmissionClosesAtChange,
  onJudgingStartsAtChange,
  onJudgingClosesAtChange,
  onCreateEvent,
}: CampaignSchedulingPanelProps) {
  return (
    <section id="hackathon-command" className="mt-8 border border-[#d9ded2] bg-[#eef2eb] p-6 md:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6f7e70]">Shared scheduled hackathon</p>
      <h2 className="mt-2 font-serif text-3xl text-[#173d2a]">{sharedEvent ? sharedEvent.title : "Schedule the controlled proof event."}</h2>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-[#58675b]">The event is a shared traditional hackathon for the selected portfolio—not a new idea-intake mechanism. Its dates, rules, update expectations, evidence contract, and judging window govern every selected project.</p>
      <div className="mt-5 grid gap-px border border-[#cbd6c8] bg-[#cbd6c8] lg:grid-cols-2">
        <div className="bg-white p-4"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#6f7e70]">Proof contract · every selected project</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{CAMPAIGN_STANDARD_ARTIFACTS.map(artifact => <div key={artifact.key} className="flex items-start gap-2 text-xs leading-5 text-[#526456]"><span className="mt-1 h-2 w-2 shrink-0 bg-[#1b5e3a]" />{artifact.label}</div>)}</div></div>
        <div className="bg-white p-4"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#6f7e70]">Transformation rubric · human awarded points</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{CAMPAIGN_STANDARD_RUBRIC.map(item => <div key={item.key} className="flex items-start justify-between gap-3 text-xs leading-5 text-[#526456]"><span>{item.label}</span><b className="text-[#173d2a]">{item.weight}</b></div>)}</div><p className="mt-3 text-[10px] leading-4 text-[#718075]">The rubric is a decision aid. It does not calculate ROI or replace the human judge.</p></div>
      </div>
      {sharedEvent ? (
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]">{sharedEvent.status.replace(/_/g, " ")} · {selectedProjectCount} project{selectedProjectCount === 1 ? "" : "s"} attached</span>
          <Link href={cleanJourney.event(sharedEvent.id)} className="inline-flex items-center text-[10px] font-bold uppercase tracking-[.12em] text-[#1b5e3a]">Open scheduled hackathon <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </div>
      ) : (
        <div className="mt-5">
          {!eventSetupOpen && <Button type="button" onClick={onToggleSetup} className="h-11 rounded-none bg-[#1b5e3a] text-[9px] font-bold uppercase tracking-[.1em]">Set up shared event</Button>}
          {eventSetupOpen && <div className="grid gap-4 border-t border-[#cbd6c8] pt-5 lg:grid-cols-2">
            <label className="text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">Event title<input aria-label="Event title" value={eventTitle} onChange={event => onTitleChange(event.target.value)} className="mt-2 h-11 w-full border border-[#cbd6c8] bg-white px-3 text-sm font-normal text-[#173d2a]" placeholder="Example: Dealer service proof sprint" /></label>
            <label className="text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">Proof begins<input aria-label="Proof begins" type="datetime-local" value={eventProofStartsAt} onChange={event => onProofStartsAtChange(event.target.value)} className="mt-2 h-11 w-full border border-[#cbd6c8] bg-white px-3 text-sm font-normal text-[#173d2a]" /></label>
            <label className="lg:col-span-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">Event rules<textarea aria-label="Event rules" value={eventRules} onChange={event => onRulesChange(event.target.value)} className="mt-2 min-h-24 w-full border border-[#cbd6c8] bg-white p-3 text-sm font-normal leading-6 text-[#173d2a]" placeholder="State the participation, evidence, presentation, and human-judging rules for every selected project." /></label>
            <label className="lg:col-span-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">Team update expectations<textarea aria-label="Team update expectations" value={eventUpdateExpectations} onChange={event => onUpdateExpectationsChange(event.target.value)} className="mt-2 min-h-20 w-full border border-[#cbd6c8] bg-white p-3 text-sm font-normal leading-6 text-[#173d2a]" placeholder="Example: update the proof record when a required artifact changes or a judge question is answered." /></label>
            <label className="text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">Submission closes<input aria-label="Submission closes" type="datetime-local" value={eventSubmissionClosesAt} onChange={event => onSubmissionClosesAtChange(event.target.value)} className="mt-2 h-11 w-full border border-[#cbd6c8] bg-white px-3 text-sm font-normal text-[#173d2a]" /></label>
            <label className="text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">Judging begins<input aria-label="Judging begins" type="datetime-local" value={eventJudgingStartsAt} onChange={event => onJudgingStartsAtChange(event.target.value)} className="mt-2 h-11 w-full border border-[#cbd6c8] bg-white px-3 text-sm font-normal text-[#173d2a]" /></label>
            <label className="text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">Judging closes<input aria-label="Judging closes" type="datetime-local" value={eventJudgingClosesAt} onChange={event => onJudgingClosesAtChange(event.target.value)} className="mt-2 h-11 w-full border border-[#cbd6c8] bg-white px-3 text-sm font-normal text-[#173d2a]" /></label>
            <div className="flex items-end"><Button type="button" onClick={onCreateEvent} disabled={isPending || !canSubmit} className="h-11 rounded-none bg-[#1b5e3a] text-[9px] font-bold uppercase tracking-[.1em]">{isPending ? "Scheduling…" : "Create shared event"}</Button></div>
            {errorMessage && <p className="lg:col-span-2 text-xs text-red-700">{errorMessage}</p>}
          </div>}
        </div>
      )}
    </section>
  );
}
