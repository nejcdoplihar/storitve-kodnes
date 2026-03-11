// types/wordpress.ts

export interface WPPost {
  id: number;
  date: string;
  slug: string;
  status: string;
  type: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  featured_media: number;
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url: string;
      alt_text: string;
      media_details: {
        width: number;
        height: number;
        sizes: Record<string, { source_url: string; width: number; height: number }>;
      };
    }>;
    "wp:term"?: Array<Array<WPTerm>>;
    author?: Array<WPAuthor>;
  };
  acf?: Record<string, unknown>; // Advanced Custom Fields
  meta?: Record<string, unknown>;
  link: string;
}

export interface WPTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
  description: string;
  count: number;
}

export interface WPAuthor {
  id: number;
  name: string;
  slug: string;
  avatar_urls: Record<string, string>;
  description: string;
}

export interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details: {
    width: number;
    height: number;
    sizes: Record<string, { source_url: string; width: number; height: number }>;
  };
}

export interface WPPage {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  featured_media: number;
  _embedded?: WPPost["_embedded"];
  acf?: Record<string, unknown>;
}

export interface WPApiResponse<T> {
  data: T[];
  totalPages: number;
  total: number;
}

// CPT config — DODAJ SVOJE TIPE TUKAJ
export interface CPTConfig {
  slug: string;          // WordPress REST API slug (npr. "projekti")
  label: string;         // Prikazno ime (npr. "Projekti")
  labelSingular: string; // Ednina (npr. "Projekt")
  icon: string;          // Emoji ikona za UI
  color: string;         // Tailwind barva za accent
}

export const CPT_CONFIGS: CPTConfig[] = [
  {
    slug: "narocnik",
    label: "Naročniki",
    labelSingular: "Naročnik",
    icon: "👤",
    color: "blue",
  },
  {
    slug: "ponudba",
    label: "Ponudbe",
    labelSingular: "Ponudba",
    icon: "📋",
    color: "green",
  },
  {
    slug: "stranka",
    label: "Stranke",
    labelSingular: "Stranka",
    icon: "🏢",
    color: "orange",
  },
];
