import { useAuth } from "@/_core/hooks/useAuth";
import React, { Fragment } from "react";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Bot, Compass, FileCheck2, Gavel, Leaf, LockKeyhole, LogOut, Radar, Rocket, Scale, UsersRound } from "lucide-react";
import { Link, useLocation } from "wouter";

const legacyNavItems = [
  { path: "/workspace", label: "1 · Value field", icon: Compass },
  { path: "/signals", label: "Early signals", icon: UsersRound },
  { path: "/hackathons", label: "2 · Event HQ", icon: Rocket },
  { path: "/submission-evidence", label: "3 · Build & submit", icon: FileCheck2 },
  { path: "/judging", label: "4 · Evidence judging", icon: Gavel },
  { path: "/reviewer-calibration", label: "Reviewer calibration", icon: Scale },
  { path: "/realization", label: "5 · Realize", icon: Radar },
  { path: "/repository-access", label: "Repository control", icon: LockKeyhole },
  { path: "/talent", label: "Talent profile", icon: BadgeCheck },
];

export function lifecycleZoneForRoute(location: string) {
  if (location.startsWith("/judging") || location.startsWith("/realization")) return 2;
  if (location.startsWith("/hackathons") || location.startsWith("/submission-evidence") || location.startsWith("/submissions")) return 1;
  return 0;
}

const lifecycleZones = ["Evidence ledger", "Working value canvas", "Investment decision rail"];

export function LifecycleBand({ activeZone }: { activeZone: number }) {
  return <div className="grid max-w-3xl grid-cols-[1fr_24px_1fr_24px_1fr] items-center text-[8px] font-bold uppercase tracking-[.13em] text-[#6f7d71]" aria-label={`Lifecycle posture: ${lifecycleZones[activeZone]}`}>
    {lifecycleZones.map((zone, index) => <Fragment key={zone}><span className={`flex items-center gap-2 ${index === activeZone ? "text-[#173d2a]" : ""}`}><i className={`h-2 w-2 ${index === 0 ? "rounded-full" : index === 1 ? "rounded-full border" : ""} ${index === activeZone ? index === 2 ? "bg-[#c89412] shadow-[0_0_0_3px_rgba(200,148,18,.16)]" : "bg-[#1b5e3a] shadow-[0_0_0_3px_rgba(27,94,58,.12)]" : "border-[#73916e] bg-[#f4f4ed]"}`} />{zone}{index === activeZone && <b className="ml-1 text-[7px] tracking-[.09em] text-[#73816f]">ACTIVE</b>}</span>{index < lifecycleZones.length - 1 && <i className={`h-px ${index < activeZone ? "bg-[#1b5e3a]" : "bg-[#aab9a7]"}`} />}</Fragment>)}
  </div>;
}

export function StudioShell({ children, eyebrow }: { children: React.ReactNode; eyebrow: string }) {
  const { user, loading, logout } = useAuth();
  const [location] = useLocation();
  const activeZone = lifecycleZoneForRoute(location);
  return (
    <main className="min-h-screen bg-[#f7f5ed] text-[#1e2d24]">
      <div className="field-noise pointer-events-none fixed inset-0 opacity-[.12]" />
      <div className="relative mx-auto min-h-screen max-w-[1600px] border-x border-[#d7ddd0] bg-[#fbfaf6] lg:grid lg:grid-cols-[258px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[#d7ddd0] bg-[#f1f0e8] px-5 py-6 lg:flex lg:flex-col">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center bg-[#173d2a] text-[#f8d41d]"><Leaf className="h-5 w-5" /></div>
            <div><p className="font-serif text-[17px] font-semibold leading-none text-[#1b3829]">Innovation Portfolio</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[.16em] text-[#68746b]">John Deere · campaign to proof</p></div>
          </Link>
          <nav className="mt-12 space-y-2" aria-label="System navigation">
            <Link href="/" className={`flex items-center gap-3 px-3 py-3 text-[12px] font-semibold transition ${location.startsWith("/studio") || location === "/" ? "bg-[#173d2a] text-white shadow-[0_8px_16px_rgba(31,58,42,.14)]" : "text-[#58665b] hover:bg-[#e8eadf] hover:text-[#173d2a]"}`}><Compass className="h-4 w-4" />Campaign portfolio</Link>
            <p className="px-3 pt-5 text-[9px] font-bold uppercase tracking-[.16em] text-[#78847a]">Reference workspaces</p>
            {legacyNavItems.map(item => {
              const Icon = item.icon;
              const active = location === item.path || (item.path === "/workspace" && location.startsWith("/opportunities"));
              return <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-3 py-2 text-[11px] font-semibold transition ${active ? "bg-[#e2e8dc] text-[#173d2a]" : "text-[#68766a] hover:bg-[#e8eadf] hover:text-[#173d2a]"}`}><Icon className="h-3.5 w-3.5" />{item.label}{active && <i className="ml-auto h-1.5 w-1.5 bg-[#1b5e3a]" />}</Link>;
            })}
          </nav>
          <div className="mt-8 border-t border-[#d7ddd0] pt-6"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#78847a]">Operating principle</p><p className="mt-2 font-serif text-[18px] leading-5 text-[#274432]">Evidence before escalation.</p><p className="mt-2 text-[11px] leading-4 text-[#69756b]">AI surfaces sources and questions. People own the decision.</p></div>
          <div className="mt-auto border-t border-[#d7ddd0] pt-5">
            {loading ? <p className="text-[11px] text-[#69756b]">Loading session…</p> : user ? <div className="flex items-center justify-between gap-2"><div><p className="text-[11px] font-bold text-[#36463a]">{user.name || "Workspace member"}</p><p className="mt-0.5 text-[10px] uppercase tracking-[.12em] text-[#758077]">{user.role}</p></div><button type="button" title="Sign out" onClick={logout} className="grid h-8 w-8 place-items-center border border-[#ccd6ca] text-[#526357] hover:bg-white"><LogOut className="h-3.5 w-3.5" /></button></div> : <Button onClick={startLogin} className="h-10 w-full rounded-none bg-[#173d2a] text-[10px] font-bold uppercase tracking-[.12em] hover:bg-[#0d2b1d]">Sign in to work</Button>}
          </div>
        </aside>
        <section className="min-w-0">
          <header className="flex min-h-[74px] items-center justify-between border-b border-[#d7ddd0] bg-[#fbfaf6]/90 px-5 backdrop-blur md:px-8">
            <div className="flex items-center gap-3"><Link href="/" className="grid h-9 w-9 place-items-center bg-[#173d2a] text-[#f8d41d] lg:hidden"><Leaf className="h-4 w-4" /></Link><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#748076]">{eyebrow}</p><p className="mt-0.5 font-serif text-[19px] text-[#1b3829]">From field signal to accountable decision</p></div></div>
            <div className="flex items-center gap-3"><span className="hidden text-[10px] font-semibold text-[#617064] sm:inline">{user ? "Protected workspace" : "Sign in to create or review work"}</span><Bot className="h-4 w-4 text-[#748076]" /></div>
          </header>
          <div className="border-b border-[#d7ddd0] bg-[#f4f4ed] px-5 py-3 md:px-8 lg:px-10">
            <LifecycleBand activeZone={activeZone} />
          </div>
          <div className="px-5 py-7 md:px-8 lg:px-10">{children}</div>
        </section>
      </div>
    </main>
  );
}
