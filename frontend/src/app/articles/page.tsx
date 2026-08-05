import type { Metadata } from "next";
import SpecialPageLayout from "@/components/SpecialPageLayout";
import ArticleDirectory from "@/components/ArticleDirectory";
import { getApiUrl } from "@/lib/api-fetch";
import { owner as fallbackOwner, type Post, type User } from "@/lib/mock-data";

const API_URL = getApiUrl();
export const revalidate = 10;
export const metadata: Metadata = { title: "文章" };

export default async function ArticlesPage() {
  const [owner, postsResponse, settingsResponse] = await Promise.all([
    fetch(`${API_URL}/users/owner`, { next: { revalidate: 10 } }).then((r) => r.ok ? r.json() : fallbackOwner).catch(() => fallbackOwner) as Promise<User>,
    fetch(`${API_URL}/posts?type=article&page=1&limit=50`, { next: { revalidate: 10 } }).then((r) => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
    fetch(`${API_URL}/settings`, { next: { revalidate: 10 } }).then((r) => r.ok ? r.json() : null).catch(() => null),
  ]);
  return <SpecialPageLayout owner={owner}><ArticleDirectory articles={(postsResponse.data || []) as Post[]} defaultCover={settingsResponse?.defaultCover || ""} /></SpecialPageLayout>;
}
