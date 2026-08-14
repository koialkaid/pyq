import Link from "next/link";
import { ArrowRight, Waves } from "lucide-react";

export default function OtherPage() {
  return <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-24 pt-[76px] md:px-8">
    <section className="rounded-lg bg-wechat-white p-6 shadow-sm md:p-10">
      <p className="text-xs uppercase tracking-widest text-wechat-time">工具空间</p>
      <h1 className="mt-3 text-2xl font-semibold text-wechat-text">其它</h1>
      <p className="mt-4 text-sm leading-7 text-wechat-time">这里用于放置与首页内容体系无关的独立工具。热力图等功能会从这里进入。</p>
      <Link href="/other/rain-garden" className="mt-8 flex items-center gap-4 rounded-lg border border-black/10 bg-wechat-bubble p-4 text-wechat-text transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/5 dark:bg-white/10"><Waves className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm font-semibold">雨庭</strong>
          <small className="mt-1 block text-xs leading-5 text-wechat-time">雨中的锦鲤水庭与相伴计时</small>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-wechat-time" />
      </Link>
      <Link href="/" className="mt-6 inline-flex rounded-lg bg-wechat-bubble px-4 py-2 text-sm text-wechat-text">返回首页</Link>
    </section>
  </main>;
}
