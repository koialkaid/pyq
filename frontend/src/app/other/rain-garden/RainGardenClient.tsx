"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Pause, Play, RotateCcw } from "lucide-react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./rain-garden.module.css";

gsap.registerPlugin(useGSAP);

const RainGardenScene = dynamic(() => import("./RainGardenScene"), {
  ssr: false,
  loading: () => <div className={styles.loading} aria-label="雨庭正在加载"><span /></div>,
});

const STORAGE_KEY = "koi-rain-garden-elapsed";

function formatElapsed(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export default function RainGardenClient() {
  const rootRef = useRef<HTMLElement>(null);
  const startedAtRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY));
    const restoreTimer = window.setTimeout(() => {
      if (!Number.isFinite(saved) || saved <= 0) return;
      accumulatedRef.current = saved;
      setElapsed(saved);
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!running) return;

    const update = () => {
      if (startedAtRef.current === null) return;
      const nextElapsed = accumulatedRef.current + performance.now() - startedAtRef.current;
      setElapsed(nextElapsed);
    };

    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    const persist = () => {
      const current = startedAtRef.current === null
        ? accumulatedRef.current
        : accumulatedRef.current + performance.now() - startedAtRef.current;
      window.localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.floor(current))));
    };

    window.addEventListener("pagehide", persist);
    return () => window.removeEventListener("pagehide", persist);
  }, []);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        `.${styles.reveal}`,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12, ease: "power3.out" },
      );
    });
    media.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(`.${styles.reveal}`, { autoAlpha: 1 });
    });
    return () => media.revert();
  }, { scope: rootRef });

  const toggleTimer = () => {
    if (running) {
      if (startedAtRef.current !== null) {
        accumulatedRef.current += performance.now() - startedAtRef.current;
      }
      startedAtRef.current = null;
      setElapsed(accumulatedRef.current);
      window.localStorage.setItem(STORAGE_KEY, String(Math.floor(accumulatedRef.current)));
      setRunning(false);
      return;
    }

    startedAtRef.current = performance.now();
    setRunning(true);
  };

  const resetTimer = () => {
    startedAtRef.current = null;
    accumulatedRef.current = 0;
    setElapsed(0);
    setRunning(false);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <main ref={rootRef} className={styles.page}>
      <div className={styles.scene}>
        <RainGardenScene running={running} />
      </div>
      <div className={styles.vignette} aria-hidden="true" />

      <header className={`${styles.heading} ${styles.reveal}`}>
        <p>OTHER / RAIN GARDEN</p>
        <h1>雨庭</h1>
        <span>细雨 · 水温 18°</span>
      </header>

      <div className={`${styles.stage} ${styles.reveal}`} aria-label="锦鲤成长阶段">
        <span>初见</span>
        <i />
        <small>第一阶段</small>
      </div>

      <section className={styles.timer} aria-label="相伴计时器">
        <span className={styles.timerLabel}>{running ? "正在相伴" : "相伴时间"}</span>
        <strong aria-live="polite">{formatElapsed(elapsed)}</strong>
        <div className={styles.timerActions}>
          <button type="button" className={styles.primaryAction} onClick={toggleTimer}>
            {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            <span>{running ? "暂停" : elapsed > 0 ? "继续" : "开始"}</span>
          </button>
          <button type="button" className={styles.iconAction} onClick={resetTimer} aria-label="重置计时" title="重置计时">
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
      </section>

      <footer className={`${styles.footer} ${styles.reveal}`}>
        <span>KOI · 01</span>
        <span>雨量 4.2 mm/h</span>
      </footer>
    </main>
  );
}
