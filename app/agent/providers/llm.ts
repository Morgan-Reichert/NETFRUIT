import { config, log } from '../config'
import type { Brief, Character, Concept, Lang } from '../types'
import { FRUIT_THEMES } from '../../src/data/series'
import { geminiText } from './gemini'
import { falRun } from './fal'

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const FRUIT_LABEL: Record<string, string> = {
  strawberry: 'strawberry', blueberry: 'blueberry', grape: 'grape', orange: 'orange',
  watermelon: 'watermelon', lemon: 'lemon', cherry: 'cherry', peach: 'peach',
  banana: 'banana', pineapple: 'pineapple', kiwi: 'kiwi', mango: 'mango',
  coconut: 'coconut', apple: 'apple', avocado: 'avocado', dragonfruit: 'dragonfruit',
}

// Distinct ElevenLabs (fal) voices assigned round-robin to characters.
const VOICE_POOL = ['Roger', 'Sarah', 'George', 'Charlotte', 'Callum', 'Alice', 'Brian', 'Jessica']

function assignVoices(chars: Character[]): Character[] {
  return chars.map((c, i) => ({ ...c, voice: c.voice || VOICE_POOL[i % VOICE_POOL.length] }))
}

/* --------------------------- mock (free/offline) --------------------------- */

const GENRE_KITS = [
  { genres: ['Telenovela', 'Comedy', 'AI Original'], tags: ['Wacky', 'Over-the-top'], maturity: '13+', word: 'Betrayal' },
  { genres: ['Thriller', 'Mystery', 'AI Original'], tags: ['Suspenseful', 'Twisty'], maturity: '16+', word: 'Conspiracy' },
  { genres: ['Drama', 'Crime', 'AI Original'], tags: ['Absurd', 'Gripping'], maturity: '16+', word: 'Empire' },
  { genres: ['Sci-Fi', 'Comedy', 'AI Original'], tags: ['Surreal', 'Unhinged'], maturity: '13+', word: 'Uprising' },
]

function mockConcept(brief: Brief): Concept {
  const name = FRUIT_LABEL[brief.fruit] ?? brief.fruit
  const cap = name[0].toUpperCase() + name.slice(1)
  const kit = GENRE_KITS[name.length % GENRE_KITS.length]
  const title = `${cap} ${kit.word}`
  const id = slug(title)
  const N = config.shotsPerEpisode

  const characters = assignVoices([
    { name: `Don ${cap}`, look: `a brooding ${name} in a velvet suit`, voice: '' },
    { name: 'Signora Fig', look: 'a scheming fig in a feathered hat', voice: '' },
    { name: 'Narrator', look: 'unseen dramatic narrator', voice: '' },
  ])

  // A tiny escalating telenovela beat sheet, cycled to fill N shots.
  const beats: { speaker: string; en: string; fr: string; es: string; vp: string }[] = [
    { speaker: 'Narrator', en: `In the orchard of secrets, one ${name} kept the darkest one.`, fr: `Dans le verger des secrets, un ${name} gardait le plus sombre.`, es: `En el huerto de los secretos, un ${name} guardaba el más oscuro.`, vp: `slow cinematic push-in on a moody ${name} at dawn, fog rolling, dramatic` },
    { speaker: `Don ${cap}`, en: `You swore the jam vault was empty. You LIED to me.`, fr: `Tu avais juré que le coffre à confiture était vide. Tu m'as MENTI.`, es: `Juraste que la bóveda de mermelada estaba vacía. ¡Me MENTISTE!`, vp: `${name} character slams a table, juice splashing, handheld shaky cam, tense` },
    { speaker: 'Signora Fig', en: `Everyone lies in this orchard, darling. Even the seeds.`, fr: `Tout le monde ment dans ce verger, mon chéri. Même les pépins.`, es: `Todos mienten en este huerto, cariño. Hasta las semillas.`, vp: `a fig in a feathered hat turns dramatically, camera orbits, candlelight flicker` },
    { speaker: `Don ${cap}`, en: `Then tonight… the whole fruit bowl BURNS.`, fr: `Alors ce soir… tout le saladier de fruits BRÛLERA.`, es: `Entonces esta noche… todo el frutero ARDERÁ.`, vp: `${name} silhouette against fire, embers flying, slow zoom, epic` },
    { speaker: 'Narrator', en: `But behind the compost bin, someone was listening…`, fr: `Mais derrière le bac à compost, quelqu'un écoutait…`, es: `Pero detrás del cubo de compost, alguien escuchaba…`, vp: `shadowy figure peeking, rack focus reveal, suspenseful, moody lighting` },
    { speaker: 'Signora Fig', en: `The prophecy was right. The chosen ${name} has awakened.`, fr: `La prophétie disait vrai. Le ${name} élu s'est éveillé.`, es: `La profecía tenía razón. El ${name} elegido ha despertado.`, vp: `glowing ${name} rising, magical particles, sweeping crane shot, dramatic` },
  ]

  const shots = Array.from({ length: N }, (_, i) => {
    const b = beats[i % beats.length]
    return {
      index: i,
      speaker: b.speaker,
      visualPrompt: `${b.vp}, hyper-detailed, cinematic film still, volumetric light, film grain`,
      captions: { en: b.en, fr: b.fr, es: b.es } as Record<Lang, string>,
      durationSec: 6,
    }
  })

  return {
    meta: {
      id,
      title,
      fruit: brief.fruit,
      year: 2026,
      maturity: kit.maturity,
      seasons: 1,
      match: 82 + (name.length % 16),
      genres: kit.genres,
      tags: kit.tags,
      synopsis:
        `A gloriously unhinged fruit telenovela. When Don ${cap} discovers the jam vault betrayal, ` +
        `a night of fire, prophecy and pulp begins — and no seed is safe. Suspense served extra ripe.`,
      runtime: `${Math.round((N * 6) / 60) || 1}–${Math.round((N * 6) / 60) + 1} min episodes`,
    },
    episode: {
      number: 1,
      title: `${title} — Episode 1: The Jam Vault`,
      logline: `Don ${cap}'s empire cracks open.`,
      characters,
      shots,
    },
    posterPrompt:
      `Bold Netflix key art for "${title}", a dramatic anthropomorphic ${name} in a velvet suit, ` +
      `moody telenovela lighting, deep reds and shadow, cinematic, title space at bottom`,
  }
}

