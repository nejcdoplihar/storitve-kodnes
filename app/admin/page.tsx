"use client";
// app/admin/page.tsx
// ============================================================
// REFAKTORIRANI ADMIN VMESNIK
// Originalna datoteka: 3200+ vrstic → ta datoteka: ~120 vrstic
//
// Struktura modulov:
//   lib/constants.ts          — BRAND, WP_URL, STORITVE_LABELS...
//   lib/helpers.ts            — formatDate, parseACFDate, getDaysLeft...
//   types/admin.ts            — Post, Stranka, Opravilo, ActiveView
//   hooks/useWPData.ts        — useWPData, useAllWPData, useStranke
//   hooks/useOpravila.ts      — useOpravila
//   hooks/useAuth.ts          — useCurrentUser, useSessionTimeout
//   components/admin/Icons.tsx           — SVG ikone
//   components/admin/UI.tsx              — ModalWrapper, StatCard, ConfirmDeleteDialog...
//   components/admin/DataTable.tsx       — Generična tabela s paginacijo
//   components/admin/GlobalSearchBar.tsx — Globalno iskanje
//   components/admin/UserMenu.tsx        — UserMenu, SessionWarning, SidebarProfileButton
//   components/admin/views/DashboardOverview.tsx
//   components/admin/views/OpravilaView.tsx
//   components/admin/views/FinanceStatistikaView.tsx
//   components/admin/views/ProfilView.tsx
//   components/admin/modals/StrankaModals.tsx
// ============================================================

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
  { id: "stranka", label: "Stranke", icon: icons.building },
  { id: "opravila", label: "Opravila", icon: icons.task },
  { id: "statistika", label: "Statistika", icon: icons.chart },
  { id: "finance", label: "Finance", icon: icons.euro },
];

const titles: Record<ActiveView, string> = {
  dashboard: "Pregled",
  narocnik: "Naročniki",
  ponudba: "Ponudbe",
  stranka: "Stranke",
  opravila: "Opravila",
  statistika: "Statistika",
  finance: "Finance",
  profil: "Nastavitve profila",
};

const subtitles: Record<ActiveView, string> = {
  dashboard: "Pregled vseh vsebin iz Kodnes CMS",
  narocnik: "Vsi zapisi tipa \"Naročnik\" iz WordPressa",
  ponudba: "Vsi zapisi tipa \"Ponudba\" iz WordPressa",
  stranka: "Vsi zapisi tipa \"Stranka\" iz WordPressa",
  opravila: "Vsa opravila in popravki za stranke",
  statistika: "Statistika strank po mesecih in storitvah",
  finance: "Pregled prihodkov in finančnih podatkov",
  profil: "Urejanje podatkov prijavljenega uporabnika",
};

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function Dashboard() {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { countdown, resetTimer, logout } = useSessionTimeout();

  // Modal state
  const [showNovaStranka, setShowNovaStranka] = useState(false);
  const [showNovNarocnik, setShowNovNarocnik] = useState(false);
  const [showNovaPonudba, setShowNovaPonudba] = useState(false);
  const [dataTableKey, setDataTableKey] = useState(0);
  const { stranke: strankeList } = useStranke();

  // Sync view from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view") as ActiveView | null;
    if (view && titles[view]) {
      setActiveView(view);
    }
  }, []);

  const handleSaved = () => setDataTableKey((k) => k + 1);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#f8f9fb",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Session warning overlay */}
      {countdown !== null && (
        <SessionWarning countdown={countdown} onStay={resetTimer} onLogout={logout} />
      )}

      {/* ======================================================
          SIDEBAR
      ====================================================== */}
      <aside
        style={{
          width: sidebarOpen ? 200 : 68,
          minWidth: sidebarOpen ? 200 : 68,
          background: "#0f172a",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease, min-width 0.2s ease",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "20px 18px",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: BRAND,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {icons.wp}
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1 }}>
                Kodnes admin
              </div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>
                storitve.kodnes.com
              </div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                title={!sidebarOpen ? item.label : undefined}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px",
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
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "#1e293b";
                    e.currentTarget.style.color = "#fff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#94a3b8";
                  }
                }}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom: profil + toggle */}
        <div
          style={{
            padding: "10px",
            borderTop: "1px solid #1e293b",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <SidebarProfileButton
            sidebarOpen={sidebarOpen}
            active={activeView === "profil"}
            onClick={() => setActiveView("profil")}
          />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={!sidebarOpen ? "Razširi" : undefined}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: "#475569",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1e293b";
              e.currentTarget.style.color = "#94a3b8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#475569";
            }}
          >
            {icons.menu}
            {sidebarOpen && <span style={{ fontSize: 13 }}>Skrči</span>}
          </button>
        </div>
      </aside>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header
          style={{
            background: "#fff",
            borderBottom: "1px solid #f0f0f0",
            padding: "0 28px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <span style={{ fontSize: 13, color: "#aaa" }}>Kodnes CMS / </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
              {titles[activeView]}
            </span>
          </div>
          <GlobalSearchBar />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <div style={{ padding: 28, flex: 1, overflowY: "auto" }}>
          {/* Page title */}
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: 0 }}>
              {titles[activeView]}
            </h1>
            <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
              {subtitles[activeView]}
            </p>
          </div>

          {/* Modals */}
          {showNovaStranka && (
            <NovaStrankaModal
              onClose={() => setShowNovaStranka(false)}
              onSaved={handleSaved}
            />
          )}
          {showNovNarocnik && (
            <NovNarocnikModal
              onClose={() => setShowNovNarocnik(false)}
              onSaved={handleSaved}
            />
          )}
          {showNovaPonudba && (
            <NovaPonudbaModal
              onClose={() => setShowNovaPonudba(false)}
              onSaved={handleSaved}
              stranke={strankeList}
            />
          )}

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
