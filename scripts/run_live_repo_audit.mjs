import { evaluateStudioProof } from "../server/services/studioEvidenceAgent.js";

async function main() {
  console.log("Running live 10-lens studio evidence agent audit with a public test repository...");
  const result = await evaluateStudioProof({
    investmentTitle: "Dealer service mobile signal triage",
    investmentThesis: "Offline-first dealer mobile triage reduces technician diagnostic time by 28%.",
    problemStatement: "Service technicians spend significant time calling back-office support for legacy machine error codes.",
    businessCase: "Projected dealer savings: $1.2M annually across North American service networks.",
    proofQuestion: "Can the React Native mobile client maintain resilient local sync and rapid error-code lookup while consuming the central dealer API?",
    requiredArtifacts: [
      { key: "repo", label: "Repository client delivery", required: true, purpose: "Code delivery and maintainability" },
      { key: "brd", label: "Business requirements", required: true, purpose: "Scope and user workflow" },
    ],
    rubric: [
      { key: "code_quality", label: "Code delivery & maintainability", weight: 40, description: "Clean structure and robust sync" },
      { key: "business_value", label: "Business value", weight: 60, description: "Clear dealer savings" },
    ],
    solutionSummary: "Built an offline-first React Native client with local SQLite caching and secure API synchronization.",
    artifacts: [
      {
        artifactKey: "repo",
        artifactType: "repository",
        title: "Public reference mobile repository",
        evidenceUrl: "https://github.com/octocat/Spoon-Knife",
        extractedText: "Repository structure: HTML/CSS/JS sample repo with robust contributor guidelines, standard git workflow, clean directory layout, and clear licensing.",
      },
      {
        artifactKey: "brd",
        artifactType: "brd",
        title: "Dealer mobile workflow BRD",
        evidenceUrl: "https://example.com/dealer-brd.pdf",
        extractedText: "Business requirements: technician diagnostic lookup must operate without cellular coverage and sync cleanly upon reconnection.",
      },
    ],
  });

  console.log("\n--- LIVE EVIDENCE AGENT RESULT ---");
  console.log("Skill Findings Count:", result.skillFindings.length);
  for (const skill of result.skillFindings) {
    console.log(`\n[${skill.skill.toUpperCase()}] Verdict: ${skill.verdict}`);
    console.log(`Finding: ${skill.finding}`);
    console.log(`Judge Question: ${skill.question}`);
  }
  console.log("\nLimitations:", result.limitations);
  console.log("Agent Findings:", result.agentFindings.length);
  console.log("Judge Questions:", result.judgeQuestions.length);
}

main().catch(err => {
  console.error("Live repo audit failed:", err);
  process.exit(1);
});
