"use client";
// components/admin/DataTable.tsx
// Generična tabela za prikaz CPT postov z iskanjem in paginacijo

import { useState, useMemo, useEffect } from "react";
import { useWPData, useAllWPData } from "@/hooks/useWPData";
import { formatDate, getAcfPreview } from "@/lib/helpers";
import { BRAND } from "@/lib/constants";
import { icons } from "./Icons";
import { StatusBadge, ConfirmDeleteDialog } from "./UI";

const DELETABLE = ["narocnik", "stranka", "ponudba"];

export function DataTable({
  cptSlug,
  onAdd,
}: {
  cptSlug: string;
  onAdd?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; naziv: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { posts, loading, error, total, totalPages, refetch } = useWPData(cptSlug, page, perPage);
  const isSearching = search.trim().length > 0;
  const { posts: allPosts, loading: allLoading, error: allError, refetch: refetchAll } =
    useAllWPData(cptSlug, isSearching);

  const effectiveLoading = isSearching ? allLoading : loading;
  const effectiveError = isSearching ? allError : error;

  useEffect(() => {
    setPage(1);
  }, [cptSlug, search]);

  const filtered = useMemo(() => {
    const source = isSearching ? allPosts : posts;
    const q = search.trim().toLowerCase();
    if (!q) return source;
    return source.filter((p) => {
      const title = p.title.rendered.toLowerCase();
      const acfText = p.acf ? JSON.stringify(p.acf).toLowerCase() : "";
      return title.includes(q) || acfText.includes(q);
    });
  }, [isSearching, allPosts, posts, search]);

  const handleRefresh = async () => {
    if (isSearching) {
      await refetchAll();
    } else {
      await refetch();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id, cptSlug, title: deleteTarget.naziv }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Napaka pri brisanju");
        return;
      }
      setDeleteTarget(null);
      if (isSearching) {
        await refetchAll();
      } else {
        await refetch();
      }
    } finally {
      setDeleting(false);
    }
  };

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = total === 0 ? 0 : Math.min(page * perPage, total);

  return (
    <>
      {deleteTarget && (
        <ConfirmDeleteDialog
          naziv={deleteTarget.naziv}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #f0f0f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #f5f5f5",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ color: "#aaa" }}>{icons.search}</div>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Iskanje..."
            style={{
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "#333",
              background: "transparent",
              flex: 1,
            }}
          />
          <span style={{ fontSize: 12, color: "#aaa" }}>
            {search.trim()
              ? `${filtered.length} rezultatov`
              : `Prikaz ${from}–${to} od ${total} zapisov`}
          </span>
          <button
            onClick={handleRefresh}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#aaa",
              display: "flex",
              alignItems: "center",
            }}
            title="Osveži"
          >
            {icons.refresh}
          </button>
          {onAdd && (
            <button
              onClick={onAdd}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "none",
                background: BRAND,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                whiteSpace: "nowrap",
              }}
            >
              + Dodaj
            </button>
          )}
        </div>

        {/* Error */}
        {effectiveError && (
          <div style={{ padding: 20, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>
            ⚠️ Napaka: {effectiveError}
          </div>
        )}

        {/* Loading */}
        {effectiveLoading && (
          <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>
            Nalaganje iz WordPressa...
          </div>
        )}

        {/* Table */}
        {!effectiveLoading && !effectiveError && filtered.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["Naslov", "Datum", "Status", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "11px 20px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#888",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((post, i) => {
                const acfPreview = getAcfPreview(post.acf);
                return (
                  <tr
                    key={post.id}
                    style={{
                      borderBottom: i < filtered.length - 1 ? "1px solid #f7f7f7" : "none",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "14px 20px" }}>
                      <div
                        style={{ fontWeight: 600, fontSize: 14, color: "#111" }}
                        dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                      />
                      {acfPreview.length > 0 && (
                        <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                          {acfPreview.map(([key, val]) => (
                            <span key={key} style={{ fontSize: 11, color: "#888" }}>
                              <span style={{ color: "#bbb" }}>{key}: </span>
                              {String(val)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "#666" }}>
                      {formatDate(post.date)}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <StatusBadge status={post.status} />
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <a
                          href={`/cpt/${cptSlug}/${post.slug}`}
                          style={{
                            fontSize: 13,
                            color: BRAND,
                            fontWeight: 500,
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          Odpri {icons.arrow}
                        </a>
                        {DELETABLE.includes(cptSlug) && (
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                id: post.id,
                                naziv: post.title.rendered.replace(/<[^>]*>/g, ""),
                              })
                            }
                            title="Premakni v koš"
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              color: "#d1d5db",
                              padding: 4,
                              borderRadius: 6,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#d1d5db")}
                          >
                            {icons.trash}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Empty state */}
        {!effectiveLoading && !effectiveError && filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 14 }}>
            {search ? `Ni rezultatov za "${search}"` : "Ni zapisov"}
          </div>
        )}

        {/* Pagination */}
        {!effectiveLoading && !effectiveError && !search.trim() && totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              borderTop: "1px solid #f0f0f0",
              background: "#fff",
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: page === 1 ? "#f9fafb" : "#fff",
                color: page === 1 ? "#9ca3af" : "#374151",
                cursor: page === 1 ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              ← Prejšnja
            </button>
            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const isActive = p === page;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      minWidth: 34,
                      height: 34,
                      padding: "0 10px",
                      borderRadius: 8,
                      border: isActive ? `1px solid ${BRAND}` : "1px solid #e5e7eb",
                      background: isActive ? BRAND : "#fff",
                      color: isActive ? "#fff" : "#374151",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: page === totalPages ? "#f9fafb" : "#fff",
                color: page === totalPages ? "#9ca3af" : "#374151",
                cursor: page === totalPages ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Naslednja →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
