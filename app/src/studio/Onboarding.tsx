import { useState } from 'react'
import { applyAsCreator, slugify } from '../lib/creator'

export default function Onboarding({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [bio, setBio] = useState('')
  // identity
  const [legalName, setLegalName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [country, setCountry] = useState('')
  // proofs
  const [tiktok, setTiktok] = useState('')
  const [instagram, setInstagram] = useState('')
  const [youtube, setYoutube] = useState('')
  const [portfolio, setPortfolio] = useState('')
  const [experience, setExperience] = useState('')
  const [tools, setTools] = useState('')
  const [rights, setRights] = useState('')
  // acceptances
  const [agreeRights, setAgreeRights] = useState(false)
  const [agreeRules, setAgreeRules] = useState(false)
  const [agreePolicy, setAgreePolicy] = useState(false)
  const [agreeReview, setAgreeReview] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ageOf = (d: string) => {
    if (!d) return 0
    const b = new Date(d), t = new Date()
    let a = t.getFullYear() - b.getFullYear()
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--
    return a
  }
  const adult = ageOf(birthDate) >= 18
  const hasProof = !!(tiktok.trim() || instagram.trim() || youtube.trim() || portfolio.trim())
  const canSubmit =
    displayName.trim() && handle.trim() && legalName.trim() && adult &&
    experience.trim().length >= 20 && rights.trim().length >= 15 &&
    hasProof && agreeRights && agreeRules && agreePolicy && agreeReview && !busy

  const submit = async () => {
    setError(null); setBusy(true)
    const r = await applyAsCreator(userId, {
      handle: slugify(handle), display_name: displayName.trim(), bio: bio.trim() || undefined,
      legal_name: legalName.trim(), birth_date: birthDate, country: country.trim() || undefined,
      socials: {
        tiktok: tiktok.trim() || undefined, instagram: instagram.trim() || undefined,
        youtube: youtube.trim() || undefined,
      },
      portfolio_url: portfolio.trim() || undefined,
      experience: experience.trim(),
      answers: { tools: tools.trim(), rights_practice: rights.trim() },
    })
    setBusy(false)
    if (r.error) { setError(r.error); return }
    onDone()
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl bg-ink-950 px-5 py-10 text-cream">
      <h1 className="font-display text-3xl font-extrabold">Devenir créateur certifié</h1>
      <p className="mt-2 text-cream/60">
        Publier est gratuit, mais chaque créateur est <span className="text-cream/90">examiné</span> avant de pouvoir mettre en ligne.
        Remplis ce dossier — un membre de l'équipe le validera.
      </p>

      {/* 1. Profil */}
      <Section n="1" title="Ton profil">
        <Field label="Nom public *">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex : Studio Banana" className={inp} />
        </Field>
        <Field label="Handle * (identifiant unique)">
          <div className="flex items-center rounded-lg border border-white/15 bg-white/5 px-3">
            <span className="text-cream/40">@</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="studio-banana" className="w-full bg-transparent px-1 py-2.5 outline-none" />
          </div>
          {handle && <p className="mt-1 text-xs text-cream/40">Sera enregistré : @{slugify(handle)}</p>}
        </Field>
        <Field label="Bio">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} placeholder="Qui es-tu, quel genre de séries ?" className={inp} />
        </Field>
        <Field label="Nom et prénom légaux *">
          <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Comme sur ta pièce d'identité" className={inp} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date de naissance *">
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inp} />
            {birthDate && !adult && <p className="mt-1 text-xs text-fruit-red-bright">Tu dois avoir au moins 18 ans.</p>}
          </Field>
          <Field label="Pays de résidence">
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="France" className={inp} />
          </Field>
        </div>
      </Section>

      {/* 2. Preuves de savoir-faire */}
      <Section n="2" title="Preuves de savoir-faire">
        <p className="text-sm text-cream/55">Renseigne au moins un réseau ou un portfolio montrant ton travail.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="TikTok"><input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@ ou lien" className={inp} /></Field>
          <Field label="Instagram"><input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@ ou lien" className={inp} /></Field>
          <Field label="YouTube"><input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="chaîne / lien" className={inp} /></Field>
          <Field label="Portfolio / démo"><input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://…" className={inp} /></Field>
        </div>
        <Field label="Ton expérience en création IA * (min. 20 caractères)">
          <textarea value={experience} onChange={(e) => setExperience(e.target.value)} rows={3} placeholder="Décris ce que tu crées, depuis combien de temps, tes réussites…" className={inp} />
        </Field>
        <Field label="Quels outils utilises-tu ?">
          <input value={tools} onChange={(e) => setTools(e.target.value)} placeholder="Ex : Grok, Nano Banana, ElevenLabs…" className={inp} />
        </Field>
      </Section>

      {/* 3. Sécurité & règles */}
      <Section n="3" title="Sécurité & règles">
        <Field label="Comment garantis-tu les droits et l'authenticité de ton contenu ? * (min. 15 caractères)">
          <textarea value={rights} onChange={(e) => setRights(e.target.value)} rows={2} placeholder="Ex : contenu 100% généré par IA avec mes propres prompts, aucune marque ni personne réelle sans autorisation…" className={inp} />
        </Field>
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <Check checked={agreeRights} onChange={setAgreeRights}>Je détiens tous les droits sur mon contenu et j'assume l'entière responsabilité de sa diffusion.</Check>
          <Check checked={agreeRules} onChange={setAgreeRules}>Mon contenu ne sera ni illégal, ni haineux, ni trompeur, et sera correctement classé par âge.</Check>
          <Check checked={agreePolicy} onChange={setAgreePolicy}>J'accepte l'<a href="/#" className="underline">Accord Créateur</a> et la <a href="/#" className="underline">Politique de contenu</a> de NETFRUIT.</Check>
          <Check checked={agreeReview} onChange={setAgreeReview}>Je comprends que ma candidature sera examinée et que je ne pourrai publier qu'une fois approuvé·e.</Check>
        </div>
      </Section>

      {error && <p className="mt-4 text-sm text-fruit-red-bright">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button disabled={!canSubmit} onClick={submit}
          className="rounded-full bg-brand-gradient px-6 py-2.5 font-bold text-white transition enabled:hover:brightness-110 disabled:opacity-40">
          {busy ? 'Envoi…' : 'Soumettre ma candidature'}
        </button>
        <a href="/" className="text-sm text-cream/50 hover:text-cream">Annuler</a>
      </div>
      <p className="mt-3 text-xs text-cream/40">La vérification d'identité complète (pièce d'identité) sera demandée à l'activation des paiements, via notre partenaire sécurisé.</p>
    </div>
  )
}

const inp = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 outline-none focus:border-white/40'
function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-gradient text-xs text-white">{n}</span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
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
