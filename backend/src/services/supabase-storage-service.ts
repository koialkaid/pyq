import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseStorageConfig {
  url: string;
  secretKey: string;
  bucket: string;
  publicUrl: string;
}

function readConfig(): SupabaseStorageConfig | null {
  const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const secretKey = process.env.SUPABASE_SECRET_KEY || "";
  const bucket = process.env.SUPABASE_BUCKET || "";
  const publicUrl = (
    process.env.SUPABASE_PUBLIC_URL ||
    (url && bucket ? `${url}/storage/v1/object/public/${bucket}` : "")
  ).replace(/\/+$/, "");

  if (!url || !secretKey || !bucket || !publicUrl) return null;
  return { url, secretKey, bucket, publicUrl };
}

export function isSupabaseStorageReady(): boolean {
  return readConfig() !== null;
}

let cached: { client: SupabaseClient; cfg: SupabaseStorageConfig } | null = null;

function getStorage() {
  const cfg = readConfig();
  if (!cfg) {
    throw new Error(
      "Supabase Storage is not configured. Set SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_BUCKET, and SUPABASE_PUBLIC_URL."
    );
  }
  if (!cached || cached.cfg.url !== cfg.url || cached.cfg.secretKey !== cfg.secretKey) {
    cached = {
      cfg,
      client: createClient(cfg.url, cfg.secretKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }),
    };
  }
  return { cfg, bucket: cached.client.storage.from(cfg.bucket) };
}

function publicUrlFor(cfg: SupabaseStorageConfig, key: string): string {
  return `${cfg.publicUrl}/${key.replace(/^\/+/, "")}`;
}

export async function uploadToSupabase(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> {
  const { cfg, bucket } = getStorage();
  const { error } = await bucket.upload(key, buffer, {
    contentType: mimeType || "application/octet-stream",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return publicUrlFor(cfg, key);
}

export async function downloadFromSupabase(key: string): Promise<Buffer> {
  const { bucket } = getStorage();
  const { data, error } = await bucket.download(key);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteFromSupabase(key: string): Promise<boolean> {
  try {
    const { bucket } = getStorage();
    const { error } = await bucket.remove([key]);
    return !error;
  } catch {
    return false;
  }
}

export async function statSupabaseObject(
  key: string
): Promise<{ size: number; contentType?: string } | null> {
  const cfg = readConfig();
  if (!cfg) return null;
  try {
    const response = await fetch(publicUrlFor(cfg, key), { method: "HEAD" });
    if (!response.ok) return null;
    return {
      size: Number(response.headers.get("content-length") || 0),
      contentType: response.headers.get("content-type") || undefined,
    };
  } catch {
    return null;
  }
}

export async function createSupabaseSignedUploadForKey(
  key: string
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const { cfg, bucket } = getStorage();
  const { data, error } = await bucket.createSignedUploadUrl(key, { upsert: false });
  if (error) throw error;
  return { uploadUrl: data.signedUrl, publicUrl: publicUrlFor(cfg, key), key };
}

export async function promoteSupabaseObject(
  stagingKey: string,
  finalKey: string
): Promise<string> {
  const { cfg, bucket } = getStorage();
  const { error } = await bucket.move(stagingKey, finalKey);
  if (error) throw error;
  return publicUrlFor(cfg, finalKey);
}

export function getSupabasePublicUrl(key: string): string {
  const cfg = readConfig();
  if (!cfg) throw new Error("Supabase Storage is not configured.");
  return publicUrlFor(cfg, key);
}

export function extractSupabaseKey(url: string): string {
  const cfg = readConfig();
  if (cfg && url.startsWith(cfg.publicUrl + "/")) {
    return decodeURIComponent(url.slice(cfg.publicUrl.length + 1));
  }
  return "";
}
