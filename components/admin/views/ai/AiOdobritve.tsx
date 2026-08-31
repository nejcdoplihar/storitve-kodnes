"use client";
import { useEffect, useState } from "react";
import { ApprovalCard } from "@/components/admin/ApprovalCard";
import type { AgentAction } from "@/lib/agentActions";

export function AiOdobritve() {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/agent/actions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      setActions(data.actions || []);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p style={{ color: "#999", fontSize: 14 }}>Nalagam predloge…</p>;

  return (
    <div>
      {err && (
        <p style={{ background: "#fef2f2", color: "#b91c1c", padding: 12, borderRadius: 10, fontSize: 13 }}>
          Napaka pri branju predlogov: {err}
          <br />
          Je CPT <code>agent_action</code> registriran v WP (mu-plugin)?
        </p>
      )}
      {!err && actions.length === 0 && <p style={{ color: "#999", fontSize: 14 }}>Ni predlogov na čakanju.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {actions.map((a) => (
          <ApprovalCard key={a.id} action={a} />
        ))}
      </div>
    </div>
  );
}
