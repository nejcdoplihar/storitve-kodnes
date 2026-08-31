"use client";
import { useState } from "react";
import { BRAND } from "@/lib/constants";
import { AiChat } from "./ai/AiChat";
import { AiPregledi } from "./ai/AiPregledi";
import { AiOdobritve } from "./ai/AiOdobritve";

type Tab = "klepet" | "pregledi" | "odobritve";
const TABS: [Tab, string][] = [
  ["klepet", "Klepet"],
  ["pregledi", "Pregledi"],
  ["odobritve", "Odobritve"],
];

export function AiAgentView() {
  const [tab, setTab] = useState<Tab>("klepet");
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: "1px solid #eee" }}>
        {TABS.map(([id, label]) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: "9px 16px",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: active ? BRAND : "#666",
                borderBottom: active ? `2px solid ${BRAND}` : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      {tab === "klepet" && <AiChat />}
      {tab === "pregledi" && <AiPregledi />}
      {tab === "odobritve" && <AiOdobritve />}
    </div>
  );
}
