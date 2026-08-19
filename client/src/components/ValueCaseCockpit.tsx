import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { buildValueScenarios } from "@shared/valueCaseMath";
import { selectSensitivityConditions } from "@shared/valueCaseProvenance";
import { BrainCircuit, ChevronDown, CircleGauge, Landmark, ListChecks, MessageSquareText, ShieldCheck, Sparkles, TrendingUp, UsersRound } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

type ValueCaseOpportunity = {
  id: number;
  initialValueLow: string | number | null;
  initialValueHigh: string | number | null;
  valueCurrency: string;
  costToProve: string | number | null;
  timeToValueMonths: number | null;
  valueCaseNarrative: string | null;
  valueDrivers: string[] | null;
  economicAssumptions: string[] | null;
  investmentGate: "shape_value_case" | "research" | "proof_sprint" | "hold" | "advance";
  investmentGateRationale: string | null;
  confidence: number;
  aiBrief: unknown;
};

type Indicator = { id: number; category: string; label: string; value: string | number; unit: string; evidence: string; createdAt: Date | string };
type ProofReadiness = { state: "not_started" | "configured" | "evidence_collected" | "decision_ready" | "needs_follow_up"; proofDerivedConfidence: number; message: string; finalizedHumanScore: number | null; finalizedScorecards: number; completedAudits: number; projects: number; recommendation: string };
type CommunitySignals = { endorsementCount: number; viewerEndorsed: boolean; notes: Array<{ id: number; category: "customer_signal" | "market_signal" | "operating_signal" | "evidence_offer" | "question" | "other"; body: string; evidenceUrl: string | null; createdAt: Date | string }> };

type Brief = {
  valueHypothesis?: string;
  valueMechanisms?: string[];
  assumptions?: string[];
  evidenceGaps?: string[];
  recommendedGate?: string;
  gateRationale?: string;
};

const gateLabels: Record<string, string> = {
  shape_value_case: "Shape the value case",
  research: "Research the market and evidence",
  proof_sprint: "Run a focused proof sprint",
  hold: "Hold pending evidence",
  advance: "Advance to investment review",
};

function asBrief(value: unknown): Brief | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Brief : null;
}

function asNumber(value: string | number | null) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: number | null, currency: string) {
  if (value === null) return "Not entered";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-US")}`;
  }
}

