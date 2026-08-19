import fs from "node:fs";

const path = "client/src/pages/CrowdsourcingCampaign.tsx";
let source = fs.readFileSync(path, "utf8");

if (!source.includes('import { CampaignSchedulingPanel } from "@/components/CampaignSchedulingPanel";')) {
  source = source.replace(
    'import { CleanBreadcrumbs } from "@/components/CleanBreadcrumbs";\n',
    'import { CleanBreadcrumbs } from "@/components/CleanBreadcrumbs";\nimport { CampaignSchedulingPanel } from "@/components/CampaignSchedulingPanel";\n',
  );
}

const start = source.indexOf('      <section className="mt-8 border border-[#d9ded2] bg-[#eef2eb] p-6 md:p-8"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6f7e70]">Shared scheduled hackathon</p>');
const end = source.indexOf('      <section className="mt-8 border border-[#d9ded2] bg-[#fbfaf6] p-6 md:p-8"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6f7e70]">Executive selection slate</p>', start);
if (start < 0 || end < 0) throw new Error("Could not locate the inline campaign scheduling section");

const replacement = `      <CampaignSchedulingPanel
        sharedEvent={sharedEvent ? { id: sharedEvent.id, title: sharedEvent.title, status: sharedEvent.status } : null}
        selectedProjectCount={data.candidates.length}
        eventSetupOpen={eventSetupOpen}
        eventTitle={eventTitle}
        eventRules={eventRules}
        eventUpdateExpectations={eventUpdateExpectations}
        eventProofStartsAt={eventProofStartsAt}
        eventSubmissionClosesAt={eventSubmissionClosesAt}
        eventJudgingStartsAt={eventJudgingStartsAt}
        eventJudgingClosesAt={eventJudgingClosesAt}
        canSubmit={canCreateCampaignEvent({ title: eventTitle, rules: eventRules })}
        isPending={createEvent.isPending}
        errorMessage={createEvent.error?.message}
        onToggleSetup={() => setEventSetupOpen(true)}
        onTitleChange={setEventTitle}
        onRulesChange={setEventRules}
        onUpdateExpectationsChange={setEventUpdateExpectations}
        onProofStartsAtChange={setEventProofStartsAt}
        onSubmissionClosesAtChange={setEventSubmissionClosesAt}
        onJudgingStartsAtChange={setEventJudgingStartsAt}
        onJudgingClosesAtChange={setEventJudgingClosesAt}
        onCreateEvent={() => createEvent.mutate({ title: eventTitle.trim(), rules: eventRules.trim(), updateExpectations: eventUpdateExpectations.trim() || undefined, status: "registration", proofStartsAt: eventProofStartsAt ? new Date(eventProofStartsAt) : undefined, submissionClosesAt: eventSubmissionClosesAt ? new Date(eventSubmissionClosesAt) : undefined, judgingStartsAt: eventJudgingStartsAt ? new Date(eventJudgingStartsAt) : undefined, judgingClosesAt: eventJudgingClosesAt ? new Date(eventJudgingClosesAt) : undefined }, { onSuccess: () => setEventSetupOpen(false) })}
      />
`;
source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(path, source);
