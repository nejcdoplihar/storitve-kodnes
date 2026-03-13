// app/cpt/[type]/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { OpravilaSection, UrediStrankoButton } from "./OpravilaSection";
import {
  getCPTPostBySlug,
  getAllCPTSlugs,
  getFeaturedImageUrl,
  formatDate,
} from "@/lib/wordpress";
import { CPT_CONFIGS } from "@/types/wordpress";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BRAND = "#00a4a7";

interface Props {
  params: Promise<{ type: string; slug: string }>;
}

const STORITVE_LABELS: Record<string, string> = {
  domena: "Domena",
  gostovanje: "Gostovanje",
  dom_gos: "Domena & gostovanje",
  vzdrzevanje: "Vzdrževanje",
};

const OBRACUN_LABELS: Record<string, string> = {
  letno: "Letno",
  mesecno: "Mesečno",
  trimesecno: "Trimesečno",
  polletno: "Polletno",
  po_dogovoru: "Po dogovoru",
};

type ACFValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ACFValue[]
  | Record<string, unknown>;

function stripHtml(html?: string) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

function isEmptyValue(value: unknown) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && value !== null && Object.keys(value).length === 0) return true;
  return false;
}

function getStoritevLabel(value: unknown) {
  if (!value) return "—";
  if (Array.isArray(value)) return value.map((v) => STORITVE_LABELS[String(v)] || String(v)).join(", ");
  return STORITVE_LABELS[String(value)] || String(value);
}

