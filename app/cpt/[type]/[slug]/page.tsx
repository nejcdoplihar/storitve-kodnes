// app/cpt/[type]/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { OpravilaSection, UrediStrankoButton } from "./OpravilaSection";
import { getCPTPostBySlug, getAllCPTSlugs, getFeaturedImageUrl, formatDate } from "@/lib/wordpress";
import { CPT_CONFIGS } from "@/types/wordpress";
import type { WPPost } from "@/types/wordpress";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BRAND = "#00a4a7";

// Razširimo WPPost s tipom za embedded avtorja
type PostWithAuthor = WPPost & {
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url: string; media_details?: { sizes?: Record<string, { source_url: string }> } }>;
    author?: Array<{ id: number; name: string; slug: string }>;
  };
};


const BRAND = "#00a4a7";

interface Props {
  params: Promise<{ type: string; slug: string }>;
}

const STORITVE_LABELS: Record<string, string> = {
  domena: "Domena", gostovanje: "Gostovanje",
  dom_gos: "Domena & gostovanje", vzdrzevanje: "Vzdrževanje",
};

const OBRACUN_LABELS: Record<string, string> = {
  letno: "Letno", mesecno: "Mesečno", trimesecno: "Trimesečno",
  polletno: "Polletno", po_dogovoru: "Po dogovoru",
};

type ACFValue = string | number | boolean | null | undefined | ACFValue[] | Record<string, unknown>;

function stripHtml(html?: string) {
  return html ? html.replace(/<[^>]*>/g, "").trim() : "";
}

function isEmptyValue(value: unknown) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && value !== null && Object.keys(value as object).length === 0) return true;
  return false;
}

