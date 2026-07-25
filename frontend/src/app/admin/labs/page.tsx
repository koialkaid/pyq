import type { Metadata } from "next";
import CatalogManager from "@/components/admin/CatalogManager";

export const metadata: Metadata = { title: "Labs - 管理后台" };

export default function AdminLabsPage() {
  return <CatalogManager collection="labs" title="Labs" description="管理前台 Labs 页的分类与卡片。" />;
}
