import { BarChart3, Building2, HeartHandshake, Landmark, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import React from "react";

type ResearchSource = {
  id: number;
  title: string;
  url: string;
  excerpt: string | null;
  relevance: string | null;
  evidenceCategory?: "market" | "customer" | "operating" | "value" | "other";
  similarityAssessment: string;
};

type ResearchDossier = {
  ideaNarrative: string;
  customerImpact: { audience: string; problem: string; involvement: string; expectedExperienceShift: string };
  marketAcceptance: { signal: "established_demand" | "emerging_signal" | "mixed_signal" | "insufficient_evidence"; narrative: string };
  operatingImpact: { area: string; narrative: string };
  valuePerspective: { primaryCategory: "cost_optimization" | "customer_satisfaction" | "revenue_growth" | "risk_reduction" | "productivity" | "sustainability" | "other"; narrative: string };
  evidenceGaps: string[];
};

type ResearchRun = { status: string; summary: string | null; limitations: string | null; dossier?: unknown; sources: ResearchSource[] };

const categoryLabels = { market: "Market", customer: "Customer", operating: "Operating", value: "Value", other: "Other" } as const;
const valueLabels = {
  cost_optimization: "Cost optimization",
  customer_satisfaction: "Customer satisfaction",
  revenue_growth: "Revenue growth",
  risk_reduction: "Risk reduction",
  productivity: "Productivity",
  sustainability: "Sustainability",
  other: "Other value",
} as const;
const marketLabels = {
  established_demand: "Established demand signal",
  emerging_signal: "Emerging signal",
  mixed_signal: "Mixed signal",
  insufficient_evidence: "Evidence not yet sufficient",
} as const;

function dossierFrom(value: unknown): ResearchDossier | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const dossier = value as Partial<ResearchDossier>;
  return typeof dossier.ideaNarrative === "string" && dossier.customerImpact && dossier.marketAcceptance && dossier.operatingImpact && dossier.valuePerspective && Array.isArray(dossier.evidenceGaps) ? dossier as ResearchDossier : null;
}

