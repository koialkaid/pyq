"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { markManualOverride } from "@/lib/dark-mode-override";

export default function FloatingActions({ liftAboveBottomBar = false }: { liftAboveBottomBar?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme || theme) === "dark";
  const btnClass = "misc-btn flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-white/70 text-black backdrop-blur-md shadow-sm transition-colors hover:bg-white/90 active:scale-90 dark:border-white/10 dark:bg-white/15 dark:text-white dark:hover:bg-white/25";
  return <div id="misc" className={`fixed right-3 z-40 flex translate-y-0 flex-col items-center gap-2 opacity-100 md:right-6 ${liftAboveBottomBar ? "bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]" : "bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]"}`}>
    <button type="button" id="btn-appearance" onClick={() => { markManualOverride(); setTheme(isDark ? "light" : "dark"); }} className={btnClass} aria-label={isDark ? "切换到白天模式" : "切换到夜间模式"} title={isDark ? "白天模式" : "夜间模式"}>
      {isDark ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" /></svg> : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z" /></svg>}
    </button>
    <button type="button" id="btn-totop" onClick={() => { const root = document.getElementById("scroll-root"); if (root && root.scrollTop > 0) root.scrollTo({ top: 0, behavior: "smooth" }); else window.scrollTo({ top: 0, behavior: "smooth" }); }} className={btnClass} aria-label="回到顶部" title="回到顶部">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M18 11l-6-6-6 6" /></svg>
    </button>
  </div>;
}
