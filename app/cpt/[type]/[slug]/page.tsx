// app/cpt/[type]/[slug]/page.tsx

import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  getCPTPostBySlug,
  getAllCPTSlugs,
  getFeaturedImageUrl,
  formatDate,
} from "@/lib/wordpress";
import { CPT_CONFIGS } from "@/types/wordpress";

interface Props {
  params: Promise<{ type: string; slug: string }>;
}

const STORITVE_LABELS: Record<string, string> = {
  domena: "Domena",
  gostovanje: "Gostovanje",
  dom_gos: "Domena & gostovanje",
  vzdrzevanje: "Vzdrževanje",
};

function getStoritevLabel(value: unknown) {
  if (!value) return "—";

  if (Array.isArray(value)) {
    return value
      .map((item) => STORITVE_LABELS[String(item)] || String(item))
      .join(", ");
  }

  return STORITVE_LABELS[String(value)] || String(value);
}

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

function prettifyLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isEmptyValue(value: unknown) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && value !== null && Object.keys(value).length === 0) return true;
  return false;
}

function renderAcfValue(value: ACFValue): ReactNode {
  if (isEmptyValue(value)) return "—";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Da" : "Ne";
  }

  if (Array.isArray(value)) {
    return (
      <ul className="list-disc pl-5 space-y-1">
        {value.map((item, index) => (
          <li key={index}>{renderAcfValue(item)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;

    // Pogosti ACF/WP primeri
    if (typeof obj.rendered === "string") return obj.rendered;
    if (typeof obj.title === "string") return obj.title;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.label === "string") return obj.label;
    if (typeof obj.value === "string" || typeof obj.value === "number") {
      return String(obj.value);
    }

    return (
      <pre className="text-xs bg-gray-100 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(obj, null, 2)}
      </pre>
    );
  }

  return String(value);
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
        {label}
      </div>
      <div className="text-sm text-gray-900 break-words">{value || "—"}</div>
    </div>
  );
}

function SpecificAcfCard({
  type,
  acf,
}: {
  type: string;
  acf?: Record<string, unknown>;
}) {
  if (!acf) return null;

  if (type === "narocnik") {
    return (
      <Card title="Podatki naročnika">
        <div className="space-y-1">
          <DetailRow label="Kontaktna oseba" value={String(acf.kontaktna_oseba || "—")} />
          <DetailRow label="Email" value={String(acf.email || "—")} />
          <DetailRow label="Telefon" value={String(acf.telefon || "—")} />
          <DetailRow label="Podjetje" value={String(acf.podjetje || "—")} />
          <DetailRow label="Naslov" value={String(acf.naslov || "—")} />
        </div>
      </Card>
    );
  }

  if (type === "storitev") {
    return (
      <Card title="Podatki storitve">
        <div className="space-y-1">
          <DetailRow label="Kategorija" value={String(acf.kategorija || "—")} />
          <DetailRow label="Cena" value={String(acf.cena || "—")} />
          <DetailRow label="Trajanje" value={String(acf.trajanje || "—")} />
          <DetailRow label="Status storitve" value={String(acf.status_storitve || "—")} />
        </div>
      </Card>
    );
  }

  if (type === "ponudba") {
    return (
      <Card title="Podatki ponudbe">
        <div className="space-y-1">
          <DetailRow label="Številka ponudbe" value={String(acf.stevilka_ponudbe || "—")} />
          <DetailRow label="Znesek" value={String(acf.znesek || "—")} />
          <DetailRow label="Status ponudbe" value={String(acf.status_ponudbe || "—")} />
          <DetailRow label="Veljavnost" value={String(acf.veljavnost || "—")} />
        </div>
      </Card>
    );
  }

  return null;
}

function AdditionalAcfGrid({
  acf,
  excludedKeys = [],
}: {
  acf?: Record<string, unknown>;
  excludedKeys?: string[];
}) {
  if (!acf) return null;

  const entries = Object.entries(acf).filter(
    ([key, value]) => !excludedKeys.includes(key) && !isEmptyValue(value)
  );

  if (entries.length === 0) return null;

  return (
    <Card title="Dodatne informacije">
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              {prettifyLabel(key)}
            </dt>
            <dd className="text-sm text-gray-900 break-words">
              {renderAcfValue(value as ACFValue)}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

// Pre-generira statične strani za vse poste (SSG)
export async function generateStaticParams() {
  const paths: { type: string; slug: string }[] = [];

  for (const cpt of CPT_CONFIGS) {
    try {
      const slugs = await getAllCPTSlugs(cpt.slug);
      slugs.forEach((slug) => {
        paths.push({ type: cpt.slug, slug });
      });
    } catch {
      // CPT morda ne obstaja, preskoči
    }
  }

  return paths;
}

export async function generateMetadata({ params }: Props) {
  const { type, slug } = await params;

  const post = await getCPTPostBySlug(type, slug);

  if (!post) return { title: "Ni najdeno" };

  const image = getFeaturedImageUrl(post, "large");
  const cleanTitle = stripHtml(post.title?.rendered) || "Podrobnosti";
  const cleanExcerpt = stripHtml(post.excerpt?.rendered);
  const cleanContent = stripHtml(post.content?.rendered);

  return {
    title: cleanTitle,
    description: (cleanExcerpt || cleanContent || "").substring(0, 160),
    openGraph: {
      title: cleanTitle,
      description: (cleanExcerpt || cleanContent || "").substring(0, 160),
      images: image ? [{ url: image }] : [],
      type: "article",
    },
  };
}

export default async function CPTSinglePage({ params }: Props) {
  const { type, slug } = await params;

  const cpt = CPT_CONFIGS.find((c) => c.slug === type);
  if (!cpt) notFound();

  const post = await getCPTPostBySlug(type, slug);
  if (!post) notFound();

  const imageUrl = getFeaturedImageUrl(post, "full");
  const author = post._embedded?.author?.[0];
  const terms = post._embedded?.["wp:term"]?.flat() || [];
  const plainExcerpt = stripHtml(post.excerpt?.rendered);

  const excludedKeys = [
    "kontaktna_oseba",
    "email",
    "telefon",
    "podjetje",
    "naslov",
    "kategorija",
    "cena",
    "trajanje",
    "status_storitve",
    "stevilka_ponudbe",
    "znesek",
    "status_ponudbe",
    "veljavnost",
  ];

  return (
    <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-blue-600 transition-colors">
          Domov
        </Link>
        <span>›</span>
        <Link
          href={`/cpt/${cpt.slug}`}
          className="hover:text-blue-600 transition-colors"
        >
          {cpt.icon} {cpt.label}
        </Link>
        <span>›</span>
        <span
          className="text-gray-900 truncate max-w-xs"
          dangerouslySetInnerHTML={{ __html: post.title.rendered }}
        />
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold">
            {cpt.icon} {cpt.label}
          </span>

          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              post.status === "publish"
                ? "bg-green-50 text-green-700"
                : "bg-yellow-50 text-yellow-700"
            }`}
          >
            {post.status === "publish" ? "Objavljeno" : "Osnutek"}
          </span>
        </div>

        <h1
          className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-4"
          dangerouslySetInnerHTML={{ __html: post.title.rendered }}
        />

        {plainExcerpt && (
          <p className="max-w-3xl text-lg text-gray-600 leading-relaxed">
            {plainExcerpt}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-6">
          <span>📅 {formatDate(post.date)}</span>

          {author && (
            <span className="flex items-center gap-2">
              {author.avatar_urls?.["48"] && (
                <img
                  src={author.avatar_urls["48"]}
                  alt={author.name}
                  className="w-6 h-6 rounded-full"
                />
              )}
              {author.name}
            </span>
          )}

          {terms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {terms.map((term) => (
                <span
                  key={`${term.taxonomy}-${term.id}`}
                  className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs"
                >
                  {term.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Featured image */}
      {imageUrl && (
        <div className="mb-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <img
            src={imageUrl}
            alt={stripHtml(post.title.rendered)}
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_360px] gap-8">
        <div className="space-y-8">
          <Card title="Vsebina">
            <div
              className="wp-content"
              dangerouslySetInnerHTML={{
                __html: post.content?.rendered || "<p>Ni vsebine.</p>",
              }}
            />
          </Card>

          <AdditionalAcfGrid acf={post.acf} excludedKeys={excludedKeys} />
        </div>

        <aside className="space-y-6">
          <Card title="Osnovni podatki">
            <div className="space-y-1">
              <DetailRow label="Tip vsebine" value={cpt.label} />
              <DetailRow label="Slug" value={post.slug} />
              <DetailRow label="Datum objave" value={formatDate(post.date)} />
              <DetailRow
                label="Status"
                value={post.status === "publish" ? "Objavljeno" : "Osnutek"}
              />
            </div>
          </Card>

          <SpecificAcfCard type={params.type} acf={post.acf} />

          <Card title="Navigacija">
            <div className="flex flex-col gap-3">
              <Link
                href={`/cpt/${cpt.slug}`}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 text-white px-4 py-3 font-medium hover:bg-blue-700 transition-colors"
              >
                ← Nazaj na {cpt.label}
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 px-4 py-3 font-medium hover:bg-gray-50 transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </article>
  );
}