import { useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, FileText, Gavel, Lightbulb, Loader2, MessageSquareText, Paperclip, Scale, Send, Settings2, UsersRound } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cleanJourney } from "@/lib/cleanJourney";

type CampaignCase = {
  id: number;
  title: string;
  status: string;
  problemStatement: string;
  financialDetail?: Record<string, unknown> | null;
};

type CaseAsset = {
  id: number;
  investmentCaseId: number;
  originalName: string;
  assetType: string;
  storageUrl: string;
};

type CampaignSignal = {
  id: number;
  investmentCaseId: number | null;
  signalType: string;
  content: string;
};

type SharedEvent = { id: number; title: string; status: string } | null;

type Props = {
  campaignId: number;
  cases: CampaignCase[];
  caseAssets: CaseAsset[];
  signals: CampaignSignal[];
  sharedEvent: SharedEvent;
  viewerCanManage: boolean;
  onChanged: () => void;
};

const stageDefinitions = [
  { id: "01", label: "Crowd signal", detail: "Anyone in the campaign can submit a problem, intended value, and supporting context.", icon: Lightbulb },
  { id: "02", label: "Community evidence", detail: "People endorse, comment, offer evidence, and record a go / hold / no-go assessment.", icon: UsersRound },
  { id: "03", label: "Human selection", detail: "The manager review queue decides which cases are ready for a controlled proof.", icon: Scale },
  { id: "04", label: "Hackathon command", detail: "The organizer defines dates, rules, artifacts, rubric, and judging windows for the event.", icon: Settings2 },
  { id: "05", label: "Proof and judge", detail: "Selected cases inherit their context into repository-backed proof work and human judging.", icon: Gavel },
  { id: "06", label: "Investment gate", detail: "Winner certification and the executive gate return to the original investment case.", icon: CheckCircle2 },
] as const;

function countSignals(signals: CampaignSignal[], caseId: number, type?: string) {
  return signals.filter(signal => signal.investmentCaseId === caseId && (!type || signal.signalType === type)).length;
}

export function summarizeCampaignOrchestration({ cases, signals, sharedEvent }: { cases: CampaignCase[]; signals: CampaignSignal[]; sharedEvent: SharedEvent }) {
  const totalComments = signals.filter(signal => signal.signalType === "comment").length;
  const totalEndorsements = signals.filter(signal => signal.signalType === "endorsement").length;
  const selectedCount = cases.filter(item => item.status === "approved_for_proof").length;
  const readiness = [
    cases.length > 0,
    totalComments + totalEndorsements > 0,
    cases.some(item => ["approved_for_proof", "returned", "archived"].includes(item.status)),
    Boolean(sharedEvent),
    selectedCount > 0,
  ];
  return { totalComments, totalEndorsements, selectedCount, readiness, completedStages: readiness.filter(Boolean).length };
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Could not read the selected document."));
    reader.readAsDataURL(file);
  });
}

