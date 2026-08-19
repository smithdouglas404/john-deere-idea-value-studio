import React, { useState } from "react";
import { Settings, Globe, Palette, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function CleanAdminDropdown() {
  const [currentTheme, setCurrentTheme] = useState("John Deere (Default)");
  const [currentLocale, setCurrentLocale] = useState("English (US)");

  const handleThemeChange = (themeName: string) => {
    setCurrentTheme(themeName);
    toast.success(`Active white-label theme switched to ${themeName}`);
  };

  const handleLocaleChange = (localeName: string) => {
    setCurrentLocale(localeName);
    toast.success(`Global localization locale switched to ${localeName}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-[#173d2a]/30 bg-[#fcfbf7] text-[#173d2a] hover:bg-[#173d2a]/10">
          <Settings className="h-4 w-4 text-[#173d2a]" />
          <span>Tenant Admin</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-[#fcfbf7] border-[#173d2a]/20 text-foreground">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs font-serif text-[#173d2a]">
          <Shield className="h-3.5 w-3.5 text-[#876e16]" />
          Enterprise Administration
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 text-xs cursor-pointer">
            <Palette className="h-3.5 w-3.5 text-[#876e16]" />
            <span>Theme: {currentTheme}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-[#fcfbf7] border-[#173d2a]/20 text-xs">
            <DropdownMenuItem onClick={() => handleThemeChange("John Deere (Default)")} className="cursor-pointer">
              John Deere (Agricultural Green)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange("Kyndryl Brand")} className="cursor-pointer">
              Kyndryl (Red-Orange Accent)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange("Enterprise Green")} className="cursor-pointer">
              Enterprise Green (Deep Forest)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange("Classic Oat")} className="cursor-pointer">
              Classic Oat (Value Fieldbook)
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 text-xs cursor-pointer">
            <Globe className="h-3.5 w-3.5 text-[#876e16]" />
            <span>Language: {currentLocale}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-[#fcfbf7] border-[#173d2a]/20 text-xs">
            <DropdownMenuItem onClick={() => handleLocaleChange("English (US)")} className="cursor-pointer">
              English (EN) — Primary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLocaleChange("Spanish (ES)")} className="cursor-pointer">
              Español (ES) — Top 5
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLocaleChange("German (DE)")} className="cursor-pointer">
              Deutsch (DE) — Top 5
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLocaleChange("French (FR)")} className="cursor-pointer">
              Français (FR) — Top 5
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLocaleChange("Portuguese (PT)")} className="cursor-pointer">
              Português (PT) — Top 5
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => toast.info("LLM Provider Routing: Active provider is Anthropic Claude Sonnet 4.6 via direct API key.")} className="text-xs cursor-pointer">
          LLM Provider Status: Active
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
