export function AnalysisDashboardView() {
  return (
    <section className="section-card col-span-full rounded-[1.5rem] border border-slate-200/40 bg-white/75 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
      <div className="grid h-full min-h-0 gap-4 md:grid-cols-2">
        <div className="rounded-[1.35rem] bg-slate-50 p-5 dark:bg-white/5">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Analysis Dashboard</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Community health trends</h2>
          <div className="mt-5 flex h-40 items-end gap-2">
            <div className="h-14 flex-1 rounded-t-2xl bg-slate-200 dark:bg-white/10" />
            <div className="h-20 flex-1 rounded-t-2xl bg-slate-300 dark:bg-white/20" />
            <div className="h-11 flex-1 rounded-t-2xl bg-orange-200 dark:bg-orange-400/40" />
            <div className="h-28 flex-1 rounded-t-2xl bg-orange-400" />
            <div className="h-16 flex-1 rounded-t-2xl bg-slate-300 dark:bg-white/20" />
            <div className="h-32 flex-1 rounded-t-2xl bg-emerald-400" />
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Sentiment is up 18% over the last 30 days with fewer escalation spikes.
          </p>
        </div>

        <div className="rounded-[1.35rem] bg-slate-950 p-5 text-white shadow-[0_18px_35px_rgba(15,23,42,0.12)]">
          <p className="text-sm font-semibold text-slate-300">Policy violations</p>
          <div className="mt-4 space-y-4 text-sm">
            {[
              ['Spam', 41, 'bg-orange-400'],
              ['Harassment', 28, 'bg-rose-400'],
              ['Ban evasion', 19, 'bg-emerald-400'],
            ].map(([label, percent, color]) => (
              <div key={label as string}>
                <div className="mb-2 flex items-center justify-between">
                  <span>{label as string}</span>
                  <span className="text-slate-300">{percent as number}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/10">
                  <div
                    className={`h-2.5 rounded-full ${color as string}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-[1rem] bg-white/8 p-3 ring-1 ring-white/10">
              <p className="text-slate-400">Avg. review time</p>
              <p className="mt-1 text-lg font-bold">6.4 min</p>
            </div>
            <div className="rounded-[1rem] bg-white/8 p-3 ring-1 ring-white/10">
              <p className="text-slate-400">Escalations</p>
              <p className="mt-1 text-lg font-bold">14</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
