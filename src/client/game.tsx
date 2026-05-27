import './index.css';

import { useEffect, useState, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BadgeAlert, ChartColumnBig, LayoutGrid, ShieldCheck, ShieldAlert, UserRound, Lock } from 'lucide-react';
import MainShell from './components/MainShell';
import type { DashboardData, InitResponse } from '../shared/api';

export type MenuKey =
  | 'dashboard'
  | 'modQueueAssistant'
  | 'analytics'
  | 'casesEscalation'
  | 'raidBrigade'
  | 'automoderators';
export type Screen = 'landing' | 'main';

export type MenuItem = {
  key: MenuKey;
  label: string;
  icon: any;
};

const menuItems: MenuItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { key: 'modQueueAssistant', label: 'Mod Queue Assistant', icon: ShieldCheck },
  { key: 'analytics', label: 'Analytics', icon: ChartColumnBig },
  { key: 'casesEscalation', label: 'Cases and Escalation', icon: BadgeAlert },
  { key: 'raidBrigade', label: 'Raid Brigading', icon: ShieldAlert },
  { key: 'automoderators', label: 'Automoderators', icon: UserRound },
];

export const App = () => {
  const [screen, _setScreen] = useState<Screen>('main');
  const [activeMenu, setActiveMenu] = useState<MenuKey>('dashboard');
  
  const [username, setUsername] = useState<string | null>(null);
  const [isModerator, setIsModerator] = useState<boolean | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isSync = false) => {
    if (isSync) setRefreshing(true);
    else setLoading(true);
    
    try {
      const [initRes, dashboardRes] = await Promise.all([
        fetch('/api/init'),
        fetch('/api/dashboard'),
      ]);

      if (initRes.ok) {
        const initData: InitResponse = await initRes.json();
        setUsername(initData.username);
        setIsModerator(initData.isModerator);
      }

      if (dashboardRes.ok) {
        const dashData: DashboardData = await dashboardRes.json();
        setDashboardData(dashData);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchData();

    // Auto-poll every 5 seconds
    const interval = setInterval(() => {
      void fetchData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <main className="relative flex h-screen w-full overflow-hidden bg-[#0f1115] text-white items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,126,64,0.18),_transparent_40%),linear-gradient(180deg,_#151821_0%,_#0f1115_100%)]" />
        <div className="relative z-10 flex flex-col items-center gap-4">
           <div className="h-12 w-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
           <p className="text-sm font-black uppercase tracking-[0.3em] text-white/40 animate-pulse">Initializing Mod Portal</p>
        </div>
      </main>
    );
  }

  if (isModerator === false) {
    return (
      <main className="relative flex h-screen w-full overflow-hidden bg-[#0f1115] text-white items-center justify-center p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,126,64,0.18),_transparent_40%),linear-gradient(180deg,_#151821_0%,_#0f1115_100%)]" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
           <div className="h-20 w-20 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 shadow-2xl shadow-rose-500/10">
              <Lock className="h-10 w-10 text-rose-500" />
           </div>
           <h2 className="text-3xl font-black tracking-tight mb-4">Access Restricted</h2>
           <p className="text-white/60 leading-relaxed mb-8">
             This control center is exclusive to community moderators. You do not have the necessary permissions to access these tools.
           </p>
           <button 
             onClick={() => window.location.reload()}
             className="px-8 py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition-all"
           >
             Try Again
           </button>
        </div>
      </main>
    );
  }

  return (
    <MainShell
      activeMenu={activeMenu}
      menuItems={menuItems}
      onMenuChange={setActiveMenu}
      dashboardData={dashboardData}
      loading={loading}
      refreshing={refreshing}
      username={username ?? 'Anonymous'}
      onRefresh={() => fetchData(true)}
    />
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
