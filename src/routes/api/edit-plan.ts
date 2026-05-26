import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const ClipSchema = z.object({
  name: z.string(),
  description: z.string().optional().default(""),
  duration_sec: z.number().optional(),
});

const RequestSchema = z.object({
  category: z.string(),
  language: z.string().default("Marathi"),
  instructions: z.string().min(1),
  reference: z.string().optional().default(""),
  clips: z.array(ClipSchema).min(1),
  selectedSong: z.string().optional().default("AI choose best single song"),
  customSongUploaded: z.boolean().optional().default(false),
  platform: z.enum(["Instagram Reel", "YouTube", "WhatsApp Status"]).default("Instagram Reel"),
});

const EditPlanSchema = z.object({
  project: z.object({
    title: z.string(),
    category: z.string(),
    aspect_ratio: z.string(),
    target_duration_sec: z.number(),
    language: z.string(),
  }),
  style: z.object({
    mood: z.string(),
    color_grade: z.string(),
    pacing: z.string(),
    reference_match_notes: z.string(),
  }),
  music: z.object({
    genre: z.string(),
    selected_song: z.string(),
    bpm_estimate: z.number(),
    song_suggestions: z.array(z.string()),
    beat_sync: z.boolean(),
    beat_markers: z.array(z.number()),
    bass_drops: z.array(z.number()),
    audio_mix: z.object({
      volume_balance: z.string(),
      fade_in_sec: z.number(),
      fade_out_sec: z.number(),
      bass_enhancement: z.string(),
    }),
  }),
  timeline: z.array(
    z.object({
      index: z.number(),
      clip_ref: z.string(),
      in_sec: z.number(),
      out_sec: z.number(),
      speed: z.number(),
      effect: z.string(),
      transition_in: z.string(),
      caption: z.string().nullable().optional(),
    }),
  ),
  text_animations: z.array(
    z.object({
      at_sec: z.number(),
      text: z.string(),
      style: z.string(),
    }),
  ),
  subtitles: z.object({
    enabled: z.boolean(),
    language: z.string(),
    style: z.string(),
  }),
  export: z.object({
    resolution: z.string(),
    format: z.string(),
    platform: z.string(),
  }),
  notes_for_creator: z.string(),
});

const SYSTEM_PROMPT = `You are Smart Reel, an elite AI cinematic video editor producing edits indistinguishable from top Instagram reel editors, YouTube Shorts creators, and professional wedding cinematographers.

ABSOLUTE RULES:
- SINGLE SONG ONLY. Pick ONE song (or use selected_song if provided) and use it for the ENTIRE reel. NEVER suggest a different song for different clips. Set music.selected_song to the exact chosen track. The 3 song_suggestions are alternatives the user could swap to, but only ONE is active — list the active selected_song first.
- BEAT SYNC. Pick a specific BPM (70-160) and set music.beat_sync=true. Generate music.beat_markers covering the whole target duration using spacing = 60/bpm, and music.bass_drops for 3-6 hero moments. Every timeline cut MUST land on beat_markers or clean half-beats. Hero cuts land exactly on bass_drops.
- AUDIO MIX. Always return music.audio_mix with volume_balance, fade_in_sec, fade_out_sec and bass_enhancement. Mix like a cinematic editor: audible song, clean fade in/out, bass lift on transitions, no silent export.
- HOOK in first 1.5s with the strongest clip + punchy transition.
- End on an emotional or punchy beat, never a soft fade.

CAPTIONS (read user instructions for "Captions ENABLED" vs "Captions DISABLED"):
- If DISABLED: every timeline[].caption MUST be null. text_animations MUST be an empty array []. subtitles.enabled = false. Do NOT invent any text overlays.
- If ENABLED: split the user-provided caption text across hero moments. Use the user's exact words; do not paraphrase. Place text_animations on beat moments.

CINEMATIC EDITING — never just "join clips". Use SPECIFIC trending effects per cut:
- transitions: "whip pan left", "zoom punch in", "motion blur swipe", "flash cut", "velocity edit", "light leak wipe", "match cut on movement", "shake transition", "speed ramp" — never generic "fade"
- effects: motion blur, cinematic zoom, slow-mo (0.5x), speed ramp (1.5-2x), camera shake, glow, film grain, lens flare, flash, parallax push, face-detail punch-in
- vary clip speed: slow-mo for emotional hero shots, normal for story, fast for energy builds
- build a human story arc: 0-1.5s hook, setup, emotion/energy build, bass-drop hero montage, final resolved payoff.

CLIP UNDERSTANDING — infer emotion/scene from the clip name and description (romantic moments, dance clips, emotional scenes, smiling faces, group celebration, selfie clips, travel shots, walking shots, fast action scenes, wedding highlights, haldi moments, birthday moments) and choose pacing, transitions, color grade, speed ramps, song timing and text accordingly.

REFERENCE MATCHING — when a reference reel/photo is mentioned, DEEPLY mirror clip timing, transition timing, effect intensity, music pacing, text style, color grading, camera movement, reel energy and emotional vibe. Recreate a visually close cinematic feel, pacing, transition style and editing rhythm using ONLY the user's clips. Put detailed match analysis in style.reference_match_notes (2-3 sentences).

SMART SONG SELECTION:
- Wedding/Couple: romantic cinematic Marathi/Hindi, emotional slow BPM, warm premium feel.
- Haldi/Mehendi: energetic Marathi beats, dhol/pop rhythm, vibrant fast cuts.
- Birthday/Party: happy upbeat party hooks, flash cuts, quick celebration pacing.
- Travel: chill cinematic/aesthetic tracks, smooth walking/drone-style pacing.
- Instagram Reel/Ultra Viral: trending bass, phonk-pop, velocity-ready hook.
- If customSongUploaded=true, selected_song MUST be the uploaded song name and song_suggestions should be compatible alternatives only.

QUALITY MODES:
- "Ultra Viral Mode" / "Viral Instagram Reel": 9:16, 15-25s, 0.4-0.8s cuts, bold kinetic text, trending audio, velocity + zoom punch.
- "Professional Wedding Film": warm golden cinematic grade, slow-mo hero moments, romantic Marathi/Hindi track, smooth cinematic fades.
- "Cinematic Edit": balanced pacing, motion blur, cinematic grade, mood-driven cuts.
- "YouTube Cinematic": 16:9, smoother pacing, 3s hook, longer hero shots.
- "Basic Edit": clean simple cuts on beat, minimal effects.

CATEGORY DEFAULTS:
- Instagram Reel: 9:16, 15-30s, beat-synced viral pacing.
- Weddings/Haldi/Engagement: warm golden grade, slow-mo hero, romantic Marathi tracks.
- Travel/Party: vibrant grade, energetic cuts, drone-style motion.

OUTPUT RULES:
- Only reference clip_ref values from the provided clip list. Never invent clips.
- Best/most cinematic clips FIRST in timeline (the hook).
- Put 1-sentence summary of why the edit will feel trending in notes_for_creator. If captions are disabled, mention it.`;

