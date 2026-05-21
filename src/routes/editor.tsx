import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
} from "lucide-react";
import logo from "@/assets/smart-reel-logo.png";

export const Route = createFileRoute("/editor")({
  component: Editor,
  head: () => ({
    meta: [
      { title: "Smart Reel — AI Editor" },
      { name: "description", content: "Generate a cinematic edit plan from your clips." },
    ],
  }),
});

type Clip = { name: string; description: string; duration_sec?: number };

type EditPlan = {
  project: { title: string; category: string; aspect_ratio: string; target_duration_sec: number; language: string };
  style: { mood: string; color_grade: string; pacing: string; reference_match_notes: string };
  music: { genre: string; bpm_estimate: number; song_suggestions: string[]; beat_sync: boolean };
  timeline: Array<{ index: number; clip_ref: string; in_sec: number; out_sec: number; speed: number; effect: string; transition_in: string; caption: string | null }>;
  text_animations: Array<{ at_sec: number; text: string; style: string }>;
  subtitles: { enabled: boolean; language: string; style: string };
  export: { resolution: string; format: string; platform: string };
  notes_for_creator: string;
};

const CATEGORIES = ["Wedding", "Haldi", "Birthday", "Instagram Reel", "YouTube", "Travel", "Festival", "Vlog"];
const PLATFORMS = ["Instagram Reel", "YouTube", "WhatsApp Status"] as const;
const LANGUAGES = ["Marathi", "Hindi", "English"];

const EXAMPLES = [
  "Create cinematic Marathi wedding reel with golden grade",
  "Fast beat Instagram reel, bold kinetic text",
  "Slow-mo couple intro with romantic Marathi song",
  "Travel vlog with drone cinematic feel",
];

function Editor() {
  const [category, setCategory] = useState("Wedding");
  const [language, setLanguage] = useState("Marathi");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("Instagram Reel");
  const [instructions, setInstructions] = useState("");
  const [reference, setReference] = useState("");
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<EditPlan | null>(null);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next: Clip[] = Array.from(files).map((f) => ({
      name: f.name,
      description: f.type.startsWith("video") ? "video clip" : "photo",
    }));
    setClips((prev) => [...prev, ...next]);
  };

  const removeClip = (i: number) => setClips((c) => c.filter((_, idx) => idx !== i));

  const submit = async () => {
    setError(null);
    setPlan(null);
    if (!instructions.trim()) return setError("Add at least one editing instruction.");
    if (clips.length === 0) return setError("Add at least one clip or photo.");
    setLoading(true);
    try {
      const res = await fetch("/api/edit-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, language, platform, instructions, reference, clips }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
        if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to generate edit plan.");
      }
      setPlan(data as EditPlan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
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
          <span className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        {/* form */}
        <section className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">AI Editor</h1>
            <p className="mt-1 text-sm text-white/60">
              Add your clips, paste a reference vibe, and Smart Reel will draft the full edit plan.
            </p>
          </div>

          {/* uploads */}
          <Card>
            <Label icon={Upload} title="Clips & photos" />
            <label className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center hover:border-fuchsia-400/40 cursor-pointer">
              <Upload className="h-5 w-5 text-white/50" />
              <span className="mt-2 text-sm text-white/70">Tap to add videos or photos</span>
              <span className="text-xs text-white/40">Files stay in your browser — only names are sent to AI</span>
              <input
                type="file"
                multiple
                accept="video/*,image/*"
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </label>
            {clips.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {clips.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span className="truncate text-white/80">{c.name}</span>
                    <button
                      onClick={() => removeClip(i)}
                      className="text-white/40 hover:text-fuchsia-400"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* category / language / platform */}
          <Card>
            <Label icon={Film} title="Project" />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Select label="Category" value={category} onChange={setCategory} options={CATEGORIES} />
              <Select label="Language" value={language} onChange={setLanguage} options={LANGUAGES} />
              <Select
                label="Platform"
                value={platform}
                onChange={(v) => setPlatform(v as (typeof PLATFORMS)[number])}
                options={PLATFORMS as unknown as string[]}
              />
            </div>
          </Card>

          {/* instructions */}
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

          {/* reference */}
          <Card>
            <Label icon={Sparkles} title="Reference video (optional)" />
            <textarea
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              rows={2}
              placeholder="Describe the reference reel's vibe: pacing, transitions, color grade, music..."
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm placeholder:text-white/30 focus:border-fuchsia-400/50 focus:outline-none"
            />
          </Card>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-blue-500 px-6 py-3.5 text-sm font-medium shadow-lg shadow-fuchsia-500/30 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cooking your reel...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate edit plan
              </>
            )}
          </button>
        </section>

        {/* result */}
        <section className="lg:sticky lg:top-24 lg:self-start">
          {!plan && !loading && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-blue-500/20 ring-1 ring-white/10">
                <Film className="h-6 w-6 text-fuchsia-300" />
              </div>
              <h3 className="mt-5 text-base font-semibold">Your edit plan will appear here</h3>
              <p className="mt-2 text-sm text-white/50">
                Timeline, transitions, beat-synced music and captions — all auto-generated.
              </p>
            </div>
          )}

          {loading && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-fuchsia-300" />
              <p className="mt-4 text-sm text-white/70">Analyzing clips, matching reference, syncing beats...</p>
            </div>
          )}

          {plan && <PlanView plan={plan} />}
        </section>
      </main>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5">
      {children}
    </div>
  );
}

function Label({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-fuchsia-300" />
      <h3 className="text-sm font-medium">{title}</h3>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs text-white/50">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm focus:border-fuchsia-400/50 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#0e0a1a]">
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function PlanView({ plan }: { plan: EditPlan }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/10 to-blue-500/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{plan.project.title}</h2>
            <p className="mt-1 text-xs text-white/60">
              {plan.project.category} · {plan.project.aspect_ratio} · {plan.project.target_duration_sec}s · {plan.project.language}
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px]">
            {plan.export.resolution} · {plan.export.platform}
          </span>
        </div>
      </div>

      <Section icon={Palette} title="Style">
        <Row k="Mood" v={plan.style.mood} />
        <Row k="Color grade" v={plan.style.color_grade} />
        <Row k="Pacing" v={plan.style.pacing} />
        {plan.style.reference_match_notes && (
          <Row k="Reference notes" v={plan.style.reference_match_notes} />
        )}
      </Section>

      <Section icon={Music2} title={`Music · ${plan.music.bpm_estimate} BPM`}>
        <Row k="Genre" v={plan.music.genre} />
        <div className="mt-2 space-y-1.5">
          {plan.music.song_suggestions.map((s, i) => (
            <div key={i} className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm">
              {s}
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Film} title={`Timeline · ${plan.timeline.length} cuts`}>
        <div className="space-y-2">
          {plan.timeline.map((t) => (
            <div key={t.index} className="rounded-lg border border-white/5 bg-white/[0.03] p-3 text-sm">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>#{t.index + 1} · {t.clip_ref}</span>
                <span>
                  {t.in_sec.toFixed(1)}s → {t.out_sec.toFixed(1)}s {t.speed !== 1 && `· ${t.speed}x`}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {t.transition_in && (
                  <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[11px] text-fuchsia-200">
                    ↪ {t.transition_in}
                  </span>
                )}
                {t.effect && (
                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] text-blue-200">
                    {t.effect}
                  </span>
                )}
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

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
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
