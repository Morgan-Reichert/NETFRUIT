import { useEffect, useState } from 'react'
import {
  addEpisode, createSeries, deleteEpisode, listEpisodes, readVideoDuration,
  slugify, submitSeries, updateEpisode, uploadToBucket,
  type Creator, type DbEpisode, type DbSeries, type Monetization,
} from '../lib/creator'
import { supabase } from '../lib/supabase'
import SeriesMeta from './SeriesMeta'
import CreditsMovie from './CreditsMovie'

const FRUITS = ['strawberry', 'banana', 'grape', 'orange', 'lemon', 'kiwi', 'mango', 'cherry', 'peach', 'watermelon', 'pineapple', 'apple', 'dragonfruit', 'raspberry', 'lime', 'pear']

export default function SeriesEditor({ creator, seriesId, onBack }: {
  creator: Creator; seriesId?: string; onBack: () => void
}) {
  const [series, setSeries] = useState<DbSeries | null>(null)
  const [episodes, setEpisodes] = useState<DbEpisode[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [showCredits, setShowCredits] = useState(false)

  // form fields (for a NEW series)
  const [title, setTitle] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [fruit, setFruit] = useState('strawberry')
  const [genres, setGenres] = useState('')
  const [monetization, setMonetization] = useState<Monetization>('free')
  const [tokenCost, setTokenCost] = useState('10')
  const [posterFile, setPosterFile] = useState<File | null>(null)

  useEffect(() => {
    if (!seriesId || !supabase) return
    supabase.from('series').select('*').eq('id', seriesId).single().then(({ data }) => {
      if (data) setSeries(data as DbSeries)
    })
    listEpisodes(seriesId).then(setEpisodes)
  }, [seriesId])

  // ---- create the series (draft) ----
  const create = async () => {
    setMsg(null)
    if (!title.trim()) { setMsg('Donne un titre.'); return }
    setBusy(true)
    let poster_url: string | null = null
    try {
      const slug = slugify(title)
      if (posterFile) poster_url = await uploadToBucket(creator.id, slug, `poster.${ext(posterFile)}`, posterFile)
      const tok = monetization === 'purchase' ? Math.max(0, parseInt(tokenCost || '0', 10)) : 0
      const r = await createSeries(creator.id, {
        slug, title: title.trim(), synopsis: synopsis.trim(), fruit,
        genres: genres.split(',').map((g) => g.trim()).filter(Boolean),
        tags: [], poster_url, maturity: 'PG', monetization,
        price_cents: null,
        episode_token_cost: tok,
        in_premium: monetization === 'subscription',
      })
      setBusy(false)
      if (r.error) { setMsg(r.error); return }
      setSeries(r.series!)
    } catch (e) { setBusy(false); setMsg((e as Error).message) }
  }

  // ---- add an episode (upload video) ----
  const onAddEpisode = async (file: File, epTitle: string) => {
    if (!series) return
    setBusy(true); setMsg('Upload en cours…')
    try {
      const number = (episodes.at(-1)?.number ?? 0) + 1
      const duration = await readVideoDuration(file)
      const video_url = await uploadToBucket(creator.id, series.slug, `e${number}.mp4`, file)
      await addEpisode({
        series_id: series.id, season: 1, ep: number, number,
        title: epTitle.trim() || `Épisode ${number}`, video_url,
        duration_sec: duration, subtitles: null, baked_audio: true,
        token_cost: series.episode_token_cost ?? 0,
      })
      setEpisodes(await listEpisodes(series.id))
      setMsg('Épisode ajouté ✓')
    } catch (e) { setMsg((e as Error).message) } finally { setBusy(false) }
  }

  const onDeleteEpisode = async (id: string) => {
    await deleteEpisode(id)
    if (series) setEpisodes(await listEpisodes(series.id))
  }

  const onEpisodeBanner = async (e: DbEpisode, file: File) => {
    if (!series) return
    setBusy(true); setMsg('Upload bannière…')
    try {
      const url = await uploadToBucket(creator.id, series.slug, `e${e.number}-banner.${(file.name.split('.').pop() || 'jpg').toLowerCase()}`, file)
      await updateEpisode(e.id, { cover_url: url })
      setEpisodes(await listEpisodes(series.id)); setMsg('Bannière ajoutée ✓')
    } catch (err) { setMsg((err as Error).message) } finally { setBusy(false) }
  }

  const submit = async () => {
    if (!series) return
    if (episodes.length === 0) { setMsg('Ajoute au moins un épisode avant de soumettre.'); return }
    setBusy(true)
    await submitSeries(series.id)
    setBusy(false)
    onBack()
  }

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm text-cream/60 hover:text-cream">← Mes séries</button>

      {!series ? (
        // ---------- NEW SERIES FORM ----------
        <div className="space-y-5">
          <h1 className="font-display text-2xl font-extrabold">Nouvelle série</h1>
          <Field label="Titre *"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Ex : Sour Start" /></Field>
          <Field label="Synopsis"><textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} rows={3} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Thème (fruit)">
              <select value={fruit} onChange={(e) => setFruit(e.target.value)} className={inputCls}>
                {FRUITS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Genres (séparés par virgule)"><input value={genres} onChange={(e) => setGenres(e.target.value)} className={inputCls} placeholder="Romance, Comédie" /></Field>
          </div>
          <Field label="Affiche (poster vertical)">
            <input type="file" accept="image/*" onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)} className="text-sm text-cream/70 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-cream" />
          </Field>
          <Field label="Monétisation">
            <div className="space-y-2">
              <Radio v="free" cur={monetization} set={setMonetization}>Gratuit — financé par la pub (tu touches 55% des revenus pub)</Radio>
              <Radio v="purchase" cur={monetization} set={setMonetization}>Jetons — pay-per-episode (tu touches 70% de chaque déblocage)</Radio>
              <Radio v="subscription" cur={monetization} set={setMonetization}>Premium — inclus dans l'abonnement NETFRUIT (part de 60% au prorata du temps vu)</Radio>
              {monetization === 'purchase' && (
                <div className="flex items-center gap-2 pl-6">
                  <span className="text-sm text-cream/60">Coût par épisode :</span>
                  <input value={tokenCost} onChange={(e) => setTokenCost(e.target.value)} inputMode="numeric" className="w-20 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5" />
                  <span className="text-cream/50">🪙 jetons</span>
                </div>
              )}
            </div>
          </Field>
          {msg && <p className="text-sm text-fruit-red-bright">{msg}</p>}
          <button disabled={busy} onClick={create} className="rounded-full bg-fruit-red-bright px-6 py-2.5 font-bold text-white enabled:hover:brightness-110 disabled:opacity-40">
            {busy ? 'Création…' : 'Créer le brouillon'}
          </button>
          <p className="text-xs text-cream/40">Les paiements réels s'activeront avec Stripe (Phase 2). En attendant, les séries publiées sont visibles gratuitement — mais le mode et le prix que tu choisis ici sont déjà enregistrés.</p>
        </div>
      ) : (
        // ---------- EPISODES + SUBMIT ----------
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-16 w-28 overflow-hidden rounded-md bg-white/5">
              {series.poster_url && <img src={series.poster_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold">{series.title}</h1>
              <p className="text-sm text-cream/50">Statut : {series.status}</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">Épisodes ({episodes.length})</h2>
              <button onClick={() => setShowCredits(true)} className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold text-cream hover:border-white/50">🎬 Générer un générique</button>
            </div>
            {episodes.length > 0 && (
              <ul className="mb-3 divide-y divide-white/5 rounded-xl border border-white/10">
                {episodes.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 p-3">
                    <span className="w-5 text-center font-bold text-cream/40">{e.number}</span>
                    <div className="h-10 w-16 shrink-0 overflow-hidden rounded bg-white/5">
                      {e.cover_url && <img src={e.cover_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <span className="flex-1 truncate">{e.title}</span>
                    <span className="text-xs text-cream/40">{e.duration_sec}s</span>
                    <label className="cursor-pointer text-xs text-cream/60 hover:text-cream">
                      Bannière
                      <input type="file" accept="image/*" className="hidden" onChange={(ev) => ev.target.files?.[0] && onEpisodeBanner(e, ev.target.files[0])} />
                    </label>
                    <button onClick={() => onDeleteEpisode(e.id)} className="text-xs text-fruit-red-bright hover:underline">Suppr.</button>
                  </li>
                ))}
              </ul>
            )}
            <AddEpisode busy={busy} onAdd={onAddEpisode} nextNum={(episodes.at(-1)?.number ?? 0) + 1} />
          </div>

          <SeriesMeta series={series} onSaved={setSeries} />

          {msg && <p className="text-sm text-cream/70">{msg}</p>}

          {series.status === 'draft' || series.status === 'rejected' ? (
            <button disabled={busy || episodes.length === 0} onClick={submit}
              className="rounded-full bg-lime px-6 py-2.5 font-bold text-ink-950 enabled:hover:brightness-110 disabled:opacity-40">
              Soumettre à la modération
            </button>
          ) : (
            <p className="rounded-lg bg-white/5 px-4 py-3 text-sm text-cream/70">
              {series.status === 'pending' ? '⏳ En attente de modération.' : '✅ Publiée et en ligne.'}
            </p>
          )}

          {showCredits && (
            <CreditsMovie
              creator={creator} series={series}
              onClose={() => setShowCredits(false)}
              onAdded={async () => { setEpisodes(await listEpisodes(series.id)) }}
            />
          )}
        </div>
      )}
    </div>
  )
}

function AddEpisode({ busy, onAdd, nextNum }: { busy: boolean; onAdd: (f: File, t: string) => void; nextNum: number }) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  return (
    <div className="rounded-xl border border-dashed border-white/15 p-4">
      <p className="mb-2 text-sm font-medium text-cream/70">Ajouter l'épisode {nextNum}</p>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Titre de l'épisode ${nextNum}`} className={inputCls + ' mb-2'} />
      <input type="file" accept="video/mp4,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm text-cream/70 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-cream" />
      <div className="mt-3">
        <button disabled={busy || !file} onClick={() => file && onAdd(file, title)}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-cream enabled:hover:bg-white/20 disabled:opacity-40">
          {busy ? 'Upload…' : 'Uploader'}
        </button>
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 outline-none focus:border-white/40'
const ext = (f: File) => (f.name.split('.').pop() || 'jpg').toLowerCase()
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-cream/70">{label}</span>{children}</label>
}
function Radio({ v, cur, set, children }: { v: Monetization; cur: Monetization; set: (m: Monetization) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-cream/80">
      <input type="radio" checked={cur === v} onChange={() => set(v)} className="mt-0.5 accent-fruit-red-bright" />
      <span>{children}</span>
    </label>
  )
}
