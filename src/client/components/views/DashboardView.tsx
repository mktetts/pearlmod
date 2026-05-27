import type { ChartData, ChartOptions } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { ClipboardList, ShieldCheck, Users } from 'lucide-react'

type RangeKey = '7d' | '1m' | '3m' | '6m' | '1y'

type ChartRangeData = {
  label: string
  cases: number[]
  resolved: number[]
  summary: string
}

type DashboardViewProps = {
  chartData: ChartRangeData
  chartJsData: ChartData<'line', number[], string>
  chartJsOptions: ChartOptions<'line'>
  activeRange: RangeKey
  onRangeChange: (range: RangeKey) => void
  onOpenModList: () => void
  moderatorCount?: number
  modQueueCount?: number
  resolvedCount?: number
}

const rangeButtons: Array<{ key: RangeKey; label: string }> = [
  { key: '7d', label: 'Last 7 days' },
  { key: '1m', label: '1 month' },
  { key: '3m', label: '3 months' },
  { key: '6m', label: '6 months' },
  { key: '1y', label: '1 year' },
]

export function DashboardView({
  chartData,
  chartJsData,
  chartJsOptions,
  activeRange,
  onRangeChange,
  onOpenModList,
  moderatorCount = 0,
  modQueueCount = 0,
  resolvedCount = 0,
}: DashboardViewProps) {
  return (
    <section className="section-card col-span-full rounded-[1.5rem] border border-slate-200/40 bg-white/75 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
      <div className="grid h-full min-h-0 gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.25rem] bg-white/80 p-5 shadow-sm ring-1 ring-slate-200/50 dark:bg-white/5 dark:ring-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Total Moderators
                </p>
                <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{moderatorCount}</p>
              </div>
              <button
                type="button"
                onClick={onOpenModList}
                className="group relative grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-100 via-amber-50 to-white text-orange-600 shadow-[0_8px_20px_rgba(249,115,22,0.18)] ring-1 ring-orange-200/70 transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(249,115,22,0.26)] dark:from-orange-500/25 dark:via-orange-400/15 dark:to-white/5 dark:text-orange-200 dark:ring-orange-400/20 dark:hover:bg-orange-500/25"
                aria-label="View moderator list"
                title="View moderator list"
              >
                <span className="absolute inset-0 rounded-xl bg-orange-400/15 opacity-0 blur-md transition group-hover:opacity-100 dark:bg-orange-300/10" />
                <span className="absolute right-0 top-0 h-2 w-2 animate-pulse rounded-full bg-orange-400 shadow-[0_0_0_4px_rgba(249,115,22,0.15)]" />
                <Users className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Active mods covering reports across the team.</p>
          </div>

          <div className="rounded-[1.25rem] bg-white/80 p-5 shadow-sm ring-1 ring-slate-200/50 dark:bg-white/5 dark:ring-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Mod Queue Count
                </p>
                <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{modQueueCount}</p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-200">
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Items waiting for review across posts and comments.</p>
          </div>

          <div className="rounded-[1.25rem] bg-white/80 p-5 shadow-sm ring-1 ring-slate-200/50 dark:bg-white/5 dark:ring-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Resolved Count
                </p>
                <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{resolvedCount}</p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-200">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Cases closed with the right action and follow-up.</p>
          </div>
        </div>

        <div className="rounded-[1.35rem] bg-slate-100 p-5 text-slate-900 shadow-[0_18px_35px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 dark:bg-slate-900/70 dark:text-white dark:ring-white/10">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-orange-600 dark:text-emerald-300">Case trend</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Cases increased vs solved</h2>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                Use the range selector to compare incoming cases and resolved items over time.
              </p>
            </div>

            <div className="flex min-w-0 flex-wrap gap-2 lg:justify-end">
              {rangeButtons.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onRangeChange(key)}
                  className={[
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition md:px-4 md:py-2 md:text-sm',
                    activeRange === key
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                      : 'bg-white text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.7fr)]">
            <div className="min-w-0 rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200/70 dark:bg-white/5 dark:ring-white/10">
              <div className="h-64 w-full">
                <Line data={chartJsData} options={chartJsOptions} />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                <span>Orange: received cases</span>
                <span>Green: solved cases</span>
              </div>
            </div>

            <div className="min-w-0 space-y-3 rounded-[1.25rem] bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-white/5 dark:ring-white/10">
              <div className="rounded-[1rem] bg-white p-4 dark:bg-white/10">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                  {chartData.label}
                </p>
                <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{chartData.summary}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  New reports are rising, but resolutions are keeping pace with the queue.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1rem] bg-white p-4 dark:bg-white/10">
                  <p className="text-xs text-slate-500 dark:text-slate-300">Incoming cases</p>
                  <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{chartData.cases.at(-1)}</p>
                </div>
                <div className="rounded-[1rem] bg-white p-4 dark:bg-white/10">
                  <p className="text-xs text-slate-500 dark:text-slate-300">Resolved cases</p>
                  <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{chartData.resolved.at(-1)}</p>
                </div>
              </div>
              <div className="rounded-[1rem] bg-white p-4 dark:bg-white/10">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Solve rate insight</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Solved cases are staying close to incoming volume, which keeps moderation backlog from compounding.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
