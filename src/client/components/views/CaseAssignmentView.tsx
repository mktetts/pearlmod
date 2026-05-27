export function CaseAssignmentView() {
  return (
    <section className="section-card col-span-full rounded-[1.5rem] border border-slate-200/40 bg-white/75 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Case Assignment</p>
            <h2 className="text-2xl font-black tracking-tight">Route reports to the right mod</h2>
          </div>
          <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
            Auto assign
          </button>
        </div>

        <div className="grid flex-1 min-h-0 gap-4 xl:grid-cols-2">
          <div className="rounded-[1.35rem] bg-gradient-to-br from-orange-500 to-amber-400 p-5 text-white shadow-[0_18px_35px_rgba(249,115,22,0.2)]">
            <p className="text-sm font-semibold text-orange-50">Urgent case</p>
            <h3 className="mt-2 text-xl font-bold">Harassment escalation</h3>
            <p className="mt-2 text-sm text-orange-50/90">
              19 reports in the last hour. The model suggests a direct escalation with safety notes.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Assign to Jordan</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">SLA 12 min</span>
            </div>
          </div>

          <div className="space-y-3 rounded-[1.35rem] bg-slate-50 p-5 dark:bg-white/5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Suggested owners</p>
            <div className="space-y-3">
              {[
                ['Maya', 'Spam, brigading, vote manipulation'],
                ['Jordan', 'Harassment, abuse, safety reports'],
                ['Priya', 'Appeals and edge cases'],
              ].map(([name, note]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-[1rem] bg-white px-4 py-3 shadow-sm dark:bg-slate-950/70"
                >
                  <div>
                    <p className="font-semibold">{name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{note}</p>
                  </div>
                  <span className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
                    Assign
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
