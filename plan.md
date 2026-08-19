# John Deere Idea Value Studio — Integrated Value Fieldbook and Hackathon Agent Plan

**Status:** Draft implementation plan for review  
**Date:** August 2026  
**Planning mandate:** All 17 supplied source files are **mandatory requirements**. Their full, unmodified text is preserved locally in the [`source_material/`](source_material/) directory and is incorporated by reference into this plan. No source requirement may be silently removed. Where sources offer overlapping or incompatible variants, this plan identifies the decision explicitly rather than discarding either source.

> **Core proposition:** The Value Fieldbook should become the front door and operating spine of the model. It captures the best field signals, turns them into evidence-backed opportunities, selects the work worth proving, and then feeds selected opportunities into a hackathon as focused proof sprints. The hackathon becomes one stage in a governed idea-to-investment system—not a disconnected contest.

## 1. How the existing demo fits

The current working **Value Fieldbook** demo already establishes the correct first layer. It captures a field signal, displays a selected opportunity with an illustrative value range and confidence, reveals AI rationale, and advances the opportunity toward a sponsor-review gate. Its purpose is to make the investment decision visible before a solution is overbuilt.

The expanded model adds two connected capabilities. First, a contributor can speak about the opportunity and upload supporting documents at intake; AI converts these inputs into a structured opportunity brief, researches comparable external solutions with cited sources, and highlights novelty, overlap, evidence gaps, and assumptions. Second, when an opportunity is selected, it is instantiated as a hackathon challenge or track. The system preserves the original value hypothesis and monitors whether the indicators improve, weaken, or remain unproven as teams build and judges assess submissions.

| Model layer | Primary purpose | What exists now | Required extension |
| --- | --- | --- | --- |
| **Value Fieldbook** | Find, shape, evidence, and sponsor opportunities | Signal capture, selected case, value range, confidence, AI rationale, decision gate | Voice intake, document intake, evidence record, source-backed research, selection workflow, indicator history |
| **Hackathon platform** | Organize proof work around selected opportunities | Concept only | Personas, teams, tracks, submissions, rubrics, schedule, announcements, and integrations |
| **Hackathon Agent** | Provide evidence-first co-judging and continuity | Concept only | Extraction, repository audit, claim mismatch review, deterministic scoring, citations, human override, and appeal |
| **Realization and talent graph** | Move validated work into roadmap and retain verified capability signals | Concept only | Post-event investment records, code/roadmap handoff, consent-based talent graph, and monitored repository updates |

## 2. Integrated lifecycle

The supplied materials describe both a five-stage AI-shift view and a four-stage operational lifecycle. Both must be retained. The integrated model uses **four macro phases** with **five operating checkpoints**, so no source framing is lost.

| Macro phase | Operating checkpoint | Value Fieldbook activity | Hackathon platform activity | Primary decision |
| --- | --- | --- | --- | --- |
| **A. Opportunity design** | 1. Capture and research | Voice, documents, structured context, external research, initial value range, evidence gaps | None required yet | Is this a sufficiently important and differentiable opportunity? |
| **A. Opportunity design** | 2. Challenge and strategy | Sponsor alignment, KPI and guardrail definition, research validation, problem statement | Event draft, rules, tracks, prizes, rubric, landing page, data/API access | Should this opportunity become a challenge or proof sprint? |
| **B. Mobilize** | 3. Team formation and ideation | Opportunity context remains available as the source of truth | Registration, profiles, skills, team matching, mentors, onboarding, communications | Are the right teams and resources assembled? |
| **C. Prove** | 4. Build, test, and submit | Indicator snapshots update only when evidence changes | Time-boxed build, repositories, decks, demos, videos, submission validation | Did the build strengthen or weaken the original value case? |
| **D. Decide and realize** | 5. Evidence-first judging and scale | Portfolio gate uses hackathon evidence, not event popularity | AI co-judge audit, human judging, score aggregation, winner/next-step workflow | Advance, reshape, pause, stop, incubate, recruit, or productionize? |

This directly applies the supplied principle that AI reduces effort spent on boilerplate and increases the importance of problem definition, validation, commercial clarity, and post-event realization. The hackathon does **not** replace the Value Fieldbook gate; it is a controlled experiment inside it.

## 3. Opportunity intake, speaking, documents, and source-backed research

Every opportunity begins with an **opportunity dossier**, not a blank submission form. A contributor may record a voice explanation, write a description, and upload relevant documents. The system must provide clear consent and classification controls before recording, transcription, storage, research, or sharing occurs.

