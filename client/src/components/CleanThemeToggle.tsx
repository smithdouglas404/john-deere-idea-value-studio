import { Moon, Sun } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/contexts/ThemeContext";

export function CleanThemeToggle() {
  const { theme, toggleTheme, switchable } = useTheme();

  if (!switchable || !toggleTheme) return null;

  const isDark = theme === "dark";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="inline-flex h-9 items-center gap-2 border border-[#cbd9c8] px-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#526456] transition-colors duration-200 hover:border-[#876e16] hover:bg-[#eef4e9] hover:text-[#173d2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#876e16] focus-visible:ring-offset-2"
        >
          {isDark ? <Sun aria-hidden="true" className="h-3.5 w-3.5 rotate-180 transition-transform duration-200" /> : <Moon aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-200" />}
          {isDark ? "Light" : "Dark"}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Switch between light and dark mode</TooltipContent>
    </Tooltip>
  );
}
