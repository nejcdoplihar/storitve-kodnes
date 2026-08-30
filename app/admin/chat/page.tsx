"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/constants";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
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
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: res.ok ? data.reply : `Napaka: ${data.error}` }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: `Napaka: ${String(e)}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-2rem)] max-w-3xl flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">AI klepet</h1>
        <Link href="/admin" className="text-sm font-medium hover:underline" style={{ color: BRAND }}>
          ← Nazaj na dashboard
        </Link>
      </div>

      <div className="flex-1 space-y-3 overflow-auto rounded-xl border border-gray-200 bg-white p-4">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400">
            Vprašaj npr. »Naredi finančni pregled«, »Katere storitve potečejo v 30 dneh?« ali
            »Dodaj opravilo za stranko X«.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "bg-gray-100 text-gray-900" : "border border-gray-200 bg-gray-50 text-gray-800"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-gray-400">razmišljam…</div>}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Vprašaj o Kodnes…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
        />
        <button
          onClick={send}
          disabled={loading}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: BRAND }}
        >
          Pošlji
        </button>
      </div>
    </div>
  );
}
