"use client";

import { Music, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { getGlobalAudio } from "@/lib/global-audio";
import { useMusicPlayer } from "@/lib/music-player-store";
import LyricPanel from "./LyricPanel";

interface FloatingMusicControlProps {
  panelOpen: boolean;
  onTogglePanel: () => void;
}

export default function FloatingMusicControl({ panelOpen, onTogglePanel }: FloatingMusicControlProps) {
  const isPlaying = useMusicPlayer((state) => state.isPlaying);
  const isLoading = useMusicPlayer((state) => state.isLoading);
  const switching = useMusicPlayer((state) => state.switching);
  const musicUrl = useMusicPlayer((state) => state.musicUrl);
  const musicName = useMusicPlayer((state) => state.musicName);
  const lyric = useMusicPlayer((state) => state.lyric);
  const currentLyric = useMusicPlayer((state) => state.currentLyric);
  const currentLyricIndex = useMusicPlayer((state) => state.currentLyricIndex);
  const showLyricPanel = useMusicPlayer((state) => state.showLyricPanel);
  const muted = useMusicPlayer((state) => state.muted);
  const audioError = useMusicPlayer((state) => state.audioError);
  const audioErrorMessage = useMusicPlayer((state) => state.audioErrorMessage);
  const musicLoaded = useMusicPlayer((state) => state.musicLoaded);
  const activePostMusic = useMusicPlayer((state) => state.activePostMusic);
  const playlist = useMusicPlayer((state) => state.playlist);
  const currentIndex = useMusicPlayer((state) => state.currentIndex);
  const clearActivePost = useMusicPlayer((state) => state.clear);
  const setShowLyricPanel = useMusicPlayer((state) => state.setShowLyricPanel);
  const setMuted = useMusicPlayer((state) => state.setMuted);
  const prepareTrack = useMusicPlayer((state) => state.prepareTrack);

  const hasMusic = Boolean(musicUrl || activePostMusic || playlist.length > 0);
  const displayName = audioError
    ? audioErrorMessage || "播放地址不可用"
    : currentLyric || activePostMusic?.name || musicName || "音乐";

  const togglePlay = async () => {
    const audio = getGlobalAudio();
    if (!audio || !hasMusic) return;
    if (audio.paused) {
      let targetUrl = activePostMusic?.url || musicUrl;
      if (!activePostMusic && !targetUrl) {
        const prepared = prepareTrack(currentIndex);
        if (!prepared) return;
        targetUrl = prepared.url;
      }
      if (!audio.getAttribute("src") || !audio.src.includes(targetUrl)) audio.src = targetUrl;
      audio.play().catch(() => useMusicPlayer.getState().setAudioError(true, "播放地址已失效或被音源拒绝，请重试或切换曲目。"));
    } else {
      audio.pause();
    }
  };

  const toggleMute = () => {
    const audio = getGlobalAudio();
    if (!audio) return;
    audio.muted = !muted;
    setMuted(!muted);
  };

  const playTrack = (index: number) => {
    const audio = getGlobalAudio();
    const state = useMusicPlayer.getState();
    if (!audio || !state.playlist[index]) return;
    const prepared = prepareTrack(index);
    if (!prepared) return;
    if (state.activePostMusic) clearActivePost();
    audio.src = prepared.url;
    audio.play().catch(() => useMusicPlayer.getState().setAudioError(true, "播放地址已失效或被音源拒绝，请重试或切换曲目。"));
  };

  return (
    <>
      {panelOpen && (
        <div className="rain-controls-panel music-controls-panel" role="dialog" aria-label="音乐播放器">
          <div className="min-w-0">
            <p className="text-xs font-medium text-wechat-text">音乐</p>
            <button
              type="button"
              onClick={() => lyric?.length && setShowLyricPanel(true)}
              disabled={!lyric?.length}
              className="mt-1 block w-full truncate text-left text-xs text-wechat-time disabled:cursor-default"
              title={lyric?.length ? "查看歌词" : displayName}
            >
              {musicLoaded ? displayName : "正在读取歌单..."}
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button type="button" onClick={() => playTrack((currentIndex - 1 + playlist.length) % playlist.length)} disabled={Boolean(activePostMusic) || playlist.length < 2} className="rain-control-icon disabled:cursor-not-allowed disabled:opacity-35" aria-label="上一首" title="上一首">
              <SkipBack className="h-4 w-4" fill="currentColor" />
            </button>
            <button type="button" onClick={() => void togglePlay()} disabled={!hasMusic || isLoading || switching} className="rain-control-icon disabled:cursor-not-allowed disabled:opacity-35" aria-label={isPlaying ? "暂停" : "播放"} title={isPlaying ? "暂停" : "播放"}>
              {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 translate-x-px" fill="currentColor" />}
            </button>
            <button type="button" onClick={() => playTrack((currentIndex + 1) % playlist.length)} disabled={Boolean(activePostMusic) || playlist.length < 2} className="rain-control-icon disabled:cursor-not-allowed disabled:opacity-35" aria-label="下一首" title="下一首">
              <SkipForward className="h-4 w-4" fill="currentColor" />
            </button>
            <button type="button" onClick={toggleMute} disabled={!hasMusic || audioError} className="rain-control-icon disabled:cursor-not-allowed disabled:opacity-35" aria-label={muted ? "取消静音" : "静音"} title={muted ? "取消静音" : "静音"}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      <button type="button" onClick={onTogglePanel} className="rain-controls-trigger" aria-expanded={panelOpen} aria-label="打开音乐播放器" title="音乐">
        <Music className={`h-5 w-5 ${isPlaying ? "music-control-icon-playing" : ""}`} aria-hidden="true" />
      </button>

      {showLyricPanel && lyric && lyric.length > 0 && (
        <LyricPanel lines={lyric} currentIndex={currentLyricIndex} onClose={() => setShowLyricPanel(false)} />
      )}
    </>
  );
}
