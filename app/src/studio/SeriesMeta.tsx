import { useState } from 'react'
import { AGE_RATINGS, CONTENT_FLAGS, updateSeries, type DbSeries } from '../lib/creator'

export default function SeriesMeta({ series, onSaved }: { series: DbSeries; onSaved: (s: DbSeries) => void }) {
  const [age, setAge] = useState(series.age_rating ?? 'all')
  const [flags, setFlags] = useState<string[]>(series.content_flags ?? [])
  const [credits, setCredits] = useState<{ role: string; name: string }[]>(series.credits ?? [])
  const [aiTools, setAiTools] = useState((series.ai_tools ?? []).join(', '))
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggleFlag = (v: string) => setFlags((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))
  const setCredit = (i: number, k: 'role' | 'name', val: string) =>
    setCredits((p) => p.map((c, j) => (j === i ? { ...c, [k]: val } : c)))

  const save = async () => {
    setBusy(true); setSaved(false)
    const patch = {
      age_rating: age, content_flags: flags,
      credits: credits.filter((c) => c.role.trim() || c.name.trim()),
      ai_tools: aiTools.split(',').map((s) => s.trim()).filter(Boolean),
    }
    await updateSeries(series.id, patch as Partial<DbSeries>)
    setBusy(false); setSaved(true); setTimeout(() => setSaved(false), 1800)
    onSaved({ ...series, ...patch } as DbSeries)
  }

  return (
    <div className="space-y-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="font-display text-lg font-bold">Classification & crédits</h3>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-cream/70">Tranche d'âge</span>
        <select value={age} onChange={(e) => setAge(e.target.value)} className={inp + ' max-w-xs'}>
          {AGE_RATINGS.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}
        </select>
      </label>

      <div>
        <span className="mb-2 block text-sm font-medium text-cream/70">Contenu signalé</span>
        <div className="flex flex-wrap gap-2">
          {CONTENT_FLAGS.map((f) => (
            <button key={f.v} onClick={() => toggleFlag(f.v)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${flags.includes(f.v) ? 'border-fruit-red-bright bg-fruit-red-bright/15 text-fruit-red-bright' : 'border-white/15 text-cream/60 hover:border-white/40'}`}>
              {flags.includes(f.v) ? '✓ ' : ''}{f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-cream/70">Crédits (participants)</span>
          <button onClick={() => setCredits((p) => [...p, { role: '', name: '' }])} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold hover:bg-white/20">+ Ajouter</button>
        </div>
        <div className="space-y-2">
          {credits.length === 0 && <p className="text-xs text-cream/40">Réalisation, voix, musique, script…</p>}
          {credits.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input value={c.role} onChange={(e) => setCredit(i, 'role', e.target.value)} placeholder="Rôle" className={inp + ' w-1/3'} />
              <input value={c.name} onChange={(e) => setCredit(i, 'name', e.target.value)} placeholder="Nom" className={inp + ' flex-1'} />
              <button onClick={() => setCredits((p) => p.filter((_, j) => j !== i))} className="px-2 text-cream/40 hover:text-fruit-red-bright">✕</button>
            </div>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-cream/70">IA utilisées (séparées par virgule)</span>
        <input value={aiTools} onChange={(e) => setAiTools(e.target.value)} placeholder="Grok, Nano Banana, ElevenLabs…" className={inp} />
      </label>

      <div className="flex items-center gap-3">
        <button disabled={busy} onClick={save} className="rounded-full bg-fruit-red-bright px-5 py-2 text-sm font-bold text-white enabled:hover:brightness-110 disabled:opacity-40">
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {saved && <span className="text-sm text-lime">Enregistré ✓</span>}
      </div>
    </div>
  )
}

const inp = 'rounded-lg border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-white/40'
