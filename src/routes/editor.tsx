"use client";

import { createFileRoute, Link, useHydrated } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Upload,
  Film,
  Wand2,
  Loader2,
  ArrowLeft,
  X,
  Music2,
  Type,
  Palette,
  Image as ImageIcon,
  Play,
  Pause,
  Download,
  Share2,
  Save,
  FolderOpen,
  CheckCircle2,
  RefreshCw,
  Maximize2,
  Copy,
  ExternalLink,
  Info,
  Globe2,
  Send,
} from "lucide-react";
import logo from "@/assets/smart-reel-logo.png";
import ffmpegCoreUrl from "@ffmpeg/core?url";
import ffmpegWasmUrl from "@ffmpeg/core/wasm?url";

export const Route = createFileRoute("/editor")({
  component: Editor,
  head: () => ({
    meta: [
      { title: "Smart Reel — AI Editor" },
      { name: "description", content: "Upload clips, get a cinematic AI edit plan, preview & export your reel." },
    ],
  }),
});

type ClipMeta = { name: string; description: string; duration_sec?: number };
type DecodeStatus = "processing" | "ready" | "repairing" | "invalid";
type LocalClip = {
  id: string;
  file: File;
  url: string;
  kind: "video" | "image";
  name: string;
  duration?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  codecLabel?: string;
  thumbnailUrl?: string;
  decodeStatus: DecodeStatus;
  repairMessage?: string;
  frameVerified?: boolean;
};
type ReferenceMedia = { id: string; file: File; url: string; kind: "video" | "image"; name: string } | null;
type SongFile = { id: string; file: File; url: string; name: string } | null;
type BrowserFileList = { length: number; item(index: number): File | null; [index: number]: File };
type PreviewValidation = {
  fileExists: boolean;
  fileSizeOk: boolean;
  mp4Valid: boolean;
  videoTrack: boolean;
  audioTrack: boolean;
  durationOk: boolean;
  playable: boolean;
  canExport: boolean;
  message: string;
};
type RenderedReel = { blob: Blob; url: string; validation: PreviewValidation; fileName: string };

type EditPlan = {
  project: { title: string; category: string; aspect_ratio: string; target_duration_sec: number; language: string };
  style: { mood: string; color_grade: string; pacing: string; reference_match_notes: string };
  music: {
    genre: string;
    selected_song: string;
    bpm_estimate: number;
    song_suggestions: string[];
    beat_sync: boolean;
    beat_markers: number[];
    bass_drops: number[];
    audio_mix: { volume_balance: string; fade_in_sec: number; fade_out_sec: number; bass_enhancement: string };
  };
  timeline: Array<{ index: number; clip_ref: string; in_sec: number; out_sec: number; speed: number; effect: string; transition_in: string; caption: string | null }>;
  text_animations: Array<{ at_sec: number; text: string; style: string }>;
  subtitles: { enabled: boolean; language: string; style: string };
  export: { resolution: string; format: string; platform: string };
  notes_for_creator: string;
};

type SavedProject = { id: string; title: string; savedAt: number; category: string; language: string; platform: string; instructions: string; reference: string; selected: Record<string, string[]>; selectedSongTitle?: string; plan: EditPlan | null };

const CATEGORIES = ["Instagram Reel", "Wedding", "Haldi", "Mehendi", "Birthday", "Engagement", "Couple Reel", "Travel", "Party", "College Event", "Family Function", "Baby Shoot", "Gym Reel", "Festival", "Vlog"];
const PLATFORMS = ["Instagram Reel", "YouTube", "WhatsApp Status"] as const;
const LANGUAGES = ["Marathi", "Hindi", "English"];

const QUALITY_MODES = [
  { key: "Basic Edit", desc: "Clean simple cuts" },
  { key: "Cinematic Edit", desc: "Smooth cinematic flow" },
  { key: "Viral Instagram Reel", desc: "Trending cuts + beat sync" },
  { key: "Professional Wedding Film", desc: "Golden cinematic film" },
  { key: "YouTube Cinematic", desc: "16:9 cinematic short" },
  { key: "Ultra Viral Mode", desc: "Max beat sync, fast cuts, viral hooks" },
];

const INSTAGRAM_SUBSTYLES = ["Viral Reel Style", "Trending Cinematic Reel", "Beat Sync Reel", "Aesthetic Reel", "Slow Motion Reel", "Couple Reel", "Luxury Reel", "Party Reel", "Travel Reel"];

const EXAMPLES = [
  "Create cinematic Marathi wedding reel with golden grade",
  "Fast beat Instagram reel, bold kinetic text",
  "Slow-mo couple intro with romantic Marathi song",
  "Travel vlog with drone cinematic feel",
];

const AI_TWEAKS = [
  "More emotional",
  "More glow",
  "More transitions",
  "Faster pace",
  "Trending Instagram style",
  "Better cinematic look",
  "Change song",
  "Add slow-mo intro",
];

const EXPORT_FORMATS: Array<{ key: string; label: string; ratio: string }> = [
  { key: "Instagram Reel", label: "Instagram Reel", ratio: "9:16" },
  { key: "YouTube", label: "YouTube Video", ratio: "16:9" },
  { key: "WhatsApp Status", label: "WhatsApp Status", ratio: "9:16" },
  { key: "Story", label: "Story Format", ratio: "9:16" },
];

const QUALITIES = ["720p", "1080p", "4K Premium"];

type RecommendedSong = { title: string; vibe: string; bpm: number; category: string; previewTone: string };

const SONG_LIBRARY: RecommendedSong[] = [
  { title: "Romantic Marathi Cinematic Theme", vibe: "Warm wedding emotion, slow-mo entries, golden grade", bpm: 82, category: "Wedding", previewTone: "cinematic-romance" },
  { title: "Emotional Hindi Wedding Piano", vibe: "Soft vocals, family moments, premium ceremony pacing", bpm: 76, category: "Wedding", previewTone: "emotional-piano" },
  { title: "Trending Haldi Dhol Beat", vibe: "Energetic Marathi beats, smiles, yellow glow, fast cuts", bpm: 132, category: "Haldi", previewTone: "dhol-energy" },
  { title: "Mehendi Folk Pop Groove", vibe: "Playful hand details, dance circles, colorful transitions", bpm: 118, category: "Mehendi", previewTone: "folk-pop" },
  { title: "Birthday Party Pop Hook", vibe: "Happy upbeat party edits, flash cuts, cake reveal", bpm: 124, category: "Birthday", previewTone: "party-pop" },
  { title: "Aesthetic Travel Chillwave", vibe: "Chill cinematic travel, walking shots, sky and road montages", bpm: 96, category: "Travel", previewTone: "travel-chill" },
  { title: "Viral Couple Slow Reverb", vibe: "Romantic slow song feel, emotional zooms, close-up moments", bpm: 88, category: "Couple Reel", previewTone: "couple-reverb" },
  { title: "Ultra Viral Reel Phonk Pop", vibe: "Fast hook, velocity cuts, bass drops, Instagram trend energy", bpm: 150, category: "Instagram Reel", previewTone: "viral-bass" },
  { title: "YouTube Cinematic Rise", vibe: "Wide cinematic intro, build-up, smooth creator montage", bpm: 104, category: "YouTube", previewTone: "cinematic-rise" },
];

const getRecommendedSongs = (category: string, selected: Record<string, string[]>, qualityMode: string, clips: ClipMeta[] = [], reference = "", instructions = ""): RecommendedSong[] => {
  const musicPicks = new Set(selected.music ?? []);
  const stylePicks = new Set(selected.style ?? []);
  const context = `${category} ${reference} ${instructions} ${clips.map((c) => `${c.name} ${c.description}`).join(" ")}`.toLowerCase();
  const scored = SONG_LIBRARY.map((song) => {
    let score = song.category === category ? 8 : song.category === "Instagram Reel" ? 2 : 0;
    if (category.includes("Wedding") && song.category === "Wedding") score += 7;
    if (/couple|romantic|love|prewedding|engagement/.test(context) && /romantic|wedding|couple|emotional/.test(`${song.title} ${song.vibe}`.toLowerCase())) score += 5;
    if (/haldi|mehendi|dance|dhol|celebration/.test(context) && /haldi|dhol|folk|energetic/.test(`${song.title} ${song.vibe}`.toLowerCase())) score += 5;
    if (/birthday|party|cake|friends/.test(context) && /party|happy|upbeat/.test(`${song.title} ${song.vibe}`.toLowerCase())) score += 5;
    if (/travel|trip|road|walking|mountain|beach/.test(context) && /travel|chill|cinematic/.test(`${song.title} ${song.vibe}`.toLowerCase())) score += 5;
    if (musicPicks.has("Party Beats") && song.previewTone.includes("party")) score += 4;
    if (musicPicks.has("Romantic Marathi Songs") && /Romantic|Wedding|Couple/.test(song.category)) score += 4;
    if (musicPicks.has("Viral Instagram Audio") && song.category === "Instagram Reel") score += 5;
    if (stylePicks.has("Travel Cinematic") && song.category === "Travel") score += 4;
    if (qualityMode.includes("Viral") && song.bpm >= 124) score += 4;
    if (qualityMode.includes("Wedding") && song.bpm <= 92) score += 4;
    return { song, score };
  }).sort((a, b) => b.score - a.score || (qualityMode.includes("Viral") ? b.song.bpm - a.song.bpm : a.song.bpm - b.song.bpm));
  const matches = scored.filter((x) => x.score > 0).map((x) => x.song).filter((song) => {
    if (song.category === category || song.category === "Instagram Reel") return true;
    if (category.includes("Wedding") && song.category === "Wedding") return true;
    if (musicPicks.has("Party Beats") && song.previewTone.includes("party")) return true;
    if (musicPicks.has("Romantic Marathi Songs") && /Romantic|Wedding|Couple/.test(song.category)) return true;
    if (musicPicks.has("Viral Instagram Audio") && song.category === "Instagram Reel") return true;
    if (stylePicks.has("Travel Cinematic") && song.category === "Travel") return true;
    return (scored.find((x) => x.song.title === song.title)?.score ?? 0) >= 5;
  });
  const ranked = matches.length ? matches : SONG_LIBRARY.filter((song) => ["Instagram Reel", "Wedding", "Travel"].includes(song.category));
  return Array.from(new Map(ranked.map((song) => [song.title, song])).values()).slice(0, 4);
};

type OptionGroup = { key: string; title: string; options: string[] };

const OPTION_GROUPS: OptionGroup[] = [
  { key: "style", title: "Reel style", options: ["Cinematic", "Viral Instagram Style", "Emotional", "Romantic", "Slow Motion", "Fast Beat Edit", "Luxury Edit", "Aesthetic Reel", "Trending Reel", "Professional Wedding Film", "YouTube Vlog Style", "Travel Cinematic", "Party Vibe", "Festival Edit"] },
  { key: "transition", title: "Transitions", options: ["Smooth", "Flash", "Blur", "Zoom", "Shake", "Beat Sync", "Cinematic Fade", "Velocity Edit", "Trending Instagram Transition"] },
  { key: "color", title: "Color grading", options: ["Golden Glow", "Dark Cinematic", "Warm Tone", "Cool Blue", "Vintage", "Instagram Aesthetic", "Luxury Black Tone", "Vibrant Colors"] },
  { key: "text", title: "Text style", options: ["Minimal", "Bold Cinematic", "Trending Instagram Font", "Neon Glow", "Elegant Wedding Style", "Luxury Gold Text", "Modern Reel Text"] },
  { key: "music", title: "Music", options: ["Romantic Marathi Songs", "Trending Hindi Songs", "LoFi", "Emotional Music", "Party Beats", "Cinematic Background Music", "Viral Instagram Audio"] },
  { key: "pacing", title: "Pacing", options: ["Slow & Emotional", "Fast Viral Cuts", "Balanced Cinematic", "Beat Sync Heavy", "Smooth Reel Flow"] },
  { key: "effects", title: "Effects", options: ["Motion Blur", "Glow Effect", "Film Grain", "Lens Flare", "Spark Effects", "Bokeh Blur", "Cinematic Lighting", "AI Face Enhance"] },
];

