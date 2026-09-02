"use client";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { BRAND } from "@/lib/constants";
import { icons } from "@/components/admin/Icons";

type Msg = { role: "user" | "assistant"; content: string };

const PRIMERI = [
  "Naredi finančni pregled",
  "Katere storitve potečejo v 30 dneh?",
  "Dodaj opravilo »klic stranki« za naročnika …",
];

// ---- Lahek markdown (brez zunanjih knjižnic) ----
const codeStyle: React.CSSProperties = {
  background: "#f1f5f5", border: "1px solid #e3ebeb", borderRadius: 5,
  padding: "1px 5px", fontSize: 12.5, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};
function Inline({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("`")) out.push(<code key={k++} style={codeStyle}>{t.slice(1, -1)}</code>);
    else out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let k = 0;
  const flush = () => {
    if (bullets.length) {
      const items = bullets;
      blocks.push(
        <ul key={k++} style={{ margin: "4px 0", paddingLeft: 20 }}>
          {items.map((b, j) => <li key={j} style={{ marginBottom: 2 }}><Inline text={b} /></li>)}
        </ul>
      );
      bullets = [];
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
      blocks.push(
        <pre key={k++} style={{
          background: "#f1f5f5", border: "1px solid #e3ebeb", borderRadius: 8, padding: "8px 10px",
          fontSize: 12.5, overflowX: "auto", margin: "6px 0", fontFamily: "ui-monospace, Menlo, monospace",
        }}>{code.join("\n")}</pre>
      );
      continue;
    }
    const bm = /^\s*[-*•]\s+(.*)/.exec(line);
    if (bm) { bullets.push(bm[1]); continue; }
    flush();
    if (line.trim() === "") { blocks.push(<div key={k++} style={{ height: 6 }} />); continue; }
    blocks.push(<div key={k++} style={{ whiteSpace: "pre-wrap" }}><Inline text={line} /></div>);
  }
  flush();
  return <>{blocks}</>;
}

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", height: 18 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: BRAND,
          animation: `aiBounce 1.2s ${i * 0.15}s infinite ease-in-out`,
        }} />
      ))}
    </span>
  );
}

export function AiChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // samo-raztezanje vnosnega polja
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  function stop() { abortRef.current?.abort(); }

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        setMessages([...next, { role: "assistant", content: `⚠️ Napaka: ${err.error}` }]);
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
      if ((e as Error).name === "AbortError") {
        setMessages((prev) => {
          const c = [...prev];
          const li = c.length - 1;
          if (c[li]?.role === "assistant") {
            c[li] = { ...c[li], content: (c[li].content || "") + "\n\n— ustavljeno —" };
          }
          return c;
        });
      } else {
        setMessages([...next, { role: "assistant", content: `⚠️ Napaka: ${String(e)}` }]);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  const empty = messages.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 300px)", minHeight: 380 }}>
      <style>{`@keyframes aiBounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}`}</style>

      {/* zgornja vrstica */}
      {!empty && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            onClick={() => setMessages([])}
            disabled={loading}
            style={{ background: "none", border: "none", color: "#999", fontSize: 12.5, cursor: loading ? "default" : "pointer", padding: 4 }}
          >
            Počisti pogovor
          </button>
        </div>
      )}

      {/* sporočila */}
      <div style={{ flex: 1, overflow: "auto", background: "#fafbfb", border: "1px solid #eef1f1", borderRadius: 14, padding: 18 }}>
        {empty && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#8a9a9a" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: BRAND, color: "#fff", display: "grid", placeItems: "center", marginBottom: 14 }}>
              <span style={{ display: "inline-flex", width: 28, height: 28 }}>{icons.robot}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#556" }}>Kako lahko pomagam?</div>
            <div style={{ fontSize: 13, marginTop: 4, marginBottom: 16 }}>Berem žive podatke o naročnikih, storitvah, financah in opravilih.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 520 }}>
              {PRIMERI.map((p) => (
                <button key={p} onClick={() => send(p)}
                  style={{ background: "#fff", border: "1px solid #e3ebeb", borderRadius: 20, padding: "7px 14px", fontSize: 13, color: "#456", cursor: "pointer" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const isEmptyAssistant = !isUser && m.content === "";
          return (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 14, flexDirection: isUser ? "row-reverse" : "row" }}>
              {!isUser && (
                <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, background: BRAND, color: "#fff", display: "grid", placeItems: "center", marginTop: 2 }}>
                  <span style={{ display: "inline-flex", width: 17, height: 17 }}>{icons.robot}</span>
                </div>
              )}
              <div style={{
                maxWidth: "82%",
                borderRadius: 14,
                padding: "10px 14px",
                fontSize: 14,
                lineHeight: 1.55,
                background: isUser ? BRAND : "#fff",
                color: isUser ? "#fff" : "#222",
                border: isUser ? "none" : "1px solid #eef1f1",
                boxShadow: isUser ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
                borderTopRightRadius: isUser ? 4 : 14,
                borderTopLeftRadius: isUser ? 14 : 4,
              }}>
                {isEmptyAssistant ? <Dots /> : isUser ? <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span> : <Markdown text={m.content} />}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* vnos */}
      <div style={{
        display: "flex", gap: 8, marginTop: 12, alignItems: "flex-end",
        background: "#fff", border: "1px solid #dde3e3", borderRadius: 14, padding: 6,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <textarea
          ref={taRef}
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Vprašaj o Kodnes…  (Enter pošlje, Shift+Enter nova vrstica)"
          style={{
            flex: 1, resize: "none", border: "none", outline: "none", background: "transparent",
            padding: "9px 10px", fontSize: 14, lineHeight: 1.5, fontFamily: "inherit", maxHeight: 160,
          }}
        />
        {loading ? (
          <button onClick={stop} title="Ustavi odgovarjanje"
            style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, borderRadius: 11, padding: "9px 16px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#e5484d", border: "none", cursor: "pointer" }}>
            <span style={{ width: 11, height: 11, background: "#fff", borderRadius: 2, display: "inline-block" }} /> Ustavi
          </button>
        ) : (
          <button onClick={() => send()} disabled={!input.trim()}
            style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, borderRadius: 11, padding: "9px 18px", fontSize: 14, fontWeight: 600, color: "#fff", background: BRAND, border: "none", cursor: input.trim() ? "pointer" : "default", opacity: input.trim() ? 1 : 0.5 }}>
            Pošlji
          </button>
        )}
      </div>
    </div>
  );
}
