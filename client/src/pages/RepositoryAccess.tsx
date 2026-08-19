import { StudioShell } from "@/components/StudioShell";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { RepositorySearchPanel } from "@/components/RepositorySearchPanel";
import { useState } from "react";

export function requestedRepositoryProjectId(search: string): string {
  const candidate = new URLSearchParams(search).get("project") || "";
  return /^\d+$/.test(candidate) && Number(candidate) > 0 ? candidate : "";
}

export default function RepositoryAccess() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [projectId, setProjectId] = useState(() => typeof window === "undefined" ? "" : requestedRepositoryProjectId(window.location.search));
  const [githubUrl, setGithubUrl] = useState("");
  const id = Number(projectId);
  const canAdminister = user?.role === "admin";
  const connections = trpc.repositories.listForProject.useQuery({ projectId: id }, { enabled: canAdminister && Number.isInteger(id) && id > 0 });
  const authorize = trpc.repositories.authorize.useMutation({ onSuccess: () => connections.refetch() });
  const revoke = trpc.repositories.revoke.useMutation({ onSuccess: () => connections.refetch() });
  const authorizeRepository = (evidenceMode: "public_api" | "github_app") => {
    if (!id || !githubUrl) return;
    authorize.mutate({ projectId: id, githubUrl, evidenceMode }, { onSuccess: () => utils.repositories.listForProject.invalidate({ projectId: id }) });
  };

  return <StudioShell eyebrow="Repository evidence"><section className="max-w-4xl"><div className="border border-[#d7ddd0] bg-[#173d2a] p-6 text-[#f9f8f1] md:p-8"><div className="flex items-start gap-4"><div className="grid h-10 w-10 shrink-0 place-items-center bg-[#f8d41d] text-[#173d2a]"><LockKeyhole className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#b6d0ae]">Evidence boundary{projectId ? ` / project ${projectId}` : ""}</p><h1 className="mt-1 font-serif text-[31px] leading-none">Authorize the proof before the agent reads it.</h1><p className="mt-3 max-w-2xl text-[12px] leading-5 text-[#d0dfc9]">Public repositories use GitHub’s public API. Private repositories require a repository-specific approval within the installed read-only GitHub App scope. The agent receives a short-lived token only while it gathers bounded evidence.</p></div></div></div>
    {!canAdminister ? <div className="mt-6 border border-[#e1d5c0] bg-[#fff8e7] p-4 text-[12px] text-[#624d27]">Repository authorization is restricted to organizers. Participants can submit a repository URL, but cannot grant private access.</div> : <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.9fr]"><article className="border border-[#d7ddd0] bg-[#fcfbf7] p-5"><div className="flex items-center gap-2 text-[#1b5e3a]"><ShieldCheck className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-[.14em]">New authorization</p></div><p className="mt-2 font-serif text-[24px] text-[#1b3829]">Set the access mode.</p><label className="mt-5 block text-[9px] font-bold uppercase tracking-[.13em] text-[#758077]">Project ID<input inputMode="numeric" value={projectId} onChange={event => setProjectId(event.target.value)} className="mt-2 h-10 w-full border border-[#cbd5c7] bg-white px-3 text-[12px] normal-case tracking-normal text-[#1b3829] outline-none focus:border-[#1b5e3a]" placeholder="Project record ID" /></label><label className="mt-4 block text-[9px] font-bold uppercase tracking-[.13em] text-[#758077]">GitHub repository URL<input value={githubUrl} onChange={event => setGithubUrl(event.target.value)} className="mt-2 h-10 w-full border border-[#cbd5c7] bg-white px-3 text-[12px] normal-case tracking-normal text-[#1b3829] outline-none focus:border-[#1b5e3a]" placeholder="https://github.com/owner/repository" /></label><div className="mt-5 flex flex-wrap gap-3"><Button disabled={!id || !githubUrl || authorize.isPending} onClick={() => authorizeRepository("public_api")} variant="outline" className="h-10 rounded-none border-[#1b5e3a] text-[9px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]">Authorize public</Button><Button disabled={!id || !githubUrl || authorize.isPending} onClick={() => authorizeRepository("github_app")} className="h-10 rounded-none bg-[#173d2a] text-[9px] font-bold uppercase tracking-[.1em] hover:bg-[#0e2b1e]">Authorize private App</Button></div><p className="mt-3 text-[10px] leading-4 text-[#758077]">The private option verifies that this exact repository is installed for the read-only GitHub App. It does not accept personal access tokens.</p></article>
      <article className="border border-[#d7ddd0] bg-[#f0f1e7] p-5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#536b54]">Authorization ledger</p><h2 className="mt-2 font-serif text-[24px] text-[#1b3829]">Current and historical access.</h2>{connections.isLoading ? <p className="mt-5 text-[11px] text-[#758077]">Loading evidence records…</p> : !id ? <p className="mt-5 text-[11px] text-[#758077]">Enter a project ID to view its repository authorization trail.</p> : <div className="mt-5 space-y-3">{connections.data?.length ? connections.data.map(connection => <div key={connection.id} className="border border-[#d7ddd0] bg-white p-3"><p className="text-[10px] font-bold text-[#314837]">{connection.visibility === "private" ? "Private GitHub App" : "Public API"}</p><p className="mt-1 break-all text-[10px] leading-4 text-[#617064]">{connection.githubUrl}</p><p className="mt-2 text-[9px] uppercase tracking-[.1em] text-[#758077]">{connection.revokedAt ? `Revoked ${new Date(connection.revokedAt).toLocaleString()}` : "Active read-only authorization"}</p>{!connection.revokedAt && <Button disabled={revoke.isPending} onClick={() => revoke.mutate({ projectId: id })} variant="outline" className="mt-3 h-7 rounded-none border-[#914339] text-[8px] font-bold uppercase tracking-[.1em] text-[#914339]">Revoke</Button>}</div>) : <p className="text-[11px] text-[#758077]">No repository access has been approved for this project.</p>}</div>}</article></div>}{canAdminister && id > 0 && <RepositorySearchPanel projectId={id} />}</section></StudioShell>;
}
