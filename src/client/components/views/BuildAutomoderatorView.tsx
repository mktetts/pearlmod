export function BuildAutomoderatorView() {
  return (
    <section className="section-card col-span-full rounded-[1.5rem] border border-slate-200/40 bg-white/75 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Build Automoderator</p>
            <h2 className="text-2xl font-black tracking-tight">Create and test rule sets</h2>
          </div>
          <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
            Generate rules
          </button>
        </div>

        <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-3 rounded-[1.35rem] bg-slate-50 p-5 dark:bg-white/5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Rule builder</p>
            <div className="rounded-[1rem] bg-white p-4 shadow-sm dark:bg-slate-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">If</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                A post contains repeated external links or blacklisted domains
              </p>
            </div>
            <div className="rounded-[1rem] bg-white p-4 shadow-sm dark:bg-slate-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Then</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                Remove, notify the author, and add a mod queue flag
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1rem] bg-white p-4 shadow-sm dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Rate limit
                </p>
                <p className="mt-2 text-lg font-bold">3 posts / 10 min</p>
              </div>
              <div className="rounded-[1rem] bg-white p-4 shadow-sm dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Confidence
                </p>
                <p className="mt-2 text-lg font-bold">96%</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-gradient-to-br from-emerald-500 to-teal-400 p-5 text-slate-950">
            <p className="text-sm font-semibold">Suggested automations</p>
            <div className="mt-4 space-y-3">
              {[
                ['Spam link filter', 'Matches repeated URL patterns and blocks known shorteners.'],
                ['Harassment escalation', 'Escalates comments with repeated slurs to mod review.'],
                ['Ban evasion watch', 'Adds flags when new accounts match known behavior.'],
              ].map(([title, desc]) => (
                <div key={title as string} className="rounded-2xl bg-white/75 p-4">
                  <p className="font-bold">{title as string}</p>
                  <p className="mt-1 text-sm text-slate-700">{desc as string}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
