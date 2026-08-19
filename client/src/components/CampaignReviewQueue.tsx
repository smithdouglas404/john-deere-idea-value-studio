import { useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, MessageSquareText, ThumbsUp, TrendingUp } from "lucide-react";
import { CampaignAssessmentEvidence } from "@/components/CampaignAssessmentEvidence";
import { Button } from "@/components/ui/button";
import { isEligibleForHackathonPreparation, summarizeAssessments } from "@/lib/campaignReview";
import { trpc } from "@/lib/trpc";

type CaseRecord = { id: number; title: string; status: string; investmentThesis: string };
type Assessment = { investmentCaseId: number; submittedById: number; stance: "go" | "hold" | "no_go" | "potential"; valuationScore: number; likes: string; improvements: string; rationale: string };
type Review = { investmentCaseId: number; managerId: number; decision: "advance" | "return_for_enrichment" | "hold" | "decline"; rationale: string };

export function CampaignReviewQueue({ campaignId, cases, assessments, reviews, viewerId, viewerCanManage }: { campaignId: number; cases: CaseRecord[]; assessments: Assessment[]; reviews: Review[]; viewerId: number; viewerCanManage: boolean }) {
  const utils = trpc.useUtils();
  const [caseId, setCaseId] = useState<number>(cases[0]?.id || 0);
  const [stance, setStance] = useState<"go" | "hold" | "no_go" | "potential">("go");
  const [valuationScore, setValuationScore] = useState("3");
  const [likes, setLikes] = useState("");
  const [improvements, setImprovements] = useState("");
  const [rationale, setRationale] = useState("");
  const [managerCaseId, setManagerCaseId] = useState<number | null>(null);
  const [decision, setDecision] = useState<Review["decision"]>("advance");
  const [managerRationale, setManagerRationale] = useState("");
  const saveAssessment = trpc.studio.saveCampaignAssessment.useMutation({ onSuccess: () => { utils.studio.campaignWorkspace.invalidate({ campaignId }); setLikes(""); setImprovements(""); setRationale(""); } });
  const recordReview = trpc.studio.recordIncubationReview.useMutation({ onSuccess: () => { utils.studio.campaignWorkspace.invalidate({ campaignId }); setManagerCaseId(null); setManagerRationale(""); } });
  const summaries = useMemo(() => new Map(cases.map(item => [item.id, summarizeAssessments(assessments.filter(entry => entry.investmentCaseId === item.id))])), [cases, assessments]);
  const myAssessment = assessments.find(entry => entry.investmentCaseId === caseId && entry.submittedById === viewerId);
  const currentCaseAssessments = assessments.filter(entry => entry.investmentCaseId === caseId);

  return <section id="community-review" className="mt-8 border border-[#d9ded2] bg-[#fffdf8] p-6 md:p-8">
    <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6f7e70]">Community incubation & voting</p>
    <h2 className="mt-2 font-serif text-3xl text-[#173d2a]">Community sentiment, explicit voting, and manager review.</h2>
    <p className="mt-3 max-w-4xl text-sm leading-6 text-[#58675b]">Contributors vote Yes (Go), No (No-go), Hold, or Potential, providing transparent qualitative feedback and value confidence before executive selection.</p>
    
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <div className="space-y-6">
        <form onSubmit={event => { event.preventDefault(); saveAssessment.mutate({ campaignId, investmentCaseId: caseId, stance: stance === "potential" ? "go" : stance, valuationScore: Number(valuationScore), likes: likes.trim() || "Approved direction", improvements: improvements.trim() || "None noted", rationale: rationale.trim() || "Community vote submitted" }); }} className="border border-[#d9ded2] bg-[#f4f7f1] p-5">
          <div className="flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-[#876e16]" /><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#627363]">Cast your vote & feedback</p></div>
          <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#526456]">Select opportunity<select value={caseId} onChange={event => setCaseId(Number(event.target.value))} className="mt-2 h-10 w-full border border-[#cbd6c8] bg-white px-3 text-sm font-normal text-[#173d2a]">{cases.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#526456]">Your vote</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <button type="button" onClick={() => setStance("go")} className={`h-10 text-xs font-bold uppercase tracking-[.1em] border ${stance === "go" ? "bg-[#1b5e3a] text-white border-[#1b5e3a]" : "bg-white text-[#173d2a] border-[#cbd6c8]"}`}>Yes (Go)</button>
              <button type="button" onClick={() => setStance("potential")} className={`h-10 text-xs font-bold uppercase tracking-[.1em] border ${stance === "potential" ? "bg-[#876e16] text-white border-[#876e16]" : "bg-white text-[#173d2a] border-[#cbd6c8]"}`}>Potential</button>
              <button type="button" onClick={() => setStance("hold")} className={`h-10 text-xs font-bold uppercase tracking-[.1em] border ${stance === "hold" ? "bg-[#b8860b] text-white border-[#b8860b]" : "bg-white text-[#173d2a] border-[#cbd6c8]"}`}>Hold</button>
              <button type="button" onClick={() => setStance("no_go")} className={`h-10 text-xs font-bold uppercase tracking-[.1em] border ${stance === "no_go" ? "bg-[#8b0000] text-white border-[#8b0000]" : "bg-white text-[#173d2a] border-[#cbd6c8]"}`}>No</button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[10px] font-bold uppercase tracking-[.1em] text-[#526456]">Value confidence (1–5)<select value={valuationScore} onChange={event => setValuationScore(event.target.value)} className="mt-2 h-10 w-full border border-[#cbd6c8] bg-white px-3 text-sm font-normal text-[#173d2a]">{[1,2,3,4,5].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          </div>
          <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#526456]">What do you like?<textarea value={likes} onChange={event => setLikes(event.target.value)} className="mt-2 min-h-20 w-full border border-[#cbd6c8] bg-white p-3 text-sm font-normal leading-6 text-[#173d2a]" placeholder="Describe opportunity value or evidence..." /></label>
          <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.1em] text-[#526456]">What should improve?<textarea value={improvements} onChange={event => setImprovements(event.target.value)} className="mt-2 min-h-20 w-full border border-[#cbd6c8] bg-white p-3 text-sm font-normal leading-6 text-[#173d2a]" placeholder="Identify risks or refinements..." /></label>
          <Button type="submit" disabled={saveAssessment.isPending || !caseId} className="mt-4 h-10 rounded-none bg-[#173d2a] text-[9px] font-bold uppercase tracking-[.1em]">{saveAssessment.isPending ? "Submitting vote…" : "Submit vote & feedback"}</Button>
        </form>

        <div className="border border-[#d9ded2] bg-white p-5">
          <div className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-[#876e16]" /><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#627363]">Live Community Feedback Feed ({currentCaseAssessments.length})</p></div>
          <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
            {currentCaseAssessments.length === 0 ? <p className="text-xs text-[#718075]">No community feedback yet for this opportunity. Be the first to vote and comment.</p> : currentCaseAssessments.map((entry, index) => <div key={index} className="border-b border-[#e5e9df] pb-3 text-xs leading-5 text-[#425246]"><div className="flex items-center justify-between"><span className="font-semibold uppercase tracking-wider text-[#173d2a]">{entry.stance} stance · {entry.valuationScore}/5 confidence</span></div><p className="mt-1"><b>Supports:</b> {entry.likes}</p><p className="mt-1"><b>Refine:</b> {entry.improvements}</p></div>)}
          </div>
        </div>
      </div>

      <div className="border border-[#d9ded2] bg-white p-5">
        <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#876e16]" /><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#627363]">Innovation Review Queue & Executive Gate</p></div>
        <p className="mt-2 text-xs leading-5 text-[#58675b]">Executive owners review aggregated sentiment and advance items into hackathon preparation.</p>
        <div className="mt-4 space-y-3">
          {cases.map(item => {
            const summary = summaries.get(item.id)!;
            const review = reviews.find(entry => entry.investmentCaseId === item.id);
            const reviewing = managerCaseId === item.id;
            return <article key={item.id} className="border border-[#dbe1d8] bg-[#fbfaf6] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-semibold text-[#173d2a]">{item.title}</p><p className="mt-1 text-xs leading-5 text-[#647166]">{item.investmentThesis}</p></div>
                <span className="text-[9px] font-bold uppercase tracking-[.1em] text-[#6f7e70]">{review ? review.decision.replace(/_/g, " ") : "awaiting review"}</span>
              </div>
              <div className="mt-3 grid gap-px border border-[#d7dfd2] bg-[#d7dfd2] sm:grid-cols-3">
                <div className="bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#6f7e70]">Votes</p><p className="mt-1 text-sm font-semibold text-[#173d2a]">{summary.records.length}</p></div>
                <div className="bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#6f7e70]">Confidence</p><p className="mt-1 text-sm font-semibold text-[#173d2a]">{summary.average ? `${summary.average.toFixed(1)} / 5` : "N/A"}</p></div>
                <div className="bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#6f7e70]">Stance</p><p className="mt-1 text-xs font-semibold text-[#173d2a]">{summary.go} yes · {summary.hold} hold · {summary.noGo} no</p></div>
              </div>
              {viewerCanManage && <div className="mt-3">
                {!reviewing ? <Button type="button" onClick={() => { setManagerCaseId(item.id); setDecision(review?.decision || "advance"); setManagerRationale(review?.rationale || ""); }} className="h-9 rounded-none bg-[#173d2a] text-[9px] font-bold uppercase tracking-[.1em]">Open Executive Review</Button> : <div className="border-t border-[#dbe1d8] pt-3"><div className="grid gap-3 sm:grid-cols-[180px_1fr]"><select value={decision} onChange={event => setDecision(event.target.value as typeof decision)} className="h-10 border border-[#cbd6c8] bg-white px-3 text-sm text-[#173d2a]"><option value="advance">Advance to hackathon</option><option value="return_for_enrichment">Return for enrichment</option><option value="hold">Hold</option><option value="decline">Decline</option></select><input value={managerRationale} onChange={event => setManagerRationale(event.target.value)} className="h-10 border border-[#cbd6c8] bg-white px-3 text-sm text-[#173d2a]" placeholder="Executive review rationale" /></div><Button type="button" onClick={() => recordReview.mutate({ investmentCaseId: item.id, decision, rationale: managerRationale })} disabled={recordReview.isPending || managerRationale.trim().length < 5} className="mt-3 h-9 rounded-none bg-[#1b5e3a] text-[9px] font-bold uppercase tracking-[.1em]">{recordReview.isPending ? "Saving…" : "Record Executive Decision"}</Button></div>}
              </div>}
            </article>;
          })}
        </div>
      </div>
    </div>
    <CampaignAssessmentEvidence cases={cases} assessments={assessments} />
  </section>;
}
