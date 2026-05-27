import { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, 
  Settings, 
  ExternalLink, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  X, 
  Save,
  Loader2,
  Zap,
  Lock,
  Unlock,
  Eye,
  CheckCircle2,
  MessageSquare,
  Activity,
  ChevronRight,
  ShieldQuestion
} from 'lucide-react';
import type { DashboardData, BrigadeAlert, BrigadeSettings, PostDetails } from '../../../shared/api';

type RaidBrigadePageProps = {
  dashboardData: DashboardData | null;
  onRefresh: () => void;
};

type BrigadeTab = 'live' | 'solved';

function RaidBrigadePage({ dashboardData, onRefresh }: RaidBrigadePageProps) {
  const [activeTab, setActiveTab] = useState<BrigadeTab>('live');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const [localSettings, setLocalSettings] = useState<BrigadeSettings | null>(null);
  
  const [postDetails, setPostDetails] = useState<PostDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const alerts = useMemo(() => dashboardData?.brigadeAlerts || [], [dashboardData]);
  const liveAlerts = useMemo(() => alerts.filter(a => a.status === 'Live'), [alerts]);
  const solvedAlerts = useMemo(() => alerts.filter(a => a.status === 'Solved'), [alerts]);
  
  const currentQueue = activeTab === 'live' ? liveAlerts : solvedAlerts;
  const selectedAlert = useMemo(() => alerts.find(a => a.id === selectedId), [alerts, selectedId]);

  useEffect(() => {
    if (selectedAlert?.itemId) {
      fetchPostDetails(selectedAlert.itemId);
    } else {
      setPostDetails(null);
    }
  }, [selectedAlert?.itemId]);

  const fetchPostDetails = async (itemId: string) => {
    setIsLoadingDetails(true);
    try {
      const res = await fetch(`/api/post-details/${itemId}`);
      if (res.ok) {
        const data = await res.json();
        setPostDetails(data);
      }
    } catch (err) {
      console.error('Failed to fetch post details', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const openSettings = () => {
    if (dashboardData?.brigadeSettings) {
      setLocalSettings(dashboardData.brigadeSettings);
    }
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    if (!localSettings) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/brigade-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localSettings),
      });
      if (res.ok) {
        setIsSettingsOpen(false);
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleModeration = async (action: 'lock' | 'unlock' | 'crowdControl', level?: string) => {
    if (!selectedAlert) return;
    setIsActionPending(true);
    try {
      const res = await fetch('/api/brigade-moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itemId: selectedAlert.itemId, 
          action, 
          level, 
          alertId: selectedAlert.id 
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Moderation failed', err);
    } finally {
      setIsActionPending(false);
    }
  };

  const navigateTo = (url: string) => {
     if (typeof window !== 'undefined') window.open(url, '_blank');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top Header - Settings Button Only */}
      <div className="flex items-center justify-between mb-6 flex-none px-2">
         <div className="flex items-center gap-4 bg-black/20 rounded-2xl p-1 border border-white/5">
            {(['live', 'solved'] as BrigadeTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedId(null); }}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? 'bg-sky-500 text-white shadow-lg' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab === 'live' ? `Live Queue (${liveAlerts.length})` : `Solved Queue (${solvedAlerts.length})`}
              </button>
            ))}
         </div>

         <button 
           onClick={openSettings}
           className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group text-[10px] font-black uppercase tracking-widest text-white/60"
         >
            <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-500" />
            Detection Settings
         </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        {/* Left Panel: Alerts Queue */}
        <section className="flex flex-col bg-black/20 rounded-[2.5rem] border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/5">
             <h3 className="text-sm font-black text-white uppercase tracking-widest">
                {activeTab === 'live' ? 'Under Investigation' : 'Archived Threat Log'}
             </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
            {currentQueue.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-center px-6">
                 <ShieldCheck className="h-12 w-12 mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-widest">Queue Empty</p>
              </div>
            ) : (
              currentQueue.map((alert) => (
                <div 
                  key={alert.id}
                  onClick={() => setSelectedId(alert.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                    selectedId === alert.id 
                      ? 'bg-sky-500/10 border-sky-500/50 shadow-lg' 
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${
                    alert.severity === 'Critical' ? 'bg-rose-600' : 
                    alert.severity === 'High' ? 'bg-orange-500' : 'bg-sky-500'
                  }`} />
                  
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                          alert.severity === 'Critical' ? 'bg-rose-500/20 text-rose-500' : 
                          alert.severity === 'High' ? 'bg-orange-500/20 text-orange-500' : 'bg-sky-500/20 text-sky-400'
                        }`}>
                          {alert.severity}
                        </span>
                        <span className="text-[9px] text-white/30 font-bold">
                          {new Date(alert.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white tracking-tight truncate">
                         {alert.threadTitle || 'Unknown Context'}
                      </h4>
                      <p className="text-[10px] text-white/40 font-medium truncate mt-1">
                        {alert.type}
                      </p>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-white/20 transition-transform ${selectedId === alert.id ? 'translate-x-1 text-white' : ''}`} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Panel: Post Detail & Controls */}
        <section className="flex flex-col bg-black/20 rounded-[2.5rem] border border-white/5 overflow-hidden">
          {selectedAlert ? (
            <div className="flex h-full flex-col">
              {/* Header with Actions */}
              <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="min-w-0">
                    <h3 className="text-lg font-black tracking-tight text-white truncate">
                       {selectedAlert.threadTitle}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                       <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">{selectedAlert.type}</span>
                       <span className="h-1 w-1 bg-white/20 rounded-full" />
                       <span className="text-[10px] font-medium text-white/30">{selectedAlert.reason}</span>
                    </div>
                 </div>

                 <div className="flex items-center gap-2 flex-none">
                    {activeTab === 'live' ? (
                      <>
                        <button 
                          disabled={isActionPending}
                          onClick={() => handleModeration('lock')}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-900/20 disabled:opacity-50"
                        >
                           {isActionPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3" />}
                           Lock Post
                        </button>
                        <div className="relative group">
                           <button 
                             className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-sky-900/20"
                           >
                              <ShieldAlert className="h-3 w-3" />
                              Crowd Control
                           </button>
                           <div className="absolute right-0 top-full mt-2 w-48 bg-[#11141b] border border-white/10 rounded-2xl p-2 shadow-2xl invisible group-hover:visible z-50">
                              {(['LENIENT', 'MEDIUM', 'STRICT'] as const).map(level => (
                                <button
                                  key={level}
                                  onClick={() => handleModeration('crowdControl', level)}
                                  className="w-full text-left px-4 py-2 rounded-xl text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                                >
                                  Level: {level}
                                </button>
                              ))}
                           </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <button 
                          disabled={isActionPending}
                          onClick={() => handleModeration('unlock')}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                        >
                           {isActionPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
                           Unlock
                        </button>
                        <button 
                          disabled={isActionPending}
                          onClick={() => handleModeration('crowdControl', 'OFF')}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                           {isActionPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                           Reset Control
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => selectedAlert.permalink && navigateTo(`https://reddit.com${selectedAlert.permalink}`)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 transition-all"
                    >
                       <ExternalLink className="h-4 w-4" />
                    </button>
                 </div>
              </div>

              {/* Post Content Display */}
              <div className="flex-1 overflow-y-auto p-8 hide-scrollbar">
                {isLoadingDetails ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                     <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Reconstructing Post Content...</p>
                  </div>
                ) : postDetails ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                     {/* Stats for the post within the alert context */}
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 rounded-3xl p-5 border border-white/5 shadow-inner">
                           <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Target OP</p>
                           <p className="text-sm font-black text-white">u/{postDetails.authorName}</p>
                        </div>
                        <div className="bg-white/5 rounded-3xl p-5 border border-white/5 shadow-inner">
                           <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Total Comments</p>
                           <p className="text-sm font-black text-white">{postDetails.comments.length}</p>
                        </div>
                        <div className="bg-white/5 rounded-3xl p-5 border border-white/5 shadow-inner">
                           <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Times Brigaded</p>
                           <p className="text-sm font-black text-sky-400">{selectedAlert.postBrigadeCount}</p>
                        </div>
                        <div className="bg-white/5 rounded-3xl p-5 border border-white/5 shadow-inner">
                           <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Current Status</p>
                           <p className={`text-xs font-black uppercase tracking-widest ${selectedAlert.isLocked ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {selectedAlert.isLocked ? 'Locked' : 'Open'}
                           </p>
                        </div>
                     </div>

                     <div className="bg-white/5 rounded-3xl p-8 border border-white/5">
                        <h4 className="text-xl font-bold text-white mb-6 leading-relaxed">{postDetails.title}</h4>
                        {postDetails.body && (
                          <div className="text-sm text-white/70 leading-8 whitespace-pre-wrap font-medium">
                            {postDetails.body}
                          </div>
                        )}
                     </div>

                     <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2 px-2">
                           <MessageSquare className="h-3 w-3" /> Recent Activity Context
                        </h5>
                        <div className="space-y-4 pl-4 border-l-2 border-white/5">
                           {postDetails.comments.slice(0, 10).map(comment => (
                             <div key={comment.id} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                   <span className="text-[10px] font-black text-sky-400">u/{comment.authorName}</span>
                                   <span className="text-[9px] text-white/20 font-medium">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-xs text-white/60 leading-relaxed font-medium">{comment.body}</p>
                             </div>
                           ))}
                           {postDetails.comments.length > 10 && (
                             <button 
                               onClick={() => selectedAlert.permalink && navigateTo(`https://reddit.com${selectedAlert.permalink}`)}
                               className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white hover:bg-white/5 rounded-2xl border border-dashed border-white/10 transition-all"
                             >
                               View all {postDetails.comments.length} comments on Reddit
                             </button>
                           )}
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-center">
                    <ShieldQuestion className="h-16 w-16 mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest">Post Content Unavailable</p>
                    <p className="text-xs">The content may have been deleted or the API is restricted.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-center">
               <Eye className="h-20 w-20 mb-6" />
               <h3 className="text-xl font-black uppercase tracking-widest">Intelligence Viewport</h3>
               <p className="text-sm font-medium mt-2">Select an alert from the queue to inspect content and execute moderation protocols.</p>
            </div>
          )}
        </section>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && localSettings && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#0f1115] border border-white/10 w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl ring-1 ring-white/10 scale-in animate-in">
             <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-400">
                    <Settings className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-white">Detection Console</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Brigade Sensitivity Tuning</p>
                  </div>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="text-white/20 hover:text-white">
                  <X className="h-6 w-6" />
                </button>
             </div>

             <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto hide-scrollbar">
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-widest text-white">Detection Engine</label>
                      <button 
                        onClick={() => setLocalSettings({...localSettings, enabled: !localSettings.enabled})}
                        className={`w-12 h-6 rounded-full transition-all relative ${localSettings.enabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                      >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${localSettings.enabled ? 'left-7' : 'left-1'}`} />
                      </button>
                   </div>
                   
                   <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-widest text-white">Send ModMail Alerts</label>
                      <button 
                        onClick={() => setLocalSettings({...localSettings, sendModMail: !localSettings.sendModMail})}
                        className={`w-12 h-6 rounded-full transition-all relative ${localSettings.sendModMail ? 'bg-sky-500' : 'bg-white/10'}`}
                      >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${localSettings.sendModMail ? 'left-7' : 'left-1'}`} />
                      </button>
                   </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Rapid participation interval (Seconds)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" min="1" max="60" 
                      value={localSettings.rapidInterval} 
                      onChange={(e) => setLocalSettings({...localSettings, rapidInterval: parseInt(e.target.value)})}
                      className="flex-1 accent-sky-500" 
                    />
                    <span className="text-sm font-black text-white w-12 text-right">{localSettings.rapidInterval}s</span>
                  </div>
                  <p className="text-[10px] text-white/20 italic">If events happen faster than this, mark as rapid burst.</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Event Count Threshold</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" min="2" max="50" 
                      value={localSettings.rapidThreshold} 
                      onChange={(e) => setLocalSettings({...localSettings, rapidThreshold: parseInt(e.target.value)})}
                      className="flex-1 accent-sky-500" 
                    />
                    <span className="text-sm font-black text-white w-12 text-right">{localSettings.rapidThreshold}</span>
                  </div>
                  <p className="text-[10px] text-white/20 italic">Number of events required in the interval to trigger alert.</p>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
                   <div className="space-y-3">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Min Account Age</label>
                      <input 
                        type="number" 
                        value={localSettings.accountAgeDays}
                        onChange={(e) => setLocalSettings({...localSettings, accountAgeDays: parseInt(e.target.value) || 0})}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-black" 
                      />
                   </div>
                   <div className="space-y-3">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Min Karma</label>
                      <input 
                        type="number" 
                        value={localSettings.karmaThreshold}
                        onChange={(e) => setLocalSettings({...localSettings, karmaThreshold: parseInt(e.target.value) || 0})}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-black" 
                      />
                   </div>
                </div>
             </div>

             <div className="px-10 py-8 bg-white/5 border-t border-white/5">
                <button 
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.25em] transition-all shadow-2xl shadow-sky-900/20 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Deploy Configuration</>}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RaidBrigadePage;