/* ------------------------------ shared prompt ------------------------------ */

const SYSTEM = `You are the showrunner for NETFRUIT — a streaming service of short, WILDLY entertaining
AI-generated fruit series. Think telenovela drama crossed with Adult Swim absurdity: wacky, campy,
genuinely suspenseful, with cliffhangers. Given a fruit, create ONE episode.

Return ONLY minified JSON, no prose, matching EXACTLY:
{"title":str,"maturity":"7+"|"13+"|"16+"|"18+","seasons":int,"match":int(82-99),
 "genres":[str,str,"AI Original"],"tags":[str,str],"synopsis":str(<=320 chars),
 "runtime":str,"posterPrompt":str,
 "characters":[{"name":str,"look":str,"voice":str}],
 "shots":[{"speaker":str,"visualPrompt":str,"captions":{"en":str,"fr":str,"es":str},"durationSec":int}]}

Rules:
- 2 to 4 named CHARACTERS. Each is a Pixar-style 3D fruit MASCOT with a clearly visible
  cartoon face — big expressive eyes, eyebrows, and an open mouth — and a little body/outfit.
  Put that in "look". "voice" = one of: Roger, Sarah, George, Charlotte, Callum, Alice, Brian, Jessica (distinct per character).
- Exactly {{N}} shots forming a real story arc: hook → rising tension → twist → CLIFFHANGER. Make it loufoque (zany), dramatic and suspenseful.
- Each shot = ONE punchy spoken line by a character (use their name in "speaker"; use "Narrator" for narration). "captions" gives that line in EN, FR, ES — natural, idiomatic, funny (not literal).
- "visualPrompt" renders the SPEAKING character front-facing, face clearly visible and close enough
  to read the mouth, Pixar 3D style, plus camera MOTION and ACTION (push-in, gesturing, slam, dramatic lighting).
  Keep each character's look consistent across shots. English only for title/synopsis/visualPrompt.
- durationSec 5–8 per shot.`