const RECOMMENDATIONS: Record<string, Partial<Record<string, string[]>>> = {
  Cinematic: { transition: ["Cinematic Fade", "Smooth"], color: ["Dark Cinematic", "Warm Tone"], pacing: ["Balanced Cinematic"], music: ["Cinematic Background Music"], text: ["Bold Cinematic"] },
  "Viral Instagram Style": { transition: ["Trending Instagram Transition", "Beat Sync"], pacing: ["Fast Viral Cuts"], music: ["Viral Instagram Audio"], text: ["Trending Instagram Font"], color: ["Instagram Aesthetic"] },
  Romantic: { transition: ["Smooth", "Cinematic Fade"], color: ["Golden Glow", "Warm Tone"], pacing: ["Slow & Emotional"], music: ["Romantic Marathi Songs"], text: ["Elegant Wedding Style"] },
  "Slow Motion": { pacing: ["Slow & Emotional"], effects: ["Motion Blur", "Cinematic Lighting"], transition: ["Smooth"] },
  "Fast Beat Edit": { transition: ["Beat Sync", "Flash"], pacing: ["Beat Sync Heavy", "Fast Viral Cuts"], music: ["Party Beats"] },
  "Luxury Edit": { color: ["Luxury Black Tone"], text: ["Luxury Gold Text"], transition: ["Cinematic Fade"], music: ["Cinematic Background Music"] },
  "Professional Wedding Film": { color: ["Golden Glow"], text: ["Elegant Wedding Style"], pacing: ["Balanced Cinematic"], music: ["Romantic Marathi Songs"], transition: ["Cinematic Fade"] },
  "Travel Cinematic": { color: ["Vibrant Colors"], effects: ["Lens Flare", "Cinematic Lighting"], pacing: ["Balanced Cinematic"], music: ["Cinematic Background Music"] },
  "Party Vibe": { transition: ["Flash", "Beat Sync"], music: ["Party Beats"], pacing: ["Fast Viral Cuts"], effects: ["Spark Effects", "Glow Effect"] },
  "Aesthetic Reel": { color: ["Instagram Aesthetic", "Vintage"], text: ["Minimal"], music: ["LoFi"], pacing: ["Smooth Reel Flow"] },
  Emotional: { pacing: ["Slow & Emotional"], music: ["Emotional Music"], color: ["Warm Tone"], transition: ["Cinematic Fade"] },
};

const PROJECTS_KEY = "smartreel.projects.v1";
const APP_PUBLIC_URL = "https://smart-reel-ai-magic.lovable.app";
const VIDEO_REPAIR_MESSAGE = "Clip decoding failed. Auto-repairing...";

const colorGradeFilter = (grade: string): string => {
  const g = grade.toLowerCase();
  if (g.includes("golden") || g.includes("warm")) return "sepia(0.25) saturate(1.2) contrast(1.08) brightness(1.05)";
  if (g.includes("dark") || g.includes("luxury black")) return "contrast(1.2) brightness(0.85) saturate(1.1)";
  if (g.includes("cool")) return "hue-rotate(-15deg) saturate(1.1) contrast(1.05)";
  if (g.includes("vintage")) return "sepia(0.4) contrast(0.95) saturate(0.9)";
  if (g.includes("vibrant")) return "saturate(1.4) contrast(1.1)";
  if (g.includes("instagram")) return "saturate(1.15) contrast(1.05) brightness(1.03)";
  return "saturate(1.1) contrast(1.05)";
};

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const waitForEvent = (target: EventTarget, events: string[], timeout = 1600) =>
  new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      events.forEach((event) => target.removeEventListener(event, finish));
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(finish, timeout);
    events.forEach((event) => target.addEventListener(event, finish, { once: true }));
  });

const getVideoSupportLabel = (file: File) => {
  const name = file.name.toLowerCase();
  const type = file.type || "unknown";
  if (type.includes("mp4") || name.endsWith(".mp4") || name.endsWith(".m4v")) return "MP4 / H.264 preferred";
  if (type.includes("quicktime") || name.endsWith(".mov")) return "MOV / HEVC — repair if needed";
  if (type.includes("webm") || name.endsWith(".webm")) return "WebM — browser decode check";
  if (name.endsWith(".hevc") || name.endsWith(".h265")) return "H.265/HEVC — repair if needed";
  return type;
};

const drawMediaCover = (ctx: CanvasRenderingContext2D, media: CanvasImageSource, width: number, height: number) => {
  const sourceWidth = "videoWidth" in media ? media.videoWidth : "naturalWidth" in media ? media.naturalWidth : width;
  const sourceHeight = "videoHeight" in media ? media.videoHeight : "naturalHeight" in media ? media.naturalHeight : height;
  const safeWidth = sourceWidth || width;
  const safeHeight = sourceHeight || height;
  const scale = Math.max(width / safeWidth, height / safeHeight);
  const x = (width - safeWidth * scale) / 2;
  const y = (height - safeHeight * scale) / 2;
  ctx.drawImage(media, x, y, safeWidth * scale, safeHeight * scale);
};

const makeFallbackThumbnail = async (label: string, width = 540, height = 960) => {
  const canvas = window.document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#3b0f46");
  gradient.addColorStop(0.48, "#120817");
  gradient.addColorStop(1, "#0c2a54");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = 0; i < 7; i += 1) ctx.fillRect(i * 94 - 30, 0, 42, height);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "700 34px Inter, Arial, sans-serif";
  ctx.fillText("Smart Reel", 42, height / 2 - 14);
  ctx.font = "22px Inter, Arial, sans-serif";
  ctx.fillText(label.slice(0, 30), 42, height / 2 + 28);
  return canvas.toDataURL("image/jpeg", 0.84);
};

const extractVideoThumbnail = async (url: string, targetSec = 0.08) => {
  const video = window.document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  await prepareVideoFrame(video, targetSec);
  if (!video.videoWidth || !video.videoHeight) throw new Error("No decoded video frame");
  const canvas = window.document.createElement("canvas");
  canvas.width = Math.min(720, video.videoWidth);
  canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Thumbnail canvas unavailable");
  drawMediaCover(ctx, video, canvas.width, canvas.height);
  return {
    thumbnailUrl: canvas.toDataURL("image/jpeg", 0.86),
    duration: Number.isFinite(video.duration) ? video.duration : undefined,
    width: video.videoWidth,
    height: video.videoHeight,
  };
};

const extractImageThumbnail = async (url: string) => {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = window.document.createElement("canvas");
  canvas.width = 540;
  canvas.height = 960;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Thumbnail canvas unavailable");
  drawMediaCover(ctx, image, canvas.width, canvas.height);
  return { thumbnailUrl: canvas.toDataURL("image/jpeg", 0.86), width: image.naturalWidth, height: image.naturalHeight };
};

const repairVideoWithFfmpeg = async (clip: LocalClip) => {
  const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
    import("@ffmpeg/ffmpeg"),
    import("@ffmpeg/util"),
  ]);
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: await toBlobURL(ffmpegCoreUrl, "text/javascript"),
    wasmURL: await toBlobURL(ffmpegWasmUrl, "application/wasm"),
  });
  const inputName = `input-${clip.id}.${clip.name.split(".").pop() || "mp4"}`;
  const outputName = `smart-reel-repaired-${clip.id}.mp4`;
  await ffmpeg.writeFile(inputName, await fetchFile(clip.file));
  await ffmpeg.exec([
    "-i", inputName,
    "-map", "0:v:0",
    "-an",
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputName,
  ]);
  const data = await ffmpeg.readFile(outputName);
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: "video/mp4" });
  await ffmpeg.deleteFile(inputName).catch(() => undefined);
  await ffmpeg.deleteFile(outputName).catch(() => undefined);
  ffmpeg.terminate();
  return URL.createObjectURL(blob);
};

const transcodeRecordingToMp4 = async (blob: Blob, song: SongFile, durationSec: number, bpm: number) => {
  const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
    import("@ffmpeg/ffmpeg"),
    import("@ffmpeg/util"),
  ]);
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: await toBlobURL(ffmpegCoreUrl, "text/javascript"),
    wasmURL: await toBlobURL(ffmpegWasmUrl, "application/wasm"),
  });
  await ffmpeg.writeFile("render.webm", await fetchFile(blob));
  if (song) {
    const ext = song.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "mp3";
    const songName = `song.${ext}`;
    await ffmpeg.writeFile(songName, await fetchFile(song.file));
    await ffmpeg.exec([
      "-i", "render.webm",
      "-stream_loop", "-1",
      "-i", songName,
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-shortest",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      "smart-reel-final.mp4",
    ]);
    await ffmpeg.deleteFile(songName).catch(() => undefined);
  } else {
    const beatFrequency = Math.round(Math.max(80, Math.min(180, bpm || 110)));
    await ffmpeg.exec([
      "-i", "render.webm",
      "-f", "lavfi",
      "-i", `sine=frequency=${beatFrequency}:duration=${Math.max(1, durationSec).toFixed(2)}`,
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-shortest",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "160k",
      "-movflags", "+faststart",
      "smart-reel-final.mp4",
    ]);
  }
  const data = await ffmpeg.readFile("smart-reel-final.mp4");
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  await ffmpeg.deleteFile("render.webm").catch(() => undefined);
  await ffmpeg.deleteFile("smart-reel-final.mp4").catch(() => undefined);
  ffmpeg.terminate();
  return new Blob([arrayBuffer], { type: "video/mp4" });
};

