"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import ArticleEditor from "@/components/ArticleEditor";
import { apiFetch, getToken } from "@/lib/api-fetch";

export default function AdminAboutPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/pages/about")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("加载失败"))))
      .then((page) => setContent(page.content || ""))
      .catch((error) => alert(error instanceof Error ? error.message : "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const response = await apiFetch("/pages/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "保存失败");
      }
      alert("已保存，前台页面将立即更新");
    } catch (error) {
      alert(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-adm-text-tertiary" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-adm-text">关于</h1>
          <p className="mt-1 text-sm text-adm-text-secondary">编辑前台“关于”页面的正文内容</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存
        </button>
      </div>
      <ArticleEditor value={content} onChange={setContent} token={getToken() || ""} placeholder="开始介绍自己..." />
    </div>
  );
}
