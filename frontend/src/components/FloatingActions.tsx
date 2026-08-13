"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { ArrowUp, Moon, Sun } from "lucide-react";
import { markManualOverride } from "@/lib/dark-mode-override";

export default function FloatingActions({ liftAboveBottomBar = false }: { liftAboveBottomBar?: boolean }) {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isDark = mounted && (resolvedTheme || theme) === "dark";
  const btnClass = "misc-btn rain-controls-trigger";
  return <div id="misc" className={`fixed right-3 z-40 flex translate-y-0 flex-col items-center gap-2 opacity-100 md:right-6 ${liftAboveBottomBar ? "bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]" : "bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]"}`}>
    <button type="button" id="btn-appearance" onClick={() => { markManualOverride(); setTheme(isDark ? "light" : "dark"); }} className={btnClass} aria-label={isDark ? "切换到白天模式" : "切换到夜间模式"} title={isDark ? "白天模式" : "夜间模式"}>
      {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
    </button>
    <button type="button" id="btn-totop" onClick={() => { const root = document.getElementById("scroll-root"); if (root && root.scrollTop > 0) root.scrollTo({ top: 0, behavior: "smooth" }); else window.scrollTo({ top: 0, behavior: "smooth" }); }} className={btnClass} aria-label="回到顶部" title="回到顶部">
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  </div>;
}
