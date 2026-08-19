import { useMemo, useState } from "react";
import { FolderGit2, LockKeyhole, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

function defaultRepositoryName(title: string) {
  const value = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);
  return value || "challenge-project";
}

type RepositoryRecord = {
  organization: string;
  repositoryName: string;
  githubRepositoryId?: string | null;
  repositoryUrl?: string | null;
  status: string;
  teamAccessStatus: string;
  auditMode: string;
} | null | undefined;

export function ChallengeRepositoryReadiness({ proofCandidateId, projectTitle, repository, canManage, onPrepared }: { proofCandidateId: number; projectTitle: string; repository: RepositoryRecord; canManage: boolean; onPrepared: () => void }) {
  const [repositoryName, setRepositoryName] = useState(() => defaultRepositoryName(projectTitle));
  const prepare = trpc.studio.prepareChallengeRepository.useMutation({ onSuccess: onPrepared });
  const provision = trpc.studio.provisionChallengeRepository.useMutation({ onSuccess: onPrepared });
  const status = repository?.status || "not prepared";
  const fullName = repository ? `${repository.organization}/${repository.repositoryName}` : `Inflexcvi/${repositoryName || "project-repository"}`;
  const guidance = useMemo(() => repository
    ? repository.status === "provisioned"
      ? "This private challenge repository is assigned. Development access is still controlled separately; the Agent audit remains read-only and advisory."
      : "Governance is ready. An authorized sponsor or organizer can now create the private Inflexcvi challenge repository."
    : "Prepare the governance record first. This does not create an external repository.", [repository]);

  return (
    <section className="mt-4 border border-[#cfdacb] bg-[#f2f6ef] p-4" aria-label="Challenge-owned repository readiness">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <FolderGit2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1b5e3a]" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#58705b]">Challenge-owned private repository</p>
            {repository?.repositoryUrl ? <a href={repository.repositoryUrl} target="_blank" rel="noreferrer" className="mt-1 block text-sm font-semibold text-[#173d2a] underline decoration-[#876e16] underline-offset-4">{fullName}</a> : <p className="mt-1 text-sm font-semibold text-[#173d2a]">{fullName}</p>}
          </div>
        </div>
        <span className="bg-[#e4eee1] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.11em] text-[#1b5e3a]">{status.replace(/_/g, " ")}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#506250]">{guidance}</p>
      <div className="mt-3 grid gap-2 text-[10px] leading-4 text-[#5e6e5f] sm:grid-cols-2">
        <span className="flex gap-2"><LockKeyhole className="h-3.5 w-3.5 shrink-0 text-[#876e16]" />Teams will receive controlled development access after provisioning.</span>
        <span className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#876e16]" />Agents retain read-only, non-executing advisory audit access.</span>
      </div>
      {!repository && canManage && (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[#d8e2d3] pt-3">
          <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[.11em] text-[#5c705d]">
            Repository name
            <input value={repositoryName} onChange={event => setRepositoryName(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="h-9 min-w-[210px] border border-[#bfcdbb] bg-white px-2 text-sm font-normal text-[#213126]" />
          </label>
          <button type="button" onClick={() => prepare.mutate({ proofCandidateId, repositoryName })} disabled={!repositoryName || prepare.isPending} className="h-9 bg-[#173d2a] px-3 text-[9px] font-bold uppercase tracking-[.11em] text-white disabled:cursor-not-allowed disabled:opacity-60">
            {prepare.isPending ? "Recording…" : "Prepare repository governance"}
          </button>
          {prepare.error && <p className="text-xs text-[#962e20]">{prepare.error.message}</p>}
        </div>
      )}
      {repository?.status === "ready_to_provision" && canManage && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#d8e2d3] pt-3">
          <button type="button" onClick={() => provision.mutate({ proofCandidateId })} disabled={provision.isPending} className="h-9 bg-[#173d2a] px-3 text-[9px] font-bold uppercase tracking-[.11em] text-white disabled:cursor-not-allowed disabled:opacity-60">
            {provision.isPending ? "Creating private repository…" : "Create private Inflexcvi repository"}
          </button>
          <span className="text-[10px] leading-4 text-[#5e6e5f]">Creates only a private project repository. It does not grant collaborators.</span>
          {provision.error && <p className="basis-full text-xs text-[#962e20]">{provision.error.message}</p>}
        </div>
      )}
    </section>
  );
}
