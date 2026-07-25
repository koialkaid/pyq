import type { Metadata } from "next";
import CatalogPage, { type CatalogCategory } from "@/components/CatalogPage";
import { getApiUrl } from "@/lib/api-fetch";
import { owner as fallbackOwner, type User } from "@/lib/mock-data";

const API_URL = getApiUrl();
export const revalidate = 10;
export const metadata: Metadata = { title: "Labs" };

async function getOwner(): Promise<User> {
  try {
    const response = await fetch(`${API_URL}/users/owner`, { next: { revalidate } });
    return response.ok ? await response.json() : fallbackOwner;
  } catch {
    return fallbackOwner;
  }
}

async function getCatalog(): Promise<CatalogCategory[]> {
  try {
    const response = await fetch(`${API_URL}/catalog/labs`, { next: { revalidate } });
    return response.ok ? (await response.json()).categories || [] : [];
  } catch {
    return [];
  }
}

export default async function LabsPage() {
  const [owner, categories] = await Promise.all([getOwner(), getCatalog()]);
  return <CatalogPage owner={owner} title="Labs" description="这里收录正在尝试、研究与制作的小项目。" categories={categories} />;
}
