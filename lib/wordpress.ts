// lib/wordpress.ts
// Centralni helper za vse WordPress REST API klice

import { WPPost, WPPage, WPMedia, WPApiResponse, WPTerm } from "@/types/wordpress";

// ============================================================
// ⚙️ KONFIGURACIJA — nastavi svojo WP domeno v .env.local:
//    NEXT_PUBLIC_WORDPRESS_URL=https://tvoja-domena.com
// ============================================================
const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://tvoja-domena.com";
const API_BASE = `${WP_URL}/wp-json/wp/v2`;

// Skupne nastavitve za fetch
const fetchOptions: RequestInit = {
  next: { revalidate: 60 }, // ISR: ponovi po 60 sekundah
};

// ============================================================
// 🔧 POMOŽNE FUNKCIJE
// ============================================================

function buildQueryString(
  params: Record<string, string | number | boolean | undefined>
): string {
  return new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {})
  ).toString();
}

async function wpFetch<T>(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<{ data: T; headers: Headers }> {
  const query = buildQueryString(params);
  const url = `${API_BASE}/${endpoint}${query ? `?${query}` : ""}`;

  const res = await fetch(url, fetchOptions);

  if (!res.ok) {
    throw new Error(`WordPress API napaka: ${res.status} ${res.statusText} — ${url}`);
  }

  const data = await res.json();
  return { data, headers: res.headers };
}

// ============================================================
// 📄 CUSTOM POST TYPES
// ============================================================

/**
 * Pridobi seznam postov za katerikoli CPT
 * @param cptSlug - slug CPT-ja (npr. "projekti")
 * @param page - stran za paginacijo
 * @param perPage - število na stran
 */
export async function getCPTPosts(
  cptSlug: string,
  page = 1,
  perPage = 12
): Promise<WPApiResponse<WPPost>> {
  const { data, headers } = await wpFetch<WPPost[]>(cptSlug, {
    _embed: true,
    page,
    per_page: perPage,
    status: "publish",
  });

  return {
    data,
    totalPages: parseInt(headers.get("X-WP-TotalPages") || "1"),
    total: parseInt(headers.get("X-WP-Total") || "0"),
  };
}

/**
 * Pridobi en post po slugu
 */
export async function getCPTPostBySlug(
  cptSlug: string,
  slug: string
): Promise<WPPost | null> {
  if (!cptSlug || !slug) {
    return null;
  }

  const { data } = await wpFetch<WPPost[]>(cptSlug, {
    slug,
    _embed: true,
    status: "publish",
  });

  return data[0] || null;
}

/**
 * Pridobi vse sluge za generateStaticParams()
 */
export async function getAllCPTSlugs(cptSlug: string): Promise<string[]> {
  if (!cptSlug) {
    return [];
  }

  const { data } = await wpFetch<Array<Pick<WPPost, "slug">>>(cptSlug, {
    per_page: 100,
    status: "publish",
    _fields: "slug",
  });

  return data
    .map((post) => post.slug)
    .filter((slug): slug is string => Boolean(slug));
}

// ============================================================
// 📝 BLOG POSTS (standardni WP posts)
// ============================================================

export async function getPosts(page = 1, perPage = 10): Promise<WPApiResponse<WPPost>> {
  const { data, headers } = await wpFetch<WPPost[]>("posts", {
    _embed: true,
    page,
    per_page: perPage,
    status: "publish",
  });

  return {
    data,
    totalPages: parseInt(headers.get("X-WP-TotalPages") || "1"),
    total: parseInt(headers.get("X-WP-Total") || "0"),
  };
}

export async function getPostBySlug(slug: string): Promise<WPPost | null> {
  if (!slug) {
    return null;
  }

  const { data } = await wpFetch<WPPost[]>("posts", {
    slug,
    _embed: true,
    status: "publish",
  });

  return data[0] || null;
}

// ============================================================
// 🗂️ STRANI (pages)
// ============================================================

export async function getPageBySlug(slug: string): Promise<WPPage | null> {
  if (!slug) {
    return null;
  }

  const { data } = await wpFetch<WPPage[]>("pages", {
    slug,
    _embed: true,
    status: "publish",
  });

  return data[0] || null;
}

// ============================================================
// 🏷️ TAKSONOMIJE (kategorije, tagi, custom taksonomije)
// ============================================================

export async function getTerms(taxonomy: string): Promise<WPTerm[]> {
  const { data } = await wpFetch<WPTerm[]>(taxonomy, {
    per_page: 100,
    hide_empty: true,
  });

  return data;
}

export async function getCPTPostsByTerm(
  cptSlug: string,
  taxonomy: string,
  termId: number,
  page = 1,
  perPage = 12
): Promise<WPApiResponse<WPPost>> {
  const { data, headers } = await wpFetch<WPPost[]>(cptSlug, {
    _embed: true,
    [taxonomy]: termId,
    page,
    per_page: perPage,
    status: "publish",
  });

  return {
    data,
    totalPages: parseInt(headers.get("X-WP-TotalPages") || "1"),
    total: parseInt(headers.get("X-WP-Total") || "0"),
  };
}

// ============================================================
// 🖼️ MEDIJI
// ============================================================

export async function getMediaById(id: number): Promise<WPMedia | null> {
  try {
    const { data } = await wpFetch<WPMedia>(`media/${id}`);
    return data;
  } catch {
    return null;
  }
}

// ============================================================
// 🛠️ POMOŽNE FUNKCIJE ZA KOMPONENTE
// ============================================================

/** Pridobi URL slike iz _embedded */
export function getFeaturedImageUrl(
  post: WPPost,
  size: "thumbnail" | "medium" | "large" | "full" = "large"
): string | null {
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  if (!media) return null;

  return media.media_details?.sizes?.[size]?.source_url || media.source_url || null;
}

/** Očisti HTML excerpt */
export function cleanExcerpt(excerpt: string, maxLength = 150): string {
  const clean = excerpt.replace(/<[^>]*>/g, "").trim();
  return clean.length > maxLength ? clean.substring(0, maxLength) + "..." : clean;
}

/** Formatiraj datum v slovenščino */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("sl-SI", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}