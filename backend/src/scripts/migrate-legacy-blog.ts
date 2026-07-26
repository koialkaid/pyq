import "dotenv/config";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { execFileSync } from "child_process";
import MarkdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";
import * as TOML from "@iarna/toml";
import { FriendLink, Media, Post, User, sequelize } from "../models";
import { storeFileAndRecordMedia } from "../services/storage-service";

const LEGACY_ORIGIN = "https://koialkaid.github.io/blog";
const apply = process.argv.includes("--apply");
const sourceArg = process.argv.find((arg) => arg.startsWith("--source="));
const sourceRoot = path.resolve(sourceArg?.slice("--source=".length) || "../../blog-old");

type FrontMatter = {
  title?: string;
  slug?: string;
  date?: Date | string;
  description?: string;
  tags?: string[];
  series?: string[];
};

type LegacyEntry = {
  file: string;
  section: "posts" | "notes" | "about";
  meta: FrontMatter;
  markdown: string;
  sourceUrl: string;
  publishedAt: Date;
};

type TokenLike = {
  type: string;
  children: TokenLike[] | null;
  attrGet(name: string): string | null;
  attrSet(name: string, value: string): void;
};

const md = new MarkdownIt({ html: false, linkify: true, breaks: false }).use(markdownItFootnote);

const mimeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

function splitFrontMatter(raw: string): { meta: FrontMatter; markdown: string } {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines[0]?.trim() !== "+++") throw new Error("TOML front matter is missing");
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "+++");
  if (end < 0) throw new Error("TOML front matter is not closed");
  return {
    meta: TOML.parse(lines.slice(1, end).join("\n")) as FrontMatter,
    markdown: lines.slice(end + 1).join("\n").trim(),
  };
}

