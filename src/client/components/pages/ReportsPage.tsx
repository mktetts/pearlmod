import { BarChart3, TrendingUp } from 'lucide-react'

function ReportsPage() {
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[1fr_0.9fr]">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Report trend</h3>
          <TrendingUp className="h-4 w-4 text-[#ff9c75]" />
        </div>
        <div className="mt-6 flex h-56 items-end gap-3">
          {[42, 64, 38, 78, 55, 91, 73].map((height, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-2xl bg-gradient-to-t from-[#ff4500] to-[#ff9c75]" style={{ height: `${height}%` }} />
              <span className="text-[11px] text-white/40">D{index + 1}</span>
            </div>
          ))}
        </div>
      </section>

      <aside className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-white/50" />
          <h3 className="text-base font-semibold text-white">Highlights</h3>
        </div>
        <div className="mt-4 space-y-3 text-sm text-white/75">
          <p className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Top report reason: harassment</p>
          <p className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Average response time: 4m 28s</p>
          <p className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Escalations lowered by 14%</p>
        </div>
      </aside>
    </div>
  )
}

export default ReportsPage
