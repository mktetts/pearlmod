import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Lock,
  MessageSquare,
  MessageSquareText,
  Trash2,
  UserRound,
  UserX,
  X,
  Loader2,
  Unlock,
  ThumbsUp,
  ShieldAlert,
  Inbox,
  AlertCircle,
  ExternalLink,
  Zap,
  Sparkles,
  Tag,
  Ban
} from 'lucide-react'
import { classify } from '../../core/analysis'
import type { DashboardData, ModQueueItem, PostDetails, ModLogEntry, CommentData, FlairTemplateData, BannedUser } from '../../../shared/api'

type QueueTab = 'modQueue' | 'myQueue' | 'solvedByMe' | 'flairs' | 'banned'
type ModerationActionType = 'approve' | 'remove' | 'spam'
type CasePriority = 'Low' | 'Medium' | 'High' | 'Urgent'

const tabs: { id: QueueTab; label: string; icon: any }[] = [
  { id: 'modQueue', label: 'Mod Queue', icon: MessageSquare },
  { id: 'myQueue', label: 'My queue', icon: UserRound },
  { id: 'solvedByMe', label: 'Solved by me', icon: CheckCircle2 },
  { id: 'flairs', label: 'Flairs', icon: Tag },
  { id: 'banned', label: 'Banned', icon: Ban },
]

type QueuePageProps = {
  dashboardData: DashboardData | null
  username: string
}