| Intake capability | Required behavior | Record created |
| --- | --- | --- |
| **Voice opportunity capture** | Record or upload audio, transcribe it, preserve the original recording where permitted, and let the contributor correct the transcript before it becomes evidence. | Audio asset, transcript, consent record, speaker/submitter attribution |
| **Document intake** | Accept source documents, extract text and metadata, retain the original asset, and present extracted claims for confirmation. Malicious-file scanning, size limits, and access controls are required. | Asset, extracted text, document claims, classification, retention setting |
| **Structured opportunity brief** | Convert confirmed material into problem, user, affected process, current friction, desired outcome, initial value lens, dependencies, risks, and unknowns. | Versioned opportunity brief with provenance links |
| **External landscape research** | Research potentially comparable offerings, open-source projects, startups, public references, patents where approved, and known internal duplicates. Each finding must cite its source URL, access date, excerpt, and relevance. | Research run, sources, similarity assessment, limitations, reviewer status |
| **Selection into hackathon** | A sponsor selects, defers, rejects, or requests more evidence. Only selected opportunities can create a hackathon challenge/track. | Decision record and immutable link from opportunity to challenge |

The **Opportunity Research Agent** must never treat web search similarity as proof of non-originality or legal clearance. It should classify findings as *potentially similar*, *relevant precedent*, *possible differentiator*, or *requires expert review*. A human sponsor, legal/IP reviewer where needed, and domain expert own the conclusion. Every research result must be traceable to a live source and must preserve the uncertainty caused by incomplete search coverage.

## 4. Value indicators and monitoring before, during, and after the hackathon

The model requires a value baseline before a challenge opens. The baseline must be a range with named assumptions, not a fabricated forecast. During the hackathon, indicators are not automatically increased because a team produces a polished demonstration; they move only when evidence supports an update.

| Indicator family | Baseline at selection | Hackathon evidence that may update it | Required audit trail |
| --- | --- | --- | --- |
| **Customer and operational value** | Expected benefit range, affected segment, baseline metric, value mechanism | Validated user feedback, prototype test, telemetry, process evidence, stakeholder confirmation | Source, date, contributor, calculation basis, approved range change |
| **Evidence confidence** | Evidence quality and the gaps that matter | Experiment result, verified data source, test outcome, research validation | Before/after confidence, reason, reviewer |
| **Technical execution** | Delivery hypothesis and relevant technical constraints | Repository audit, build verification, real integrations, test evidence | Code citations, build output, agent report, human override |
| **Claim integrity** | No score until claims exist | Pitch/deck/video/README claims compared with code and demonstrations | Claim source, verdict, cited evidence, appeal outcome |
| **Originality and market context** | Research-based similarity flag, not a numeric declaration of uniqueness | Updated landscape research and semantic similarity screening | Research sources, vector-search evidence, expert review |
| **Delivery fit and ownership** | Named sponsor, dependencies, risk, likely operating owner | Architecture review, data-access confirmation, security/privacy review, capacity confirmation | Gate decision, owner, conditions, next date |

## 5. Mandatory agent architecture

The agents in the supplied materials form one coordinated system. No agent has unilateral authority to fund, reject, hire, award, or penalize a participant.

| Agent or service | Inputs | Output | Mandatory human control |
| --- | --- | --- | --- |
| **Opportunity Intake Agent** | Audio transcript, documents, contributor text | Structured opportunity brief and missing-information prompts | Contributor corrects transcript and confirms meaning |
| **Opportunity Research Agent** | Confirmed brief and approved research scope | Cited market/precedent research, similarity flags, source quality, uncertainty | Sponsor/domain reviewer validates relevance; legal/IP review where needed |
| **Team Matchmaking Agent** | Profile skills, availability, verified skills, interest areas | Suggested complementary teams and gaps | Participants choose teams; no forced matching |
| **Submission Integrity Agent** | Repository, deck, demo video, README, links | Broken-link check, extraction record, provenance package | Organizer resolves failed or disputed ingestion |
| **Code Auditor Agent** | Repository structure, manifests, files, dependencies, git telemetry | `CodeAuditorReport` with technical findings, implementation status, and file/line citations | Human judges inspect evidence and may challenge findings |
| **Claim Mismatch Agent** | Claims inventory plus verified code audit | `ClaimMismatchReport` classifying claims as supported, exaggerated, or ghost | Participant objection and human adjudication are mandatory |
| **Originality Screen** | Opportunity/submission text, approved internal corpus, approved public comparison corpus | Similarity candidates and source links; never a final originality verdict | Human reviewer determines material relevance |
| **Hackathon Agent** | All structured audit outputs, rubric configuration, indicator history | Evidence-first judge brief, deterministic score preview, flags, recommended questions | Human judges retain final scoring and override authority |
| **Realization and Talent Graph services** | Approved project outcomes, audited code/telemetry, opt-in profile data | Roadmap handoff, verified capability records, semantic search context | Consent, retention, and appropriate-use controls; never an autonomous employment decision |

