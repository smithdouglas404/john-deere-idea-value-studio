export const CHALLENGE_REPOSITORY_ORGANIZATION = "Inflexcvi";

export type ProvisionedChallengeRepository = {
  id: number;
  full_name: string;
  html_url: string;
  private: boolean;
};

export function challengeRepositoryGovernanceDefaults(repositoryName: string) {
  return {
    organization: CHALLENGE_REPOSITORY_ORGANIZATION,
    repositoryName,
    status: "ready_to_provision" as const,
    teamAccessStatus: "not_granted" as const,
    auditMode: "read_only_advisory" as const,
  };
}
