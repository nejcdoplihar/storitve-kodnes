// POST /api/agent/chat — dashboard AI klepet (Anthropic Tool Runner, STREAMING).
// Bere žive podatke prek orodij; spremembe ustvari kot predloge (Odobritve).
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSessionUser } from "@/lib/agentWriteAuth";
import { chatTools } from "@/lib/agentChatTools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `Si operativni pomočnik agencije Kodnes. Bereš ŽIVE podatke (naročniki,
storitve, finance, opravila) prek orodij in odgovarjaš v slovenščini.
- Za konkretne podatke (stranke, zneski, poteki, opravila) VEDNO uporabi orodja; ničesar ne izmišljaj.
- Za spremembe uporabi propose_* orodja — ta NE pišejo, ustvarijo predlog, ki ga uporabnik
  potrdi v dashboardu (Odobritve). Nikoli ne trdi, da je sprememba izvedena; povej, da čaka na potrditev.
- Bodi jedrnat. Ne vključuj internih ali sistemskih XML oznak v odgovor.`;

export async function POST(req: NextRequest) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Ni avtorizacije" }, { status: 401 });
  }
  let body: { messages?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neveljaven JSON" }, { status: 400 });
  }
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Ni sporočil" }, { status: 400 });
  }

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const runner = client.beta.messages.toolRunner({
          model: "claude-sonnet-5",
          max_tokens: 4096,
          thinking: { type: "disabled" },
          system: SYSTEM,
          tools: chatTools,
          messages: messages as Anthropic.Beta.BetaMessageParam[],
          stream: true,
        });
        // Vsak korak (turn) je svoj tok; naprej pošiljamo besedilne delte.
        for await (const turnStream of runner) {
          for await (const event of turnStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        controller.enqueue(encoder.encode(`\n\n[Napaka: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
