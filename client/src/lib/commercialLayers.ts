export type CommercialLayer = {
  id: "pilot" | "subscription" | "managed";
  title: string;
  tagline: string;
  scope: string;
  deliverables: string[];
  clientOutcomes: string[];
};

export const COMMERCIAL_LAYERS: CommercialLayer[] = [
  {
    id: "pilot",
    title: "Transformation Pilot",
    tagline: "Proving high-value transformation in a single strategic domain",
    scope: "A bounded campaign, selected proof event, repository governance, specialist evidence review, human judging, and investment decision for one strategic domain.",
    deliverables: [
      "Targeted idea-incubation campaign with community advisory signals",
      "Manager-owned review queue and executive selection slate",
      "Two challenge-owned private repositories under Inflexcvi with bounded read-only audit",
      "10-lens Claude evidence packet and specialist findings",
      "Transformation rubric and executive heat-map decision record",
      "Sponsor investment gate and learning archive entry"
    ],
    clientOutcomes: [
      "Accelerated decision-making for high-stakes proof projects",
      "Reduced executive review effort and eliminated the idea black hole",
      "Verified technical feasibility and ROI before committing capital"
    ]
  },
  {
    id: "subscription",
    title: "Enterprise Platform Subscription",
    tagline: "Unlocking continuous portfolio governance across the enterprise",
    scope: "Tenant configuration, campaigns, business cases, proof events, evidence dashboards, governance, localization, integrations, and portfolio reporting.",
    deliverables: [
      "Multi-tenant white-label branding (John Deere, Kyndryl, Enterprise Green, Classic Oat)",
      "Multi-provider LLM routing and model tier configuration (light/heavy)",
      "Top-5 language localization (EN, ES, DE, FR, PT)",
      "Enterprise MCP adapters for SharePoint/OneDrive document ingestion and Jira Cloud sync",
      "Clerk Enterprise SSO federation module for Azure AD / SAML integration"
    ],
    clientOutcomes: [
      "Standardized transformation operating system across global business units",
      "Seamless corporate directory integration and secure document ingestion",
      "Consistent governance and audit traceability for all digital investments"
    ]
  },
  {
    id: "managed",
    title: "Managed Transformation Service",
    tagline: "Expert facilitation, calibration, and portfolio coaching",
    scope: "Rubric design, community advisory facilitation, agent/evidence configuration, judge calibration, value-case coaching, and post-event investment tracking.",
    deliverables: [
      "Customized transformation rubric design (Disrupt, Optimize, Reimagine, Reinvent)",
      "Community advisory facilitation and campaign engagement strategy",
      "Specialist agent prompt tuning and repository audit calibration",
      "Judge calibration workshops and executive heat-map coaching",
      "Post-event investment tracking and value realization reporting"
    ],
    clientOutcomes: [
      "Higher conversion rate from incubation campaign to funded investment",
      "Objective, bias-resistant executive decision-making supported by AI evidence",
      "Measurable shift of employee effort toward higher-value work and strategic reinvention"
    ]
  }
];