function QueuePage({ dashboardData, username }: QueuePageProps) {
  const [activeTab, setActiveTab] = useState<QueueTab>('modQueue')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false))
  
  const [postDetails, setPostDetails] = useState<PostDetails | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [actionPending, setActionActionPending] = useState(false)
  const [localLocks, setLocalLocks] = useState<Record<string, string>>({})
  const [successAction, setSuccessAction] = useState<string | null>(null)

  // AI Analysis state
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)

  // Local state for items and log to enable optimistic updates
  const [localItems, setLocalItems] = useState<ModQueueItem[]>([])
  const [localModLog, setLocalModLog] = useState<ModLogEntry[]>([])

  // Flair state
  const [localPostFlairs, setLocalPostFlairs] = useState<FlairTemplateData[]>([])
  const [localUserFlairs, setLocalUserFlairs] = useState<FlairTemplateData[]>([])
  const [isFlairModalOpen, setIsFlairModalOpen] = useState(false)
  const [newFlair, setNewFlair] = useState<Partial<FlairTemplateData>>({ type: 'post', textColor: 'dark', modOnly: true, backgroundColor: 'transparent' })

  // Ban state
  const [localBannedUsers, setLocalBannedUsers] = useState<BannedUser[]>([])
  const [isBanModalOpen, setIsBanModalOpen] = useState(false)
  const [banData, setBanContext] = useState<{ username: string; reason: string; note: string; message: string; duration: number; context?: string }>({
    username: '',
    reason: '',
    note: '',
    message: '',
    duration: 0
  })

  // Moderation Modal state
  const [modModal, setModModal] = useState<{ isOpen: boolean; type: ModerationActionType | null }>({
    isOpen: false,
    type: null
  })
  const [modReason, setModReason] = useState('')
  const [selectedFlairId, setSelectedFlairId] = useState<string | null>(null)
  const [selectedFlairType, setSelectedFlairType] = useState<'post' | 'user' | null>(null)

  // Case Modal state
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false)
  const [casePriority, setCasePriority] = useState<CasePriority>('High')
  const [caseAssignee, setCaseAssignee] = useState('u/mod_team')
  const [caseSummary, setCaseSummary] = useState('')
  const [caseDescription, setCaseDescription] = useState('')

  // Initialize and sync local state
  useEffect(() => {
    if (dashboardData?.modQueue) setLocalItems(dashboardData.modQueue)
    if (dashboardData?.modLog) setLocalModLog(dashboardData.modLog)
    if (dashboardData?.postFlairs) setLocalPostFlairs(dashboardData.postFlairs)
    if (dashboardData?.userFlairs) setLocalUserFlairs(dashboardData.userFlairs)
    if (dashboardData?.bannedUsers) setLocalBannedUsers(dashboardData.bannedUsers)
  }, [dashboardData])

  const getLockedBy = (item: ModQueueItem) => {
    return localLocks[item.id] || item.isLockedBy
  }

  const visibleItems = useMemo(() => {
    if (activeTab === 'myQueue') {
      return localItems.filter(item => getLockedBy(item) === username)
    }
    return localItems
  }, [localItems, activeTab, localLocks, username])

  const mySolvedLog = useMemo(() => {
    return localModLog.filter(log => {
      return log.moderatorName?.toLowerCase() === username?.toLowerCase()
    })
  }, [localModLog, username])

  const selectedItem = useMemo(() => {
    return localItems.find((item) => item.id === selectedId) || (visibleItems.length > 0 ? visibleItems[0] : null)
  }, [localItems, selectedId, visibleItems])

  useEffect(() => {
    if (selectedItem?.id && activeTab !== 'solvedByMe' && activeTab !== 'flairs') {
      fetchDetails(selectedItem.id)
      setSuccessAction(null)
    } else {
      setPostDetails(null)
    }
  }, [selectedItem?.id, activeTab])

  useEffect(() => {
    const onResize = () => {
      const nextIsMobile = window.innerWidth < 1024
      setIsMobile(nextIsMobile)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const fetchDetails = async (itemId: string) => {
    setIsLoadingDetails(true)
    try {
      const res = await fetch(`/api/post-details/${itemId}`)
      if (res.ok) {
        const data = await res.json()
        setPostDetails(data)
      }
    } catch (err) {
      console.error('Failed to fetch post details', err)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const toggleLock = async (itemId: string, isCurrentlyLocked: boolean) => {
    try {
      const res = await fetch('/api/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, unlock: isCurrentlyLocked }),
      })
      if (res.ok) {
        setLocalLocks((prev) => {
          const next = { ...prev }
          if (isCurrentlyLocked) delete next[itemId]
          else next[itemId] = username
          return next
        })
      }
    } catch (err) {
      console.error('Failed to toggle lock', err)
    }
  }

  const performModerationAction = async () => {
    if (!selectedItem?.id || !modModal.type) return
    const itemId = selectedItem.id
    const actionType = modModal.type
    
    setActionActionPending(true)
    try {
      const res = await fetch('/api/moderation-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itemId: itemId, 
          action: actionType, 
          reason: modReason.trim() || undefined,
          assignFlairId: selectedFlairId || undefined,
          assignFlairType: selectedFlairType || undefined
        }),
      })
      if (res.ok) {
        setSuccessAction(itemId)
        
        setTimeout(() => {
          const newLogEntry: ModLogEntry = {
            id: `local_${Date.now()}`,
            type: actionType,
            moderatorName: username,
            createdAt: new Date().toISOString(),
            targetTitle: selectedItem.title || selectedItem.body.substring(0, 50),
            targetAuthor: selectedItem.authorName
          }
          setLocalModLog(prev => [newLogEntry, ...prev])
          setLocalItems(prev => prev.filter(i => i.id !== itemId))
          
          setModModal({ isOpen: false, type: null })
          setModReason('')
          setSelectedFlairId(null)
          setSelectedFlairType(null)
          setSelectedId(null)
          setSuccessAction(null)
        }, 800)
      }
    } catch (err) {
      console.error(`Failed to perform ${modModal.type}`, err)
      setActionActionPending(false)
    }
  }

  const openCaseModal = () => {
    if (!selectedItem) return
    setCasePriority('High')
    setCaseAssignee(username)
    setCaseSummary(`Report: ${selectedItem.title || 'Comment'}`)
    setCaseDescription(selectedItem.body)
    setIsCaseModalOpen(true)
  }

  const createEscalationCase = async () => {
    if (!selectedItem) return
    setActionActionPending(true)
    try {
      const res = await fetch('/api/create-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItem.id,
          title: caseSummary,
          description: caseDescription,
          priority: casePriority,
          assignee: caseAssignee,
        }),
      })
      if (res.ok) {
        setIsCaseModalOpen(false)
        setSuccessAction(selectedItem.id)
        setTimeout(() => {
          setLocalItems(prev => prev.filter(i => i.id !== selectedItem.id))
          setSelectedId(null)
          setSuccessAction(null)
        }, 800)
      }
    } catch (err) {
      console.error('Failed to create case', err)
    } finally {
      setActionActionPending(false)
    }
  }

  const handleCreateFlair = async () => {
    if (!newFlair.text) return;
    setActionActionPending(true);
    try {
      const res = await fetch('/api/flair-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFlair),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.flair.type === 'post') {
          setLocalPostFlairs(prev => [...prev, data.flair]);
        } else {
          setLocalUserFlairs(prev => [...prev, data.flair]);
        }
        setIsFlairModalOpen(false);
        setNewFlair({ type: 'post', textColor: 'dark', modOnly: true, backgroundColor: 'transparent' });
      }
    } catch (err) {
      console.error('Failed to create flair', err);
    } finally {
      setActionActionPending(false);
    }
  };

  const handleDeleteFlair = async (id: string, type: 'post' | 'user') => {
    try {
      const res = await fetch('/api/delete-flair-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        if (type === 'post') {
          setLocalPostFlairs(prev => prev.filter(f => f.id !== id));
        } else {
          setLocalUserFlairs(prev => prev.filter(f => f.id !== id));
        }
      }
    } catch (err) {
      console.error('Failed to delete flair', err);
    }
  };

  const handleBanUser = async () => {
    if (!banData.username || !banData.reason) return;
    setActionActionPending(true);
    try {
      const res = await fetch('/api/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(banData),
      });
      const data = await res.json();
      if (res.ok) {
        // Optimistically add to list
        setLocalBannedUsers(prev => [{
          id: `local_${Date.now()}`,
          username: banData.username,
          date: new Date().toISOString(),
          reason: banData.reason,
          note: banData.note,
          daysLeft: banData.duration === 0 ? undefined : banData.duration
        }, ...prev]);
        setIsBanModalOpen(false);
        setBanContext({ username: '', reason: '', note: '', message: '', duration: 0 });
        alert(`Successfully banned u/${banData.username}`);
      } else {
        alert(`Failed to ban user: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to ban user', err);
      alert('Network error while banning user');
    } finally {
      setActionActionPending(false);
    }
  };

  const handleUnbanUser = async (username: string) => {
    try {
      const res = await fetch('/api/unban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        setLocalBannedUsers(prev => prev.filter(b => b.username !== username));
      }
    } catch (err) {
      console.error('Failed to unban user', err);
    }
  };

  const runAutoAnalyse = async () => {
    const lockedItems = localItems.filter(item => getLockedBy(item) === username);
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
        <mark key={i} className="bg-orange-500/40 text-white rounded px-1 border-b-2 border-orange-500 font-bold decoration-clone">
          {part}
        </mark>
      ) : part
    );
  };

  const renderFlairTab = () => (
    <div className="p-4 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Flair Templates</h3>
        <button
          onClick={() => setIsFlairModalOpen(true)}
          className="bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          <Tag className="h-4 w-4" /> Create Flair
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Post Flairs */}
        <div className="bg-black/20 rounded-3xl p-5 border border-white/5">
          <h4 className="text-sm font-black uppercase tracking-widest text-white/50 mb-4 border-b border-white/10 pb-2">Post Flairs</h4>
          <div className="space-y-3">
            {localPostFlairs.length === 0 ? (
              <p className="text-white/30 text-xs italic">No post flairs created.</p>
            ) : (
              localPostFlairs.map(f => (
                <div 
                  key={f.id} 
                  onClick={() => setSelectedId(f.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${selectedId === f.id ? 'bg-sky-500/10 border-sky-500/50' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                >
                  <div className="flex flex-col gap-1">
                    <span 
                      className="px-2 py-1 rounded text-xs font-bold w-fit" 
                      style={{ backgroundColor: f.backgroundColor || 'transparent', color: f.textColor === 'light' ? '#fff' : '#000' }}
                    >
                      {f.text}
                    </span>
                    {f.modOnly && <span className="text-[10px] text-amber-500 uppercase font-black tracking-wider">Mod Only</span>}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteFlair(f.id, 'post'); }} 
                    className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* User Flairs */}
        <div className="bg-black/20 rounded-3xl p-5 border border-white/5">
          <h4 className="text-sm font-black uppercase tracking-widest text-white/50 mb-4 border-b border-white/10 pb-2">User Flairs</h4>
          <div className="space-y-3">
            {localUserFlairs.length === 0 ? (
              <p className="text-white/30 text-xs italic">No user flairs created.</p>
            ) : (
              localUserFlairs.map(f => (
                <div 
                  key={f.id} 
                  onClick={() => setSelectedId(f.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${selectedId === f.id ? 'bg-sky-500/10 border-sky-500/50' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                >
                  <div className="flex flex-col gap-1">
                    <span 
                      className="px-2 py-1 rounded text-xs font-bold w-fit" 
                      style={{ backgroundColor: f.backgroundColor || 'transparent', color: f.textColor === 'light' ? '#fff' : '#000' }}
                    >
                      {f.text}
                    </span>
                    {f.modOnly && <span className="text-[10px] text-amber-500 uppercase font-black tracking-wider">Mod Only</span>}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteFlair(f.id, 'user'); }} 
                    className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBannedTab = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white italic">Banned Users</h3>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500">
           {localBannedUsers.length} active bans
        </div>
      </div>
      
      <div className="space-y-3">
        {localBannedUsers.length === 0 ? (
          <div className="p-12 text-center text-white/20 italic">No users currently banned.</div>
        ) : (
          localBannedUsers.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              className={[
                'w-full rounded-2xl border px-5 py-4 text-left transition relative overflow-hidden',
                selectedId === b.id ? 'border-rose-500/40 bg-rose-500/10 shadow-[0_0_0_1px_rgba(244,63,94,0.2)]' : 'border-white/10 bg-white/5 hover:bg-white/10'
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <UserX className="h-3.5 w-3.5 text-rose-500" />
                    <span className="text-sm font-black text-white">u/{b.username}</span>
                    <span className="text-[10px] text-white/20">•</span>
                    <span className="text-[10px] text-white/40 uppercase font-black tracking-tighter">
                      {b.daysLeft === undefined || b.daysLeft === 0 ? 'Permanent' : `${b.daysLeft}d left`}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 font-medium truncate max-w-xs">{b.reason}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleUnbanUser(b.username); }}
                  className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Unban
                </button>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="flex min-h-0 flex-col rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.18)] sm:p-5">
        <div className="flex-none flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">Mod Queue Assistant</p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">Inbox</h3>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'myQueue' && localItems.filter(item => getLockedBy(item) === username).length > 0 && (
              <button
                onClick={runAutoAnalyse}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-400 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-900/20 transition-all hover:scale-105 active:scale-95"
              >
                <Zap className="h-3.5 w-3.5 fill-current" />
                Auto Analyse
              </button>
            )}            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60">
              {activeTab === 'solvedByMe' ? mySolvedLog.length : activeTab === 'flairs' ? localPostFlairs.length + localUserFlairs.length : visibleItems.length} items
            </div>
          </div>
        </div>

        <div className="mt-5 flex-none border-b border-white/10">
          <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveTab(tab.id); setSelectedId(null); }}
                  className={[
                    'relative -mb-px inline-flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition',
                    isActive ? 'text-[#3b82f6] after:absolute after:inset-x-0 after:-bottom-[1px] after:h-0.5 after:rounded-full after:bg-[#3b82f6]' : 'text-white/55 hover:text-white',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 rounded-[1.75rem] border border-white/10 bg-black/20 p-2 overflow-hidden">
          {activeTab === 'flairs' ? (
            <div className="flex-1 overflow-y-auto">{renderFlairTab()}</div>
          ) : activeTab === 'banned' ? (
            <div className="flex-1 overflow-y-auto">{renderBannedTab()}</div>
          ) : (
            <div className="hide-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">

            {activeTab === 'solvedByMe' ? (
              mySolvedLog.length === 0 ? (
                <div className="p-8 text-center text-white/30 text-sm italic">No recent actions recorded.</div>
              ) : (
                mySolvedLog.map(log => (
                  <div key={log.id} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left">
                    <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/40">
                      <span className={log.type.includes('approve') ? 'text-emerald-400' : 'text-rose-400'}>{log.type}</span>
                      <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white truncate">{log.targetTitle || 'Moderation Action'}</p>
                    {log.targetAuthor && <p className="mt-1 text-xs text-white/30">u/{log.targetAuthor}</p>}
                  </div>
                ))
              )
            ) : (
              visibleItems.length === 0 ? (
                <div className="p-8 text-center text-white/30 text-sm italic">
                  {activeTab === 'myQueue' ? 'No items locked by you.' : 'Queue is clear! 🎉'}
                </div>
              ) : (
                visibleItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id
                  const isResolved = successAction === item.id
                  const lockedBy = getLockedBy(item)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setSelectedId(item.id); }}
                      className={[
                        'w-full rounded-2xl border px-4 py-4 text-left transition relative overflow-hidden',
                        isSelected ? 'border-[#ff7a18]/40 bg-[#ff4500]/12 shadow-[0_0_0_1px_rgba(255,122,24,0.2)]' : 'border-white/10 bg-white/5 hover:bg-white/10',
                        isResolved ? 'opacity-50 grayscale scale-[0.98]' : ''
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/38">
                            <span>{item.numReports} Item Reports</span>
                            {item.authorReportCount !== undefined && (
                              <>
                                <span className="text-white/20">•</span>
                                <span className="text-rose-400/60 font-black">{item.authorReportCount} User Reports</span>
                              </>
                            )}
                            {lockedBy && (
                              <>
                                <span className="text-white/20">•</span>
                                <span className="text-amber-400 flex items-center gap-1"><Lock className="h-3 w-3" /> {lockedBy === username ? 'You' : lockedBy}</span>
                              </>
                            )}
                          </div>
                          <p className="mt-2 truncate text-sm font-semibold text-white">
                            {item.title || item.body}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
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
                           {isResolved ? (
                             <div className="bg-emerald-500 rounded-full p-1 animate-in zoom-in">
                               <Check className="h-4 w-4 text-white" />
                             </div>
                           ) : (
                             <ChevronRight className="mt-1 h-4 w-4 flex-none text-white/35" />
                           )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-white/40">
                        <span>By u/{item.authorName}</span>
                        <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </button>
                  )
                })
              )
            )}
            </div>
          )}
        </div>
      </section>

      <section className="hidden min-h-0 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.18)] sm:p-5 lg:block overflow-hidden flex flex-col">
        {selectedItem && activeTab !== 'solvedByMe' ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.28em] text-white/40">Report content</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-white truncate">
                  {selectedItem.title || 'Comment report'}
                </h3>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <UserRound className="h-3 w-3" /> u/{selectedItem.authorName}
                  </span>
                  {selectedItem.authorReportCount !== undefined && (
                    <span className="flex items-center gap-1 text-rose-400 font-bold">
                      <ShieldAlert className="h-3 w-3" /> {selectedItem.authorReportCount} User Reports
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock3 className="h-3 w-3" /> {new Date(selectedItem.createdAt).toLocaleString()}
                  </span>
                  <button
                    onClick={() => navigateTo(`https://reddit.com${selectedItem.permalink}`)}
                    className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" /> View on Reddit
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 flex-none">
                <button
                  onClick={() => toggleLock(selectedItem.id, !!getLockedBy(selectedItem))}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${getLockedBy(selectedItem) ? 'bg-amber-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  {getLockedBy(selectedItem) ? <><Lock className="h-3 w-3" /> Locked</> : <><Unlock className="h-3 w-3" /> Lock</>}
                </button>
                
                {successAction === selectedItem.id ? (
                  <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold animate-in fade-in zoom-in">
                    <CheckCircle2 className="h-4 w-4" /> Action Performed
                  </div>
                ) : (
                  <>
                    <button onClick={() => setModModal({ isOpen: true, type: 'approve' })} className="bg-emerald-500 hover:bg-emerald-400 p-2.5 rounded-full text-white transition shadow-lg shadow-emerald-500/20"><Check className="h-4.5 w-4.5" /></button>
                    <button onClick={() => setModModal({ isOpen: true, type: 'remove' })} className="bg-rose-500 hover:bg-rose-400 p-2.5 rounded-full text-white transition shadow-lg shadow-rose-500/20"><Trash2 className="h-4.5 w-4.5" /></button>
                    <button 
                      onClick={() => {
                        setBanContext({ username: selectedItem.authorName, reason: '', note: '', message: '', duration: 0, context: selectedItem.id });
                        setIsBanModalOpen(true);
                      }} 
                      className="bg-black border border-white/10 hover:bg-white/5 p-2.5 rounded-full text-rose-500 transition shadow-lg shadow-rose-900/20"
                    >
                      <Ban className="h-4.5 w-4.5" />
                    </button>
                    <button onClick={openCaseModal} className="bg-sky-500 hover:bg-sky-400 p-2.5 rounded-full text-white transition shadow-lg shadow-sky-500/20"><AlertTriangle className="h-4.5 w-4.5" /></button>
                  </>
                )}
              </div>
            </div>

            <div className="hide-scrollbar flex-1 overflow-y-auto pr-1">
              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                   <div className="flex flex-wrap gap-2">
                      {selectedItem.userReportReasons.concat(selectedItem.modReportReasons).map((r, i) => (
                        <span key={i} className="bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded border border-rose-500/20 text-[10px]">{r}</span>
                      ))}
                   </div>
                   {selectedItem.aiCategory && (
                      <div className="flex items-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 shadow-inner">
                         <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                         <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white">AI Verdict: <span className="text-orange-400">{selectedItem.aiCategory}</span> ({Math.round(selectedItem.aiScore! * 100)}%)</span>
                      </div>
                   )}
                </div>

                {isLoadingDetails ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    <p className="text-xs text-white/30 tracking-widest uppercase">Fetching conversation tree...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-sm leading-7 text-white/80 whitespace-pre-wrap font-medium bg-white/5 rounded-2xl p-4 border border-white/5 mb-6">
                       {selectedItem.aiEvidence 
                         ? highlightText(selectedItem.body || selectedItem.title || '', selectedItem.aiEvidence)
                         : (selectedItem.body || selectedItem.title)}
                    </div>
                    {postDetails && (
                      <div className="mt-8 border-t border-white/10 pt-6">
                        <div className="flex items-center gap-2 mb-5 text-[#ff9c75]">
                          <MessageSquareText className="h-4 w-4" />
                          <h4 className="text-sm font-semibold text-white tracking-tight">Full discussion context</h4>
                        </div>
                        <div className="space-y-4">
                           <div className="bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner">
                             <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] font-black bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded uppercase">OP</span>
                                <p className="text-xs font-bold text-white/80">{postDetails.title}</p>
                             </div>
                             <div className="space-y-4 pl-3 border-l-2 border-white/5 text-xs text-white/60">
                               {postDetails.comments.map(c => (
                                 <CommentNode key={c.id} comment={c} />
                               ))}
                               {postDetails.comments.length === 0 && <p className="italic text-xs text-white/30 text-center py-4">No comments found in this thread.</p>}
                             </div>
                           </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            {activeTab === 'flairs' ? (
              <div className="flex h-full flex-col">
                <p className="text-xs uppercase tracking-[0.28em] text-white/40 mb-4">Flair Analytics</p>
                <div className="flex-1 overflow-y-auto hide-scrollbar space-y-6">
                  {selectedId && [...localPostFlairs, ...localUserFlairs].find(f => f.id === selectedId) ? (
                    (() => {
                      const f = [...localPostFlairs, ...localUserFlairs].find(f => f.id === selectedId)!;
                      const count = dashboardData?.flairStats?.[f.id] || 0;
                      return (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                          <div className="bg-black/20 rounded-[2rem] border border-white/5 p-8 text-center">
                             <div className="inline-block px-4 py-2 rounded-lg text-lg font-black shadow-2xl mb-4" style={{ backgroundColor: f.backgroundColor || 'transparent', color: f.textColor === 'light' ? '#fff' : '#000' }}>
                                {f.text}
                             </div>
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{f.type} flair template</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                             <div className="bg-white/5 rounded-3xl p-6 border border-white/5 text-center">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Total Uses</h5>
                                <p className="text-3xl font-black text-white">{count}</p>
                             </div>
                             <div className="bg-white/5 rounded-3xl p-6 border border-white/5 text-center">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Status</h5>
                                <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Active</p>
                             </div>
                          </div>

                          <div className="bg-sky-500/5 rounded-3xl p-6 border border-sky-500/10">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-4 flex items-center gap-2">
                               <Sparkles className="h-3.5 w-3.5" /> Intelligence Insight
                             </h4>
                             <p className="text-xs text-white/60 leading-relaxed">
                               This flair is primarily used by moderators to categorize {f.type === 'post' ? 'community submissions' : 'user behavior signals'}. 
                               {count > 0 ? ` It has been applied ${count} times across the subreddit.` : ' It has not been applied to any content yet.'}
                             </p>
                          </div>
                          
                          <button 
                            onClick={() => setSelectedId(null)}
                            className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                          >
                            Back to Global Overview
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-6 animate-in fade-in">
                      <div className="bg-black/20 rounded-[2rem] border border-white/5 p-6">
                        <h4 className="text-xs font-black uppercase tracking-widest text-sky-400 mb-6 flex items-center gap-2">
                          <Zap className="h-3 w-3 fill-current" /> Global Usage Overview
                        </h4>
                        <div className="space-y-4">
                          {[...localPostFlairs, ...localUserFlairs]
                            .sort((a, b) => (dashboardData?.flairStats?.[b.id] || 0) - (dashboardData?.flairStats?.[a.id] || 0))
                            .map(f => {
                              const count = dashboardData?.flairStats?.[f.id] || 0;
                              return (
                                <div 
                                  key={f.id} 
                                  onClick={() => setSelectedId(f.id)}
                                  className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <span 
                                      className="px-2 py-1 rounded text-[10px] font-bold shadow-sm" 
                                      style={{ backgroundColor: f.backgroundColor || 'transparent', color: f.textColor === 'light' ? '#fff' : '#000' }}
                                    >
                                      {f.text}
                                    </span>
                                    <span className="text-[10px] text-white/20 uppercase font-bold tracking-tighter">{f.type}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-white">{count}</span>
                                    <span className="text-[9px] uppercase font-bold text-white/30 tracking-widest">uses</span>
                                  </div>
                                </div>
                              );
                            })}
                          {localPostFlairs.length === 0 && localUserFlairs.length === 0 && (
                            <p className="text-center text-white/20 text-xs italic py-10">No flairs created yet.</p>
                          )}
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-3xl p-8 border border-dashed border-white/10 text-center">
                        <Tag className="h-10 w-10 text-white/10 mx-auto mb-4" />
                        <h5 className="text-sm font-bold text-white/60 mb-2">Automated Attribution</h5>
                        <p className="text-xs text-white/30 leading-relaxed">
                          Usage counts are tracked every time a moderator assigns a flair via the Queue Assistant or Case Manager.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'banned' && selectedId ? (
              <div className="flex h-full flex-col">
                {(() => {
                  const bannedUser = localBannedUsers.find(b => b.id === selectedId);
                  if (!bannedUser) return null;
                  return (
                    <>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-4 rounded-[2rem] bg-rose-500/20 text-rose-500">
                           <UserX className="h-8 w-8" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-white">u/{bannedUser.username}</h3>
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                            Banned on {new Date(bannedUser.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6 overflow-y-auto hide-scrollbar flex-1 pr-1">
                        <div className="bg-black/20 rounded-3xl p-6 border border-white/5 shadow-inner">
                           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-3">Ban Reason</h4>
                           <p className="text-sm font-medium text-white/80 leading-relaxed italic">"{bannedUser.reason}"</p>
                        </div>

                        {bannedUser.note && (
                          <div className="bg-white/5 rounded-3xl p-6 border border-white/5 shadow-inner">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">Moderator Note</h4>
                            <p className="text-xs font-medium text-white/60 leading-relaxed">{bannedUser.note}</p>
                          </div>
                        )}

                        <div className="bg-white/5 rounded-3xl p-8 border border-dashed border-white/10 text-center">
                           <AlertCircle className="h-8 w-8 text-white/10 mx-auto mb-4" />
                           <h5 className="text-xs font-black uppercase tracking-widest text-white/30 mb-2">Duration</h5>
                           <p className="text-lg font-black text-white uppercase tracking-tighter">
                             {bannedUser.daysLeft === undefined || bannedUser.daysLeft === 0 ? 'Permanent Ban' : `${bannedUser.daysLeft} Days Remaining`}
                           </p>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleUnbanUser(bannedUser.username)}
                        className="mt-6 w-full py-4 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-[0.25em] hover:bg-emerald-600 hover:text-white transition-all shadow-xl shadow-emerald-900/10 flex items-center justify-center gap-2"
                      >
                         <Check className="h-4 w-4" /> Lift Ban Immediately
                      </button>
                    </>
                  )
                })()}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-black/10 text-sm text-white/30 p-8 text-center italic">
                {activeTab === 'solvedByMe' 
                  ? 'Select the Mod Queue or My Queue tabs to take moderation actions.' 
                  : activeTab === 'banned' 
                    ? 'Select a banned user from the list to view details.'
                    : 'Click an item from the inbox list to inspect its contents and perform actions.'}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Moderation Modal */}
      {modModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#11141b] border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl ring-1 ring-white/10 scale-in animate-in">
             <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-2xl ${modModal.type === 'approve' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {modModal.type === 'approve' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                </div>
                <h3 className="text-2xl font-black tracking-tight text-white">
                  Confirm {modModal.type === 'approve' ? 'Approval' : modModal.type === 'remove' ? 'Removal' : 'Spam Mark'}
                </h3>
             </div>
             
             <p className="text-white/60 text-sm mb-6 leading-relaxed">
               {modModal.type === 'approve' 
                 ? "This will approve the content and ignore all existing reports. Are you sure?"
                 : "This will remove the content from the subreddit. You can optionally provide a reason below."}
             </p>

             {modModal.type !== 'approve' && (
               <div className="mb-6">
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 ml-1">Removal Reason (Optional)</label>
                 <textarea 
                   value={modReason} 
                   onChange={e => setModReason(e.target.value)} 
                   className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-[#ff7a18]/50 transition-colors h-32 resize-none" 
                   placeholder="Briefly explain why this was removed..." 
                 />
               </div>
             )}

             {/* Flair Assignment Option */}
             <div className="mb-8 border-t border-white/10 pt-6">
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3 ml-1">Assign Flair (Optional)</label>
                 <div className="flex gap-4 mb-3">
                   <label className="flex items-center gap-2 text-xs text-white/70">
                     <input type="radio" checked={selectedFlairType === 'post'} onChange={() => { setSelectedFlairType('post'); setSelectedFlairId(null); }} className="accent-sky-500" />
                     Post Flair
                   </label>
                   <label className="flex items-center gap-2 text-xs text-white/70">
                     <input type="radio" checked={selectedFlairType === 'user'} onChange={() => { setSelectedFlairType('user'); setSelectedFlairId(null); }} className="accent-sky-500" />
                     User Flair (u/{selectedItem?.authorName})
                   </label>
                   {selectedFlairType && (
                     <button onClick={() => { setSelectedFlairType(null); setSelectedFlairId(null); }} className="text-[10px] text-rose-400 uppercase tracking-wider ml-auto font-bold">Clear</button>
                   )}
                 </div>
                 
                 {selectedFlairType === 'post' && localPostFlairs.length > 0 && (
                   <select value={selectedFlairId || ''} onChange={e => setSelectedFlairId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-sky-500/50">
                     <option value="">-- Select Post Flair --</option>
                     {localPostFlairs.map(f => <option key={f.id} value={f.id}>{f.text}</option>)}
                   </select>
                 )}
                 {selectedFlairType === 'user' && localUserFlairs.length > 0 && (
                   <select value={selectedFlairId || ''} onChange={e => setSelectedFlairId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-sky-500/50">
                     <option value="">-- Select User Flair --</option>
                     {localUserFlairs.map(f => <option key={f.id} value={f.id}>{f.text}</option>)}
                   </select>
                 )}
                 {selectedFlairType && (selectedFlairType === 'post' ? localPostFlairs.length === 0 : localUserFlairs.length === 0) && (
                   <p className="text-[10px] text-amber-500 italic mt-2">No flairs of this type exist. Create one in the Flairs tab.</p>
                 )}
             </div>

             <div className="flex flex-col gap-3">
               <button 
                 disabled={actionPending}
                 onClick={performModerationAction} 
                 className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                   modModal.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                 } text-white shadow-xl flex items-center justify-center gap-2`}
               >
                 {actionPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Action'}
               </button>
               <button 
                 disabled={actionPending}
                 onClick={() => { setModModal({ isOpen: false, type: null }); setSelectedFlairType(null); setSelectedFlairId(null); }} 
                 className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
               >
                 Cancel
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Escalation Case Modal */}
      {isCaseModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#11141b] border border-white/10 w-full max-w-2xl overflow-hidden rounded-[2.5rem] shadow-2xl ring-1 ring-white/10 scale-in animate-in">
            <div className="border-b border-white/10 bg-white/5 px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400">Jira escalation</p>
                  <h3 className="mt-1 text-2xl font-black tracking-tight text-white">Create escalation ticket</h3>
                  <p className="mt-2 text-sm text-white/50 leading-relaxed">
                    Assign this report as a tracked case for dedicated moderator follow-up.
                  </p>
                </div>
                <button
                  onClick={() => setIsCaseModalOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Assignee</label>
                    <select
                      value={caseAssignee}
                      onChange={(e) => setCaseAssignee(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none focus:border-sky-500/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="u/mod_team">u/mod_team</option>
                      {dashboardData?.moderators.map(m => (
                        <option key={m.username} value={`u/${m.username}`}>u/${m.username}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Priority</label>
                    <div className="flex bg-black/40 rounded-2xl p-1 border border-white/10">
                      {(['Low', 'Medium', 'High', 'Urgent'] as CasePriority[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => setCasePriority(p)}
                          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                            casePriority === p 
                              ? 'bg-sky-500 text-white shadow-lg' 
                              : 'text-white/40 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Summary</label>
                  <input
                    value={caseSummary}
                    onChange={(e) => setCaseSummary(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none focus:border-sky-500/50 transition-all"
                    placeholder="Brief case headline..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Detailed Description</label>
                  <textarea
                    value={caseDescription}
                    onChange={(e) => setCaseDescription(e.target.value)}
                    className="w-full min-h-32 rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm leading-relaxed text-white outline-none focus:border-sky-500/50 transition-all resize-none"
                    placeholder="Provide full context, evidence, and required actions..."
                  />
                </div>
            </div>

            <div className="bg-white/5 px-6 py-6 sm:px-8 border-t border-white/10 flex flex-col sm:flex-row gap-3">
              <button
                disabled={actionPending}
                onClick={createEscalationCase}
                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-sky-900/20 flex items-center justify-center gap-2"
              >
                {actionPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Case Ticket'}
              </button>
              <button
                onClick={() => setIsCaseModalOpen(false)}
                className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

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
                      cy="100"
                      style={{ transform: 'translate(0px, -50px)' }}
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

      {/* Create Flair Modal */}
      {isFlairModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#11141b] border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl ring-1 ring-white/10 scale-in animate-in">
             <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-400">
                  <Tag className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-white">
                  Create Flair
                </h3>
             </div>
             
             <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 ml-1">Live Preview</label>
                  <div className="bg-black/40 border border-white/10 rounded-xl p-6 flex items-center justify-center min-h-[80px]">
                    {newFlair.text ? (
                      <span 
                        className="px-3 py-1.5 rounded-md text-sm font-bold shadow-sm" 
                        style={{ backgroundColor: newFlair.backgroundColor || 'transparent', color: newFlair.textColor === 'light' ? '#ffffff' : '#000000' }}
                      >
                        {newFlair.text}
                      </span>
                    ) : (
                      <span className="text-white/20 italic text-xs">Start typing...</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 ml-1">Type</label>
                  <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
                    <button onClick={() => setNewFlair({ ...newFlair, type: 'post' })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newFlair.type === 'post' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>Post Flair</button>
                    <button onClick={() => setNewFlair({ ...newFlair, type: 'user' })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newFlair.type === 'user' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>User Flair</button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 ml-1">Text</label>
                  <input type="text" value={newFlair.text || ''} onChange={e => setNewFlair({ ...newFlair, text: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-sky-500/50 transition-colors" placeholder="e.g. Verified User, Mod Team" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 ml-1">Background Color</label>
                    <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-2 h-12">
                      <input 
                        type="color" 
                        value={newFlair.backgroundColor !== 'transparent' ? newFlair.backgroundColor : '#cccccc'} 
                        onChange={e => setNewFlair({ ...newFlair, backgroundColor: e.target.value })} 
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0" 
                      />
                      <input 
                        type="text" 
                        value={newFlair.backgroundColor} 
                        onChange={e => setNewFlair({ ...newFlair, backgroundColor: e.target.value })} 
                        className="w-full bg-transparent text-sm text-white outline-none font-mono uppercase" 
                        placeholder="#FF0000" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 ml-1">Text Color</label>
                    <select value={newFlair.textColor} onChange={e => setNewFlair({ ...newFlair, textColor: e.target.value as 'dark'|'light' })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 h-12 text-sm text-white outline-none focus:border-sky-500/50">
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer p-2 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/5 transition-colors">
                    <input type="checkbox" checked={newFlair.modOnly} onChange={e => setNewFlair({ ...newFlair, modOnly: e.target.checked })} className="accent-sky-500 w-4 h-4 rounded border-white/10 bg-black/40" />
                    <span className="font-medium">Mod Only (Private)</span>
                  </label>
                </div>
             </div>

             <div className="flex flex-col gap-3">
               <button 
                 disabled={actionPending || !newFlair.text}
                 onClick={handleCreateFlair} 
                 className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all bg-sky-600 hover:bg-sky-500 text-white shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-sky-600"
               >
                 {actionPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Flair'}
               </button>
               <button 
                 disabled={actionPending}
                 onClick={() => setIsFlairModalOpen(false)} 
                 className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
               >
                 Cancel
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Ban User Modal */}
      {isBanModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#0f1115] border border-white/10 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl ring-1 ring-white/10 scale-in animate-in">
             <div className="flex items-center gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-rose-500/20 text-rose-500">
                   <UserX className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-3xl font-black tracking-tighter text-white">Ban u/{banData.username}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Subreddit restriction</p>
                </div>
             </div>
             
             <div className="space-y-6 mb-8 overflow-y-auto max-h-[50vh] pr-2 hide-scrollbar">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-3 ml-1">Ban Reason (Must)</label>
                  <input 
                    type="text"
                    value={banData.reason} 
                    onChange={e => setBanContext({ ...banData, reason: e.target.value })} 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white outline-none focus:border-rose-500/50 transition-all font-medium" 
                    placeholder="Spam, Harassment, etc." 
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-3 ml-1">Duration (Days)</label>
                    <input 
                      type="number"
                      value={banData.duration} 
                      onChange={e => setBanContext({ ...banData, duration: parseInt(e.target.value) || 0 })} 
                      className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white outline-none focus:border-rose-500/50 transition-all font-mono" 
                      placeholder="0 for permanent" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-3 ml-1">Context Reference</label>
                    <div className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-xs text-white/40 font-mono truncate">
                       {banData.context || 'None'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-3 ml-1">Mod-Only Note</label>
                  <textarea 
                    value={banData.note} 
                    onChange={e => setBanContext({ ...banData, note: e.target.value })} 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white outline-none focus:border-rose-500/50 transition-all h-24 resize-none font-medium" 
                    placeholder="Visible to other moderators only..." 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-3 ml-1">Note to User</label>
                  <textarea 
                    value={banData.message} 
                    onChange={e => setBanContext({ ...banData, message: e.target.value })} 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white outline-none focus:border-rose-500/50 transition-all h-24 resize-none font-medium" 
                    placeholder="This will be sent to the user via Modmail..." 
                  />
                </div>
             </div>

             <div className="flex flex-col gap-4">
               <button 
                 disabled={actionPending || !banData.reason}
                 onClick={handleBanUser} 
                 className="w-full py-5 rounded-[1.25rem] text-[11px] font-black uppercase tracking-[0.25em] transition-all bg-rose-600 hover:bg-rose-500 text-white shadow-2xl shadow-rose-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
               >
                 {actionPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Subreddit Ban'}
               </button>
               <button 
                 disabled={actionPending}
                 onClick={() => setIsBanModalOpen(false)} 
                 className="w-full py-5 rounded-[1.25rem] text-[11px] font-black uppercase tracking-[0.25em] text-white/30 hover:text-white transition-colors"
               >
                 Cancel
               </button>
             </div>
          </div>
        </div>
      )}

    </div>
  )
}

function CommentNode({ comment, depth = 0 }: { comment: CommentData; depth?: number }) {
  return (
    <div className={`relative ${depth > 0 ? 'ml-4 mt-3 border-l-2 border-white/5 pl-4' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/30 mb-1">
            <span className="font-black text-orange-400/80">u/{comment.authorName}</span>
            <span>•</span>
            <span className={comment.score >= 0 ? 'text-emerald-500/50' : 'text-rose-500/50'}>{comment.score} pts</span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{comment.body}</p>
        </div>
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-1">
          {comment.replies.map(reply => (
            <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default QueuePage