function userPrompt(brief: Brief): string {
  const name = FRUIT_LABEL[brief.fruit] ?? brief.fruit
  return `Fruit: ${name}. ${brief.hint ? 'Direction: ' + brief.hint + '. ' : ''}Return the JSON now.`
}

const systemPrompt = () => SYSTEM.replace('{{N}}', String(config.shotsPerEpisode))

function parseConcept(text: string, brief: Brief): Concept {
  const name = FRUIT_LABEL[brief.fruit] ?? brief.fruit
  const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
  const title: string = json.title ?? `${name} Story`
  const id = slug(title)

  const characters = assignVoices(
    (json.characters ?? []).map((c: any) => ({
      name: String(c.name ?? 'Narrator'),
      look: String(c.look ?? ''),
      voice: String(c.voice ?? ''),
    })),
  )

  const shots = (json.shots ?? []).slice(0, config.shotsPerEpisode).map((s: any, i: number) => {
    const c = s.captions ?? {}
    const en = String(c.en ?? s.narration ?? '')
    return {
      index: i,
      speaker: String(s.speaker ?? 'Narrator'),
      visualPrompt: String(s.visualPrompt ?? ''),
      captions: { en, fr: String(c.fr ?? en), es: String(c.es ?? en) } as Record<Lang, string>,
      durationSec: Number(s.durationSec ?? 6),
    }
  })

  return {
    meta: {
      id,
      title,
      fruit: brief.fruit,
      year: 2026,
      maturity: json.maturity ?? '16+',
      seasons: Number(json.seasons ?? 1),
      match: Number(json.match ?? 92),
      genres: json.genres ?? ['Telenovela', 'Drama', 'AI Original'],
      tags: json.tags ?? ['Wacky', 'Suspenseful'],
      synopsis: String(json.synopsis ?? ''),
      runtime: json.runtime ?? `${shots.length} beats`,
    },
    episode: {
      number: 1,
      title: `${title} — Episode 1`,
      logline: json.synopsis ?? '',
      characters,
      shots,
    },
    posterPrompt: json.posterPrompt ?? `Dramatic Netflix key art for ${title}`,
  }
}

/* ------------------------------ providers ---------------------------------- */

async function anthropicConcept(brief: Brief): Promise<Concept> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: config.anthropicKey })
  const res = await client.messages.create({
    model: config.anthropicModel,
    max_tokens: 3000,
    system: systemPrompt(),
    messages: [{ role: 'user', content: userPrompt(brief) }],
  })
  const text = res.content.find((b) => b.type === 'text')?.text ?? '{}'
  return parseConcept(text, brief)
}

async function geminiConcept(brief: Brief): Promise<Concept> {
  const text = await geminiText(systemPrompt(), userPrompt(brief))
  return parseConcept(text, brief)
}

async function falConcept(brief: Brief): Promise<Concept> {
  const res = await falRun<{ output?: string }>('fal-ai/any-llm', {
    model: config.falTextModel,
    system_prompt: systemPrompt(),
    prompt: userPrompt(brief),
  })
  return parseConcept(String(res.output ?? ''), brief)
}

export async function generateConcept(brief: Brief): Promise<Concept> {
  void FRUIT_THEMES
  if (config.llm === 'fal' && config.falKey) {
    try {
      log('script', `fal any-llm (${config.falTextModel}) writing "${brief.fruit}"…`)
      return await falConcept(brief)
    } catch (e) {
      log('script', `fal LLM failed (${(e as Error).message}); using mock.`)
    }
  } else if (config.llm === 'anthropic' && config.anthropicKey) {
    try {
      log('script', `Claude (${config.anthropicModel}) writing "${brief.fruit}"…`)
      return await anthropicConcept(brief)
    } catch (e) {
      log('script', `Claude failed (${(e as Error).message}); using mock.`)
    }
  } else if (config.llm === 'gemini' && config.geminiKey) {
    try {
      log('script', `Gemini (${config.geminiTextModel}) writing "${brief.fruit}"…`)
      return await geminiConcept(brief)
    } catch (e) {
      log('script', `Gemini failed (${(e as Error).message}); using mock.`)
    }
  }
  log('script', `mock writer drafting "${brief.fruit}"…`)
  return mockConcept(brief)
}
