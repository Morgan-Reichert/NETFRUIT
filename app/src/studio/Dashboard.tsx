import { useEffect, useState } from 'react'
import { topEpisodes, type Creator, type DbSeries } from '../lib/creator'
import { ChartIcon, FireIcon } from '../components/icons'

export default function Dashboard({ creator, series, onNew }: {
  creator: Creator; series: DbSeries[]; onNew: () => void
}) {
  const [top, setTop] = useState<any[]>([])
  useEffect(() => { topEpisodes(6).then(setTop) }, [])

  const published = series.filter((s) => s.status === 'published').length
  const pending = series.filter((s) => s.status === 'pending').length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Bonjour, {creator.display_name}</h1>
        <p className="text-cream/60">Voici l'état de ton studio.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Séries" value={series.length} />
        <Stat label="Publiées" value={published} />
        <Stat label="En modération" value={pending} />
        <Stat label="Créateur Pro" value={creator.is_pro ? 'Oui' : '—'} />
      </div>

      <button onClick={onNew} className="rounded-full bg-fruit-red-bright px-5 py-2.5 font-bold text-white hover:brightness-110">
        + Publier une nouvelle série
      </button>

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><FireIcon size={18} className="text-fruit-red-bright" /> Ce qui marche sur la plateforme</h2>
        {top.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-cream/40">
            Pas encore de statistiques de visionnage. Les vues apparaîtront ici dès que les séries seront regardées.
          </p>
        ) : (
          <ol className="divide-y divide-white/5 rounded-xl border border-white/10">
            {top.map((t, i) => (
              <li key={i} className="flex items-center gap-3 p-3">
                <span className="w-5 text-center font-bold text-cream/40">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.episode?.series?.title ?? '—'}</p>
                  <p className="truncate text-xs text-cream/50">{t.episode?.title}</p>
                </div>
                <span className="text-sm text-cream/70">{t.views} vues</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-cream/80"><ChartIcon size={16} /> Analytics avancées (Créateur Pro)</p>
        <p className="mt-1 text-sm text-cream/50">Rétention par seconde, sources de trafic, revenus détaillés, comparaison de séries… disponibles avec l'abonnement Créateur Pro (bientôt).</p>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="font-display text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-cream/50">{label}</p>
    </div>
  )
}
