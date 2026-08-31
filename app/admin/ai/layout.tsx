"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/constants";
import { icons } from "@/components/admin/Icons";

const tabs = [
  { href: "/admin/ai", label: "Klepet" },
  { href: "/admin/ai/pregledi", label: "Pregledi" },
  { href: "/admin/ai/odobritve", label: "Odobritve" },
];

export default function AiLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: BRAND, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icons.robot}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>AI agent</div>
            <div style={{ fontSize: 13, color: "#888" }}>Klepet, pregledi in odobritve na enem mestu.</div>
          </div>
        </div>
        <Link href="/admin" style={{ fontSize: 13, color: BRAND, textDecoration: "none", fontWeight: 500 }}>
          ← Nazaj na dashboard
        </Link>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: "1px solid #eee" }}>
        {tabs.map((t) => {
          const active = t.href === "/admin/ai" ? path === "/admin/ai" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              style={{
                padding: "9px 16px",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                textDecoration: "none",
                color: active ? BRAND : "#666",
                borderBottom: active ? `2px solid ${BRAND}` : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