### Hackathon Agent operating rule

The Hackathon Agent is **one judge and an evidence collector—not the final judge**. It must follow the supplied three-tier model: extract facts from decks, videos, repositories, and submissions; cross-reference claims against actual code evidence; then apply the configured rubric deterministically. Its recommendations must expose exact citations. Human judges retain 100% final authority, may override any agent finding with a note, and must have conflict-of-interest recusal support. Participants must have a documented objection path for material AI mistakes.

## 6. Product capabilities and user roles

The integrated product must support **organizers, participants, sponsors, judges, administrators, mentors, and the Hackathon Agent service account**. Sponsor is elevated to an explicit role because the Value Fieldbook requires accountable investment ownership, even though one supplied schema omits that enum value.

| Role | Mandatory capabilities |
| --- | --- |
| **Contributor / participant** | Voice and document opportunity intake; profile, skills, repository/portfolio links; team search, join/invite requests; challenge context; project submission; access to their audit report and objection process |
| **Organizer** | Event and landing-page configuration; schedules, rules, FAQs, tracks, prizes, announcements; rubrics and assignment rules; challenge selection; status management; audit exceptions and event operations |
| **Sponsor** | Opportunity selection, value baseline approval, challenge sponsorship, gate participation, portfolio visibility, and post-event realization decision |
| **Judge / lead judge** | Assigned queue, 30-second evidence-first review, media/brief viewer, code and citation drawer, rubric scoring, AI score prefill, override, recusal, private notes, secondary-review flag, keyboard navigation |
| **Mentor** | Optional assigned-team guidance and office hours without access to restricted judge material |
| **Administrator** | Role management, policy management, audit access, retention, access review, dispute escalation, and reporting |

## 7. Canonical data model and APIs

The sources contain two overlapping relational schemas. The implementation must create **one normalized canonical schema** that retains all fields and relationships required by both variants. Naming may be standardized, but semantic coverage may not be dropped.

| Domain | Canonical entities to include |
| --- | --- |
| **Identity and profiles** | `users`, `user_skills`, `developer_profiles`, `developer_skills`, consent records, role assignments, GitHub/GitLab identity links |
| **Opportunity and research** | `opportunities`, `opportunity_versions`, `opportunity_assets`, `voice_transcripts`, `document_extractions`, `research_runs`, `research_sources`, `value_hypotheses`, `indicator_snapshots`, `gate_decisions` |
| **Events and configuration** | `hackathons`, `tracks`, `prizes`, `rubric_criteria` / `score_criteria`, schedules, announcements, registrations, sponsor relationships |
| **Teams and submissions** | `teams`, `team_members`, team-match requests, `projects` / `submissions`, `submission_tracks`, assets, repositories, demos, decks, claim inventories |
| **Judging and audits** | `judge_assignments`, recusal records, `submission_audits`, code findings, claim audits, `scorecards`, `scorecard_items`, overrides, objections, audit/job status |
| **Talent graph and vector retrieval** | `developer_telemetry`, `developer_embeddings`, `code_embeddings`, `repo_sync_states`, verified project summaries, explicit consent and retention records |

The required judging API surface includes the supplied assignment queue, project audit report, citation/code viewer, and score/override submission endpoints. It must be extended with opportunity intake, asset upload, transcript confirmation, research request/results, selection-to-challenge, indicator history, participant audit-report access, and objection APIs.

## 8. Scoring, fairness, and security controls

The supplied deterministic rubric is the proposed default: **Technical Execution 35%; Claim Integrity 25%; Product Originality 20%; Pitch and Problem Fit 20%**. Application logic—not an LLM prompt—calculates the weighted result. Each dimension should use low-precision anchors with evidence requirements to reduce prose, polish, and verbosity bias.

The following controls are mandatory before any production use.

