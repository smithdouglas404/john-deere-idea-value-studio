export type OpportunityProofHandoff = {
  hackathonId: number;
  eventTitle: string;
  eventStatus: string;
  projectId: number | null;
  projectTitle: string | null;
  projectSubmittedAt: Date | string | null;
};

export function resolveOpportunityGuideAction(status: string, proofHandoff: OpportunityProofHandoff | null) {
  if (proofHandoff?.projectId) {
    return proofHandoff.projectSubmittedAt
      ? { label: "Open cited human review", detail: "The proof record is submitted. Open the cited evidence and human decision workspace.", href: `/judging?project=${proofHandoff.projectId}` }
      : { label: "Complete proof evidence", detail: "A controlled proof is in motion. Open its participant evidence workspace to complete the record.", href: `/submission-evidence?project=${proofHandoff.projectId}` };
  }
  if (proofHandoff) return { label: "Open proof sprint", detail: "The selected value case already has a controlled proof sprint. Open Event HQ to mobilize the team and evidence plan.", href: `/hackathons/${proofHandoff.hackathonId}` };
  if (status === "selected") return { label: "Launch controlled proof sprint", detail: "Selection is human-owned. The sprint will test this value case without replacing it." };
  return { label: "Select for controlled proof", detail: "Review the evidence and sponsor inputs before selecting a proof to run." };
}
