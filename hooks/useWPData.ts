"use client";
// hooks/useWPData.ts
// React hook-i za pridobivanje podatkov iz WordPress REST API

import { useState, useEffect, useCallback } from "react";
import { WP_URL } from "@/lib/constants";
import type { Post, Stranka } from "@/types/admin";

// ============================================================
// useWPData — paginiran seznam postov
// ============================================================
export function useWPData(cptSlug: string, page = 1, perPage = 20) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    if (!WP_URL) {
      setError("NEXT_PUBLIC_WORDPRESS_URL ni nastavljen.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/${cptSlug}?per_page=${perPage}&page=${page}&_embed=1`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      const wpTotal = Number(res.headers.get("X-WP-Total") || 0);
      const wpTotalPages = Number(res.headers.get("X-WP-TotalPages") || 1);
      setPosts(Array.isArray(data) ? data : []);
      setTotal(wpTotal);
      setTotalPages(wpTotalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Napaka pri nalaganju podatkov.");
    } finally {
      setLoading(false);
    }
  }, [cptSlug, page, perPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { posts, loading, error, total, totalPages, refetch: fetchData };
}

// ============================================================
// useAllWPData — pridobi vse strani (za iskanje)
// ============================================================
export function useAllWPData(cptSlug: string, enabled: boolean) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!WP_URL || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const baseUrl = `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/${cptSlug}`;
      let currentPage = 1;
      let totalPages = 1;
      let allPosts: Post[] = [];
      do {
        const res = await fetch(
          `${baseUrl}?per_page=100&page=${currentPage}&_embed=1`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        totalPages = Number(res.headers.get("X-WP-TotalPages") || 1);
        if (Array.isArray(data)) {
          allPosts = [...allPosts, ...data];
        }
        currentPage++;
      } while (currentPage <= totalPages);
      setPosts(allPosts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Napaka pri nalaganju podatkov.");
    } finally {
      setLoading(false);
    }
  }, [cptSlug, enabled]);

  useEffect(() => {
    if (enabled) {
      fetchData();
    } else {
      setPosts([]);
      setLoading(false);
      setError(null);
    }
  }, [enabled, fetchData]);

  return { posts, loading, error, refetch: fetchData };
}

// ============================================================
// useStranke — pridobi vse stranke z vsemi podatki
// ============================================================
export function useStranke() {
  const [stranke, setStranke] = useState<Stranka[]>([]);
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
      const baseUrl = `${WP_URL.replace(/\/$/, "")}/wp-json/wp/v2/stranka`;
      let currentPage = 1;
      let totalPages = 1;
      let allStranke: Stranka[] = [];
      do {
        const res = await fetch(
          `${baseUrl}?per_page=100&page=${currentPage}&_embed=true&status=publish`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        totalPages = Number(res.headers.get("X-WP-TotalPages") || 1);
        if (Array.isArray(data)) {
          allStranke = [...allStranke, ...data];
        }
        currentPage++;
      } while (currentPage <= totalPages);
      setStranke(allStranke);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Napaka");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { stranke, loading, error, refetch: fetchData };
}
