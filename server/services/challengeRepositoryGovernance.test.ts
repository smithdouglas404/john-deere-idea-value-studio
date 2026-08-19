import { describe, expect, it } from "vitest";
import { challengeRepositoryGovernanceDefaults, CHALLENGE_REPOSITORY_ORGANIZATION } from "./challengeRepositoryGovernance";

describe("challenge repository governance defaults", () => {
  it("creates a read-only-audit governance record ready for verified Inflexcvi organization provisioning", () => {
    const record = challengeRepositoryGovernanceDefaults("dealer-service-proof");

    expect(record.organization).toBe(CHALLENGE_REPOSITORY_ORGANIZATION);
    expect(record.repositoryName).toBe("dealer-service-proof");
    expect(record.status).toBe("ready_to_provision");
    expect(record.teamAccessStatus).toBe("not_granted");
    expect(record.auditMode).toBe("read_only_advisory");
  });
});
