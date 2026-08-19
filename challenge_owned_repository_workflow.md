# Challenge-Owned Repository Evidence Workflow

## Purpose

Use a private, challenge-owned repository as the preferred optional source-code evidence path for a selected hackathon project. The repository is a time-bounded proof workspace, not a replacement for the team’s normal source-control environment or a decision engine.

## Operating Lifecycle

| Stage | Owner | Controlled action | Result |
|---|---|---|---|
| Project enters hackathon preparation | Organizer | Creates one private repository for the selected proof team under the challenge organization or workspace | A named, isolated code-evidence location is recorded against the proof project |
| Team starts delivery | Team lead | Receives repository access and imports, mirrors, or develops the proof code | The original business case, proof question, and artifact contract remain linked outside the code repository |
| Code submission | Team lead | Nominates a branch, commit SHA, or submission tag | The exact code snapshot becomes the bounded audit target |
| Advisory audit | Agent | Reads only authorized source, dependency, configuration, and test files through read-only App access | Cited technical findings and judge questions enrich the clean evidence packet; no automatic score or decision is created |
| Challenge close | Organizer | Switches the challenge repository to read-only and archives it | No additional challenge code changes can alter the submitted evidence state |
| Migration window | Team lead | Exports or migrates code to its enduring team repository | Teams retain their work without keeping the challenge workspace active indefinitely |
| Final removal | Administrator | Explicitly confirms deletion after the configured retention window | Repository removal is intentional, auditable, and never automatic at challenge close |

## Governance Rules

The challenge repository should be private. The GitHub App should receive only the least access needed for the named repository: read access for evidence inspection, and only separately approved create, archive, or delete permissions for organizer-controlled lifecycle actions. The App must never push code, alter branches, or make a human outcome.

The submitted commit or tag—not the moving repository head—is the evidence target. The evidence packet must cite the chosen snapshot and explain any audit limitation. Agent findings remain advisory. Human judges retain the rubric scorecard, executive heat-map assessment, ranking, and sponsor continuation decision.

## Product Controls Required Before Enablement

The existing application can read and monitor authorized repositories. Before challenge-owned repository provisioning is enabled, it needs a clean organizer workflow for the following controls:

1. Create or connect the named private repository for a proof team.
2. Record the team, repository URL, submitted branch, commit SHA, or tag, and the selected audit mode.
3. Restrict the audit to the recorded snapshot and read-only file categories.
4. Archive at challenge close and record a configurable migration deadline.
5. Notify the team that export is required before the deadline.
6. Require an explicit administrator confirmation before deletion, with no automatic deletion job.

## Current Boundary

This is a design and governance plan. It does not provision repositories, request elevated GitHub permissions, archive repositories, or delete code. The current clean proof workflow continues to support documents, demos, and optional public repository evidence.
