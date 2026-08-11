"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wrench } from "lucide-react";
import RainAudioControl from "./RainAudioControl";

export default function SiteNavigation() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <nav className="site-navigation" aria-label="站点导航">
    <Link href="/" className={pathname === "/" ? "site-navigation-link active" : "site-navigation-link"}><Home className="h-4 w-4" />首页</Link>
    <Link href="/other" className={pathname.startsWith("/other") ? "site-navigation-link active" : "site-navigation-link"}><Wrench className="h-4 w-4" />其它</Link>
    <RainAudioControl />
  </nav>;
}
