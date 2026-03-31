import { useState, useEffect } from "react";
import VideoEditor from "./VideoEditor";
import { initUnityAds } from "./unityAds";

type Tab = "edit" | "templates" | "projects" | "me";

/* ─── Branding ────────────────────────────────────────────── */

function StarIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill="url(#goldGradApp)"
        stroke="#b8860b"
        strokeWidth="0.5"
      />
      <defs>
        <linearGradient id="goldGradApp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="50%" stopColor="#ffec8b" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Navbar() {
  return (
    <header className="flex-shrink-0 bg-[#080808] border-b border-[rgba(184,134,11,0.25)] px-4 py-2 flex items-center gap-3">
      <div className="flex items-center gap-2.5">
        <div className="drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">
          <StarIcon />
        </div>
        <div className="flex flex-col leading-none">
          <span
            className="text-[18px] font-black tracking-wider gold-shimmer"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            SALMAN EDIT-Z
          </span>
          <span
            className="shaista-pulse"
            style={{ fontFamily: "Georgia, cursive, serif" }}
          >
            SHAISTA ✦
          </span>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button className="text-[rgba(184,134,11,0.5)] hover:text-[#ffd700] transition-colors" title="Search">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </button>
        <button className="text-[rgba(184,134,11,0.5)] hover:text-[#ffd700] transition-colors" title="Notifications">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ffd700] to-[#b8860b] flex items-center justify-center text-[#0d0d0d] font-black text-sm shadow-[0_0_10px_rgba(255,215,0,0.4)]">
          S
        </div>
      </div>
    </header>
  );
}

/* ─── Templates Tab ──────────────────────────────────────── */

const TEMPLATES = [
  { id: "t1", name: "Cinematic", style: "Dramatic cuts & fades", hex: "#8B6914" },
  { id: "t2", name: "Vlog",      style: "Fast-paced energetic",  hex: "#6B4C10" },
  { id: "t3", name: "Wedding",   style: "Soft & romantic",       hex: "#9B7A20" },
  { id: "t4", name: "Action",    style: "Rapid transitions",     hex: "#7A5C0A" },
  { id: "t5", name: "Slideshow", style: "Smooth crossfades",     hex: "#8A6A18" },
  { id: "t6", name: "Aesthetic", style: "Moody & artistic",      hex: "#6C5208" },
];

function TemplatesTab() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-4">
        <h2 className="text-[#ffd700] font-bold text-base mb-0.5">Templates</h2>
        <p className="text-[rgba(184,134,11,0.5)] text-xs">Choose a style to get started instantly</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => setSelected(selected === tpl.id ? null : tpl.id)}
            className={`flex flex-col rounded-2xl border overflow-hidden transition-all text-left ${
              selected === tpl.id
                ? "border-[#ffd700] shadow-[0_0_20px_rgba(255,215,0,0.25)]"
                : "border-[rgba(184,134,11,0.2)] hover:border-[rgba(184,134,11,0.4)]"
            }`}
          >
            <div
              className="w-full aspect-video flex items-center justify-center relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${tpl.hex}33 0%, #0a0a0a 100%)` }}
            >
              <div className="flex gap-0.5 items-end h-8">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="w-1 rounded-full opacity-60"
                    style={{ height: `${30 + Math.sin(i * 0.9) * 20}%`, background: `linear-gradient(to top, ${tpl.hex}, #ffd700)` }}
                  />
                ))}
              </div>
              {selected === tpl.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#ffd700] flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0d0d0d" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </div>
            <div className="p-2.5 bg-[#0a0a0a]">
              <p className="text-[#ffd700] font-semibold text-sm">{tpl.name}</p>
              <p className="text-[rgba(184,134,11,0.5)] text-[10px] mt-0.5">{tpl.style}</p>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <button className="mt-4 w-full py-3 bg-gradient-to-r from-[#b8860b] to-[#ffd700] text-[#0d0d0d] font-bold rounded-2xl shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] transition-all">
          Apply Template
        </button>
      )}
    </div>
  );
}

/* ─── Projects Tab ───────────────────────────────────────── */

const SAMPLE_PROJECTS = [
  { id: "1", name: "Summer Vlog",       duration: "2:34" },
  { id: "2", name: "Wedding Highlight", duration: "5:12" },
  { id: "3", name: "Travel Montage",    duration: "3:45" },
];

