import { useState, useEffect, useMemo } from 'react';
import { 
  Lock, Unlock, MessageSquare, User, Clock, ExternalLink, 
  ChevronRight, Loader2, ThumbsUp, Trash2, ShieldAlert,
  Inbox, UserCheck, CheckCircle, ChartBar, Zap, Sparkles
} from 'lucide-react';
import type { ModQueueItem, PostDetails, ModLogEntry } from '../../shared/api';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { classify } from '../../core/analysis';

type TabId = 'queue' | 'myQueue' | 'solved' | 'graph';

type ModQueueAssistantViewProps = {
  items: ModQueueItem[];
  modLog: ModLogEntry[];
  currentUsername: string;
  trend?: { label: string; cases: number; resolved: number }[];
};

export function ModQueueAssistantView({ items, modLog, currentUsername, trend }: ModQueueAssistantViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('queue');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [localLocks, setLocalLocks] = useState<Record<string, string>>({});
  const [postDetails, setPostDetails] = useState<PostDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [actionPending, setActionActionPending] = useState(false);
  
  const [localItems, setLocalItems] = useState<ModQueueItem[]>(items);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const selectedItem = localItems.find((item) => item.id === selectedItemId);

  useEffect(() => {
    if (selectedItemId) {
      fetchDetails(selectedItemId);
    } else {
      setPostDetails(null);
    }
  }, [selectedItemId]);

  const fetchDetails = async (itemId: string) => {
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

  const toggleLock = async (itemId: string, isCurrentlyLocked: boolean) => {
    try {
      const res = await fetch('/api/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, unlock: isCurrentlyLocked }),
      });
      if (res.ok) {
        setLocalLocks((prev) => {
          const next = { ...prev };
          if (isCurrentlyLocked) {
            delete next[itemId];
          } else {
            next[itemId] = currentUsername;
          }
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to toggle lock', err);
    }
  };

  const takeAction = async (action: 'approve' | 'remove' | 'spam') => {
    if (!selectedItemId) return;
    setActionActionPending(true);
    try {
      const res = await fetch('/api/moderation-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selectedItemId, action }),
      });
      if (res.ok) {
        setSelectedItemId(null);
        setLocalItems(prev => prev.filter(i => i.id !== selectedItemId));
      }
    } catch (err) {
      console.error(`Failed to ${action}`, err);
    } finally {
      setActionActionPending(false);
    }
  };

  const getLockedBy = (item: ModQueueItem) => {
    return localLocks[item.id] || item.isLockedBy;
  };

  const filteredItems = useMemo(() => {
    if (activeTab === 'myQueue') {
      return localItems.filter(item => getLockedBy(item) === currentUsername);
    }
    return localItems;
  }, [localItems, activeTab, localLocks, currentUsername]);

  const runAutoAnalyse = async () => {
    const lockedItems = localItems.filter(item => getLockedBy(item) === currentUsername);
    if (lockedItems.length === 0) return;

    setIsAnalysing(true);
    setAnalysisProgress(5);

    try {
      const total = lockedItems.length;
      let processed = 0;

      for (const item of lockedItems) {
        const text = `${item.title || ''} ${item.body}`;
        const analysis = await classify(text);
        
        // Save to server for durability
        await fetch('/api/save-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: item.id, analysis }),
        });

        // Update local state
        setLocalItems(prev => prev.map(i => {
          if (i.id === item.id) {
            return {
              ...i,
              aiCategory: analysis.category,
              aiScore: analysis.score,
              aiEvidence: analysis.evidence,
            };
          }
          return i;
        }));

        processed++;
        setAnalysisProgress(Math.round((processed / total) * 100));
      }

      setTimeout(() => setIsAnalysing(false), 500);
    } catch (err) {
      console.error('Auto analysis failed', err);
      setIsAnalysing(false);
    }
  };

  const highlightText = (text: string, evidence: string[]) => {
    if (!evidence || evidence.length === 0) return text;
    const regex = new RegExp(`(${evidence.join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-orange-500/40 text-orange-900 dark:text-white rounded px-1 border-b-2 border-orange-500 font-bold decoration-clone">
          {part}
        </mark>
      ) : part
    );
  };

  const mySolvedLog = useMemo(() => {
    return modLog.filter(log => log.moderatorName === currentUsername);
  }, [modLog, currentUsername]);

  const chartJsData = useMemo<ChartData<'line', number[], string>>(() => {
    if (!trend) return { labels: [], datasets: [] };
    return {
      labels: trend.map((t) => t.label),
      datasets: [
        {
          label: 'Incoming',
          data: trend.map((t) => t.cases),
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Solved',
          data: trend.map((t) => t.resolved),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [trend]);

  const chartJsOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'queue', label: 'Mod Queue', icon: Inbox },
    { id: 'myQueue', label: 'My Queue', icon: UserCheck },
    { id: 'solved', label: 'Solved by me', icon: CheckCircle },
    { id: 'graph', label: 'Graph', icon: ChartBar },
  ];

  return (
    <section className="section-card col-span-full rounded-[1.5rem] border border-slate-200/40 bg-white/75 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
      <div className="flex h-full min-h-0 flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Mod Queue Assistant</p>
            <h2 className="text-2xl font-black tracking-tight">Live moderation guidance</h2>
          </div>
          
          <div className="flex items-center gap-3">
            {activeTab === 'myQueue' && filteredItems.length > 0 && (
              <button
                onClick={runAutoAnalyse}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-400 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-900/20 transition-all hover:scale-105 active:scale-95"
              >
                <Zap className="h-3.5 w-3.5 fill-current" />
                Auto Analyse
              </button>
            )}
            <nav className="flex rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id !== 'queue' && tab.id !== 'myQueue') setSelectedItemId(null);
                  }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-orange-600 shadow-sm dark:bg-white/10 dark:text-orange-400'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.id === 'queue' && localItems.length > 0 && (
                    <span className="ml-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] text-white">
                      {localItems.length}
                    </span>
                  )}
                  {tab.id === 'myQueue' && localItems.filter(i => getLockedBy(i) === currentUsername).length > 0 && (
                    <span className="ml-1 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] text-white">
                      {localItems.filter(i => getLockedBy(i) === currentUsername).length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[0.35fr_0.65fr]">
          {/* Main List Area */}
          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            {activeTab === 'graph' ? (
               <div className="flex h-full flex-col p-4 rounded-[1.35rem] bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                 <h3 className="text-sm font-bold mb-4">Moderation Activity (Last 7 Days)</h3>
                 <div className="flex-1 min-h-[200px]">
                   <Line data={chartJsData} options={chartJsOptions} />
                 </div>
               </div>
            ) : activeTab === 'solved' ? (
              <div className="space-y-3">
                {mySolvedLog.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 rounded-[1.35rem] bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10">
                    <p className="text-sm text-slate-500">No recent actions recorded.</p>
                  </div>
                ) : (
                  mySolvedLog.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-col gap-2 rounded-[1.1rem] border border-slate-100 bg-white/50 p-4 dark:border-white/5 dark:bg-white/5"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                          log.type.includes('approve') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {log.type}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {log.targetTitle || 'Moderation Action'}
                      </p>
                      {log.targetAuthor && <p className="text-[10px] text-slate-500">Author: u/{log.targetAuthor}</p>}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                {filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 rounded-[1.35rem] bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10">
                    <p className="text-sm text-slate-500">
                      {activeTab === 'myQueue' ? 'No items locked by you.' : 'Queue is clear! 🎉'}
                    </p>
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const lockedBy = getLockedBy(item);
                    const isSelected = selectedItemId === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`group flex flex-col gap-2 rounded-[1.1rem] border p-4 text-left transition-all ${
                          isSelected
                            ? 'border-orange-200 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10'
                            : 'border-slate-100 bg-white/50 hover:border-slate-200 hover:bg-white dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                              {item.title || item.body.substring(0, 50) + '...'}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">u/{item.authorName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              {lockedBy && (
                                <div
                                  title={`Locked by ${lockedBy}`}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                                >
                                  <Lock className="h-3 w-3" />
                                </div>
                              )}
                              <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                            </div>
                            {item.aiCategory && (
                              <div className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter shadow-sm border ${
                                item.aiCategory === 'SAFE' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                              }`}>
                                <Sparkles className="h-2.5 w-2.5" />
                                {item.aiCategory}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                            {item.numReports} Reports
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </>
            )}
          </div>

          {/* Detail View */}
          <div className="flex flex-col overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl ring-1 ring-white/10">
            {selectedItem ? (
              <div className="flex h-full flex-col p-6">
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black leading-tight text-white">
                      {selectedItem.title || 'Comment Report'}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> u/{selectedItem.authorName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(selectedItem.createdAt).toLocaleString()}
                      </span>
                      <a
                        href={`https://reddit.com${selectedItem.permalink}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> View on Reddit
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const lockedBy = getLockedBy(selectedItem);
                      toggleLock(selectedItem.id, !!lockedBy);
                    }}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${
                      getLockedBy(selectedItem)
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {getLockedBy(selectedItem) ? (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        Locked by {getLockedBy(selectedItem) === currentUsername ? 'You' : getLockedBy(selectedItem)}
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3.5 w-3.5" />
                        Lock to Work
                      </>
                    )}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6">
                  {isLoadingDetails ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                      <p className="text-sm text-slate-400">Loading full context...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Report Reasons</h4>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {selectedItem.userReportReasons.map((reason, i) => (
                              <span key={i} className="rounded-lg bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-300 ring-1 ring-rose-500/30">
                                {reason}
                              </span>
                            ))}
                            {selectedItem.modReportReasons.map((reason, i) => (
                              <span key={i} className="rounded-lg bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-300 ring-1 ring-orange-500/30">
                                Mod: {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                        {selectedItem.aiCategory && (
                          <div className="flex items-center gap-3 rounded-[1.25rem] bg-orange-500/10 border border-orange-500/20 px-4 py-2 shadow-inner animate-in fade-in zoom-in">
                            <Sparkles className="h-4 w-4 text-orange-400" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">AI Verdict</span>
                              <span className="text-xs font-black text-white uppercase tracking-wider">
                                <span className="text-orange-400">{selectedItem.aiCategory}</span> ({Math.round(selectedItem.aiScore! * 100)}%)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Reported Content</h4>
                        <div className="mt-3 rounded-[1.25rem] bg-white/5 p-5 text-sm leading-relaxed text-slate-200 border border-white/5 ring-1 ring-white/5">
                          {selectedItem.aiEvidence 
                            ? highlightText(selectedItem.body || selectedItem.title || '', selectedItem.aiEvidence)
                            : (selectedItem.body || (selectedItem.title ? <i>No body content</i> : <i>[Deleted/Empty]</i>))}
                        </div>
                      </div>

                      {postDetails && (
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Post Context & Thread</h4>
                           <div className="rounded-[1.25rem] bg-white/5 p-5 space-y-5 border border-white/5 ring-1 ring-white/5">
                              <p className="text-xs font-black text-orange-400">
                                <span className="text-slate-500 uppercase tracking-wider mr-2">OP</span> 
                                u/{postDetails.authorName}: {postDetails.title}
                              </p>
                              <div className="space-y-4 pl-3 border-l-2 border-white/10">
                                {postDetails.comments.map(comm => (
                                  <div key={comm.id} className="text-[11px] group/comment">
                                    <p className="text-slate-400 font-black mb-1 group-hover/comment:text-slate-300 transition-colors">
                                      u/{comm.authorName} · <span className={comm.score >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{comm.score} pts</span>
                                    </p>
                                    <p className="text-slate-300 leading-normal">{comm.body}</p>
                                  </div>
                                ))}
                                {postDetails.comments.length === 0 && <p className="text-[11px] text-slate-500 italic">No comments yet</p>}
                              </div>
                           </div>
                        </div>
                      )}

                      <div className="rounded-[1.25rem] bg-emerald-500/10 p-5 border border-emerald-500/20 ring-1 ring-emerald-500/20">
                         <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                           <ShieldAlert className="h-4 w-4" />
                           Moderator Action Guidance
                         </h4>
                         <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                           Review this item against the subreddit rules. Locking ensures no other moderator takes conflicting actions while you review.
                         </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 border-t border-white/10 pt-5">
                  <button 
                    disabled={actionPending}
                    onClick={() => takeAction('approve')}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
                  >
                    <ThumbsUp className="h-4 w-4" /> Approve
                  </button>
                  <button 
                    disabled={actionPending}
                    onClick={() => takeAction('remove')}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-rose-500 transition-all hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                  <button 
                    disabled={actionPending}
                    onClick={() => takeAction('spam')}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-700 transition-all disabled:opacity-50"
                  >
                    <ShieldAlert className="h-4 w-4" /> Spam
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="grid h-20 w-20 place-items-center rounded-[1.75rem] bg-white/5 text-white/10 ring-1 ring-white/10">
                  {activeTab === 'graph' ? <ChartBar className="h-10 w-10" /> : <MessageSquare className="h-10 w-10" />}
                </div>
                <h3 className="mt-6 text-xl font-black">
                  {activeTab === 'graph' ? 'Activity Overview' : 'Select a report'}
                </h3>
                <p className="mt-2 max-w-[240px] text-sm text-slate-400">
                  {activeTab === 'graph' 
                    ? 'Visualizing moderation trends and queue health.'
                    : 'Click an item from the queue list to see full details and take action.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis Progress Modal */}
      {isAnalysing && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in">
           <div className="bg-[#11141b] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl text-center space-y-8 ring-1 ring-white/10">
              <div className="relative mx-auto h-24 w-24">
                 <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                 <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle
                      className="text-orange-500 transition-all duration-500"
                      strokeWidth="4"
                      strokeDasharray={2 * Math.PI * 45}
                      strokeDashoffset={2 * Math.PI * 45 * (1 - analysisProgress / 100)}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="45"
                      cx="50"
                      cy="50"
                      style={{ transform: 'translate(0px, 0px)' }}
                    />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="h-8 w-8 text-orange-500 animate-pulse" />
                 </div>
              </div>
              
              <div>
                 <h3 className="text-xl font-black tracking-tight text-white uppercase text-center">Analysing Queue</h3>
                 <p className="mt-2 text-sm text-white/40 font-medium italic text-center">Running AI Semantic Scan...</p>
              </div>

              <div className="space-y-3">
                 <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/30 px-1">
                    <span>Progress</span>
                    <span>{analysisProgress}%</span>
                 </div>
                 <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-500" 
                      style={{ width: `${analysisProgress}%` }}
                    />
                 </div>
              </div>
              
              <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-emerald-400/70">
                 <Loader2 className="h-3 w-3 animate-spin" />
                 Processing Logic
              </div>
           </div>
        </div>
      )}
    </section>
  );
}