function fmtDate(d: string): string {
  if (!d) return "—";
  if (/^\d{8}$/.test(d)) return new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`).toLocaleDateString("sl-SI");
  const parts = d.split(/[\/\.]/).map(Number);
  if (parts.length === 3 && parts[2] > 1000) return new Date(parts[2], parts[1]-1, parts[0]).toLocaleDateString("sl-SI");
  return d;
}

function renderAcfValue(value: ACFValue): ReactNode {
  if (isEmptyValue(value)) return <span style={{ color: "#bbb" }}>—</span>;

  if (typeof value === "boolean") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
        background: value ? "#dcfce7" : "#f3f4f6",
        color: value ? "#15803d" : "#6b7280",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: value ? "#22c55e" : "#9ca3af" }} />
        {value ? "Aktivno" : "Neaktivno"}
      </span>
    );
  }

  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return (
        <a href={value} target="_blank" rel="noreferrer"
          style={{ color: BRAND, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          {value.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </a>
      );
    }
    if (/^\d{8}$/.test(value) || /^\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4}$/.test(value)) return <span>{fmtDate(value)}</span>;
    return <span>{value}</span>;
  }

  if (typeof value === "number") return <span style={{ fontWeight: 600 }}>{value}</span>;

  if (Array.isArray(value)) {
    const filtered = value.filter(v => !isEmptyValue(v));
    if (!filtered.length) return <span style={{ color: "#bbb" }}>—</span>;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {filtered.map((item, i) => (
          <span key={i} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: `${BRAND}15`, color: BRAND, fontWeight: 500 }}>
            {typeof item === "string" ? (STORITVE_LABELS[item] || OBRACUN_LABELS[item] || item) : String(item)}
          </span>
        ))}
      </div>
    );
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.rendered === "string") return <span dangerouslySetInnerHTML={{ __html: obj.rendered }} />;
    for (const key of ["post_title", "title", "name", "label"]) {
      if (typeof obj[key] === "string") return <span>{obj[key] as string}</span>;
    }
  }

  return <span>{String(value)}</span>;
}

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 20 }}>
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#111", textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</div>
        {action}
      </div>
      <div style={{ padding: "4px 24px 16px" }}>{children}</div>
    </div>
  );
}

function DetailRow({ label, value, compact }: { label: string; value: ReactNode; compact?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: compact ? "100px 1fr" : "160px 1fr", gap: 12, padding: "11px 0", borderBottom: "1px solid #f7f7f7", alignItems: "start" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: "#111", wordBreak: "break-word" }}>
        {value ?? <span style={{ color: "#bbb" }}>—</span>}
      </div>
    </div>
  );
}

function NarocnikCard({ acf }: { acf?: Record<string, unknown> }) {
  if (!acf) return null;
  const get = (k: string) => acf[k] as ACFValue;
  return (
    <Card title="Podatki naročnika">
      <DetailRow label="Kontaktna oseba" value={renderAcfValue(get("narocnik_kontaktna_oseba") ?? get("kontaktna_oseba"))} />
      <DetailRow label="Email" value={renderAcfValue(get("narocnik_email") ?? get("email"))} />
      <DetailRow label="Telefon" value={renderAcfValue(get("narocnik_telefon") ?? get("telefon"))} />
      <DetailRow label="Podjetje" value={renderAcfValue(get("narocnik_podjetje") ?? get("podjetje"))} />
      <DetailRow label="Naslov" value={renderAcfValue(get("narocnik_naslov") ?? get("naslov"))} />
    </Card>
  );
}

function StrankaCard({ acf }: { acf?: Record<string, unknown> }) {
  if (!acf) return null;
  const storitve = acf.storitve;
  const storitveNode = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {(Array.isArray(storitve) ? storitve : storitve ? [storitve] : []).map((s: unknown, i: number) => (
        <span key={i} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: `${BRAND}15`, color: BRAND, fontWeight: 500 }}>
          {STORITVE_LABELS[String(s)] || String(s)}
        </span>
      ))}
      {!storitve && <span style={{ color: "#bbb" }}>—</span>}
    </div>
  );
  return (
    <Card title="Podatki stranke">
      <DetailRow label="Storitev" value={storitveNode} />
      <DetailRow label="Domena URL" value={renderAcfValue(acf.domena_url as ACFValue)} />
      <DetailRow label="Potek storitev" value={acf.potek_storitev ? fmtDate(String(acf.potek_storitev)) : "—"} />
      <DetailRow label="Stanje storitve" value={renderAcfValue(acf.stanje_storitve as ACFValue)} />
      <DetailRow label="Strošek" value={acf.strosek ? `${acf.strosek} €` : "—"} />
      <DetailRow label="Obračun" value={renderAcfValue(acf.strosek_obracun as ACFValue)} />
      <DetailRow label="Opombe" value={renderAcfValue(acf.opombe as ACFValue)} />
    </Card>
  );
}

function PonudbaCard({ acf }: { acf?: Record<string, unknown> }) {
  if (!acf) return null;
  return (
    <Card title="Podatki ponudbe">
      <DetailRow label="Znesek" value={acf.znesek ? `${acf.znesek} €` : "—"} />
      <DetailRow label="Status" value={renderAcfValue(acf.status_ponudbe as ACFValue)} />
      <DetailRow label="Veljavnost" value={acf.veljavnost ? fmtDate(String(acf.veljavnost)) : "—"} />
    </Card>
  );
}

export async function generateStaticParams() {
  const paths: { type: string; slug: string }[] = [];
  for (const cpt of CPT_CONFIGS) {
    try {
      const slugs = await getAllCPTSlugs(cpt.slug);
      slugs.forEach((slug) => { if (slug) paths.push({ type: cpt.slug, slug }); });
    } catch { /* preskoči */ }
  }
  return paths;
}

export async function generateMetadata({ params }: Props) {
  const { type, slug } = await params;
  const post = await getCPTPostBySlug(type, slug).catch(() => null) as PostWithAuthor | null;
  if (!post) return { title: "Ni najdeno" };
  return { title: stripHtml(post.title?.rendered) || "Podrobnosti" };
}

export default async function CPTSinglePage({ params }: Props) {
  const { type, slug } = await params;

  const cpt = CPT_CONFIGS.find((c) => c.slug === type);
  if (!cpt) notFound();

  const post = await getCPTPostBySlug(type, slug).catch(() => null) as PostWithAuthor | null;
  if (!post) notFound();

  const imageUrl = getFeaturedImageUrl(post, "full");
  const hasContent = Boolean(stripHtml(post.content?.rendered));
  const title = stripHtml(post.title?.rendered);

  // URL za nazaj — na admin view za ta CPT
  const backUrl = `/admin?view=${cpt.slug}`;
  const backLabel = cpt.label;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fb", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#0f172a", padding: "0 32px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: BRAND, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <polyline points="13 2 13 9 20 9"/><polygon points="22 12 12 2 2 12"/>
              <polyline points="2 12 2 22 22 22 22 12"/>
            </svg>
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Kodnes admin</span>
        </div>
        <Link href="/admin" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}>
          ← Dashboard
        </Link>
      </div>

      {/* Breadcrumb */}
      <div style={{ padding: "12px 32px", borderBottom: "1px solid #eee", background: "#fff", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
        <Link href="/admin" style={{ color: "#9ca3af", textDecoration: "none" }}>Pregled</Link>
        <span style={{ color: "#d1d5db" }}>›</span>
        <Link href={backUrl} style={{ color: BRAND, textDecoration: "none", fontWeight: 500 }}>{backLabel}</Link>
        <span style={{ color: "#d1d5db" }}>›</span>
        <span style={{ color: "#374151", fontWeight: 600 }}>{title}</span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px" }}>

        {/* Title + akcije */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Logo inline z naslovom */}
            {imageUrl && (
              <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", border: "1px solid #f0f0f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <img src={imageUrl} alt={title} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
              </div>
            )}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${BRAND}15`, color: BRAND }}>{cpt.label}</span>
                <span style={{
                  padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: post.status === "publish" ? "#dcfce7" : "#fef9c3",
                  color: post.status === "publish" ? "#15803d" : "#854d0e",
                }}>
                  {post.status === "publish" ? "Objavljeno" : "Osnutek"}
                </span>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: 0, lineHeight: 1.2 }}>{title}</h1>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{formatDate(post.date)}</div>
            </div>
          </div>

          {/* Akcijski gumbi zgoraj desno */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            {type === "stranka" && <UrediStrankoButton strankaId={post.id} />}
            <Link href={backUrl} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb",
              background: "#fff", color: "#374151", textDecoration: "none", fontSize: 13, fontWeight: 500,
            }}>
              ← Nazaj na {backLabel}
            </Link>
          </div>
        </div>

        {/* 2 col layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }}>

          {/* Levo — vsebina */}
          <div>
            {hasContent && (
              <Card title="Vsebina">
                <div style={{ fontSize: 14, color: "#333", lineHeight: 1.7, padding: "8px 0" }}
                  dangerouslySetInnerHTML={{ __html: post.content?.rendered || "" }} />
              </Card>
            )}
            {type === "narocnik" && <NarocnikCard acf={post.acf} />}
            {type === "stranka" && <StrankaCard acf={post.acf} />}
            {type === "ponudba" && <PonudbaCard acf={post.acf} />}
            {type === "stranka" && <OpravilaSection strankaId={post.id} />}
          </div>

          {/* Desno — sidebar */}
          <div>
            <Card title="Osnovni podatki">
              <DetailRow compact label="Tip" value={
                <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: `${BRAND}15`, color: BRAND }}>{cpt.label}</span>
              } />
              <DetailRow compact label="Slug" value={
                <span style={{ fontFamily: "monospace", fontSize: 12, background: "#f5f5f5", padding: "2px 6px", borderRadius: 4, color: "#374151" }}>{post.slug}</span>
              } />
              <DetailRow compact label="Objavljeno" value={formatDate(post.date)} />
              {post._embedded?.author?.[0]?.name && (
                <DetailRow compact label="Avtor" value={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: BRAND, color: "#fff", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      {String(post._embedded.author[0].name).charAt(0).toUpperCase()}
                    </span>
                    {post._embedded.author[0].name}
                  </span>
                } />
              )}
              <DetailRow compact label="Status" value={
                <span style={{
                  padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: post.status === "publish" ? "#dcfce7" : "#fef9c3",
                  color: post.status === "publish" ? "#15803d" : "#854d0e",
                }}>
                  {post.status === "publish" ? "Objavljeno" : "Osnutek"}
                </span>
              } />
            </Card>

            <Card title="Navigacija">
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
                <Link href={backUrl} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "10px 16px", borderRadius: 8, background: BRAND,
                  color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600,
                }}>
                  ← {backLabel}
                </Link>
                <Link href="/admin" style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "10px 16px", borderRadius: 8, border: "1px solid #e5e7eb",
                  background: "#fff", color: "#374151", textDecoration: "none", fontSize: 13, fontWeight: 500,
                }}>
                  Pregled
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}