function legacyLocalDate(value: Date | string | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    const hour = String(value.getUTCHours()).padStart(2, "0");
    const minute = String(value.getUTCMinutes()).padStart(2, "0");
    const second = String(value.getUTCSeconds()).padStart(2, "0");
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`);
  }
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return new Date(`${text}T00:00:00+08:00`);
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) return new Date(`${text}+08:00`);
  return new Date(text);
}

function firstCommitDate(relativeFile: string): Date {
  try {
    const output = execFileSync(
      "git",
      ["log", "--follow", "--format=%aI", "--", relativeFile],
      { cwd: sourceRoot, encoding: "utf8" }
    ).trim();
    const dates = output.split(/\r?\n/).filter(Boolean);
    if (dates.length) return new Date(dates[dates.length - 1]);
  } catch {
    // Use the migration time only when Git history is unavailable.
  }
  return new Date();
}

async function loadEntries(): Promise<LegacyEntry[]> {
  const entries: LegacyEntry[] = [];
  const sections: Array<"posts" | "notes"> = ["posts", "notes"];

  for (const section of sections) {
    const directory = path.join(sourceRoot, "content", section);
    const files = (await fs.readdir(directory)).filter((name) => name.endsWith(".md") && name !== "_index.md").sort();
    for (const name of files) {
      const file = path.join(directory, name);
      const parsed = splitFrontMatter(await fs.readFile(file, "utf8"));
      const slug = parsed.meta.slug || path.basename(name, ".md");
      entries.push({
        file,
        section,
        meta: parsed.meta,
        markdown: parsed.markdown,
        sourceUrl: `${LEGACY_ORIGIN}/${section}/${slug}/`,
        publishedAt: legacyLocalDate(parsed.meta.date),
      });
    }
  }

  const aboutFile = path.join(sourceRoot, "content", "about", "index.md");
  const about = splitFrontMatter(await fs.readFile(aboutFile, "utf8"));
  entries.push({
    file: aboutFile,
    section: "about",
    meta: { ...about.meta, title: "旧博客 About（归档）" },
    markdown: about.markdown,
    sourceUrl: `${LEGACY_ORIGIN}/about/`,
    publishedAt: firstCommitDate(path.relative(sourceRoot, aboutFile)),
  });
  return entries;
}

function rewritePdfShortcodes(markdown: string): string {
  return markdown.replace(/\{\{<\s*pdf-embed\s+([^>]+)>\}\}/g, (_match, attributes: string) => {
    const values: Record<string, string> = {};
    for (const match of attributes.matchAll(/([a-zA-Z]+)="([^"]*)"/g)) values[match[1]] = match[2];
    const label = values.linktext || values.title || "下载 PDF";
    return `[${label}](${values.src || "#"})`;
  });
}

function walkTokens(tokens: TokenLike[], callback: (token: TokenLike) => void): void {
  for (const token of tokens) {
    callback(token);
    if (token.children) walkTokens(token.children, callback);
  }
}

function isLocalAssetReference(reference: string): boolean {
  if (/^(?:https?:|mailto:|#)/i.test(reference)) return false;
  return Object.hasOwn(mimeByExtension, path.extname(reference.split(/[?#]/)[0]).toLowerCase());
}

async function findLocalAsset(reference: string, markdownFile: string): Promise<string> {
  const clean = decodeURIComponent(reference.split(/[?#]/)[0]).replace(/^\/+/, "");
  const candidates = [
    path.resolve(path.dirname(markdownFile), clean),
    path.resolve(sourceRoot, "static", clean),
    path.resolve(sourceRoot, "static", "posts", path.basename(clean)),
    path.resolve(sourceRoot, "static", path.basename(clean)),
  ];
  for (const candidate of candidates) {
    if (!candidate.startsWith(sourceRoot + path.sep)) continue;
    try {
      if ((await fs.stat(candidate)).isFile()) return candidate;
    } catch {
      // Try the next deterministic legacy path.
    }
  }
  throw new Error(`Local asset not found: ${reference}`);
}

function extensionForMime(mimeType: string): string {
  return Object.entries(mimeByExtension).find(([, mime]) => mime === mimeType)?.[0] || "";
}

async function readAsset(reference: string, markdownFile: string): Promise<{ buffer: Buffer; mimeType: string; name: string }> {
  if (/^https?:/i.test(reference)) {
    const response = await fetch(reference, { headers: { "user-agent": "KoiAlkaid legacy blog migration" } });
    if (!response.ok) throw new Error(`Download failed (${response.status}): ${reference}`);
    const mimeType = (response.headers.get("content-type") || "application/octet-stream").split(";")[0].toLowerCase();
    if (!mimeType.startsWith("image/")) throw new Error(`Remote image returned ${mimeType}: ${reference}`);
    const url = new URL(reference);
    const originalBase = path.basename(url.pathname) || "remote-image";
    const extension = path.extname(originalBase) || extensionForMime(mimeType);
    return { buffer: Buffer.from(await response.arrayBuffer()), mimeType, name: `remote-image${extension}` };
  }

  const file = await findLocalAsset(reference, markdownFile);
  const extension = path.extname(file).toLowerCase();
  return {
    buffer: await fs.readFile(file),
    mimeType: mimeByExtension[extension] || "application/octet-stream",
    name: path.basename(file),
  };
}

async function migrateAsset(reference: string, markdownFile: string, ownerId: string): Promise<string> {
  const identity = /^https?:/i.test(reference)
    ? reference
    : path.relative(sourceRoot, await findLocalAsset(reference, markdownFile)).replace(/\\/g, "/");
  const hash = crypto.createHash("sha256").update(identity).digest("hex").slice(0, 16);
  const asset = await readAsset(reference, markdownFile);
  const extension = path.extname(asset.name) || extensionForMime(asset.mimeType);
  const filename = `legacy-${hash}${extension.toLowerCase()}`;
  const existing = await Media.findOne({ where: { filename, uploaderId: ownerId } });
  if (existing) return existing.url;
  const stored = await storeFileAndRecordMedia(asset.buffer, filename, asset.mimeType, ownerId, "legacy");
  return stored.url;
}

async function renderEntry(entry: LegacyEntry, ownerId: string): Promise<{ html: string; images: string[]; warnings: string[] }> {
  const tokens = md.parse(rewritePdfShortcodes(entry.markdown), {}) as unknown as TokenLike[];
  const references = new Set<string>();
  walkTokens(tokens, (token) => {
    if (token.type === "image") {
      const src = token.attrGet("src");
      if (src) references.add(src);
    }
    if (token.type === "link_open") {
      const href = token.attrGet("href");
      if (href && isLocalAssetReference(href)) references.add(href);
    }
  });

  const replacements = new Map<string, string>();
  const warnings: string[] = [];
  for (const reference of references) {
    try {
      replacements.set(reference, await migrateAsset(reference, entry.file, ownerId));
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error));
    }
  }

  const images: string[] = [];
  walkTokens(tokens, (token) => {
    if (token.type === "image") {
      const src = token.attrGet("src");
      if (src && replacements.has(src)) token.attrSet("src", replacements.get(src)!);
      const finalSrc = token.attrGet("src");
      if (finalSrc) images.push(finalSrc);
    }
    if (token.type === "link_open") {
      const href = token.attrGet("href");
      if (href && replacements.has(href)) token.attrSet("href", replacements.get(href)!);
      token.attrSet("target", "_blank");
      token.attrSet("rel", "noopener noreferrer");
    }
  });

  const tags = [...(entry.meta.series || []), ...(entry.meta.tags || [])].filter(
    (value, index, values) => values.indexOf(value) === index
  );
  const archiveMeta = [
    `<p><small>迁移自旧博客：<a href="${entry.sourceUrl}" target="_blank" rel="noopener noreferrer">查看原文</a></small></p>`,
    tags.length ? `<p><small>旧站标签：${tags.join("、")}</small></p>` : "",
  ].filter(Boolean).join("\n");
  return { html: `${md.renderer.render(tokens as any, md.options, {})}\n<hr>\n${archiveMeta}`, images, warnings };
}

async function uniqueShortId(sourceUrl: string): Promise<string> {
  const base = crypto.createHash("sha256").update(sourceUrl).digest("hex");
  for (let offset = 0; offset <= base.length - 8; offset += 8) {
    const candidate = base.slice(offset, offset + 8);
    if (!(await Post.findOne({ where: { shortId: candidate } }))) return candidate;
  }
  return crypto.randomBytes(4).toString("hex");
}

async function setPostDate(id: string, date: Date): Promise<void> {
  await sequelize.query(
    "UPDATE posts SET created_at = :createdAt, updated_at = :updatedAt WHERE id = :id",
    { replacements: { id, createdAt: date, updatedAt: date } }
  );
}

async function migrateEntry(entry: LegacyEntry, owner: User): Promise<{ action: "created" | "updated"; warnings: string[] }> {
  const rendered = await renderEntry(entry, owner.id);
  const isMoment = entry.section === "notes";
  const tags = [...(entry.meta.series || []), ...(entry.meta.tags || [])];
  const values = {
    userId: owner.id,
    type: isMoment ? "moment" as const : "article" as const,
    title: isMoment ? "" : String(entry.meta.title || "未命名文章").slice(0, 200),
    excerpt: String(entry.meta.description || "").slice(0, 500),
    cover: isMoment ? "" : (rendered.images[0] || ""),
    category: isMoment ? "" : String(entry.meta.series?.[0] || tags[0] || "旧站归档").slice(0, 50),
    content: rendered.html,
    images: isMoment ? rendered.images : [],
    location: null,
    music: null,
    linkCard: null,
    video: null,
    douban: null,
    pinned: false,
    isAd: false,
    likesDisabled: false,
    commentsDisabled: false,
    ip: "",
    region: "",
    articleType: "original" as const,
    repostUrl: entry.sourceUrl,
    viewCount: 0,
    status: "published" as const,
  };

  const existing = await Post.findOne({ where: { repostUrl: entry.sourceUrl } });
  if (existing) {
    await existing.update(values);
    await setPostDate(existing.id, entry.publishedAt);
    return { action: "updated", warnings: rendered.warnings };
  }

  const created = await Post.create({ ...values, shortId: await uniqueShortId(entry.sourceUrl) } as any);
  await setPostDate(created.id, entry.publishedAt);
  return { action: "created", warnings: rendered.warnings };
}

async function migrateLegacyAvatar(owner: User): Promise<string> {
  const avatarFile = path.join(sourceRoot, "static", "profile", "avatar.jpg");
  const reference = path.relative(path.join(sourceRoot, "content"), avatarFile).replace(/\\/g, "/");
  const avatarUrl = await migrateAsset(reference, path.join(sourceRoot, "content", "_index.md"), owner.id);
  if (owner.avatar !== avatarUrl) await owner.update({ avatar: avatarUrl });
  return avatarUrl;
}

async function upsertLegacyFriend(avatar: string): Promise<"created" | "updated"> {
  const existing = await FriendLink.findOne({ where: { url: `${LEGACY_ORIGIN}/` } });
  const values = {
    name: "Koi's Blog（旧站）",
    url: `${LEGACY_ORIGIN}/`,
    desc: "旧版 GitHub Pages 博客归档",
    email: "",
    avatar,
  };
  if (existing) {
    await existing.update(values);
    return "updated";
  }
  await FriendLink.create(values);
  return "created";
}

async function main(): Promise<void> {
  const entries = await loadEntries();
  console.log(`Legacy migration plan: ${entries.length} entries (${entries.filter((e) => e.section === "posts").length} articles, ${entries.filter((e) => e.section === "notes").length} moments, ${entries.filter((e) => e.section === "about").length} archived page).`);
  for (const entry of entries) {
    console.log(`- ${entry.section}: ${entry.meta.title || path.basename(entry.file)} @ ${entry.publishedAt.toISOString()}`);
  }
  if (!apply) {
    console.log("Dry run complete. Re-run with --apply to write production data.");
    return;
  }

  await sequelize.authenticate();
  try {
    const owner = await User.findOne({ where: { email: process.env.ADMIN_EMAIL || "" } })
      || await User.findOne({ where: { role: "admin" } });
    if (!owner) throw new Error("Admin user not found");

    const summary = { created: 0, updated: 0, warnings: [] as string[] };
    for (const entry of entries) {
      const result = await migrateEntry(entry, owner);
      summary[result.action] += 1;
      summary.warnings.push(...result.warnings.map((warning) => `${entry.meta.title}: ${warning}`));
      console.log(`${result.action}: ${entry.meta.title}`);
    }
    const avatar = await migrateLegacyAvatar(owner);
    const friend = await upsertLegacyFriend(avatar);
    console.log(`${friend}: legacy friend link`);
    console.log(`Migration complete: ${summary.created} created, ${summary.updated} updated, ${summary.warnings.length} warnings.`);
    for (const warning of summary.warnings) console.warn(`WARNING: ${warning}`);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
