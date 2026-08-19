# GitHub App Permission Notes for Challenge-Owned Repositories

The GitHub documentation says GitHub Apps have no permissions by default and should request the minimum permissions required. Repository permissions govern repository resources, while organization permissions govern organization resources. When permissions change, each account owner must approve the new permissions; until approval, the installation retains its old permissions. Installation-token API calls depend on the App's permissions. [GitHub: Choosing permissions for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app)

For the `agenthackathon` challenge-owned repository model, the existing installation currently has selected-repository scope with Contents: read and Metadata: read. That supports bounded read-only audit of already-selected repositories but does not support repository creation, collaboration management, or lifecycle operations.

The planned operations require a least-privilege upgrade for the selected organization:

| Challenge operation | Proposed App permission boundary | Notes |
| --- | --- | --- |
| Create and archive a private challenge repository | Repository Administration: write, with an organization-level installation scope that permits newly created repositories | Administration permissions should be explicitly explained to the organization owner. |
| Add or remove team participants through a project team | Organization Members: write; repository Administration: write for team-to-repository access | GitHub's permissions reference lists organization team and membership endpoints under Members: write. |
| Read source and commit snapshot for audit | Repository Contents: read; Repository Metadata: read | Audit remains read-only, bounded, cited, non-executing, and advisory. |
| Observe commits, pull requests, and check/test signals | Repository Metadata: read; Contents: read; optional Checks: read and Pull requests: read if those signals are enabled | Request only if the configured audit needs these signals. |

The product must not create repositories, grant collaborator access, archive, or delete anything until an owner updates the GitHub App registration, approves the changed permissions on the `agenthackathon` installation, and confirms the intended installation scope. The installed App should remain separate from the read-only advisory audit identity in product governance even if a shared GitHub App technically performs both API calls.

## Sources

1. [Choosing permissions for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app)
2. [Permissions required for GitHub Apps](https://docs.github.com/rest/overview/permissions-required-for-github-apps)
3. [Create an organization repository](https://docs.github.com/en/rest/repos/repos#create-an-organization-repository)
4. [Add or update team membership for a user](https://docs.github.com/en/rest/teams/members#add-or-update-team-membership-for-a-user)
5. [Add or update team repository permissions](https://docs.github.com/en/rest/teams/teams#add-or-update-team-repository-permissions)

## Endpoint notes

GitHub's organization repository creation endpoint is `POST /orgs/{org}/repos`; it accepts `private`, an optional `team_id`, and repository initialization settings. The endpoint documentation notes that the authenticated actor must be an organization member. The application should not call it until the GitHub App installation has the necessary approved organization and repository permission scope and the organization policy permits private repository creation.

GitHub's team API supports creating project teams, adding or updating team memberships, and assigning teams repository access. Team members receive Write access through the team-to-repository assignment; team membership may be pending when GitHub needs to send an organization invitation. If the organization uses IdP team synchronization, membership changes must follow the IdP-managed process rather than direct API calls.
