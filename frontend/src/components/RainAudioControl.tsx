"use client";

import { useEffect, useRef, useState } from "react";
import { CloudRain, Pause, Play, RotateCw, Volume2, VolumeX } from "lucide-react";

const TRACKS = [{ src: "/audio/rain-commons-1.ogg", label: "Rain (1)" }];
const VOLUME_KEY = "koi_blog_rain_audio_volume";

export default function RainAudioControl() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState(TRACKS[0]);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.42);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = Number(localStorage.getItem(VOLUME_KEY));
    const savedVolume = Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 0.42;
    if (Number.isFinite(saved)) requestAnimationFrame(() => setVolume(savedVolume));
    const selected = TRACKS[Math.floor(Math.random() * TRACKS.length)];
    const audio = new Audio(selected.src);
    audio.loop = true;
    audio.preload = "none";
    audio.volume = Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 0.42;
    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ""; audioRef.current = null; };
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) await audio.play().catch(() => setPlaying(false));
    else audio.pause();
  };
  const changeVolume = (value: number) => {
    setVolume(value); localStorage.setItem(VOLUME_KEY, String(value));
    if (audioRef.current) audioRef.current.volume = value;
  };
  const switchTrack = () => {
    const audio = audioRef.current; if (!audio) return;
    const next = TRACKS[(TRACKS.indexOf(track) + 1) % TRACKS.length];
    setTrack(next); audio.src = next.src; audio.loop = true;
    if (playing) void audio.play().catch(() => setPlaying(false));
  };

  return <div className="rain-audio-control">
    {open && <div className="rain-audio-panel" role="dialog" aria-label="雨声控制">
      <div className="rain-audio-title"><CloudRain className="h-4 w-4" />雨声白噪音</div>
      <div className="rain-audio-track" title={track.label}>{track.label}</div>
      <div className="rain-audio-row"><button type="button" className="rain-audio-icon" onClick={toggle} aria-label={playing ? "暂停雨声" : "播放雨声"}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button><button type="button" className="rain-audio-icon" onClick={switchTrack} aria-label="切换雨声音源" title="切换音源"><RotateCw className="h-4 w-4" /></button><span className="rain-audio-volume-icon">{volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</span><input aria-label="雨声音量" type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => changeVolume(Number(e.currentTarget.value))} /></div>
      <small>音源：Wikimedia Commons 公共领域</small>
    </div>}
    <button type="button" className="rain-audio-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="打开雨声控制" title="雨声"><CloudRain className="h-4 w-4" />{playing && <span className="rain-audio-live" />}</button>
  </div>;
}