export function CampaignOrchestrationGuide({ campaignId, cases, caseAssets, signals, sharedEvent, viewerCanManage, onChanged }: Props) {
  const utils = trpc.useUtils();
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaProblem, setIdeaProblem] = useState("");
  const [ideaValue, setIdeaValue] = useState("");
  const [ideaContext, setIdeaContext] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(cases[0]?.id || null);
  const [assetType, setAssetType] = useState<"business_plan" | "financial_model" | "research" | "technical_document" | "other">("business_plan");
  const [uploadError, setUploadError] = useState("");
  const uploadInput = useRef<HTMLInputElement>(null);
  const submitIdea = trpc.studio.submitCrowdIdea.useMutation({ onSuccess: result => { setSelectedCaseId(result.id); setIdeaOpen(false); setIdeaTitle(""); setIdeaProblem(""); setIdeaValue(""); setIdeaContext(""); onChanged(); } });
  const uploadAsset = trpc.studio.uploadInvestmentCaseAsset.useMutation({ onSuccess: () => { setUploadError(""); onChanged(); } });

  const selectedCase = useMemo(() => cases.find(item => item.id === selectedCaseId) || null, [cases, selectedCaseId]);
  const selectedAssets = caseAssets.filter(asset => asset.investmentCaseId === selectedCase?.id);
  const { totalComments, totalEndorsements, selectedCount, completedStages } = summarizeCampaignOrchestration({ cases, signals, sharedEvent });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    submitIdea.mutate({ campaignId, title: ideaTitle.trim(), problemStatement: ideaProblem.trim(), intendedValue: ideaValue.trim(), authorContext: ideaContext.trim() || undefined });
  }

  async function uploadDocument(file: File) {
    if (!selectedCase) return;
    setUploadError("");
    try {
      const base64 = await fileToBase64(file);
      uploadAsset.mutate({ investmentCaseId: selectedCase.id, assetType, fileName: file.name, mimeType: file.type || "application/octet-stream", base64, consent: true });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not read the selected document.");
    }
  }

  return <section className="mt-8 border border-[#b9cdb8] bg-[#173d2a] p-5 text-[#f9f8f1] md:p-7" aria-labelledby="orchestration-title">
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#b9d3b1]">Hackathon operating path</p>
        <h2 id="orchestration-title" className="mt-2 max-w-4xl font-serif text-[30px] leading-tight md:text-[38px]">Crowdsource the signal. Govern the selection. Prove the investment.</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[#d2e0cb]">This is the control plane for the whole journey. Ideas do not jump straight into a hackathon: they are enriched by the community, reviewed by an accountable human, configured into a bounded proof event, judged, and returned to an executive investment gate.</p>
      </div>
      <div className="min-w-[180px] border border-[#557660] bg-[#214b35] p-4"><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#b9d3b1]">Flow readiness</p><p className="mt-1 font-serif text-3xl text-white">{completedStages}/5</p><p className="text-[10px] text-[#d2e0cb]">visible gates progressed</p></div>
    </div>
    <div className="mt-6 grid gap-px border border-[#486a54] bg-[#486a54] md:grid-cols-3 xl:grid-cols-6">
      {stageDefinitions.map((stage, index) => { const Icon = stage.icon; const complete = index < completedStages; return <div key={stage.id} className={`min-h-40 bg-[#173d2a] p-4 ${complete ? "bg-[#214b35]" : ""}`}><div className="flex items-center justify-between"><span className="text-[9px] font-bold tracking-[.14em] text-[#a9c8a1]">{stage.id}</span><Icon className={`h-4 w-4 ${complete ? "text-[#f8d41d]" : "text-[#83a58a]"}`} /></div><p className="mt-5 text-[9px] font-bold uppercase tracking-[.12em] text-[#c0d8b9]">{complete ? "Progress recorded" : index === completedStages ? "Current gate" : "Next"}</p><h3 className="mt-1 font-serif text-[20px] text-white">{stage.label}</h3><p className="mt-1 text-[10px] leading-4 text-[#cfddc9]">{stage.detail}</p></div>; })}
    </div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="border border-[#557660] bg-[#214b35] p-5">
        <p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#b9d3b1]">Crowd intake</p>
        <h3 className="mt-2 font-serif text-2xl text-white">Submit a new opportunity</h3>
        <p className="mt-2 text-xs leading-5 text-[#d2e0cb]">This creates a traceable submitted case in the campaign. It is not an automatic hackathon entry or an investment decision.</p>
        <Button type="button" onClick={() => setIdeaOpen(value => !value)} className="mt-4 h-10 rounded-none bg-[#f7f5ed] text-[9px] font-bold uppercase tracking-[.12em] text-[#173d2a] hover:bg-white"><Send className="mr-2 h-3.5 w-3.5" />{ideaOpen ? "Close idea form" : "Submit crowd idea"}</Button>
        {ideaOpen && <form onSubmit={submit} className="mt-5 space-y-3 border-t border-[#557660] pt-5"><label className="block text-[9px] font-bold uppercase tracking-[.12em] text-[#c0d8b9]">Idea title<input required value={ideaTitle} onChange={event => setIdeaTitle(event.target.value)} className="mt-2 h-10 w-full border border-[#b9cdb8] bg-white px-3 text-sm font-normal text-[#173d2a]" placeholder="Name the opportunity" /></label><label className="block text-[9px] font-bold uppercase tracking-[.12em] text-[#c0d8b9]">Problem to solve<textarea required value={ideaProblem} onChange={event => setIdeaProblem(event.target.value)} className="mt-2 min-h-24 w-full border border-[#b9cdb8] bg-white p-3 text-sm font-normal text-[#173d2a]" placeholder="What customer, employee, process, or cost problem is visible?" /></label><label className="block text-[9px] font-bold uppercase tracking-[.12em] text-[#c0d8b9]">Intended value<textarea required value={ideaValue} onChange={event => setIdeaValue(event.target.value)} className="mt-2 min-h-24 w-full border border-[#b9cdb8] bg-white p-3 text-sm font-normal text-[#173d2a]" placeholder="What higher-value work, efficiency, growth, or transformation could this enable?" /></label><label className="block text-[9px] font-bold uppercase tracking-[.12em] text-[#c0d8b9]">Additional context (optional)<textarea value={ideaContext} onChange={event => setIdeaContext(event.target.value)} className="mt-2 min-h-20 w-full border border-[#b9cdb8] bg-white p-3 text-sm font-normal text-[#173d2a]" placeholder="Customer signal, initial economics, related initiative, or question." /></label>{submitIdea.error && <p className="text-xs text-[#ffd2c9]">{submitIdea.error.message}</p>}<Button disabled={submitIdea.isPending} className="h-10 w-full rounded-none bg-[#f8d41d] text-[9px] font-bold uppercase tracking-[.12em] text-[#173d2a]">{submitIdea.isPending ? "Submitting idea…" : "Submit for community review"}</Button></form>}
      </div>
      <div className="border border-[#557660] bg-[#173d2a] p-5"><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#b9d3b1]">Live campaign control</p><div className="mt-3 grid gap-px border border-[#486a54] bg-[#486a54] sm:grid-cols-4"><Metric label="Submitted cases" value={String(cases.length)} /><Metric label="Comments" value={String(totalComments)} /><Metric label="Endorsements" value={String(totalEndorsements)} /><Metric label="Selected proofs" value={String(selectedCount)} /></div><div className="mt-5 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-[.11em]"><a href="#community-review" className="text-[#f8d41d]">Review community input</a>{viewerCanManage && <a href="#hackathon-command" className="text-[#c0d8b9]">Open admin command center</a>}{sharedEvent && <Link href={cleanJourney.event(sharedEvent.id)} className="inline-flex items-center text-[#c0d8b9]">View event <ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>}</div></div>
    </div>
    <div className="mt-6 border-t border-[#557660] pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#b9d3b1]">Upfront document evidence</p><p className="mt-1 text-xs leading-5 text-[#d2e0cb]">Attach a business plan, financial model, market research, or technical document to the selected case. These files remain linked when the case is selected into proof.</p></div>{selectedCase && <select value={selectedCase.id} onChange={event => setSelectedCaseId(Number(event.target.value))} className="h-10 min-w-[220px] border border-[#b9cdb8] bg-white px-3 text-xs text-[#173d2a]"><option value="">Select case to attach evidence</option>{cases.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>}</div>{selectedCase && <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]"><div className="border border-[#557660] bg-[#214b35] p-4"><p className="text-sm font-semibold text-white">{selectedCase.title}</p><p className="mt-1 text-xs leading-5 text-[#d2e0cb]">{selectedCase.problemStatement}</p><div className="mt-3 flex flex-wrap gap-2">{selectedAssets.length ? selectedAssets.map(asset => <a key={asset.id} href={asset.storageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-[#78917c] px-2.5 py-1.5 text-[10px] text-[#f7f5ed] hover:border-[#f8d41d]"><FileText className="h-3.5 w-3.5 text-[#f8d41d]" />{asset.originalName}</a>) : <span className="text-xs text-[#b9d3b1]">No supporting documents attached yet.</span>}</div></div><div className="flex min-w-[250px] flex-col gap-2"><select value={assetType} onChange={event => setAssetType(event.target.value as typeof assetType)} className="h-10 border border-[#b9cdb8] bg-white px-3 text-xs text-[#173d2a]"><option value="business_plan">Business plan</option><option value="financial_model">Financial model</option><option value="research">Market research</option><option value="technical_document">Technical document</option><option value="other">Other</option></select><input ref={uploadInput} type="file" accept=".txt,.md,.csv,.pdf,.docx" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadDocument(file); }} className="block w-full text-[10px] text-[#d2e0cb] file:mr-3 file:border-0 file:bg-[#f7f5ed] file:px-3 file:py-2 file:text-[9px] file:font-bold file:uppercase file:text-[#173d2a]" />{uploadAsset.isPending && <p className="flex items-center gap-2 text-xs text-[#d2e0cb]"><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading and linking document…</p>}{uploadError && <p className="text-xs text-[#ffd2c9]">{uploadError}</p>}{uploadAsset.error && <p className="text-xs text-[#ffd2c9]">{uploadAsset.error.message}</p>}<p className="text-[10px] leading-4 text-[#b9d3b1]">Up to 8 MB. Consent is captured for document processing. The system stores the file; it does not invent financial outcomes.</p></div></div>}</div>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="bg-[#214b35] p-3"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#b9d3b1]">{label}</p><p className="mt-1 font-serif text-2xl text-white">{value}</p></div>;
}
