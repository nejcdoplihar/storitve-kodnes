// app/admin/odobritve/page.tsx
// Nabiralnik odobritev — čakajoči predlogi AI agenta. Zaščiteno z middleware.
import Link from "next/link";
import { BRAND } from "@/lib/constants";
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
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Odobritve</h1>
          <p className="text-sm text-gray-500">Predlogi AI agenta, ki čakajo na tvojo potrditev.</p>
        </div>
        <Link href="/admin" className="text-sm font-medium hover:underline" style={{ color: BRAND }}>
          ← Nazaj na dashboard
        </Link>
      </div>

      {err && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Napaka pri branju predlogov: {err}
          <br />
          <span className="text-red-600">Je CPT <code>agent_action</code> registriran v WP (mu-plugin)?</span>
        </p>
      )}
      {!err && actions.length === 0 && (
        <p className="text-gray-500">Ni predlogov na čakanju.</p>
      )}

      <div className="space-y-3">
        {actions.map((a) => (
          <ApprovalCard key={a.id} action={a} />
        ))}
      </div>
    </div>
  );
}
