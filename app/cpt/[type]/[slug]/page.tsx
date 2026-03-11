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
  if (!value) return "Ni podatka";

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
  if (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 0
  ) {
    return true;
  }
  return false;
}

function isHtmlString(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function renderSimpleObject(obj: Record<string, unknown>): ReactNode {
  const preferredKeys = [
    "title",
    "name",
    "label",
    "post_title",
    "value",
    "post_name",
  ];

  for (const key of preferredKeys) {
    const val = obj[key];
    if (typeof val === "string" || typeof val === "number") {
      return String(val);
    }
  }

  if (typeof obj.rendered === "string") {
    return (
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: obj.rendered }}
      />
    );
  }

  if (typeof obj.url === "string") {
    const title =
      typeof obj.title === "string"
        ? obj.title
        : typeof obj.filename === "string"
        ? obj.filename
        : obj.url;

    return (
      <a
        href={obj.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline break-all hover:text-blue-700"
      >
        {title}
      </a>
    );
  }

  if (typeof obj.sizes === "object" && obj.sizes !== null) {
    const sizes = obj.sizes as Record<string, unknown>;

    const imgSrc =
      (typeof sizes.medium === "string" && sizes.medium) ||
      (typeof sizes.large === "string" && sizes.large) ||
      (typeof obj.url === "string" && obj.url);

    if (imgSrc) {
      return (
        <div className="space-y-3">
          <img
            src={imgSrc}
            alt={typeof obj.alt === "string" ? obj.alt : "Slika"}
            className="max-h-64 w-auto rounded-xl border border-gray-200"
          />
          {typeof obj.caption === "string" && stripHtml(obj.caption) && (
            <p className="text-sm text-gray-500">{stripHtml(obj.caption)}</p>
          )}
        </div>
      );
    }
  }

  const entries = Object.entries(obj).filter(([, value]) => !isEmptyValue(value));

  if (entries.length === 0) return "Ni podatka";

  return (
    <dl className="space-y-3">
      {entries.slice(0, 8).map(([key, value]) => (
        <div key={key}>
          <dt className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {prettifyLabel(key)}
          </dt>
          <dd className="text-sm text-gray-900 break-words">
            {renderAcfValue(value as ACFValue)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function renderAcfValue(value: ACFValue): ReactNode {
  if (isEmptyValue(value)) return "Ni podatka";

  if (typeof value === "string") {
    if (isHtmlString(value)) {
      return (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      );
    }

    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("mailto:") ||
      value.startsWith("tel:")
    ) {
      return (
        <a
          href={value}
          target={value.startsWith("http") ? "_blank" : undefined}
          rel={value.startsWith("http") ? "noopener noreferrer" : undefined}
          className="text-blue-600 underline break-all hover:text-blue-700"
        >
          {value}
        </a>
      );
    }

    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Da" : "Ne";
  }

  if (Array.isArray(value)) {
    const filtered = value.filter((item) => !isEmptyValue(item));
    if (filtered.length === 0) return "Ni podatka";

    return (
      <div className="space-y-2">
        {filtered.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3"
          >
            {renderAcfValue(item)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object" && value !== null) {
    return renderSimpleObject(value as Record<string, unknown>);
  }

  return String(value);
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-gray-100 py-3 last:border-b-0 sm:grid-cols-[140px_1fr] sm:gap-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div className="text-sm text-gray-900 break-words">{value ?? "Ni podatka"}</div>
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
          <DetailRow
            label="Kontaktna oseba"
            value={renderAcfValue(acf.kontaktna_oseba as ACFValue)}
          />
          <DetailRow label="Email" value={renderAcfValue(acf.email as ACFValue)} />
          <DetailRow
            label="Telefon"
            value={renderAcfValue(acf.telefon as ACFValue)}
          />
          <DetailRow
            label="Podjetje"
            value={renderAcfValue(acf.podjetje as ACFValue)}
          />
          <DetailRow
            label="Naslov"
            value={renderAcfValue(acf.naslov as ACFValue)}
          />
        </div>
      </Card>
    );
  }

  if (type === "storitev") {
    return (
      <Card title="Podatki storitve">
        <div className="space-y-1">
          <DetailRow label="Kategorija" value={getStoritevLabel(acf.kategorija)} />
          <DetailRow label="Cena" value={renderAcfValue(acf.cena as ACFValue)} />
          <DetailRow
            label="Trajanje"
            value={renderAcfValue(acf.trajanje as ACFValue)}
          />
          <DetailRow
            label="Status storitve"
            value={renderAcfValue(acf.status_storitve as ACFValue)}
          />
        </div>
      </Card>
    );
  }

  if (type === "ponudba") {
    return (
      <Card title="Podatki ponudbe">
        <div className="space-y-1">
          <DetailRow
            label="Številka ponudbe"
            value={renderAcfValue(acf.stevilka_ponudbe as ACFValue)}
          />
          <DetailRow label="Znesek" value={renderAcfValue(acf.znesek as ACFValue)} />
          <DetailRow
            label="Status ponudbe"
            value={renderAcfValue(acf.status_ponudbe as ACFValue)}
          />
          <DetailRow
            label="Veljavnost"
            value={renderAcfValue(acf.veljavnost as ACFValue)}
          />
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

  const entries = Object.entries(acf)
    .filter(([key, value]) => !excludedKeys.includes(key) && !isEmptyValue(value))
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) return null;

  return (
    <Card title="Dodatne informacije">
      <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="rounded-xl border border-gray-100 bg-gray-50 p-4"
          >
            <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
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
        if (slug) {
          paths.push({ type: cpt.slug, slug });
        }
      });
    } catch {
      // CPT morda ne obstaja, preskoči
    }
  }

  return paths;
}

export async function generateMetadata({ params }: Props) {
  const { type, slug } = await params;

  const post = await getCPTPostBySlug(type, slug).catch(() => null);

  if (!post) return { title: "Ni najdeno" };

  const image = getFeaturedImageUrl(post, "large");
  const cleanTitle = stripHtml(post.title?.rendered) || "Podrobnosti";
  const cleanExcerpt = stripHtml(post.excerpt?.rendered);
  const cleanContent = stripHtml(post.content?.rendered);
  const description = (cleanExcerpt || cleanContent || "").substring(0, 160);

  return {
    title: cleanTitle,
    description,
    openGraph: {
      title: cleanTitle,
      description,
      images: image ? [{ url: image }] : [],
      type: "article",
    },
  };
}

export default async function CPTSinglePage({ params }: Props) {
  const { type, slug } = await params;

  const cpt = CPT_CONFIGS.find((c) => c.slug === type);
  if (!cpt) notFound();

  const post = await getCPTPostBySlug(type, slug).catch(() => null);
  if (!post) notFound();

  const imageUrl = getFeaturedImageUrl(post, "full");
  const author = post._embedded?.author?.[0];
  const terms = post._embedded?.["wp:term"]?.flat() || [];
  const plainExcerpt = stripHtml(post.excerpt?.rendered);
  const hasMainContent = Boolean(stripHtml(post.content?.rendered));

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
    <article className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="transition-colors hover:text-blue-600">
          Domov
        </Link>
        <span>›</span>
        <Link
          href={`/cpt/${cpt.slug}`}
          className="transition-colors hover:text-blue-600"
        >
          {cpt.icon} {cpt.label}
        </Link>
        <span>›</span>
        <span
          className="max-w-xs truncate text-gray-900"
          dangerouslySetInnerHTML={{ __html: post.title.rendered }}
        />
      </nav>

      <header className="mb-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
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
          className="mb-4 text-3xl font-bold leading-tight text-gray-900 md:text-5xl"
          dangerouslySetInnerHTML={{ __html: post.title.rendered }}
        />

        {plainExcerpt && (
          <p className="max-w-3xl text-lg leading-relaxed text-gray-600">
            {plainExcerpt}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <span>📅 {formatDate(post.date)}</span>

          {author && (
            <span className="flex items-center gap-2">
              {author.avatar_urls?.["48"] && (
                <img
                  src={author.avatar_urls["48"]}
                  alt={author.name}
                  className="h-6 w-6 rounded-full"
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
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                >
                  {term.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {imageUrl && (
        <div className="mb-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <img
            src={imageUrl}
            alt={stripHtml(post.title.rendered)}
            className="max-h-[520px] w-full object-cover"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_360px]">
        <div className="space-y-8">
          <Card title="Vsebina">
            {hasMainContent ? (
              <div
                className="wp-content prose max-w-none prose-headings:scroll-mt-24"
                dangerouslySetInnerHTML={{
                  __html: post.content?.rendered || "",
                }}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                Za ta vnos ni dodane vsebine.
              </div>
            )}
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

          <SpecificAcfCard type={type} acf={post.acf} />

          <Card title="Navigacija">
            <div className="flex flex-col gap-3">
              <Link
                href={`/cpt/${cpt.slug}`}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700"
              >
                ← Nazaj na {cpt.label}
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
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