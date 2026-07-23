import { useEffect, useState, type ReactNode } from 'react'
import { listPayouts, REVENUE, type Creator, type Payout } from '../lib/creator'
import { CardIcon, CoinIcon, GemIcon, TvIcon } from '../components/icons'

const eur = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

export default function Earnings({ creator }: { creator: Creator }) {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { listPayouts(creator.id).then((p) => { setPayouts(p); setLoading(false) }) }, [creator.id])

  const lifetime = payouts.reduce((s, p) => s + p.total_cents, 0)
  const pending = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.total_cents, 0)
  const paid = lifetime - pending

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Revenus</h1>
        <p className="text-cream/60">Tes gains sont calculés chaque mois à partir de trois sources.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total gagné" value={eur(lifetime)} />
        <Stat label="En attente" value={eur(pending)} accent />
        <Stat label="Déjà versé" value={eur(paid)} />
      </div>

      {/* The revenue model, transparent */}
      <div>
        <h2 className="mb-3 font-display text-lg font-bold">Comment tu es rémunéré·e</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Source
            icon={<TvIcon size={18} />} title="Publicité"
            share={`${Math.round(REVENUE.adShare * 100)}%`}
            desc="des revenus publicitaires nets générés par tes épisodes gratuits."
          />
          <Source
            icon={<CoinIcon size={18} />} title="Jetons"
            share={`${Math.round(REVENUE.tokenShare * 100)}%`}
            desc={`de la valeur de chaque jeton dépensé pour débloquer un épisode (1 jeton ≈ ${eur(REVENUE.tokenValueEur * 100)}).`}
          />
          <Source
            icon={<GemIcon size={18} />} title="Abonnement"
            share={`${Math.round(REVENUE.subscriptionShare * 100)}%`}
            desc="du prix HT de l'abonnement, réparti au prorata du temps réellement passé sur tes séries."
          />
        </div>
      </div>

      {/* Payout history */}
      <div>
        <h2 className="mb-3 font-display text-lg font-bold">Historique des versements</h2>
        {loading ? (
          <p className="text-cream/50">Chargement…</p>
        ) : payouts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-cream/50">
            Pas encore de revenus. Dès que les paiements seront activés et que ton public regardera, tes gains mensuels apparaîtront ici.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-cream/50">
                <tr><th className="p-3">Période</th><th className="p-3">Pub</th><th className="p-3">Jetons</th><th className="p-3">Abo</th><th className="p-3">Total</th><th className="p-3">Statut</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-medium">{p.period}</td>
                    <td className="p-3 text-cream/70">{eur(p.ad_cents)}</td>
                    <td className="p-3 text-cream/70">{eur(p.token_cents)}</td>
                    <td className="p-3 text-cream/70">{eur(p.subscription_cents)}</td>
                    <td className="p-3 font-bold">{eur(p.total_cents)}</td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${p.status === 'paid' ? 'bg-lime/15 text-lime' : 'bg-amber-400/15 text-amber-300'}`}>
                        {p.status === 'paid' ? 'Versé' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-cream/60">
        <CardIcon size={16} className="mr-1 inline align-text-bottom" />Les versements passeront par <span className="font-semibold text-cream/80">Stripe Connect</span> une fois les paiements activés. Tu connecteras ton compte bancaire directement chez Stripe (KYC sécurisé) — NETFRUIT prélèvera automatiquement sa part et te reversera le reste.
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-fruit-red-bright/30 bg-fruit-red-bright/5' : 'border-white/10 bg-white/[0.03]'}`}>
      <p className="font-display text-xl font-extrabold sm:text-2xl">{value}</p>
      <p className="text-xs text-cream/50">{label}</p>
    </div>
  )
}
function Source({ icon, title, share, desc }: { icon: ReactNode; title: string; share: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-2 text-lg font-bold">{icon} {title}</span>
        <span className="text-brand-gradient font-display text-xl font-extrabold">{share}</span>
      </div>
      <p className="mt-1 text-xs leading-snug text-cream/55">{desc}</p>
    </div>
  )
}
