# Value Fieldbook: Competitor-Led Capability Plan and Delivery Control

**Status:** Planning document only. **No application feature work is authorized by this plan until the user approves the relevant work package.**

## 1. Purpose and delivery rule

This plan answers four questions for each competitor benchmark: **where the current baseline stands, what will be implemented, why it matters, and how delivery will be tracked.** It deliberately distinguishes the application that already existed before the competitor review from any net-new work proposed after it.

> **Non-negotiable governance rule:** AI may prepare drafts, inspect supplied evidence, or identify missing information. It may not set sponsor economics, select winners, approve investment, or replace a human reviewer.

## 2. Current baseline versus net-new work

| Capability area | Existing baseline already present before competitor review | Verified post-review addition | Proposed net-new work — **not yet delivered** |
| --- | --- | --- | --- |
| Opportunity-to-value case | Voice/document intake, AI brief, cited research, sponsor-entered economics, sensitivity, proof handoff, realization | Explicit AI market-validation labeling and readability improvements | Visible command summary that presents a sponsor’s next action and proof transition without route hunting |
| Evidence-first proof | Project submission, repository audit, five specialist reviewers, cited findings, participant challenge, human-only scoring | Specialist plan surfaced on opportunity page; Participant Mission Control | Reviewer calibration and concise decision packet for all assigned reviewers |
| Event operations | Event HQ, teams, tracks, schedule, FAQs, announcements, messages, judging, leaderboard | Live Event Pulse; organizer announcement audience selector | Announcement acknowledgement, team-scoped notification feed, office-hours booking and mentor request flow |
| Decision continuation | Human scorecards, proof-derived confidence, sponsor-owned gate, realization indicators | None claimed as net-new beyond presentation/layout refinements | Owner/milestone/decision-history continuation view tied to proof evidence |

## 3. Competitor-by-competitor gap map

| Competitor product | Verified market strength | Where Value Fieldbook already stands | Net-new capability to consider | Why it should be built | Explicit non-goal |
| --- | --- | --- | --- | --- | --- |
| **Devpost** | Centralized registration, projects, judging, voting, and event outcomes [1] | Core registration, projects, judging, and human leaderboard exist | **Application & event command entry**: a participant can see their registered event, project state, next action, evidence status, and direct Judge Desk route from one screen | Removes route hunting and makes the existing operating system visibly usable | Do not become a generic public project gallery or popularity-voting product |
| **HackerEarth** | Hosted challenges, progress workflows, judging, analytics, integrations [4] | Event lifecycle and audit queue are present | **Operational exception center**: show real blockers from registrations, projects, audits, specialist reviews, and human decisions | Lets organizers intervene based on facts, not an invented event-health score | Do not turn the system into recruiting or coding-test software |
| **HackerRank Engage** | AI-supported challenge/event creation and developer engagement [3] | AI already structures briefs and research; event tracks/rubrics already persist | **Organizer copilot draft workspace**: draft tracks, rubric criteria, evidence gaps, and acceptance prompts from the selected opportunity; organizer edits and explicitly adopts each field | Speeds event setup while retaining ownership and auditability | No autonomous event creation or automatic rubric publication |
| **TAIKAI** | Matchmaking, event timeline, internal chat, real-time leaderboard, submissions, voting, community integrations [2] | Teams, opt-in matching, team messages, schedule, announcements, Event Pulse exist | **Mentor/office-hours routing** and **acknowledged communication feed** | Gives participants timely help and makes change communication traceable; uses the existing consent, mentor registration, and office-hours records | No unconsented people search, availability inference, or open anonymous chat |
| **Major League Hacking** | Organizer playbooks, mentoring culture, registration/check-in, judging standards [5] | Registration, teams, rubric, recusal, assignments, specialist packet exist | **Reviewer calibration and workload board**: show assignment count, recusal state, calibration case, evidence-packet access, and human scoring status | Improves fairness and reviewer readiness without allowing AI to score finalists | No automated reviewer ranking, automated recusal decision, or automated finalist selection |

## 4. Proposed delivery sequence — one work package at a time

### Work package A — Application and Event Command Entry

**Objective.** Make the current application visible from the default screen, with a direct link to its event, proof project, and next accountable action.

| Activity | Deliverable | Acceptance criterion | Dependency |
| --- | --- | --- | --- |
| A1 | Query the signed-in user’s active registrations and linked projects | Home route lists each active application with event title, registration state, project state, and direct route | Existing registrations/projects |
| A2 | Add “My active proof work” command panel to the home route | User can open `/hackathons/:id`, `/submission-evidence?project=:id`, or `/judging?project=:id` in one click | A1 |
| A3 | Show only factual next action | Draft project prompts “complete evidence”; audit pending prompts “await audit”; completed review prompts “review cited findings” | Existing audit/specialist/score records |
| A4 | Validate using the user’s two persisted records without altering data | Both applications are visible from the landing route while signed in | A1–A3 |
| A5 | Validate responsive mobile access | At a 375px-wide viewport, the signed-in user can identify each active application, read its factual next action, and open the event, proof, or evidence-review route without horizontal scrolling or clipped controls | A1–A4 |

### Work package B — Mentor Routing and Office-Hours Requests

**Objective.** Turn existing mentor registrations, consent-aware talent profiles, and office-hours schedule records into a usable participant request flow.

