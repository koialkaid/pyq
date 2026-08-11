"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Droplets, RotateCcw, X } from "lucide-react";
import { gsap } from "gsap";

const OPACITY_KEY = "koi_blog_card_opacity";
const RAIN_KEY = "koi_blog_rain_enabled";

interface RainDrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  wind: number;
  impactY: number;
  opacity: number;
}

interface Ripple {
  x: number;
  y: number;
  age: number;
  duration: number;
  radius: number;
}

interface Splash {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  duration: number;
}

function resetDrop(drop: RainDrop, width: number, height: number, initial = false) {
  drop.x = Math.random() * width;
  drop.y = initial ? Math.random() * height : -40 - Math.random() * height * 0.2;
  drop.length = 12 + Math.random() * 24;
  drop.speed = 520 + Math.random() * 520;
  drop.wind = 40 + Math.random() * 70;
  drop.impactY = height * (0.46 + Math.random() * 0.52);
  drop.opacity = 0.2 + Math.random() * 0.34;
}

function createBackdrop(width: number, height: number, dark: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  const gradient = context.createLinearGradient(0, 0, 0, height);
  if (dark) {
    gradient.addColorStop(0, "#111417");
    gradient.addColorStop(0.56, "#252a2d");
    gradient.addColorStop(1, "#090b0d");
  } else {
    gradient.addColorStop(0, "#d9dcde");
    gradient.addColorStop(0.52, "#aeb4b7");
    gradient.addColorStop(1, "#6f7578");
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  for (let i = 0; i < 18; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.max(width, height) * (0.08 + Math.random() * 0.2);
    const haze = context.createRadialGradient(x, y, 0, x, y, radius);
    haze.addColorStop(0, dark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.15)");
    haze.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = haze;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  context.lineWidth = 1;
  for (let i = 0; i < 90; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = 5 + Math.random() * 24;
    context.strokeStyle = dark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.08)";
    context.beginPath();
    context.ellipse(x, y, radius, radius * 0.28, 0, 0, Math.PI * 2);
    context.stroke();
  }

  return canvas;
}

function RainCanvas({ enabled }: { enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const drops: RainDrop[] = [];
    const ripples: Ripple[] = [];
    const splashes: Splash[] = [];
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let backdrop = document.createElement("canvas");
    let lastTime = performance.now();

    const resize = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      backdrop = createBackdrop(
        Math.floor(width * pixelRatio),
        Math.floor(height * pixelRatio),
        document.documentElement.classList.contains("dark"),
      );
      drops.length = 0;
      const dropCount = width < 768 ? 34 : Math.min(110, Math.max(64, Math.round(width / 18)));
      for (let i = 0; i < dropCount; i += 1) {
        const drop = {} as RainDrop;
        resetDrop(drop, width, height, true);
        drops.push(drop);
      }
    };

    const drawStatic = () => {
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.drawImage(backdrop, 0, 0, canvas.width, canvas.height);
      context.restore();
    };

    const draw = (time: number) => {
      const delta = Math.min(0.034, (time - lastTime) / 1000);
      lastTime = time;
      drawStatic();

      context.lineCap = "round";
      for (const drop of drops) {
        drop.x += drop.wind * delta;
        drop.y += drop.speed * delta;
        context.strokeStyle = `rgba(242,247,250,${drop.opacity})`;
        context.lineWidth = 0.7;
        context.beginPath();
        context.moveTo(drop.x, drop.y);
        context.lineTo(drop.x - drop.wind * 0.025, drop.y - drop.length);
        context.stroke();

        if (drop.y >= drop.impactY) {
          if (ripples.length < (width < 768 ? 14 : 28)) {
            ripples.push({ x: drop.x, y: drop.impactY, age: 0, duration: 0.75 + Math.random() * 0.55, radius: 8 + Math.random() * 14 });
            for (let i = 0; i < 2; i += 1) {
              splashes.push({
                x: drop.x,
                y: drop.impactY,
                vx: (Math.random() - 0.5) * 65,
                vy: -35 - Math.random() * 55,
                age: 0,
                duration: 0.35 + Math.random() * 0.2,
              });
            }
          }
          resetDrop(drop, width, height);
        }
      }

      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const ripple = ripples[i];
        ripple.age += delta;
        const progress = ripple.age / ripple.duration;
        if (progress >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        const radius = 2 + ripple.radius * progress;
        context.strokeStyle = `rgba(240,246,248,${(1 - progress) * 0.42})`;
        context.lineWidth = 1;
        context.beginPath();
        context.ellipse(ripple.x, ripple.y, radius, radius * 0.28, 0, 0, Math.PI * 2);
        context.stroke();
      }

      for (let i = splashes.length - 1; i >= 0; i -= 1) {
        const splash = splashes[i];
        splash.age += delta;
        if (splash.age >= splash.duration) {
          splashes.splice(i, 1);
          continue;
        }
        splash.vy += 180 * delta;
        splash.x += splash.vx * delta;
        splash.y += splash.vy * delta;
        context.fillStyle = `rgba(245,249,250,${(1 - splash.age / splash.duration) * 0.5})`;
        context.beginPath();
        context.arc(splash.x, splash.y, 1.1, 0, Math.PI * 2);
        context.fill();
      }

      if (enabled && !reducedMotion.matches && !document.hidden) {
        animationFrame = requestAnimationFrame(draw);
      }
    };

    const start = () => {
      cancelAnimationFrame(animationFrame);
      lastTime = performance.now();
      if (enabled && !reducedMotion.matches && !document.hidden) {
        animationFrame = requestAnimationFrame(draw);
      } else {
        drawStatic();
      }
    };

    const themeObserver = new MutationObserver(() => {
      resize();
      start();
    });
    const onVisibilityChange = () => start();
    const onMotionChange = () => start();

    resize();
    start();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onMotionChange);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onMotionChange);
      themeObserver.disconnect();
    };
  }, [enabled]);

  return <canvas ref={canvasRef} className="rain-canvas" aria-hidden="true" />;
}

