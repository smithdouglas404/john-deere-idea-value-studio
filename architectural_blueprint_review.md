# Architectural Review & Clean Blueprint

## 1. Why Prior Iterations Failed (The Root Architectural Flaw)
In earlier turns, instead of replacing legacy campaign management screens, new features (voting, reviews, evaluation panels) were layered on top or nested inside them. This resulted in:
- A confusing landing experience that started on a campaign management page rather than an opportunity marketplace.
- Fragmented navigation where users had to click through multiple tabs to find basic financial data or voting buttons.
- Cluttered UI mixing incubation noise with hackathon event operations.

---

## 2. The Clean Two-Persona Architectural Blueprint

### Persona 1: The Incubation Marketplace (Crowdsourcing & Review)
* **Root Entry (`/`)**: Displays the **Opportunity Marketplace** directly.
* **Layout**:
  - Clean top bar: Portfolio summary, "Submit Opportunity" button, and Admin console.
  - Interactive Opportunity Widgets (Cards): Each card shows title, brief impact, ROI, duration, attachment count, and Yes/No/Undecided sentiment.
  - **Click-to-Expand Detail Modal**: Clicking any widget opens a dedicated review panel containing:
    1. Executive Summary & Problem Statement.
    2. Financial Economics (ROI, Investment Cost, Duration, Cost to Prove).
    3. Attached Documents (with in-browser preview).
    4. Community Discussion & Q&A.
    5. Explicit Voting widget (**Yes / No / Undecided**) with mandatory rationale for No and Undecided.

### Persona 2: The Hackathon Judge Cockpit (Event Operations & Evidence)
* **Entry (`/studio/events/:id/judging`)**: Reached only when an executive owner explicitly slates an approved opportunity into a scheduled hackathon.
* **Layout**:
  - **Collapsed Incubation Header**: Clean summary of where the opportunity came from without cluttering the screen.
  - **Participant Proof Work**: Provisioned GitHub repo (`Inflexcvi`), commit history, and uploaded team artifacts.
  - **Specialist Claude Evidence Dashboard**: Tabbed, wide view of all 5 specialist evaluations (Security, Cloud Architecture, Code Delivery, UX/UI, Value & Feasibility) with explicit findings, citations, and limitations.
  - **Human Decision Authority**: Transformation rubric scorecards, judge questions, agent disagreement notes, re-synthesis triggers, and certified winner award.

---

## 3. Action Plan (Waiting for User Sign-Off)
1. **Remove legacy campaign-first routing** and make the Opportunity Marketplace the true root page.
2. **Purge redundant/conflicting UI panels** that caused screen clutter.
3. **Build the Marketplace and Judge Cockpit as standalone, uncluttered screens** matching this blueprint.

*No code will be written until you review and confirm this blueprint.*
