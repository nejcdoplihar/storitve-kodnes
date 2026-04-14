"use client";
// hooks/useOpravila.ts
// React hook za pridobivanje opravil iz WordPress

import { useState, useEffect } from "react";
import { WP_URL } from "@/lib/constants";
import type { Opravilo } from "@/types/admin";

export function useOpravila(strankaId?: number) {
  const [opravila, setOpravila] = useState<Opravilo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!WP_URL) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/opravilo?per_page=100&_embed=1&acf_format=standard`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      let data: Opravilo[] = await res.json();

      if (strankaId) {
        data = data.filter((o) => {
          const rel = o.acf?.stranka_rel;
          if (!rel) return false;
          if (Array.isArray(rel)) return rel.some((r) => Number(r) === strankaId);
          return false;
        });
      }

    data.sort((a, b) => {
      const parseDate = (d: string) => {
        if (!d) return 0;
        if (/^\d{8}$/.test(d)) return parseInt(d);
        const parts = d.split(/[\/\.]/);
        if (parts.length === 3) return parseInt(`${parts[2]}${parts[1].padStart(2,"0")}${parts[0].padStart(2,"0")}`);
        return 0;
      };
      return parseDate(b.acf?.datum_opravila || "") - parseDate(a.acf?.datum_opravila || "");
    });
      setOpravila(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Napaka pri nalaganju opravil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [strankaId]);

  return { opravila, loading, error, refetch: fetchData };
}
