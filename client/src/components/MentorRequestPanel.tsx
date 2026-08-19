import { useState } from "react";
import { CalendarClock, Handshake, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

type MentorRequestPanelProps = {
  hackathonId: number;
  projectId: number;
  projectTitle: string;
};

function requestStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function MentorRequestPanel({ hackathonId, projectId, projectTitle }: MentorRequestPanelProps) {
  const utils = trpc.useUtils();
  const [mentorId, setMentorId] = useState("");
  const [scheduleItemId, setScheduleItemId] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const directory = trpc.hackathons.mentorDirectory.useQuery({ hackathonId }, { refetchInterval: 30_000, refetchIntervalInBackground: false });
  const requests = trpc.hackathons.myMentorRequests.useQuery({ hackathonId }, { refetchInterval: 15_000, refetchIntervalInBackground: false });
  const requestMentor = trpc.hackathons.requestMentor.useMutation({
    onSuccess: () => {
      setMentorId("");
      setScheduleItemId("");
      setRequestNote("");
      void requests.refetch();
      void utils.hackathons.myMentorRequests.invalidate({ hackathonId });
    },
  });

  const canSubmit = Boolean(mentorId) && requestNote.trim().length >= 10 && !requestMentor.isPending;

  return <section className="border border-[#cbd7c7] bg-[#f3f5ed] p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-[#1b5e3a]"><Handshake className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[.14em]">Mentor routing</p></div>
        <h2 className="mt-2 font-serif text-[25px] text-[#1b3829]">Request targeted proof support.</h2>
        <p className="mt-2 max-w-2xl text-[12px] leading-5 text-[#536254]">Route a focused request for <span className="font-semibold">{projectTitle}</span>. A request does not reserve time; the mentor decides whether to accept, decline, or redirect it.</p>
      </div>
      <div className="border border-[#c8d8c5] bg-[#e8f0e5] px-3 py-2 text-[9px] font-bold uppercase tracking-[.1em] text-[#315e40]">Participant controlled</div>
    </div>

    <p className="mt-4 border-l-2 border-[#876e16] bg-[#fbf7e8] px-3 py-2 text-[10px] leading-4 text-[#665822]">{directory.data?.notice || "Mentor profile detail is shown only when the mentor has provided talent consent. Registration alone does not imply availability."}</p>

    <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
      <div>
        <label className="block text-[9px] font-bold uppercase tracking-[.13em] text-[#758077]">Registered mentor
          <select value={mentorId} onChange={event => setMentorId(event.target.value)} disabled={directory.isLoading || !directory.data?.mentors.length} className="mt-2 h-10 w-full border border-[#cbd5c7] bg-white px-3 text-[12px] normal-case tracking-normal text-[#1b3829] outline-none focus:border-[#1b5e3a]">
            <option value="">{directory.isLoading ? "Loading mentor directory…" : directory.data?.mentors.length ? "Select a mentor" : "No registered mentors are visible yet"}</option>
            {directory.data?.mentors.map(mentor => <option key={mentor.userId} value={mentor.userId}>{mentor.name}{mentor.skills.length ? ` — ${mentor.skills.slice(0, 3).join(", ")}` : ""}</option>)}
          </select>
        </label>
        {mentorId && <div className="mt-3 border border-[#d8e0d4] bg-white p-3 text-[11px] text-[#536254]">{(() => { const mentor = directory.data?.mentors.find(item => item.userId === Number(mentorId)); return mentor?.consented ? <><p className="font-semibold text-[#1b3829]">{mentor.name}</p>{mentor.bio && <p className="mt-1 leading-4">{mentor.bio}</p>}{mentor.availabilityRoles.length > 0 && <p className="mt-2 text-[10px] uppercase tracking-[.08em] text-[#5e6d60]">Available for: {mentor.availabilityRoles.join(", ")}</p>}</> : <p>This mentor is registered. Their detailed profile is not shown because they have not opted into talent-profile sharing.</p>; })()}</div>}
        <label className="mt-4 block text-[9px] font-bold uppercase tracking-[.13em] text-[#758077]">Preferred office-hours session <span className="normal-case tracking-normal text-[#7b847c]">(optional)</span>
          <select value={scheduleItemId} onChange={event => setScheduleItemId(event.target.value)} className="mt-2 h-10 w-full border border-[#cbd5c7] bg-white px-3 text-[12px] normal-case tracking-normal text-[#1b3829] outline-none focus:border-[#1b5e3a]">
            <option value="">No session preference</option>
            {directory.data?.officeHours.map(item => <option key={item.id} value={item.id}>{item.title} — {new Date(item.startsAt).toLocaleString()}</option>)}
          </select>
        </label>
        <label className="mt-4 block text-[9px] font-bold uppercase tracking-[.13em] text-[#758077]">What decision or proof blocker needs help?
          <textarea value={requestNote} onChange={event => setRequestNote(event.target.value)} className="mt-2 min-h-28 w-full border border-[#cbd5c7] bg-white p-3 text-[12px] normal-case tracking-normal text-[#1b3829] outline-none focus:border-[#1b5e3a]" placeholder="Describe the question, the evidence you already have, and the specific support you need." />
        </label>
        <Button disabled={!canSubmit} onClick={() => requestMentor.mutate({ hackathonId, mentorId: Number(mentorId), projectId, scheduleItemId: scheduleItemId ? Number(scheduleItemId) : undefined, requestNote: requestNote.trim() })} className="mt-4 h-10 rounded-none bg-[#173d2a] text-[9px] font-bold uppercase tracking-[.11em] hover:bg-[#0e2b1e]">
          {requestMentor.isPending ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Sending request…</> : <><Send className="mr-2 h-3 w-3" />Request mentor support</>}
        </Button>
        {requestMentor.error && <p className="mt-2 text-[10px] text-red-700">{requestMentor.error.message}</p>}
      </div>

      <aside className="border border-[#d8e0d4] bg-[#fcfbf7] p-4">
        <div className="flex items-center gap-2 text-[#4f674c]"><CalendarClock className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[.14em]">Your request status</p></div>
        {requests.isLoading ? <p className="mt-4 text-[11px] text-[#758077]">Loading your requests…</p> : requests.data?.length ? <div className="mt-4 space-y-3">{requests.data.map(request => <article key={request.id} className="border border-[#e0e4dc] bg-white p-3"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#315e40]">{requestStatusLabel(request.status)}</p><p className="text-[10px] text-[#778178]">{new Date(request.createdAt).toLocaleDateString()}</p></div><p className="mt-2 text-[11px] leading-4 text-[#536254]">{request.requestNote}</p>{request.responseNote && <p className="mt-2 border-t border-[#e7ebe5] pt-2 text-[11px] leading-4 text-[#1b3829]"><span className="font-semibold">Response:</span> {request.responseNote}</p>}</article>)}</div> : <p className="mt-4 text-[11px] leading-5 text-[#758077]">No mentor requests have been sent for this proof sprint. Use the form to route a specific blocker with the evidence you already have.</p>}
      </aside>
    </div>
  </section>;
}
