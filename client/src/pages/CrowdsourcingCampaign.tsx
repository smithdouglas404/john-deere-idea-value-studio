import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, CircleDot, FileText, Loader2, MessageSquareText, Target, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampaignReviewQueue } from "@/components/CampaignReviewQueue";
import { SelectedProjectNavigation } from "@/components/SelectedProjectNavigation";
import { CleanLifecycleShell } from "@/components/CleanLifecycleShell";
import { CleanBackControls } from "@/components/CleanBackControls";
import { CleanBreadcrumbs } from "@/components/CleanBreadcrumbs";
import { CampaignSchedulingPanel } from "@/components/CampaignSchedulingPanel";
import { CampaignOrchestrationGuide } from "@/components/CampaignOrchestrationGuide";
import { CAMPAIGN_STANDARD_ARTIFACTS, CAMPAIGN_STANDARD_RUBRIC, canAttachSelectedProject, canCreateCampaignEvent } from "@/lib/campaignScheduling";
import { trpc } from "@/lib/trpc";
import { cleanJourney } from "@/lib/cleanJourney";

function formatWindow(value: Date | null) { return value ? new Date(value).toLocaleString() : "Not scheduled"; }
function CaseState({ value }: { value: string }) {
  const tones: Record<string, string> = { submitted: "bg-[#edf0e7] text-[#536554]", returned: "bg-[#fff4df] text-[#805f18]", approved_for_proof: "bg-[#e5f0e4] text-[#1b5e3a]", archived_learning: "bg-[#e7edf4] text-[#2f5974]" };
  return <span className={`inline-flex px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] ${tones[value] || "bg-[#edf0e7] text-[#536554]"}`}>{value.replace(/_/g, " ")}</span>;
}
function sponsorFinancialContext(item: { financialDetail?: Record<string, unknown> | null }) {
  const detail = item.financialDetail && typeof item.financialDetail === "object" ? item.financialDetail : {};
  const labels: Record<string, string> = { conservativeValue: "Conservative", workingMidpoint: "Midpoint", upsideValue: "Upside", costToProve: "Cost to prove", timeToValue: "Time" };
  const entries = Object.entries(detail).filter(([, value]) => typeof value === "string" && value.trim()).map(([key, value]) => `${labels[key] || key}: ${String(value)}`);
  return entries.length ? entries.join(" · ") : "No sponsor financial context entered";
}
function WindowCell({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) { return <div className="bg-[#1b482f] p-4"><Icon className="h-4 w-4 text-[#f1d674]" /><p className="mt-3 text-[9px] font-bold uppercase tracking-[.12em] text-[#c9d8c7]">{label}</p><p className="mt-1 text-sm font-semibold text-white">{value}</p></div>; }
function SignalCell({ icon: Icon, label, value }: { icon: typeof CircleDot; label: string; value: number }) { return <div className="bg-[#fbfaf6] p-4"><Icon className="h-4 w-4 text-[#876e16]" /><p className="mt-3 text-[9px] font-bold uppercase tracking-[.12em] text-[#718075]">{label}</p><p className="mt-1 font-serif text-3xl text-[#173d2a]">{value}</p></div>; }

export default function CrowdsourcingCampaign() {
  const [, params] = useRoute("/studio/campaigns/:id");
  const campaignId = Number(params?.id);
  const { data, isLoading, error } = trpc.studio.campaignWorkspace.useQuery({ campaignId }, { enabled: Number.isInteger(campaignId) && campaignId > 0 });
  const utils = trpc.useUtils();
  const approve = trpc.studio.approveForProof.useMutation({ onSuccess: () => utils.studio.campaignWorkspace.invalidate({ campaignId }) });
  const createCandidate = trpc.studio.createProofCandidate.useMutation({ onSuccess: () => utils.studio.campaignWorkspace.invalidate({ campaignId }) });
  const createEvent = trpc.studio.createProofEvent.useMutation({ onSuccess: () => utils.studio.campaignWorkspace.invalidate({ campaignId }) });
  const [approvalCaseId, setApprovalCaseId] = useState<number | null>(null);
  const [approvalRationale, setApprovalRationale] = useState("");
  const [scheduleCaseId, setScheduleCaseId] = useState<number | null>(null);
  const [proofQuestion, setProofQuestion] = useState("");
  const [eventSetupOpen, setEventSetupOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventRules, setEventRules] = useState("");
  const [eventUpdateExpectations, setEventUpdateExpectations] = useState("");
  const [eventProofStartsAt, setEventProofStartsAt] = useState("");
  const [eventSubmissionClosesAt, setEventSubmissionClosesAt] = useState("");
  const [eventJudgingStartsAt, setEventJudgingStartsAt] = useState("");
  const [eventJudgingClosesAt, setEventJudgingClosesAt] = useState("");

  useEffect(() => { if (data && data.events.length === 0) setEventSetupOpen(true); }, [data]);
  if (isLoading) return <main className="grid min-h-screen place-items-center bg-[#f7f5ed]"><Loader2 className="h-7 w-7 animate-spin text-[#173d2a]" /></main>;
  if (!data || error) return <main className="grid min-h-screen place-items-center bg-[#f7f5ed] p-6"><div className="border border-[#ddbab2] bg-[#fff7f5] p-6 text-[#7d322a]"><p className="font-serif text-2xl">This campaign could not open.</p><p className="mt-2 text-sm">{error?.message || "The crowdsourcing record does not exist."}</p></div></main>;

  const byCase = new Map(data.candidates.map(candidate => [candidate.investmentCaseId, candidate]));
  const sharedEvent = data.events[0] || null;
  const signalCounts = data.signals.reduce<Record<string, number>>((counts, signal) => ({ ...counts, [signal.signalType]: (counts[signal.signalType] || 0) + 1 }), {});
  const signalsByCase = new Map(data.cases.map(item => [item.id, data.signals.filter(signal => signal.investmentCaseId === item.id)]));

  return <main className="min-h-screen bg-[#f7f5ed] text-[#213126]">
    <header className="border-b border-[#d9ded2] bg-[#fbfaf6]"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-5 px-5 py-5 md:px-10"><div><CleanBackControls /><CleanBreadcrumbs items={[{ label: "Innovation Portfolio", href: "/" }, { label: "Campaign incubation", current: true }]} /></div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#708072]">Crowdsource · enrich · executive select</p></div></header>
    <CleanLifecycleShell stage="campaign" campaignId={campaignId} eventId={sharedEvent?.id} />
    <section className="border-b border-[#d9ded2] bg-[#173d2a] text-white"><div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#d4e2b9]">Time-bounded idea-incubation campaign</p><h1 className="mt-3 max-w-4xl font-serif text-4xl leading-tight md:text-5xl">{data.campaign.title}</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-[#d6e1d1]">{data.campaign.challengeBrief}</p><div className="mt-6 grid gap-px border border-[#456d56] bg-[#456d56] md:grid-cols-3"><WindowCell icon={CalendarDays} label="Opens" value={formatWindow(data.campaign.opensAt)} /><WindowCell icon={CalendarDays} label="Closes" value={formatWindow(data.campaign.closesAt)} /><WindowCell icon={Target} label="Executive selection" value={`${data.candidates.length} case${data.candidates.length === 1 ? "" : "s"} selected for proof`} /></div></div></section>
    <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10">
      <CampaignOrchestrationGuide campaignId={campaignId} cases={data.cases} caseAssets={data.caseAssets} signals={data.signals} sharedEvent={sharedEvent ? { id: sharedEvent.id, title: sharedEvent.title, status: sharedEvent.status } : null} viewerCanManage={data.viewerCanManage} onChanged={() => utils.studio.campaignWorkspace.invalidate({ campaignId })} />
      <section className="grid gap-8 xl:grid-cols-[1.1fr_.9fr]">
        <article className="border border-[#d9ded2] bg-[#fbfaf6] p-6 md:p-8"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6f7e70]">Incubated business cases</p><h2 className="mt-2 font-serif text-3xl text-[#173d2a]">Crowd context becomes an executive portfolio decision.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#58675b]">Ideas are enriched with community evidence and sponsor context before executives select the small set that will enter a scheduled hackathon as formal projects.</p><div className="mt-6 space-y-3">{data.cases.map(item => { const candidate = byCase.get(item.id); const event = candidate ? data.events.find(entry => entry.id === candidate.proofEventId) : null; const signals = signalsByCase.get(item.id) || []; return <Link key={item.id} href={cleanJourney.investmentCase(item.id)} className="block border border-[#dbe1d8] bg-white p-4 hover:border-[#173d2a]"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-[#173d2a]">{item.title}</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[#657366]">{item.investmentThesis}</p></div><CaseState value={item.status} /></div><div className="mt-3 grid gap-2 border-y border-[#e1e6dd] py-3 text-[10px] font-bold uppercase tracking-[.1em] text-[#647465] md:grid-cols-2"><span>{signals.length} case-level crowd signal{signals.length === 1 ? "" : "s"}</span><span>{sponsorFinancialContext(item)}</span></div><div className="mt-3 text-[10px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]">{candidate ? `Selected project → ${event?.title || "scheduled hackathon"}` : "Open business case for review"}<ArrowRight className="ml-2 inline h-3.5 w-3.5" /></div></Link>; })}</div></article>
        <aside className="border border-[#d9ded2] bg-[#eef2eb] p-6 md:p-8"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6f7e70]">Community participation</p><h2 className="mt-2 font-serif text-3xl text-[#173d2a]">Crowdsourcing is evidence before selection.</h2><p className="mt-3 text-sm leading-6 text-[#58675b]">Contributors add ideas, comments, endorsements, and evidence offers. Sponsors review that context together with business-case assumptions before selecting projects for proof.</p><div className="mt-6 grid gap-px border border-[#cbd6c8] bg-[#cbd6c8] sm:grid-cols-2"><SignalCell icon={CircleDot} label="Ideas" value={signalCounts.idea || 0} /><SignalCell icon={UsersRound} label="Endorsements" value={signalCounts.endorsement || 0} /><SignalCell icon={MessageSquareText} label="Comments" value={signalCounts.comment || 0} /><SignalCell icon={FileText} label="Evidence offers" value={signalCounts.evidence_offer || 0} /></div><div className="mt-6 border-t border-[#cbd6c8] pt-5"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#6f7e70]">After selection</p><p className="mt-2 text-sm leading-6 text-[#4b5d4e]">Every approved case becomes a project in the scheduled hackathon. Its original idea owner, crowdsource history, value thesis, KPI/OKR context, and evidence contract stay attached throughout proof and judging.</p>{sharedEvent && <Link href={cleanJourney.event(sharedEvent.id)} className="mt-4 inline-flex items-center text-[10px] font-bold uppercase tracking-[.12em] text-[#1b5e3a]">Open the scheduled hackathon <ArrowRight className="ml-2 h-4 w-4" /></Link>}</div></aside>
      </section>
      <CampaignReviewQueue campaignId={campaignId} cases={data.cases} assessments={data.assessments} reviews={data.reviews} viewerId={data.viewerId} viewerCanManage={data.viewerCanManage} />
      <CampaignSchedulingPanel
        sharedEvent={sharedEvent ? { id: sharedEvent.id, title: sharedEvent.title, status: sharedEvent.status } : null}
        selectedProjectCount={data.candidates.length}
        eventSetupOpen={eventSetupOpen}
        eventTitle={eventTitle}
        eventRules={eventRules}
        eventUpdateExpectations={eventUpdateExpectations}
        eventProofStartsAt={eventProofStartsAt}
        eventSubmissionClosesAt={eventSubmissionClosesAt}
        eventJudgingStartsAt={eventJudgingStartsAt}
        eventJudgingClosesAt={eventJudgingClosesAt}
        canSubmit={canCreateCampaignEvent({ title: eventTitle, rules: eventRules })}
        isPending={createEvent.isPending}
        errorMessage={createEvent.error?.message}
        onToggleSetup={() => setEventSetupOpen(true)}
        onTitleChange={setEventTitle}
        onRulesChange={setEventRules}
        onUpdateExpectationsChange={setEventUpdateExpectations}
        onProofStartsAtChange={setEventProofStartsAt}
        onSubmissionClosesAtChange={setEventSubmissionClosesAt}
        onJudgingStartsAtChange={setEventJudgingStartsAt}
        onJudgingClosesAtChange={setEventJudgingClosesAt}
        onCreateEvent={() => createEvent.mutate({ title: eventTitle.trim(), rules: eventRules.trim(), updateExpectations: eventUpdateExpectations.trim() || undefined, status: "registration", proofStartsAt: eventProofStartsAt ? new Date(eventProofStartsAt) : undefined, submissionClosesAt: eventSubmissionClosesAt ? new Date(eventSubmissionClosesAt) : undefined, judgingStartsAt: eventJudgingStartsAt ? new Date(eventJudgingStartsAt) : undefined, judgingClosesAt: eventJudgingClosesAt ? new Date(eventJudgingClosesAt) : undefined }, { onSuccess: () => setEventSetupOpen(false) })}
      />
      <section className="mt-8 border border-[#d9ded2] bg-[#fbfaf6] p-6 md:p-8"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6f7e70]">Executive selection slate</p><h2 className="mt-2 font-serif text-3xl text-[#173d2a]">Select, then schedule the incubated cases that should enter the hackathon.</h2><p className="mt-3 max-w-4xl text-sm leading-6 text-[#58675b]">Selection and scheduling are human-controlled here. Approved cases can be attached directly to the shared event with an explicit proof question and standard evidence contract; teams and judges can then refine and assess that same inherited record.</p><div className="mt-6 grid gap-4 lg:grid-cols-2">{data.cases.map(item => { const candidate = byCase.get(item.id); const isApproving = approvalCaseId === item.id; const isScheduling = scheduleCaseId === item.id; const signals = signalsByCase.get(item.id) || []; const canApprove = item.status === "submitted" || item.status === "returned"; const canSchedule = item.status === "approved_for_proof" && sharedEvent; return <article key={item.id} className="border border-[#d6dfd2] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-[#173d2a]">{item.title}</p><p className="mt-1 text-xs leading-5 text-[#657366]">{sponsorFinancialContext(item)}</p></div><CaseState value={item.status} /></div><p className="mt-3 border-t border-[#e1e6dd] pt-3 text-xs leading-5 text-[#536254]">{signals.length} direct crowd signal{signals.length === 1 ? "" : "s"} · {(item.kpiOkrLinks || []).length} KPI / OKR link{(item.kpiOkrLinks || []).length === 1 ? "" : "s"}</p>{candidate ? <div className="mt-4 flex flex-wrap items-center gap-3"><span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]"><CheckCircle2 className="mr-2 h-4 w-4" />Scheduled project</span><Link href={cleanJourney.event(candidate.proofEventId)} className="text-[10px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]">Open event project</Link></div> : canApprove ? <div className="mt-4"><Button type="button" onClick={() => { setApprovalCaseId(isApproving ? null : item.id); setApprovalRationale(""); }} className="h-10 rounded-none bg-[#173d2a] text-[9px] font-bold uppercase tracking-[.1em]">{isApproving ? "Close selection rationale" : "Select for hackathon"}</Button>{isApproving && <div className="mt-3"><textarea value={approvalRationale} onChange={event => setApprovalRationale(event.target.value)} className="min-h-24 w-full border border-[#cbd6c8] bg-white p-3 text-sm leading-6 text-[#173d2a]" placeholder="Why should this crowd-incubated case enter the scheduled hackathon?" /><Button type="button" onClick={() => approve.mutate({ caseId: item.id, rationale: approvalRationale.trim() }, { onSuccess: () => { setApprovalCaseId(null); setApprovalRationale(""); } })} disabled={approve.isPending || approvalRationale.trim().length < 10} className="mt-3 h-10 rounded-none bg-[#1b5e3a] text-[9px] font-bold uppercase tracking-[.1em]">{approve.isPending ? "Saving selection…" : "Approve as hackathon project"}</Button>{approve.error && <p className="mt-2 text-xs text-red-700">{approve.error.message}</p>}</div>}</div> : canSchedule ? <div className="mt-4"><Button type="button" onClick={() => { setScheduleCaseId(isScheduling ? null : item.id); setProofQuestion(item.investmentThesis); }} className="h-10 rounded-none bg-[#173d2a] text-[9px] font-bold uppercase tracking-[.1em]">{isScheduling ? "Close scheduling" : `Schedule in ${sharedEvent.title}`}</Button>{isScheduling && <div className="mt-3 border-t border-[#e1e6dd] pt-3"><p className="text-xs leading-5 text-[#526456]">This attaches the case to <b>{sharedEvent.title}</b> with the standard evidence contract: business requirements, technical design, code/prototype, and demo. The inherited business case remains unchanged.</p><textarea value={proofQuestion} onChange={event => setProofQuestion(event.target.value)} className="mt-3 min-h-24 w-full border border-[#cbd6c8] bg-white p-3 text-sm leading-6 text-[#173d2a]" placeholder="What must this project demonstrate during the hackathon?" /><Button type="button" onClick={() => createCandidate.mutate({ investmentCaseId: item.id, proofEventId: sharedEvent.id, title: item.title, proofQuestion: proofQuestion.trim(), requiredArtifacts: CAMPAIGN_STANDARD_ARTIFACTS, rubric: CAMPAIGN_STANDARD_RUBRIC }, { onSuccess: () => { setScheduleCaseId(null); setProofQuestion(""); } })} disabled={createCandidate.isPending || proofQuestion.trim().length < 15} className="mt-3 h-10 rounded-none bg-[#1b5e3a] text-[9px] font-bold uppercase tracking-[.1em]">{createCandidate.isPending ? "Scheduling project…" : "Attach to scheduled hackathon"}</Button>{createCandidate.error && <p className="mt-2 text-xs text-red-700">{createCandidate.error.message}</p>}</div>}</div> : <p className="mt-4 text-xs leading-5 text-[#647166]">A shared scheduled hackathon is required before an approved case can be attached. Schedule it above, then return here to attach the project.</p>}</article>; })}</div>
        {data.candidates.length > 0 && <div className="mt-6 border-t border-[#d9ded2] pt-6"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6f7e70]">Completed project contracts</p><div className="mt-3 grid gap-4 lg:grid-cols-2">{data.candidates.map(candidate => { const event = data.events.find(item => item.id === candidate.proofEventId); const artifacts = Array.isArray(candidate.requiredArtifacts) ? candidate.requiredArtifacts : []; const rubric = Array.isArray(candidate.rubric) ? candidate.rubric : []; const rubricTotal = rubric.reduce((sum, item) => sum + (typeof item === "object" && item && "weight" in item && typeof item.weight === "number" ? item.weight : 0), 0); return <article key={candidate.id} className="border border-[#d6dfd2] bg-[#f6f8f4] p-4"><div className="flex items-start justify-between gap-3"><p className="font-semibold text-[#173d2a]">{candidate.title}</p><span className="text-[9px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]">{event?.status.replace(/_/g, " ") || "scheduled"}</span></div><p className="mt-2 text-xs leading-5 text-[#526456]"><b>Proof question:</b> {candidate.proofQuestion}</p><div className="mt-3 grid gap-px border border-[#d7dfd2] bg-[#d7dfd2] sm:grid-cols-3"><div className="bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#6f7e70]">Event</p><p className="mt-1 text-xs font-semibold text-[#173d2a]">{event?.title || "Not found"}</p></div><div className="bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#6f7e70]">Deliverables</p><p className="mt-1 text-xs font-semibold text-[#173d2a]">{artifacts.length} required</p></div><div className="bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#6f7e70]">Human rubric</p><p className="mt-1 text-xs font-semibold text-[#173d2a]">{rubricTotal} points</p></div></div></article>; })}</div></div>}
      </section>
      <SelectedProjectNavigation candidates={data.candidates} cases={data.cases} events={data.events} />
    </div>
  </main>;
}
