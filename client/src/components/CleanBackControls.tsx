import { ArrowLeft, Home } from "lucide-react";
import { Link, useLocation } from "wouter";
import { CleanThemeToggle } from "@/components/CleanThemeToggle";
import { CleanCommercialLayersModal } from "@/components/CleanCommercialLayersModal";
import { CleanAdminDropdown } from "@/components/CleanAdminDropdown";

export function CleanBackControls({ portfolioLabel = "Innovation portfolio" }: { portfolioLabel?: string }) {
  const [, setLocation] = useLocation();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    setLocation("/");
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="button"
        onClick={goBack}
        className="group inline-flex cursor-pointer items-center border border-transparent px-2.5 py-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#526456] transition-colors hover:border-[#cbd9c8] hover:bg-[#eaf2e7] hover:text-[#173d2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#876e16] focus-visible:ring-offset-2"
        aria-label="Back to previous screen"
      >
        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to previous screen
      </button>
      <Link
        href="/"
        className="inline-flex items-center text-[10px] font-bold uppercase tracking-[.13em] text-[#1b5e3a] hover:text-[#173d2a]"
      >
        <Home className="mr-2 h-3.5 w-3.5" />
        {portfolioLabel}
      </Link>
      <div className="flex items-center gap-2">
        <CleanAdminDropdown />
        <CleanCommercialLayersModal />
        <CleanThemeToggle />
      </div>
    </div>
  );
}
