"use client";
// app/admin/page.tsx — mobilno prilagojen layout s hamburger menijem

import { useState, useEffect } from "react";
import { BRAND } from "@/lib/constants";
import { icons } from "@/components/admin/Icons";
import { GlobalSearchBar } from "@/components/admin/GlobalSearchBar";
import { UserMenu, SessionWarning, SidebarProfileButton } from "@/components/admin/UserMenu";
import { DataTable } from "@/components/admin/DataTable";
import { DashboardOverview } from "@/components/admin/views/DashboardOverview";
import { OpravilaView } from "@/components/admin/views/OpravilaView";
import { StatistikaView, FinanceView } from "@/components/admin/views/FinanceStatistikaView";
import { ProfilView } from "@/components/admin/views/ProfilView";
import { NovaStrankaModal, NovNarocnikModal, NovaPonudbaModal } from "@/components/admin/modals/StrankaModals";
import { useSessionTimeout } from "@/hooks/useAuth";
import { useStranke } from "@/hooks/useWPData";
import type { ActiveView } from "@/types/admin";

// ============================================================
// NAV ITEMS
// ============================================================
const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Pregled", icon: icons.dashboard },
  { id: "narocnik", label: "Naročniki", icon: icons.users },
  { id: "ponudba", label: "Ponudbe", icon: icons.file },
  { id: "stranka", label: "Storitve", icon: icons.building },
  { id: "opravila", label: "Opravila", icon: icons.task },
  { id: "statistika", label: "Statistika", icon: icons.chart },
  { id: "finance", label: "Finance", icon: icons.euro },
];

const titles: Record<ActiveView, string> = {
  dashboard: "Pregled",
  narocnik: "Naročniki",
  ponudba: "Ponudbe",
  stranka: "Storitve",
  opravila: "Opravila",
  statistika: "Statistika",
  finance: "Finance",
  profil: "Nastavitve profila",
};

const subtitles: Record<ActiveView, string> = {
  dashboard: "Pregled vseh vsebin iz Kodnes CMS",
  narocnik: 'Vsi zapisi tipa "Naročnik" iz WordPressa',
  ponudba: 'Vsi zapisi tipa "Ponudba" iz WordPressa',
  stranka: 'Vsi zapisi tipa "Storitev" iz WordPressa',
  opravila: "Vsa opravila in popravki za naročnike",
  statistika: "Statistika naročnikov po mesecih in storitvah",
  finance: "Pregled prihodkov in finančnih podatkov",
  profil: "Urejanje podatkov prijavljenega uporabnika",
};

// ============================================================
// HAMBURGER IKONA
// ============================================================
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )}
    </svg>
  );
}

