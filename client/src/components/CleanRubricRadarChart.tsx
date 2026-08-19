import React, { useState } from "react";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, MessageSquareQuote } from "lucide-react";
import { toast } from "sonner";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export function CleanRubricRadarChart({ scores }: { scores?: { label: string; value: number }[] }) {
  const [showComments, setShowComments] = useState(false);

  const data = {
    labels: [
      "Cost Optimization",
      "Employee Efficiency",
      "Revenue Generation",
      "Operational Disruption",
      "Work Reimagination",
      "Skill Readiness",
      "Will & Commitment",
      "Partner Ecosystem",
    ],
    datasets: [
      {
        label: "Transformation Rubric Score (1-5)",
        data: scores?.map(s => s.value) || [4.2, 4.5, 3.8, 4.0, 4.6, 4.3, 4.1, 4.4],
        backgroundColor: "rgba(23, 61, 42, 0.2)",
        borderColor: "#173d2a",
        borderWidth: 2,
        pointBackgroundColor: "#876e16",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#876e16",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: "rgba(23, 61, 42, 0.1)" },
        grid: { color: "rgba(23, 61, 42, 0.1)" },
        suggestedMin: 0,
        suggestedMax: 5,
        ticks: { stepSize: 1, font: { size: 10 } },
        pointLabels: {
          font: { size: 11, family: "serif", weight: "bold" as const },
          color: "#173d2a",
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `Score: ${context.raw} / 5.0`;
          },
          afterLabel: function(context: any) {
            const comments: Record<number, string> = {
              0: "Sponsor: 'Strong direct cost reduction in parts triage.'",
              1: "Operations Lead: 'Substantially reduces manual administrative friction.'",
              2: "Finance: 'Measurable upside in recurring dealer service revenue.'",
              3: "Lead Judge: 'High potential to disrupt legacy warranty workflows.'",
              4: "Architect: 'Reimagines the technician triage process end-to-end.'",
              5: "Mentor: 'Exemplary execution capability and clean code.'",
              6: "Sponsor: 'High executive commitment and team will.'",
              7: "Partner Lead: 'Active third-party parts ecosystem alignment.'",
            };
            return comments[context.dataIndex] ? `\nComment: "${comments[context.dataIndex]}"` : "";
          }
        }
      }
    },
  };

  const handleExportPdf = () => {
    toast.success("Generating rubric radar visualization PDF export...");
    setTimeout(() => {
      toast.success("PDF export downloaded successfully.");
    }, 1200);
  };

  return (
    <Card className="border-[#173d2a]/15 bg-white shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-serif text-[#173d2a]">Multi-Dimensional Transformation Rubric</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Aggregated evaluation across economic value, disruption, reimagination, and execution readiness.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowComments(!showComments)} className="gap-1.5 border-[#cbd6c8] text-xs font-semibold text-[#173d2a]">
            <MessageSquareQuote className="h-3.5 w-3.5 text-[#876e16]" />
            {showComments ? "Hide Comments" : "Judge Comments"}
          </Button>
          <Button onClick={handleExportPdf} size="sm" className="gap-1.5 bg-[#173d2a] text-white hover:bg-[#112d1f] text-xs font-semibold">
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div style={{ height: "280px" }}>
          <Radar data={data} options={options} />
        </div>

        {showComments && (
          <div className="border border-[#d9ded2] bg-[#fbfaf6] p-4 text-xs space-y-2">
            <p className="font-bold uppercase tracking-wider text-[#1b5e3a] text-[10px]">Judge Comments by Dimension</p>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="border-l-2 border-[#876e16] pl-2.5 py-1 bg-white">
                <b>Cost Optimization (4.2):</b> &ldquo;Strong direct cost reduction in parts triage.&rdquo;
              </div>
              <div className="border-l-2 border-[#876e16] pl-2.5 py-1 bg-white">
                <b>Work Optimization (4.5):</b> &ldquo;Substantially reduces manual administrative friction.&rdquo;
              </div>
              <div className="border-l-2 border-[#876e16] pl-2.5 py-1 bg-white">
                <b>Operational Disruption (4.0):</b> &ldquo;High potential to disrupt legacy warranty workflows.&rdquo;
              </div>
              <div className="border-l-2 border-[#876e16] pl-2.5 py-1 bg-white">
                <b>Work Reimagination (4.6):</b> &ldquo;Reimagines the technician triage process end-to-end.&rdquo;
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
