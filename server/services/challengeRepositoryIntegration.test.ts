import { describe, expect, it } from "vitest";

describe("Inflexcvi challenge repository integration and audit", () => {
  it("verifies repository collaborator assignment and authorized audit artifact helpers", async () => {
    const { addRepositoryCollaborator } = await import("./githubApp");
    expect(typeof addRepositoryCollaborator).toBe("function");

    const { authorizedGitHubRepositoryArtifact } = await import("./studioRepositoryAuditAdapter");
    expect(typeof authorizedGitHubRepositoryArtifact).toBe("function");

    const artifact = authorizedGitHubRepositoryArtifact([
      { artifactKey: "repo", artifactType: "repository", evidenceUrl: "https://github.com/Inflexcvi/challenge-dealer-service-efficiency" },
    ]);
    expect(artifact).not.toBeNull();
    expect(artifact?.evidenceUrl).toContain("Inflexcvi/challenge-dealer-service-efficiency");
  });
});
