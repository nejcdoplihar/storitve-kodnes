// app/cpt/[type]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCPTPosts, formatDate } from "@/lib/wordpress";
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

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function getStoritevLabel(value: unknown): string {
  if (isEmptyValue(value)) return "";

  if (Array.isArray(value)) {
    return value
      .map((item) => STORITVE_LABELS[String(item)] || String(item))
      .filter(Boolean)
      .join(", ");
  }

  return STORITVE_LABELS[String(value)] || String(value);
}

function parseACFDate(value: unknown): string {
  if (typeof value !== "string") return "";
  if (!/^\d{8}$/.test(value)) return value;

  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);

  return `${day}. ${month}. ${year}`;
}

function formatRelationshipValue(value: unknown): string {
  if (isEmptyValue(value)) return "";

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;

          if (typeof obj.post_title === "string") return obj.post_title;
          if (typeof obj.name === "string") return obj.name;
          if (typeof obj.label === "string") return obj.label;

          if (typeof obj.title === "string") return obj.title;

          if (
            typeof obj.title === "object" &&
            obj.title !== null &&
            "rendered" in obj.title
          ) {
            return String((obj.title as { rendered?: unknown }).rendered || "");
          }

          if (typeof obj.id === "number") return `#${obj.id}`;
        }

        return String(item);
      })
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;

    if (typeof obj.post_title === "string") return obj.post_title;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.label === "string") return obj.label;

    if (typeof obj.title === "string") return obj.title;

    if (
      typeof obj.title === "object" &&
      obj.title !== null &&
      "rendered" in obj.title
    ) {
      return String((obj.title as { rendered?: unknown }).rendered || "");
    }

    if (typeof obj.id === "number") return `#${obj.id}`;
  }

  return String(value);
}

function getPreviewFields(post: any, type: string) {
  const acf = (post?.acf || {}) as Record<string, unknown>;
  const fields: Array<{ label: string; value: string }> = [];

  if (type === "narocnik") {
    if (!isEmptyValue(acf.narocnik_naziv)) {
      fields.push({ label: "Naziv", value: String(acf.narocnik_naziv) });
    }

    if (!isEmptyValue(acf.narocnik_kontaktna_oseba)) {
      fields.push({
        label: "Kontaktna oseba",
        value: String(acf.narocnik_kontaktna_oseba),
      });
    }

    if (!isEmptyValue(acf.narocnik_davcna_stevilka)) {
      fields.push({
        label: "Davčna številka",
        value: String(acf.narocnik_davcna_stevilka),
      });
    }
  }

  if (type === "stranka") {
    const storitve = getACFLabel(acf.storitve);
    if (!isEmptyValue(storitve)) {
      fields.push({ label: "Storitve", value: storitve });
    }

    if (!isEmptyValue(acf.domena_url)) {
      const domain = String(acf.domena_url)
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "");
      fields.push({ label: "Domena", value: domain });
    }

    const potek = parseACFDate(acf.potek_storitev);
    if (!isEmptyValue(potek)) {
      fields.push({ label: "Potek storitev", value: potek });
    }
  }

  if (type === "ponudba") {
    if (!isEmptyValue(post?.id)) {
      fields.push({ label: "ID", value: `#${post.id}` });
    }

    const narocnik = getACFLabel(acf.ponudba_narocnik);
    if (!isEmptyValue(narocnik)) {
      fields.push({ label: "Naročnik", value: narocnik });
    }

    if (!isEmptyValue(acf.ponudba_tip)) {
      fields.push({ label: "Tip", value: getACFLabel(acf.ponudba_tip) });
    }
  }

  return fields;
}

