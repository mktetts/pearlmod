import { useState, useMemo } from 'react'
import { CircleUserRound, Gauge, Inbox, ShieldCheck, Sparkles, Users, X } from 'lucide-react'
import DashboardChart, { type DashboardRange } from './DashboardChart'
import type { DashboardData } from '../../../shared/api'

type MetricCard =
  | {
      kind: 'standard'
      label: string
      value: string | number
      icon: typeof Users
    }
  | {
      kind: 'radar'
      label: string
      foundLabel: string
      foundValue: string | number
      stoppedLabel: string
      stoppedValue: string | number
      icon: typeof ShieldCheck
      isActive: boolean
    }

const rangeOptions: { value: DashboardRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
]

function RadarMetricCard({
  label,
  foundLabel,
  foundValue,
  stoppedLabel,
  stoppedValue,
  isActive,
}: Extract<MetricCard, { kind: 'radar' }>) {
  return (
    <article className={`radar-card col-span-2 rounded-3xl border p-4 shadow-[0_16px_35px_rgba(0,0,0,0.2)] sm:p-5 ${isActive ? 'border-emerald-500/15 bg-[#06100b]' : 'border-white/5 bg-black/20 opacity-60'}`}>
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="radar relative flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
          {isActive && <span className="sweep" />}
          <span className={`absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${isActive ? 'bg-[#8effa6] shadow-[0_0_0_6px_rgba(142,255,166,0.12)]' : 'bg-white/10'}`} />
        </div>
        <div className="sm:text-right">
          <p className="max-w-[16rem] text-sm leading-5 text-white/75 sm:ml-auto">{label}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:justify-end">
            <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-left">
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">{foundLabel}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{foundValue}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-left">
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">{stoppedLabel}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{stoppedValue}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
        <div className="flex items-center justify-between text-xs text-white/55">
          <span>Live radar scan</span>
          <span className={`font-medium ${isActive ? 'radar-blink text-rose-300' : 'text-white/20'}`}>
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
      </div>
    </article>
  )
}

type DashboardPageProps = {
  dashboardData: DashboardData | null
}

function DashboardPage({ dashboardData }: DashboardPageProps) {
  const [range, setRange] = useState<DashboardRange>('7d')
  const [isModeratorsOpen, setIsModeratorsOpen] = useState(false)

  const activeAlerts = useMemo(() => dashboardData?.brigadeAlerts.filter(a => a.status === 'Live') || [], [dashboardData]);
  const solvedAlertsCount = dashboardData?.brigadeAlerts.filter(a => a.status === 'Solved').length || 0;
  const criticalAlerts = useMemo(() => activeAlerts.filter(a => a.severity === 'Critical'), [activeAlerts]);
  const isEngineActive = dashboardData?.brigadeSettings?.enabled ?? true;

  const metrics = useMemo<MetricCard[]>(() => {
    if (!dashboardData) return []
    
    const today = new Date().toISOString().split('T')[0]
    const resolvedToday = dashboardData.modLog.filter(log => log.createdAt.split('T')[0] === today).length

    return [
      { kind: 'standard', label: 'No. of moderator', value: dashboardData.moderatorCount, icon: Users },
      { kind: 'standard', label: 'Mod queue count', value: dashboardData.modQueueCount, icon: Inbox },
      { kind: 'standard', label: 'Total resolved today', value: resolvedToday, icon: ShieldCheck },
      { kind: 'standard', label: 'Total overall resolved', value: dashboardData.resolvedCount, icon: Gauge },
      { kind: 'standard', label: 'No. of Banned users', value: dashboardData.bannedUsers.length, icon: CircleUserRound },
      { kind: 'standard', label: 'Solved percentage', value: `${dashboardData.resolvedCount > 0 ? Math.round((dashboardData.resolvedCount / (dashboardData.resolvedCount + dashboardData.modQueueCount)) * 100) : 0}%`, icon: Sparkles },
      {
        kind: 'radar',
        label: 'Live Threat Intelligence',
        foundLabel: 'Active Alerts',
        foundValue: activeAlerts.length,
        stoppedLabel: 'Solved Brigades',
        stoppedValue: dashboardData.totalSolvedCount,
        icon: ShieldCheck,
        isActive: isEngineActive
      },
    ]
  }, [dashboardData, activeAlerts, solvedAlertsCount, isEngineActive])

  return (
    <>
      {criticalAlerts.length > 0 && (
        <div className="mb-4 bg-rose-600 text-white px-6 py-3 rounded-2xl flex items-center justify-between animate-pulse">
           <div className="flex items-center gap-3 font-black uppercase tracking-widest text-xs">
              <ShieldAlert className="h-5 w-5" />
              CRITICAL BRIGADE ALERT DETECTED: {criticalAlerts[0].threadTitle}
           </div>
           <p className="text-[10px] font-bold opacity-70">Action Required in Raid Brigading Console</p>
        </div>
      )}
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="min-h-0 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.18)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">Dashboard</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">Moderation overview</h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60">
                Live metrics
              </div>
              <button
                type="button"
                onClick={() => setIsModeratorsOpen(true)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                All moderators
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {metrics.map((metric) =>
              metric.kind === 'radar' ? null : (
                <article
                  key={metric.label}
                  className="rounded-3xl border border-white/10 bg-black/20 p-4 shadow-[0_16px_35px_rgba(0,0,0,0.16)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="max-w-[10rem] text-sm leading-5 text-white/55">{metric.label}</p>
                    <metric.icon className="h-4 w-4 flex-none text-[#ff9c75]" />
                  </div>
                  <p className="mt-5 text-3xl font-semibold tracking-tight text-white">{metric.value}</p>
                </article>
              ),
            )}
          </div>

          <div className="mt-3">
            {metrics
              .filter((metric): metric is Extract<MetricCard, { kind: 'radar' }> => metric.kind === 'radar')
              .map((metric) => (
                <RadarMetricCard key={metric.label} {...metric} />
              ))}
          </div>
        </section>

        <aside className="min-h-0 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.18)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">Cases trend</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">Cases in vs solved</h3>
            </div>

            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/40">
              Last 7 days
            </div>
          </div>

          <div className="mt-4 h-[calc(100%-4rem)] min-h-[18rem] rounded-[1.75rem] border border-white/10 bg-black/20 p-3 sm:p-4">
            <DashboardChart range={range} trendData={dashboardData?.trend} />
          </div>
        </aside>
      </div>

      {isModeratorsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close moderators modal"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsModeratorsOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#11141b] p-5 shadow-[0_35px_120px_rgba(0,0,0,0.55)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/40">Moderation team</p>
                <h3 className="mt-1 text-xl font-semibold text-white">All moderators</h3>
              </div>

              <button
                type="button"
                onClick={() => setIsModeratorsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {dashboardData?.moderators.map((mod) => (
                <div
                  key={mod.username}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80"
                >
                  <p className="font-semibold text-white">u/{mod.username}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {mod.permissions.map(perm => (
                      <span key={perm} className="text-[10px] uppercase text-white/40">{perm}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default DashboardPage
