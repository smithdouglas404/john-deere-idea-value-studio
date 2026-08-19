import { useMemo, useState } from "react";
import { BrainCircuit, CheckCircle2, Gavel, Loader2, MessageCircleQuestion, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

type ArtifactRule = { key: string; label: string; required: boolean; purpose: string };
type Rubric = { key: string; label: string; weight: number; description: string };

const skillCatalog = [
  { key: "business_case", label: "Business case", focus: "Thesis, assumptions, and investment contribution" },
  { key: "business_requirements", label: "BRD review", focus: "Requirements, stakeholders, and acceptance conditions" },
  { key: "ux_ui", label: "UX/UI review", focus: "Task flow, accessibility, and demonstrated interface evidence" },
  { key: "technical_design", label: "Technical documentation", focus: "Architecture, integration, and operating constraints" },
  { key: "cloud_architecture", label: "Cloud architecture", focus: "Deployment boundaries, resilience, observability, and operating fit" },
  { key: "code_delivery", label: "Code assessment", focus: "Repository evidence, delivery quality, and maintainability" },
  { key: "security", label: "Security review", focus: "Security, privacy, and operational resilience" },
  { key: "market_value", label: "Market relevance", focus: "Customer value, alternatives, and adoption evidence" },
  { key: "innovation", label: "Innovation", focus: "Differentiation and proof of novelty" },
  { key: "efficiency_optimization", label: "Cost & efficiency", focus: "Cost reduction, optimization, and measurable operating value" },
] as const;

export const specialistSkillTabs = [{ key: "all", label: "Skills overview" }, ...skillCatalog.map(skill => ({ key: skill.key, label: skill.label }))] as const;

function records(value: unknown) { return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : []; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

export function CleanEvidenceDecisionPanel({ caseId, proof, candidate, artifacts, packet, decision, gate }: { caseId: number; proof: { id: number; status: string }; candidate: { id: number; proofQuestion: string; requiredArtifacts: ArtifactRule[]; rubric: Rubric[] }; artifacts: Array<{ artifactKey: string }>; packet: any; decision: any; gate: any }) {
  const utils = trpc.useUtils();
  const runPacket = trpc.studio.runEvidencePacket.useMutation({ onSuccess: () => utils.studio.caseWorkspace.invalidate({ caseId }) });
  const recordDecision = trpc.studio.recordJudgeDecision.useMutation({ onSuccess: () => utils.studio.caseWorkspace.invalidate({ caseId }) });
  const setGate = trpc.studio.setInvestmentGate.useMutation({ onSuccess: () => utils.studio.caseWorkspace.invalidate({ caseId }) });
  const [humanDecision, setHumanDecision] = useState<"advance" | "runner_up" | "return_to_proof" | "archive" | "no_decision">("no_decision");
  const [humanRationale, setHumanRationale] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [gateStatus, setGateStatus] = useState<"advance_assessment" | "fund" | "return_to_proof" | "hold" | "archive">("advance_assessment");
  const [gateRationale, setGateRationale] = useState("");
  const missing = useMemo(() => candidate.requiredArtifacts.filter(item => item.required && !artifacts.some(artifact => artifact.artifactKey === item.key)), [artifacts, candidate.requiredArtifacts]);
  const agentFindings = records(packet?.agentFindings);
  const skills = records(packet?.skillFindings);
  const teamQuestions = records(packet?.teamQuestions);
  const judgeQuestions = records(packet?.judgeQuestions);
  const limitations = strings(packet?.limitations).map(item => /\b(412|llm invoke|provider|quota|usage exhausted)\b/i.test(item) ? "The governed Agent evaluation did not complete. Retry the packet before relying on an AI assessment." : item);

  if (!packet) return <section className="mt-6 border border-[#cbd6c8] bg-[#eef2eb] p-5"><div className="flex items-start gap-3"><BrainCircuit className="mt-0.5 h-5 w-5 text-[#1b5e3a]" /><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#55705b]">Evidence & agents</p><h3 className="mt-1 font-serif text-2xl text-[#173d2a]">Create one evidence packet for this proof record.</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#556557]">The Agent receives the investment thesis, proof question, configured rubric, and only the authorized artifacts on this record. It creates advisory findings and questions; it cannot score a winner or set the investment gate.</p></div></div>{missing.length ? <div className="mt-5 border border-[#d6c48b] bg-[#fff9e7] p-4 text-sm leading-6 text-[#69591e]">Complete these required artifacts first: {missing.map(item => item.label).join(" · ")}</div> : <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border border-[#bfd0bc] bg-white p-4"><p className="text-sm leading-6 text-[#526456]">All required artifacts are present. Run the governed Agent packet when the team is ready for evidence review.</p><Button onClick={() => runPacket.mutate({ teamProofId: proof.id })} disabled={runPacket.isPending} className="h-10 rounded-none bg-[#173d2a] text-[10px] font-bold uppercase tracking-[.12em]">{runPacket.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running Agent…</> : <><BrainCircuit className="mr-2 h-4 w-4" />Run evidence Agent</>}</Button></div>}{runPacket.error && <p className="mt-3 text-sm text-red-700">{runPacket.error.message}</p>}</section>;

  return <><section id="evidence-agent" className="mt-6 border border-[#bdd0b8] bg-[#eef4e9] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><BrainCircuit className="mt-0.5 h-5 w-5 text-[#1b5e3a]" /><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#55705b]">Evidence & agents · advisory</p><h3 className="mt-1 font-serif text-2xl text-[#173d2a]">Claude skill dashboard for this investment proof.</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#556557]">This packet stays tied to the proof question: “{candidate.proofQuestion}” Human judges can challenge or correct the packet; the packet cannot create a human decision.</p></div></div><span className="border border-[#bdd0b8] bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]">{String(packet.status).replace(/_/g, " ")}</span></div>
    <SkillDashboard skills={skills} marketContext={packet?.marketContext} />
    <div className="mt-5 grid gap-4 lg:grid-cols-2"><PacketList eyebrow="Agent findings" rows={agentFindings} titleKey="claim" bodyKey="reasoning" metaKey="assessment" /><PacketList eyebrow="Evidence gaps & recommendations" rows={skills.filter(item => String(item.verdict) !== "supported")} titleKey="skill" bodyKey="question" metaKey="verdict" /></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2"><QuestionList eyebrow="Team response questions" rows={teamQuestions} action="Team action: respond through an authorized artifact, demo, or evidence update; then refresh the advisory packet." /><QuestionList eyebrow="Judge review questions" rows={judgeQuestions} action="Judge action: use these questions in the presentation, scorecard, and independent written rationale." /></div>
    {limitations.length > 0 && <p className="mt-5 border-l-2 border-[#876e16] pl-3 text-xs leading-5 text-[#6c5a1b]">Limitations: {limitations.join(" · ")}</p>}
    {!decision ? <section className="mt-6 border-t border-[#c4d6c0] pt-5"><div className="flex items-start gap-3"><Gavel className="mt-0.5 h-5 w-5 text-[#1b5e3a]" /><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#55705b]">Human judge handoff</p><h3 className="mt-1 font-serif text-2xl text-[#173d2a]">Record an independent decision beside the evidence.</h3><p className="mt-2 text-sm leading-6 text-[#556557]">The scorecard and written rationale remain human-owned. The Agent packet is cited input, not an answer key.</p></div></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><label className="text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">Human outcome<select value={humanDecision} onChange={event => setHumanDecision(event.target.value as typeof humanDecision)} className="mt-2 h-11 w-full border border-[#cbd6c8] bg-white px-3 text-sm font-normal text-[#173d2a]"><option value="no_decision">No decision yet</option><option value="advance">Advance</option><option value="runner_up">Runner up</option><option value="return_to_proof">Return to proof</option><option value="archive">Archive</option></select></label><div className="grid gap-3 sm:grid-cols-2">{candidate.rubric.map(item => <label key={item.key} className="text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">{item.label} ({item.weight}%)<input type="number" min="0" max="100" value={scores[item.key] || ""} onChange={event => setScores(current => ({ ...current, [item.key]: event.target.value }))} className="mt-2 h-11 w-full border border-[#cbd6c8] bg-white px-3 text-sm font-normal text-[#173d2a]" placeholder="0–100" /></label>)}</div></div><label className="mt-4 block text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">Independent human rationale<textarea value={humanRationale} onChange={event => setHumanRationale(event.target.value)} className="mt-2 min-h-28 w-full border border-[#cbd6c8] bg-white p-3 text-sm font-normal leading-6 text-[#173d2a]" placeholder="State what evidence you accepted, challenged, or require next. This does not overwrite the Agent packet." /></label><Button disabled={recordDecision.isPending || humanRationale.trim().length < 20 || Object.keys(scores).length !== candidate.rubric.length} onClick={() => recordDecision.mutate({ teamProofId: proof.id, evidencePacketId: packet.id, decision: humanDecision, rationale: humanRationale.trim(), rubricScores: candidate.rubric.map(item => ({ key: item.key, score: Number(scores[item.key]), rationale: humanRationale.trim() })) })} className="mt-4 h-11 rounded-none bg-[#173d2a] text-[10px] font-bold uppercase tracking-[.12em]">{recordDecision.isPending ? "Recording…" : "Record human decision"}<Send className="ml-2 h-4 w-4" /></Button>{recordDecision.error && <p className="mt-3 text-sm text-red-700">{recordDecision.error.message}</p>}</section> : <section className="mt-6 border-t border-[#c4d6c0] pt-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-[#1b5e3a]" /><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#55705b]">Human outcome recorded</p><h3 className="mt-1 font-serif text-2xl text-[#173d2a]">{String(decision.decision).replace(/_/g, " ")}</h3><p className="mt-2 text-sm leading-6 text-[#556557]">{decision.rationale}</p></div></div>{!gate && <div className="mt-5 border border-[#c7d6c3] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#55705b]">Sponsor investment gate</p><div className="mt-3 grid gap-4 lg:grid-cols-2"><label className="text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">Gate outcome<select value={gateStatus} onChange={event => setGateStatus(event.target.value as typeof gateStatus)} className="mt-2 h-11 w-full border border-[#cbd6c8] bg-white px-3 text-sm font-normal text-[#173d2a]"><option value="advance_assessment">Advance assessment</option><option value="fund">Fund</option><option value="return_to_proof">Return to proof</option><option value="hold">Hold</option><option value="archive">Archive</option></select></label><label className="text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">Investment-gate rationale<textarea value={gateRationale} onChange={event => setGateRationale(event.target.value)} className="mt-2 min-h-24 w-full border border-[#cbd6c8] bg-white p-3 text-sm font-normal leading-6 text-[#173d2a]" placeholder="Explain how proof evidence moved, did not move, or weakened the original assumptions." /></label></div><Button disabled={setGate.isPending || gateRationale.trim().length < 20} onClick={() => setGate.mutate({ investmentCaseId: caseId, proofCandidateId: candidate.id, status: gateStatus, rationale: gateRationale.trim(), assumptionMovement: [{ assumption: "Investment thesis", movement: gateStatus === "return_to_proof" ? "missing_evidence" : "strengthened", rationale: gateRationale.trim() }] })} className="mt-4 h-11 rounded-none bg-[#173d2a] text-[10px] font-bold uppercase tracking-[.12em]">{setGate.isPending ? "Recording…" : "Set investment gate"}<CheckCircle2 className="ml-2 h-4 w-4" /></Button>{setGate.error && <p className="mt-3 text-sm text-red-700">{setGate.error.message}</p>}</div>}{gate && <p className="mt-5 border border-[#bdd0b8] bg-white p-4 text-sm leading-6 text-[#405144]">Investment gate: <b>{String(gate.status).replace(/_/g, " ")}</b> · {gate.rationale}</p>}</section>}
  </section>{decision && <JudgeCorrectionPanel proofId={proof.id} decision={decision} caseId={caseId} />}{decision && gate && <InvestmentLearningPanel caseId={caseId} candidate={candidate} decision={decision} gate={gate} packet={packet} />}</>;
}

function PacketList({ eyebrow, rows, titleKey, bodyKey, metaKey }: { eyebrow: string; rows: Array<Record<string, unknown>>; titleKey: string; bodyKey: string; metaKey: string }) { return <article className="border border-[#c7d6c3] bg-white p-4"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#687668]">{eyebrow}</p>{rows.length ? <div className="mt-3 space-y-3">{rows.map((row, index) => <div key={`${String(row[titleKey])}-${index}`} className="border-l-2 border-[#876e16] pl-3"><p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#765d12]">{String(row[metaKey] || "advisory")}</p><p className="mt-1 text-sm font-bold text-[#173d2a]">{String(row[titleKey] || "Untitled finding")}</p><p className="mt-1 text-xs leading-5 text-[#526456]">{String(row[bodyKey] || "No detail supplied.")}</p><p className="mt-1 text-[10px] text-[#748174]">Evidence: {strings(row.evidenceRefs).join(", ") || "No authorized reference"}</p></div>)}</div> : <p className="mt-3 text-sm leading-6 text-[#69766a]">No findings were returned. Human review remains available.</p>}</article>; }
function SkillDashboard({ skills, marketContext }: { skills: Array<Record<string, unknown>>; marketContext: unknown }) {
  const [selectedLens, setSelectedLens] = useState<string>("all");
  const byKey = new Map(skills.map(item => [String(item.skill), item]));
  const market = marketContext && typeof marketContext === "object" ? marketContext as Record<string, unknown> : null;
  const filteredCatalog = selectedLens === "all" ? skillCatalog : skillCatalog.filter(s => s.key === selectedLens);

  const exportCSV = () => {
    const headers = ["Lens", "Label", "Verdict", "Finding", "Citations", "Review Limitation", "Next Question"];
    const rows = skillCatalog.map(skill => {
      const finding = byKey.get(skill.key);
      const verdict = String(finding?.verdict || "needs_evidence");
      const findingText = String(finding?.finding || "Awaiting evidence.").replace(/"/g, '""');
      const citations = strings(finding?.evidenceRefs).join("; ");
      const limitation = verdict === "supported" ? "Advisory evidence; human determines score." : "Evidence incomplete.";
      const question = String(finding?.question || "What evidence resolves this?").replace(/"/g, '""');
      return [skill.key, `"${skill.label}"`, verdict, `"${findingText}"`, `"${citations}"`, `"${limitation}"`, `"${question}"`].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "john_deere_evidence_evaluation.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDFText = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = `<!DOCTYPE html><html><head><title>John Deere Investment Proof - Evaluation Report</title><style>body{font-family:sans-serif;padding:30px;color:#173d2a;} h1{font-size:22px;border-bottom:2px solid #173d2a;padding-bottom:10px;} .lens{margin-bottom:20px;border:1px solid #bdd0b8;padding:15px;background:#f9fbf8;} h3{margin:0 0 8px 0;color:#1b5e3a;} p{margin:4px 0;font-size:14px;line-height:1.5;}</style></head><body><h1>John Deere Investment Proof - 10-Lens Evidence Evaluation</h1><p><b>Generated:</b> ${new Date().toLocaleString()}</p><hr/>${skillCatalog.map(skill => {
      const finding = byKey.get(skill.key);
      const verdict = String(finding?.verdict || "needs_evidence");
      const findingText = String(finding?.finding || "Awaiting evidence.");
      const citations = strings(finding?.evidenceRefs).join(", ") || "None";
      const question = String(finding?.question || "None");
      return `<div class="lens"><h3>${skill.label} (${skill.key})</h3><p><b>Verdict:</b> ${verdict}</p><p><b>Finding:</b> ${findingText}</p><p><b>Citations:</b> ${citations}</p><p><b>Next Question:</b> ${question}</p></div>`;
    }).join("")}</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#bdd0b8] bg-white p-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#687668]">Review control & export</p>
          <p className="mt-1 text-sm font-medium text-[#173d2a]">Filter lenses or export evaluation packet for physical judges</p>
        </div>
        <div className="flex w-full flex-col gap-4">
          <div role="tablist" aria-label="Specialist evidence skills" className="flex w-full gap-2 overflow-x-auto border-b border-[#d9e3d5] pb-1">
            {specialistSkillTabs.map(tab => <button key={tab.key} type="button" role="tab" aria-selected={selectedLens === tab.key} onClick={() => setSelectedLens(tab.key)} className={selectedLens === tab.key ? "shrink-0 border-b-2 border-[#173d2a] bg-[#eef4e9] px-3 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-[#173d2a]" : "shrink-0 border-b-2 border-transparent px-3 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-[#6d7b6e] hover:border-[#bdd0b8] hover:text-[#173d2a]"}>{tab.label}</button>)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-5 text-[#657366]">{selectedLens === "all" ? "Read the complete advisory packet, then open a lens for a focused review." : `Focused lens: ${specialistSkillTabs.find(tab => tab.key === selectedLens)?.label || "Specialist skill"}`}</p>
            <div className="flex flex-wrap gap-3"><Button onClick={exportCSV} variant="outline" className="h-10 rounded-none border-[#1b5e3a] text-[10px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]">Export CSV</Button><Button onClick={exportPDFText} className="h-10 rounded-none bg-[#173d2a] text-[10px] font-bold uppercase tracking-[.1em] text-white">Export PDF / Print</Button></div>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-5 xl:grid-cols-2">
        {filteredCatalog.map(skill => {
          const finding = byKey.get(skill.key);
          const verdict = String(finding?.verdict || "needs_evidence");
          const citations = strings(finding?.evidenceRefs);
          const limitation = verdict === "supported" ? "This is advisory evidence; a human still determines the score and outcome." : "Evidence is incomplete or absent for this lens; do not treat this as a negative decision.";
          return (
            <article key={skill.key} className="border border-[#c7d6c3] bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-[#173d2a]">{skill.label}</p>
                <span className={verdict === "supported" ? "bg-[#e5f0e4] px-2 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]" : verdict === "partial" ? "bg-[#fff4df] px-2 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-[#805f18]" : "bg-[#f1ece8] px-2 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-[#7a4b36]"}>{verdict.replace(/_/g, " ")}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#657366]">{skill.focus}</p>
              <p className="mt-3 text-sm leading-6 text-[#405144]">{String(finding?.finding || "Awaiting authorized evidence and a governed Claude-skill evaluation.")}</p>
              <p className="mt-3 border-t border-[#e2e7df] pt-3 text-xs leading-5 text-[#6f7d70]"><b>Cited evidence:</b> {citations.join(", ") || "No authorized reference cited."}</p>
              <p className="mt-2 text-xs leading-5 text-[#765d12]"><b>Review limitation:</b> {limitation}</p>
              <p className="mt-2 text-xs leading-5 text-[#6f7d70]"><b>Next question:</b> {String(finding?.question || "What authorized evidence would resolve this review area?")}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
function QuestionList({ eyebrow, rows, action }: { eyebrow: string; rows: Array<Record<string, unknown>>; action: string }) { return <article className="border border-[#c7d6c3] bg-white p-4"><p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.12em] text-[#687668]"><MessageCircleQuestion className="h-3.5 w-3.5" />{eyebrow}</p>{rows.length ? <><ul className="mt-3 space-y-3">{rows.map((row, index) => <li key={`${String(row.question)}-${index}`} className="text-sm leading-5 text-[#405144]"><b>{String(row.question)}</b><span className="mt-1 block text-xs text-[#687668]">{String(row.why || "")}</span></li>)}</ul><p className="mt-4 border-t border-[#e2e7df] pt-3 text-xs leading-5 text-[#1b5e3a]">{action}</p></> : <p className="mt-3 text-sm leading-6 text-[#69766a]">No questions were returned.</p>}</article>; }

function JudgeCorrectionPanel({ proofId, decision, caseId }: { proofId: number; decision: any; caseId: number }) {
  const utils = trpc.useUtils();
  const correction = trpc.studio.addJudgeEvidenceCorrection.useMutation({ onSuccess: () => utils.studio.caseWorkspace.invalidate({ caseId }) });
  const [reference, setReference] = useState("");
  const [action, setAction] = useState("");
  const [rationale, setRationale] = useState("");
  const prior = records(decision.evidenceCorrections);
  return <details className="mt-4 border border-[#c7d6c3] bg-white p-4"><summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[.12em] text-[#1b5e3a]">Evidence corrections · human margin</summary><p className="mt-3 text-sm leading-6 text-[#556557]">Correct, qualify, or challenge a specific Agent reference without editing the Agent packet or changing your recorded scorecard.</p>{prior.length > 0 && <div className="mt-3 space-y-2">{prior.map((item, index) => <div key={`${String(item.reference)}-${index}`} className="border-l-2 border-[#876e16] pl-3 text-xs leading-5 text-[#526456]"><b>{String(item.reference)}</b> · {String(item.action)}<br />{String(item.rationale)}</div>)}</div>}<div className="mt-4 grid gap-3 md:grid-cols-2"><input value={reference} onChange={event => setReference(event.target.value)} className="h-10 border border-[#cbd6c8] px-3 text-sm text-[#173d2a]" placeholder="Evidence reference" /><input value={action} onChange={event => setAction(event.target.value)} className="h-10 border border-[#cbd6c8] px-3 text-sm text-[#173d2a]" placeholder="Correction action" /></div><textarea value={rationale} onChange={event => setRationale(event.target.value)} className="mt-3 min-h-24 w-full border border-[#cbd6c8] p-3 text-sm leading-6 text-[#173d2a]" placeholder="Why the human judge is correcting or qualifying this evidence." /><Button disabled={correction.isPending || reference.trim().length < 2 || action.trim().length < 3 || rationale.trim().length < 10} onClick={() => correction.mutate({ teamProofId: proofId, reference: reference.trim(), action: action.trim(), rationale: rationale.trim() })} className="mt-3 h-10 rounded-none bg-[#173d2a] text-[9px] font-bold uppercase tracking-[.1em]">{correction.isPending ? "Saving…" : "Save evidence correction"}</Button>{correction.error && <p className="mt-2 text-xs text-red-700">{correction.error.message}</p>}</details>;
}

function InvestmentLearningPanel({ caseId, candidate, decision, gate, packet }: { caseId: number; candidate: { id: number; proofQuestion: string }; decision: any; gate: any; packet: any }) {
  const utils = trpc.useUtils();
  const archive = trpc.studio.archiveInvestmentLearning.useMutation({ onSuccess: () => utils.studio.caseWorkspace.invalidate({ caseId }) });
  const [reusableLearning, setReusableLearning] = useState("");
  const [nextInvestmentAction, setNextInvestmentAction] = useState("");
  const [expectedInvestmentContribution, setExpectedInvestmentContribution] = useState("");
  const movement = records(gate.assumptionMovement);
  const assumptions: Array<{ assumption: string; result: "supported" | "partial" | "unsupported" | "not_tested"; evidence: string }> = movement.length ? movement.map(item => ({ assumption: String(item.assumption || "Investment assumption"), result: item.movement === "strengthened" ? "supported" : item.movement === "missing_evidence" ? "not_tested" : item.movement === "weakened" || item.movement === "disputed" ? "unsupported" : "partial", evidence: String(item.rationale || decision.rationale) })) : [{ assumption: candidate.proofQuestion, result: "not_tested", evidence: decision.rationale }];
  const limitations = strings(packet?.limitations).length ? strings(packet.limitations) : ["No additional limitations were recorded beyond the human decision rationale."];
  return <details className="mt-4 border border-[#c7d6c3] bg-[#f5f7f1] p-4"><summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[.12em] text-[#1b5e3a]">Archive learning to the investment case</summary><p className="mt-3 text-sm leading-6 text-[#556557]">Preserve the human decision, sponsor gate, expected investment contribution, validated assumptions, and reusable learning on this original business case. This creates learning; it does not alter the Agent packet.</p><div className="mt-3 border border-[#d9e0d4] bg-white p-3 text-xs leading-5 text-[#536254]">Gate: <b>{String(gate.status).replace(/_/g, " ")}</b> · Decision: <b>{String(decision.decision).replace(/_/g, " ")}</b></div><textarea value={expectedInvestmentContribution} onChange={event => setExpectedInvestmentContribution(event.target.value)} className="mt-3 min-h-20 w-full border border-[#cbd6c8] p-3 text-sm leading-6 text-[#173d2a]" placeholder="What investment contribution is now expected, subject to sponsor validation? Do not present this as a realized outcome." /><textarea value={reusableLearning} onChange={event => setReusableLearning(event.target.value)} className="mt-3 min-h-24 w-full border border-[#cbd6c8] p-3 text-sm leading-6 text-[#173d2a]" placeholder="What should a future sponsor, team, or organizer reuse from this proof?" /><textarea value={nextInvestmentAction} onChange={event => setNextInvestmentAction(event.target.value)} className="mt-3 min-h-20 w-full border border-[#cbd6c8] p-3 text-sm leading-6 text-[#173d2a]" placeholder="What is the next investment action?" /><Button disabled={archive.isPending || expectedInvestmentContribution.trim().length < 10 || reusableLearning.trim().length < 20 || nextInvestmentAction.trim().length < 10} onClick={() => archive.mutate({ investmentCaseId: caseId, proofCandidateId: candidate.id, judgeDecisionId: decision.id, investmentGateId: gate.id, validatedAssumptions: assumptions, limitations, expectedInvestmentContribution: expectedInvestmentContribution.trim(), reusableLearning: reusableLearning.trim(), nextInvestmentAction: nextInvestmentAction.trim() })} className="mt-3 h-10 rounded-none bg-[#173d2a] text-[9px] font-bold uppercase tracking-[.1em]">{archive.isPending ? "Archiving…" : "Archive investment learning"}</Button>{archive.error && <p className="mt-2 text-xs text-red-700">{archive.error.message}</p>}</details>;
}
