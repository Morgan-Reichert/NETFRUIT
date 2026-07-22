# NETFRUIT — Generation Agent 🤖🍓

Automates the creation of AI fruit mini-series and publishes them straight into
the app catalog.

```
Agent (fills the least-covered fruits, QA-gates each)
  └─ Pipeline per episode:
     1. screenplay: characters + dialogue (FR/EN/ES)  → LLM        (providers/llm.ts)
     2. fruit-mascot key art + keyframes              → image      (providers/image.ts)
     3. voice per character, per language             → TTS        (providers/voice.ts)
     4. talking + moving clip + phoneme lip-sync      → video      (providers/video.ts)
     5. assemble timeline / stitched mp4              → ffmpeg     (providers/assemble.ts)
     6. publish → public/catalog.json  +  public/generated/<id>/*
```

## Premium stack — fal.ai (one key, everything)

With `FAL_KEY` set (see `.env.example`) the whole pipeline runs on fal.ai:
gpt-4o screenplay, Flux fruit-mascot art, ElevenLabs distinct per-character
voices in FR/EN/ES, Kling talking video, and `sync-lipsync` phoneme lip-sync on
top. Each shot = one fal video clip, so cost scales with `NETFRUIT_SHOTS`.

> Note: photoreal lip-sync models (SadTalker) reject stylized fruit faces, so
> we hard-prompt Pixar-style fruit mascots (which read as a face) and use
> Kling + `sync-lipsync`, which handle them.

The app reads `public/catalog.json` at runtime (`src/lib/catalog.ts`) and merges
generated titles into the recommendation feed — they show up under
**“Fresh from the NETFRUIT AI 🤖”**.

## Run it

```bash
# Produce the 3 least-covered fruits (fully free/offline mock providers):
npm run generate

# Produce N series:
npm run generate -- 6

# One specific fruit, with a creative nudge:
npm run generate -- --fruit mango --hint "noir detective"

# List what's been generated:
npm run catalog
```

Everything defaults to **free, offline mock providers**, so it always completes
with zero keys and zero cost. Mock output is real, viewable SVG key art +
per-shot clip/voice manifests + an `episode.json` timeline.

## Going real — best FREE stack (recommended)

**One free Google AI Studio key covers image + voice + script**, all high quality:

1. Get a free key (no billing) at <https://aistudio.google.com/apikey>
2. `cp .env.example .env` and paste it as `GEMINI_API_KEY=...`
3. `npm run generate -- 4`

That's it — with the key present, image/voice/script auto-select Gemini:

| Stage  | Provider (auto)                | Model                        | Cost |
|--------|--------------------------------|------------------------------|------|
| Script | Gemini                         | `gemini-2.5-flash`           | free tier |
| Image  | Gemini ("Nano Banana")         | `gemini-2.5-flash-image`     | free tier |
| Voice  | Gemini TTS                     | `gemini-2.5-flash-preview-tts` | free tier |
| Video  | mock (still-clip)              | —                            | free |

No-key alternative that still looks great: `NETFRUIT_IMAGE=pollinations`
(free Flux images, no signup) + mock voice.

### Other providers

| Env                          | Use                              | Cost |
|------------------------------|----------------------------------|------|
| `NETFRUIT_IMAGE=fal-flux` + `FAL_KEY` | Flux schnell             | ~$0.003/img |
| `NETFRUIT_VIDEO=fal-ltx` + `FAL_KEY`  | LTX-Video real clips     | ~$0.02–0.10/clip |
| `NETFRUIT_VOICE=elevenlabs` + `ELEVENLABS_API_KEY` | premium voice | free tier ~10k chars/mo |
| `ANTHROPIC_API_KEY`          | scripts via Claude               | paid |
| `NETFRUIT_VOICE=openai` + `OPENAI_API_KEY` | tts-1 voice        | paid |

Real video needs no free API today — either keep the free still-clip / Ken-Burns
timeline, or use `FAL_KEY` credits for a handful of LTX clips.

Other knobs: `NETFRUIT_SHOTS` (default 5), `NETFRUIT_GEMINI_VOICE` (Kore, Puck,
Charon, Fenrir, Aoede…), `NETFRUIT_OUT`.

## Notes

- **Keys never touch the browser.** The agent runs in Node; only the finished
  media + `catalog.json` land in `public/`.
- Each stage **degrades gracefully**: a provider failure falls back to the mock
  so a run never half-fails.
- `producedBy` on every catalog entry records which providers made it.
- Real image-to-video (`fal-ltx`) needs the keyframe to be publicly reachable;
  deploy `public/generated/` or pass hosted image URLs when wiring that path.
- `ffmpeg` on PATH enables real clip stitching into `episode.mp4` when all shots
  are real video; otherwise the app plays the `episode.json` timeline.