| Control | Plan requirement |
| --- | --- |
| **Evidence first** | No AI score appears without citations to code lines, deck slides, transcript timestamps, assets, or validated research sources. |
| **Human final authority** | Judges can override, annotate, recuse, flag for secondary review, and finalize scores. The agent cannot make the final award decision. |
| **Participant due process** | Participants can inspect material AI findings and submit a single controlled objection or correction request. |
| **Repository safety** | Repositories are inspected read-only in isolated workers. Untrusted submitted code must not receive production credentials or unrestricted network access. |
| **Privacy and confidentiality** | Voice, document, code, and talent data require access controls, classification, consent, retention, encryption, and audit logs. Sensitive John Deere materials must not be sent to unapproved external research or model providers. |
| **Judge isolation** | Row-level access restricts judges to assigned submissions and their own scorecards; organizers/admins have only the access required by policy. |
| **Bias mitigation** | Separate extraction, audit, scoring, and human review. Do not reward visual polish, long prose, or self-reported skill claims without evidence. |
| **Research transparency** | Search/research results include sources, dates, excerpts, method limitations, and a human validation status. |

## 9. Repository, vector, and background-processing requirements

The supplied hybrid repository inspection model is mandatory: inspect through the repository API first, fall back to a shallow local clone when rate limits or retrieval failures occur, use language-aware static analysis such as AST/tree-sitter where available, and clean temporary workspaces after processing. Commit history, diffs, manifests, implementation logic, mocks, dependencies, and cited file lines must be retained in the audit record.

The talent and code knowledge layer combines relational records with semantic embeddings. PostgreSQL plus `pgvector` is the canonical first choice because it preserves transactional links with the core platform. HNSW cosine indexing, embedding versioning, incremental repository-sync checkpoints, idempotent upserts, and query-time recall tuning remain required. A separate vector service may be adopted later only if scale or latency requirements exceed the relational-database approach.

| Deployment approach | Best fit | Trade-offs | Setup complexity |
| --- | --- | --- | --- |
| **Managed web application with database, protected storage, and durable job queue** | Initial production platform with uploads, APIs, scheduled work, and moderated processing | Simplest operating model; heavy repository analysis may require worker capacity planning | Moderate |
| **Containerized audit-worker service with durable queue** | High submission volumes, heavier inspection tools, or controlled isolated workers | More operational responsibility; supports specialised worker dependencies and horizontal scaling | Higher |

For local development, in-process background execution may be used. For production, durable queued work with persistent job state is required so audits survive worker crashes, deadline spikes, and retries. The exact platform and worker runtime is a pending architecture decision.

## 10. Phased implementation roadmap

| Phase | Scope | Key deliverables | Exit criteria |
| --- | --- | --- | --- |
| **0. Governance and design** | Confirm data classification, consent, research scope, roles, scoring weights, legal/IP review, retention, and sponsor domain | Approved policy pack, canonical data contract, challenge-selection criteria, UX journey | No unresolved decision blocks data handling or judging fairness |
| **1. Extend the current Value Fieldbook** | Add visual and functional opportunity intake, voice/document placeholders, research dossier, selection gate, and indicator history | Usable end-to-end demo that moves an opportunity into a selected challenge | Client can experience intake → research → evidence → selection → challenge handoff |
| **2. Foundation platform** | Identity, roles, relational data model, protected storage, audit logs, event lifecycle, tracks/rubrics, teams, submissions | Secure multi-role application foundation | Role and access tests, including judge isolation, pass |
| **3. Research and opportunity intelligence** | Transcription, document extraction, source-backed research, similarity screen, reviewer workflow, value baseline | Confirmed opportunity dossiers and traceable research evidence | Selected opportunity creates a challenge with provenance intact |
| **4. Hackathon operations** | Landing pages, registration, matchmaking, announcements, schedule, mentor workflow, submission validation | Live-event capability with appropriate deadline resilience | Organizers can run a bounded event without manual spreadsheet dependency |
| **5. Hackathon Agent and judging** | Deck/video/repo extraction, code audit, claim mismatch, deterministic scoring, judge dashboard, override/objection | Evidence-first co-judge operating alongside human judges | Judges can inspect material evidence within the 30-second review standard |
| **6. Realization and talent graph** | Post-event gates, roadmap handoff, repository sync, consent-based verified skills, semantic search | Closed-loop portfolio and talent-learning model | Outcome and governance measures are reported from verified records |

## 11. Explicit source-variant decisions requiring approval

