import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import HackathonBoard from "./pages/HackathonBoard";
import HackathonDetail from "./pages/HackathonDetail";
import CommunitySignals from "./pages/CommunitySignals";
import Home from "./pages/Home";
import JudgeDesk from "./pages/JudgeDesk";
import OpportunityBoard from "./pages/OpportunityBoard";
import OpportunityDetail from "./pages/OpportunityDetail";
import Realization from "./pages/Realization";
import RepositoryAccess from "./pages/RepositoryAccess";
import ReviewerCalibration from "./pages/ReviewerCalibration";
import SubmissionEvidence from "./pages/SubmissionEvidence";
import TalentProfile from "./pages/TalentProfile";
import InvestmentStudio from "./pages/InvestmentStudio";
import InvestmentCaseWorkspace from "./pages/InvestmentCaseWorkspace";
import CrowdsourcingCampaign from "./pages/CrowdsourcingCampaign";
import HackathonEventWorkspace from "./pages/HackathonEventWorkspace";
import EventJudgingWorkspace from "./pages/EventJudgingWorkspace";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={InvestmentStudio} />
      <Route path={"/studio"} component={InvestmentStudio} />
      <Route path={"/studio/cases/:id"} component={InvestmentCaseWorkspace} />
      <Route path={"/studio/campaigns/:id"} component={CrowdsourcingCampaign} />
      <Route path={"/studio/events/:id/judging"} component={EventJudgingWorkspace} />
      <Route path={"/studio/events/:id"} component={HackathonEventWorkspace} />
      <Route path={"/workspace"} component={InvestmentStudio} />
      <Route path={"/signals"} component={CommunitySignals} />
      <Route path={"/opportunities/:id"} component={OpportunityDetail} />
      <Route path={"/hackathons"} component={HackathonBoard} />
      <Route path={"/hackathons/:id"} component={HackathonDetail} />
      <Route path={"/judging"} component={JudgeDesk} />
      <Route path={"/reviewer-calibration"} component={ReviewerCalibration} />
      <Route path={"/realization"} component={Realization} />
      <Route path={"/repository-access"} component={RepositoryAccess} />
      <Route path={"/submission-evidence"} component={SubmissionEvidence} />
      <Route path={"/submissions"} component={SubmissionEvidence} />
      <Route path={"/talent"} component={TalentProfile} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
