"use client";
// components/admin/GlobalSearchBar.tsx
// Globalna iskalna vrstica v headerju admin vmesnika

import { useState, useMemo } from "react";
import { useAllWPData } from "@/hooks/useWPData";
import { icons } from "./Icons";

export function GlobalSearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const enabled = query.length >= 2;

  const narocniki = useAllWPData("narocnik", enabled);
  const ponudbe = useAllWPData("ponudba", enabled);
  const stranke = useAllWPData("stranka", enabled);

  const loading = narocniki.loading || ponudbe.loading || stranke.loading;

  const results = useMemo(() => {
    if (!enabled) return [];
    const q = query.toLowerCase();
    return [
      ...narocniki.posts
        .filter((p) => {
          const title = p.title.rendered.toLowerCase();
          const acfText = p.acf ? JSON.stringify(p.acf).toLowerCase() : "";
          return title.includes(q) || acfText.includes(q);
        })
        .map((p) => ({ ...p, cptType: "Naročnik", cptSlug: "narocnik", color: "#00a4a7" })),
      ...ponudbe.posts
        .filter((p) => {
          const title = p.title.rendered.toLowerCase();
          const acfText = p.acf ? JSON.stringify(p.acf).toLowerCase() : "";
          return title.includes(q) || acfText.includes(q);
        })
        .map((p) => ({ ...p, cptType: "Ponudba", cptSlug: "ponudba", color: "#10b981" })),
      ...stranke.posts
        .filter((p) => {
          const title = p.title.rendered.toLowerCase();
          const acfText = p.acf ? JSON.stringify(p.acf).toLowerCase() : "";
          return title.includes(q) || acfText.includes(q);
        })
        .map((p) => ({ ...p, cptType: "Stranka", cptSlug: "stranka", color: "#f59e0b" })),
    ].slice(0, 8);
  }, [enabled, query, narocniki.posts, ponudbe.posts, stranke.posts]);

  return (
    <div style={{ position: "relative", width: 500 }}>
      <div
        style={{
          background: "#f8f9fb",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
        }}
      >
        <span style={{ color: "#aaa", flexShrink: 0 }}>{icons.search}</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Iskanje..."
          style={{
            border: "none",
            outline: "none",
            fontSize: 13,
            color: "#333",
            background: "transparent",
            flex: 1,
            width: "100%",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#aaa",
              fontSize: 16,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        )}
      </div>
      {open && query.length >= 2 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: "14px 16px", fontSize: 13, color: "#aaa", textAlign: "center" }}>
              Nalaganje...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "14px 16px", fontSize: 13, color: "#aaa", textAlign: "center" }}>
              Ni rezultatov
            </div>
          ) : (
            results.map((item, i) => (
              <a
                key={`${item.cptSlug}-${item.id}`}
                href={`/cpt/${item.cptSlug}/${item.slug}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 14px",
                  textDecoration: "none",
                  borderBottom: i < results.length - 1 ? "1px solid #f7f7f7" : "none",
                  background: "#fff",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                <span
                  style={{
                    padding: "2px 7px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600,
                    background: item.color + "18",
                    color: item.color,
                    flexShrink: 0,
                  }}
                >
                  {item.cptType}
                </span>
                <span
                  style={{ fontSize: 13, color: "#111", fontWeight: 500 }}
                  dangerouslySetInnerHTML={{ __html: item.title.rendered }}
                />
                <span style={{ fontSize: 12, color: "#aaa", marginLeft: "auto", flexShrink: 0 }}>→</span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
