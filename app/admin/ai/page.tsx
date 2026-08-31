"use client";
import { useState, useRef, useEffect } from "react";
import { BRAND } from "@/lib/constants";

type Msg = { role: "user" | "assistant"; content: string };

export default function AiChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        setMessages([...next, { role: "assistant", content: `Napaka: ${err.error}` }]);
        return;
      }
      setMessages([...next, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
    } catch (e) {
      setMessages([...next, { role: "assistant", content: `Napaka: ${String(e)}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 220px)", minHeight: 400 }}>
      <div style={{ flex: 1, overflow: "auto", background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 12, padding: 16 }}>
        {messages.length === 0 && (
          <p style={{ color: "#999", fontSize: 14 }}>
            Vprašaj npr. »Naredi finančni pregled«, »Katere storitve potečejo v 30 dneh?« ali »Dodaj opravilo za stranko X«.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.role === "user" ? "right" : "left", marginBottom: 10 }}>
            <div
              style={{
                display: "inline-block",
                maxWidth: "85%",
                whiteSpace: "pre-wrap",
                textAlign: "left",
                borderRadius: 14,
                padding: "9px 13px",
                fontSize: 14,
                lineHeight: 1.5,
                background: m.role === "user" ? BRAND : "#fff",
                color: m.role === "user" ? "#fff" : "#222",
                border: m.role === "user" ? "none" : "1px solid #f0f0f0",
                boxShadow: m.role === "user" ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ fontSize: 13, color: "#999" }}>razmišljam…</div>}
        <div ref={endRef} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Vprašaj o Kodnes…"
          style={{ flex: 1, borderRadius: 10, border: "1px solid #ddd", padding: "10px 12px", fontSize: 14, outline: "none" }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{ borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#fff", background: BRAND, border: "none", cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}
        >
          Pošlji
        </button>
      </div>
    </div>
  );
}
