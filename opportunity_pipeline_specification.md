# John Deere Idea Value Studio — Opportunity Pipeline & Incubation Specification

## 1. Executive Summary & Design Principle
The John Deere Idea Value Studio replaces unstructured hackathons with a governed, continuous investment pipeline. Incubation is treated as a first-class crowdsourced opportunity marketplace where employees submit transformative capabilities, community members review and vote (**Yes / No / Undecided** with required rationale for No and Undecided), and executive owners slate approved opportunities into structured hackathon proof events.

---

## 2. Actor Personas & Core Journeys

### A. The Opportunity Submitter (Innovator / Sponsor)
* **Goal**: Ingest a transformative idea into the organization with rigorous business justification before any hackathon is scheduled.
* **Intake Requirements**:
  1. **Title & Problem Statement**: What operational bottleneck or transformation opportunity exists?
  2. **Impact Narrative**: How does this affect John Deere’s operations, dealer network, or agronomic outcomes?
  3. **Financial Economics**: Sponsor-entered investment cost, potential return on investment (ROI), duration (timeline to value), and baseline assumptions.
  4. **Transformation Rubric Mapping**: Evaluation against Disrupt, Optimize, Reimagine, Reinvent.
  5. **"Why Now?"**: Strategic urgency and alignment with enterprise key results.
  6. **Upfront Attachments**: Business cases, financial models, system diagrams, or technical documents.

### B. The Community Evaluator (Peer Reviewer)
* **Goal**: Review incoming opportunities in a card/widget gallery, inspect economics and attachments, ask clarifying questions, and cast structured votes.
* **Review Requirements**:
  1. **Opportunity Gallery**: Cards showing title, brief impact, potential ROI, duration, and aggregate vote counts.
  2. **Expanded Opportunity Detail Modal / Drawer**: Full executive summary, impact narrative, attached documents (with inline preview), community comments, and question submission.
  3. **Structured Voting**: Explicit **Yes**, **No**, or **Undecided** voting actions. A rationale and feedback response is **required** when voting **No** or **Undecided**, ensuring that objections and missing information are fully explained.
  4. **Clarification Q&A**: Ability to submit questions to the submitter before finalizing a vote.

### C. The Executive Owner / VMO Manager (Gatekeeper)
* **Goal**: Monitor community sentiment, review consolidated financial economics and preliminary evaluations, and slate approved opportunities into structured hackathon proof events.

---

## 3. Screen-by-Screen Interface Specification

### Screen 1: The Innovation Portfolio & Opportunity Marketplace (`/`)
* **Purpose**: Primary landing page showing active crowdsourced opportunities across the enterprise.
* **Layout**:
  - **Top Navigation**: Logo, title, operating principle (*"Community informs. Humans decide."*), Tenant Admin, and Direct CTA (*"Submit New Opportunity"*).
  - **Portfolio Metrics**: Total open campaigns, active investment cases, live team proofs, and recorded human gates.
  - **Opportunity Cards (Grid View)**: Each card is an interactive widget displaying:
    - Opportunity Title & Subtitle.
    - Key Financial Metrics Badge: Potential ROI, Investment Cost, Duration.
    - Community Sentiment Indicator: Yes / No / Undecided breakdown and total votes.
    - Quick Action: **"Inspect & Vote"** (opens the detailed opportunity modal/drawer).

### Screen 2: Opportunity Deep-Dive & Community Voting Modal/Drawer
* **Purpose**: Comprehensive review surface for a single crowdsourced opportunity.
* **Tabs / Sections**:
  1. **Executive Summary & Impact**: Problem statement, operational narrative, and "Why Now?".
  2. **Financial Economics**: Sponsor ROI, cost to prove, duration, and KPI/OKR alignment.
  3. **Attached Business Plans**: List of uploaded documents with inline preview and secure download.
  4. **Community Discussion & Q&A**: Live feed of comments, questions for the submitter, and qualitative feedback.
  5. **Voting & Rationale Form**:
     - Radio or button group: **Yes**, **No**, **Undecided**.
     - Textarea: Rationale / feedback (required for No and Undecided; optional for Yes).
     - Submit button: Records vote instantly and updates community sentiment metrics.

### Screen 3: Opportunity Ingestion Wizard (`/studio/submit`)
* **Purpose**: Structured form for submitters to introduce new capabilities.
* **Sections**:
  1. *Core Identity*: Title, brief thesis, operational domain.
  2. *Value & Impact*: Detailed narrative and strategic alignment.
  3. *Financial Workpaper*: Investment cost, ROI estimate, duration.
  4. *Transformation Alignment*: Rubric selection (Disrupt, Optimize, Reimagine, Reinvent).
  5. *Document Vault*: File upload dropzone for business cases and technical files.

---

## 4. Database & API Contract Adjustments
- `investment_cases` table stores title, investment thesis, status, business case, and financial detail JSON.
- `campaign_assessments` table stores stance (`yes`, `no`, `undecided`), valuation score, qualitative feedback, and rationale.
- `case_assets` table stores file attachments and S3 URLs.
