# John Deere Idea Value Studio — Design Direction

## Three Candidate Approaches

### 1. The Value Fieldbook
**Very Brief Intro:** A light, field-notebook-inspired operating interface that makes every idea feel traceable from insight to funded value. It balances agricultural cues with executive decision discipline.

**Probability:** 0.07

### 2. Control Room Precision
**Very Brief Intro:** A dark industrial command center built around signal detection, investment gates, and portfolio analytics. It makes the experience feel like a real-time strategic operating system.

**Probability:** 0.04

### 3. Community Signal Exchange
**Very Brief Intro:** An editorial, human-centered landscape that spotlights the contributors, evidence, and collaboration behind high-quality innovation. It privileges participation before governance.

**Probability:** 0.09

---

## Chosen Approach: The Value Fieldbook

### Design Movement
**Swiss systems thinking meets a field-research notebook.** The interface should feel as rigorous as an investment review and as grounded as a working session with the people closest to the equipment, customer, and operation.

### Core Principles
1. **Value is visible early.** Every submitted idea is immediately connected to a value hypothesis, evidence, confidence level, and next investment decision.
2. **AI is an accountable co-pilot.** AI recommendations expose their rationale and sources rather than behaving as an opaque scoring machine.
3. **Participation earns progression.** Crowd input remains welcome, but the experience promotes ideas through explicit evidence gates—not event-day enthusiasm.
4. **The portfolio is the product.** The user sees an evolving, investable pipeline rather than an isolated list of hackathon concepts.

### Color Philosophy
The base is a warm, light oat-and-paper canvas that communicates approachability and practical work. Deep agricultural green represents durability, stewardship, and decision authority; high-visibility yellow is reserved for moments of commitment, signal, and progress. Muted soil, wheat, and slate tones organize information without creating visual noise.

### Layout Paradigm
Use a **field-to-fund journey** rather than a conventional dashboard grid: a narrow evidence ledger on the left, an expansive working canvas in the center, and a context-sensitive investment rail on the right. Progress should read as a deliberate movement across a value landscape—from raw signal to evidence to portfolio action.

### Signature Elements
1. **Contour-line topography:** restrained terrain lines and elevation bands indicate maturation and movement through investment gates.
2. **Field tags:** compact, squared-off labels that show signal source, value type, evidence state, and sponsor.
3. **Value pulse rings:** thin circular indicators that visualize confidence, potential, and proof without resorting to generic score gauges.

### Interaction Philosophy
Interactions should feel like a facilitator helping a team make a better decision. Clicking an idea reveals a short evidence trail and AI rationale; adjusting an assumption visibly changes the value case; sending an idea forward is a clear, consequential action—not a celebratory gamification moment.

### Animation
Motion is subtle, purposeful, and under 300ms. A newly promoted idea should move along the field-to-fund path with a brief lift and settle; evidence cards should cross-fade and rise 8px when revealed; pulse rings should use a restrained, low-opacity expansion once when a value case is recalculated. All nonessential motion must honor reduced-motion preferences.

### Typography System
Headlines use **DM Serif Display** for confident, editorial authority. Operational labels, calculations, and controls use **IBM Plex Sans** with generous tracking for precision. Key numeric outcomes use tabular numerals and a medium-to-bold weight; sentence-case microcopy stays direct and unadorned.

### Brand Essence
**An AI-enabled idea-to-investment studio for John Deere teams that turns widespread expertise into a governable portfolio of measurable value.**

**Personality:** grounded, decisive, transparent.

### Brand Voice
Headlines name the decision or opportunity, not the technology. CTAs use action language that reflects investment discipline; microcopy makes uncertainty and assumptions explicit.

> “Move the strongest field insight toward a funded proof.”

> “Show the evidence behind this value estimate.”

### Wordmark & Logo
The mark is a compact **seed-to-signal glyph**: three staggered contour arcs intersected by a directional seed/arrow form. It suggests an idea taking root, gaining evidence, and moving toward a decision. The wordmark is custom-set in a condensed, confident sans treatment—never a default font treatment.

### Signature Brand Color
**Signal Harvest** — a saturated, high-visibility yellow used sparingly to identify the ideas and decisions that are ready to move.

## Style Decisions

1. **System architecture:** The interface must read left-to-right as an **evidence ledger → working value canvas → investment decision rail**. Dashboard patterns are subordinate to this journey.
2. **Brand signature:** The seed-to-signal glyph and a condensed, custom-feeling Value Fieldbook wordmark appear at the primary entry point. “John Deere Idea Value Studio” remains visible as the connected experience context.
3. **Contour ownership:** Topographic bands and progression paths are functional signals of maturation through investment gates, not generic background decoration.
4. **Signal Harvest discipline:** Harvest yellow is used only for readiness, movement, committed next actions, and headline value figures—not as a general-purpose accent or a warning state.

## Integrated Product Validation Note

The opportunity dossier now presents the AI Decision Cockpit directly below the opportunity context and before voice/document intake or proof-sprint controls. It visibly separates sponsor-entered economics from AI-organized evidence and preserves a human-owned investment gate. Event HQ now shows a dedicated “Proof stage of the investment case” panel with an “Open value case” link, framing the hackathon as controlled evidence generation rather than a replacement decision process.

The corrected AI Decision Cockpit now renders one clear human investment-gate panel alongside the economic case and the AI evidence interpretation. It includes recorded confidence movement and a sensitivity view only when sponsor-entered proof cost and value ranges are available; empty states explicitly identify missing evidence rather than inventing values.

The participant evidence workspace is confirmed live at `/submissions`. It renders the project selector, repository/demo/video/deck evidence fields, and claim-specific objection workflow within the same Fieldbook operating system; the prior route-level 404 and stale component-resolution warning were cleared by restarting the managed development service and validating the rendered route.