export function ValueCaseCockpit({ opportunity, canAdminister, indicators, proofReadiness, community }: { opportunity: ValueCaseOpportunity; canAdminister: boolean; indicators: Indicator[]; proofReadiness?: ProofReadiness | null; community?: CommunitySignals | null }) {
  const utils = trpc.useUtils();
  const brief = asBrief(opportunity.aiBrief);
  const low = asNumber(opportunity.initialValueLow);
  const high = asNumber(opportunity.initialValueHigh);
  const midpoint = low !== null && high !== null ? (low + high) / 2 : null;
  const costToProve = asNumber(opportunity.costToProve);
  const confidenceHistory = useMemo(() => indicators.filter(item => item.category === "evidence_confidence").slice(0, 5).reverse(), [indicators]);
  const [editing, setEditing] = useState(() => opportunity.initialValueLow === null || opportunity.initialValueHigh === null);
  const [lowInput, setLowInput] = useState("");
  const [highInput, setHighInput] = useState("");
  const [costInput, setCostInput] = useState("");
  const [monthsInput, setMonthsInput] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [narrative, setNarrative] = useState("");
  const [drivers, setDrivers] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [gate, setGate] = useState<ValueCaseOpportunity["investmentGate"]>("shape_value_case");
  const [gateRationale, setGateRationale] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    setLowInput(low === null ? "" : String(low));
    setHighInput(high === null ? "" : String(high));
    setCostInput(opportunity.costToProve === null ? "" : String(opportunity.costToProve));
    setMonthsInput(opportunity.timeToValueMonths === null ? "" : String(opportunity.timeToValueMonths));
    setCurrency(opportunity.valueCurrency || "USD");
    setNarrative(opportunity.valueCaseNarrative || "");
    setDrivers((opportunity.valueDrivers || []).join("\n"));
    setAssumptions((opportunity.economicAssumptions || []).join("\n"));
    setGate(opportunity.investmentGate);
    setGateRationale(opportunity.investmentGateRationale || "");
  }, [opportunity]);

  const suggestedGate = brief?.recommendedGate && gateLabels[brief.recommendedGate] ? gateLabels[brief.recommendedGate] : null;
  const displayedDrivers = useMemo(() => (opportunity.valueDrivers?.length ? opportunity.valueDrivers : brief?.valueMechanisms || []), [opportunity.valueDrivers, brief?.valueMechanisms]);
  const sensitivityConditions = useMemo(() => selectSensitivityConditions(opportunity.economicAssumptions, brief?.assumptions), [opportunity.economicAssumptions, brief?.assumptions]);
  const displayedAssumptions = useMemo(() => (opportunity.economicAssumptions?.length ? opportunity.economicAssumptions : brief?.assumptions || []), [opportunity.economicAssumptions, brief?.assumptions]);
  const scenarios = useMemo(() => buildValueScenarios(low, high, costToProve, sensitivityConditions.conditions), [low, high, costToProve, sensitivityConditions.conditions]);
  const save = trpc.opportunities.saveValueCase.useMutation({ onSuccess: async (result) => {
    utils.opportunities.detail.setData({ opportunityId: opportunity.id }, current => current ? { ...current, opportunity: result.opportunity } : current);
    await utils.opportunities.detail.invalidate({ opportunityId: opportunity.id });
    setEditing(false);
    setSaveStatus("Sponsor economics saved and shown above.");
  } });
  const saveCase = () => {
    setSaveStatus(null);
    save.mutate({
    opportunityId: opportunity.id,
    initialValueLow: lowInput === "" ? undefined : Number(lowInput),
    initialValueHigh: highInput === "" ? undefined : Number(highInput),
    valueCurrency: currency,
    costToProve: costInput === "" ? undefined : Number(costInput),
    timeToValueMonths: monthsInput === "" ? undefined : Number(monthsInput),
    valueCaseNarrative: narrative || undefined,
    valueDrivers: drivers.split("\n").map(item => item.trim()).filter(Boolean),
    economicAssumptions: assumptions.split("\n").map(item => item.trim()).filter(Boolean),
    investmentGate: gate,
    investmentGateRationale: gateRationale || undefined,
    });
  };

  return <section className="value-case-cockpit mt-6 border border-[#cbd7c7] bg-[#f7f8f1]">
    <div className="border-b border-[#d7ddd0] bg-[#173d2a] px-5 py-5 text-[#f9f8f1] md:px-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[#d8e9d3]"><BrainCircuit className="h-4 w-4 text-[#f8d41d]" /><p className="text-[10px] font-bold uppercase tracking-[.15em]">AI decision cockpit / sponsor-owned</p></div><h2 className="mt-2 font-serif text-[29px] leading-7">The value case comes first.</h2><p className="mt-2 max-w-2xl text-[12px] leading-5 text-[#d0dfc9]">AI organizes evidence, exposes assumptions, and suggests the next test. A sponsor owns the economics and the investment gate.</p></div><div className="border border-[#6f9671] bg-[#163423] px-3 py-2 text-right"><p className="text-[8px] font-bold uppercase tracking-[.13em] text-[#b6d0ae]">Evidence confidence</p><p className="mt-1 font-serif text-[25px] text-[#f8d41d]">{opportunity.confidence}<span className="text-[13px]">/100</span></p></div></div></div>

    <div className="grid gap-px bg-[#d7ddd0] [&>article:nth-child(3)]:hidden lg:grid-cols-[1.1fr_.9fr_.85fr]">
      <article className="bg-[#fcfbf7] p-5"><div className="flex items-center gap-2 text-[#1b5e3a]"><Landmark className="h-4 w-4" /><p className="text-[9px] font-bold uppercase tracking-[.14em]">Economic case</p></div><p className="mt-3 font-serif text-[30px] leading-8 text-[#1b3829]">{low !== null || high !== null ? `${money(low, opportunity.valueCurrency)} — ${money(high, opportunity.valueCurrency)}` : "Set the value range"}</p><p className="mt-2 text-[11px] leading-5 text-[#657166]">Sponsor-entered potential value range. The system does not fabricate savings, revenue, or ROI.</p><div className="mt-5 grid grid-cols-3 gap-2 border-y border-[#e0e4db] py-4">{scenarios.map(scenario => <div key={scenario.label}><p className="text-[8px] font-bold uppercase tracking-[.12em] text-[#7a837b]">{scenario.label}</p><p className="mt-1 text-[12px] font-bold text-[#1b3829]">{money(scenario.potentialValue, opportunity.valueCurrency)}</p></div>)}</div><div className="mt-4 flex gap-5 text-[10px] text-[#617064]"><span><b className="block text-[#314837]">{money(costToProve, opportunity.valueCurrency)}</b>Cost to prove</span><span><b className="block text-[#314837]">{opportunity.timeToValueMonths ?? "Not entered"}</b>{opportunity.timeToValueMonths === null ? "Time to value" : "Months to value"}</span></div>{costToProve !== null && (low !== null || high !== null) && <div className="mt-4 border-t border-[#e0e4db] pt-3"><p className="text-[8px] font-bold uppercase tracking-[.12em] text-[#758077]">Sensitivity: value range less stated proof cost</p><div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">{scenarios.map(scenario => <span key={scenario.label}><b className="block text-[#314837]">{money(scenario.netOfProofCost, opportunity.valueCurrency)}</b>{scenario.label}</span>)}</div><p className="mt-3 text-[8px] font-bold uppercase tracking-[.12em] text-[#758077]">Sponsor conditions applied to every scenario</p>{!sensitivityConditions.requiresSponsorInput ? <ul className="mt-1 space-y-1 text-[9px] leading-4 text-[#58675c]">{sensitivityConditions.conditions.slice(0, 3).map((assumption, index) => <li key={`${assumption}-${index}`}>• {assumption}</li>)}</ul> : <p className="mt-1 text-[9px] leading-4 text-[#8b5c22]">Add sponsor-owned economic assumptions before relying on these arithmetic cases. AI-generated assumptions remain evidence to review, not scenario conditions.</p>}<p className="mt-2 text-[9px] leading-4 text-[#758077]">This is arithmetic on sponsor-entered values conditioned on the listed sponsor assumptions, not a forecast or ROI assertion.</p></div>}{opportunity.valueCaseNarrative && <p className="mt-4 border-l-2 border-[#c89412] pl-3 text-[11px] leading-5 text-[#58675c]">{opportunity.valueCaseNarrative}</p>}</article>
      <article className="bg-[#f0f1e7] p-5"><div className="flex items-center gap-2 text-[#4f674c]"><Sparkles className="h-4 w-4" /><p className="text-[9px] font-bold uppercase tracking-[.14em]">What the AI processed</p></div><p className="mt-3 text-[13px] font-semibold leading-5 text-[#253f30]">{brief?.valueHypothesis || "Generate the working brief to turn confirmed voice and document evidence into a structured value hypothesis."}</p>{suggestedGate && <div className="mt-4 border border-[#b7cab2] bg-[#f8fbf5] p-3"><p className="text-[8px] font-bold uppercase tracking-[.12em] text-[#59715a]">AI suggested next test</p><p className="mt-1 text-[12px] font-bold text-[#1b5e3a]">{suggestedGate}</p><p className="mt-1 text-[10px] leading-4 text-[#647066]">{brief?.gateRationale || "Review the evidence before accepting any recommendation."}</p></div>}<div className="mt-4"><p className="text-[8px] font-bold uppercase tracking-[.12em] text-[#758077]">Value mechanisms</p>{displayedDrivers.length ? <ul className="mt-2 space-y-2">{displayedDrivers.slice(0, 4).map((item, index) => <li key={`${item}-${index}`} className="flex gap-2 text-[10px] leading-4 text-[#526257]"><TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-[#1b5e3a]" />{item}</li>)}</ul> : <p className="mt-2 text-[10px] leading-4 text-[#758077]">No mechanisms are asserted until sponsor input or AI synthesis is reviewed.</p>}</div></article>
      <article className="bg-[#fcfbf7] p-5"><div className="flex items-center gap-2 text-[#1b5e3a]"><ShieldCheck className="h-4 w-4" /><p className="text-[9px] font-bold uppercase tracking-[.14em]">Human investment gate</p></div><p className="mt-3 font-serif text-[25px] leading-7 text-[#1b3829]">{gateLabels[opportunity.investmentGate]}</p><p className="mt-2 text-[11px] leading-5 text-[#647066]">{opportunity.investmentGateRationale || "No rationale has been recorded. The sponsor must state why the evidence supports this gate."}</p><div className="mt-4 border-t border-[#e0e4db] pt-4"><div className="flex items-center gap-2"><ListChecks className="h-3.5 w-3.5 text-[#c89412]" /><p className="text-[8px] font-bold uppercase tracking-[.12em] text-[#758077]">Assumptions to validate</p></div>{displayedAssumptions.length ? <ul className="mt-2 space-y-2">{displayedAssumptions.slice(0, 4).map((item, index) => <li key={`${item}-${index}`} className="text-[10px] leading-4 text-[#58675c]">• {item}</li>)}</ul> : <p className="mt-2 text-[10px] leading-4 text-[#758077]">No assumptions have been documented yet.</p>}</div><div className="mt-4 border-t border-[#e0e4db] pt-4"><p className="text-[8px] font-bold uppercase tracking-[.12em] text-[#758077]">Evidence gaps</p>{brief?.evidenceGaps?.length ? <p className="mt-2 text-[10px] leading-4 text-[#8b5c22]">{brief.evidenceGaps.slice(0, 3).join(" · ")}</p> : <p className="mt-2 text-[10px] leading-4 text-[#758077]">Generate and review the AI brief to identify material evidence gaps.</p>}</div></article>
      <article className="bg-[#fcfbf7] p-5"><div className="flex items-center gap-2 text-[#1b5e3a]"><ShieldCheck className="h-4 w-4" /><p className="text-[9px] font-bold uppercase tracking-[.14em]">Human investment gate</p></div><p className="mt-3 font-serif text-[25px] leading-7 text-[#1b3829]">{gateLabels[opportunity.investmentGate]}</p><p className="mt-2 text-[11px] leading-5 text-[#647066]">{opportunity.investmentGateRationale || "No rationale has been recorded. The sponsor must state why the evidence supports this gate."}</p><div className="mt-4 border-t border-[#e0e4db] pt-4"><div className="flex items-center gap-2"><CircleGauge className="h-3.5 w-3.5 text-[#1b5e3a]" /><p className="text-[8px] font-bold uppercase tracking-[.12em] text-[#758077]">Confidence movement</p></div>{confidenceHistory.length ? <div className="mt-3 flex items-end gap-2">{confidenceHistory.map(item => { const numeric = Math.max(0, Math.min(100, Number(item.value))); return <div key={item.id} className="flex min-w-0 flex-1 flex-col justify-end"><span className="mb-1 text-center text-[9px] font-bold text-[#1b5e3a]">{numeric}</span><div className="min-h-1 bg-[#dfe8dc]" style={{ height: `${Math.max(8, numeric * 0.45)}px` }} /><span className="mt-1 truncate text-center text-[8px] text-[#758077]">{new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>; })}</div> : <p className="mt-2 text-[10px] leading-4 text-[#758077]">No time-based confidence updates yet. Record an evidence-backed confidence indicator to establish the trend.</p>}</div><div className="mt-4 border-t border-[#e0e4db] pt-4"><div className="flex items-center gap-2"><ListChecks className="h-3.5 w-3.5 text-[#c89412]" /><p className="text-[8px] font-bold uppercase tracking-[.12em] text-[#758077]">Assumptions to validate</p></div>{displayedAssumptions.length ? <ul className="mt-2 space-y-2">{displayedAssumptions.slice(0, 4).map((item, index) => <li key={`${item}-${index}`} className="text-[10px] leading-4 text-[#58675c]">• {item}</li>)}</ul> : <p className="mt-2 text-[10px] leading-4 text-[#758077]">No assumptions have been documented yet.</p>}</div><div className="mt-4 border-t border-[#e0e4db] pt-4"><p className="text-[8px] font-bold uppercase tracking-[.12em] text-[#758077]">Evidence gaps</p>{brief?.evidenceGaps?.length ? <p className="mt-2 text-[10px] leading-4 text-[#8b5c22]">{brief.evidenceGaps.slice(0, 3).join(" · ")}</p> : <p className="mt-2 text-[10px] leading-4 text-[#758077]">Generate and review the AI brief to identify material evidence gaps.</p>}</div></article>
    </div>

    {proofReadiness && <article className="border-t border-[#d7ddd0] bg-[#edf3e9] px-5 py-4 md:px-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><div className="flex items-center gap-2 text-[#1b5e3a]"><ListChecks className="h-4 w-4" /><p className="text-[9px] font-bold uppercase tracking-[.14em]">Proof-sprint evidence update / non-binding</p></div><p className="mt-2 text-[12px] leading-5 text-[#405440]">{proofReadiness.message}</p><p className="mt-2 max-w-3xl text-[11px] leading-5 text-[#596b5c]">Gate recommendation: {proofReadiness.recommendation}</p></div><div className="grid shrink-0 grid-cols-4 gap-4 border-l-0 border-[#c9d9c6] pl-0 text-center md:border-l md:pl-4"><span><b className="block font-serif text-[24px] text-[#1b5e3a]">{proofReadiness.proofDerivedConfidence}</b><small className="text-[8px] font-bold uppercase tracking-[.1em] text-[#657666]">Proof confidence</small></span><span><b className="block font-serif text-[24px] text-[#1b5e3a]">{proofReadiness.projects}</b><small className="text-[8px] font-bold uppercase tracking-[.1em] text-[#657666]">Projects</small></span><span><b className="block font-serif text-[24px] text-[#1b5e3a]">{proofReadiness.completedAudits}</b><small className="text-[8px] font-bold uppercase tracking-[.1em] text-[#657666]">Audits</small></span><span><b className="block font-serif text-[24px] text-[#1b5e3a]">{proofReadiness.finalizedHumanScore === null ? "—" : `${proofReadiness.finalizedHumanScore}/10`}</b><small className="text-[8px] font-bold uppercase tracking-[.1em] text-[#657666]">Human evidence</small></span></div></div></article>}

    {community && <article className="border-t border-[#d7ddd0] bg-[#fffdf4] px-5 py-4 md:px-6"><div className="grid gap-4 md:grid-cols-[auto_1fr_auto]"><div className="flex items-center gap-2 text-[#80631f]"><UsersRound className="h-4 w-4" /><p className="text-[9px] font-bold uppercase tracking-[.14em]">Community signal / sponsor review</p></div><p className="text-[11px] leading-5 text-[#625d45]">{community.endorsementCount} endorsement{community.endorsementCount === 1 ? "" : "s"} and {community.notes.length} structured observation{community.notes.length === 1 ? "" : "s"} are visible as early context. They do not affect the value range, evidence confidence, scorecards, or the investment gate.</p><div className="flex flex-wrap gap-2 md:justify-end">{Array.from(new Set(community.notes.map(note => note.category))).slice(0, 4).map(category => <span key={category} className="border border-[#e5dcae] bg-white px-2 py-1 text-[8px] font-bold uppercase tracking-[.1em] text-[#766735]">{category.replace("_", " ")}</span>) || <span className="text-[9px] text-[#847957]">No structured signals yet</span>}</div></div><p className="mt-3 flex items-center gap-1.5 text-[9px] leading-4 text-[#7b7251]"><MessageSquareText className="h-3.5 w-3.5 shrink-0" />Sponsor action: inspect the signal for a testable hypothesis, then set or revise the economic case independently.</p></article>}

    {canAdminister && <div className="border-t border-[#d7ddd0] bg-[#f8f8f3] p-5"><button type="button" onClick={() => setEditing(value => !value)} className="flex w-full items-center justify-between text-left"><span><b className="text-[11px] text-[#1b3829]">{low === null || high === null ? "Sponsor economics: enter the value range now" : "Sponsor economics: revise the economic case"}</b><small className="mt-1 block text-[10px] text-[#718076]">Only a sponsor or administrator may enter numbers and set the investment gate.</small></span><ChevronDown className={`h-4 w-4 text-[#1b5e3a] transition-transform ${editing ? "rotate-180" : ""}`} /></button>{saveStatus && <p role="status" className="mt-3 border-l-2 border-[#1b5e3a] pl-3 text-[11px] font-semibold text-[#1b5e3a]">{saveStatus}</p>}{editing && <div className="mt-5 grid gap-4 border-t border-[#d7ddd0] pt-5 lg:grid-cols-2"><div className="lg:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#1b5e3a]">Set the value range and proof economics</p><p className="mt-1 text-[11px] leading-5 text-[#647066]">Enter sponsor-owned estimates. The midpoint and sensitivity view are calculated transparently from these inputs; the system does not generate savings, revenue, or ROI.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-[9px] font-bold uppercase tracking-[.12em] text-[#758077]">Conservative annual value<input value={lowInput} onChange={event => setLowInput(event.target.value)} type="number" min="0" className="mt-2 h-10 w-full border border-[#cbd5c7] bg-white px-3 text-[12px] normal-case tracking-normal text-[#1b3829]" placeholder="Enter a conservative value" /></label><label className="text-[9px] font-bold uppercase tracking-[.12em] text-[#758077]">Upside annual value<input value={highInput} onChange={event => setHighInput(event.target.value)} type="number" min="0" className="mt-2 h-10 w-full border border-[#cbd5c7] bg-white px-3 text-[12px] normal-case tracking-normal text-[#1b3829]" placeholder="Enter an upside value" /></label><label className="text-[9px] font-bold uppercase tracking-[.12em] text-[#758077]">Currency<input value={currency} onChange={event => setCurrency(event.target.value.toUpperCase())} className="mt-2 h-10 w-full border border-[#cbd5c7] bg-white px-3 text-[12px] normal-case tracking-normal text-[#1b3829]" placeholder="USD" /></label><label className="text-[9px] font-bold uppercase tracking-[.12em] text-[#758077]">Cost to prove<input value={costInput} onChange={event => setCostInput(event.target.value)} type="number" min="0" className="mt-2 h-10 w-full border border-[#cbd5c7] bg-white px-3 text-[12px] normal-case tracking-normal text-[#1b3829]" placeholder="Enter the proof cost" /></label><label className="text-[9px] font-bold uppercase tracking-[.12em] text-[#758077]">Months to value<input value={monthsInput} onChange={event => setMonthsInput(event.target.value)} type="number" min="0" className="mt-2 h-10 w-full border border-[#cbd5c7] bg-white px-3 text-[12px] normal-case tracking-normal text-[#1b3829]" placeholder="Enter expected months" /></label><label className="text-[9px] font-bold uppercase tracking-[.12em] text-[#758077]">Investment gate<select value={gate} onChange={event => setGate(event.target.value as ValueCaseOpportunity["investmentGate"])} className="mt-2 h-10 w-full border border-[#cbd5c7] bg-white px-3 text-[12px] normal-case tracking-normal text-[#1b3829]">{Object.entries(gateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="grid gap-3"><label className="text-[9px] font-bold uppercase tracking-[.12em] text-[#758077]">Value-case narrative<textarea value={narrative} onChange={event => setNarrative(event.target.value)} className="mt-2 min-h-20 w-full border border-[#cbd5c7] bg-white p-3 text-[12px] normal-case tracking-normal text-[#1b3829]" placeholder="Explain the economic logic and boundaries." /></label><label className="text-[9px] font-bold uppercase tracking-[.12em] text-[#758077]">Value drivers — one per line<textarea value={drivers} onChange={event => setDrivers(event.target.value)} className="mt-2 min-h-16 w-full border border-[#cbd5c7] bg-white p-3 text-[12px] normal-case tracking-normal text-[#1b3829]" placeholder="e.g., Reduce avoidable rework" /></label><label className="text-[9px] font-bold uppercase tracking-[.12em] text-[#758077]">Economic assumptions — one per line<textarea value={assumptions} onChange={event => setAssumptions(event.target.value)} className="mt-2 min-h-16 w-full border border-[#cbd5c7] bg-white p-3 text-[12px] normal-case tracking-normal text-[#1b3829]" placeholder="e.g., Baseline needs validation" /></label><label className="text-[9px] font-bold uppercase tracking-[.12em] text-[#758077]">Gate rationale<textarea value={gateRationale} onChange={event => setGateRationale(event.target.value)} className="mt-2 min-h-16 w-full border border-[#cbd5c7] bg-white p-3 text-[12px] normal-case tracking-normal text-[#1b3829]" placeholder="State why the current evidence supports this gate." /></label></div><div className="lg:col-span-2"><Button disabled={save.isPending} onClick={saveCase} className="h-10 rounded-none bg-[#173d2a] text-[10px] font-bold uppercase tracking-[.12em] hover:bg-[#0e2b1e]">{save.isPending ? "Saving value case…" : "Save economic case and gate"}</Button>{save.error && <p className="mt-2 text-[11px] text-red-700">{save.error.message}</p>}</div></div>}</div>}
  </section>;
}
