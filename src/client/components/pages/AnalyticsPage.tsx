import { useMemo, useState } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Trophy, 
  Medal, 
  Activity, 
  Users,
  Target,
  PieChart
} from 'lucide-react'
import type { DashboardData } from '../../../shared/api'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

type AnalyticsPageProps = {
  dashboardData: DashboardData | null
}

function AnalyticsPage({ dashboardData }: AnalyticsPageProps) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'system'>('leaderboard')

  const reportCategories = useMemo(() => {
    if (!dashboardData) return { labels: [], values: [] }
    
    const counts = { ...(dashboardData.reportStats || {}) }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
    return {
      labels: sorted.map(s => s[0]),
      values: sorted.map(s => s[1])
    }
  }, [dashboardData])

  const leaderboard = useMemo(() => {
    if (!dashboardData?.leaderboard) return []
    
    return dashboardData.leaderboard.map((entry, index) => ({
        username: entry.username,
        solved: entry.solvedCount,
        cases: entry.caseCount,
        total: entry.total,
        rank: index + 1
    }))
  }, [dashboardData])

  const chartData = {
    labels: reportCategories.labels,
    datasets: [
      {
        label: 'Reports',
        data: reportCategories.values,
        backgroundColor: 'rgba(255, 122, 24, 0.6)',
        borderColor: '#ff7a18',
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#11141b',
        titleColor: 'rgba(255, 255, 255, 0.5)',
        bodyColor: '#ffffff',
        padding: 12,
        cornerRadius: 12,
      }
    },
    scales: {
      x: { 
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { size: 10 } }
      },
      y: { 
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 10 } }
      }
    }
  }

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      {/* Left Panel: Report Categories */}
      <section className="flex min-h-0 flex-col rounded-[2.5rem] border border-white/10 bg-white/5 p-6 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
             <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-400">
                <PieChart className="h-5 w-5" />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Subreddit Vitals</p>
                <h3 className="text-xl font-black text-white tracking-tight">Report Categories</h3>
             </div>
          </div>
          <div className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-bold text-white/40 uppercase">
             Live Distribution
          </div>
        </div>

        <div className="flex-1 min-h-[300px]">
           <Bar data={chartData} options={chartOptions} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
           <div className="p-4 rounded-3xl bg-black/20 border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Top Violation</p>
              <p className="text-lg font-black text-white truncate">{reportCategories.labels[0] || 'None'}</p>
           </div>
           <div className="p-4 rounded-3xl bg-black/20 border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Total Reports</p>
              <p className="text-lg font-black text-white">{reportCategories.values.reduce((a, b) => a + b, 0)}</p>
           </div>
        </div>
      </section>

      {/* Right Panel: Tabs */}
      <aside className="flex min-h-0 flex-col rounded-[2.5rem] border border-white/10 bg-black/20 p-6 shadow-2xl">
        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl mb-6">
           <button 
             onClick={() => setActiveTab('leaderboard')}
             className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
               activeTab === 'leaderboard' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40 hover:text-white'
             }`}
           >
             <Trophy className="h-3.5 w-3.5" />
             Moderator Leaderboard
           </button>
           <button 
             onClick={() => setActiveTab('system')}
             className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
               activeTab === 'system' ? 'bg-orange-500 text-white shadow-lg' : 'text-white/40 hover:text-white'
             }`}
           >
             <Activity className="h-3.5 w-3.5" />
             System Health
           </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar">
           {activeTab === 'leaderboard' ? (
             <div className="space-y-3">
                {leaderboard.map((mod) => (
                  <div 
                    key={mod.username}
                    className="group flex items-center justify-between p-4 rounded-[1.75rem] border border-white/5 bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                       <div className="relative">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-black border-2 ${
                            mod.rank === 1 ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500' :
                            mod.rank === 2 ? 'border-slate-300/50 bg-slate-300/10 text-slate-300' :
                            mod.rank === 3 ? 'border-amber-700/50 bg-amber-700/10 text-amber-700' :
                            'border-white/5 bg-black/20 text-white/20'
                          }`}>
                            {mod.username.substring(0, 1).toUpperCase()}
                          </div>
                          {mod.rank <= 3 && (
                            <div className="absolute -top-2 -right-2 p-1.5 rounded-full bg-[#11141b] border border-white/10 shadow-xl">
                               <Medal className={`h-3 w-3 ${
                                 mod.rank === 1 ? 'text-yellow-400' :
                                 mod.rank === 2 ? 'text-slate-300' :
                                 'text-amber-700'
                               }`} />
                            </div>
                          )}
                       </div>
                       <div>
                          <p className="text-sm font-black text-white">u/{mod.username}</p>
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Active Moderator</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xl font-black text-white tracking-tighter">{mod.total}</p>
                       <p className="text-[9px] font-black uppercase text-orange-400 tracking-tighter">Actions</p>
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && (
                   <div className="py-20 text-center flex flex-col items-center gap-4 text-white/20">
                      <Users className="h-10 w-10 opacity-10" />
                      <p className="text-sm italic font-serif">No moderator activity found yet.</p>
                   </div>
                )}
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="h-20 w-20 rounded-[2rem] bg-white/5 flex items-center justify-center text-white/10 ring-1 ring-white/10">
                   <Target className="h-10 w-10" />
                </div>
                <h4 className="text-lg font-black text-white">Health Monitor</h4>
                <p className="text-sm text-white/40 leading-relaxed max-w-[200px]">
                   System health metrics and automated signal processing will appear here.
                </p>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                   <div className="bg-orange-500 h-full w-[65%] animate-pulse" />
                </div>
             </div>
           )}
        </div>

        <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
           <span className="flex items-center gap-2"><Activity className="h-3 w-3" /> Updated Live</span>
           <span className="flex items-center gap-2">Team Rank: Active</span>
        </div>
      </aside>
    </div>
  )
}

export default AnalyticsPage