// ============================================================
// SIDEBAR VSEBINA (skupna za desktop in mobilni)
// ============================================================
function SidebarContent({
  activeView,
  sidebarOpen,
  onNavigate,
  onToggle,
}: {
  activeView: ActiveView;
  sidebarOpen: boolean;
  onNavigate: (view: ActiveView) => void;
  onToggle: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div style={{ padding: "20px 18px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: BRAND, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
          {icons.wp}
        </div>
        {sidebarOpen && (
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1 }}>Kodnes admin</div>
            <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>storitve.kodnes.com</div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        {navItems.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={!sidebarOpen ? item.label : undefined}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 10px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: active ? BRAND : "transparent",
                color: active ? "#fff" : "#94a3b8",
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                marginBottom: 2,
                transition: "all 0.15s",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#fff"; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; } }}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom: profil + toggle */}
      <div style={{ padding: "10px", borderTop: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 8 }}>
        <SidebarProfileButton
          sidebarOpen={sidebarOpen}
          active={activeView === "profil"}
          onClick={() => onNavigate("profil")}
        />
        <button
          onClick={onToggle}
          title={!sidebarOpen ? "Razširi" : undefined}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "#475569" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#94a3b8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#475569"; }}
        >
          {icons.menu}
          {sidebarOpen && <span style={{ fontSize: 13 }}>Skrči</span>}
        </button>
      </div>
    </>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function Dashboard() {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { countdown, resetTimer, logout } = useSessionTimeout();

  const [showNovaStranka, setShowNovaStranka] = useState(false);
  const [showNovNarocnik, setShowNovNarocnik] = useState(false);
  const [showNovaPonudba, setShowNovaPonudba] = useState(false);
  const [dataTableKey, setDataTableKey] = useState(0);
  const { stranke: strankeList } = useStranke();

  // Zaznaj mobilno napravo
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Sync view from URL — ob mountu in ob browser Back/Forward
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view") as ActiveView | null;
      setActiveView(view && titles[view] ? view : "dashboard");
    };

    syncFromUrl(); // ob mountu
    window.addEventListener("popstate", syncFromUrl); // ob Back/Forward
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  // Zapri mobilni meni ob spremembi view-a + posodobi URL
  const handleNavigate = (view: ActiveView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
    // Posodobi URL brez page reload
    const url = view === "dashboard" ? "/admin" : `/admin?view=${view}`;
    window.history.pushState(null, "", url);
  };

  const handleSaved = () => setDataTableKey((k) => k + 1);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8f9fb", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Session warning */}
      {countdown !== null && (
        <SessionWarning countdown={countdown} onStay={resetTimer} onLogout={logout} />
      )}

      {/* ======================================================
          MOBILNI OVERLAY (za zapiranje menija ob kliku zunaj)
      ====================================================== */}
      {isMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 998 }}
        />
      )}

      {/* ======================================================
          SIDEBAR — desktop
      ====================================================== */}
      {!isMobile && (
        <aside style={{ width: sidebarOpen ? 200 : 68, minWidth: sidebarOpen ? 200 : 68, background: "#0f172a", display: "flex", flexDirection: "column", transition: "width 0.2s ease, min-width 0.2s ease", overflow: "hidden", flexShrink: 0 }}>
          <SidebarContent
            activeView={activeView}
            sidebarOpen={sidebarOpen}
            onNavigate={handleNavigate}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        </aside>
      )}

      {/* ======================================================
          SIDEBAR — mobilni (slide-in drawer)
      ====================================================== */}
      {isMobile && (
        <aside style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 240,
          height: "100vh",
          background: "#0f172a",
          display: "flex",
          flexDirection: "column",
          zIndex: 999,
          transform: mobileMenuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
          boxShadow: mobileMenuOpen ? "4px 0 24px rgba(0,0,0,0.3)" : "none",
        }}>
          <SidebarContent
            activeView={activeView}
            sidebarOpen={true}
            onNavigate={handleNavigate}
            onToggle={() => setMobileMenuOpen(false)}
          />
        </aside>
      )}

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <header style={{
          background: "#fff",
          borderBottom: "1px solid #f0f0f0",
          padding: isMobile ? "0 16px" : "0 28px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          gap: 12,
        }}>
          {/* Levo: hamburger (mobilni) ali breadcrumb (desktop) */}
          {isMobile ? (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#374151", display: "flex", alignItems: "center", padding: 4, flexShrink: 0 }}
            >
              <HamburgerIcon open={mobileMenuOpen} />
            </button>
          ) : (
            <div style={{ flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: "#aaa" }}>Kodnes CMS / </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{titles[activeView]}</span>
            </div>
          )}

          {/* Sredina: naslov strani (samo mobilni) */}
          {isMobile && (
            <span style={{ fontSize: 15, fontWeight: 700, color: "#111", flex: 1, textAlign: "center" }}>
              {titles[activeView]}
            </span>
          )}

          {/* Desno: iskanje + user */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, flexShrink: 0 }}>
            {!isMobile && <GlobalSearchBar />}
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <div style={{ padding: isMobile ? "16px 12px" : 28, flex: 1, overflowY: "auto" }}>
          {/* Page title — samo desktop */}
          {!isMobile && (
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: 0 }}>{titles[activeView]}</h1>
              <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{subtitles[activeView]}</p>
            </div>
          )}

          {/* Modals */}
          {showNovaStranka && <NovaStrankaModal onClose={() => setShowNovaStranka(false)} onSaved={handleSaved} />}
          {showNovNarocnik && <NovNarocnikModal onClose={() => setShowNovNarocnik(false)} onSaved={handleSaved} />}
          {showNovaPonudba && <NovaPonudbaModal onClose={() => setShowNovaPonudba(false)} onSaved={handleSaved} stranke={strankeList} />}

          {/* Active view */}
          {activeView === "dashboard" ? (
            <DashboardOverview />
          ) : activeView === "statistika" ? (
            <StatistikaView />
          ) : activeView === "finance" ? (
            <FinanceView />
          ) : activeView === "opravila" ? (
            <OpravilaView />
          ) : activeView === "profil" ? (
            <ProfilView />
          ) : (
            <DataTable
              key={dataTableKey}
              cptSlug={activeView}
              onAdd={
                activeView === "stranka"
                  ? () => setShowNovaStranka(true)
                  : activeView === "narocnik"
                  ? () => setShowNovNarocnik(true)
                  : activeView === "ponudba"
                  ? () => setShowNovaPonudba(true)
                  : undefined
              }
            />
          )}
        </div>
      </main>
    </div>
  );
}