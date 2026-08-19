import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { MessagesSquare } from "lucide-react";
import { useState } from "react";

export function TeamCollaborationPanel({ teamId }: { teamId: number }) {
  const utils = trpc.useUtils();
  const { data: messages, isLoading } = trpc.hackathons.teamMessages.useQuery({ teamId }, { refetchInterval: 15_000, refetchIntervalInBackground: false });
  const [body, setBody] = useState("");
  const post = trpc.hackathons.postTeamMessage.useMutation({ onSuccess: () => { setBody(""); utils.hackathons.teamMessages.invalidate({ teamId }); } });
  return <article className="border border-[#d7ddd0] bg-[#f0f1e7] p-5"><div className="flex items-center gap-2 text-[#4f674c]"><MessagesSquare className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[.14em]">Team coordination</p></div><h2 className="mt-2 font-serif text-[24px] text-[#1b3829]">Keep the proof work together.</h2><div className="mt-4 max-h-56 space-y-2 overflow-y-auto border-y border-[#d7ddd0] py-3">{isLoading ? <p className="text-[11px] text-[#758077]">Loading team notes…</p> : messages?.length ? messages.map(message => <div key={message.id} className="border-l-2 border-[#c89412] bg-[#fffdf2] p-2"><p className="text-[11px] leading-5 text-[#435547]">{message.body}</p><small className="mt-1 block text-[9px] text-[#758077]">{new Date(message.createdAt).toLocaleString()}</small></div>) : <p className="text-[11px] text-[#758077]">No messages yet. Share a decision, evidence task, or help request with the team.</p>}</div><textarea value={body} onChange={event => setBody(event.target.value)} className="mt-3 min-h-20 w-full border border-[#cbd5c7] bg-white p-3 text-[12px] text-[#1b3829]" placeholder="Ask for help, assign an evidence task, or share a decision." /><Button disabled={!body.trim() || post.isPending} onClick={() => post.mutate({ teamId, body })} className="mt-3 h-9 rounded-none bg-[#173d2a] text-[9px] font-bold uppercase tracking-[.1em]">{post.isPending ? "Posting…" : "Post team note"}</Button>{post.error && <p className="mt-2 text-[10px] text-red-700">{post.error.message}</p>}</article>;
}
