export const cleanJourney = {
  campaign: (campaignId: number) => `/studio/campaigns/${campaignId}`,
  investmentCase: (caseId: number) => `/studio/cases/${caseId}`,
  evidence: (caseId: number) => `/studio/cases/${caseId}#evidence-agent`,
  event: (eventId: number) => `/studio/events/${eventId}`,
  judging: (eventId: number) => `/studio/events/${eventId}/judging`,
} as const;

export function isCleanPrimaryRoute(path: string) {
  return /^\/studio\/(campaigns|cases|events)(?:\/|$)/.test(path);
}
