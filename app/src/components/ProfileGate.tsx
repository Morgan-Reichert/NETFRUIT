import { useState } from 'react'
import { motion } from 'motion/react'
import { AVATARS, avatarUrl, useProfiles } from '../lib/profiles'
import { PlusIcon, CloseIcon } from './icons'

export default function ProfileGate() {
  const { profiles, select, add, remove } = useProfiles()
  const [creating, setCreating] = useState(profiles.length === 0)
  const [manage, setManage] = useState(false)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])

  const create = () => {
    const p = add(name, avatar)
    setName('')
    setCreating(false)
    select(p.id)
  }

  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center bg-ink-950 px-4 py-16">
      <img
        src="/brand/netfruit-long.png"
        alt="NETFRUIT"
        className="safe-top mb-10 h-8 w-auto brightness-125 saturate-150 drop-shadow-[0_0_14px_rgba(255,39,64,0.45)] sm:h-10"
      />

      {creating ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <h1 className="mb-2 text-center font-display text-3xl font-extrabold text-cream sm:text-4xl">
            Create your profile
          </h1>
          <p className="mb-6 text-center text-cream/60">Pick your fruit and a name.</p>

          <div className="mx-auto mb-6 flex max-w-sm items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <img src={avatarUrl(avatar)} alt="" className="h-16 w-16 rounded-xl object-cover ring-2 ring-fruit-red-bright" />
            <input
              autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="Profile name"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-cream placeholder-cream/40 outline-none transition focus:border-fruit-red-bright"
            />
          </div>

          <div className="no-scrollbar mb-6 grid max-h-64 grid-cols-4 gap-3 overflow-y-auto sm:grid-cols-6">
            {AVATARS.map((a) => (
              <button
                key={a} onClick={() => setAvatar(a)}
                className={`overflow-hidden rounded-xl ring-2 transition ${avatar === a ? 'ring-fruit-red-bright' : 'ring-transparent hover:ring-white/30'}`}
              >
                <img src={avatarUrl(a)} alt={a} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-3">
            {profiles.length > 0 && (
              <button onClick={() => setCreating(false)} className="rounded-full border border-white/20 px-6 py-2.5 font-semibold text-cream/80 transition hover:border-white/40">
                Cancel
              </button>
            )}
            <button onClick={create} className="rounded-full bg-fruit-red-bright px-8 py-2.5 font-bold text-white transition hover:brightness-110">
              Create
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          <h1 className="mb-10 font-display text-4xl font-extrabold text-cream sm:text-5xl">Who's watching?</h1>
          <div className="flex flex-wrap items-start justify-center gap-6">
            {profiles.map((p) => (
              <motion.div key={p.id} whileHover={{ y: -6 }} className="group relative flex w-28 flex-col items-center gap-3">
                <button onClick={() => !manage && select(p.id)} className="relative">
                  <img
                    src={avatarUrl(p.avatar)} alt={p.name}
                    className={`h-28 w-28 rounded-2xl object-cover ring-2 transition ${manage ? 'opacity-60' : 'ring-transparent group-hover:ring-4 group-hover:ring-fruit-red-bright'}`}
                  />
                  {manage && (
                    <span
                      onClick={(e) => { e.stopPropagation(); remove(p.id) }}
                      className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-fruit-red text-white ring-2 ring-ink-950"
                    >
                      <CloseIcon size={14} />
                    </span>
                  )}
                </button>
                <span className="truncate text-sm font-semibold text-cream/70 group-hover:text-cream">{p.name}</span>
              </motion.div>
            ))}

            {profiles.length < 5 && (
              <button onClick={() => setCreating(true)} className="flex w-28 flex-col items-center gap-3">
                <span className="grid h-28 w-28 place-items-center rounded-2xl border-2 border-dashed border-white/20 text-cream/50 transition hover:border-white/50 hover:text-cream">
                  <PlusIcon size={36} />
                </span>
                <span className="text-sm font-semibold text-cream/60">Add profile</span>
              </button>
            )}
          </div>

          <button
            onClick={() => setManage((m) => !m)}
            className="mt-12 rounded-full border border-white/20 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-cream/60 transition hover:border-white/40 hover:text-cream"
          >
            {manage ? 'Done' : 'Manage profiles'}
          </button>
        </>
      )}
    </div>
  )
}
