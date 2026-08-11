import Link from "next/link";

export default function OtherPage() {
  return <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-24 pt-[76px] md:px-8">
    <section className="rounded-2xl bg-wechat-white p-6 shadow-sm md:p-10">
      <p className="text-xs uppercase tracking-widest text-wechat-time">工具空间</p>
      <h1 className="mt-3 text-2xl font-semibold text-wechat-text">其它</h1>
      <p className="mt-4 text-sm leading-7 text-wechat-time">这里用于放置与首页内容体系无关的独立工具。热力图等功能会从这里进入。</p>
      <Link href="/" className="mt-8 inline-flex rounded-lg bg-wechat-bubble px-4 py-2 text-sm text-wechat-text">返回首页</Link>
    </section>
  </main>;
}
