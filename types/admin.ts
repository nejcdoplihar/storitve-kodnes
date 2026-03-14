// types/admin.ts
// Skupni tipi za admin vmesnik

export type Post = {
  id: number;
  title: { rendered: string };
  date: string;
  status: string;
  slug: string;
  acf?: Record<string, unknown>;
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url: string }>;
  };
};

export type StrankaACF = {
  stanje_storitve: boolean;
  storitve: string | string[];
  domena_url: string;
  potek_storitev: string; // "20260311" YYYYMMDD
  strosek: number;
  strosek_obracun: string[];
  opombe: string;
};

export type Stranka = Post & {
  acf: StrankaACF;
  featured_media: number;
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url: string }>;
  };
};

export type Opravilo = {
  id: number;
  slug: string;
  title: { rendered: string };
  acf: {
    datum_opravila: string;
    uporabnik: string;
    naslov_opravila: string;
    opis_opravila: string;
    cas_ure: number;
    custom_postavka: boolean;
    urna_postavka: number;
    stranka_rel: Array<{ ID: number; post_title: string; post_name: string }>;
    placano: boolean;
  };
};

export type ActiveView =
  | "dashboard"
  | "narocnik"
  | "ponudba"
  | "stranka"
  | "statistika"
  | "finance"
  | "opravila"
  | "profil";
