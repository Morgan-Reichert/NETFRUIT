# 🍓 NETFRUIT

A Netflix-style streaming app for **AI-generated fruit mini-series** — wacky,
dramatic, suspenseful telenovelas starring talking fruit mascots, generated
end-to-end by an autonomous agent.

![made with](https://img.shields.io/badge/stack-React%2019%20%C2%B7%20Vite%20%C2%B7%20Tailwind%20v4-c31026)

## What's inside

```
app/                 Vite + React 19 + TS + Tailwind v4 front-end
  src/               UI: hero, content rows, detail modal, episode player, recommender
  agent/             The generation agent (Node/tsx) — turns a fruit into a full episode
  public/brand/      NETFRUIT logos
```

### The app
- Cinematic Netflix-style UI (berry-dark theme, custom SVG icon set, no emoji).
- **Recommendation engine** — personalized feed, trending, similarity, continue-watching,
  reacting live to likes/watches (persisted in `localStorage`).
- **Episode player** — plays generated episodes with controls for playback speed,
  image quality, subtitles, and **audio + subtitles in FR / EN / ES**.

### The generation agent (`app/agent/`)
An autonomous pipeline that produces a complete episode and publishes it into the
app catalog:

```
concept + screenplay (LLM)
  → fruit-mascot key art (Flux)
  → distinct voice per character, FR/EN/ES (ElevenLabs)
  → talking, moving video (Kling image-to-video) + phoneme lip-sync (sync-lipsync)
  → assemble → publish to public/catalog.json
```

Providers are pluggable. With a **fal.ai** key everything runs premium; with a free
**Gemini** key or **Pollinations** (no key) it runs on a free tier; with no keys it
runs fully offline on deterministic mocks.

## Quick start

```bash
cd app
npm install
npm run dev            # http://localhost:5173

# generate episodes (see app/.env.example for keys)
cp .env.example .env
npm run generate -- 3
```

See [`app/agent/README.md`](app/agent/README.md) for the full provider matrix.
