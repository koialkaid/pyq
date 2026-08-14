"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, GripVertical, Music, Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { apiFetch, getToken } from "@/lib/api-fetch";
import { uploadDirect, type UploadedMedia } from "@/lib/upload";
import LyricEditor from "@/components/LyricEditor";
import MediaPicker, { type PickerMediaItem } from "@/components/MediaPicker";

interface Track {
  id: string;
  audioMediaId: string;
  coverMediaId: string | null;
  name: string;
  artist: string;
  sourceUrl: string;
  mp3url: string;
  cover: string;
  lrc: string;
}

interface Draft {
  audio: PickerMediaItem | UploadedMedia | null;
  cover: PickerMediaItem | UploadedMedia | null;
  title: string;
  artist: string;
  sourceUrl: string;
  lrc: string;
}

interface EditingTrack {
  id: string;
  title: string;
  artist: string;
  sourceUrl: string;
  lrc: string;
  coverMediaId: string | null;
  coverUrl: string;
  audioUrl: string;
}

const emptyDraft = (): Draft => ({ audio: null, cover: null, title: "", artist: "", sourceUrl: "", lrc: "" });
const fieldClass = "rounded-lg border border-adm-border bg-adm-input px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary";
const secondaryButtonClass = "rounded-lg border border-adm-border px-3 py-2 text-sm text-adm-text-secondary transition-colors hover:bg-adm-hover disabled:opacity-50";

