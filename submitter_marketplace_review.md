# Submitter Intake and Community Evaluator Review

## Purpose

This review checks the previously written specification against the user's exact operating model. It does not treat a short summary as a substitute for a product requirement. Each requirement is decomposed into the actor, the screen, the data field, the action, the resulting state, and the evidence the next persona must be able to see.

## 1. Submitter Intake Workflow — Field-Level Review

The submitter is not merely filling out a campaign form. The submitter is introducing an innovative or reimagined capability into an organizational pipeline. The intake must create enough context for another employee to understand the opportunity, ask questions about it, assess its potential, and decide whether it deserves further attention before a hackathon is considered.

| Requirement from the user | Required field or behavior | What the submitter enters | What the community and owner must see | Current specification status |
|---|---|---|---|---|
| People are submitting innovative or reimagined capabilities | Opportunity identity | Opportunity title, short thesis, and capability type | A concise card title, type label, and a plain-language explanation of what is being proposed | Present in specification; the implementation must not reduce this to a campaign name |
| People need to explain the opportunity | Problem / opportunity statement | The operational problem, unmet need, or opportunity being addressed | Full statement on the detail surface; shortened statement on the marketplace card | Present; must be a distinct field rather than a generic description |
| People need to explain the effect on the organization | Organizational impact narrative | Narrative describing who is affected, how work changes, and why the capability matters to John Deere, dealers, customers, or operations | Impact section in the opportunity detail view | Present; must not be hidden in an AI-generated summary |
| People need to explain why the idea should be examined now | Why now | Strategic urgency, triggering condition, timing, and alignment to current enterprise priorities | Visible field in the executive summary and owner review surface | Required; must be a first-class field |
| People need to provide an executive summary | Executive summary | A concise decision-oriented narrative covering the opportunity, impact, economics, and requested next action | First section opened in the detail widget | Required; separate from the longer problem narrative |
| People need to provide a business case | Business case narrative | Assumptions, expected benefits, dependencies, constraints, and the proposed path to prove value | Business-case section and owner cockpit | Required; must remain attributable to the submitter/sponsor |
| People need to describe potential return | Potential return / ROI | Sponsor-entered potential ROI or a value range, with units, period, assumptions, and confidence/qualification | ROI metric on the card and detailed financial economics section | Required; the system must never fabricate this number |
| People need to identify project cost | Investment cost | Sponsor-entered expected investment or cost range, currency, period, and what is included | Investment cost on the card and financial economics section | Required; distinct from cost to prove |
| People need to state how long it will take | Duration / time to value | Expected duration, target completion period, and time until value can be observed | Duration on the card and detail view | Required; this is not a community deadline |
| People need to identify the cost of proving the idea | Cost to prove | Sponsor-entered proof budget or range and proof assumptions | Owner cockpit and later proof-event setup | Required; separate from total investment cost |
| People need to describe operational value | Operational value proposition | Expected effects on efficiency, productivity, cost takeout, innovation, revenue growth, customer impact, employee experience, or movement to higher-value work | Value dimensions in the detail view and preliminary rubric | Required; should be structured and narrative, not only a score |
| People need to relate the idea to transformation | Transformation orientation | One or more of Disrupt, Optimize, Reimagine, Reinvent, with narrative justification | Transformation badge and rubric context | Required; not a winner score and not an AI decision |
| People need to connect the idea to measurable outcomes | KPI / OKR linkage | Relevant objective, key result, KPI, baseline, expected direction of movement, and measurement owner if known | Outcome context in detail and owner cockpit | Required for an investment-oriented workflow; do not infer from the title |
| People need to upload supporting information | Document attachments | Business plans, financial models, technical documents, BRDs, architecture diagrams, process maps, research, and other supporting files | Attachment list with filename, type, date, source, preview action, and download action | Required; must be visible before voting |
| People need to answer questions from the community | Question response workflow | Responses from submitter/owner, question status, responder, and response date | Discussion thread linked to the opportunity | Required; questions cannot disappear into a generic comment field |
| People need to give other people enough information to decide | Evidence and provenance | Source, author, timestamp, document relationship, and whether a statement is sponsor-entered, community-provided, or agent-derived | Evidence labels visible in detail and owner views | Required to preserve trust and traceability |
| People need to submit the opportunity into the pipeline | Submission state | Draft, submitted, open for community review, under owner review, selected for hackathon, deferred, declined, or archived | Status badge and next-action instruction | Required; submission must not automatically create a hackathon |

### Intake sequence

The submitter flow should be a guided sequence, but it should not hide required information behind a campaign-first route:

