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

const SYSTEM_PROMPT = `You are Smart Reel, an AI cinematic video-editing assistant for Indian and Marathi creators (weddings, haldi, birthdays, Instagram reels, YouTube, travel, festivals, vlogs).

Given the user's clip list, optional reference video description, category, language and free-text instructions, produce a complete, professional EDIT PLAN as structured JSON.

Rules:
- Match the reference's pacing, transitions, color grade, and text animation style when provided.
- Weddings/Haldi: warm golden cinematic grade, slow-motion hero moments, romantic/Marathi tracks.
- Instagram Reel: 9:16, fast beat-synced cuts, bold kinetic text, 15-30s.
- YouTube: 16:9, smoother pacing, hook in first 3s.
- Suggest exactly 3 song options matching mood + language.
- Use SPECIFIC transitions ("whip pan left", "zoom blur", "light leak wipe", "match cut") — never generic "fade".
- Captions short, punchy, in requested language.
- Only reference clip_ref values from the provided clip list. Never invent clips.
- Put any warnings (too few clips, etc.) in notes_for_creator.`;

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
