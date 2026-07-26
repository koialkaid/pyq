"use client";

import { Cloud, ExternalLink, ShieldCheck } from "lucide-react";

export default function AdminStorage() {
  const provider = process.env.NEXT_PUBLIC_STORAGE_PROVIDER === "r2" ? "Cloudflare R2" : "Supabase Storage";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-adm-text">云端媒体存储</h2>
        <p className="mt-1 text-sm text-adm-text-secondary">当前提供商：{provider}</p>
      </div>

      <section className="rounded-xl border border-adm-border bg-adm-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-adm-text">{provider}</h3>
            <p className="mt-1 text-sm leading-6 text-adm-text-secondary">
              存储密钥仅保存在后端 Vercel 环境变量中，不会写入网站数据库或发送到浏览器。
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-adm-input p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium text-adm-text">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            后端环境变量
          </p>
          <code className="mt-3 block whitespace-pre-wrap text-xs leading-6 text-adm-text-secondary">
{`STORAGE_PROVIDER

Supabase:
SUPABASE_URL
SUPABASE_SECRET_KEY
SUPABASE_BUCKET
SUPABASE_PUBLIC_URL

Cloudflare R2:
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_PUBLIC_URL`}
          </code>
        </div>

        <p className="mt-4 text-xs leading-5 text-adm-text-tertiary">
          浏览器只获得短期签名上传地址。切换提供商后，需要同步更新后端变量、媒体公开地址和前端构建变量。
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <a href="https://supabase.com/docs/guides/storage" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-adm-primary hover:underline">
            Supabase Storage 文档 <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a href="https://developers.cloudflare.com/r2/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-adm-primary hover:underline">
            Cloudflare R2 文档 <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}
