import type { Metadata } from "next";
import SpecialPageLayout from "@/components/SpecialPageLayout";
import ArticleDirectory from "@/components/ArticleDirectory";
import { getApiUrl } from "@/lib/api-fetch";
import { owner as fallbackOwner, type Post, type User } from "@/lib/mock-data";

const API_URL = getApiUrl();
export const revalidate = 10;
export const metadata: Metadata = { title: "文章" };

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ page?: string; category?: string; series?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const category = String(params.category || "").trim();
  const series = String(params.series || "").trim();
  const query = new URLSearchParams({ type: "article", page: String(page), limit: "20" });
  if (category) query.set("category", category);
  if (series) query.set("series", series);
  const [owner, postsResponse, settingsResponse] = await Promise.all([
    fetch(`${API_URL}/users/owner`, { next: { revalidate: 10 } }).then((r) => r.ok ? r.json() : fallbackOwner).catch(() => fallbackOwner) as Promise<User>,
    fetch(`${API_URL}/posts?${query.toString()}`, { next: { revalidate: 10 } }).then((r) => r.ok ? r.json() : { data: [], pagination: {} }).catch(() => ({ data: [], pagination: {} })),
    fetch(`${API_URL}/settings`, { next: { revalidate: 10 } }).then((r) => r.ok ? r.json() : null).catch(() => null),
  ]);
  return <SpecialPageLayout owner={owner}><ArticleDirectory articles={(postsResponse.data || []) as Post[]} defaultCover={settingsResponse?.defaultCover || ""} activeCategory={category} activeSeries={series} page={postsResponse.pagination?.page || page} totalPages={postsResponse.pagination?.totalPages || 1} total={postsResponse.pagination?.total || (postsResponse.data || []).length} /></SpecialPageLayout>;
}