1. The submitter opens **Submit an Opportunity** from the portfolio home.
2. The submitter identifies the capability and the problem it addresses.
3. The submitter writes the executive summary, organizational impact, operational value proposition, and **Why now?** narrative.
4. The submitter enters sponsor-owned financial assumptions: investment cost, potential return or value range, cost to prove, duration, and time to value. These values are labeled as entered assumptions; the system does not invent them.
5. The submitter maps the opportunity to the transformation orientation and value dimensions, including any KPI/OKR linkage.
6. The submitter uploads the business plan, financial model, BRD, technical design, or other supporting documents.
7. The submitter reviews the presentation that community members will see and submits the opportunity for community review.
8. The record becomes visible in the marketplace without creating a hackathon event.

## 2. Community Evaluator Marketplace Walkthrough

### Marketplace landing screen

The first post-landing screen is **View Crowdsourced Opportunities**. It is not the campaign operations screen. It is a gallery or table of opportunity widgets. Each widget must be useful without opening it, while making the next action obvious.

Each widget displays the following:

| Widget region | Required content |
|---|---|
| Identity | Opportunity title, short description, submitter or sponsoring group, operational domain, and transformation orientation |
| Value snapshot | Potential ROI or sponsor-entered value range, investment cost or cost range, cost to prove, and duration/time to value |
| Impact snapshot | One or two lines describing organizational impact and the primary value dimension(s) |
| Community pulse | Yes count, No count, Hold count, Undecided count, total responses, and an indication of questions or active discussion |
| Evidence signal | Number and type of attached documents, with an indication that preview is available |
| State | Open for community review, response requested, owner review, selected, deferred, declined, or archived |
| Primary action | **Inspect opportunity** or **Open details and vote** |

The card is not the full case. It is an entry point into a deeper review surface. The user should be able to compare opportunities without opening each one, then click one widget to inspect it.

### Opportunity detail modal or drawer

When a community evaluator clicks a widget, the application opens a large modal or right-side detail drawer, not a new confusing lifecycle page. The opportunity remains identifiable at the top while the evaluator works through its sections.

The detail surface contains these sections in this order:

1. **Executive summary**: The concise case, the problem being addressed, the proposed capability, the organizational impact, and the **Why now?** statement.
2. **Value and economics**: Potential ROI/value range, investment cost, cost to prove, duration/time to value, sponsor assumptions, and the operational value proposition. The surface must visibly distinguish sponsor-entered values from any later agent analysis.
3. **Transformation and outcomes**: Disrupt/Optimize/Reimagine/Reinvent orientation, value dimensions, KPI/OKR linkage, baseline, and expected outcome.
4. **Attached documents**: A list of uploaded business plans, technical documents, BRDs, financial models, architecture diagrams, or research. Each document shows filename, type, source, upload date, and **Preview**. Preview is in-browser where the format allows it; download remains available.
5. **Community discussion**: Comments, questions, evidence offers, and responses. Each entry shows author role, date, text, and whether it is a question, answer, endorsement, concern, or evidence offer. The submitter/owner can respond, and the response remains linked to the original question.
6. **Community sentiment**: Counts and percentages for Yes, No, Hold, and Undecided, plus total responses, average value confidence if used, and a visible list of representative feedback. Sentiment is evidence for the owner; it does not make the decision automatically.
7. **Vote and question panel**: The evaluator can ask a question before voting, or vote as Undecided while waiting for an answer. The evaluator can then select a stance and provide rationale.

### Voting widget states

The voting panel must make the decision states explicit and mutually understandable:

| State | Meaning | Stored result | Required feedback behavior |
|---|---|---|---|
| **Yes** | I support moving this opportunity forward for further owner review | `yes` | Rationale requested or strongly encouraged; optional question can accompany the vote |
| **No** | I do not support moving this opportunity forward at this time | `no` | Rationale is required so the owner can understand the objection |
| **Hold** | I am not ready to support or reject; more evidence or response is needed | `hold` | A reason or requested evidence is required |
| **Undecided** | I need clarification before taking a position | `undecided` | A question is required, or the evaluator must explain what information is missing |

The user previously also used the word **Potential**. The product must not silently collapse that into another state. The design decision must be explicit: either use **Potential** as the visible label for an exploratory positive stance, or use **Undecided** as the formal state and provide **Potential** as a separate confidence/interest signal. The current specification uses Undecided for the formal vote but must be corrected before implementation if Potential is the intended user-facing label.

The evaluator submits:

