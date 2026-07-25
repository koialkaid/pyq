import type { Metadata } from "next";
import { owner as fallbackOwner, type User } from "@/lib/mock-data";
import { getApiUrl } from "@/lib/api-fetch";
import AboutReader from "@/components/AboutReader";
import SpecialPageLayout from "@/components/SpecialPageLayout";

const API_URL = getApiUrl();
export const revalidate = 10;

export const metadata: Metadata = { title: "关于" };

async function getOwner(): Promise<User> {
  try {
    const response = await fetch(`${API_URL}/users/owner`, { next: { revalidate } });
    return response.ok ? await response.json() : fallbackOwner;
  } catch {
    return fallbackOwner;
  }
}

async function getAbout() {
  try {
    const response = await fetch(`${API_URL}/pages/about`, { next: { revalidate } });
    if (!response.ok) return { id: "", content: "", comments: [] };
    return response.json();
  } catch {
    return { id: "", content: "", comments: [] };
  }
}

export default async function AboutPage() {
  const [owner, page] = await Promise.all([getOwner(), getAbout()]);
  return (
    <SpecialPageLayout owner={owner} showToc>
      <AboutReader page={page} />
    </SpecialPageLayout>
  );
}