export function OpportunityResearchDossier({ research }: { research: ResearchRun }) {
  const dossier = dossierFrom(research.dossier);
  const counts = (Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>).map(category => ({
    category,
    count: research.sources.filter(source => (source.evidenceCategory || "other") === category).length,
  }));
  const maxCount = Math.max(1, ...counts.map(item => item.count));

  if (!dossier) return <div className="mt-5 border-t border-[#e2e6dd] pt-4"><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#758077]">Research result / {research.status.replace("_", " ")}</p><p className="mt-2 text-[12px] leading-5 text-[#45594a]">{research.summary || "A richer dossier will be created on the next research run."}</p><p className="mt-3 text-[10px] leading-4 text-[#7a837b]">Limitations: {research.limitations || "Review cited sources directly before drawing conclusions."}</p></div>;

  return <section className="opportunity-research-dossier mt-6 border-t border-[#e2e6dd] pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[13px] font-bold uppercase tracking-[.12em] text-[#617267]">AI market validation / cited research / {research.status.replace("_", " ")}</p><h3 className="mt-2 font-serif text-[32px] leading-tight text-[#1b3829]">A clearer case for the next decision.</h3><p className="mt-2 max-w-3xl text-[15px] leading-6 text-[#5b695d]">AI organizes the evidence into market, customer, operating, and value questions. It does not validate demand, create ROI, or decide the investment gate.</p></div><span className="border border-[#c5d6c1] bg-[#edf4e9] px-3 py-2 text-[11px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]">Non-binding research</span></div>
    <div className="mt-5 border-l-2 border-[#c89412] bg-[#fffdf4] p-5"><p className="text-[13px] font-bold uppercase tracking-[.11em] text-[#7a681f]">Idea narrative</p><p className="mt-2 text-[16px] leading-7 text-[#465447]">{dossier.ideaNarrative}</p></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2"><article className="border border-[#d7ddd0] bg-[#f8faf5] p-5"><div className="flex items-center gap-2 text-[#1b5e3a]"><HeartHandshake className="h-4 w-4" /><p className="text-[11px] font-bold uppercase tracking-[.11em]">Customer and user impact</p></div><p className="mt-3 text-[14px] font-bold text-[#314837]">{dossier.customerImpact.audience}</p><p className="mt-2 text-[13px] leading-6 text-[#5b695d]">{dossier.customerImpact.problem}</p><p className="mt-4 text-[10px] font-bold uppercase tracking-[.1em] text-[#617267]">Customer involvement</p><p className="mt-1 text-[12px] leading-5 text-[#5b695d]">{dossier.customerImpact.involvement}</p><p className="mt-4 text-[10px] font-bold uppercase tracking-[.1em] text-[#617267]">Potential experience shift</p><p className="mt-1 text-[12px] leading-5 text-[#5b695d]">{dossier.customerImpact.expectedExperienceShift}</p></article>
      <article className="border border-[#d7ddd0] bg-[#f8faf5] p-5"><div className="flex items-center gap-2 text-[#1b5e3a]"><Building2 className="h-4 w-4" /><p className="text-[11px] font-bold uppercase tracking-[.11em]">Market acceptance</p></div><p className="mt-3 text-[14px] font-bold text-[#314837]">{marketLabels[dossier.marketAcceptance.signal]}</p><p className="mt-2 text-[13px] leading-6 text-[#5b695d]">{dossier.marketAcceptance.narrative}</p><div className="mt-5 border-t border-[#e2e6dd] pt-4"><div className="flex items-center gap-2 text-[#4f674c]"><Landmark className="h-3.5 w-3.5" /><p className="text-[10px] font-bold uppercase tracking-[.1em]">Operating impact</p></div><p className="mt-2 text-[12px] font-bold text-[#314837]">{dossier.operatingImpact.area}</p><p className="mt-1 text-[12px] leading-5 text-[#5b695d]">{dossier.operatingImpact.narrative}</p></div></article>
      <article className="border border-[#d7ddd0] bg-[#fcfbf7] p-5"><div className="flex items-center gap-2 text-[#1b5e3a]"><TrendingUp className="h-4 w-4" /><p className="text-[11px] font-bold uppercase tracking-[.11em]">Primary value perspective</p></div><p className="mt-3 font-serif text-[25px] text-[#1b3829]">{valueLabels[dossier.valuePerspective.primaryCategory]}</p><p className="mt-2 text-[13px] leading-6 text-[#5b695d]">{dossier.valuePerspective.narrative}</p><p className="mt-4 text-[11px] leading-5 text-[#687468]">Qualitative category from sourced research—not a value estimate. Sponsor-entered economics remain the only source for the value range.</p></article>
      <article className="border border-[#d7ddd0] bg-[#f0f1e7] p-5"><div className="flex items-center gap-2 text-[#4f674c]"><BarChart3 className="h-4 w-4" /><p className="text-[11px] font-bold uppercase tracking-[.11em]">Evidence coverage</p></div><p className="mt-2 text-[12px] leading-5 text-[#566659]">Citation count by evidence category in this research run—not a measure of market size, customer demand, or outcome magnitude.</p><div className="mt-5 space-y-3">{counts.map(item => <div key={item.category} className="grid grid-cols-[86px_1fr_24px] items-center gap-3 text-[11px]"><span className="font-bold text-[#536558]">{categoryLabels[item.category]}</span><span className="h-2.5 bg-[#dbe4d8]"><i className="block h-2.5 bg-[#1b5e3a]" style={{ width: `${(item.count / maxCount) * 100}%` }} /></span><b className="text-right text-[#1b3829]">{item.count}</b></div>)}</div></article></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div><p className="text-[13px] font-bold uppercase tracking-[.11em] text-[#617267]">Cited evidence</p><div className="mt-3 space-y-3">{research.sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="block border border-[#dce2d9] bg-white p-4 hover:bg-[#fffdf4]"><div className="flex flex-wrap items-center gap-2"><span className="border border-[#d5dfd1] bg-[#f2f6ef] px-2 py-1 text-[10px] font-bold uppercase tracking-[.09em] text-[#4f674c]">{categoryLabels[source.evidenceCategory || "other"]}</span><span className="text-[14px] font-bold leading-5 text-[#314837]">{source.title}</span></div><p className="mt-2 line-clamp-2 text-[13px] leading-6 text-[#526257]">{source.relevance || source.excerpt || "Open the cited source to review the underlying evidence."}</p><span className="mt-2 block text-[12px] font-semibold text-[#1b5e3a]">Open source ↗</span></a>)}</div></div><aside className="border-l-2 border-[#c89412] bg-[#fffdf4] p-5"><div className="flex items-center gap-2 text-[#8b691d]"><ShieldCheck className="h-4 w-4" /><p className="text-[13px] font-bold uppercase tracking-[.11em]">Evidence gaps to close</p></div><ul className="mt-4 space-y-3">{dossier.evidenceGaps.map((gap, index) => <li key={index} className="text-[14px] leading-6 text-[#665d40]">• {gap}</li>)}</ul><p className="mt-5 border-t border-[#eadfb3] pt-4 text-[13px] leading-6 text-[#786d4a]">Limitations: {research.limitations || "Human customer, domain, and IP review remain required."}</p></aside></div>
  </section>;
}
