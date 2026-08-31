import { listActions } from "@/lib/agentActions";
import { ApprovalCard } from "@/components/admin/ApprovalCard";

export const dynamic = "force-dynamic";

export default async function OdobritvePage() {
  let actions: Awaited<ReturnType<typeof listActions>> = [];
  let err = "";
  try {
    actions = await listActions("pending");
  } catch (e) {
    err = String(e);
  }

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
