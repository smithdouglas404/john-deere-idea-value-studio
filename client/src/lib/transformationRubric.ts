export type TransformationPillar = "disrupt" | "optimize" | "reimagine" | "reinvent";

export type TransformationRubricCriterion = {
  key: string;
  label: string;
  weight: number;
  pillar: TransformationPillar;
  description: string;
};

export const TRANSFORMATION_RUBRIC_CRITERIA: TransformationRubricCriterion[] = [
  {
    key: "cost_takeout_efficiency",
    label: "Cost takeout & operating efficiency",
    weight: 20,
    pillar: "optimize",
    description: "Reduces recurring operational friction, cycle times, waste, and routine overhead."
  },
  {
    key: "higher_value_work_redesign",
    label: "Work reimagination & higher-value work",
    weight: 25,
    pillar: "reimagine",
    description: "Shifts people away from manual, repetitive tasks toward strategic client service, problem-solving, and innovation."
  },
  {
    key: "revenue_growth_impact",
    label: "Revenue growth & customer impact",
    weight: 20,
    pillar: "disrupt",
    description: "Expands dealer service capacity, customer retention, and net new monetizable value streams."
  },
  {
    key: "execution_readiness",
    label: "Execution readiness (Skill & Will)",
    weight: 15,
    pillar: "reimagine",
    description: "Demonstrates technical feasibility, team commitment, and realistic partner/vendor integration readiness."
  },
  {
    key: "transformational_ambition",
    label: "Operating-model reinvention & disruption",
    weight: 20,
    pillar: "reinvent",
    description: "Reimagines operating models, positively disrupts legacy service assumptions, and redefines organizational capability."
  }
];

export const TRANSFORMATION_HEAT_DIMENSIONS = [
  { key: "efficiency", label: "Efficiency & flow", description: "Streamlines dealer workflows and removes administrative latency." },
  { key: "productivity", label: "Productivity & higher-value work", description: "Moves people from manual chores to high-leverage problem solving." },
  { key: "cost_takeout", label: "Cost takeout", description: "Quantifiable reduction in operating or warranty expenses." },
  { key: "innovation", label: "Positive disruption", description: "Novel tooling and intelligent automation that challenges legacy limits." },
  { key: "revenue_growth", label: "Revenue growth", description: "New commercial potential or protected customer lifetime value." },
  { key: "customer_impact", label: "Customer impact", description: "Measurable improvement for dealers, technicians, and farmers." },
  { key: "skill", label: "Skill capability", description: "Technical competence and delivery architecture readiness." },
  { key: "will", label: "Commitment & will", description: "Team conviction, sponsor backing, and organizational momentum." },
] as const;
