import { BellRing, SlidersHorizontal } from 'lucide-react'

function SettingsPage() {
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[1fr_0.9fr]">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#ff9c75]" />
          <h3 className="text-base font-semibold text-white">Preferences</h3>
        </div>
        <div className="mt-4 space-y-3 text-sm text-white/75">
          <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Compact moderation layout</div>
          <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Auto-refresh every 30 seconds</div>
          <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Critical alert sound enabled</div>
        </div>
      </section>

      <aside className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Notifications</h3>
          <BellRing className="h-4 w-4 text-white/50" />
        </div>
        <p className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-4 text-sm text-white/70">
          Everything is synced and ready. You can hook these settings to Devvit actions later.
        </p>
      </aside>
    </div>
  )
}

export default SettingsPage
