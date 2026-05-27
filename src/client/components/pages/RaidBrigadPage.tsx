import { ShieldAlert, Waves } from 'lucide-react'

function RaidBrigadPage() {
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Raid response</h3>
          <Waves className="h-4 w-4 text-[#ff9c75]" />
        </div>
        <div className="mt-4 space-y-3 text-sm text-white/75">
          <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Brigade detected in thread 42</div>
          <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Slow mode enabled across 3 posts</div>
          <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Auto-filter thresholds boosted</div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-white/50" />
          <h3 className="text-base font-semibold text-white">Brigade countermeasures</h3>
        </div>
        <div className="mt-4 space-y-3 text-sm text-white/75">
          <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Stage 1: detect spike patterns</div>
          <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Stage 2: isolate suspect accounts</div>
          <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Stage 3: notify moderators</div>
        </div>
      </section>
    </div>
  )
}

export default RaidBrigadPage