| Activity | Deliverable | Acceptance criterion | Dependency |
| --- | --- | --- | --- |
| B1 | Mentor directory view | Displays only mentors with explicit talent consent, shared skills/roles, and listed office hours | Existing mentor registrations and talent consent |
| B2 | Request form | Participant selects a mentor or office-hours slot, describes need, and links it to their team/project | New durable request record and authorization policy |
| B3 | Mentor/organizer request queue | Mentor can accept/decline/redirect; organizer sees unresolved requests | B2 |
| B4 | Participant status feedback | User sees pending, accepted, declined, or redirected state with timestamps | B2–B3 |

### Work package C — Human-Editable Organizer Copilot

**Objective.** Use the opportunity’s already cited, sponsor-reviewed evidence to draft—not publish—event configuration.

| Activity | Deliverable | Acceptance criterion | Dependency |
| --- | --- | --- | --- |
| C1 | “Draft from opportunity evidence” action in Event HQ | Uses only the selected opportunity brief, cited research, evidence gaps, and sponsor context | Existing opportunity/research data |
| C2 | Structured draft | Returns draft tracks, rubric criteria, required evidence, and proof questions, each with source/assumption labels | LLM structured-output contract |
| C3 | Editable review screen | Organizer edits each item before adoption; all items start unadopted | C2 |
| C4 | Explicit adoption | Only organizer-confirmed tracks/rubrics are persisted; the draft is retained with provenance | Existing createTrack/createRubricCriterion procedures |
| C5 | Guardrail tests | No sponsor economics, winner selection, or human decision is auto-populated or changed | C1–C4 |

### Work package D — Reviewer Calibration and Workload Board

**Objective.** Make fair human review operationally visible without changing human authority.

| Activity | Deliverable | Acceptance criterion | Dependency |
| --- | --- | --- | --- |
| D1 | Workload panel | Displays count of active assignments, finalized reviews, and recusal status per reviewer | Existing judge assignments/scorecards |
| D2 | Calibration case | Organizer selects a representative evidence packet; reviewers record rubric rationale independently | Existing audit and rubric records |
| D3 | Variance review | Shows criterion-level variance across human reviewers; no AI “correct” answer | D2 |
| D4 | Assignment recommendation | Shows balanced assignment recommendation; organizer confirms assignment | Existing assignment router |
| D5 | Fairness controls | Recusal, secondary review, and finalized-score immutability remain visible | Existing judging controls |

### Work package E — Acknowledged Event Communications

**Objective.** Extend existing organizer announcements into a traceable change channel.

| Activity | Deliverable | Acceptance criterion | Dependency |
| --- | --- | --- | --- |
| E1 | Retain audience-targeted organizer announcements | All/participant/judge/mentor audience remains selectable | Existing announcement records |
| E2 | Announcement acknowledgement | Intended recipients can mark critical event changes as acknowledged | New acknowledgement record |
| E3 | Team-scoped alert | Organizer can target one team for a schedule/evidence issue | Existing teams/memberships |
| E4 | Event timeline feed | Shows announcements, office hours, deadlines, and state changes in time order | Existing schedule/announcement records |

## 5. What makes this different from conventional hackathon platforms

The differentiator is **not** a longer feature list. It is the fact that each operational feature is attached to a governed decision chain:

| Distinctive system behavior | Why conventional tools do not make it central | Human control |
| --- | --- | --- |
| Sponsor-owned value range before proof | Most tools begin at event registration or project submission | Sponsor enters/changes economics; AI does not fabricate ROI |
| Cited research, evidence gaps, and assumptions connected to the opportunity | Most tools collect submissions without underwriting their premise | Users review sources and limitations before launch |
| Specialist findings connected to code/evidence but excluded from final leaderboard | Most AI judging discussions blur assistance and decision making | Humans score, override claims, recuse, and finalize |
| Proof changes confidence and informs a sponsor gate | Most hackathons end with a winner list | Sponsor retains investment decision and records rationale |
| Post-event realization indicators | Most platforms stop at submission or award | Owner records evidence-backed outcome progression |

## 6. Delivery controls

1. **No capability is marked delivered until it is visible in the user-facing route, covered by a focused test, and demonstrated against a real persisted record.**
2. **Existing baseline work is never reclassified as a post-benchmark addition.**
3. **Each work package is approved before its implementation begins.**
4. **No schema migration or data update is performed for a work package without first showing the exact data model change and purpose.**
5. **No application data—hackathons, registrations, teams, projects, submissions, scores, or research—is deleted as part of this roadmap.**

## 7. Recommendation for the first approved work package

Approve **Work package A: Application and Event Command Entry** first. It resolves the immediate user-visible failure: the default screen does not expose the user’s active hackathon work. It is also low risk because it reads existing records and creates no new business data.

## 8. Delivery record

### Work package A — delivered

The home route now includes **My active proof work**, which reads the signed-in user’s persisted registrations and linked projects. It presents the real event title, registration state, proof state, one factual next action, and direct routes to Event HQ, final evidence, or cited findings. The view was verified using the two persisted user registrations without changing any data. A 375px-wide mobile review confirms the cards, next-action controls, and Event HQ routes are visible without horizontal scrolling.

## References

[1] [Devpost — Hackathon Software & Management Solutions](https://info.devpost.com/)

[2] [TAIKAI — Organization Hackathon Platform](https://taikai.network/en/organizations)

[3] [HackerRank Engage](https://www.hackerrank.com/products/engage)

[4] [HackerEarth Recruit Hackathons](https://www.hackerearth.com/recruit/hackathons)

[5] [Major League Hacking — Organizer Guide](https://guide.mlh.com/)