| Decision | Mandatory source variants retained | Proposed canonical approach | Approval required |
| --- | --- | --- | --- |
| **Lifecycle framing** | Four operational phases and five AI-shift phases | Four macro phases with five operating checkpoints, as shown above | Yes |
| **Scoring formula** | 35/25/20/20 full rubric and 50/50 audit-only calculation | Use 35/25/20/20 for final rubric; allow technical/integrity preview during audit processing | Yes |
| **Schema naming** | `projects` versus `submissions`; `rubric_criteria` versus `score_criteria`; differing role enums | One normalized schema with compatibility fields/views; add sponsor and service-account roles | Yes |
| **Background execution** | In-memory FastAPI tasks versus durable Celery/Redis workers | Use in-process only for local development; durable queue and persistent state for production | Yes |
| **Repository retrieval** | API traversal, shallow clone fallback, AST extraction | Implement hybrid API-first / shallow-clone fallback with language-aware analysis | Yes |
| **Vector storage** | PostgreSQL pgvector and optional Qdrant/Pinecone references | Start with PostgreSQL + pgvector + HNSW; evaluate external vector service only at proven scale need | Yes |
| **Talent graph use** | Verified technical profile and semantic search | Make opt-in, evidence-scoped, access-controlled, and non-autonomous for employment decisions | Yes |

## 12. Verbatim source register and traceability

The following files are preserved as the authoritative verbatim input set. This section is part of the plan’s source-preservation mechanism: the linked files contain the complete original text, code, schemas, prompts, and examples without reinterpretation or omission.

| Source | Preserved verbatim file | Mandatory contribution to this plan |
| --- | --- | --- |
| 01 | [`00_original_ai_hackathon_context.txt`](source_material/00_original_ai_hackathon_context.txt) | Five phases, AI shift, and value-bottleneck framing |
| 02 | [`2_pasted_content_2.txt`](source_material/2_pasted_content_2.txt) | Personas, platform features, normalized schema, media, spikes, real-time updates |
| 03 | [`3_pasted_content_3.txt`](source_material/3_pasted_content_3.txt) | Four operational phases and AI leverage points |
| 04 | [`4_pasted_content_4.txt`](source_material/4_pasted_content_4.txt) | Evidence-first AI Co-Judge architecture, rubric, fairness controls |
| 05 | [`5_pasted_content_5.txt`](source_material/5_pasted_content_5.txt) | Code Auditor and Claim Mismatch prompts, schemas, deterministic formula |
| 06 | [`6_pasted_content_6.txt`](source_material/6_pasted_content_6.txt) | Human Judge Dashboard, 30-second standard, override UX |
| 07 | [`7_pasted_content_7.txt`](source_material/7_pasted_content_7.txt) | Developer Talent Graph, vector strategy, schema, semantic search |
| 08 | [`8_pasted_content_8.txt`](source_material/8_pasted_content_8.txt) | Judging REST APIs and payload contracts |
| 09 | [`9_pasted_content_9.txt`](source_material/9_pasted_content_9.txt) | Structured auditor/mismatch pipeline implementation |
| 10 | [`10_pasted_content_10.txt`](source_material/10_pasted_content_10.txt) | GitHub API extraction and audit pipeline integration |
| 11 | [`11_pasted_content_11.txt`](source_material/11_pasted_content_11.txt) | Hybrid API/clone/AST fallback architecture |
| 12 | [`12_pasted_content_12.txt`](source_material/12_pasted_content_12.txt) | Asynchronous API and task-status implementation |
| 13 | [`13_pasted_content_13.txt`](source_material/13_pasted_content_13.txt) | Durable worker, Redis state, queue, container deployment requirements |
| 14 | [`14_pasted_content_14.txt`](source_material/14_pasted_content_14.txt) | Repository vector synchronization worker and incremental embedding strategy |
| 15 | [`15_pasted_content_15.txt`](source_material/15_pasted_content_15.txt) | HNSW index, tuning, SQLAlchemy, and query requirements |
| 16 | [`16_pasted_content_16.txt`](source_material/16_pasted_content_16.txt) | Platform requirements, production relational schema, aggregate scoring query |
| 17 | [`17_pasted_content_17.txt`](source_material/17_pasted_content_17.txt) | Judge assignments and row-level security requirements |

## 13. Recommendation

The concept fits strongly. The Value Fieldbook solves the missing upstream and downstream problem in a traditional hackathon: it identifies the right opportunity, preserves its source evidence, makes the value hypothesis explicit, and ensures the event produces an accountable decision rather than a stranded prototype. The Hackathon Agent then improves fairness and speed only when it remains auditable, citation-led, and subordinate to human judges.

The immediate next action is **Phase 0 governance and design**: choose the first John Deere opportunity domain, approve the canonical scoring formula and data/consent controls, name the sponsor and lead judge, and set the allowed external-research scope. Then Phase 1 can extend the existing interactive demo into the full intake → research → selection → hackathon handoff journey.
