import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Play,
  Wand2,
  Music2,
  Film,
  Languages,
  Check,
  ArrowRight,
} from "lucide-react";
import logo from "@/assets/smart-reel-logo.png";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Smart Reel — AI Cinematic Video Editor for Creators" },
      {
        name: "description",
        content:
          "Turn your clips into cinematic reels in one click. AI-powered editing for Indian & Marathi creators — weddings, reels, YouTube, travel.",
      },
      { property: "og:title", content: "Smart Reel — AI Cinematic Video Editor" },
      {
        property: "og:description",
        content: "Edit Smarter. Create Faster. One click. Viral reel.",
      },
    ],
  }),
});

const categories = [
  "Wedding",
  "Haldi",
  "Birthday",
  "Instagram Reel",
  "YouTube",
  "Travel",
  "Festival",
  "Vlog",
];

const features = [
  {
    icon: Wand2,
    title: "Reference style copy",
    desc: "Upload any sample reel and Smart Reel mimics its transitions, color grade and pacing.",
  },
  {
    icon: Music2,
    title: "Auto beat sync",
    desc: "Clips snap to the beat — trending Marathi, Hindi and royalty-free tracks suggested.",
  },
  {
    icon: Film,
    title: "Cinematic transitions",
    desc: "Whip pans, zoom blurs, light leaks and match cuts — not generic fades.",
  },
  {
    icon: Languages,
    title: "Marathi-first",
    desc: "Captions and subtitles in Marathi, Hindi and English with kinetic text animations.",
  },
];

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    features: ["4 exports", "Watermark", "720p export", "Limited templates"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "1 Day",
    price: "₹49",
    period: "/ day",
    features: ["Unlimited exports", "No watermark", "1080p + 4K", "All templates"],
    cta: "Go Premium",
    highlight: false,
  },
  {
    name: "1 Month",
    price: "₹349",
    period: "/ month",
    features: [
      "Everything in 1 Day",
      "Premium songs & FX",
      "Faster rendering",
      "Cloud backup",
    ],
    cta: "Most popular",
    highlight: true,
  },
  {
    name: "1 Year",
    price: "₹2999",
    period: "/ year",
    features: [
      "Everything in Monthly",
      "Advanced reference AI",
      "Priority support",
      "Save ₹1189",
    ],
    cta: "Best value",
    highlight: false,
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-[#07050f] text-white antialiased overflow-x-hidden">
      {/* glow blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-fuchsia-600/30 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-blue-600/30 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-violet-600/20 blur-[120px]" />
      </div>

      {/* nav */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#07050f]/70 border-b border-white/5">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Smart Reel" className="h-9 w-9" />
            <span className="text-lg font-semibold tracking-tight">
              Smart<span className="bg-gradient-to-r from-fuchsia-400 to-blue-400 bg-clip-text text-transparent"> Reel</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#templates" className="hover:text-white">Templates</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
          </div>
          <Link
            to="/editor"
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-blue-500 px-4 py-2 text-sm font-medium shadow-lg shadow-fuchsia-500/20 hover:opacity-90"
          >
            Try the AI editor
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-5 pt-16 md:pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/70">
          <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
          AI Powered Video Editing
        </div>
        <h1 className="mt-6 text-4xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
          Turn moments into{" "}
          <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
            cinematics.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-white/60">
          Upload your clips, drop a reference reel, type one instruction.
          Smart Reel's AI matches the style, beats and grade — and exports a
          ready-to-post reel for Instagram, YouTube and WhatsApp.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/editor"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-blue-500 px-6 py-3 text-sm font-medium shadow-lg shadow-fuchsia-500/30 hover:opacity-95"
          >
            <Play className="h-4 w-4" fill="currentColor" />
            Generate my reel
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#features"
            className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/80 hover:bg-white/10"
          >
            See how it works
          </a>
        </div>

        {/* category chips */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {categories.map((c) => (
            <span
              key={c}
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/70"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
          One click. Viral reel.
        </h2>
        <p className="mt-3 text-center text-white/60 max-w-xl mx-auto">
          Everything a wedding editor, reel creator or YouTuber needs — powered by AI.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 hover:border-fuchsia-400/30 transition"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-blue-500/20 ring-1 ring-white/10">
                <f.icon className="h-5 w-5 text-fuchsia-300" />
              </div>
              <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* templates */}
      <section id="templates" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
          Templates built for India
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "Marathi Wedding", tag: "Cinematic" },
            { name: "Haldi Cinematic", tag: "Warm" },
            { name: "Birthday Reel", tag: "Punchy" },
            { name: "Romantic Couple", tag: "Slow-mo" },
            { name: "Festival Reel", tag: "Vibrant" },
            { name: "YouTube Intro", tag: "Bold" },
            { name: "Travel Vlog", tag: "Drone" },
            { name: "Trending Reel", tag: "Beat-sync" },
          ].map((t) => (
            <div
              key={t.name}
              className="relative aspect-[9/12] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-violet-500/5 to-blue-500/10 p-5 flex flex-col justify-end"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(217,70,239,0.18),transparent_60%)]" />
              <div className="relative">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70">
                  {t.tag}
                </span>
                <h3 className="mt-2 text-base font-semibold">{t.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
          Premium that pays for itself
        </h2>
        <p className="mt-3 text-center text-white/60">
          Pay with UPI, PhonePe, Google Pay or cards via Razorpay.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-6 ${
                p.highlight
                  ? "border-fuchsia-400/40 bg-gradient-to-b from-fuchsia-500/10 to-blue-500/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-500 to-blue-500 px-3 py-1 text-[10px] uppercase tracking-wider font-medium">
                  Popular
                </span>
              )}
              <h3 className="text-sm font-medium text-white/70">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold">{p.price}</span>
                <span className="text-sm text-white/50">{p.period}</span>
              </div>
              <ul className="mt-5 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`mt-6 w-full rounded-full px-4 py-2.5 text-sm font-medium ${
                  p.highlight
                    ? "bg-gradient-to-r from-fuchsia-500 to-blue-500 shadow-lg shadow-fuchsia-500/20"
                    : "border border-white/15 bg-white/5 hover:bg-white/10"
                }`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* footer cta */}
      <section className="mx-auto max-w-4xl px-5 py-20 text-center">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Edit Smarter. Create Faster.
        </h2>
        <Link
          to="/editor"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-blue-500 px-6 py-3 text-sm font-medium shadow-lg shadow-fuchsia-500/30"
        >
          Try Smart Reel free
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Smart Reel — AI Powered Video Editing
      </footer>
    </div>
  );
}