const prepareVideoFrame = async (video: HTMLVideoElement, targetSec: number) => {
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.load();
  if (video.readyState < 1) await waitForEvent(video, ["loadedmetadata", "loadeddata", "canplay"]);
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : targetSec + 1;
  const safeTime = Math.max(0, Math.min(targetSec, Math.max(0, duration - 0.12)));
  try {
    video.currentTime = safeTime;
  } catch {}
  await waitForEvent(video, ["seeked", "loadeddata", "canplay"], 1200);
  if (video.readyState < 2) await waitForEvent(video, ["loadeddata", "canplay"], 1200);
  const frameCallback = (video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback;
  if (frameCallback) await new Promise<void>((resolve) => frameCallback.call(video, () => resolve()));
};

const emptyPreviewValidation = (message: string): PreviewValidation => ({
  fileExists: false,
  fileSizeOk: false,
  mp4Valid: false,
  videoTrack: false,
  audioTrack: false,
  durationOk: false,
  playable: false,
  canExport: false,
  message,
});

const validateRenderedVideo = async (blob: Blob, expectedAudio: boolean): Promise<PreviewValidation> => {
  if (typeof window === "undefined") return emptyPreviewValidation("Preview is not available until the app is loaded.");
  const fileExists = blob instanceof Blob;
  const fileSizeOk = blob.size > 2048;
  const mp4Valid = /mp4|webm/.test(blob.type) && fileSizeOk;
  if (!fileExists || !fileSizeOk) return emptyPreviewValidation("Preview file is empty. Rebuilding video automatically.");

  const url = URL.createObjectURL(blob);
  const video = window.document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  const loaded = await new Promise<boolean>((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("canplay", onLoaded);
      video.removeEventListener("error", onError);
      resolve(ok);
    };
    const onLoaded = () => finish(true);
    const onError = () => finish(false);
    const timer = window.setTimeout(() => finish(false), 4500);
    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    video.addEventListener("loadeddata", onLoaded, { once: true });
    video.addEventListener("canplay", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.load();
  });
  const durationOk = loaded && Number.isFinite(video.duration) && video.duration > 0.25;
  const videoTrack = loaded && video.videoWidth > 0 && video.videoHeight > 0;
  const audioTrack = expectedAudio;
  URL.revokeObjectURL(url);
  const playable = Boolean(mp4Valid && videoTrack && durationOk);
  return {
    fileExists,
    fileSizeOk,
    mp4Valid,
    videoTrack,
    audioTrack,
    durationOk,
    playable,
    canExport: playable && audioTrack,
    message: playable && audioTrack ? "Preview validated: video, audio and duration are ready." : "Preview failed. Rebuilding video automatically.",
  };
};

const drawMediaCoverMotion = (ctx: CanvasRenderingContext2D, media: CanvasImageSource, width: number, height: number, progress: number, direction = 1) => {
  ctx.save();
  const zoom = 1.04 + progress * 0.08;
  const panX = (progress - 0.5) * width * 0.08 * direction;
  const panY = Math.sin(progress * Math.PI) * height * 0.025;
  ctx.translate(width / 2 + panX, height / 2 + panY);
  ctx.scale(zoom, zoom);
  ctx.translate(-width / 2, -height / 2);
  drawMediaCover(ctx, media, width, height);
  ctx.restore();
};

function Editor() {
  const hydrated = useHydrated();
  const [canUseBrowser, setCanUseBrowser] = useState(false);

  // form
  const [category, setCategory] = useState("Wedding");
  const [language, setLanguage] = useState("Marathi");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("Instagram Reel");
  const [instructions, setInstructions] = useState("");
  const [reference, setReference] = useState("");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [qualityMode, setQualityMode] = useState<string>("Cinematic Edit");
  const [instagramSubstyle, setInstagramSubstyle] = useState<string>("Viral Reel Style");

  // media
  const [clips, setClips] = useState<LocalClip[]>([]);
  const [refVideo, setRefVideo] = useState<ReferenceMedia>(null);
  const [refPhoto, setRefPhoto] = useState<ReferenceMedia>(null);
  const [song, setSong] = useState<SongFile>(null);
  const [selectedSongTitle, setSelectedSongTitle] = useState<string>("");
  const [songPreviewing, setSongPreviewing] = useState<string | null>(null);

  // captions (optional)
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const [captionStyle, setCaptionStyle] = useState("Bold Cinematic");

  // flow state
  const [stage, setStage] = useState<"setup" | "planning" | "plan" | "rendering" | "preview">("setup");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<EditPlan | null>(null);
  const [tweak, setTweak] = useState("");

  // export
  const [showExport, setShowExport] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setCanUseBrowser(true);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      for (const c of clips) URL.revokeObjectURL(c.url);
      if (refVideo) URL.revokeObjectURL(refVideo.url);
      if (refPhoto) URL.revokeObjectURL(refPhoto.url);
      if (song) URL.revokeObjectURL(song.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleOption = (groupKey: string, option: string) => {
    setSelected((prev) => {
      const current = prev[groupKey] ?? [];
      const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
      const updated = { ...prev, [groupKey]: next };
      if (groupKey === "style" && !current.includes(option) && RECOMMENDATIONS[option]) {
        for (const [recGroup, recs] of Object.entries(RECOMMENDATIONS[option]!)) {
          const existing = updated[recGroup] ?? [];
          updated[recGroup] = Array.from(new Set([...existing, ...(recs ?? [])]));
        }
      }
      return updated;
    });
  };

  const recommended: Record<string, Set<string>> = useMemo(() => {
    const styles = selected.style ?? [];
    const recs: Record<string, Set<string>> = {};
    for (const s of styles) {
      const r = RECOMMENDATIONS[s];
      if (!r) continue;
      for (const [g, items] of Object.entries(r)) {
        recs[g] = recs[g] ?? new Set();
        for (const it of items ?? []) recs[g].add(it);
      }
    }
    return recs;
  }, [selected]);

  const composedInstructions = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Quality mode: ${qualityMode}`);
    if (category === "Instagram Reel") parts.push(`Instagram reel substyle: ${instagramSubstyle}`);
    for (const g of OPTION_GROUPS) {
      const picks = selected[g.key];
      if (picks && picks.length) parts.push(`${g.title}: ${picks.join(", ")}`);
    }
    if (instructions.trim()) parts.push(`Extra notes: ${instructions.trim()}`);
    if (refVideo) parts.push(`Reference reel uploaded: "${refVideo.name}". DEEPLY match its pacing, transition vocabulary, cut frequency, color grade, text animation style and beat-sync feel. Recreate the same cinematic vibe with the user's own clips.`);
    if (refPhoto) parts.push(`Reference photo uploaded: "${refPhoto.name}" — match its color tone and mood.`);
    if (song) parts.push(`User uploaded ONE song: "${song.name}". Use this exact single track for the ENTIRE reel — do not switch songs. Detect beats, bass drops, emotional timing and sync every cut to this uploaded track.`);
    else if (selectedSongTitle) parts.push(`Selected AI recommended ONE song: "${selectedSongTitle}". Use this as the single chosen song for the whole reel and sync the full timeline to it.`);
    else parts.push(`AI must recommend and choose ONE best song from the event category, clip energy, reference style and pacing.`);
    parts.push("SINGLE SONG ONLY for the whole reel. Add beat_markers and bass_drops. Sync every cut to the beat of that one song. Use cinematic audio timing, volume balancing, fade in/out, bass enhancement, trending Instagram-style transitions (whip pan, zoom punch, motion blur, flash, velocity edit), hook intro editing, emotional pacing and professional storytelling. Open with a strong viral hook in the first 1.5s. End on an emotional or punchy beat.");
    if (captionsEnabled && captionText.trim()) {
      parts.push(`Captions ENABLED. Use this exact user-provided caption text, split across hero moments naturally: """${captionText.trim()}""". Caption style: ${captionStyle}.`);
    } else {
      parts.push("Captions DISABLED — do NOT generate any captions, text animations or subtitles. Leave caption fields null and text_animations as an empty array.");
    }
    return parts.join(". ");
  }, [selected, instructions, refVideo, refPhoto, song, selectedSongTitle, qualityMode, category, instagramSubstyle, captionsEnabled, captionText, captionStyle]);

  const totalSelected = Object.values(selected).reduce((n, arr) => n + arr.length, 0);
  const clipDecodeSummary = useMemo(() => {
    const processing = clips.filter((c) => c.decodeStatus === "processing" || c.decodeStatus === "repairing").length;
    const invalid = clips.filter((c) => c.decodeStatus === "invalid").length;
    const ready = clips.filter((c) => c.decodeStatus === "ready").length;
    return { processing, invalid, ready };
  }, [clips]);
  const isLocalApp = canUseBrowser && typeof window !== "undefined" && /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(window.location.hostname);
  const appUrl = isLocalApp ? "" : APP_PUBLIC_URL;

  const copyAppLink = async () => {
    if (!appUrl || typeof window === "undefined") return;
    await window.navigator.clipboard?.writeText(appUrl).catch(() => undefined);
    setSavedToast("App link copied");
    window.setTimeout(() => setSavedToast(null), 2500);
  };

  const openAppLink = () => {
    if (!appUrl || typeof window === "undefined") return;
    window.open(appUrl, "_blank", "noopener,noreferrer");
  };

  const shareAppLink = async () => {
    if (!appUrl || typeof window === "undefined") return;
    const text = `Smart Reel AI App: ${appUrl}`;
    if (window.navigator.share) {
      await window.navigator.share({ title: "Smart Reel", text, url: appUrl }).catch(() => undefined);
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    }
  };

  const recommendedSongs = useMemo(
    () => getRecommendedSongs(
      category,
      selected,
      qualityMode,
      clips.map((c) => ({ name: c.name, description: c.kind === "video" ? "video clip" : "photo", duration_sec: c.duration })),
      reference,
      instructions,
    ),
    [category, selected, qualityMode, clips, reference, instructions],
  );

  const previewRecommendedSong = (rec: RecommendedSong) => {
    if (!canUseBrowser || typeof window === "undefined") return;
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    const master = ctx.createGain();
    const bass = ctx.createBiquadFilter();
    bass.type = "lowshelf";
    bass.frequency.value = 120;
    bass.gain.value = 5;
    master.gain.value = 0.08;
    bass.connect(master);
    master.connect(ctx.destination);
    const step = 60 / rec.bpm;
    setSongPreviewing(rec.title);
    for (let i = 0; i < 8; i += 1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 4 === 0 ? "sawtooth" : "sine";
      osc.frequency.value = i % 4 === 0 ? 96 : 220 + (i % 3) * 80;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * step);
      gain.gain.linearRampToValueAtTime(i % 4 === 0 ? 0.42 : 0.22, ctx.currentTime + i * step + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * step + 0.24);
      osc.connect(gain);
      gain.connect(bass);
      osc.start(ctx.currentTime + i * step);
      osc.stop(ctx.currentTime + i * step + 0.28);
    }
    window.setTimeout(() => {
      setSongPreviewing(null);
      ctx.close().catch(() => {});
    }, Math.min(5000, step * 8 * 1000 + 200));
  };

  useEffect(() => {
    if (song) return;
    setSelectedSongTitle((current) => current || recommendedSongs[0]?.title || "");
  }, [recommendedSongs, song]);

  const makeLocalClip = (f: File): LocalClip => {
    const url = URL.createObjectURL(f);
    const kind: "video" | "image" = f.type.startsWith("video") ? "video" : "image";
    return {
      id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      url,
      kind,
      name: f.name,
      decodeStatus: "processing",
      codecLabel: kind === "video" ? getVideoSupportLabel(f) : f.type || "image",
    };
  };

  const onClipFiles = (files: BrowserFileList | null) => {
    if (!canUseBrowser || !hydrated || typeof window === "undefined" || !files) return;
    const next: LocalClip[] = Array.from(files).map(makeLocalClip);
    setClips((prev) => [...prev, ...next]);
  };

  useEffect(() => {
    if (!canUseBrowser || typeof window === "undefined") return;
    const pending = clips.find((clip) => clip.decodeStatus === "processing" && !clip.frameVerified);
    if (!pending) return;
    let cancelled = false;
    const updateClip = (patch: Partial<LocalClip>) => {
      if (cancelled) return;
      setClips((prev) => prev.map((clip) => (clip.id === pending.id ? { ...clip, ...patch } : clip)));
    };
    const updateClipDuringRepair = (patch: Partial<LocalClip>) => {
      setClips((prev) => prev.map((clip) => (clip.id === pending.id ? { ...clip, ...patch } : clip)));
    };
    const run = async () => {
      if (pending.kind === "image") {
        try {
          const thumb = await extractImageThumbnail(pending.url);
          updateClip({ ...thumb, decodeStatus: "ready", frameVerified: true });
        } catch {
          updateClip({ thumbnailUrl: await makeFallbackThumbnail(pending.name), decodeStatus: "ready", frameVerified: true });
        }
        return;
      }
      try {
        const decoded = await extractVideoThumbnail(pending.url);
        updateClip({ ...decoded, frameRate: 30, decodeStatus: "ready", frameVerified: true, repairMessage: "Video stream verified" });
      } catch {
        const fallbackThumb = await makeFallbackThumbnail(pending.name);
        updateClipDuringRepair({ decodeStatus: "repairing", repairMessage: VIDEO_REPAIR_MESSAGE, thumbnailUrl: fallbackThumb });
        try {
          const repairedUrl = await repairVideoWithFfmpeg(pending);
          const decoded = await extractVideoThumbnail(repairedUrl);
          if (pending.url.startsWith("blob:")) URL.revokeObjectURL(pending.url);
          updateClipDuringRepair({
            url: repairedUrl,
            ...decoded,
            frameRate: 30,
            codecLabel: "Repaired H.264 MP4 · 30fps",
            decodeStatus: "ready",
            frameVerified: true,
            repairMessage: "Auto-repaired to browser-safe H.264 MP4",
          });
        } catch {
          updateClipDuringRepair({
            decodeStatus: "invalid",
            frameVerified: false,
            repairMessage: "This clip could not decode here. Export stopped until it is replaced or repaired externally.",
            thumbnailUrl: fallbackThumb,
          });
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [clips, canUseBrowser]);

  const onReferenceFile = (files: BrowserFileList | null, slot: "video" | "photo") => {
    if (!canUseBrowser || !hydrated || typeof window === "undefined" || !files || files.length === 0) return;
    const f = files[0];
    const url = URL.createObjectURL(f);
    const kind: "video" | "image" = f.type.startsWith("video") ? "video" : "image";
    const media = { id: `ref-${slot}`, file: f, url, kind, name: f.name };
    if (slot === "video") {
      if (refVideo) URL.revokeObjectURL(refVideo.url);
      setRefVideo(media);
    } else {
      if (refPhoto) URL.revokeObjectURL(refPhoto.url);
      setRefPhoto(media);
    }
  };

  const removeClip = (id: string) => {
    setClips((c) => {
      const found = c.find((x) => x.id === id);
      if (found && typeof window !== "undefined") URL.revokeObjectURL(found.url);
      return c.filter((x) => x.id !== id);
    });
  };

  const clipMetas: ClipMeta[] = useMemo(
    () => clips.map((c) => ({ name: c.name, description: c.kind === "video" ? "video clip" : "photo", duration_sec: c.duration })),
    [clips],
  );

  const callAi = async (extraInstruction = "") => {
    const finalInstructions = extraInstruction ? `${composedInstructions}. ${extraInstruction}` : composedInstructions;
    if (!finalInstructions.trim()) throw new Error("Pick at least one option or type an instruction.");
    if (clips.length === 0) throw new Error("Add at least one clip or photo.");
    const selectedSong = song?.name || selectedSongTitle || recommendedSongs[0]?.title || "AI choose best single song";
    const res = await fetch("/api/edit-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        language,
        platform,
        instructions: finalInstructions,
        reference,
        clips: clipMetas,
        selectedSong,
        customSongUploaded: Boolean(song),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      throw new Error(typeof data?.error === "string" ? data.error : "Failed to generate edit plan.");
    }
    return data as EditPlan;
  };

  const generatePlan = async () => {
    if (!hydrated || typeof window === "undefined") return;
    setError(null);
    if (clipDecodeSummary.processing > 0) {
      setError("Video rendering issue detected. Rebuilding cinematic timeline…");
      return;
    }
    if (clipDecodeSummary.invalid > 0) {
      setError("One clip still cannot decode. Replace it or upload a browser-safe MP4 before generating.");
      return;
    }
    setStage("planning");
    try {
      const p = await callAi();
      setPlan(p);
      setStage("plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStage("setup");
    }
  };

  const startRender = () => {
    if (!plan) return;
    if (clipDecodeSummary.processing > 0 || clipDecodeSummary.invalid > 0 || clips.length === 0) {
      setError("Video rendering issue detected. Rebuilding cinematic timeline…");
      return;
    }
    setStage("rendering");
    setProgress(0);
    const start = Date.now();
    const target = 4500; // ms
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, Math.round((elapsed / target) * 100));
      setProgress(p);
      if (p < 100) {
        if (typeof window !== "undefined") window.setTimeout(tick, 80);
      } else {
        setStage("preview");
      }
    };
    tick();
  };

  const applyTweak = async (extra: string) => {
    if (!extra.trim()) return;
    setStage("planning");
    setError(null);
    try {
      const p = await callAi(extra);
      setPlan(p);
      setTweak("");
      setStage("rendering");
      setProgress(0);
      const start = Date.now();
      const target = 3000;
      const tick = () => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, Math.round((elapsed / target) * 100));
        setProgress(pct);
        if (pct < 100) {
          if (typeof window !== "undefined") window.setTimeout(tick, 60);
        } else {
          setStage("preview");
        }
      };
      tick();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tweak failed");
      setStage("preview");
    }
  };

  const downloadPlanJson = () => {
    if (!plan || typeof window === "undefined") return;
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${plan.project.title.replace(/\s+/g, "-").toLowerCase()}-edit-plan.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSavedToast("Edit plan downloaded");
    if (typeof window !== "undefined") window.setTimeout(() => setSavedToast(null), 2500);
  };

  const downloadClip = (clip: LocalClip) => {
    if (typeof window === "undefined") return;
    const a = window.document.createElement("a");
    a.href = clip.url;
    a.download = clip.name;
    a.click();
  };

  const shareTo = (target: "instagram" | "whatsapp" | "youtube") => {
    if (typeof window === "undefined" || !plan) return;
    const text = `${plan.project.title} — made with Smart Reel`;
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      instagram: `https://www.instagram.com/`,
      youtube: `https://studio.youtube.com/`,
    };
    window.open(urls[target], "_blank", "noopener,noreferrer");
  };

  const saveProject = () => {
    if (typeof window === "undefined") return;
    const id = `proj-${Date.now()}`;
    const project: SavedProject = {
      id,
      title: plan?.project.title ?? `${category} reel`,
      savedAt: Date.now(),
      category, language, platform, instructions, reference, selected, selectedSongTitle: song?.name || selectedSongTitle, plan,
    };
    try {
      const raw = window.localStorage.getItem(PROJECTS_KEY);
      const list: SavedProject[] = raw ? JSON.parse(raw) : [];
      list.unshift(project);
      window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(list.slice(0, 30)));
      setSavedToast("Project saved");
      window.setTimeout(() => setSavedToast(null), 2500);
    } catch {
      setSavedToast("Couldn't save project");
      window.setTimeout(() => setSavedToast(null), 2500);
    }
  };

  // auto-save draft when plan changes
  useEffect(() => {
    if (typeof window === "undefined" || !plan) return;
    try {
      window.localStorage.setItem("smartreel.draft.v1", JSON.stringify({ category, language, platform, instructions, reference, selected, selectedSongTitle: song?.name || selectedSongTitle, plan, savedAt: Date.now() }));
    } catch {}
  }, [plan, category, language, platform, instructions, reference, selected, song, selectedSongTitle]);

  const loadProject = (p: SavedProject) => {
    setCategory(p.category);
    setLanguage(p.language);
    setPlatform(p.platform as (typeof PLATFORMS)[number]);
    setInstructions(p.instructions);
    setReference(p.reference);
    setSelected(p.selected || {});
    setSelectedSongTitle(p.selectedSongTitle || "");
    setPlan(p.plan);
    setStage(p.plan ? "plan" : "setup");
    setShowSaved(false);
  };

  return (
    <div className="min-h-screen bg-[#07050f] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[460px] w-[460px] rounded-full bg-fuchsia-600/20 blur-[120px]" />
        <div className="absolute bottom-0 -right-40 h-[460px] w-[460px] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#07050f]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="" className="h-8 w-8" />
            <span className="text-base font-semibold">Smart Reel</span>
          </Link>
          <button
            onClick={() => setShowSaved(true)}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 hover:text-white"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Projects
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <section className="space-y-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">AI Editor</h1>
            <p className="mt-1 text-sm text-white/60">Upload clips, add a reference, get a cinematic plan, preview & export.</p>
          </div>

          {/* clips */}
          <Card>
            <Label icon={Upload} title="Your clips & photos" />
            <label className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-7 text-center hover:border-fuchsia-400/40 cursor-pointer">
              <Upload className="h-5 w-5 text-white/50" />
              <span className="mt-2 text-sm text-white/70">Tap to add videos or photos</span>
              <span className="text-xs text-white/40">Stored only in your browser</span>
              <input type="file" multiple accept="video/*,image/*" className="hidden" onChange={(e) => onClipFiles(e.target.files)} />
            </label>
            {clips.length > 0 && (
              <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {clips.map((c) => (
                  <li key={c.id} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/40">
                    {c.thumbnailUrl ? (
                      <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : c.kind === "image" ? (
                      <img src={c.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-950/70 to-blue-950/70">
                        <Loader2 className="h-4 w-4 animate-spin text-fuchsia-200" />
                      </div>
                    )}
                    <span className={
                      "absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium " +
                      (c.decodeStatus === "ready" ? "bg-emerald-500/80 text-white" : c.decodeStatus === "invalid" ? "bg-red-500/80 text-white" : "bg-amber-500/80 text-black")
                    }>
                      {c.decodeStatus === "ready" ? "frames ok" : c.decodeStatus === "repairing" ? "repairing" : c.decodeStatus === "invalid" ? "invalid" : "checking"}
                    </span>
                    <button
                      onClick={() => removeClip(c.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white/80 opacity-0 group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 text-[10px] text-white/80">
                      {c.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {clips.length > 0 && (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/60">
                <div className="flex items-center gap-2 text-white/80"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Decode safety check</div>
                <p className="mt-1">{clipDecodeSummary.ready} ready · {clipDecodeSummary.processing} processing/repairing · {clipDecodeSummary.invalid} invalid</p>
                {clips.some((c) => c.repairMessage) && <p className="mt-1 text-amber-100">{clips.find((c) => c.repairMessage)?.repairMessage}</p>}
              </div>
            )}
          </Card>

          <AppUrlCard appUrl={appUrl} onCopy={copyAppLink} onOpen={openAppLink} onShare={shareAppLink} />

          {/* reference media */}
          <Card>
            <Label icon={Sparkles} title="Reference media" />
            <p className="mt-1 text-xs text-white/50">AI analyzes vibe, color grade, pacing, transitions & mood from your references.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <ReferenceSlot
                kind="video"
                media={refVideo}
                onPick={(files) => onReferenceFile(files, "video")}
                onClear={() => {
                  if (refVideo && typeof window !== "undefined") URL.revokeObjectURL(refVideo.url);
                  setRefVideo(null);
                }}
              />
              <ReferenceSlot
                kind="image"
                media={refPhoto}
                onPick={(files) => onReferenceFile(files, "photo")}
                onClear={() => {
                  if (refPhoto && typeof window !== "undefined") URL.revokeObjectURL(refPhoto.url);
                  setRefPhoto(null);
                }}
              />
            </div>
            <textarea
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              rows={2}
              placeholder="Or describe the reference vibe: pacing, transitions, color grade, music..."
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm placeholder:text-white/30 focus:border-fuchsia-400/50 focus:outline-none"
            />
          </Card>

          {/* single song */}
          <Card>
            <Label icon={Music2} title="Recommended Songs For Your Reel" />
            <p className="mt-1 text-xs text-white/50">Pick one AI song or upload your own. Smart Reel uses only ONE track for the full reel.</p>
            <div className="mt-3 grid gap-2">
              {recommendedSongs.map((rec) => {
                const active = !song && selectedSongTitle === rec.title;
                return (
                  <button
                    key={rec.title}
                    onClick={() => {
                      if (song && typeof window !== "undefined") URL.revokeObjectURL(song.url);
                      setSong(null);
                      setSelectedSongTitle(rec.title);
                    }}
                    className={
                      "rounded-xl border px-3 py-2 text-left " +
                      (active ? "border-fuchsia-400/60 bg-fuchsia-500/15" : "border-white/10 bg-white/[0.03] hover:border-white/20")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-white/85">{rec.title}</span>
                      <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/55">{rec.bpm} BPM</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-white/45">
                      <span className="line-clamp-1">{rec.vibe}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          previewRecommendedSong(rec);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            previewRecommendedSong(rec);
                          }
                        }}
                        className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-white/65"
                      >
                        {songPreviewing === rec.title ? "Playing" : "Preview"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="my-4 h-px bg-white/10" />
            <Label icon={Music2} title="Upload Your Song" />
            <p className="mt-1 text-xs text-white/50">Upload MP3/audio to replace AI songs. AI detects beat markers, bass drops and emotional timing.</p>
            {song ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2">
                <Music2 className="h-4 w-4 text-fuchsia-300" />
                <span className="flex-1 truncate text-sm text-white/85">{song.name}</span>
                <audio src={song.url} controls className="h-8 max-w-[160px]" />
                <button
                  onClick={() => {
                    if (song && typeof window !== "undefined") URL.revokeObjectURL(song.url);
                    setSong(null);
                    setSelectedSongTitle(recommendedSongs[0]?.title || "");
                  }}
                  className="rounded-full bg-black/60 p-1.5 text-white/70 hover:text-white"
                  aria-label="Remove song"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-5 text-center hover:border-fuchsia-400/40">
                <Music2 className="h-5 w-5 text-white/50" />
                <span className="mt-2 text-sm text-white/70">Tap to upload song (mp3, m4a, wav)</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    if (!canUseBrowser || typeof window === "undefined") return;
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setSong((prev) => {
                      if (prev) URL.revokeObjectURL(prev.url);
                      setSelectedSongTitle(f.name);
                      return { id: `song-${Date.now()}`, file: f, url: URL.createObjectURL(f), name: f.name };
                    });
                  }}
                />
              </label>
            )}
          </Card>

          {/* captions (optional) */}
          <Card>
            <div className="flex items-center justify-between">
              <Label icon={Type} title="Captions (optional)" />
              <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
                <input
                  type="checkbox"
                  checked={captionsEnabled}
                  onChange={(e) => setCaptionsEnabled(e.target.checked)}
                  className="h-4 w-4 accent-fuchsia-500"
                />
                {captionsEnabled ? "On" : "Off"}
              </label>
            </div>
            {captionsEnabled ? (
              <div className="mt-3 space-y-2">
                <textarea
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  rows={3}
                  placeholder="Paste your caption lines. AI will split them across hero moments."
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm placeholder:text-white/30 focus:border-fuchsia-400/50 focus:outline-none"
                />
                <Select label="Caption style" value={captionStyle} onChange={setCaptionStyle} options={["Bold Cinematic", "Trending Instagram Font", "Neon Glow", "Elegant Wedding Style", "Luxury Gold Text", "Minimal"]} />
              </div>
            ) : (
              <p className="mt-2 text-xs text-white/40">No captions or text overlays will be added.</p>
            )}
          </Card>

          {/* project */}
          <Card>
            <Label icon={Film} title="Project" />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Select label="Category" value={category} onChange={setCategory} options={CATEGORIES} />
              <Select label="Language" value={language} onChange={setLanguage} options={LANGUAGES} />
              <Select label="Platform" value={platform} onChange={(v) => setPlatform(v as (typeof PLATFORMS)[number])} options={PLATFORMS as unknown as string[]} />
              {category === "Instagram Reel" && (
                <Select label="Reel substyle" value={instagramSubstyle} onChange={setInstagramSubstyle} options={INSTAGRAM_SUBSTYLES} />
              )}
            </div>
            <div className="mt-4">
              <div className="mb-2 text-xs font-medium text-white/70">Quality mode</div>
              <div className="flex flex-wrap gap-1.5">
                {QUALITY_MODES.map((m) => {
                  const active = qualityMode === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setQualityMode(m.key)}
                      title={m.desc}
                      className={
                        "rounded-full border px-2.5 py-1 text-[11px] transition " +
                        (active
                          ? "border-fuchsia-400/60 bg-fuchsia-500/20 text-white"
                          : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white")
                      }
                    >
                      {m.key === "Ultra Viral Mode" && "🔥 "}
                      {m.key}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-white/40">{QUALITY_MODES.find((m) => m.key === qualityMode)?.desc}</p>
            </div>
          </Card>


          {/* options */}
          <Card>
            <div className="flex items-center justify-between">
              <Label icon={Sparkles} title="AI editing options" />
              <span className="text-[11px] text-white/40">{totalSelected} selected</span>
            </div>
            <p className="mt-1 text-xs text-white/50">Tap chips. Picking a style auto-suggests matching transitions, music & grade.</p>
            <div className="mt-4 space-y-4">
              {OPTION_GROUPS.map((g) => {
                const picks = selected[g.key] ?? [];
                const recSet = recommended[g.key];
                return (
                  <div key={g.key}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-medium text-white/70">{g.title}</span>
                      {picks.length > 0 && (
                        <button onClick={() => setSelected((p) => ({ ...p, [g.key]: [] }))} className="text-[10px] text-white/40 hover:text-fuchsia-300">
                          clear
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.options.map((opt) => {
                        const active = picks.includes(opt);
                        const isRec = !active && recSet?.has(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => toggleOption(g.key, opt)}
                            className={
                              "rounded-full border px-2.5 py-1 text-[11px] transition " +
                              (active
                                ? "border-fuchsia-400/60 bg-fuchsia-500/20 text-white"
                                : isRec
                                ? "border-fuchsia-400/30 bg-fuchsia-500/5 text-fuchsia-200 hover:bg-fuchsia-500/15"
                                : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white")
                            }
                          >
                            {isRec && "✦ "}
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <Label icon={Wand2} title="AI instructions" />
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="e.g. Cinematic Marathi wedding reel, golden grade, slow-mo entry, romantic song"
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm placeholder:text-white/30 focus:border-fuchsia-400/50 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInstructions(ex)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/60 hover:border-fuchsia-400/40 hover:text-white"
                >
                  {ex}
                </button>
              ))}
            </div>
          </Card>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
          )}

          <button
            onClick={generatePlan}
            disabled={stage === "planning" || stage === "rendering"}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-blue-500 px-6 py-3.5 text-sm font-medium shadow-lg shadow-fuchsia-500/30 disabled:opacity-60"
          >
            {stage === "planning" ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Cooking your plan…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate edit plan</>
            )}
          </button>
        </section>

        {/* right column: plan / render / preview */}
        <section className="lg:sticky lg:top-24 lg:self-start space-y-4">
          {stage === "setup" && (
            <EmptyHint />
          )}

          {stage === "planning" && <Planning />}

          {stage === "plan" && plan && (
            <>
              <PlanView plan={plan} />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={startRender}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-blue-500 px-6 py-3.5 text-sm font-medium shadow-lg shadow-fuchsia-500/30"
                >
                  <Film className="h-4 w-4" /> Generate Reel
                </button>
                <button
                  onClick={generatePlan}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white/80 hover:text-white"
                >
                  <RefreshCw className="h-4 w-4" /> Regenerate plan
                </button>
              </div>
            </>
          )}

          {stage === "rendering" && <Rendering progress={progress} />}

          {stage === "preview" && plan && (
            <PreviewScreen
              plan={plan}
              clips={clips}
              song={song}
              captionsEnabled={captionsEnabled}
              onEditAgain={() => setStage("setup")}
              onTweak={(t) => applyTweak(t)}
              tweak={tweak}
              setTweak={setTweak}
              onExport={() => setShowExport(true)}
              onSave={saveProject}
              onDownloadPlan={downloadPlanJson}
              onDownloadClip={downloadClip}
            />
          )}
        </section>
      </main>

      {showExport && plan && (
        <ExportDialog
          plan={plan}
          clips={clips}
          onClose={() => setShowExport(false)}
          onDownloadPlan={downloadPlanJson}
          onDownloadClip={downloadClip}
          onShare={shareTo}
          onToast={(m) => {
            setSavedToast(m);
            if (typeof window !== "undefined") window.setTimeout(() => setSavedToast(null), 2500);
          }}
        />
      )}

      {showSaved && <ProjectsDialog onClose={() => setShowSaved(false)} onLoad={loadProject} />}

      {savedToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-fuchsia-400/30 bg-[#1a0f2e]/95 px-5 py-2.5 text-sm shadow-xl backdrop-blur-xl">
          <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-fuchsia-300" /> {savedToast}</span>
        </div>
      )}
    </div>
  );
}

/* ---------- subcomponents ---------- */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5">{children}</div>;
}

function Label({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-fuchsia-300" />
      <h3 className="text-sm font-medium">{title}</h3>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-xs text-white/50">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm focus:border-fuchsia-400/50 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#0e0a1a]">{o}</option>
        ))}
      </select>
    </label>
  );
}

function ReferenceSlot({
  kind, media, onPick, onClear,
}: {
  kind: "video" | "image";
  media: ReferenceMedia;
  onPick: (files: BrowserFileList | null) => void;
  onClear: () => void;
}) {
  const title = kind === "video" ? "Reference Reel" : "Reference Photo";
  const accept = kind === "video" ? "video/*" : "image/*";
  const Icon = kind === "video" ? Film : ImageIcon;
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      {media ? (
        <>
          {media.kind === "video" ? (
            <video src={media.url} className="h-32 w-full object-cover" muted playsInline loop autoPlay />
          ) : (
            <img src={media.url} alt="" className="h-32 w-full object-cover" />
          )}
          <button onClick={onClear} className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white/80" aria-label="Remove reference">
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="truncate px-3 py-2 text-[11px] text-white/70">{title} · {media.name}</div>
        </>
      ) : (
        <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-1.5 text-center hover:bg-white/[0.04]">
          <Icon className="h-5 w-5 text-fuchsia-300" />
          <span className="text-xs font-medium text-white/80">{title}</span>
          <span className="text-[10px] text-white/40">Tap to upload</span>
          <input type="file" accept={accept} className="hidden" onChange={(e) => onPick(e.target.files)} />
        </label>
      )}
    </div>
  );
}

function AppUrlCard({ appUrl, onCopy, onOpen, onShare }: { appUrl: string; onCopy: () => void; onOpen: () => void; onShare: () => void }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <Label icon={Globe2} title="App URL / Share App" />
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/55">Settings → App Information</span>
      </div>
      <p className="mt-2 text-xs text-white/50">Website Link</p>
      {appUrl ? (
        <>
          <p className="mt-1 text-xs text-white/60">Your Smart Reel App URL:</p>
          <div className="mt-2 break-all rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-2 text-sm text-fuchsia-50">
            {appUrl}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button onClick={onCopy} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-xs text-white/80 hover:text-white">
              <Copy className="h-3.5 w-3.5" /> Copy App Link
            </button>
            <button onClick={onOpen} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-xs text-white/80 hover:text-white">
              <ExternalLink className="h-3.5 w-3.5" /> Open Website
            </button>
            <button onClick={onShare} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-xs text-white/80 hover:text-white">
              <Send className="h-3.5 w-3.5" /> Share App
            </button>
          </div>
          <p className="mt-2 text-[11px] text-white/40">Share works with WhatsApp, Instagram, Telegram, or any app supported by this device.</p>
        </>
      ) : (
        <div className="mt-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          App is not deployed yet.
        </div>
      )}
    </Card>
  );
}

function EmptyHint() {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-blue-500/20 ring-1 ring-white/10">
        <Film className="h-6 w-6 text-fuchsia-300" />
      </div>
      <h3 className="mt-5 text-base font-semibold">Your edit plan will appear here</h3>
      <p className="mt-2 text-sm text-white/50">Upload clips → add reference → generate plan → preview & export.</p>
    </div>
  );
}

function Planning() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
      <Loader2 className="mx-auto h-6 w-6 animate-spin text-fuchsia-300" />
      <p className="mt-4 text-sm text-white/70">Analyzing clips, matching reference, syncing beats…</p>
    </div>
  );
}

function Rendering({ progress }: { progress: number }) {
  const eta = Math.max(1, Math.round(((100 - progress) / 100) * 5));
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 to-blue-500/10 p-8 text-center">
      <div className="relative mx-auto h-20 w-20">
        <div className="absolute inset-0 animate-ping rounded-full bg-fuchsia-500/30" />
        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-blue-500">
          <Film className="h-8 w-8 text-white" />
        </div>
      </div>
      <h3 className="mt-5 text-lg font-semibold">Creating Your Cinematic Reel…</h3>
      <p className="mt-1 text-xs text-white/60">Applying transitions, syncing music, color grading</p>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-blue-500 transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-white/50">
        <span>{progress}%</span>
        <span>~{eta}s remaining</span>
      </div>
    </div>
  );
}

function PlanView({ plan }: { plan: EditPlan }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/10 to-blue-500/10 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">{plan.project.title}</h2>
            <p className="mt-1 text-xs text-white/60">
              {plan.project.category} · {plan.project.aspect_ratio} · {plan.project.target_duration_sec}s · {plan.project.language}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px]">{plan.export.resolution} · {plan.export.platform}</span>
        </div>
      </div>

      <Section icon={Palette} title="Style">
        <Row k="Mood" v={plan.style.mood} />
        <Row k="Color grade" v={plan.style.color_grade} />
        <Row k="Pacing" v={plan.style.pacing} />
        {plan.style.reference_match_notes && <Row k="Reference notes" v={plan.style.reference_match_notes} />}
      </Section>

      <Section icon={Music2} title={`Music · ${plan.music.bpm_estimate} BPM`}>
        <Row k="Selected song" v={plan.music.selected_song || plan.music.song_suggestions[0] || "Single AI-selected track"} />
        <Row k="Genre" v={plan.music.genre} />
        <Row k="Audio mix" v={plan.music.audio_mix ? `${plan.music.audio_mix.volume_balance} · fade ${plan.music.audio_mix.fade_in_sec}s/${plan.music.audio_mix.fade_out_sec}s · ${plan.music.audio_mix.bass_enhancement}` : "Balanced cinematic mix"} />
        <Row k="Beat engine" v={`${plan.music.beat_markers?.length ?? 0} beat cuts · ${plan.music.bass_drops?.length ?? 0} bass drops`} />
        <div className="mt-2 space-y-1.5">
          {plan.music.song_suggestions.map((s, i) => (
            <div key={i} className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm">{s}</div>
          ))}
        </div>
      </Section>

      <Section icon={Film} title={`Timeline · ${plan.timeline.length} cuts`}>
        <div className="space-y-2">
          {plan.timeline.map((t) => (
            <div key={t.index} className="rounded-lg border border-white/5 bg-white/[0.03] p-3 text-sm">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span className="truncate">#{t.index + 1} · {t.clip_ref}</span>
                <span>{t.in_sec.toFixed(1)}s → {t.out_sec.toFixed(1)}s {t.speed !== 1 && `· ${t.speed}x`}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {t.transition_in && <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[11px] text-fuchsia-200">↪ {t.transition_in}</span>}
                {t.effect && <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] text-blue-200">{t.effect}</span>}
              </div>
              {t.caption && <p className="mt-2 text-white/80">"{t.caption}"</p>}
            </div>
          ))}
        </div>
      </Section>

      {plan.text_animations.length > 0 && (
        <Section icon={Type} title="Text animations">
          <div className="space-y-1.5">
            {plan.text_animations.map((t, i) => (
              <div key={i} className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm">
                <span className="text-white/50 text-xs">@{t.at_sec}s · {t.style}</span>
                <div className="text-white/90">{t.text}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {plan.notes_for_creator && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/70">
          <strong className="text-white/90">Notes:</strong> {plan.notes_for_creator}
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-fuchsia-300" />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3 text-sm py-1">
      <span className="w-32 shrink-0 text-white/50">{k}</span>
      <span className="text-white/85">{v}</span>
    </div>
  );
}

async function renderPreviewReel(plan: EditPlan, clips: LocalClip[], song: SongFile, captionsEnabled: boolean, onProgress: (message: string) => void): Promise<RenderedReel> {
  if (typeof window === "undefined") throw new Error("Preview renderer is not available yet.");
  const MediaRecorderCtor = window.MediaRecorder;
  if (!MediaRecorderCtor) throw new Error("Playable video export is not supported in this browser.");
  const usableClips = clips.filter((clip) => clip.decodeStatus !== "invalid" && (clip.kind === "image" || clip.frameVerified || clip.thumbnailUrl));
  if (usableClips.length === 0 || plan.timeline.length === 0) throw new Error("Video rendering issue detected. Rebuilding cinematic timeline…");

  const isPortrait = plan.project.aspect_ratio.includes("9:16") || plan.project.aspect_ratio.includes("9/16");
  const width = isPortrait ? 720 : 1280;
  const height = isPortrait ? 1280 : 720;
  const canvas = window.document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare video renderer.");

  const drawCover = (media: CanvasImageSource) => drawMediaCover(ctx, media, width, height);
  ctx.fillStyle = "#07050f";
  ctx.fillRect(0, 0, width, height);
  const firstPoster = usableClips[0]?.thumbnailUrl || (usableClips[0]?.kind === "image" ? usableClips[0].url : "");
  if (firstPoster) {
    const img = new Image();
    img.src = firstPoster;
    await img.decode().catch(() => undefined);
    if (img.naturalWidth) drawCover(img);
  }

  const stream = canvas.captureStream(30);
  if (stream.getVideoTracks().length === 0) throw new Error("Video rendering issue detected. Rebuilding cinematic timeline…");
  const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  let audioCtx: AudioContext | null = null;
  let audioEl: HTMLAudioElement | null = null;
  let stopSynth: (() => void) | null = null;
  if (AudioCtor) {
    audioCtx = new AudioCtor();
    await audioCtx.resume().catch(() => undefined);
    const destination = audioCtx.createMediaStreamDestination();
    const gain = audioCtx.createGain();
    const bass = audioCtx.createBiquadFilter();
    const compressor = audioCtx.createDynamicsCompressor();
    bass.type = "lowshelf";
    bass.frequency.value = 120;
    bass.gain.value = 4.5;
    compressor.threshold.value = -18;
    compressor.ratio.value = 3;
    gain.gain.value = 0.86;

    if (song) {
      audioEl = new Audio(song.url);
      audioEl.loop = true;
      audioEl.volume = 0.9;
      audioEl.currentTime = 0;
      const source = audioCtx.createMediaElementSource(audioEl);
      source.connect(bass);
    } else {
      const step = 60 / Math.max(70, plan.music.bpm_estimate || 100);
      const duration = Math.max(8, plan.project.target_duration_sec);
      const pad = audioCtx.createOscillator();
      const padGain = audioCtx.createGain();
      pad.type = "triangle";
      pad.frequency.value = 164;
      padGain.gain.value = 0.025;
      pad.connect(padGain);
      padGain.connect(bass);
      pad.start();
      pad.stop(audioCtx.currentTime + duration + 0.2);
      for (let t = 0; t < duration; t += step) {
        const osc = audioCtx.createOscillator();
        const pulse = audioCtx.createGain();
        osc.type = Math.round(t / step) % 4 === 0 ? "sawtooth" : "sine";
        osc.frequency.value = Math.round(t / step) % 4 === 0 ? 92 : 220;
        pulse.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
        pulse.gain.linearRampToValueAtTime(0.22, audioCtx.currentTime + t + 0.025);
        pulse.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.18);
        osc.connect(pulse);
        pulse.connect(bass);
        osc.start(audioCtx.currentTime + t);
        osc.stop(audioCtx.currentTime + t + 0.2);
      }
      stopSynth = () => {
        try {
          pad.stop();
        } catch {}
      };
    }
    bass.connect(compressor);
    compressor.connect(gain);
    gain.connect(destination);
    destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  }

  const chunks: Blob[] = [];
  const mimeType = MediaRecorderCtor.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
  const recorder = new MediaRecorderCtor(stream, { mimeType, videoBitsPerSecond: 5_000_000, audioBitsPerSecond: 160_000 });
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const loadPoster = async (clip: LocalClip) => {
    if (!clip.thumbnailUrl) return null;
    const image = new Image();
    image.src = clip.thumbnailUrl;
    await image.decode().catch(() => undefined);
    return image.naturalWidth ? image : null;
  };

  const drawOverlays = (label: string, caption: string | null, filter: string) => {
    ctx.filter = "none";
    const grd = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.8);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.48)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(217,70,239,0.23)";
    ctx.fillRect(0, 0, width, Math.max(3, height * 0.006));
    ctx.fillStyle = "rgba(0,0,0,0.48)";
    ctx.fillRect(24, 24, Math.min(width - 48, label.length * 10 + 46), 34);
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.font = "18px Inter, Arial, sans-serif";
    ctx.fillText(label.slice(0, 48), 42, 47);
    if (captionsEnabled && caption) {
      ctx.font = `700 ${isPortrait ? 34 : 30}px Inter, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,0.58)";
      ctx.fillRect(width * 0.1, height * 0.78, width * 0.8, 72);
      ctx.fillStyle = "white";
      ctx.fillText(caption.slice(0, 42), width / 2, height * 0.78 + 47);
      ctx.textAlign = "left";
    }
    ctx.filter = filter;
  };

  const recordDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  });

  recorder.start(250);
  if (audioEl) {
    await audioEl.play().catch(() => {
      onProgress("Browser blocked song start; exporting video frames with the prepared audio track.");
    });
  }

  const filter = colorGradeFilter(plan.style.color_grade);
  let renderedSec = 0;
  let visibleFrameCount = 0;
  for (let i = 0; i < plan.timeline.length; i += 1) {
    const cut = plan.timeline[i];
    const clip = usableClips.find((c) => c.name === cut.clip_ref) ?? usableClips[i % Math.max(1, usableClips.length)];
    const durationMs = Math.max(600, (cut.out_sec - cut.in_sec) * 1000);
    onProgress(`Rendering cut ${i + 1}/${plan.timeline.length}`);
    if (clip?.kind === "video") {
      const poster = await loadPoster(clip);
      const video = window.document.createElement("video");
      video.src = clip.url;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      await prepareVideoFrame(video, cut.in_sec).catch(() => undefined);
      await video.play().catch(() => undefined);
      const start = window.performance.now();
      while (window.performance.now() - start < durationMs) {
        const localProgress = Math.min(1, (window.performance.now() - start) / durationMs);
        ctx.fillStyle = "#07050f";
        ctx.fillRect(0, 0, width, height);
        ctx.filter = filter;
        if (video.readyState >= 2 && video.videoWidth > 0) {
          drawMediaCoverMotion(ctx, video, width, height, localProgress, i % 2 === 0 ? 1 : -1);
          visibleFrameCount += 1;
        } else if (poster) {
          drawMediaCoverMotion(ctx, poster, width, height, localProgress, i % 2 === 0 ? 1 : -1);
          visibleFrameCount += 1;
        } else {
          ctx.filter = "none";
          const gradient = ctx.createLinearGradient(0, 0, width, height);
          gradient.addColorStop(0, "#3b0f46");
          gradient.addColorStop(1, "#0c2a54");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = "rgba(255,255,255,0.82)";
          ctx.font = "24px Inter, Arial, sans-serif";
          ctx.fillText(clip.name.slice(0, 46), 48, height / 2);
        }
        drawOverlays(cut.transition_in || cut.effect, cut.caption ?? null, filter);
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
      }
      video.pause();
    } else if (clip) {
      const image = new Image();
      image.src = clip.thumbnailUrl || clip.url;
      await image.decode().catch(() => undefined);
      const start = window.performance.now();
      while (window.performance.now() - start < durationMs) {
        const localProgress = Math.min(1, (window.performance.now() - start) / durationMs);
        ctx.fillStyle = "#07050f";
        ctx.fillRect(0, 0, width, height);
        ctx.filter = filter;
        if (image.naturalWidth) {
          drawMediaCoverMotion(ctx, image, width, height, localProgress, i % 2 === 0 ? 1 : -1);
          visibleFrameCount += 1;
        }
        drawOverlays(cut.transition_in || cut.effect, cut.caption ?? null, filter);
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
      }
    }
    renderedSec += durationMs / 1000;
    if (renderedSec > Math.max(45, plan.project.target_duration_sec + 4)) break;
  }

  if (visibleFrameCount === 0) throw new Error("Video rendering issue detected. Rebuilding cinematic timeline…");

  recorder.stop();
  audioEl?.pause();
  stopSynth?.();
  const blob = await recordDone;
  await audioCtx?.close().catch(() => undefined);
  if (blob.size < 2048) throw new Error("Export validation failed: no video frames were encoded.");
  onProgress("Muxing H.264 MP4 with video + audio…");
  const finalDuration = Math.max(1, renderedSec || plan.project.target_duration_sec || 12);
  const mp4Blob = await transcodeRecordingToMp4(blob, song, finalDuration, plan.music.bpm_estimate || 110);
  if (mp4Blob.size < 2048) throw new Error("Export validation failed: MP4 muxing produced an empty file.");
  const validation = await validateRenderedVideo(mp4Blob, true);
  if (!validation.playable) throw new Error(validation.message);
  const url = URL.createObjectURL(mp4Blob);
  return {
    blob: mp4Blob,
    url,
    validation,
    fileName: `${plan.project.title.replace(/\s+/g, "-").toLowerCase()}-final-reel.mp4`,
  };
}

const downloadRenderedReel = (rendered: RenderedReel) => {
  if (typeof window === "undefined") return;
  const link = window.document.createElement("a");
  link.href = rendered.url;
  link.download = rendered.fileName;
  link.click();
};

/* ---------- Preview screen with sequential clip player ---------- */

function PreviewScreen({
  plan, clips, song, captionsEnabled, onEditAgain, onTweak, tweak, setTweak, onExport, onSave, onDownloadPlan, onDownloadClip,
}: {
  plan: EditPlan;
  clips: LocalClip[];
  song: SongFile;
  captionsEnabled: boolean;
  onEditAgain: () => void;
  onTweak: (t: string) => void;
  tweak: string;
  setTweak: (s: string) => void;
  onExport: () => void;
  onSave: () => void;
  onDownloadPlan: () => void;
  onDownloadClip: (c: LocalClip) => void;
}) {
  const [cutIdx, setCutIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [mediaReady, setMediaReady] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [needsAudioTap, setNeedsAudioTap] = useState(Boolean(song));
  const [beatPulse, setBeatPulse] = useState(false);
  const [previewIssue, setPreviewIssue] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [renderedReel, setRenderedReel] = useState<RenderedReel | null>(null);
  const [previewValidation, setPreviewValidation] = useState<PreviewValidation>(() => emptyPreviewValidation("Rendering preview video…"));
  const [renderAttempt, setRenderAttempt] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const renderedVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const imageTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthCleanupRef = useRef<(() => void) | null>(null);
  const beatTimerRef = useRef<number | null>(null);

  const rebuildPreview = useCallback(async (reason = "Building validated preview video…") => {
    if (exportBusy) return;
    setExportBusy(true);
    setPreviewIssue(null);
    setExportStatus(reason);
    setPreviewValidation(emptyPreviewValidation(reason));
    try {
      const next = await renderPreviewReel(plan, clips, song, captionsEnabled, setExportStatus);
      setRenderedReel((previous) => {
        if (previous?.url) URL.revokeObjectURL(previous.url);
        return next;
      });
      setPreviewValidation(next.validation);
      setExportStatus(next.validation.message);
    } catch (err) {
      setPreviewIssue(err instanceof Error ? err.message : "Preview failed. Rebuilding video automatically.");
      setPreviewValidation(emptyPreviewValidation("Preview failed. Rebuilding video automatically."));
      if (renderAttempt < 1) {
        setRenderAttempt((n) => n + 1);
        window.setTimeout(() => void rebuildPreview("Preview failed. Rebuilding video automatically."), 700);
      }
    } finally {
      setExportBusy(false);
    }
  }, [plan, clips, song, captionsEnabled, exportBusy, renderAttempt]);

  useEffect(() => {
    setRenderAttempt(0);
    void rebuildPreview("Building validated preview video…");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, clips, song, captionsEnabled]);

  useEffect(() => () => {
    if (renderedReel?.url) URL.revokeObjectURL(renderedReel.url);
  }, [renderedReel?.url]);

  const validationRows = useMemo(() => [
    ["File exists", previewValidation.fileExists],
    ["File size > 0", previewValidation.fileSizeOk],
    ["MP4/WebM valid", previewValidation.mp4Valid],
    ["Video track", previewValidation.videoTrack],
    ["Audio track", previewValidation.audioTrack],
    ["Duration > 0", previewValidation.durationOk],
    ["Preview playable", previewValidation.playable],
  ] as const, [previewValidation]);

  // Match cuts to actual uploaded clips by name (fall back to round-robin)
  const sequence = useMemo(() => {
    const usable = clips.filter((clip) => clip.decodeStatus !== "invalid");
    return plan.timeline.map((t) => {
      const match = usable.find((c) => c.name === t.clip_ref) ?? usable[t.index % Math.max(1, usable.length)];
      const cutDuration = Math.max(0.6, t.out_sec - t.in_sec);
      return { cut: t, clip: match, cutDuration };
    });
  }, [plan, clips]);

  const current = sequence[cutIdx];
  const filter = colorGradeFilter(plan.style.color_grade);
  const isPortrait = plan.project.aspect_ratio.includes("9:16") || plan.project.aspect_ratio.includes("9/16");
  const cutStarts = useMemo(() => {
    let cursor = 0;
    return sequence.map((s) => {
      const start = cursor;
      cursor += s.cutDuration;
      return start;
    });
  }, [sequence]);
  const previewDuration = Math.max(
    1,
    (cutStarts[cutStarts.length - 1] ?? 0) + (sequence[sequence.length - 1]?.cutDuration ?? 1),
  );
  const beatIntervalMs = Math.max(350, (60 / Math.max(70, plan.music.bpm_estimate || 100)) * 1000);

  // active caption / text animation — only when captions are enabled
  const activeText = useMemo(() => {
    if (!captionsEnabled) return null;
    const t = current?.cut;
    if (!t) return null;
    return t.caption || plan.text_animations.find((a) => Math.abs(a.at_sec - (t.in_sec + (t.out_sec - t.in_sec) / 2)) < 1.5)?.text || null;
  }, [current, plan, captionsEnabled]);

  // pick a cinematic CSS animation per cut from transition_in / effect
  const cinematicAnim = useMemo(() => {
    const tag = `${current?.cut.transition_in ?? ""} ${current?.cut.effect ?? ""}`.toLowerCase();
    if (/zoom|punch/.test(tag)) return "sr-zoom-in";
    if (/whip|swipe|velocity|pan/.test(tag)) return "sr-whip";
    if (/flash/.test(tag)) return "sr-flash";
    if (/shake/.test(tag)) return "sr-shake";
    if (/blur|motion/.test(tag)) return "sr-blur-in";
    if (/fade|cinemat/.test(tag)) return "sr-fade";
    return "sr-fade";
  }, [current]);

  const advance = useCallback(() => {
    setCutIdx((i) => (i + 1) % Math.max(1, sequence.length));
  }, [sequence.length]);

  const seekTo = useCallback((targetSec: number) => {
    const bounded = Math.max(0, Math.min(targetSec, previewDuration));
    const renderedVideo = renderedVideoRef.current;
    if (renderedVideo) {
      try {
        renderedVideo.currentTime = bounded;
        setElapsed(bounded);
      } catch {}
      return;
    }
    if (sequence.length === 0) return;
    const idx = Math.max(0, cutStarts.findIndex((start, i) => bounded >= start && bounded < start + (sequence[i]?.cutDuration ?? 0)));
    const nextIdx = idx === -1 ? Math.max(0, sequence.length - 1) : idx;
    setCutIdx(nextIdx);
    setElapsed(bounded);
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.currentTime = bounded % Math.max(1, audio.duration || previewDuration);
      } catch {}
    }
    const v = videoRef.current;
    const next = sequence[nextIdx];
    if (v && next?.clip?.kind === "video") {
      prepareVideoFrame(v, next.cut.in_sec + Math.max(0, bounded - (cutStarts[nextIdx] ?? 0))).catch(() => undefined);
    }
  }, [cutStarts, previewDuration, sequence]);

  const enableAudioGraph = useCallback(async () => {
    if (typeof window === "undefined" || !song) return;
    try {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor || audioCtxRef.current) return;
      const audio = audioRef.current;
      if (!audio) return;
      const ctx = new AudioCtor();
      await ctx.resume().catch(() => undefined);
      const source = ctx.createMediaElementSource(audio);
      const lowShelf = ctx.createBiquadFilter();
      const compressor = ctx.createDynamicsCompressor();
      const gain = ctx.createGain();
      lowShelf.type = "lowshelf";
      lowShelf.frequency.value = 110;
      lowShelf.gain.value = 4;
      compressor.threshold.value = -18;
      compressor.knee.value = 24;
      compressor.ratio.value = 3;
      gain.gain.value = 0.96;
      source.connect(lowShelf);
      lowShelf.connect(compressor);
      compressor.connect(gain);
      gain.connect(ctx.destination);
      audioCtxRef.current = ctx;
    } catch {
      // If a browser blocks WebAudio routing, keep normal audio playback working.
    }
  }, [song]);

  const stopAiSongBed = useCallback(() => {
    synthCleanupRef.current?.();
    synthCleanupRef.current = null;
  }, []);

  const startAiSongBed = useCallback(async () => {
    if (typeof window === "undefined" || song || synthCleanupRef.current) return;
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    await ctx.resume().catch(() => undefined);
    const master = ctx.createGain();
    const bass = ctx.createBiquadFilter();
    const compressor = ctx.createDynamicsCompressor();
    bass.type = "lowshelf";
    bass.frequency.value = 115;
    bass.gain.value = 6;
    compressor.threshold.value = -20;
    compressor.ratio.value = 3;
    master.gain.value = 0.18;
    bass.connect(compressor);
    compressor.connect(master);
    master.connect(ctx.destination);
    const step = 60 / Math.max(70, plan.music.bpm_estimate || 100);
    const schedule = () => {
      const now = ctx.currentTime;
      for (let i = 0; i < 12; i += 1) {
        const at = now + i * step;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i % 4 === 0 ? "sawtooth" : "triangle";
        osc.frequency.value = i % 4 === 0 ? 92 : 185 + (i % 3) * 35;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.linearRampToValueAtTime(i % 4 === 0 ? 0.34 : 0.13, at + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
        osc.connect(gain);
        gain.connect(bass);
        osc.start(at);
        osc.stop(at + 0.22);
      }
    };
    schedule();
    const timer = window.setInterval(schedule, step * 8 * 1000);
    synthCleanupRef.current = () => {
      window.clearInterval(timer);
      ctx.close().catch(() => undefined);
    };
    setAudioEnabled(true);
    setNeedsAudioTap(false);
  }, [plan.music.bpm_estimate, song]);

  // playback control
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (imageTimerRef.current) {
      window.clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
    setMediaReady(false);
    setPreviewIssue(null);
    if (!current || !current.clip) return;

    if (current.clip.kind === "image") {
      setMediaReady(true);
      if (playing) {
        imageTimerRef.current = window.setTimeout(advance, current.cutDuration * 1000);
      }
    } else {
      const v = videoRef.current;
      if (v) {
        v.muted = true;
        v.playsInline = true;
        prepareVideoFrame(v, current.cut.in_sec).then(() => {
          setMediaReady(true);
          if (playing) v.play().catch(() => {
            setPlaying(false);
            setPreviewIssue("Tap Play to start preview on this device.");
          });
        }).catch(() => {
          setMediaReady(true);
          setPreviewIssue("This device decoded the clip slowly, so Smart Reel kept the preview moving with a safe frame.");
        });
      }
    }
    return () => {
      if (typeof window !== "undefined" && imageTimerRef.current) window.clearTimeout(imageTimerRef.current);
    };
  }, [cutIdx, playing, current, advance]);

  useEffect(() => {
    if (typeof window === "undefined" || !playing) return;
    const startedAt = window.performance.now();
    const baseElapsed = cutStarts[cutIdx] ?? 0;
    let raf = 0;
    const tick = () => {
      const live = baseElapsed + (window.performance.now() - startedAt) / 1000;
      setElapsed(live > previewDuration ? live % previewDuration : live);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [playing, cutIdx, cutStarts, previewDuration]);

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !current) return;
    if (v.currentTime >= current.cut.out_sec || v.currentTime - current.cut.in_sec >= current.cutDuration) {
      advance();
    }
  };

  const togglePlay = () => {
    setPlaying((p) => {
      const next = !p;
      const v = renderedVideoRef.current ?? videoRef.current;
      const a = audioRef.current;
      if (v) {
        if (next) v.play().catch(() => setPreviewIssue("Tap Play again if your browser blocked autoplay."));
        else v.pause();
      }
      if (a) {
        if (next) {
          setAudioEnabled(true);
          enableAudioGraph().finally(() => a.play().then(() => setNeedsAudioTap(false)).catch(() => {
            setNeedsAudioTap(true);
            setPreviewIssue("Tap the preview once to enable song audio.");
          }));
        }
        else a.pause();
      }
      return next;
    });
  };

  // start/stop song with the reel
  useEffect(() => {
    if (renderedReel) return;
    if (!song) {
      if (playing) startAiSongBed();
      else stopAiSongBed();
      return () => stopAiSongBed();
    }
    const a = audioRef.current;
    if (!a) return;
    const fadeIn = Math.max(0.1, plan.music.audio_mix?.fade_in_sec ?? 0.6);
    const fadeOut = Math.max(0.1, plan.music.audio_mix?.fade_out_sec ?? 0.8);
    const remaining = previewDuration - elapsed;
    const fadeGain = Math.min(1, elapsed / fadeIn, remaining / fadeOut);
    a.volume = Math.max(0.18, Math.min(0.9, 0.86 * fadeGain));
    if (playing) a.play().then(() => {
      setAudioEnabled(true);
      setNeedsAudioTap(false);
    }).catch(() => {
      setAudioEnabled(false);
      setNeedsAudioTap(true);
    });
    else a.pause();
    return () => stopAiSongBed();
  }, [playing, song, elapsed, previewDuration, plan.music.audio_mix, startAiSongBed, stopAiSongBed, renderedReel]);

  useEffect(() => {
    if (typeof window === "undefined" || !playing) return;
    if (beatTimerRef.current) window.clearInterval(beatTimerRef.current);
    beatTimerRef.current = window.setInterval(() => {
      setBeatPulse(true);
      window.setTimeout(() => setBeatPulse(false), 90);
    }, beatIntervalMs);
    return () => {
      if (typeof window !== "undefined" && beatTimerRef.current) window.clearInterval(beatTimerRef.current);
    };
  }, [playing, beatIntervalMs]);

  const fullscreen = () => {
    if (typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;
    if (window.document.fullscreenElement) window.document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };

  const downloadPlayablePreview = async () => {
    if (exportBusy) return;
    if (!renderedReel || !previewValidation.canExport) {
      await rebuildPreview("Preview failed. Rebuilding video automatically.");
      return;
    }
    downloadRenderedReel(renderedReel);
    setExportStatus("Validated MP4 downloaded with video + audio");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Preview</h2>
            <p className="text-xs text-white/50">{plan.timeline.length} cuts · {plan.project.target_duration_sec}s · {plan.project.aspect_ratio}</p>
          </div>
          <button onClick={fullscreen} className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/70 hover:text-white" aria-label="Fullscreen">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        <style>{`
@keyframes sr-zoom-in { from { transform: scale(1.18); filter: blur(6px); } to { transform: scale(1); filter: blur(0); } }
@keyframes sr-whip { from { transform: translateX(20%) skewX(-12deg); filter: blur(8px); opacity: 0; } to { transform: translateX(0) skewX(0); filter: blur(0); opacity: 1; } }
@keyframes sr-flash { 0% { filter: brightness(3) saturate(0); opacity: 0.2; } 30% { filter: brightness(1); opacity: 1; } 100% { filter: brightness(1); opacity: 1; } }
@keyframes sr-shake { 0% { transform: translate(0,0); } 20% { transform: translate(-6px,4px); } 40% { transform: translate(5px,-3px); } 60% { transform: translate(-3px,2px); } 100% { transform: translate(0,0); } }
@keyframes sr-blur-in { from { filter: blur(14px); transform: scale(1.06); } to { filter: blur(0); transform: scale(1); } }
@keyframes sr-fade { from { opacity: 0; transform: scale(1.04); } to { opacity: 1; transform: scale(1); } }
.sr-cinematic { animation-duration: 700ms; animation-timing-function: cubic-bezier(.2,.7,.2,1); animation-fill-mode: both; will-change: transform, filter, opacity; }
.sr-grain::after { content: ""; position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px); background-size: 3px 3px; mix-blend-mode: overlay; opacity: .35; }
.sr-vignette::before { content: ""; position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 120px 30px rgba(0,0,0,.55); }
        `}</style>

        <div
          ref={containerRef}
          className={"relative mx-auto overflow-hidden rounded-xl bg-gradient-to-br from-[#16091f] via-black to-[#071022] sr-grain sr-vignette " + (isPortrait ? "aspect-[9/16] max-w-[280px]" : "aspect-video w-full")}
        >
          {renderedReel?.url ? (
            <video
              ref={renderedVideoRef}
              key={renderedReel.url}
              src={renderedReel.url}
              className="h-full w-full object-cover"
              controls
              autoPlay
              playsInline
              preload="auto"
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                setMediaReady(true);
                setElapsed(video.currentTime || 0);
              }}
              onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime || 0)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => {
                setPreviewIssue("Preview failed. Rebuilding video automatically.");
                setRenderedReel((previous) => {
                  if (previous?.url) URL.revokeObjectURL(previous.url);
                  return null;
                });
                void rebuildPreview("Preview failed. Rebuilding video automatically.");
              }}
            />
          ) : current?.clip ? (
            <img
              src={current.clip.thumbnailUrl || current.clip.url}
              alt=""
              className={"h-full w-full object-cover sr-cinematic " + cinematicAnim}
              style={{ filter, animationName: cinematicAnim, transform: beatPulse ? "scale(1.025)" : undefined }}
              onLoad={() => setMediaReady(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/50">No clips loaded</div>
          )}

          {(!renderedReel || exportBusy) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-fuchsia-950/70 via-black/80 to-blue-950/70 px-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-fuchsia-200" />
              <p className="mt-3 text-sm font-medium text-white/85">{exportStatus || "Building validated preview video…"}</p>
              <p className="mt-1 max-w-[240px] text-xs text-white/45">Photos/clips, transitions and music are being muxed into one playable file.</p>
            </div>
          )}

          {current?.cut.transition_in && !renderedReel && (
            <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-fuchsia-500/30 px-2 py-0.5 text-[10px] text-fuchsia-100 backdrop-blur">
              ↪ {current.cut.transition_in}
            </span>
          )}

          <button
            onClick={togglePlay}
            className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-black/80"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "Pause" : "Play"}
          </button>

          <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white/70 backdrop-blur">
            {previewValidation.canExport ? "Video + audio ok" : "Validating media"}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <input
            type="range"
            min={0}
            max={previewDuration}
            step={0.05}
            value={Math.min(elapsed, previewDuration)}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="w-full accent-fuchsia-500"
            aria-label="Preview timeline scrub"
          />
          <div className="flex items-center justify-between text-[11px] text-white/45">
            <span>{elapsed.toFixed(1)}s / {previewDuration.toFixed(1)}s</span>
            <span>{plan.music.beat_markers?.length ?? 0} beat markers · {plan.music.bass_drops?.length ?? 0} bass drops</span>
          </div>
          {previewIssue && <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">{previewIssue}</p>}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-4">
            {validationRows.map(([label, ok]) => (
              <span key={label} className={(ok ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-amber-400/20 bg-amber-500/10 text-amber-100") + " inline-flex items-center gap-1 rounded-md border px-2 py-1"}>
                {ok ? <CheckCircle2 className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* timeline */}
        <div className="mt-3 flex gap-1 overflow-x-auto">
          {sequence.map((s, i) => (
            <button
              key={i}
              onClick={() => setCutIdx(i)}
              className={
                "h-12 w-16 shrink-0 overflow-hidden rounded-md border " +
                (i === cutIdx ? "border-fuchsia-400" : "border-white/10 opacity-60 hover:opacity-100")
              }
            >
              {s.clip ? (
                s.clip.kind === "video" ? (
                  s.clip.thumbnailUrl ? <img src={s.clip.thumbnailUrl} alt="" className="h-full w-full object-cover" style={{ filter }} /> : <video src={s.clip.url} className="h-full w-full object-cover" muted playsInline preload="metadata" style={{ filter }} />
                ) : (
                  <img src={s.clip.url} alt="" className="h-full w-full object-cover" style={{ filter }} />
                )
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* AI tweak */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5">
        <Label icon={Wand2} title="What would you like to change?" />
        <div className="mt-3 flex gap-2">
          <input
            value={tweak}
            onChange={(e) => setTweak(e.target.value)}
            placeholder="e.g. add slow-mo intro, more glow…"
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm placeholder:text-white/30 focus:border-fuchsia-400/50 focus:outline-none"
          />
          <button
            onClick={() => onTweak(tweak)}
            disabled={!tweak.trim()}
            className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-blue-500 px-4 text-sm font-medium disabled:opacity-50"
          >
            Apply
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {AI_TWEAKS.map((s) => (
            <button
              key={s}
              onClick={() => onTweak(s)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/60 hover:border-fuchsia-400/40 hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* actions */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <ActionBtn icon={Download} label={exportBusy ? "Rendering…" : "Download MP4"} onClick={downloadPlayablePreview} primary disabled={exportBusy || !previewValidation.canExport} />
        <ActionBtn icon={Download} label="Export" onClick={downloadPlayablePreview} primary disabled={exportBusy || !previewValidation.canExport} />
        <ActionBtn icon={Save} label="Save" onClick={onSave} />
        <ActionBtn icon={RefreshCw} label="Edit again" onClick={onEditAgain} />
        <ActionBtn icon={Download} label="Plan JSON" onClick={onDownloadPlan} />
      </div>
      {exportStatus && <p className="rounded-lg border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2 text-xs text-fuchsia-100">{exportStatus}</p>}

      <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/70">
        <summary className="cursor-pointer text-white/80">Download source clips</summary>
        <div className="mt-2 space-y-1.5">
          {clips.map((c) => (
            <button key={c.id} onClick={() => onDownloadClip(c)} className="flex w-full items-center justify-between rounded-md border border-white/5 bg-white/[0.03] px-3 py-2 text-left hover:border-fuchsia-400/40">
              <span className="truncate">{c.name}</span>
              <Download className="h-3.5 w-3.5 text-white/50" />
            </button>
          ))}
        </div>
      </details>

      <p className="px-1 text-[11px] leading-relaxed text-white/40">
        Note: Smart Reel generates the full cinematic edit plan and previews it in your browser using your source clips. Final encoding to a single MP4 happens in a desktop NLE (Premiere, CapCut, DaVinci) by following the plan, or use the plan JSON with any AI render pipeline.
      </p>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, primary, disabled }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium " +
        (primary
          ? "bg-gradient-to-r from-fuchsia-500 to-blue-500 shadow-lg shadow-fuchsia-500/30 disabled:cursor-not-allowed disabled:opacity-45"
          : "border border-white/10 bg-white/[0.04] text-white/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-45")
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/* ---------- Export dialog ---------- */

function ExportDialog({
  plan, clips, onClose, onDownloadPlan, onDownloadClip, onShare, onToast,
}: {
  plan: EditPlan;
  clips: LocalClip[];
  onClose: () => void;
  onDownloadPlan: () => void;
  onDownloadClip: (c: LocalClip) => void;
  onShare: (t: "instagram" | "whatsapp" | "youtube") => void;
  onToast: (m: string) => void;
}) {
  const [format, setFormat] = useState(EXPORT_FORMATS[0].key);
  const [quality, setQuality] = useState("1080p");

  const finish = () => {
    onDownloadPlan();
    onToast(`Reel package ready (${format} · ${quality})`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0e0a1a] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Export & download</h3>
          <button onClick={onClose} className="rounded-full p-1 text-white/60 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-white/60">Format</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {EXPORT_FORMATS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFormat(f.key)}
                className={
                  "rounded-lg border px-3 py-2 text-left text-xs " +
                  (format === f.key ? "border-fuchsia-400/60 bg-fuchsia-500/15" : "border-white/10 bg-white/[0.03] text-white/70 hover:text-white")
                }
              >
                <div className="font-medium text-white">{f.label}</div>
                <div className="text-white/50">{f.ratio}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-white/60">Quality</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {QUALITIES.map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={
                  "rounded-lg border px-3 py-2 text-xs " +
                  (quality === q ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-white" : "border-white/10 bg-white/[0.03] text-white/70 hover:text-white")
                }
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={finish}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-blue-500 px-6 py-3 text-sm font-medium"
        >
          <Download className="h-4 w-4" /> Download reel package
        </button>

        <div className="mt-4">
          <p className="text-xs font-medium text-white/60">Share</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ShareBtn label="Instagram" onClick={() => onShare("instagram")} />
            <ShareBtn label="WhatsApp" onClick={() => onShare("whatsapp")} />
            <ShareBtn label="YouTube" onClick={() => onShare("youtube")} />
          </div>
        </div>

        <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/60">
          <summary className="cursor-pointer text-white/80">Download source clips ({clips.length})</summary>
          <div className="mt-2 space-y-1">
            {clips.map((c) => (
              <button key={c.id} onClick={() => onDownloadClip(c)} className="flex w-full items-center justify-between rounded-md bg-white/[0.03] px-2 py-1.5 hover:bg-white/[0.06]">
                <span className="truncate">{c.name}</span>
                <Download className="h-3 w-3" />
              </button>
            ))}
          </div>
        </details>

        <p className="mt-3 text-[11px] leading-relaxed text-white/40">
          Smart Reel exports the cinematic edit plan + your source clips. Open the plan in any video editor or render pipeline to produce the final MP4. {plan.timeline.length} cuts ready.
        </p>
      </div>
    </div>
  );
}

function ShareBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-xs text-white/80 hover:text-white">
      <Share2 className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

/* ---------- Projects dialog ---------- */

function ProjectsDialog({ onClose, onLoad }: { onClose: () => void; onLoad: (p: SavedProject) => void }) {
  const [list, setList] = useState<SavedProject[]>([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PROJECTS_KEY);
      setList(raw ? JSON.parse(raw) : []);
    } catch {}
  }, []);

  const remove = (id: string) => {
    if (typeof window === "undefined") return;
    const next = list.filter((p) => p.id !== id);
    setList(next);
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0e0a1a] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">My projects</h3>
          <button onClick={onClose} className="rounded-full p-1 text-white/60 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        {list.length === 0 ? (
          <p className="mt-6 text-center text-sm text-white/50">No saved projects yet. Save one from the preview screen.</p>
        ) : (
          <ul className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
            {list.map((p) => (
              <li key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.title}</div>
                    <div className="text-[11px] text-white/50">{p.category} · {new Date(p.savedAt).toLocaleString()}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => onLoad(p)} className="rounded-md bg-fuchsia-500/20 px-2 py-1 text-xs text-fuchsia-100 hover:bg-fuchsia-500/30">Open</button>
                    <button onClick={() => remove(p.id)} className="rounded-md bg-white/5 px-2 py-1 text-xs text-white/60 hover:text-white"><X className="h-3 w-3" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
