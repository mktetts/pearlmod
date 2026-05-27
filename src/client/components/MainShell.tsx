import { useEffect, useState } from 'react'
import type { MenuItem, MenuKey } from '../game'
import MenuBar from './MenuBar'
import TopBar from './TopBar'
import DashboardPage from './pages/DashboardPage'
import AnalyticsPage from './pages/AnalyticsPage'
import CasesEscalationPage from './pages/CasesEscalationPage'
import RaidBrigadePage from './pages/RaidBrigadePage'
import AutomoderatorsPage from './pages/AutomoderatorsPage'
import QueuePage from './pages/QueuePage'
import type { DashboardData } from '../../shared/api'

type MainShellProps = {
  activeMenu: MenuKey
  menuItems: MenuItem[]
  onMenuChange: (menu: MenuKey) => void
  dashboardData: DashboardData | null
  loading: boolean
  refreshing: boolean
  username: string
  onRefresh: () => void
}

const pageTitleByMenu: Record<MenuKey, string> = {
  dashboard: 'Dashboard',
  modQueueAssistant: 'Mod Queue Assistant',
  analytics: 'Analytics',
  casesEscalation: 'Cases and Escalation',
  raidBrigade: 'Raid Brigading',
  automoderators: 'Automoderators',
}

function MainShell({ activeMenu, menuItems, onMenuChange, dashboardData, loading, refreshing, username, onRefresh }: MainShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const content = (() => {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-lg font-semibold text-white/50 animate-pulse">Loading dashboard data...</p>
        </div>
      )
    }

    switch (activeMenu) {
      case 'modQueueAssistant':
        return <QueuePage dashboardData={dashboardData} username={username} />
      case 'analytics':
        return <AnalyticsPage dashboardData={dashboardData} />
      case 'casesEscalation':
        return <CasesEscalationPage dashboardData={dashboardData} username={username} />
      case 'raidBrigade':
        return <RaidBrigadePage dashboardData={dashboardData} onRefresh={onRefresh} />
      case 'automoderators':
        return <AutomoderatorsPage dashboardData={dashboardData} />
      case 'dashboard':
      default:
        return <DashboardPage dashboardData={dashboardData} />
    }
  })()

  return (
    <main className="relative flex h-screen w-full overflow-hidden bg-[#0f1115] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,126,64,0.18),_transparent_40%),linear-gradient(180deg,_#151821_0%,_#0f1115_100%)]" />
      <div className="relative z-10 flex w-full flex-col">
        <TopBar
          title={pageTitleByMenu[activeMenu]}
          username={username}
          isMenuOpen={isMobileMenuOpen}
          onMenuToggle={() => setIsMobileMenuOpen((open) => !open)}
          onRefresh={onRefresh}
          isRefreshing={refreshing}
        />
        <MenuBar
          items={menuItems}
          activeMenu={activeMenu}
          onMenuChange={onMenuChange}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />

        <section className="flex min-h-0 flex-1 p-4 sm:p-6">
          <div className="flex w-full min-h-0 flex-1 flex-col rounded-[2rem] border border-white/10 bg-black/15 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.3)] sm:p-6">
            <div className="min-h-0 flex-1 overflow-hidden">{content}</div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default MainShell
