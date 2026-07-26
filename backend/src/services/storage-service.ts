import { Media } from "../models";
import type { StorageType } from "../models/Media";
import {
  buildObjectKey,
  buildStagingKey,
  createPresignedUploadForKey as createR2SignedUploadForKey,
  deleteFromR2,
  downloadFromR2,
  extractR2Key,
  getR2PublicUrl,
  isR2Ready,
  promoteR2Object,
  statR2Object,
  uploadToR2,
} from "./r2-service";
import {
  createSupabaseSignedUploadForKey,
  deleteFromSupabase,
  downloadFromSupabase,
  extractSupabaseKey,
  getSupabasePublicUrl,
  isSupabaseStorageReady,
  promoteSupabaseObject,
  statSupabaseObject,
  uploadToSupabase,
} from "./supabase-storage-service";

export type { StorageType };
export { buildObjectKey, buildStagingKey, isR2Ready, isSupabaseStorageReady };

export function getStorageProvider(): StorageType {
  const configured = (process.env.STORAGE_PROVIDER || "").toLowerCase();
  if (configured === "supabase" || configured === "r2") return configured;
  if (isR2Ready()) return "r2";
  if (isSupabaseStorageReady()) return "supabase";
  return "r2";
}

export function isStorageReady(): boolean {
  const provider = getStorageProvider();
  return provider === "supabase" ? isSupabaseStorageReady() : isR2Ready();
}

function requireStorage(): StorageType {
  const provider = getStorageProvider();
  if (!isStorageReady()) {
    throw new Error(`${provider} storage is not fully configured.`);
  }
  return provider;
}

export function getStorageUploadLimit(): number {
  if (getStorageProvider() === "supabase") {
    return Number(process.env.SUPABASE_MAX_FILE_SIZE || 50 * 1024 * 1024);
  }
  return Number(process.env.R2_MAX_FILE_SIZE || 100 * 1024 * 1024);
}

export async function storeBuffer(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  prefix = "media"
): Promise<{ url: string; storageType: StorageType }> {
  const storageType = requireStorage();
  const key = buildObjectKey(prefix, originalName);
  const url =
    storageType === "supabase"
      ? await uploadToSupabase(buffer, key, mimeType)
      : await uploadToR2(buffer, key, mimeType);
  return { url, storageType };
}

export async function storeFileAndRecordMedia(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  uploaderId: string,
  prefix = "media"
): Promise<{ url: string; storageType: StorageType; mediaId: string }> {
  const { url, storageType } = await storeBuffer(buffer, originalName, mimeType, prefix);
  const media = await Media.create({
    filename: originalName,
    url,
    storageType,
    mimeType,
    size: buffer.length,
    uploaderId,
  });
  return { url, storageType, mediaId: media.id };
}

export async function createPresignedUploadForKey(
  key: string,
  mimeType: string
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const provider = requireStorage();
  return provider === "supabase"
    ? createSupabaseSignedUploadForKey(key)
    : createR2SignedUploadForKey(key, mimeType);
}

export async function createPresignedUpload(
  originalName: string,
  mimeType: string,
  prefix = "media"
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const key = buildObjectKey(prefix, originalName);
  return createPresignedUploadForKey(key, mimeType);
}

export async function statStoredObject(
  key: string
): Promise<{ size: number; contentType?: string } | null> {
  return getStorageProvider() === "supabase" ? statSupabaseObject(key) : statR2Object(key);
}

export async function promoteStoredObject(
  stagingKey: string,
  finalKey: string,
  mimeType: string
): Promise<string> {
  return getStorageProvider() === "supabase"
    ? promoteSupabaseObject(stagingKey, finalKey)
    : promoteR2Object(stagingKey, finalKey, mimeType);
}

export async function downloadStoredObject(key: string): Promise<Buffer> {
  return getStorageProvider() === "supabase" ? downloadFromSupabase(key) : downloadFromR2(key);
}

export async function deleteStoredKey(key: string): Promise<boolean> {
  return getStorageProvider() === "supabase" ? deleteFromSupabase(key) : deleteFromR2(key);
}

export function getStoragePublicUrl(key: string): string {
  return getStorageProvider() === "supabase" ? getSupabasePublicUrl(key) : getR2PublicUrl(key);
}

export async function deleteStoredFile(url: string, storageType: StorageType): Promise<void> {
  const key = storageType === "supabase" ? extractSupabaseKey(url) : extractR2Key(url);
  if (!key) return;
  if (storageType === "supabase") await deleteFromSupabase(key);
  else await deleteFromR2(key);
}
