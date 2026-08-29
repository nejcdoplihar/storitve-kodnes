"use client";
import { useState } from "react";
import { BRAND } from "@/lib/constants";
import type { AgentAction } from "@/lib/agentActions";

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
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        #{action.id} · {action.summary} — {msg}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="font-medium text-gray-900">{action.summary}</div>
      <div className="mt-0.5 text-xs text-gray-500">{action.kind} → {action.endpoint}</div>
      <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
        {JSON.stringify(action.payload, null, 2)}
      </pre>
      {msg && <div className="mt-2 text-sm text-red-600">{msg}</div>}
      {!confirming ? (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setConfirming(true)}
            className="rounded px-3 py-1.5 text-sm font-medium text-white"
            style={{ background: BRAND }}
          >
            Odobri
          </button>
          <button
            disabled={state === "working"}
            onClick={() => run("reject")}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
          >
            Zavrni
          </button>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-gray-700">Uveljavi v živem sistemu?</span>
          <button
            disabled={state === "working"}
            onClick={() => run("apply")}
            className="rounded px-3 py-1.5 text-sm font-medium text-white"
            style={{ background: BRAND }}
          >
            Da, uveljavi
          </button>
          <button
            disabled={state === "working"}
            onClick={() => setConfirming(false)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
          >
            Prekliči
          </button>
        </div>
      )}
    </div>
  );
}
