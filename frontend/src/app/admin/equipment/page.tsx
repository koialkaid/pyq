import type { Metadata } from "next";
import CatalogManager from "@/components/admin/CatalogManager";

export const metadata: Metadata = { title: "装备 - 管理后台" };

export default function AdminEquipmentPage() {
  return <CatalogManager collection="equipment" title="装备" description="管理前台装备页的分类与卡片。" />;
}
