"use client";
import { useState, type CSSProperties } from "react";
import { BRAND } from "@/lib/constants";
import type { AgentAction } from "@/lib/agentActions";

const card: CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #f0f0f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", padding: 16 };
const btn = (bg: string, color: string): CSSProperties => ({
  borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600,
  border: bg === "#fff" ? "1px solid #ddd" : "none", background: bg, color, cursor: "pointer",
});

export function ApprovalCard({ action }: { action: AgentAction }) {
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [msg, setMsg] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function run(kind: "apply" | "reject") {
    setState("working");
    setMsg("");
    try {
      const res = await fetch(`/api/agent/actions/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: action.id }),
      });
      if (res.ok) {
        setState("done");
        setMsg(kind === "apply" ? "✓ Uveljavljeno" : "Zavrnjeno");
      } else {
        setState("idle");
        setMsg((await res.json()).error || "Napaka");
      }
    } catch (e) {
      setState("idle");
      setMsg(String(e));
    }
  }

  if (state === "done") {
    return <div style={{ ...card, background: "#f9fafb", color: "#666", fontSize: 13 }}>#{action.id} · {action.summary} — {msg}</div>;
  }

  return (
    <div style={card}>
      <div style={{ fontWeight: 600, color: "#111", fontSize: 14 }}>{action.summary}</div>
      <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{action.kind} → {action.endpoint}</div>
      <pre style={{ marginTop: 8, maxHeight: 160, overflow: "auto", background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 8, padding: 10, fontSize: 12, color: "#444" }}>
        {JSON.stringify(action.payload, null, 2)}
      </pre>
      {msg && <div style={{ marginTop: 8, fontSize: 13, color: "#dc2626" }}>{msg}</div>}
      {!confirming ? (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={btn(BRAND, "#fff")} onClick={() => setConfirming(true)}>Odobri</button>
          <button style={btn("#fff", "#555")} disabled={state === "working"} onClick={() => run("reject")}>Zavrni</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#555" }}>Uveljavi v živem sistemu?</span>
          <button style={btn(BRAND, "#fff")} disabled={state === "working"} onClick={() => run("apply")}>Da, uveljavi</button>
          <button style={btn("#fff", "#555")} disabled={state === "working"} onClick={() => setConfirming(false)}>Prekliči</button>
        </div>
      )}
    </div>
  );
}