export default async function CPTListPage({ params, searchParams }: Props) {
  const { type } = await params;
  const { page } = await searchParams;

  const cpt = CPT_CONFIGS.find((c) => c.slug === type);
  if (!cpt) notFound();

  const currentPage = parseInt(page || "1", 10);
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
    error = `Napaka pri nalaganju: ${
      e instanceof Error ? e.message : "Neznana napaka"
    }`;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f9fb",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#0f172a",
          padding: "0 32px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 14,
            }}
          >
            ⚡
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
            WP Dashboard
          </span>
        </div>

        <Link
          href="/admin"
          style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}
        >
          ← Dashboard
        </Link>
      </div>

      <div
        style={{
          padding: "14px 32px",
          borderBottom: "1px solid #eee",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "#888",
        }}
      >
        <Link
          href="/admin"
          style={{ color: "#3b82f6", textDecoration: "none" }}
        >
          Pregled
        </Link>
        <span>›</span>
        <span style={{ color: "#111", fontWeight: 500 }}>
          {cpt.icon} {cpt.label}
        </span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px" }}>
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#111",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: color,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                {cpt.icon}
              </span>
              {cpt.label}
            </h1>

            <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>
              {total > 0 ? `${total} zapisov` : "Nalaganje..."}
            </div>
          </div>

          <Link
            href="/admin"
            style={{
              fontSize: 13,
              color: "#6b7280",
              textDecoration: "none",
              padding: "8px 16px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              background: "#fff",
              fontWeight: 500,
            }}
          >
            ← Nazaj
          </Link>
        </div>

        {error && (
          <div
            style={{
              padding: 20,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              marginBottom: 24,
              color: "#dc2626",
              fontSize: 13,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {!error && posts.length === 0 && (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              color: "#aaa",
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #f0f0f0",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>{cpt.icon}</div>
            <div style={{ fontSize: 15 }}>
              Ni zapisov za <strong>{cpt.label}</strong>
            </div>
          </div>
        )}

        {posts.length > 0 && (
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #f0f0f0",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  <th style={thStyle}>Naslov</th>
                  <th style={thStyle}>Datum</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>

              <tbody>
                {posts.map((post, i) => {
                  const previewFields = getPreviewFields(post, cpt.slug);
                  const isLast = i === posts.length - 1;

                  return (
                    <tr
                      key={post.id}
                      style={{
                        borderBottom: isLast ? "none" : "1px solid #f7f7f7",
                      }}
                    >
                      <td style={tdStyle}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: "#111",
                            marginBottom: previewFields.length > 0 ? 4 : 0,
                          }}
                          dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                        />

                        {previewFields.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 14,
                              rowGap: 4,
                            }}
                          >
                            {previewFields.map((item, index) => (
                              <span
                                key={`${item.label}-${index}`}
                                style={{ fontSize: 12, color: "#8f8f8f" }}
                              >
                                <span style={{ color: "#b4b4b4" }}>
                                  {item.label}:
                                </span>{" "}
                                {item.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <span style={{ fontSize: 13, color: "#666" }}>
                          {formatDate(post.date)}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 500,
                            background:
                              post.status === "publish" ? "#dcfce7" : "#fef9c3",
                            color:
                              post.status === "publish" ? "#15803d" : "#854d0e",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background:
                                post.status === "publish" ? "#22c55e" : "#eab308",
                            }}
                          />
                          {post.status === "publish" ? "Objavljeno" : "Osnutek"}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        <Link
                          href={`/cpt/${cpt.slug}/${post.slug}`}
                          style={{
                            fontSize: 13,
                            color: "#3b82f6",
                            fontWeight: 500,
                            textDecoration: "none",
                          }}
                        >
                          Odpri →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div
                style={{
                  padding: "16px 24px",
                  borderTop: "1px solid #f0f0f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 13, color: "#aaa" }}>
                  Stran {currentPage} od {totalPages}
                </span>

                <div style={{ display: "flex", gap: 8 }}>
                  {currentPage > 1 && (
                    <Link
                      href={`/cpt/${cpt.slug}?page=${currentPage - 1}`}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 7,
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        color: "#374151",
                        textDecoration: "none",
                        background: "#fff",
                      }}
                    >
                      ← Prejšnja
                    </Link>
                  )}

                  {currentPage < totalPages && (
                    <Link
                      href={`/cpt/${cpt.slug}?page=${currentPage + 1}`}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 7,
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        color: "#374151",
                        textDecoration: "none",
                        background: "#fff",
                      }}
                    >
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