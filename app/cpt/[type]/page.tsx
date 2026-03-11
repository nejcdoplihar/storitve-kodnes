// app/cpt/[type]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCPTPosts, formatDate, getFeaturedImageUrl } from "@/lib/wordpress";
import { CPT_CONFIGS } from "@/types/wordpress";

interface Props {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  return CPT_CONFIGS.map((cpt) => ({ type: cpt.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { type } = await params;
  const cpt = CPT_CONFIGS.find((c) => c.slug === type);
  if (!cpt) return { title: "Ni najdeno" };
  return { title: cpt.label };
}

const CPT_COLORS: Record<string, string> = {
  narocnik: "#3b82f6",
  ponudba: "#10b981",
  stranka: "#f59e0b",
};

const STORITVE_LABELS: Record<string, string> = {
  domena: "Domena",
  gostovanje: "Gostovanje",
  dom_gos: "Domena & gostovanje",
  vzdrzevanje: "Vzdrževanje",
};

function getStoritevLabel(value: unknown): string {
  if (!value || (Array.isArray(value) && value.length === 0)) return "—";
  if (Array.isArray(value)) return value.map((v) => STORITVE_LABELS[String(v)] || String(v)).join(", ");
  return STORITVE_LABELS[String(value)] || String(value);
}

function parseACFDate(d: string): string {
  if (!d || d.length !== 8) return d;
  return new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`).toLocaleDateString("sl-SI");
}

export default async function CPTListPage({ params, searchParams }: Props) {
  const { type } = await params;
  const { page } = await searchParams;

  const cpt = CPT_CONFIGS.find((c) => c.slug === type);
  if (!cpt) notFound();

  const currentPage = parseInt(page || "1");
  const color = CPT_COLORS[cpt.slug] || "#3b82f6";

  let posts: Awaited<ReturnType<typeof getCPTPosts>>["data"] = [];
  let totalPages = 1;
  let total = 0;
  let error: string | null = null;

  try {
    const result = await getCPTPosts(cpt.slug, currentPage, 20);
    posts = result.data;
    totalPages = result.totalPages;
    total = result.total;
  } catch (e) {
    error = `Napaka pri nalaganju: ${e instanceof Error ? e.message : "Neznana napaka"}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fb", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#0f172a", padding: "0 32px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14 }}>⚡</div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>WP Dashboard</span>
        </div>
        <Link href="/admin" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}>← Dashboard</Link>
      </div>

      {/* Breadcrumb */}
      <div style={{ padding: "14px 32px", borderBottom: "1px solid #eee", background: "#fff", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#888" }}>
        <Link href="/admin" style={{ color: "#3b82f6", textDecoration: "none" }}>Pregled</Link>
        <span>›</span>
        <span style={{ color: "#111", fontWeight: 500 }}>{cpt.icon} {cpt.label}</span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px" }}>

        {/* Title */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 9, background: color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{cpt.icon}</span>
              {cpt.label}
            </h1>
            <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>
              {total > 0 ? `${total} zapisov` : "Nalaganje..."}
            </div>
          </div>
          <Link href="/admin"
            style={{ fontSize: 13, color: "#6b7280", textDecoration: "none", padding: "8px 16px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", fontWeight: 500 }}>
            ← Nazaj
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: 20, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, marginBottom: 24, color: "#dc2626", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Empty */}
        {!error && posts.length === 0 && (
          <div style={{ padding: 60, textAlign: "center", color: "#aaa", background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{cpt.icon}</div>
            <div style={{ fontSize: 15 }}>Ni zapisov za <strong>{cpt.label}</strong></div>
          </div>
        )}

        {/* Posts table */}
        {posts.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {cpt.slug === "stranka" ? (
                    <>
                      <th style={thStyle}>Stranka</th>
                      <th style={thStyle}>Storitev</th>
                      <th style={thStyle}>Potek</th>
                      <th style={thStyle}>Strošek</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}></th>
                    </>
                  ) : (
                    <>
                      <th style={thStyle}>Naslov</th>
                      <th style={thStyle}>Datum</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}></th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {posts.map((post, i) => {
                  const logo = getFeaturedImageUrl(post, "thumbnail");
                  const acf = post.acf as Record<string, unknown> | undefined;
                  const isLast = i === posts.length - 1;

                  if (cpt.slug === "stranka") {
                    const potekRaw = acf?.potek_storitev as string | undefined;
                    const daysLeft = potekRaw && potekRaw.length === 8
                      ? Math.floor((new Date(`${potekRaw.slice(0,4)}-${potekRaw.slice(4,6)}-${potekRaw.slice(6,8)}`).getTime() - Date.now()) / 86400000)
                      : 999;

                    return (
                      <tr key={post.id} style={{ borderBottom: isLast ? "none" : "1px solid #f7f7f7" }}>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {logo
                              ? <img src={logo} alt={post.title.rendered} style={{ width: 40, height: 28, objectFit: "contain", borderRadius: 4, border: "1px solid #f0f0f0" }} />
                              : <div style={{ width: 40, height: 28, background: "#f3f4f6", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏢</div>
                            }
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }} dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
                              {acf?.domena_url && (
                                <a href={String(acf.domena_url)} target="_blank" rel="noreferrer"
                                  style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none" }}>
                                  {String(acf.domena_url).replace(/^https?:\/\//, "").replace(/\/$/, "")}
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: 13, color: "#555" }}>{getStoritevLabel(acf?.storitve)}</span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#333" }}>{potekRaw ? parseACFDate(potekRaw) : "—"}</div>
                          {potekRaw && (
                            <div style={{ fontSize: 11, color: daysLeft <= 5 ? "#f59e0b" : "#aaa" }}>
                              {daysLeft < 0 ? `${Math.abs(daysLeft)} dni nazaj` : daysLeft === 0 ? "danes" : `čez ${daysLeft} dni`}
                            </div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
                            {acf?.strosek ? `${acf.strosek} €` : "—"}
                          </div>
                          {(acf?.strosek_obracun as string[])?.length > 0 && (
                            <div style={{ fontSize: 11, color: "#aaa" }}>/ {(acf.strosek_obracun as string[]).join(", ")}</div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {daysLeft < 0
                            ? <span style={badgeStyle("#fee2e2", "#dc2626")}>POTEKLO</span>
                            : daysLeft <= 5
                            ? <span style={badgeStyle("#fef3c7", "#d97706")}>KMALU POTEČE</span>
                            : <span style={badgeStyle("#dcfce7", "#16a34a")}>VELJAVNO</span>
                          }
                        </td>
                        <td style={tdStyle}>
                          <Link href={`/cpt/${cpt.slug}/${post.slug}`}
                            style={{ fontSize: 13, color: "#3b82f6", fontWeight: 500, textDecoration: "none" }}>
                            Odpri →
                          </Link>
                        </td>
                      </tr>
                    );
                  }

                  // Narocnik & Ponudba
                  return (
                    <tr key={post.id} style={{ borderBottom: isLast ? "none" : "1px solid #f7f7f7" }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }} dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
                        {acf && Object.entries(acf).filter(([, v]) => v && String(v).trim()).slice(0, 2).map(([k, v]) => (
                          <span key={k} style={{ fontSize: 11, color: "#aaa", marginRight: 12 }}>
                            {k}: <span style={{ color: "#888" }}>{String(v)}</span>
                          </span>
                        ))}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 13, color: "#666" }}>{formatDate(post.date)}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                          background: post.status === "publish" ? "#dcfce7" : "#fef9c3",
                          color: post.status === "publish" ? "#15803d" : "#854d0e",
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: post.status === "publish" ? "#22c55e" : "#eab308" }} />
                          {post.status === "publish" ? "Objavljeno" : "Osnutek"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <Link href={`/cpt/${cpt.slug}/${post.slug}`}
                          style={{ fontSize: 13, color: "#3b82f6", fontWeight: 500, textDecoration: "none" }}>
                          Odpri →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#aaa" }}>Stran {currentPage} od {totalPages}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {currentPage > 1 && (
                    <Link href={`/cpt/${cpt.slug}?page=${currentPage - 1}`}
                      style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #e5e7eb", fontSize: 13, color: "#374151", textDecoration: "none", background: "#fff" }}>
                      ← Prejšnja
                    </Link>
                  )}
                  {currentPage < totalPages && (
                    <Link href={`/cpt/${cpt.slug}?page=${currentPage + 1}`}
                      style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #e5e7eb", fontSize: 13, color: "#374151", textDecoration: "none", background: "#fff" }}>
                      Naslednja →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Style helpers
const thStyle: React.CSSProperties = {
  padding: "11px 20px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "#888",
  borderBottom: "1px solid #f0f0f0",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 20px",
  verticalAlign: "middle",
};

function badgeStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    background: bg,
    color,
  };
}
