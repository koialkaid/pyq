"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Folder, Layers3, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toAbsoluteUrl } from "@/lib/upload";
import type { Post } from "@/lib/mock-data";

type View = "all" | "categories" | "series";

export default function ArticleDirectory({ articles, defaultCover, activeCategory = "", activeSeries = "", page = 1, totalPages = 1, total = articles.length }: { articles: Post[]; defaultCover?: string; activeCategory?: string; activeSeries?: string; page?: number; totalPages?: number; total?: number }) {
  const [view, setView] = useState<View>(activeSeries ? "series" : activeCategory ? "categories" : "all");
  const categories = useMemo(() => group(articles.filter((a) => a.category), (a) => a.category!), [articles]);
  const series = useMemo(() => group(articles.filter((a) => a.series), (a) => a.series!), [articles]);
  const views: Array<{ value: View; label: string; icon: typeof BookOpen }> = [
    { value: "all", label: "全部", icon: BookOpen },
    { value: "categories", label: "分类", icon: Folder },
    { value: "series", label: "合集", icon: Layers3 },
  ];

  return (
    <div className="px-4 pb-12 pt-4 md:px-6">
      <h1 className="text-[24px] font-medium leading-tight text-wechat-text dark:text-white md:text-[28px]">文章</h1>
      <p className="mt-2 text-sm text-wechat-time">共 {total} 篇，按主题与连续合集整理。</p>
      {(activeCategory || activeSeries) && <div className="mt-3 flex items-center gap-2 text-xs text-wechat-time"><span>当前筛选：{activeCategory || activeSeries}</span><a href="/articles" className="flex items-center gap-0.5 text-wechat-nickname hover:underline"><X className="h-3.5 w-3.5" />清除</a></div>}
      <div className="mt-6 grid grid-cols-3 rounded-lg bg-wechat-bubble p-1 dark:bg-white/5">
        {views.map(({ value, label, icon: Icon }) => (
          <button key={value} type="button" onClick={() => setView(value)} className={`flex h-9 items-center justify-center gap-1.5 rounded-md text-sm transition-colors ${view === value ? "bg-wechat-white font-medium text-wechat-text shadow-sm dark:bg-white/10 dark:text-white" : "text-wechat-time hover:text-wechat-text"}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {view === "all" && <><ArticleList articles={articles} defaultCover={defaultCover} /><Pagination page={page} totalPages={totalPages} category={activeCategory} series={activeSeries} /></>}
      {view === "categories" && <GroupedList groups={categories} empty="还没有设置文章分类" defaultCover={defaultCover} linkParam="category" />}
      {view === "series" && <GroupedList groups={series} empty="还没有创建连续合集" defaultCover={defaultCover} ordered linkParam="series" />}
    </div>
  );
}

function group(items: Post[], key: (item: Post) => string) {
  return items.reduce<Record<string, Post[]>>((result, item) => {
    const name = key(item);
    (result[name] ||= []).push(item);
    return result;
  }, {});
}

function GroupedList({ groups, empty, defaultCover, ordered, linkParam }: { groups: Record<string, Post[]>; empty: string; defaultCover?: string; ordered?: boolean; linkParam: "category" | "series" }) {
  const entries = Object.entries(groups);
  if (!entries.length) return <Empty text={empty} />;
  return <div className="mt-7 space-y-8">{entries.map(([name, items]) => {
    const list = ordered ? [...items].sort((a, b) => (a.seriesOrder || 0) - (b.seriesOrder || 0)) : items;
    return <section key={name}><div className="flex items-end justify-between border-b border-black/[0.06] pb-2 dark:border-white/10"><a href={`/articles?${linkParam}=${encodeURIComponent(name)}`} className="text-[17px] font-semibold text-wechat-text hover:text-wechat-nickname dark:text-white">{name}</a><span className="text-xs text-wechat-time">{items.length} 篇</span></div><ArticleList articles={list} defaultCover={defaultCover} showOrder={ordered} /></section>;
  })}</div>;
}

function ArticleList({ articles, defaultCover, showOrder }: { articles: Post[]; defaultCover?: string; showOrder?: boolean }) {
  if (!articles.length) return <Empty text="还没有文章" />;
  return <div className="mt-3 divide-y divide-black/[0.06] dark:divide-white/10">{articles.map((article, index) => (
    <Link key={article.id} href={`/articles/${article.shortId || article.id}`} className="group flex min-h-20 items-center gap-3 py-3">
      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-wechat-bubble dark:bg-white/5">{(article.cover || defaultCover) && <img src={toAbsoluteUrl(article.cover || defaultCover || "")} alt="" className="h-full w-full object-cover" />}</div>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2">{showOrder && <span className="text-xs tabular-nums text-wechat-nickname">{index + 1}</span>}<h3 className="line-clamp-2 text-[15px] font-medium leading-6 text-wechat-text transition-colors group-hover:text-wechat-nickname dark:text-white">{article.title || "无标题"}</h3></div><div className="mt-1 flex items-center gap-2 text-xs text-wechat-time">{article.category && <span>{article.category}</span>}<time>{new Date(article.createdAt).toLocaleDateString("zh-CN")}</time></div></div>
    </Link>
  ))}</div>;
}

function Empty({ text }: { text: string }) { return <div className="mt-10 border-y border-dashed border-black/10 py-12 text-center text-sm text-wechat-time dark:border-white/10">{text}</div>; }

function Pagination({ page, totalPages, category, series }: { page: number; totalPages: number; category?: string; series?: string }) {
  if (totalPages <= 1) return null;
  const link = (nextPage: number) => {
    const query = new URLSearchParams({ page: String(nextPage) });
    if (category) query.set("category", category);
    if (series) query.set("series", series);
    return `/articles?${query.toString()}`;
  };
  return <nav className="mt-6 flex items-center justify-center gap-3 text-xs text-wechat-time" aria-label="文章分页">
    {page > 1 ? <a href={link(page - 1)} className="flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-wechat-hover hover:text-wechat-text"><ChevronLeft className="h-3.5 w-3.5" />上一页</a> : <span className="flex items-center gap-1 px-2 py-1.5 opacity-40"><ChevronLeft className="h-3.5 w-3.5" />上一页</span>}
    <span>{page} / {totalPages}</span>
    {page < totalPages ? <a href={link(page + 1)} className="flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-wechat-hover hover:text-wechat-text">下一页<ChevronRight className="h-3.5 w-3.5" /></a> : <span className="flex items-center gap-1 px-2 py-1.5 opacity-40">下一页<ChevronRight className="h-3.5 w-3.5" /></span>}
  </nav>;
}
