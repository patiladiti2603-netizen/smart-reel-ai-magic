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
    bpm_estimate: z.number(),
    song_suggestions: z.array(z.string()),
    beat_sync: z.boolean(),
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
- SINGLE SONG ONLY. Pick ONE song (or use the one the user uploaded if mentioned) and use it for the ENTIRE reel. NEVER suggest a different song for different clips. The 3 song_suggestions are alternatives the user could swap to, but only ONE is the chosen track — list the chosen track first.
- BEAT SYNC. Pick a specific BPM (70-160) and set music.beat_sync=true. Every timeline cut MUST land on a beat: spacing = 60/bpm (or clean multiples/fractions). Hero cuts land on bass drops.
- HOOK in first 1.5s with the strongest clip + punchy transition.
- End on an emotional or punchy beat, never a soft fade.

CAPTIONS (read user instructions for "Captions ENABLED" vs "Captions DISABLED"):
- If DISABLED: every timeline[].caption MUST be null. text_animations MUST be an empty array []. subtitles.enabled = false. Do NOT invent any text overlays.
- If ENABLED: split the user-provided caption text across hero moments. Use the user's exact words; do not paraphrase. Place text_animations on beat moments.

CINEMATIC EDITING — never just "join clips". Use SPECIFIC trending effects per cut:
- transitions: "whip pan left", "zoom punch in", "motion blur swipe", "flash cut", "velocity edit", "light leak wipe", "match cut on movement", "shake transition", "speed ramp" — never generic "fade"
- effects: motion blur, cinematic zoom, slow-mo (0.5x), speed ramp (1.5-2x), camera shake, glow, film grain, lens flare, flash
- vary clip speed: slow-mo for emotional hero shots, normal for story, fast for energy builds

CLIP UNDERSTANDING — infer emotion/scene from the clip name and description (wedding, haldi, dance, romantic, travel, group, selfie, action, smiling) and choose pacing, transitions, color grade and text accordingly.

REFERENCE MATCHING — when a reference reel is mentioned, DEEPLY mirror its pacing, transition vocabulary, cut frequency, color grade, text animation style, and beat-sync feel. Put detailed match analysis in style.reference_match_notes (2-3 sentences).

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
