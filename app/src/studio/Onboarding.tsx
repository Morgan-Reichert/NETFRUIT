import { useState } from 'react'
import { createCreator, slugify } from '../lib/creator'

export default function Onboarding({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [bio, setBio] = useState('')
  const [agreePolicy, setAgreePolicy] = useState(false)
  const [agreeRights, setAgreeRights] = useState(false)
  const [agreeAI, setAgreeAI] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = displayName.trim() && handle.trim() && agreePolicy && agreeRights && agreeAI && !busy

  const submit = async () => {
    setError(null); setBusy(true)
    const r = await createCreator(userId, {
      handle: slugify(handle), display_name: displayName.trim(), bio: bio.trim() || undefined,
    })
    setBusy(false)
    if (r.error) { setError(r.error); return }
    onDone()
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl bg-ink-950 px-5 py-10 text-cream">
      <h1 className="font-display text-3xl font-extrabold">Devenir créateur</h1>
      <p className="mt-2 text-cream/60">Publie tes séries IA sur NETFRUIT. Poster est gratuit. Chaque série passe en modération avant mise en ligne.</p>

      <div className="mt-8 space-y-5">
        <Field label="Nom public *">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex : Studio Banana"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 outline-none focus:border-white/40" />
        </Field>
        <Field label="Handle * (identifiant unique)">
          <div className="flex items-center rounded-lg border border-white/15 bg-white/5 px-3">
            <span className="text-cream/40">@</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="studio-banana"
              className="w-full bg-transparent px-1 py-2.5 outline-none" />
          </div>
          {handle && <p className="mt-1 text-xs text-cream/40">Sera enregistré : @{slugify(handle)}</p>}
        </Field>
        <Field label="Bio">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Qui es-tu, quel genre de séries ?"
            className="w-full resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 outline-none focus:border-white/40" />
        </Field>

        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-cream/80">Sécurité & conformité</p>
          <Check checked={agreeRights} onChange={setAgreeRights}>
            Je détiens tous les droits sur le contenu que je publie et j'assume l'entière responsabilité de sa diffusion.
          </Check>
          <Check checked={agreeAI} onChange={setAgreeAI}>
            Mon contenu respecte les règles : pas de contenu illégal, haineux, ou portant atteinte à des tiers, et il est correctement classifié (âge).
          </Check>
          <Check checked={agreePolicy} onChange={setAgreePolicy}>
            J'accepte l'<a href="/#" className="underline">Accord Créateur</a> et la <a href="/#" className="underline">Politique de contenu</a> de NETFRUIT.
          </Check>
        </div>

        {error && <p className="text-sm text-fruit-red-bright">{error}</p>}

        <div className="flex items-center gap-3">
          <button disabled={!canSubmit} onClick={submit}
            className="rounded-full bg-fruit-red-bright px-6 py-2.5 font-bold text-white transition enabled:hover:brightness-110 disabled:opacity-40">
            {busy ? 'Création…' : 'Créer mon espace créateur'}
          </button>
          <a href="/" className="text-sm text-cream/50 hover:text-cream">Annuler</a>
        </div>
        <p className="text-xs text-cream/40">La vérification d'identité complète (pièce d'identité) sera demandée à l'activation des paiements, via notre partenaire sécurisé.</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-cream/70">{label}</span>{children}</label>
}
function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-cream/70">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-fruit-red-bright" />
      <span>{children}</span>
    </label>
  )
}