export default function AdminMusic() {
  const [name, setName] = useState("网站歌单");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoplay, setAutoplay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [picker, setPicker] = useState<"audio" | "draft-cover" | "edit-cover" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<EditingTrack | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/music/admin");
      if (!response.ok) throw new Error("加载歌单失败");
      const data = await response.json();
      setName(data.name || "网站歌单");
      setTracks(data.tracks || []);
      setAutoplay(data.musicAutoplay || false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载歌单失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const uploadAudio = async (file: File) => {
    const token = getToken();
    if (!token) throw new Error("登录状态已失效");
    setUploading(true);
    setMessage("正在上传音频到云端，请勿关闭页面...");
    setDraft((current) => ({ ...current, audio: null }));
    try {
      const audio = await uploadDirect(file, token, "audio");
      setDraft((current) => ({
        ...current,
        audio,
        title: current.title || audio.filename.replace(/\.[^.]+$/, ""),
      }));
      setMessage("云端上传成功，现在可以填写资料并加入歌单。");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "上传音频失败";
      setMessage(detail);
      window.alert(detail);
    } finally {
      setUploading(false);
    }
  };

  const addTrack = async () => {
    if (uploading) return setMessage("音频仍在上传，请等待上传成功。");
    if (!draft.audio) return setMessage("请先上传音频，或从云端媒体库选择音频。");
    if (!draft.sourceUrl.trim()) return setMessage("请填写歌曲来源网址。");
    setSaving(true);
    setMessage("");
    try {
      const response = await apiFetch("/music/admin/tracks", {
        method: "POST",
        body: JSON.stringify({
          audioMediaId: draft.audio.id,
          coverMediaId: draft.cover?.id || null,
          title: draft.title,
          artist: draft.artist,
          sourceUrl: draft.sourceUrl,
          lrc: draft.lrc,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "添加歌曲失败");
      setTracks((current) => [...current, data]);
      setDraft(emptyDraft());
      setMessage(`「${data.name}」已添加到歌单。`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "添加歌曲失败";
      setMessage(detail);
      window.alert(detail);
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (track: Track) => {
    setEditing({
      id: track.id,
      title: track.name,
      artist: track.artist,
      sourceUrl: track.sourceUrl || "",
      lrc: track.lrc || "",
      coverMediaId: track.coverMediaId,
      coverUrl: track.cover || "",
      audioUrl: track.mp3url,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await apiFetch(`/music/admin/tracks/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editing.title,
          artist: editing.artist,
          sourceUrl: editing.sourceUrl,
          lrc: editing.lrc,
          coverMediaId: editing.coverMediaId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "保存歌曲资料失败");
      setTracks((current) => current.map((track) => (track.id === data.id ? data : track)));
      setEditing(null);
      setMessage(`「${data.name}」的资料已保存。`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "保存歌曲资料失败";
      setMessage(detail);
      window.alert(detail);
    } finally {
      setSaving(false);
    }
  };

  const removeTrack = async (id: string) => {
    const track = tracks.find((item) => item.id === id);
    if (!track) return;
    if (!confirm(`将从歌单和云端媒体库永久删除「${track.name}」的音频文件，此操作不可恢复。继续吗？`)) return;
    setSaving(true);
    try {
      const trackResponse = await apiFetch(`/music/admin/tracks/${id}`, { method: "DELETE" });
      if (!trackResponse.ok) {
        const data = await trackResponse.json().catch(() => null);
        throw new Error(data?.message || "移除歌曲失败");
      }
      setTracks((current) => current.filter((item) => item.id !== id));
      setEditing((current) => (current?.id === id ? null : current));

      const mediaResponse = await apiFetch(`/media/${track.audioMediaId}`, { method: "DELETE" });
      if (!mediaResponse.ok) {
        const data = await mediaResponse.json().catch(() => null);
        throw new Error(`歌曲已从歌单移除，但云端文件删除失败：${data?.message || "请到媒体库重试"}`);
      }
      setMessage(`「${track.name}」已从歌单和云端媒体库删除。`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "删除歌曲失败";
      setMessage(detail);
      window.alert(detail);
    } finally {
      setSaving(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...tracks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setTracks(next);
    const response = await apiFetch("/music/admin/order", {
      method: "PUT",
      body: JSON.stringify({ trackIds: next.map((track) => track.id) }),
    });
    if (!response.ok) {
      setMessage("保存排序失败，已重新加载歌单。");
      void load();
    }
  };

  const savePlaylist = async () => {
    setSaving(true);
    try {
      const response = await apiFetch("/music/admin", {
        method: "PUT",
        body: JSON.stringify({ name, musicAutoplay: autoplay }),
      });
      if (!response.ok) throw new Error("保存歌单设置失败");
      setMessage("歌单设置已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-adm-text">云端音乐歌单</h1>
          <p className="mt-1 text-sm text-adm-text-tertiary">播放云端媒体库中的音频文件，来源网址仅供后台记录。</p>
        </div>
        <button onClick={() => void savePlaylist()} disabled={saving} className="flex items-center gap-2 rounded-lg bg-adm-primary px-4 py-2 text-sm font-medium text-adm-primary-text disabled:opacity-50">
          <Save className="h-4 w-4" />保存歌单
        </button>
      </div>

      {message && <p className="mb-4 rounded-lg bg-adm-input px-3 py-2 text-sm text-adm-text-secondary">{message}</p>}

      <section className="mb-6 rounded-xl border border-adm-border bg-adm-card p-4">
        <label className="mb-1.5 block text-sm font-medium text-adm-text">歌单名称</label>
        <input value={name} onChange={(event) => setName(event.target.value)} className={`w-full ${fieldClass}`} />
        <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg bg-adm-input px-3 py-2 text-sm text-adm-text">
          <span>进入网站自动播放</span>
          <input type="checkbox" checked={autoplay} onChange={(event) => setAutoplay(event.target.checked)} className="h-4 w-4 accent-adm-primary" />
        </label>
      </section>

      <section className="mb-6 rounded-xl border border-adm-border bg-adm-card p-4">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-adm-text"><Plus className="h-4 w-4" />添加云端音频</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`rounded-lg border border-dashed border-adm-border p-3 text-sm text-adm-text-secondary ${uploading ? "pointer-events-none opacity-60" : ""}`}>
            <span className="mb-2 flex items-center gap-2"><Upload className="h-4 w-4" />{uploading ? "正在上传音频" : draft.audio ? "云端上传成功" : "上传音频到云端"}</span>
            <input type="file" disabled={uploading} accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void uploadAudio(file); }} />
          </label>
          <button disabled={uploading} onClick={() => setPicker("audio")} className={`${secondaryButtonClass} text-left`}>从云端媒体库选择音频</button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="歌曲名称" className={fieldClass} />
          <input value={draft.artist} onChange={(event) => setDraft((current) => ({ ...current, artist: event.target.value }))} placeholder="艺术家（可选）" className={fieldClass} />
          <button onClick={() => setPicker("draft-cover")} className={`${secondaryButtonClass} text-left`}>{draft.cover ? "已选择云端封面，重新选择" : "选择云端封面（可选）"}</button>
          <input type="url" value={draft.sourceUrl} onChange={(event) => setDraft((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="歌曲来源网址" className={fieldClass} />
        </div>
        <div className="mt-3"><LyricEditor audioUrl={draft.audio?.url || ""} value={draft.lrc} onChange={(lrc) => setDraft((current) => ({ ...current, lrc }))} /></div>
        <button onClick={() => void addTrack()} disabled={saving || uploading || !draft.audio || !draft.sourceUrl.trim()} className="mt-3 rounded-lg bg-adm-primary px-4 py-2 text-sm font-medium text-adm-primary-text disabled:opacity-50">添加到歌单</button>
      </section>

      <section className="rounded-xl border border-adm-border bg-adm-card p-4">
        <h2 className="mb-3 font-semibold text-adm-text">歌曲列表</h2>
        {loading ? <p className="text-sm text-adm-text-tertiary">加载中...</p> : tracks.length === 0 ? <p className="py-8 text-center text-sm text-adm-text-tertiary">歌单为空，请添加云端音频文件。</p> : (
          <div className="space-y-2">
            {tracks.map((track, index) => (
              <div key={track.id}>
                <div className="flex items-center gap-3 rounded-lg bg-adm-input p-2">
                  <GripVertical className="h-4 w-4 text-adm-text-tertiary" />
                  {track.cover ? <Image src={track.cover} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded object-cover" /> : <Music className="h-8 w-8 p-2 text-adm-text-tertiary" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-adm-text">{track.name}</p>
                    <p className="truncate text-xs text-adm-text-tertiary">{track.artist || "未知艺术家"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => void move(index, -1)} disabled={index === 0 || saving} className="px-2 text-adm-text-secondary disabled:opacity-30" title="上移">↑</button>
                    <button onClick={() => void move(index, 1)} disabled={index === tracks.length - 1 || saving} className="px-2 text-adm-text-secondary disabled:opacity-30" title="下移">↓</button>
                    <button onClick={() => beginEdit(track)} className="rounded p-1 text-adm-text-secondary hover:bg-adm-hover" title="编辑歌曲资料"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => void removeTrack(track.id)} disabled={saving} className="rounded p-1 text-adm-danger disabled:opacity-40" title="删除歌曲和云端文件"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                {editing?.id === track.id && (
                  <div className="mt-2 rounded-lg border border-adm-border bg-adm-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-adm-text">编辑歌曲资料</h3>
                      <button onClick={() => setEditing(null)} className="rounded p-1 text-adm-text-secondary hover:bg-adm-hover" aria-label="关闭编辑"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input value={editing.title} onChange={(event) => setEditing((current) => current ? { ...current, title: event.target.value } : current)} placeholder="歌曲名称" className={fieldClass} />
                      <input value={editing.artist} onChange={(event) => setEditing((current) => current ? { ...current, artist: event.target.value } : current)} placeholder="艺术家（可选）" className={fieldClass} />
                      <button onClick={() => setPicker("edit-cover")} className={`${secondaryButtonClass} text-left`}>{editing.coverMediaId ? "更换云端封面" : "选择云端封面（可选）"}</button>
                      <input type="url" value={editing.sourceUrl} onChange={(event) => setEditing((current) => current ? { ...current, sourceUrl: event.target.value } : current)} placeholder="歌曲来源网址" className={fieldClass} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-adm-text-tertiary">
                      {editing.coverMediaId && <button onClick={() => setEditing((current) => current ? { ...current, coverMediaId: null, coverUrl: "" } : current)} className="text-adm-danger">移除封面</button>}
                      {editing.sourceUrl && <a href={editing.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-adm-primary"><ExternalLink className="h-3 w-3" />检查来源网址</a>}
                    </div>
                    <div className="mt-3"><LyricEditor audioUrl={editing.audioUrl} value={editing.lrc} onChange={(lrc) => setEditing((current) => current ? { ...current, lrc } : current)} /></div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => void saveEdit()} disabled={saving} className="rounded-lg bg-adm-primary px-4 py-2 text-sm font-medium text-adm-primary-text disabled:opacity-50"><Save className="mr-1 inline h-4 w-4" />保存修改</button>
                      <button onClick={() => setEditing(null)} disabled={saving} className={secondaryButtonClass}>取消</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <MediaPicker open={picker === "audio"} onClose={() => setPicker(null)} category="audio" title="选择云端音频" onSelect={(audio) => { setDraft((current) => ({ ...current, audio, title: current.title || audio.filename.replace(/\.[^.]+$/, "") })); setPicker(null); }} />
      <MediaPicker open={picker === "draft-cover"} onClose={() => setPicker(null)} category="image" title="选择云端封面" onSelect={(cover) => { setDraft((current) => ({ ...current, cover })); setPicker(null); }} />
      <MediaPicker open={picker === "edit-cover"} onClose={() => setPicker(null)} category="image" title="选择云端封面" onSelect={(cover) => { setEditing((current) => current ? { ...current, coverMediaId: cover.id, coverUrl: cover.url } : current); setPicker(null); }} />
    </div>
  );
}