function ProjectsTab() {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[#ffd700] font-bold text-base">My Projects</h2>
          <p className="text-[rgba(184,134,11,0.5)] text-xs mt-0.5">{SAMPLE_PROJECTS.length} projects</p>
        </div>
        <button className="px-3 py-1.5 bg-gradient-to-r from-[#b8860b] to-[#ffd700] text-[#0d0d0d] font-bold rounded-xl text-xs shadow-[0_0_10px_rgba(255,215,0,0.2)]">
          + New
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {SAMPLE_PROJECTS.map((proj) => (
          <button key={proj.id}
            className="flex items-center gap-3 p-3 bg-[#0a0a0a] border border-[rgba(184,134,11,0.15)] rounded-2xl hover:border-[rgba(184,134,11,0.35)] hover:bg-[rgba(184,134,11,0.04)] transition-all text-left group">
            <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-[rgba(184,134,11,0.3)] to-[#0d0d0d] flex-shrink-0 flex items-center justify-center border border-[rgba(184,134,11,0.15)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffd700" opacity="0.7"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[rgba(184,134,11,0.9)] font-semibold text-sm truncate">{proj.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[rgba(184,134,11,0.4)] text-[10px]">⏱ {proj.duration}</span>
                <span className="text-[rgba(184,134,11,0.2)] text-[10px]">•</span>
                <span className="text-[rgba(184,134,11,0.4)] text-[10px]">Edited recently</span>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(184,134,11,0.4)" strokeWidth="2"
              className="group-hover:stroke-[#ffd700] transition-colors flex-shrink-0"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Me Tab ─────────────────────────────────────────────── */

function MeTab() {
  const stats = [
    { label: "Projects", value: "3" },
    { label: "Exports",  value: "12" },
    { label: "Duration", value: "11:31" },
  ];
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="relative mb-5 rounded-3xl overflow-hidden bg-[#0a0a0a] border border-[rgba(184,134,11,0.2)]">
        <div className="h-20 bg-gradient-to-r from-[rgba(184,134,11,0.3)] via-[rgba(255,215,0,0.15)] to-[rgba(184,134,11,0.1)]" />
        <div className="px-4 pb-5">
          <div className="flex items-end gap-3 -mt-9 mb-3">
            <div className="w-18 h-18 w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-[#ffd700] via-[#ffec8b] to-[#b8860b] flex items-center justify-center text-3xl font-black text-[#0d0d0d] shadow-[0_0_20px_rgba(255,215,0,0.4)] border-2 border-[#0a0a0a]">
              S
            </div>
            <div className="pb-1">
              <p className="text-[#ffd700] font-bold text-lg leading-none">Salman</p>
              <p className="text-[rgba(184,134,11,0.5)] text-xs italic mt-0.5">SAHISTA</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center p-2.5 bg-[rgba(184,134,11,0.06)] rounded-xl border border-[rgba(184,134,11,0.12)]">
                <span className="text-[#ffd700] font-bold text-base">{s.value}</span>
                <span className="text-[rgba(184,134,11,0.5)] text-[10px] mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {[
          { icon: "🎨", label: "Appearance",   sub: "Dark Gold theme" },
          { icon: "💾", label: "Storage",       sub: "2.4 GB used" },
          { icon: "🔔", label: "Notifications", sub: "On" },
          { icon: "🔐", label: "Privacy",       sub: "Manage settings" },
          { icon: "⭐", label: "Rate App",      sub: "Share your feedback" },
          { icon: "ℹ️", label: "About",         sub: "SALMAN EDIT-Z v2.0" },
        ].map((item) => (
          <button key={item.label}
            className="flex items-center gap-3 p-3.5 bg-[#0a0a0a] border border-[rgba(184,134,11,0.12)] rounded-2xl hover:border-[rgba(184,134,11,0.3)] hover:bg-[rgba(184,134,11,0.04)] transition-all text-left group">
            <span className="text-xl w-7 text-center">{item.icon}</span>
            <div className="flex-1">
              <p className="text-[rgba(184,134,11,0.85)] text-sm font-medium">{item.label}</p>
              <p className="text-[rgba(184,134,11,0.4)] text-[10px]">{item.sub}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(184,134,11,0.35)" strokeWidth="2"
              className="group-hover:stroke-[#ffd700] transition-colors"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Bottom Nav ─────────────────────────────────────────── */

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    {
      id: "edit", label: "Edit",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>,
    },
    {
      id: "templates", label: "Templates",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>,
    },
    {
      id: "projects", label: "Projects",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>,
    },
    {
      id: "me", label: "Me",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>,
    },
  ];

  return (
    <nav className="flex-shrink-0 bg-[#070707] border-t border-[rgba(184,134,11,0.2)]">
      <div className="flex">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 relative transition-all ${active ? "tab-active-glow" : "hover:bg-[rgba(184,134,11,0.04)]"}`}>
              {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-[#b8860b] via-[#ffd700] to-[#b8860b]" />}
              <span className={`transition-colors ${active ? "text-[#ffd700]" : "text-[rgba(184,134,11,0.4)]"}`}>{t.icon}</span>
              <span className={`text-[10px] font-medium transition-colors ${active ? "text-[#ffd700]" : "text-[rgba(184,134,11,0.4)]"}`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ─── App Root ───────────────────────────────────────────── */

export default function App() {
  const [tab, setTab] = useState<Tab>("edit");

  useEffect(() => {
    initUnityAds();
  }, []);

  return (
    <div className="flex flex-col bg-[#050505] overflow-hidden" style={{ height: "100dvh" }}>
      <Navbar />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {tab === "edit"      && <VideoEditor />}
        {tab === "templates" && <TemplatesTab />}
        {tab === "projects"  && <ProjectsTab />}
        {tab === "me"        && <MeTab />}
      </main>
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