export default function RainExperience({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = !pathname.startsWith("/admin");
  const [cardOpacity, setCardOpacity] = useState(70);
  const [rainEnabled, setRainEnabled] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const storedOpacity = Number(localStorage.getItem(OPACITY_KEY));
      if (Number.isFinite(storedOpacity) && storedOpacity >= 45 && storedOpacity <= 100) {
        setCardOpacity(storedOpacity);
      }
      setRainEnabled(localStorage.getItem(RAIN_KEY) !== "false");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!panelOpen || !panelRef.current) return;
    const context = gsap.context(() => {
      gsap.fromTo(panelRef.current, { autoAlpha: 0, y: 10, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: "power3.out" });
    }, panelRef);
    return () => context.revert();
  }, [panelOpen]);

  if (!active) return children;

  const style = { "--rain-card-opacity": String(cardOpacity / 100) } as CSSProperties;
  const changeOpacity = (value: number) => {
    setCardOpacity(value);
    localStorage.setItem(OPACITY_KEY, String(value));
  };
  const changeRain = (value: boolean) => {
    setRainEnabled(value);
    localStorage.setItem(RAIN_KEY, String(value));
  };

  return (
    <div className="rain-experience" style={style}>
      <RainCanvas enabled={rainEnabled} />
      <div className="rain-content-layer">{children}</div>

      <div className="rain-controls">
        {panelOpen && (
          <div ref={panelRef} className="rain-controls-panel" role="dialog" aria-label="雨景显示设置">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-wechat-text">显示设置</span>
              <button type="button" onClick={() => setPanelOpen(false)} className="rain-control-icon" aria-label="关闭显示设置" title="关闭">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-4 flex items-center justify-between gap-3 text-xs text-wechat-time">
              <span>动态雨景</span>
              <input type="checkbox" checked={rainEnabled} onChange={(event) => changeRain(event.target.checked)} className="h-4 w-4 accent-[#576b95]" />
            </label>
            <label className="mt-4 block text-xs text-wechat-time">
              <span className="flex items-center justify-between gap-3"><span>卡片不透明度</span><strong className="font-medium text-wechat-text">{cardOpacity}%</strong></span>
              <input type="range" min="45" max="100" step="1" value={cardOpacity} onInput={(event) => changeOpacity(Number(event.currentTarget.value))} className="mt-3 w-full accent-[#576b95]" />
            </label>
            <button type="button" onClick={() => changeOpacity(70)} className="mt-3 flex items-center gap-1 text-xs text-wechat-time transition-colors hover:text-wechat-text">
              <RotateCcw className="h-3.5 w-3.5" />恢复 70%
            </button>
          </div>
        )}
        <button type="button" onClick={() => setPanelOpen((open) => !open)} className="rain-controls-trigger" aria-expanded={panelOpen} aria-label="调整雨景和卡片透明度" title="显示设置">
          <Droplets className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
