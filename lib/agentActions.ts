// lib/agentActions.ts
// CRUD za predloge AI agenta (CPT agent_action v WP). Uporablja WP Application
// Password (kot ostale write poti). Predlogi so nabiralnik odobritev v dashboardu.

const WP_URL = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(/\/$/, "");
const WP_USER = process.env.WP_APP_USER || "";
const WP_PASS = process.env.WP_APP_PASSWORD || "";
const auth = () => "Basic " + Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");

export type AgentAction = {
  id: number;
  kind: string;
  endpoint: string;
  payload: unknown;
  summary: string;
  status: string;
  result?: string;
};

function mapPost(p: {
  id: number;
  title?: { rendered?: string };
  meta?: Record<string, string>;
}): AgentAction {
  const m = p.meta || {};
  let payload: unknown = {};
  try {
    payload = m.payload ? JSON.parse(m.payload) : {};
  } catch {
    payload = {};
  }
  return {
    id: p.id,
    kind: m.kind || "",
    endpoint: m.endpoint || "",
    payload,
    summary: m.summary || p.title?.rendered || "",
    status: m.status || "pending",
    result: m.result || "",
  };
}

export async function createAction(
  kind: string,
  endpoint: string,
  payload: unknown,
  summary: string
): Promise<number> {
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/agent_action`, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      title: summary,
      status: "publish",
      meta: { kind, endpoint, payload: JSON.stringify(payload), summary, status: "pending" },
    }),
  });
  if (!res.ok) throw new Error(`WP ${res.status}: ${await res.text()}`);
  return (await res.json()).id as number;
}

export async function listActions(status?: string): Promise<AgentAction[]> {
  const res = await fetch(
    `${WP_URL}/wp-json/wp/v2/agent_action?per_page=100&status=publish&orderby=date&order=desc`,
    { headers: { Authorization: auth() }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`WP ${res.status} ${res.statusText}`);
  const arr = ((await res.json()) as Parameters<typeof mapPost>[0][]).map(mapPost);
  return status ? arr.filter((a) => a.status === status) : arr;
}

export async function getAction(id: number): Promise<AgentAction | null> {
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/agent_action/${id}`, {
    headers: { Authorization: auth() },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return mapPost(await res.json());
}

export async function updateAction(id: number, meta: Record<string, string>): Promise<void> {
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/agent_action/${id}`, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ meta }),
  });
  if (!res.ok) throw new Error(`WP ${res.status}: ${await res.text()}`);
}
