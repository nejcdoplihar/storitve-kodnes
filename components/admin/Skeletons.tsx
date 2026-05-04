// components/admin/Skeletons.tsx
// Skeleton placeholderji za stanja nalaganja v admin vmesniku.
// Vse uporablja .ka-skeleton class iz app/globals.css.

import type { CSSProperties } from "react";

// ============================================================
// SKELETON — osnovni gradnik
// ============================================================
export function Skeleton({
  height = 14,
  width = "100%",
  borderRadius = 8,
  variant = "rect",
  style,
}: {
  height?: number | string;
  width?: number | string;
  borderRadius?: number | string;
  variant?: "rect" | "circle" | "line";
  style?: CSSProperties;
}) {
  const finalRadius = variant === "circle" ? "50%" : variant === "line" ? 4 : borderRadius;
  const finalHeight = variant === "line" ? 10 : height;
  return (
    <span
      className="ka-skeleton"
      style={{
        height: finalHeight,
        width,
        borderRadius: finalRadius,
        ...style,
      }}
    />
  );
}

// ============================================================
// CARD SKELETON — naslov + podnaslov + vsebina (children ali fiksna višina)
// ============================================================
export function CardSkeleton({
  height,
  showHeader = true,
  children,
}: {
  height?: number;
  showHeader?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #f0f0f0",
        padding: "20px 24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        minHeight: height,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {showHeader && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton height={14} width={160} />
          <Skeleton height={10} width={220} />
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================================
// STAT CARD SKELETON — za 4-kartično vrsto na Pregledu
// ============================================================
export function StatCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "12px 14px",
          border: "1px solid #f0f0f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Skeleton height={34} width={34} borderRadius={9} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
          <Skeleton height={10} width={70} />
          <Skeleton height={18} width={50} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "22px 24px",
        border: "1px solid #f0f0f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 0 }}>
          <Skeleton height={12} width={100} />
          <Skeleton height={28} width={80} />
          <Skeleton height={10} width={120} />
        </div>
        <Skeleton height={44} width={44} borderRadius={10} />
      </div>
    </div>
  );
}

// ============================================================
// TABLE SKELETON — za tabele (Opravila, Stranke, Aktivnost)
// ============================================================
export function TableSkeleton({
  rows = 6,
  cols = 5,
  showHeader = true,
  showAvatar = false,
}: {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
  showAvatar?: boolean;
}) {
  const rowItems = Array.from({ length: rows });
  const colItems = Array.from({ length: cols });

  return (
    <div style={{ width: "100%" }}>
      {showHeader && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `${showAvatar ? "52px " : ""}repeat(${cols}, 1fr)`,
            gap: 16,
            padding: "12px 24px",
            background: "#fafafa",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          {showAvatar && <span />}
          {colItems.map((_, i) => (
            <Skeleton key={i} height={10} width="60%" />
          ))}
        </div>
      )}
      {rowItems.map((_, ri) => (
        <div
          key={ri}
          style={{
            display: "grid",
            gridTemplateColumns: `${showAvatar ? "52px " : ""}repeat(${cols}, 1fr)`,
            gap: 16,
            alignItems: "center",
            padding: "14px 24px",
            borderBottom: ri < rows - 1 ? "1px solid #f7f7f7" : "none",
          }}
        >
          {showAvatar && <Skeleton height={36} width={36} borderRadius={8} />}
          {colItems.map((_, ci) => {
            const widthPct = ci === 0 ? "75%" : ci === cols - 1 ? "40%" : "60%";
            return <Skeleton key={ci} height={12} width={widthPct} />;
          })}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// LIST SKELETON — vrstice z avatarjem in 2 vrsticama besedila
// ============================================================
export function ListSkeleton({
  items = 5,
  avatar = true,
  showSecondaryLine = true,
}: {
  items?: number;
  avatar?: boolean;
  showSecondaryLine?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 4px",
            borderBottom: i < items - 1 ? "1px solid #f3f4f6" : "none",
          }}
        >
          {avatar && <Skeleton height={36} width={36} borderRadius={8} />}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton height={12} width="70%" />
            {showSecondaryLine && <Skeleton height={10} width="45%" />}
          </div>
          <Skeleton height={14} width={70} />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// BAR CHART SKELETON — 12 barov različnih višin
// ============================================================
export function BarChartSkeleton() {
  // Pred-določene "naključne" višine — stabilne med renderji
  const heights = [22, 38, 55, 71, 60, 48, 32, 44, 62, 80, 70, 50];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gap: 4,
        alignItems: "end",
        height: 110,
        padding: "20px 0 12px",
      }}
    >
      {heights.map((h, i) => (
        <Skeleton key={i} height={`${h}%`} borderRadius={3} />
      ))}
    </div>
  );
}

// ============================================================
// DONUT CHART SKELETON — krog + legendne vrstice
// ============================================================
export function DonutChartSkeleton() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "conic-gradient(#eef0f2, #f6f8fa, #eef0f2, #f6f8fa, #eef0f2)",
          position: "relative",
          flexShrink: 0,
        }}
        className="ka-pulse-dim"
      >
        <div
          style={{
            position: "absolute",
            inset: 26,
            background: "#fff",
            borderRadius: "50%",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, flex: 1 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Skeleton height={10} width={10} borderRadius="50%" />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <Skeleton height={10} width={80} />
              <Skeleton height={12} width={50} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
