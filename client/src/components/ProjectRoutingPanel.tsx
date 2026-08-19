import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Route } from "lucide-react";
import { useEffect, useState } from "react";

export function ProjectRoutingPanel({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.hackathons.projectTrackRouting.useQuery({ projectId });
  const [trackIds, setTrackIds] = useState<number[]>([]);
  useEffect(() => { if (data) setTrackIds(data.selectedTrackIds); }, [data]);
  const save = trpc.hackathons.setProjectTracks.useMutation({ onSuccess: () => utils.hackathons.projectTrackRouting.invalidate({ projectId }) });
  const toggle = (trackId: number) => setTrackIds(current => current.includes(trackId) ? current.filter(id => id !== trackId) : [...current, trackId]);
  return <article className="border border-[#d7ddd0] bg-[#fcfbf7] p-5"><div className="flex items-center gap-2 text-[#1b5e3a]"><Route className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[.14em]">Prize routing</p></div><h2 className="mt-2 font-serif text-[24px] text-[#1b3829]">Enter the evidence where it fits.</h2><p className="mt-2 text-[11px] leading-5 text-[#647066]">A single proof may compete for more than one relevant prize track. Only the team leader may change this routing.</p>{isLoading ? <p className="mt-4 text-[11px] text-[#758077]">Loading event tracks…</p> : <div className="mt-4 space-y-2">{data?.tracks.map(track => <label key={track.id} className="flex cursor-pointer items-start gap-3 border border-[#e1e6df] bg-white p-3"><input type="checkbox" checked={trackIds.includes(track.id)} disabled={!data.canEdit} onChange={() => toggle(track.id)} className="mt-0.5 accent-[#1b5e3a]" /><span><b className="block text-[11px] text-[#314837]">{track.title}</b><small className="mt-1 block text-[10px] leading-4 text-[#758077]">{track.description || "No track guidance published."}{track.prizeAmount ? ` · Prize ${track.prizeAmount}` : ""}</small></span></label>)}</div>}{data?.canEdit && <Button disabled={!trackIds.length || save.isPending} onClick={() => save.mutate({ projectId, trackIds })} variant="outline" className="mt-4 h-9 rounded-none border-[#1b5e3a] text-[9px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]">{save.isPending ? "Saving…" : "Save prize routing"}</Button>}{save.error && <p className="mt-2 text-[10px] text-red-700">{save.error.message}</p>}</article>;
}
