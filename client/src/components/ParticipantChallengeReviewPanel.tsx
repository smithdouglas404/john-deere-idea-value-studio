import { useState } from "react";
import { CheckCircle2, MessageSquareWarning, SearchCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Challenge = {
  id: number;
  claimReference: string;
  explanation: string;
  status: "open" | "under_review" | "resolved" | "declined";
  response: string | null;
  createdAt: Date | string;
  resolvedAt: Date | string | null;
};

export function ParticipantChallengeReviewPanel({ challenges, isPending, error, onRespond }: { challenges: Challenge[]; isPending: boolean; error?: { message: string } | null; onRespond: (input: { objectionId: number; status: "under_review" | "resolved" | "declined"; response: string }) => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [response, setResponse] = useState("");
  const selected = challenges.find(challenge => challenge.id === selectedId) || null;
  const begin = (challenge: Challenge) => { setSelectedId(challenge.id); setResponse(challenge.response || ""); };
  const submit = (status: "under_review" | "resolved" | "declined") => {
    if (!selected || response.trim().length < 10) return;
    onRespond({ objectionId: selected.id, status, response: response.trim() });
  };
  return <section className="mt-5 border border-[#d8cfb4] bg-[#fffaf0] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[#876e16]"><MessageSquareWarning className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[.14em]">Participant challenge review</p></div><h2 className="mt-2 font-serif text-[25px] text-[#1b3829]">Respond to cited evidence, not a vague appeal.</h2><p className="mt-2 max-w-2xl text-[11px] leading-5 text-[#647066]">A response records the human interpretation of a specific cited claim or specialist finding. It does not revise a human scorecard automatically.</p></div><span className="border border-[#e1cf8a] bg-[#fff4cf] px-3 py-2 text-[9px] font-bold uppercase tracking-[.1em] text-[#765d12]">{challenges.length} received</span></div>{challenges.length ? <div className="mt-5 grid gap-5 xl:grid-cols-[.92fr_1.08fr]"><div className="space-y-3">{challenges.map(challenge => <button type="button" key={challenge.id} onClick={() => begin(challenge)} className={`w-full border p-4 text-left ${selectedId === challenge.id ? "border-[#876e16] bg-[#fff4cf]" : "border-[#e8ddbf] bg-white hover:bg-[#fffdf6]"}`}><div className="flex items-start justify-between gap-3"><p className="text-[10px] font-bold text-[#1b3829]">{challenge.claimReference}</p><span className="text-[8px] font-bold uppercase tracking-[.1em] text-[#765d12]">{challenge.status.replace(/_/g, " ")}</span></div><p className="mt-2 text-[10px] leading-4 text-[#59675d]">{challenge.explanation}</p><p className="mt-3 text-[9px] uppercase tracking-[.08em] text-[#7b847c]">{new Date(challenge.createdAt).toLocaleString()}</p></button>)}</div><aside className="border border-[#e8ddbf] bg-white p-4">{selected ? <><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#876e16]">Human response for {selected.claimReference}</p><p className="mt-2 text-[11px] leading-5 text-[#536254]">{selected.explanation}</p><label className="mt-4 block text-[9px] font-bold uppercase tracking-[.12em] text-[#758077]">Reasoned response<textarea value={response} onChange={event => setResponse(event.target.value)} className="mt-2 min-h-28 w-full border border-[#cbd5c7] bg-white p-3 text-[12px] normal-case tracking-normal text-[#1b3829] outline-none focus:border-[#876e16]" placeholder="State what the cited evidence supports, what remains uncertain, and how it affects the panel’s interpretation." /></label><div className="mt-4 flex flex-wrap gap-2"><Button disabled={isPending || response.trim().length < 10} onClick={() => submit("under_review")} variant="outline" className="h-8 rounded-none border-[#876e16] text-[9px] font-bold uppercase tracking-[.1em] text-[#765d12]"><SearchCheck className="mr-1.5 h-3.5 w-3.5" />Mark under review</Button><Button disabled={isPending || response.trim().length < 10} onClick={() => submit("resolved")} className="h-8 rounded-none bg-[#173d2a] text-[9px] font-bold uppercase tracking-[.1em]"><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Resolve</Button><Button disabled={isPending || response.trim().length < 10} onClick={() => submit("declined")} className="h-8 rounded-none bg-[#9c3d2f] text-[9px] font-bold uppercase tracking-[.1em]"><XCircle className="mr-1.5 h-3.5 w-3.5" />Decline</Button></div>{error && <p className="mt-3 text-[10px] text-red-700">{error.message}</p>}</> : <p className="py-10 text-center text-[11px] leading-5 text-[#758077]">Select a participant challenge to record the human review outcome.</p>}</aside></div> : <p className="mt-5 border border-dashed border-[#e1d5b8] bg-white p-4 text-[11px] text-[#758077]">No participant challenges are awaiting review for this proof record.</p>}</section>;
}