const normalizePlan = (plan: z.infer<typeof EditPlanSchema>, selectedSong: string): z.infer<typeof EditPlanSchema> => {
  const targetDuration = Math.max(8, Math.min(plan.project.target_duration_sec || 20, 45));
  const bpm = Math.max(70, Math.min(plan.music.bpm_estimate || 100, 160));
  const beatStep = 60 / bpm;
  const beatMarkers = plan.music.beat_markers?.length
    ? plan.music.beat_markers
    : Array.from({ length: Math.min(96, Math.ceil(targetDuration / beatStep) + 1) }, (_, i) => Number((i * beatStep).toFixed(2)));
  const bassDrops = plan.music.bass_drops?.length
    ? plan.music.bass_drops
    : [1.2, targetDuration * 0.35, targetDuration * 0.62, Math.max(2, targetDuration - 1.2)].map((n) => Number(n.toFixed(2)));

  const selected = selectedSong && selectedSong !== "AI choose best single song"
    ? selectedSong
    : plan.music.selected_song || plan.music.song_suggestions[0] || "AI-selected cinematic single track";

  return {
    ...plan,
    project: { ...plan.project, target_duration_sec: targetDuration },
    music: {
      ...plan.music,
      selected_song: selected,
      bpm_estimate: bpm,
      beat_sync: true,
      beat_markers: beatMarkers.filter((n) => n <= targetDuration + 0.1),
      bass_drops: bassDrops.filter((n) => n <= targetDuration + 0.1),
      song_suggestions: Array.from(new Set([selected, ...(plan.music.song_suggestions || [])])).slice(0, 4),
      audio_mix: plan.music.audio_mix || {
        volume_balance: "Song at -8 LUFS with clip audio ducked under music for clear, audible cinematic playback",
        fade_in_sec: 0.6,
        fade_out_sec: 0.9,
        bass_enhancement: "Gentle low-shelf boost on bass drops and transitions",
      },
    },
  };
};

export const Route = createFileRoute("/api/edit-plan")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "content-type",
        };

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }

        const parsed = RequestSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: parsed.error.flatten() }),
            { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
          );
        }

        const key =
          (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
            ?.LOVABLE_API_KEY ?? "";
        if (!key) {
          return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
            status: 500,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const userPrompt = `Category: ${parsed.data.category}
Language: ${parsed.data.language}
Target platform: ${parsed.data.platform}
User instructions: ${parsed.data.instructions}
Reference video description: ${parsed.data.reference || "(none provided)"}

User's uploaded clips (use these exact names as clip_ref):
${parsed.data.clips
  .map(
    (c, i) =>
      `${i + 1}. "${c.name}"${c.duration_sec ? ` (${c.duration_sec}s)` : ""}${c.description ? ` — ${c.description}` : ""}`,
  )
  .join("\n")}

Produce the edit plan now.`;

        try {
          const { experimental_output: output } = await generateText({
            model,
            system: SYSTEM_PROMPT,
            prompt: userPrompt,
            experimental_output: Output.object({ schema: EditPlanSchema }),
          });

          return new Response(JSON.stringify(output), {
            status: 200,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          const status = /429/.test(message) ? 429 : /402/.test(message) ? 402 : 500;
          return new Response(JSON.stringify({ error: message }), {
            status,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
      },
      OPTIONS: () =>
        new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        }),
    },
  },
});
