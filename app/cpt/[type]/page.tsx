// app/cpt/[type]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCPTPosts, cleanExcerpt, formatDate, getFeaturedImageUrl } from "@/lib/wordpress";
import { CPT_CONFIGS } from "@/types/wordpress";

interface Props {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  return CPT_CONFIGS.map((cpt) => ({ type: cpt.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { type } = await params;
  const cpt = CPT_CONFIGS.find((c) => c.slug === type);
  if (!cpt) return { title: "Ni najdeno" };
  return { title: cpt.label };
}

export default async function CPTListPage({ params, searchParams }: Props) {
  const { type } = await params;
  const { page } = await searchParams;

  const cpt = CPT_CONFIGS.find((c) => c.slug === type);
  if (!cpt) notFound();

  const currentPage = parseInt(page || "1");

  let posts: Awaited<ReturnType<typeof getCPTPosts>>["data"] = [];
  let totalPages = 1;
  let total = 0;
  let error: string | null = null;

  try {
    const result = await getCPTPosts(cpt.slug, currentPage, 12);
    posts = result.data;
    totalPages = result.totalPages;
    total = result.total;
  } catch (e) {
    error = `Napaka pri nalaganju: ${e instanceof Error ? e.message : "Neznana napaka"}`;
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/" className="hover:text-blue-600 transition-colors">Domov</Link>
          <span>›</span>
          <span>{cpt.label}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <span>{cpt.icon}</span>
          {cpt.label}
          {total > 0 && <span className="text-lg font-normal text-gray-500">({total})</span>}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-red-800 mb-2">⚠️ Napaka API</h3>
          <p className="text-red-700 text-sm font-mono">{error}</p>
          <p className="text-red-600 text-sm mt-2">
            Preveri <code className="bg-red-100 px-1 rounded">NEXT_PUBLIC_WORDPRESS_URL</code> v{" "}
            <code className="bg-red-100 px-1 rounded">.env.local</code> in da je CPT slug{" "}
            <code className="bg-red-100 px-1 rounded">{cpt.slug}</code> pravilen.
          </p>
        </div>
      )}

      {!error && posts.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">{cpt.icon}</div>
          <p className="text-lg">Ni objav za <strong>{cpt.label}</strong></p>
        </div>
      )}

      {posts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => {
            const imageUrl = getFeaturedImageUrl(post, "medium");
            const excerpt = cleanExcerpt(post.excerpt?.rendered || "");
            return (
              <Link key={post.id} href={`/cpt/${cpt.slug}/${post.slug}`}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-200"
              >
                {imageUrl ? (
                  <div className="aspect-video overflow-hidden bg-gray-100">
                    <img src={imageUrl} alt={post.title.rendered} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-4xl">{cpt.icon}</div>
                )}
                <div className="p-5">
                  <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2" dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
                  {excerpt && <p className="text-sm text-gray-500 line-clamp-3">{excerpt}</p>}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{formatDate(post.date)}</span>
                    <span className="text-xs text-blue-600 font-medium group-hover:underline">Preberi →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}