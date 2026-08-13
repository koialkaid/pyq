"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Layers3, List } from "lucide-react";

interface Heading {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
}

interface SeriesArticle {
  id: string;
  shortId?: string;
  title?: string;
  seriesOrder?: number;
}

interface ArticleTOCProps {
  hideWhenEmpty?: boolean;
  series?: string;
  currentArticleId?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function ArticleTOC({ hideWhenEmpty = false, series, currentArticleId }: ArticleTOCProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [headingsReady, setHeadingsReady] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [seriesArticles, setSeriesArticles] = useState<SeriesArticle[]>([]);
  const [seriesLoaded, setSeriesLoaded] = useState(false);
  const [mode, setMode] = useState<"chapters" | "series">("chapters");
  const modeSelectedByUser = useRef(false);
  const currentSeriesItemRef = useRef<HTMLAnchorElement>(null);

  const extractHeadings = useCallback(() => {
    const articleContent = document.querySelector(".article-content");
    if (!articleContent) return;
    const els = Array.from(articleContent.querySelectorAll("h2, h3")) as HTMLElement[];
    const items = els.map((el, i) => {
      const text = el.textContent?.trim() || "";
      if (!el.id) el.id = `article-heading-${i}`;
      return { id: el.id, text, level: el.tagName === "H2" ? 2 : 3, element: el };
    });
    setHeadings(items.filter((item) => item.text.length > 0));
    setHeadingsReady(true);
  }, []);

  useEffect(() => {
    setHeadingsReady(false);
    let stableChecks = 0;
    let previousMarkup = "";
    const timer = window.setInterval(() => {
      const articleContent = document.querySelector(".article-content");
      if (!articleContent) return;
      const markup = articleContent.innerHTML;
      stableChecks = markup === previousMarkup ? stableChecks + 1 : 0;
      previousMarkup = markup;
      if (stableChecks >= 3) {
        window.clearInterval(timer);
        extractHeadings();
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [extractHeadings]);

  useEffect(() => {
    if (!series) {
      setSeriesArticles([]);
      setSeriesLoaded(false);
      setHeadingsReady(false);
      modeSelectedByUser.current = false;
      setMode("chapters");
      return;
    }
    modeSelectedByUser.current = false;
    setMode("chapters");
    setSeriesLoaded(false);
    fetch(`${API_URL}/posts?type=article&series=${encodeURIComponent(series)}&page=1&limit=50`)
      .then((res) => res.ok ? res.json() : { data: [] })
      .then((data) => {
        const items = [...(data.data || [])].sort((a: SeriesArticle, b: SeriesArticle) => (a.seriesOrder || 0) - (b.seriesOrder || 0));
        setSeriesArticles(items);
        setSeriesLoaded(true);
      })
      .catch(() => {
        setSeriesArticles([]);
        setSeriesLoaded(true);
      });
  }, [series]);

  useEffect(() => {
    if (headingsReady && headings.length === 0 && seriesArticles.length > 0 && !modeSelectedByUser.current) {
      setMode("series");
    }
  }, [headings, headingsReady, seriesArticles]);

  useEffect(() => {
    if (!seriesArticles.length || mode !== "series") return;
    currentSeriesItemRef.current?.scrollIntoView({ block: "nearest" });
  }, [seriesArticles, mode]);

  const resolveHeadingElement = useCallback((heading: Heading): HTMLElement | null => {
    if (heading.element?.isConnected) return heading.element;
    return document.getElementById(heading.id) || null;
  }, []);

  useEffect(() => {
    if (!headings.length) return;
    const scrollRoot = document.getElementById("scroll-root");
    if (!scrollRoot) return;
    const onScroll = () => {
      const rect = scrollRoot.getBoundingClientRect();
      let current = "";
      for (const heading of headings) {
        const element = resolveHeadingElement(heading);
        if (element && element.getBoundingClientRect().top - rect.top <= 100) current = heading.id;
      }
      setActiveId(current);
    };
    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => scrollRoot.removeEventListener("scroll", onScroll);
  }, [headings, resolveHeadingElement]);

  const handleHeadingClick = (event: React.MouseEvent, heading: Heading) => {
    event.preventDefault();
    const scrollRoot = document.getElementById("scroll-root");
    const target = resolveHeadingElement(heading);
    if (!scrollRoot || !target) return;
    const scrollRect = scrollRoot.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    scrollRoot.scrollTo({ top: Math.max(0, scrollRoot.scrollTop + targetRect.top - scrollRect.top - 84), behavior: "smooth" });
    setActiveId(heading.id);
  };

  const showSeries = seriesArticles.length > 0;
  const showSeriesTab = Boolean(series);
  if (!headings.length && !showSeriesTab && hideWhenEmpty) return null;

  return (
    <aside className="hidden lg:block lg:fixed lg:top-[76px] lg:right-[calc(50%+324px)] lg:w-[220px] xl:w-[260px]">
      <div className="no-scrollbar max-h-[calc(100vh-100px)] overflow-y-auto overscroll-contain rounded-2xl bg-wechat-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)]">
        {showSeriesTab && (
          <div className="sticky top-0 z-10 grid grid-cols-2 gap-1 border-b border-black/[0.06] bg-wechat-white p-2 dark:border-white/10 dark:bg-wechat-white">
            <button type="button" onClick={() => { modeSelectedByUser.current = true; setMode("chapters"); }} className={`flex h-8 items-center justify-center gap-1 rounded-md text-xs transition-colors ${mode === "chapters" ? "bg-wechat-nickname/10 font-medium text-wechat-nickname" : "text-wechat-time hover:bg-wechat-hover"}`}><BookOpen className="h-3.5 w-3.5" />章节</button>
            <button type="button" onClick={() => { modeSelectedByUser.current = true; setMode("series"); }} className={`flex h-8 items-center justify-center gap-1 rounded-md text-xs transition-colors ${mode === "series" ? "bg-wechat-nickname/10 font-medium text-wechat-nickname" : "text-wechat-time hover:bg-wechat-hover"}`}><Layers3 className="h-3.5 w-3.5" />合集</button>
          </div>
        )}

        {mode === "chapters" && (
          <div className="p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-wechat-text"><List className="h-4 w-4 text-wechat-nickname" />章节目录</h3>
            {headings.length ? <nav className="space-y-0.5">{headings.map((heading) => <a key={heading.id} href={`#${heading.id}`} onClick={(event) => handleHeadingClick(event, heading)} className={`block rounded-md px-2 py-1.5 text-[13px] leading-snug transition-colors ${heading.level === 3 ? "ml-3" : ""} ${activeId === heading.id ? "bg-wechat-nickname/10 font-medium text-wechat-nickname" : "text-wechat-time hover:bg-wechat-hover hover:text-wechat-text"}`}><span className="line-clamp-2">{heading.text}</span></a>)}</nav> : <p className="py-4 text-center text-xs text-wechat-time">暂无标题</p>}
          </div>
        )}

        {mode === "series" && (
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2"><h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-wechat-text"><Layers3 className="h-4 w-4 shrink-0 text-wechat-nickname" /><span className="truncate">{series}</span></h3>{seriesLoaded && <span className="shrink-0 text-[11px] text-wechat-time">{seriesArticles.length} 篇</span>}</div>
            {!seriesLoaded ? <p className="py-4 text-center text-xs text-wechat-time">加载中...</p> : showSeries ? <nav className="space-y-0.5">{seriesArticles.map((article, index) => {
              const active = article.id === currentArticleId;
              return <Link key={article.id} ref={active ? currentSeriesItemRef : undefined} href={`/articles/${article.shortId || article.id}`} className={`flex items-start gap-1.5 rounded-md px-2 py-1.5 text-[13px] leading-snug transition-colors ${active ? "bg-wechat-nickname/10 font-medium text-wechat-nickname" : "text-wechat-time hover:bg-wechat-hover hover:text-wechat-text"}`}><span className="w-4 shrink-0 text-right text-[11px] tabular-nums">{index + 1}</span><span className="line-clamp-2 min-w-0 flex-1">{article.title || "无标题"}</span>{active && <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />}</Link>;
            })}</nav> : <p className="py-4 text-center text-xs text-wechat-time">暂无合集文章</p>}
          </div>
        )}
      </div>
    </aside>
  );
}