function fmtDate(d: string): string {
  if (!d || d.length !== 8) return d || "—";
  return new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`).toLocaleDateString("sl-SI");
}

function renderAcfValue(value: ACFValue): ReactNode {
  if (isEmptyValue(value)) return <span style={{ color: "#aaa" }}>—</span>;

  if (typeof value === "boolean") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
        background: value ? "#dcfce7" : "#fee2e2",
        color: value ? "#15803d" : "#dc2626",
      }}>
        {value ? "Da" : "Ne"}
      </span>
    );
  }

  if (typeof value === "number") return <span style={{ fontWeight: 600 }}>{value}</span>;

  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return (
        <a href={value} target="_blank" rel="noreferrer"
          style={{ color: BRAND, textDecoration: "none", wordBreak: "break-all" }}>
          {value}
        </a>
      );
    }
    if (/^\d{8}$/.test(value)) return <span>{fmtDate(value)}</span>;
    return <span>{value}</span>;
  }

  if (Array.isArray(value)) {
    const filtered = value.filter((v) => !isEmptyValue(v));
    if (filtered.length === 0) return <span style={{ color: "#aaa" }}>—</span>;
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
    const preferredKeys = ["title", "name", "label", "post_title", "value"];
    for (const key of preferredKeys) {
      if (typeof obj[key] === "string") return <span>{obj[key] as string}</span>;
    }
  }

  return <span>{String(value)}</span>;
}

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 20,
    }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{title}</div>
        {action}
      </div>
      <div style={{ padding: "8px 24px 16px" }}>{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "160px 1fr", gap: 12,
      padding: "11px 0", borderBottom: "1px solid #f7f7f7", alignItems: "start",
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", paddingTop: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: "#111", wordBreak: "break-word" }}>
        {value ?? <span style={{ color: "#aaa" }}>—</span>}
      </div>
    </div>
  );
}


// ---- CPT specific cards ----
function NarocnikCard({ acf }: { acf?: Record<string, unknown> }) {
  if (!acf) return null;
  return (
    <Card title="Podatki naročnika">
      <DetailRow label="Kontaktna oseba" value={renderAcfValue(acf.kontaktna_oseba as ACFValue)} />
      <DetailRow label="Email" value={renderAcfValue(acf.email as ACFValue)} />
      <DetailRow label="Telefon" value={renderAcfValue(acf.telefon as ACFValue)} />
      <DetailRow label="Podjetje" value={renderAcfValue(acf.podjetje as ACFValue)} />
      <DetailRow label="Naslov" value={renderAcfValue(acf.naslov as ACFValue)} />
    </Card>
  );
}

function StrankaCard({ acf }: { acf?: Record<string, unknown> }) {
  if (!acf) return null;
  return (
    <Card title="Podatki stranke">
      <DetailRow label="Storitev" value={getStoritevLabel(acf.storitve)} />
      <DetailRow label="Domena URL" value={renderAcfValue(acf.domena_url as ACFValue)} />
      <DetailRow label="Potek storitev" value={renderAcfValue(acf.potek_storitev as ACFValue)} />
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
      <DetailRow label="Številka ponudbe" value={renderAcfValue(acf.stevilka_ponudbe as ACFValue)} />
      <DetailRow label="Znesek" value={renderAcfValue(acf.znesek as ACFValue)} />
      <DetailRow label="Status ponudbe" value={renderAcfValue(acf.status_ponudbe as ACFValue)} />
      <DetailRow label="Veljavnost" value={renderAcfValue(acf.veljavnost as ACFValue)} />
    </Card>
  );
}

// ---- Static generation ----
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
  const post = await getCPTPostBySlug(type, slug).catch(() => null);
  if (!post) return { title: "Ni najdeno" };
  return { title: stripHtml(post.title?.rendered) || "Podrobnosti" };
}

// ---- Main page ----
export default async function CPTSinglePage({ params }: Props) {
  const { type, slug } = await params;

  const cpt = CPT_CONFIGS.find((c) => c.slug === type);
  if (!cpt) notFound();

  const post = await getCPTPostBySlug(type, slug).catch(() => null);
  if (!post) notFound();

  const imageUrl = getFeaturedImageUrl(post, "full");
  const hasContent = Boolean(stripHtml(post.content?.rendered));

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fb", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#0f172a", padding: "0 32px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: BRAND, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <polyline points="13 2 13 9 20 9"/><polygon points="22 12 12 2 2 12"/><polyline points="2 12 2 22 22 22 22 12"/>
            </svg>
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Kodnes admin</span>
        </div>
        <Link href="/admin" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
          ← Dashboard
        </Link>
      </div>

      {/* Breadcrumb */}
      <div style={{ padding: "14px 32px", borderBottom: "1px solid #eee", background: "#fff", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#888" }}>
        <Link href="/admin" style={{ color: BRAND, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
         Pregled
        </Link>
        <span>›</span>
        <Link href={`/cpt/${cpt.slug}`} style={{ color: BRAND, textDecoration: "none" }}>{cpt.label}</Link>
        <span>›</span>
        <span style={{ color: "#111", fontWeight: 500 }} dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px" }}>

        {/* Title area */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${BRAND}15`, color: BRAND }}>
              {cpt.label}
            </span>
            <span style={{
              padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: post.status === "publish" ? "#dcfce7" : "#fef9c3",
              color: post.status === "publish" ? "#15803d" : "#854d0e",
            }}>
              {post.status === "publish" ? "Objavljeno" : "Osnutek"}
            </span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", margin: 0, lineHeight: 1.2 }}
            dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 8 }}>Datum objave: {formatDate(post.date)}</div>
        </div>

        {/* Uredi gumb za stranke */}
        {type === "stranka" && (
          <div style={{ marginBottom: 16 }}>
            <UrediStrankoButton strankaId={post.id} />
          </div>
        )}

        {/* Logo — 1:1 square, small */}
        {imageUrl && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", border: "1px solid #f0f0f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <img src={imageUrl} alt={stripHtml(post.title.rendered)}
                style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }} />
            </div>
          </div>
        )}

        {/* 2 col layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>

          {/* Left */}
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

            {/* Opravila — samo za stranke */}
            {type === "stranka" && <OpravilaSection strankaId={post.id} />}
          </div>

          {/* Right sidebar */}
          <div>
            <Card title="Osnovni podatki">
              <DetailRow label="Tip vsebine" value={cpt.label} />
              <DetailRow label="Slug" value={<span style={{ fontFamily: "monospace", fontSize: 12, background: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>{post.slug}</span>} />
              <DetailRow label="Datum objave" value={formatDate(post.date)} />
              <DetailRow label="Status" value={
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
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
                <Link href={`/cpt/${cpt.slug}`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 8, background: BRAND, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                   Nazaj na {cpt.label}
                </Link>
                <Link href="/admin"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
                   Dashboard
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
