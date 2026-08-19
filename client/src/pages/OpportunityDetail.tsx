import { StudioShell } from "@/components/StudioShell";
import { Button } from "@/components/ui/button";
import { ValueCaseCockpit } from "@/components/ValueCaseCockpit";
import { OpportunityResearchDossier } from "@/components/OpportunityResearchDossier";
import { SpecialistReviewPlan } from "@/components/SpecialistReviewPlan";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { resolveOpportunityGuideAction } from "@/lib/opportunityGuide";
import { ArrowLeft, AudioLines, Bot, CheckCircle2, FileUp, FolderSearch, Mic, Pause, Play, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function asBrief(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export default function OpportunityDetail() {
  const [, params] = useRoute("/opportunities/:id");
  const opportunityId = Number(params?.id || 0);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: governanceProfile } = trpc.governance.myProfile.useQuery();
  const { data, isLoading, error } = trpc.opportunities.detail.useQuery({ opportunityId }, { enabled: Number.isFinite(opportunityId) && opportunityId > 0 });
  const { data: proofReadiness } = trpc.opportunities.proofReadiness.useQuery({ opportunityId }, { enabled: Number.isFinite(opportunityId) && opportunityId > 0, refetchInterval: 15_000, refetchIntervalInBackground: false });
  const [file, setFile] = useState<File | null>(null);
  const [uploadConsent, setUploadConsent] = useState(false);
  const [researchConsent, setResearchConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const upload = trpc.opportunities.uploadAsset.useMutation({ onSuccess: () => { utils.opportunities.detail.invalidate({ opportunityId }); setFile(null); } });
  const confirm = trpc.opportunities.confirmAsset.useMutation({ onSuccess: () => utils.opportunities.detail.invalidate({ opportunityId }) });
  const brief = trpc.opportunities.generateBrief.useMutation({ onSuccess: () => utils.opportunities.detail.invalidate({ opportunityId }) });
  const research = trpc.opportunities.research.useMutation({ onSuccess: () => utils.opportunities.detail.invalidate({ opportunityId }) });
  const selection = trpc.opportunities.setSelection.useMutation({ onSuccess: () => utils.opportunities.detail.invalidate({ opportunityId }) });
  const createHackathon = trpc.hackathons.createFromOpportunity.useMutation({ onSuccess: ({ hackathonId }) => setLocation(`/hackathons/${hackathonId}`) });

  const uploadFile = async () => {
    if (!file || !data) return;
    const assetType = file.type.startsWith("audio/") ? "voice" : "document" as const;
    upload.mutate({ opportunityId: data.opportunity.id, assetType, fileName: file.name, mimeType: file.type || "application/octet-stream", base64: await fileToBase64(file), consent: uploadConsent });
  };
  const beginRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const media = new MediaRecorder(stream);
      recorder.current = media;
      media.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      media.onstop = () => {
        const blob = new Blob(chunks.current, { type: media.mimeType || "audio/webm" });
        setFile(new File([blob], `opportunity-note-${Date.now()}.webm`, { type: blob.type }));
        stream.getTracks().forEach(track => track.stop());
      };
      media.start();
      setRecording(true);
    } catch {
      alert("Microphone access is needed to record an opportunity note. You can upload an audio file instead.");
    }
  };
  const stopRecording = () => { recorder.current?.stop(); setRecording(false); };

  if (isLoading) return <StudioShell eyebrow="Opportunity dossier"><p className="text-sm text-[#647066]">Opening the evidence dossier…</p></StudioShell>;
  if (error || !data) return <StudioShell eyebrow="Opportunity dossier"><Link href="/workspace" className="inline-flex items-center gap-2 text-[12px] font-bold text-[#1b5e3a]"><ArrowLeft className="h-4 w-4" />Return to value field</Link><p className="mt-8 text-sm text-red-700">{error?.message || "Opportunity not found."}</p></StudioShell>;
  const { opportunity, assets, research: researchRun, proofHandoff, indicators, community } = data;
  const generatedBrief = asBrief(opportunity.aiBrief);
  const canAdminister = user?.role === "admin" || governanceProfile?.persona === "sponsor";
  const hasSponsorEconomics = Boolean(opportunity.initialValueLow || opportunity.initialValueHigh || opportunity.costToProve || opportunity.timeToValueMonths);
  const guideSteps = [
    { label: "Source record", detail: assets.length ? `${assets.length} attached source${assets.length === 1 ? "" : "s"}` : "Attach voice or documents", complete: assets.length > 0 },
    { label: "AI brief", detail: generatedBrief ? "Working assumptions visible" : "Generate a bounded brief", complete: Boolean(generatedBrief) },
    { label: "Cited research", detail: researchRun ? `${researchRun.status.replace("_", " ")}` : "Run market validation", complete: researchRun?.status === "complete" },
    { label: "Sponsor value", detail: hasSponsorEconomics ? "Range and proof cost recorded" : "Set value range and proof cost", complete: hasSponsorEconomics },
  ];
  const primaryGuideAction = resolveOpportunityGuideAction(opportunity.status, proofHandoff);

  return <StudioShell eyebrow="Opportunity dossier">
    <Link href="/workspace" className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#617064] hover:text-[#1b5e3a]"><ArrowLeft className="h-4 w-4" />Back to evidence ledger</Link>
    <section className="mt-5 border border-[#d7ddd0] bg-[#fcfbf7] p-5 md:p-7"><div className="grid gap-7 xl:grid-cols-[1.25fr_.75fr]"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#7a837b]">{opportunity.stage.replace("_", " ")} / {opportunity.status}</p><h1 className="mt-2 font-serif text-[38px] leading-[.98] text-[#153526]">{opportunity.title}</h1><p className="mt-4 max-w-2xl text-[14px] leading-6 text-[#516056]">{opportunity.problemStatement}</p><div className="mt-5 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[.1em]"><span className="border border-[#d8e0d0] bg-[#edf1e5] px-2 py-1 text-[#4f674c]">{opportunity.domain || "Open exploration"}</span><span className="border border-[#cfd8d0] bg-white px-2 py-1 text-[#59675d]">{opportunity.targetUser || "Target user to confirm"}</span></div></div><div className="border-t border-[#dfe4da] pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#758078]">Decision posture</p><p className="mt-2 font-serif text-[28px] text-[#1b3829]">{opportunity.initialValueLow || opportunity.initialValueHigh ? `${opportunity.valueCurrency} ${opportunity.initialValueLow || "–"}–${opportunity.initialValueHigh || "–"}` : "Value range to establish"}</p><p className="mt-2 text-[12px] leading-5 text-[#647066]">Confidence is not a verdict. It indicates how much evidence the sponsor can inspect today.</p><div className="mt-5 flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-full text-[19px] font-serif text-[#173d2a]" style={{ background: `radial-gradient(#fcfbf7 58%, transparent 59%), conic-gradient(#1b5e3a ${opportunity.confidence * 3.6}deg,#e2e7dd 0)` }}>{opportunity.confidence}</div><span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#66746a]">Evidence confidence</span></div></div></div></section>

    <section className="mt-5 border border-[#c8d8c5] bg-[#173d2a] p-5 text-[#f8f8f1]"><div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]"><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#b7d1ae]">Decision-to-proof guide</p><h2 className="mt-2 font-serif text-[28px] leading-7">{primaryGuideAction.label}</h2><p className="mt-2 text-[11px] leading-5 text-[#d2dfcd]">{primaryGuideAction.detail} AI can make evidence and assumptions inspectable; only people select, review, and decide.</p>{primaryGuideAction.href ? <Link href={primaryGuideAction.href} className="mt-4 inline-flex h-9 items-center bg-[#f8d41d] px-3 text-[9px] font-bold uppercase tracking-[.1em] text-[#29331f] hover:bg-[#eac30a]"><Rocket className="mr-2 h-3.5 w-3.5" />{primaryGuideAction.label}</Link> : canAdminister ? opportunity.status === "selected" ? <Button disabled={createHackathon.isPending} onClick={() => createHackathon.mutate({ opportunityId, title: `${opportunity.title} proof sprint`, tagline: "Evidence-led proof work from the Value Fieldbook" })} className="mt-4 h-9 rounded-none bg-[#f8d41d] text-[9px] font-bold uppercase tracking-[.1em] text-[#29331f] hover:bg-[#eac30a]"><Rocket className="mr-2 h-3.5 w-3.5" />Launch proof sprint</Button> : <Button disabled={selection.isPending} onClick={() => selection.mutate({ opportunityId, status: "selected" })} className="mt-4 h-9 rounded-none bg-[#f8d41d] text-[9px] font-bold uppercase tracking-[.1em] text-[#29331f] hover:bg-[#eac30a]"><CheckCircle2 className="mr-2 h-3.5 w-3.5" />Select opportunity</Button> : <p className="mt-4 text-[10px] uppercase tracking-[.09em] text-[#b7d1ae]">Sponsor controls appear for authorized owners.</p>}{(selection.error || createHackathon.error) && <p className="mt-3 text-[11px] text-[#ffb8ad]">{selection.error?.message || createHackathon.error?.message}</p>}</div><div className="grid gap-px border border-[#52745a] bg-[#52745a] sm:grid-cols-2">{guideSteps.map((step, index) => <div key={step.label} className={`min-h-24 bg-[#173d2a] p-3 ${step.complete ? "bg-[#204834]" : ""}`}><p className="text-[8px] font-bold uppercase tracking-[.12em] text-[#b7d1ae]">0{index + 1} · {step.complete ? "linked" : "open"}</p><p className="mt-3 text-[13px] font-bold text-white">{step.label}</p><p className="mt-1 text-[10px] leading-4 text-[#d0ddca]">{step.detail}</p></div>)}</div></div></section>

    <ValueCaseCockpit opportunity={opportunity} indicators={indicators} canAdminister={canAdminister} proofReadiness={proofReadiness} community={community} />

    <SpecialistReviewPlan opportunityId={opportunityId} />

    <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><article className="border border-[#d7ddd0] bg-[#fcfbf7] p-5"><div className="flex items-center gap-2 text-[#1b5e3a]"><AudioLines className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[.15em]">2 / voice and document evidence</p></div><h2 className="mt-2 font-serif text-[25px] text-[#1b3829]">Let the contributor explain the opportunity.</h2><p className="mt-2 text-[12px] leading-5 text-[#647066]">Record a short voice note or attach a supporting file. The original asset stays linked to the exact transcript or extraction created from it.</p><div className="mt-5 border-y border-[#e2e6dd] py-4"><div className="flex flex-wrap items-center gap-3"><Button type="button" onClick={recording ? stopRecording : beginRecording} className={`h-10 rounded-none text-[10px] font-bold uppercase tracking-[.12em] ${recording ? "bg-[#9c3d2f] hover:bg-[#7b2e23]" : "bg-[#173d2a] hover:bg-[#0e2b1e]"}`}>{recording ? <><Pause className="mr-2 h-4 w-4" />Stop recording</> : <><Mic className="mr-2 h-4 w-4" />Speak about it</>}</Button><label className="inline-flex h-10 cursor-pointer items-center gap-2 border border-[#cbd5c7] bg-white px-3 text-[10px] font-bold uppercase tracking-[.11em] text-[#45584b] hover:bg-[#f5f7f1]"><FileUp className="h-4 w-4" />Upload source<input type="file" accept="audio/*,.txt,.md,.csv,.pdf,.docx" className="hidden" onChange={event => setFile(event.target.files?.[0] || null)} /></label>{file && <span className="max-w-[210px] truncate text-[11px] text-[#56655a]">{file.name}</span>}</div><label className="mt-4 flex items-start gap-2 text-[11px] leading-4 text-[#59675d]"><input type="checkbox" checked={uploadConsent} onChange={event => setUploadConsent(event.target.checked)} className="mt-0.5 accent-[#1b5e3a]" />I confirm I am authorized to process this material and consent to transcription or extraction for this opportunity record.</label><Button disabled={!file || !uploadConsent || upload.isPending} onClick={uploadFile} variant="outline" className="mt-4 h-9 rounded-none border-[#1b5e3a] text-[10px] font-bold uppercase tracking-[.12em] text-[#1b5e3a] hover:bg-[#eaf2e7]">{upload.isPending ? "Processing…" : "Attach and process"}</Button>{upload.error && <p className="mt-2 text-[11px] text-red-700">{upload.error.message}</p>}</div><div className="space-y-3 pt-4">{assets.length ? assets.map(asset => <div key={asset.id} className="border border-[#e0e4db] bg-[#f8f8f3] p-3"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold text-[#304536]">{asset.originalName}</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-[#758077]">{asset.assetType} · {asset.contributorConfirmed ? "confirmed source" : "awaiting confirmation"}</p></div>{!asset.contributorConfirmed && <Button onClick={() => confirm.mutate({ opportunityId, assetId: asset.id })} variant="outline" className="h-7 rounded-none border-[#b8cfb2] text-[9px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]"><CheckCircle2 className="mr-1 h-3 w-3" />Confirm</Button>}</div>{asset.transcript && <p className="mt-3 border-l-2 border-[#c89412] pl-3 text-[11px] leading-5 text-[#56655a]">{asset.transcript}</p>}</div>) : <p className="py-4 text-center text-[12px] text-[#758077]">No supporting material is attached yet.</p>}</div></article>
      <article className="border border-[#c9d4c7] bg-[#173d2a] p-5 text-[#f9f8f1]"><div className="flex items-center gap-2 text-[#d8e9d3]"><Sparkles className="h-4 w-4 text-[#ffd928]" /><p className="text-[10px] font-bold uppercase tracking-[.15em]">3 / AI synthesis</p></div><h2 className="mt-2 font-serif text-[25px] leading-7">Make the assumptions visible.</h2><p className="mt-2 text-[12px] leading-5 text-[#d0dfc9]">The Intake Agent summarizes confirmed source material into a working brief. It does not create evidence or set investment value.</p><Button disabled={brief.isPending} onClick={() => brief.mutate({ opportunityId })} className="mt-5 h-10 rounded-none bg-[#f8d41d] text-[10px] font-bold uppercase tracking-[.12em] text-[#29331f] hover:bg-[#eac30a]"><Bot className="mr-2 h-4 w-4" />{brief.isPending ? "Synthesizing…" : "Generate working brief"}</Button>{brief.error && <p className="mt-3 text-[11px] text-[#ffb8ad]">{brief.error.message}</p>}{generatedBrief && <div className="mt-5 border-t border-[#6f9671]/50 pt-4"><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#b6d0ae]">Current AI brief</p><p className="mt-2 text-[12px] leading-5 text-[#e0eadb]">{String(generatedBrief.valueHypothesis || "Value hypothesis to review")}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#b6d0ae]">Assumptions</p><p className="mt-1 text-[11px] leading-4 text-[#d0dfc9]">{Array.isArray(generatedBrief.assumptions) ? generatedBrief.assumptions.slice(0, 3).join(" · ") : "None listed"}</p></div><div><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#b6d0ae]">Evidence gaps</p><p className="mt-1 text-[11px] leading-4 text-[#d0dfc9]">{Array.isArray(generatedBrief.evidenceGaps) ? generatedBrief.evidenceGaps.slice(0, 3).join(" · ") : "None listed"}</p></div></div></div>}</article>
    </section>

    {researchRun && <OpportunityResearchDossier research={researchRun} />}

    <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><article className="border border-[#d7ddd0] bg-[#fcfbf7] p-5"><div className="flex items-center gap-2 text-[#1b5e3a]"><FolderSearch className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[.15em]">4 / cited opportunity research</p></div><h2 className="mt-2 font-serif text-[25px] text-[#1b3829]">Look outward before you build.</h2><p className="mt-2 text-[12px] leading-5 text-[#647066]">The Research Agent searches public sources for potentially similar offerings, relevant precedents, and possible differentiation. It provides source links—not legal or novelty conclusions.</p><label className="mt-4 flex items-start gap-2 text-[11px] leading-4 text-[#59675d]"><input type="checkbox" checked={researchConsent} onChange={event => setResearchConsent(event.target.checked)} className="mt-0.5 accent-[#1b5e3a]" />I confirm the opportunity description may be used within the approved public-research scope.</label><Button disabled={!researchConsent || research.isPending} onClick={() => research.mutate({ opportunityId, consent: researchConsent })} className="mt-4 h-10 rounded-none bg-[#173d2a] text-[10px] font-bold uppercase tracking-[.12em] hover:bg-[#0e2b1e]"><Play className="mr-2 h-3.5 w-3.5" />{research.isPending ? "Researching…" : "Run source-backed research"}</Button>{research.error && <p className="mt-3 text-[11px] text-red-700">{research.error.message}</p>}{researchRun && <div className="mt-5 border-t border-[#e2e6dd] pt-4"><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#758077]">Research result / {researchRun.status.replace("_", " ")}</p><p className="mt-2 text-[12px] leading-5 text-[#45594a]">{researchRun.summary}</p>{researchRun.sources.map(source => <a href={source.url} target="_blank" rel="noreferrer" key={source.id} className="mt-3 block border-l-2 border-[#c89412] bg-[#fffdf2] p-3 hover:bg-[#fff7da]"><p className="text-[11px] font-bold text-[#314837]">{source.title}</p><p className="mt-1 text-[10px] leading-4 text-[#66746a]">{source.relevance}</p><p className="mt-1 truncate text-[9px] text-[#78847a]">{source.url}</p></a>)}<p className="mt-3 text-[10px] leading-4 text-[#7a837b]">Limitations: {researchRun.limitations}</p></div>}</article>
      <article className="border border-[#d7ddd0] bg-[#f0f1e7] p-5"><div className="flex items-center gap-2 text-[#4f674c]"><ShieldCheck className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[.15em]">5 / investment and proof gate</p></div><h2 className="mt-2 font-serif text-[25px] text-[#1b3829]">Select the proof worth running.</h2><p className="mt-2 text-[12px] leading-5 text-[#647066]">A sponsor’s selection preserves the source opportunity and turns it into a time-boxed proof sprint. The hackathon never erases the original value case.</p><div className="mt-5 border-y border-[#d7ddd0] py-4"><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#758077]">Indicator history</p>{indicators.length ? indicators.slice(0, 3).map(indicator => <div key={indicator.id} className="mt-3 flex items-start justify-between gap-3"><span><b className="block text-[11px] text-[#314837]">{indicator.label}</b><small className="text-[10px] text-[#758077]">{indicator.evidence}</small></span><strong className="text-[12px] text-[#1b5e3a]">{indicator.value} {indicator.unit}</strong></div>) : <p className="mt-2 text-[11px] text-[#758077]">No indicator change is recorded without evidence.</p>}</div>{canAdminister ? <div className="mt-5"><div className="flex flex-wrap gap-2"><Button disabled={selection.isPending} onClick={() => selection.mutate({ opportunityId, status: "selected" })} className="h-9 rounded-none bg-[#173d2a] text-[10px] font-bold uppercase tracking-[.11em] hover:bg-[#0e2b1e]">Select opportunity</Button><Button disabled={selection.isPending} variant="outline" onClick={() => selection.mutate({ opportunityId, status: "deferred" })} className="h-9 rounded-none text-[10px] font-bold uppercase tracking-[.11em]">Defer</Button></div>{opportunity.status === "selected" && <Button disabled={createHackathon.isPending} onClick={() => createHackathon.mutate({ opportunityId, title: `${opportunity.title} proof sprint`, tagline: "Evidence-led proof work from the Value Fieldbook" })} className="mt-3 h-10 rounded-none bg-[#f8d41d] text-[10px] font-bold uppercase tracking-[.12em] text-[#29331f] hover:bg-[#eac30a]"><Rocket className="mr-2 h-4 w-4" />Launch proof sprint</Button>}{(selection.error || createHackathon.error) && <p className="mt-2 text-[11px] text-red-700">{selection.error?.message || createHackathon.error?.message}</p>}</div> : <p className="mt-5 text-[11px] leading-5 text-[#69756b]">Sponsor and organizer controls appear here for authorized users. The evidence record remains available to its contributor.</p>}</article>
    </section>
  </StudioShell>;
}
