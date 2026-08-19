import { useState } from "react";
import { Check, Handshake, Loader2, Route, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export function MentorRequestQueue({ hackathonId }: { hackathonId: number }) {
  const utils = trpc.useUtils();
  const [notes, setNotes] = useState<Record<number, string>>({});
  const queue = trpc.hackathons.mentorRequestQueue.useQuery({ hackathonId }, { refetchInterval: 15_000, refetchIntervalInBackground: false, retry: false });
  const respond = trpc.hackathons.respondMentorRequest.useMutation({
    onSuccess: () => {
      void queue.refetch();
      void utils.hackathons.mentorRequestQueue.invalidate({ hackathonId });
      void utils.hackathons.myMentorRequests.invalidate({ hackathonId });
    },
  });
  if (queue.isLoading) return <section className="mt-6 border border-[#d7ddd0] bg-[#f7f7f2] p-5"><p className="text-[10px] text-[#758077]">Loading mentor request queue…</p></section>;
  if (queue.error || !queue.data) return null;
  const requests = queue.data.requests;
  const unresolved = requests.filter(item => item.status === "pending");
  return <section className="mt-6 border border-[#cbd7c7] bg-[#eef3ea] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[#1b5e3a]"><Handshake className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[.15em]">Mentor request queue</p></div><h2 className="mt-2 font-serif text-[25px] text-[#1b3829]">Route proof blockers with a human response.</h2><p className="mt-2 max-w-2xl text-[11px] leading-5 text-[#647066]">{queue.data.isOrganizer ? "Organizer view: unresolved help requests across the proof sprint." : "Mentor view: requests addressed to you. Your response is sent back to the participant’s proof workspace."}</p></div><span className="border border-[#c5d6c1] bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[.1em] text-[#315e40]">{unresolved.length} unresolved</span></div>
    <div className="mt-5 space-y-3">{requests.length ? requests.map(request => <article key={request.id} className="border border-[#d8e0d4] bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#4f674c]">{request.status}</p><h3 className="mt-1 text-[13px] font-bold text-[#1b3829]">{request.projectTitle || "General event support"}</h3><p className="mt-1 text-[10px] text-[#758077]">Requested by {request.requesterName} · {new Date(request.createdAt).toLocaleString()}</p></div><p className="max-w-xl text-[11px] leading-5 text-[#536254]">{request.requestNote}</p></div>{request.status === "pending" ? <div className="mt-4 border-t border-[#e4e9e2] pt-3"><textarea value={notes[request.id] || ""} onChange={event => setNotes(current => ({ ...current, [request.id]: event.target.value }))} className="min-h-16 w-full border border-[#cbd5c7] bg-[#fcfbf7] p-2 text-[11px] text-[#1b3829] outline-none focus:border-[#1b5e3a]" placeholder="Optional response for the participant" /><div className="mt-2 flex flex-wrap gap-2"><Button disabled={respond.isPending} onClick={() => respond.mutate({ requestId: request.id, status: "accepted", responseNote: notes[request.id] || undefined })} className="h-8 rounded-none bg-[#173d2a] text-[8px] font-bold uppercase tracking-[.1em]"><Check className="mr-1 h-3 w-3" />Accept</Button><Button disabled={respond.isPending} onClick={() => respond.mutate({ requestId: request.id, status: "redirected", responseNote: notes[request.id] || undefined })} variant="outline" className="h-8 rounded-none border-[#876e16] text-[8px] font-bold uppercase tracking-[.1em] text-[#876e16]"><Route className="mr-1 h-3 w-3" />Redirect</Button><Button disabled={respond.isPending} onClick={() => respond.mutate({ requestId: request.id, status: "declined", responseNote: notes[request.id] || undefined })} variant="outline" className="h-8 rounded-none border-[#914339] text-[8px] font-bold uppercase tracking-[.1em] text-[#914339]"><X className="mr-1 h-3 w-3" />Decline</Button>{respond.isPending && <Loader2 className="h-4 w-4 animate-spin text-[#1b5e3a]" />}</div></div> : <p className="mt-3 border-t border-[#e4e9e2] pt-3 text-[11px] leading-5 text-[#536254]">{request.responseNote ? <>Response: {request.responseNote}</> : "No response note was recorded."}</p>}</article>) : <p className="border border-dashed border-[#cbd7c7] bg-white p-4 text-[11px] leading-5 text-[#758077]">No requests are currently assigned to this queue.</p>}</div>
  </section>;
}
