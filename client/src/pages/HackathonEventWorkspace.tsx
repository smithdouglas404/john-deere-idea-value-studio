import { Link, useRoute } from "wouter";
import { ArrowLeft, CalendarDays, ClipboardCheck, Gavel, Loader2, UsersRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { InheritedCrowdContext } from "@/components/InheritedCrowdContext";
import { ChallengeRepositoryReadiness } from "@/components/ChallengeRepositoryReadiness";
import { cleanJourney } from "@/lib/cleanJourney";
import { CleanLifecycleShell } from "@/components/CleanLifecycleShell";
import { CleanBackControls } from "@/components/CleanBackControls";
import { CleanBreadcrumbs } from "@/components/CleanBreadcrumbs";
import { EventProjectLinks } from "@/components/CleanWorkspaceLinks";

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleString() : "Not scheduled";
}

export default function HackathonEventWorkspace() {
  const [, params] = useRoute("/studio/events/:id");
  const proofEventId = Number(params?.id);
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.studio.eventWorkspace.useQuery(
    { proofEventId },
    { enabled: Number.isInteger(proofEventId) && proofEventId > 0 },
  );

  if (isLoading) {
    return <main className="grid min-h-screen place-items-center bg-[#f7f5ed]"><Loader2 className="h-7 w-7 animate-spin text-[#173d2a]" /></main>;
  }
  if (!data || error) {
    return <main className="grid min-h-screen place-items-center bg-[#f7f5ed] p-6"><div className="border border-[#ddbab2] bg-[#fff7f5] p-6 text-[#7d322a]"><p className="font-serif text-2xl">This hackathon event could not open.</p><p className="mt-2 text-sm">{error?.message || "The event does not exist."}</p></div></main>;
  }

  const caseById = new Map(data.cases.map(item => [item.id, item]));
  const originatorById = new Map(data.originators.map(item => [item.id, item]));
  const proofByCandidate = new Map(data.proofs.map(item => [item.proofCandidateId, item]));
  const repositoryByCandidate = new Map(data.challengeRepositories.map(item => [item.proofCandidateId, item]));
  const campaignId = data.cases[0]?.campaignId;
  const roleCounts = data.registrations.reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.role]: (counts[item.role] || 0) + 1 }), {});
  const readiness = data.candidates.map(candidate => {
    const proof = proofByCandidate.get(candidate.id);
    const artifacts = proof ? data.artifacts.filter(item => item.teamProofId === proof.id) : [];
    const packet = proof ? data.packets.find(item => item.teamProofId === proof.id) : null;
    const decision = proof ? data.decisions.find(item => item.teamProofId === proof.id) : null;
    const required = candidate.requiredArtifacts as Array<{ key: string; required: boolean }>;
    return {
      candidate,
      proof,
      artifacts,
      packet,
      decision,
      completeRequired: required.filter(item => item.required).every(item => artifacts.some(artifact => artifact.artifactKey === item.key)),
    };
  });
  const readyForJudging = readiness.filter(item => item.completeRequired && item.packet?.status === "ready").length;

  return (
    <main className="min-h-screen bg-[#f7f5ed] text-[#213126]">
      <header className="border-b border-[#d9ded2] bg-[#fbfaf6]">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-5 px-5 py-5 md:px-10">
          <div>
            <div className="flex flex-wrap items-center gap-5">
              <CleanBackControls />
              {campaignId && <Link href={cleanJourney.campaign(campaignId)} className="text-[10px] font-bold uppercase tracking-[.13em] text-[#1b5e3a]">Crowdsource context</Link>}
            </div>
            <CleanBreadcrumbs items={[{ label: "Innovation Portfolio", href: "/" }, ...(campaignId ? [{ label: "Campaign", href: cleanJourney.campaign(campaignId) }] : []), { label: "Shared hackathon", current: true }]} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#708072]">One scheduled event · selected innovation projects</p>
        </div>
      </header>
      <CleanLifecycleShell stage="event" campaignId={campaignId} eventId={data.event.id} />
      <section className="border-b border-[#d9ded2] bg-[#173d2a] text-white">
        <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#d4e2b9]">Executive-selected traditional hackathon</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">{data.event.title}</h1>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-[#d6e1d1]">{data.event.rules}</p>
          <div className="mt-6 grid gap-px border border-[#456d56] bg-[#456d56] md:grid-cols-4">
            <Metric label="Registered participants" value={`${roleCounts.participant || 0}`} />
            <Metric label="Selected projects" value={`${data.candidates.length}`} />
            <Metric label="Evidence ready" value={`${readyForJudging}/${data.candidates.length}`} />
            <Metric label="Judging begins" value={formatDate(data.event.judgingStartsAt)} />
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10">
        <section className="grid gap-8 xl:grid-cols-[1.2fr_.8fr]">
          <article className="border border-[#d9ded2] bg-[#fbfaf6] p-6 md:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6f7e70]">Selected project portfolio</p>
            <h2 className="mt-2 font-serif text-3xl text-[#173d2a]">Incubated cases become hackathon projects with their context intact.</h2>
            <p className="mt-3 text-sm leading-6 text-[#58675b]">Each project retains its crowdsource history, investment case, original idea owner, proof question, and value context. The delivery team builds the proof; human judges decide what it means.</p>
            <div className="mt-6 space-y-3">
              {readiness.map(item => {
                const investmentCase = caseById.get(item.candidate.investmentCaseId);
                const originator = investmentCase?.originatorId ? originatorById.get(investmentCase.originatorId) : null;
                const members = item.proof ? data.memberships.filter(member => member.teamProofId === item.proof!.id) : [];
                const assessments = data.assessments.filter(assessment => assessment.investmentCaseId === item.candidate.investmentCaseId);
                return (
                  <div key={item.candidate.id} className="border border-[#dbe1d8] bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <Link href={cleanJourney.investmentCase(item.candidate.investmentCaseId)} className="font-semibold text-[#173d2a] hover:underline">{investmentCase?.title || item.candidate.title}</Link>
                        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#657366]">{item.candidate.proofQuestion}</p>
                      </div>
                      <Stage value={item.decision ? item.decision.decision : item.packet?.status || (item.proof ? item.proof.status : "team_building")} />
                    </div>
                    <div className="mt-3 grid gap-3 border-y border-[#e1e6dd] py-3 text-[10px] font-bold uppercase tracking-[.1em] text-[#647465] sm:grid-cols-4">
                      <span>{originator?.name ? `Idea owner: ${originator.name}` : "Idea owner recorded"}</span>
                      <span>{item.proof ? item.proof.teamName : "Team forming"}</span>
                      <span>{members.length} delivery role{members.length === 1 ? "" : "s"}</span>
                      <span>{item.artifacts.length} evidence artifact{item.artifacts.length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-[9px] font-bold uppercase tracking-[.12em] text-[#1b5e3a]">
                      <EventProjectLinks caseId={item.candidate.investmentCaseId} eventId={data.event.id} hasEvidence={Boolean(item.proof)} />
                      <span className="text-[#657366]">{item.completeRequired ? "Evidence set complete" : "Evidence incomplete"}</span>
                    </div>
                    <InheritedCrowdContext assessments={assessments} />
                    <ChallengeRepositoryReadiness
                      proofCandidateId={item.candidate.id}
                      projectTitle={investmentCase?.title || item.candidate.title}
                      repository={repositoryByCandidate.get(item.candidate.id)}
                      canManage={data.viewerCanManage}
                      onPrepared={() => void utils.studio.eventWorkspace.invalidate({ proofEventId: data.event.id })}
                    />
                  </div>
                );
              })}
            </div>
          </article>
          <aside className="border border-[#d9ded2] bg-[#eef2eb] p-6 md:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6f7e70]">Event operations</p>
            <h2 className="mt-2 font-serif text-3xl text-[#173d2a]">One operational record for the proof event.</h2>
            <dl className="mt-6 space-y-5 text-sm">
              <Definition icon={CalendarDays} term="Proof starts" text={formatDate(data.event.proofStartsAt)} />
              <Definition icon={CalendarDays} term="Submission closes" text={formatDate(data.event.submissionClosesAt)} />
              <Definition icon={Gavel} term="Judging begins" text={formatDate(data.event.judgingStartsAt)} />
              <Definition icon={Gavel} term="Judging closes" text={formatDate(data.event.judgingClosesAt)} />
              <Definition icon={ClipboardCheck} term="Team update expectations" text={data.event.updateExpectations || "Not specified"} />
              <Definition icon={UsersRound} term="Roles registered" text={`${roleCounts.participant || 0} participants · ${roleCounts.mentor || 0} mentors · ${roleCounts.judge || 0} judges`} />
              <Definition icon={ClipboardCheck} term="Current event phase" text={data.event.status.replace(/_/g, " ")} />
            </dl>
            <div className="mt-7 border-t border-[#cbd6c8] pt-5">
              <p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#6f7e70]">Next operating action</p>
              <p className="mt-2 text-sm leading-6 text-[#4b5d4e]">{readyForJudging ? `Prepare human judges to inspect ${readyForJudging} evidence-ready project${readyForJudging === 1 ? "" : "s"}.` : "Support delivery teams to complete the required proof evidence before the judging window."}</p>
              <Link href={cleanJourney.judging(data.event.id)} className="mt-4 inline-flex items-center text-[10px] font-bold uppercase tracking-[.12em] text-[#1b5e3a]">Open human judging & ranking <ArrowLeft className="ml-2 h-4 w-4 rotate-180" /></Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="bg-[#1b482f] p-4"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#c9d8c7]">{label}</p><p className="mt-2 text-sm font-semibold text-white">{value}</p></div>;
}

function Stage({ value }: { value: string }) {
  return <span className="inline-flex bg-[#e5f0e4] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#1b5e3a]">{value.replace(/_/g, " ")}</span>;
}

function Definition({ icon: Icon, term, text }: { icon: typeof CalendarDays; term: string; text: string }) {
  return <div className="flex gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#876e16]" /><div><dt className="text-[9px] font-bold uppercase tracking-[.12em] text-[#718075]">{term}</dt><dd className="mt-1 leading-5 text-[#405144]">{text}</dd></div></div>;
}
