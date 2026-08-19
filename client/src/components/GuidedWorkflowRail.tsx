import React from "react";
import { ClipboardCheck, FileCheck2, Gavel, Lightbulb, Rocket, UsersRound } from "lucide-react";
import { Link } from "wouter";

export type ActiveProofWork = {
  hackathonId: number;
  opportunityId: number | null;
  projectId: number | null;
  eventTitle: string;
  eventStatus: string;
  projectTitle: string | null;
  projectSubmittedAt: Date | string | null;
  nextAction: { label: string; route: string };
};

export function buildGuidedWorkflowSteps(work: ActiveProofWork | null) {
  const projectRoute = work?.projectId ? `/submission-evidence?project=${work.projectId}` : work ? `/hackathons/${work.hackathonId}` : "/workspace";
  const judgingRoute = work?.projectId ? `/judging?project=${work.projectId}` : work ? `/hackathons/${work.hackathonId}` : "/judging";
  return [
    { id: "01", label: "Value case", detail: work?.opportunityId ? "Evidence and sponsor context linked" : "Capture the field friction", href: work?.opportunityId ? `/opportunities/${work.opportunityId}` : "/workspace", icon: Lightbulb, state: work?.opportunityId ? "Linked" : "Start" },
    { id: "02", label: "Proof design", detail: work ? work.eventTitle : "Define the controlled proof", href: work ? `/hackathons/${work.hackathonId}` : "/hackathons", icon: Rocket, state: work?.eventStatus || "Plan" },
    { id: "03", label: "Mobilize", detail: work?.projectTitle ? "Team proof work connected" : "Form a team and request support", href: projectRoute, icon: UsersRound, state: work?.projectTitle ? "Connected" : "Prepare" },
    { id: "04", label: "Evidence", detail: work?.projectSubmittedAt ? "Proof record submitted" : "Submit the proof record", href: projectRoute, icon: FileCheck2, state: work?.projectSubmittedAt ? "Submitted" : "Next" },
    { id: "05", label: "Human review", detail: "Calibrate, inspect, and decide", href: work ? "/reviewer-calibration" : judgingRoute, icon: Gavel, state: "Human owned" },
    { id: "06", label: "Realize", detail: "Record the decision and outcome", href: "/realization", icon: ClipboardCheck, state: "Continue" },
  ];
}

export function GuidedWorkflowRail({ work }: { work: ActiveProofWork | null }) {
  const steps = buildGuidedWorkflowSteps(work);
  return <section className="mt-6 border border-[#b9cdb8] bg-[#173d2a] p-5 text-[#f9f8f1] md:p-6"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#b9d3b1]">Owner operating journey</p><h2 className="mt-2 font-serif text-[29px] leading-none md:text-[34px]">One evidence chain. One accountable next step.</h2><p className="mt-2 max-w-3xl text-[12px] leading-5 text-[#d2e0cb]">This is the path from a field signal to a human-owned investment decision. Every step opens the current record; no step creates an automatic score, economics, or decision.</p></div><div className="mt-5 grid gap-px overflow-hidden border border-[#486a54] bg-[#486a54] sm:grid-cols-2 xl:grid-cols-6">{steps.map((step, index) => { const Icon = step.icon; return <Link key={step.id} href={step.href} className={`min-h-36 bg-[#173d2a] p-4 hover:bg-[#204a34] ${index === 3 && work && !work.projectSubmittedAt ? "bg-[#214b35]" : ""}`}><div className="flex items-center justify-between"><span className="text-[9px] font-bold tracking-[.14em] text-[#a9c8a1]">{step.id}</span><Icon className="h-4 w-4 text-[#f8d41d]" /></div><p className="mt-5 text-[9px] font-bold uppercase tracking-[.12em] text-[#c0d8b9]">{step.state}</p><h3 className="mt-1 font-serif text-[20px] text-white">{step.label}</h3><p className="mt-1 text-[10px] leading-4 text-[#cfddc9]">{step.detail}</p></Link>;})}</div></section>;
}
