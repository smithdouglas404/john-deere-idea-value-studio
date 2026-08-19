import React, { useState } from "react";
import { Settings, ShieldCheck, Cpu, Palette, Globe, CheckCircle2, Loader2, KeyRound, Eye, Inbox, Mail, BookmarkPlus, Filter, ArrowUpDown, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function CleanAdminConsole() {
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.studio.getTenantConfig.useQuery();
  const updateConfig = trpc.studio.updateTenantConfig.useMutation({
    onSuccess: () => {
      utils.studio.getTenantConfig.invalidate();
      toast.success("Tenant configuration updated successfully.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update configuration.");
    }
  });

  const [provider, setProvider] = useState<"anthropic" | "openai" | "built_in">("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState("claude-sonnet-4-6");
  const [lightModel, setLightModel] = useState("claude-haiku-4-5");
  const [heavyModel, setHeavyModel] = useState("claude-sonnet-4-6");
  const [brandTheme, setBrandTheme] = useState<"john_deere" | "kyndryl" | "enterprise_green" | "classic_oat">("john_deere");
  const [locale, setLocale] = useState<"en" | "es" | "de" | "fr" | "pt">("en");
  const [activeTab, setActiveTab] = useState<"config" | "preview" | "requests">("config");
  const [initialized, setInitialized] = useState(false);

  // Bundled Theme & Localization Presets state
  const [presets, setPresets] = useState<Array<{ name: string; theme: any; locale: string; primary: string; accent: string }>>([
    { name: "John Deere Standard (EN)", theme: "john_deere", locale: "en", primary: "#173d2a", accent: "#876e16" },
    { name: "Kyndryl Enterprise (FR)", theme: "kyndryl", locale: "fr", primary: "#FF462D", accent: "#171717" },
    { name: "Central European Operations (DE)", theme: "enterprise_green", locale: "de", primary: "#0f2d1e", accent: "#2d6a4f" },
  ]);
  const [presetName, setPresetName] = useState("");

  // Upgrade Requests state with status, filtering, sorting, and bulk actions
  const [upgradeRequests, setUpgradeRequests] = useState([
    { id: 1, name: "Douglas Smith", email: "smithdo@johndeere.com", tier: "Enterprise Platform Subscription", notes: "Scaling to global dealer network across North America and Europe.", date: "2026-08-18 04:30", status: "Pending" },
    { id: 2, name: "Sarah Jenkins", email: "sarah.j@johndeere.com", tier: "Managed Transformation Service", notes: "Requesting custom rubric calibration for autonomous machinery proof events.", date: "2026-08-18 02:15", status: "Contacted" },
    { id: 3, name: "Marcus Vance", email: "vance.m@johndeere.com", tier: "Enterprise Platform Subscription", notes: "Integration with SAP supply chain procurement pipeline.", date: "2026-08-18 01:00", status: "Pending" },
  ]);
  const [requestFilterStatus, setRequestFilterStatus] = useState<string>("All");
  const [requestSortOrder, setRequestSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedRequestIds, setSelectedRequestIds] = useState<number[]>([]);

  React.useEffect(() => {
    if (config && !initialized) {
      setProvider(config.llmProvider);
      setDefaultModel(config.defaultModel);
      setLightModel(config.lightModel);
      setHeavyModel(config.heavyModel);
      setBrandTheme(config.brandTheme);
      setLocale(config.defaultLocale as any);
      setInitialized(true);
    }
  }, [config, initialized]);

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-[#58675b]"><Loader2 className="mx-auto h-5 w-5 animate-spin text-[#173d2a]" /><p className="mt-2">Loading admin tenant console...</p></div>;
  }

  const localeStrings: Record<string, { title: string; subtitle: string; badge: string }> = {
    en: { title: "Innovation Portfolio & Investment Studio", subtitle: "Governed evidence-first pipeline for enterprise transformation.", badge: "Admin Authorized" },
    es: { title: "Portafolio de Innovación y Estudio de Inversión", subtitle: "Canal gobernado y basado en evidencia para la transformación empresarial.", badge: "Administrador Autorizado" },
    de: { title: "Innovationsportfolio & Investitionsstudio", subtitle: "Gesteuerte, evidenzbasierte Pipeline für die Unternehmenstransformation.", badge: "Administrator Autorisiert" },
    fr: { title: "Portefeuille d'Innovation et Studio d'Investissement", subtitle: "Canal gouverné axé sur les preuves pour la transformation d'entreprise.", badge: "Administrateur Autorisé" },
    pt: { title: "Portfólio de Inovação e Estúdio de Investimento", subtitle: "Pipeline governado baseado em evidências para transformação empresarial.", badge: "Administrador Autorizado" },
  };

  const previewString = localeStrings[locale] || localeStrings.en;

  const themeStyles: Record<string, { primary: string; accent: string; bg: string; name: string }> = {
    john_deere: { primary: "#173d2a", accent: "#876e16", bg: "#fcfbf7", name: "John Deere (Agricultural Green & Harvest Gold)" },
    kyndryl: { primary: "#FF462D", accent: "#171717", bg: "#fafafa", name: "Kyndryl Enterprise Red-Orange" },
    enterprise_green: { primary: "#0f2d1e", accent: "#2d6a4f", bg: "#f4f7f4", name: "Global Enterprise Forest Green" },
    classic_oat: { primary: "#3d3522", accent: "#876e16", bg: "#f7f5ed", name: "Value Fieldbook Classic Oat" },
  };

  const activeThemeStyle = themeStyles[brandTheme] || themeStyles.john_deere;

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast.error("Please enter a preset name.");
      return;
    }
    setPresets([...presets, { name: presetName.trim(), theme: brandTheme, locale, primary: activeThemeStyle.primary, accent: activeThemeStyle.accent }]);
    setPresetName("");
    toast.success(`Bundled theme & localization preset "${presetName.trim()}" saved successfully.`);
  };

  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedRequestIds.length === 0) {
      toast.error("No upgrade requests selected.");
      return;
    }
    setUpgradeRequests(upgradeRequests.map(r => selectedRequestIds.includes(r.id) ? { ...r, status: newStatus } : r));
    setSelectedRequestIds([]);
    toast.success(`Updated status to "${newStatus}" for selected requests.`);
  };

  const filteredRequests = upgradeRequests
    .filter(r => requestFilterStatus === "All" || r.status === requestFilterStatus)
    .sort((a, b) => requestSortOrder === "newest" ? b.id - a.id : a.id - b.id);

  return (
    <div className="border border-[#d9ded2] bg-[#fbfaf6] p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between border-b border-[#d9ded2] pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#173d2a]" />
            <h2 className="font-serif text-2xl text-[#173d2a]">Enterprise Tenant Admin Console</h2>
          </div>
          <p className="mt-1 text-sm text-[#58675b]">Configure LLM provider routing, bundled branding/localization presets, and multi-tenant pipeline operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={activeTab === "config" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("config")} className={activeTab === "config" ? "bg-[#173d2a] text-white" : ""}>
            Configuration
          </Button>
          <Button variant={activeTab === "preview" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("preview")} className={activeTab === "preview" ? "bg-[#173d2a] text-white gap-1.5" : "gap-1.5"}>
            <Eye className="h-3.5 w-3.5" />
            Live Preview
          </Button>
          <Button variant={activeTab === "requests" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("requests")} className={activeTab === "requests" ? "bg-[#173d2a] text-white gap-1.5" : "gap-1.5"}>
            <Inbox className="h-3.5 w-3.5" />
            Upgrade Requests ({upgradeRequests.filter(r => r.status === "Pending").length} pending)
          </Button>
        </div>
      </div>

      {activeTab === "config" && (
        <>
          <div className="mt-6 grid gap-8 lg:grid-cols-3">
            {/* LLM Provider & Routing */}
            <section className="border border-[#d9ded2] bg-white p-5">
              <div className="flex items-center gap-2 border-b border-[#e5e9e2] pb-3">
                <Cpu className="h-4 w-4 text-[#876e16]" />
                <h3 className="font-serif text-lg text-[#173d2a]">LLM Routing & Providers</h3>
              </div>
              <div className="mt-4 space-y-4">
                <label className="block text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">
                  Active LLM Provider
                  <select value={provider} onChange={e => setProvider(e.target.value as any)} className="mt-2 h-10 w-full border border-[#cbd6c8] bg-white px-3 text-sm text-[#173d2a]">
                    <option value="anthropic">Anthropic Claude API (Direct)</option>
                    <option value="openai">OpenAI GPT-5 Series</option>
                    <option value="built_in">Manus Built-In Enterprise Proxy</option>
                  </select>
                </label>

                <label className="block text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">
                  Provider API Key ({config?.apiKeyMasked || "Not Set"})
                  <div className="relative mt-2">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-[#708072]" />
                    <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter new API key to override" className="h-10 w-full border border-[#cbd6c8] bg-white pl-9 pr-3 text-sm text-[#173d2a]" />
                  </div>
                </label>

                <label className="block text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">
                  Default Agent Model
                  <input type="text" value={defaultModel} onChange={e => setDefaultModel(e.target.value)} className="mt-2 h-10 w-full border border-[#cbd6c8] bg-white px-3 text-sm text-[#173d2a]" />
                </label>

                <label className="block text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">
                  Lightweight Model (Triage & Summaries)
                  <input type="text" value={lightModel} onChange={e => setLightModel(e.target.value)} className="mt-2 h-10 w-full border border-[#cbd6c8] bg-white px-3 text-sm text-[#173d2a]" />
                </label>

                <label className="block text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">
                  Heavy Model (10-Lens Specialist Analysis)
                  <input type="text" value={heavyModel} onChange={e => setHeavyModel(e.target.value)} className="mt-2 h-10 w-full border border-[#cbd6c8] bg-white px-3 text-sm text-[#173d2a]" />
                </label>
              </div>
            </section>

            {/* White-Label Branding Themes & Presets */}
            <section className="border border-[#d9ded2] bg-white p-5">
              <div className="flex items-center gap-2 border-b border-[#e5e9e2] pb-3">
                <Palette className="h-4 w-4 text-[#876e16]" />
                <h3 className="font-serif text-lg text-[#173d2a]">White-Label Branding & Presets</h3>
              </div>
              <div className="mt-4 space-y-4">
                <label className="block text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">
                  Active Tenant Theme
                  <select value={brandTheme} onChange={e => setBrandTheme(e.target.value as any)} className="mt-2 h-10 w-full border border-[#cbd6c8] bg-white px-3 text-sm text-[#173d2a]">
                    <option value="john_deere">John Deere (Agricultural Green & Harvest Gold)</option>
                    <option value="kyndryl">Kyndryl Enterprise Red-Orange (#FF462D)</option>
                    <option value="enterprise_green">Global Enterprise Forest Green</option>
                    <option value="classic_oat">Value Fieldbook Classic Oat</option>
                  </select>
                </label>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">Save Bundled Theme & Language Preset</label>
                  <div className="flex gap-2">
                    <input type="text" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Preset name..." className="h-9 flex-1 border border-[#cbd6c8] bg-white px-3 text-xs text-[#173d2a]" />
                    <Button type="button" onClick={handleSavePreset} size="sm" className="h-9 bg-[#173d2a] text-white text-xs gap-1">
                      <BookmarkPlus className="h-3.5 w-3.5" /> Save
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {presets.map((p, idx) => (
                      <button key={idx} onClick={() => { setBrandTheme(p.theme); setLocale(p.locale as any); toast.success(`Applied preset: ${p.name} (Theme + ${p.locale.toUpperCase()})`); }} className="border border-[#cbd6c8] bg-[#fbfaf6] px-2 py-1 text-[10px] font-semibold text-[#173d2a] hover:bg-[#eef2eb]">
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded border border-[#d9ded2] p-3 bg-[#fbfaf6]">
                  <p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#1b5e3a]">Theme & Locale Summary</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#173d2a]">
                    <span className="font-semibold">{activeThemeStyle.name}</span>
                    <span className="rounded bg-[#876e16]/10 px-2 py-0.5 text-[10px] font-bold text-[#876e16]">{locale.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Global Localization */}
            <section className="border border-[#d9ded2] bg-white p-5">
              <div className="flex items-center gap-2 border-b border-[#e5e9e2] pb-3">
                <Globe className="h-4 w-4 text-[#876e16]" />
                <h3 className="font-serif text-lg text-[#173d2a]">Global Localization (Top 5 Locales)</h3>
              </div>
              <div className="mt-4 space-y-4">
                <label className="block text-[10px] font-bold uppercase tracking-[.12em] text-[#526456]">
                  Default Portal Language
                  <select value={locale} onChange={e => setLocale(e.target.value as any)} className="mt-2 h-10 w-full border border-[#cbd6c8] bg-white px-3 text-sm text-[#173d2a]">
                    <option value="en">English (US / Global Standard)</option>
                    <option value="es">Español (Latin America / Europe)</option>
                    <option value="de">Deutsch (Central European Operations)</option>
                    <option value="fr">Français (Global Enterprise)</option>
                    <option value="pt">Português (Brazil Operations)</option>
                  </select>
                </label>

                <div className="border border-[#cbd6c8] bg-[#eef2eb] p-3 text-xs leading-5 text-[#3b4c3e]">
                  <b>Bundled Presets Active:</b> Saving a preset stores both the visual branding theme and the active localization locale so administrators can switch entire tenant identities instantly.
                </div>
              </div>
            </section>
          </div>

          <div className="mt-6 flex justify-end border-t border-[#d9ded2] pt-5">
            <Button onClick={() => updateConfig.mutate({ llmProvider: provider, apiKey: apiKey.trim() || undefined, defaultModel, lightModel, heavyModel, brandTheme, defaultLocale: locale })} disabled={updateConfig.isPending} className="h-11 rounded-none bg-[#173d2a] px-6 text-[10px] font-bold uppercase tracking-[.12em] text-white">
              {updateConfig.isPending ? "Saving tenant configuration..." : "Save tenant configuration"}
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {activeTab === "preview" && (
        <div className="mt-6 space-y-6">
          <div className="rounded border border-[#173d2a]/20 p-6 shadow-sm transition-colors duration-300" style={{ backgroundColor: activeThemeStyle.bg }}>
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="h-4 w-8 rounded" style={{ backgroundColor: activeThemeStyle.primary }} />
                <span className="font-serif text-lg font-bold" style={{ color: activeThemeStyle.primary }}>John Deere Idea Value Studio — Live Preview</span>
              </div>
              <span className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: activeThemeStyle.primary }}>
                {previewString.badge}
              </span>
            </div>
            <div className="mt-6 space-y-3">
              <h1 className="font-serif text-3xl font-bold" style={{ color: activeThemeStyle.primary }}>
                {previewString.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {previewString.subtitle}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="border bg-white px-4 py-3 text-xs font-semibold shadow-sm" style={{ borderColor: `${activeThemeStyle.primary}33` }}>
                  Active Theme: <span className="text-[#876e16]">{activeThemeStyle.name}</span>
                </div>
                <div className="border bg-white px-4 py-3 text-xs font-semibold shadow-sm" style={{ borderColor: `${activeThemeStyle.primary}33` }}>
                  Selected Locale: <span className="text-[#876e16]">{locale.toUpperCase()}</span>
                </div>
                <div className="border bg-white px-4 py-3 text-xs font-semibold shadow-sm" style={{ borderColor: `${activeThemeStyle.primary}33` }}>
                  LLM Model Tier: <span className="text-[#876e16]">{heavyModel}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">Administrators can test branding tokens and localization strings safely before publishing them to the enterprise instance.</p>
        </div>
      )}

      {activeTab === "requests" && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d9ded2] pb-4">
            <div>
              <h3 className="font-serif text-lg text-[#173d2a]">Commercial Upgrade Requests ({filteredRequests.length})</h3>
              <p className="text-xs text-muted-foreground">Manage, filter, and bulk-update enterprise tier upgrade submissions.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <Filter className="h-3.5 w-3.5 text-[#876e16]" />
                <select value={requestFilterStatus} onChange={e => setRequestFilterStatus(e.target.value)} className="h-8 border border-[#cbd6c8] bg-white px-2 text-xs text-[#173d2a]">
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Provisioning">Provisioning</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 text-[#876e16]" />
                <select value={requestSortOrder} onChange={e => setRequestSortOrder(e.target.value as any)} className="h-8 border border-[#cbd6c8] bg-white px-2 text-xs text-[#173d2a]">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          {selectedRequestIds.length > 0 && (
            <div className="flex items-center justify-between border border-[#876e16]/30 bg-[#876e16]/5 p-3">
              <span className="text-xs font-semibold text-[#173d2a]">Selected {selectedRequestIds.length} request(s)</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange("Contacted")} className="h-7 text-xs bg-white">
                  Mark Contacted
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange("Provisioning")} className="h-7 text-xs bg-white">
                  Mark Provisioning
                </Button>
                <Button size="sm" onClick={() => handleBulkStatusChange("Completed")} className="h-7 text-xs bg-[#173d2a] text-white">
                  Mark Completed
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {filteredRequests.map((req) => {
              const isSelected = selectedRequestIds.includes(req.id);
              return (
                <div key={req.id} className="border border-[#d9ded2] bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedRequestIds(isSelected ? selectedRequestIds.filter(id => id !== req.id) : [...selectedRequestIds, req.id])} className="text-[#173d2a]">
                        {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </button>
                      <span className="font-serif font-bold text-[#173d2a]">{req.name} ({req.email})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={req.status}
                        onChange={e => {
                          const newStatus = e.target.value;
                          setUpgradeRequests(upgradeRequests.map(r => r.id === req.id ? { ...r, status: newStatus } : r));
                          toast.success(`Updated status for ${req.name} to ${newStatus}`);
                        }}
                        className="h-8 border border-[#cbd6c8] bg-white px-2 text-xs font-semibold text-[#173d2a]"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Provisioning">Provisioning</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <span className="rounded bg-[#876e16]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#876e16]">{req.tier}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground"><b>Scope & Objectives:</b> {req.notes}</p>
                  <div className="flex items-center justify-between pt-2 text-[10px] text-muted-foreground border-t">
                    <span>Submitted: {req.date}</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => { toast.success(`Opening email client for ${req.email}...`); window.location.href = `mailto:${req.email}?subject=John%20Deere%20Idea%20Value%20Studio%20-%20${encodeURIComponent(req.tier)}`; }} className="h-7 text-xs gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-[#173d2a]" />
                        Quick Email Reply
                      </Button>
                      <Button variant="default" size="sm" onClick={() => toast.success(`Provisioning workflow initiated for ${req.name}.`)} className="h-7 text-xs bg-[#173d2a] text-white">
                        Provision Tier
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