- The selected vote state.
- A rationale explaining the position.
- A question for the submitter if clarification is needed.
- Optional improvement suggestions.
- Optional evidence or source contribution.
- The evaluator's identity and timestamp.

After submission, the widget immediately updates the evaluator's own state and the aggregate community pulse. The evaluator can edit or withdraw a vote according to the campaign's governance policy, while preserving an audit history of prior submissions.

## 3. Owner Decision Walkthrough

The owner does not simply see a list of votes. The owner opens a decision cockpit for one opportunity that combines:

- The community vote distribution and representative reasoning.
- Unanswered questions and submitter responses.
- Financial economics and sponsor assumptions.
- Operational value proposition and transformation orientation.
- All supporting documents with preview.
- A preliminary value rubric and explicit evidence gaps.
- A decision control: advance to owner review, request more information, hold, decline, or slate for a specific hackathon.

The owner decision must be recorded as a human gate with decision-maker, timestamp, rationale, and selected next state. Selecting **Slate for Hackathon** must require a target event or a guided event-creation step; it must not silently attach the case to an arbitrary test fixture.

## 4. Exact Gaps to Resolve Before Calling This Complete

The current implementation has some relevant persistence and review structures, but the user-facing flow is not yet equivalent to this specification. The following are the exact gaps:

1. The portfolio home exists, but it is still visually dominated by an active investment record and campaign CTA instead of a true opportunity marketplace.
2. The campaign review area has vote controls, but it is not the first destination after selecting **View Crowdsourced Opportunities** and does not open as a focused opportunity detail widget.
3. The current visible community controls have Yes/No/Hold/Potential labels in some versions, but the formal state mapping and rationale requirement are not consistently defined.
4. The submitter intake specification is not yet fully represented as a dedicated workflow with separate fields for executive summary, problem, impact, Why now, investment cost, potential ROI/value range, duration, cost to prove, operational value proposition, transformation orientation, KPI/OKR linkage, and document vault.
5. The current community view does not yet provide a complete per-opportunity question-and-answer experience with submitter responses tied to each question.
6. Attachments exist on the investment-case record, but the opportunity detail experience must make them visible and previewable before a community evaluator votes.
7. The owner decision experience needs to combine sentiment, questions, economics, attachments, and the preliminary rubric in one cockpit rather than distributing them across campaign, case, and event surfaces.
8. The owner must be able to choose or create the target hackathon as an explicit human action after reviewing the opportunity; the workflow must not begin inside a test campaign.

## 5. Acceptance Tests for the Marketplace and Intake

The build should not be considered complete until these scenarios work in the signed-in browser:

1. From the portfolio home, the user clicks **View Crowdsourced Opportunities** and sees a marketplace of opportunity widgets rather than a campaign management screen.
2. Each widget shows title, brief description, potential ROI/value range, investment cost, duration, impact signal, document count, and community vote breakdown.
3. Clicking a widget opens a detail modal/drawer with executive summary, impact, Why now, economics, transformation/value rubric, documents, comments, questions, and sentiment.
4. A community evaluator can preview an attached business plan or technical document without leaving the detail view.
5. A community evaluator can submit a question before voting and can choose Yes, No, Hold, or Undecided/Potential according to the final approved state model.
6. No votes can be displayed without a rationale when the governance policy requires one.
7. After a vote is submitted, the aggregate counts, percentages, and feedback feed update in the same detail view.
8. The submitter can view and answer questions, with the question and answer remaining linked and attributable.
9. The owner can see the full community pulse, economics, documents, questions, and preliminary rubric in one decision surface.
10. The owner can request more information, hold, decline, or explicitly slate the opportunity into a selected hackathon. The resulting gate and rationale are persisted.
11. Entering a hackathon after slating changes the operating context to hackathon proof work; the incubation details remain available as a concise inherited summary rather than dominating the judging cockpit.

> **Implementation rule:** Do not implement the marketplace as a collection of decorative cards. The card is only the discovery surface. The detail widget is the review and evidence surface. The owner cockpit is the gate. The hackathon cockpit is a separate operating context.

## Decision Needed Before Coding

One terminology decision remains visible rather than hidden: the user has used both **Potential** and **Undecided**. The product must either expose four states as **Yes / No / Hold / Potential**, or expose **Yes / No / Hold / Undecided** with Potential as a separate interest signal. The implementation must not silently rename one into the other.

The rest of the workflow is sufficiently specified to build without additional conceptual questions: submitter intake first, marketplace second, detail and voting third, owner gate fourth, hackathon context only after explicit slating.

## References

No external sources were used for this review. The source of truth is the user's stated workflow and the existing project specification.
