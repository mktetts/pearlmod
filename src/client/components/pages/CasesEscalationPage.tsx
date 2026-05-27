import { useEffect, useMemo, useState } from 'react'
import { navigateTo } from '@devvit/web/client'
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  MessageSquareText,
  X,
  Loader2,
  Inbox,
  AlertCircle,
  Calendar,
  UserRound,
  ExternalLink,
  Trash2,
  ShieldAlert,
  Search,
  Zap,
  Sparkles
} from 'lucide-react'
import type { DashboardData, EscalatedCase, CommentData } from '../../../shared/api'

type CaseTab = 'open' | 'resolved'

const tabs: { id: CaseTab; label: string; icon: any }[] = [
  { id: 'open', label: 'Open cases', icon: Inbox },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle2 },
]

type CasesEscalationPageProps = {
  dashboardData: DashboardData | null
  username: string
}

function CasesEscalationPage({ dashboardData, username }: CasesEscalationPageProps) {
  const [activeTab, setActiveTab] = useState<CaseTab>('open')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [localCases, setLocalCases] = useState<EscalatedCase[]>([])
  const [actionPending, setActionActionPending] = useState(false)
  const [successAction, setSuccessAction] = useState<string | null>(null)

  // AI Analysis state
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)

  // Flair state
  const [localPostFlairs, setLocalPostFlairs] = useState<any[]>([])
  const [localUserFlairs, setLocalUserFlairs] = useState<any[]>([])
  const [selectedFlairId, setSelectedFlairId] = useState<string | null>(null)
  const [selectedFlairType, setSelectedFlairType] = useState<'post' | 'user' | null>(null)

  // Ban state
  const [isBanModalOpen, setIsBanModalOpen] = useState(false)
  const [banData, setBanContext] = useState<{ username: string; reason: string; note: string; message: string; duration: number; context?: string }>({
    username: '',
    reason: '',
    note: '',
    message: '',
    duration: 0
  })

  // Moderation Modal state
  const [modModal, setModModal] = useState<{ isOpen: boolean; type: 'approve' | 'remove' | 'spam' | null }>({
    isOpen: false,
    type: null
  })
  const [modReason, setModReason] = useState('')

  useEffect(() => {
    if (dashboardData?.cases) {
      setLocalCases(dashboardData.cases)
    }
    if (dashboardData?.postFlairs) setLocalPostFlairs(dashboardData.postFlairs)
    if (dashboardData?.userFlairs) setLocalUserFlairs(dashboardData.userFlairs)
  }, [dashboardData])

  const visibleCases = useMemo(() => {
    if (activeTab === 'resolved') {
      return localCases.filter(c => c.status === 'Resolved' || c.status === 'Closed')
    }
    return localCases.filter(c => c.status === 'Open')
  }, [localCases, activeTab])

  const selectedCase = useMemo(() => {
    return localCases.find(c => c.id === selectedId) || (visibleCases.length > 0 ? visibleCases[0] : null)
  }, [localCases, selectedId, visibleCases])

  const performModerationAction = async () => {
    if (!selectedCase || !modModal.type) return
    setActionActionPending(true)
    try {
      const res = await fetch('/api/moderation-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itemId: selectedCase.itemId, 
          action: modModal.type, 
          reason: modReason.trim() || undefined,
          caseId: selectedCase.id,
          assignFlairId: selectedFlairId || undefined,
          assignFlairType: selectedFlairType || undefined
        }),
      })
      if (res.ok) {
        setSuccessAction(selectedCase.id)
        setTimeout(() => {
          setLocalCases(prev => prev.map(c => 
            c.id === selectedCase.id ? { ...c, status: 'Resolved' as const } : c
          ))
          setModModal({ isOpen: false, type: null })
          setModReason('')
          setSelectedFlairId(null)
          setSelectedFlairType(null)
          setSuccessAction(null)
          setSelectedId(null)
        }, 1000)
      }
    } catch (err) {
      console.error('Failed to resolve case via moderation', err)
    } finally {
      setActionActionPending(false)
    }
  }

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
        setIsBanModalOpen(false);
        setBanContext({ username: '', reason: '', note: '', message: '', duration: 0 });
        alert(`Successfully banned u/${banData.username}`);
      } else {
        alert(`Failed to ban user: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to ban user from cases', err);
      alert('Network error while banning user');
    } finally {
      setActionActionPending(false);
    }
  };

  const runAutoAnalyse = async () => {
    if (visibleCases.length === 0) return;

    setIsAnalysing(true);
    setAnalysisProgress(10);

    try {
      const itemIds = visibleCases.map(i => `case_${i.id}`);
      setAnalysisProgress(30);
      
      const res = await fetch('/api/auto-analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds }),
      });
      
      setAnalysisProgress(80);

      if (res.ok) {
        const data = await res.json();
        setLocalCases(prev => prev.map(c => {
          const analysis = data.results[`case_${c.id}`];
          if (analysis) {
            return {
              ...c,
              aiCategory: analysis.category,
              aiScore: analysis.score,
              aiEvidence: analysis.evidence,
            };
          }
          return c;
        }));
        setAnalysisProgress(100);
        setTimeout(() => setIsAnalysing(false), 500);
      }
    } catch (err) {
      console.error('Auto analysis failed for cases', err);
      setIsAnalysing(false);
    }
  };

  const highlightText = (text: string, evidence: string[] | undefined) => {
    if (!evidence || evidence.length === 0) return text;
    const regex = new RegExp(`(${evidence.join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-sky-500/40 text-white rounded px-1 border-b-2 border-sky-500 font-bold decoration-clone">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="flex min-h-0 flex-col rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.18)] sm:p-5 text-white">
        <div className="flex-none flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">Case Management</p>
            <h3 className="mt-1 text-xl font-black tracking-tight italic">Team Escalations</h3>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'open' && visibleCases.length > 0 && (
              <button
                onClick={runAutoAnalyse}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-sky-400 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-sky-900/20 transition-all hover:scale-105 active:scale-95"
              >
                <Zap className="h-3.5 w-3.5 fill-current" />
                Auto Analyse
              </button>
            )}
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-sky-400">
               Privacy Active
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
                    isActive ? 'text-sky-400 after:absolute after:inset-x-0 after:-bottom-[1px] after:h-0.5 after:rounded-full after:bg-sky-400' : 'text-white/55 hover:text-white',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {visibleCases.length > 0 && isActive && (
                    <span className="ml-1 rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] text-white">
                      {visibleCases.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 rounded-[1.75rem] border border-white/10 bg-black/20 p-2">
          <div className="hide-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {visibleCases.length === 0 ? (
              <div className="p-8 text-center text-white/20 text-sm italic py-20 flex flex-col items-center gap-4">
                 <Search className="h-8 w-8 opacity-20" />
                 No cases assigned to you.
              </div>
            ) : (
              visibleCases.map((c) => {
                const isSelected = selectedCase?.id === c.id
                const isResolved = successAction === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={[
                      'w-full rounded-2xl border px-5 py-4 text-left transition relative overflow-hidden',
                      isSelected ? 'border-sky-500/40 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.2)]' : 'border-white/10 bg-white/5 hover:bg-white/10',
                      isResolved ? 'opacity-50 grayscale scale-[0.98]' : ''
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.25em] font-black mb-2">
                          <span className={`${
                            c.priority === 'Urgent' ? 'text-rose-500' : 
                            c.priority === 'High' ? 'text-orange-500' : 
                            c.priority === 'Medium' ? 'text-amber-500' : 'text-emerald-500'
                          }`}>
                            {c.priority} Priority
                          </span>
                          {c.authorReportCount !== undefined && (
                            <>
                              <span className="text-white/10">•</span>
                              <span className="text-rose-400">{c.authorReportCount} User Reports</span>
                            </>
                          )}
                          <span className="text-white/10">•</span>
                          <span className="text-white/30 italic">From {c.createdBy}</span>
                        </div>
                        <p className="truncate text-sm font-bold text-white">
                          {c.title}
                        </p>
                      </div>
                      {isResolved ? (
                         <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-in zoom-in" />
                      ) : (
                         <ChevronRight className={`mt-1 h-4 w-4 flex-none text-white/20 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </section>

      <section className="hidden min-h-0 rounded-[2.5rem] border border-white/10 bg-black/20 p-5 lg:block overflow-hidden flex flex-col text-white ring-1 ring-white/5">
        {selectedCase ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                   <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                     selectedCase.status === 'Open' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                   }`}>
                     {selectedCase.status}
                   </span>
                   <span className="text-white/10 text-[9px] font-black uppercase tracking-widest">{selectedCase.id}</span>
                </div>
                <h3 className="text-xl font-black tracking-tight text-white leading-tight">
                  {selectedCase.title}
                </h3>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 flex-none">
                 {selectedCase.status === 'Open' && !successAction ? (
                   <>
                     <button onClick={() => setModModal({ isOpen: true, type: 'approve' })} className="bg-emerald-600 hover:bg-emerald-500 p-2.5 rounded-xl text-white transition-all shadow-lg shadow-emerald-900/20 ring-1 ring-white/10"><Check className="h-4 w-4" /></button>
                     <button onClick={() => setModModal({ isOpen: true, type: 'remove' })} className="bg-rose-600 hover:bg-rose-500 p-2.5 rounded-xl text-white transition-all shadow-lg shadow-rose-900/20 ring-1 ring-white/10"><Trash2 className="h-4 w-4" /></button>
                     <button 
                       onClick={() => {
                         setBanContext({ username: selectedCase.snapshot?.authorName || '', reason: '', note: '', message: '', duration: 0, context: selectedCase.itemId });
                         setIsBanModalOpen(true);
                       }} 
                       className="bg-black border border-white/10 hover:bg-white/5 p-2.5 rounded-xl text-rose-500 transition-all shadow-lg shadow-rose-900/20 ring-1 ring-white/10"
                     >
                       <Ban className="h-4 w-4" />
                     </button>
                     <button onClick={() => setModModal({ isOpen: true, type: 'spam' })} className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-white transition-all ring-1 ring-white/10"><ShieldAlert className="h-4 w-4" /></button>
                   </>
                 ) : successAction ? (
                    <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest animate-in fade-in zoom-in border border-emerald-500/30">
                      <CheckCircle2 className="h-4 w-4" /> Case Resolved
                    </div>
                 ) : null}
              </div>
            </div>

            <div className="hide-scrollbar flex-1 overflow-y-auto pr-1">
               <div className="rounded-[1.75rem] border border-white/5 bg-white/5 p-6 mb-6 shadow-inner">
                  <div className="flex items-center gap-2 mb-4 text-sky-400">
                     <FileText className="h-4 w-4" />
                     <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">Instruction</h4>
                  </div>
                  <p className="text-sm leading-8 text-white/70 whitespace-pre-wrap font-medium">
                     {selectedCase.description}
                  </p>
               </div>

               {selectedCase.snapshot && (
                  <div className="space-y-6">
                    <div className="border-t border-white/10 pt-6">
                        <div className="flex items-center gap-2 mb-5 text-[#ff9c75]">
                          <MessageSquareText className="h-4 w-4" />
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Full Snapshotted Context</h4>
                        </div>
                        <div className="bg-black/40 rounded-[2rem] p-6 border border-white/5 space-y-6">
                           <div className="pb-6 border-b border-white/5">
                             <div className="flex items-center gap-2 mb-3">
                                <span className="text-[9px] font-black bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded uppercase ring-1 ring-orange-500/20">OP</span>
                                <p className="text-xs font-black text-white/80">{selectedCase.snapshot.title}</p>
                             </div>
                             <p className="text-xs leading-7 text-white/50 whitespace-pre-wrap pl-11 font-medium">{selectedCase.snapshot.body}</p>
                           </div>

                           <div className="space-y-6">
                             {selectedCase.snapshot.comments.map(c => (
                               <CommentNode key={c.id} comment={c} />
                             ))}
                             {selectedCase.snapshot.comments.length === 0 && <p className="italic text-[10px] text-white/20 text-center py-4 uppercase tracking-widest font-black">No comments in snapshot</p>}
                           </div>
                        </div>
                    </div>
                  </div>
               )}
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
               <div className="flex items-center gap-4 text-[9px] text-white/30 font-black uppercase tracking-[0.2em]">
                  <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {new Date(selectedCase.createdAt).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 text-white/40"><UserRound className="h-3 w-3" /> Assigned To You</span>
               </div>
               <button 
                 onClick={() => navigateTo(`https://reddit.com/r/${selectedCase.subreddit}/comments/${selectedCase.itemId.replace('t3_', '')}`)}
                 className="text-sky-400 hover:text-sky-300 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group"
               >
                 <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                 Reddit Thread
               </button>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[2.5rem] border border-dashed border-white/10 bg-black/10 text-[11px] font-black uppercase tracking-[0.25em] text-white/20 p-12 text-center leading-relaxed">
            {activeTab === 'resolved' 
              ? 'Select a resolved case to review history.' 
              : 'Secure Workspace:\nSelect a case to begin review.'}
          </div>
        )}
      </section>

      {/* Moderation Confirmation Modal */}
      {modModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#0f1115] border border-white/10 w-full max-w-md rounded-[3rem] p-10 shadow-2xl ring-1 ring-white/10 scale-in animate-in">
             <div className="flex items-center gap-4 mb-8">
                <div className={`p-4 rounded-2xl ${modModal.type === 'approve' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                   {modModal.type === 'approve' ? <CheckCircle2 className="h-7 w-7" /> : <ShieldAlert className="h-7 w-7" />}
                </div>
                <h3 className="text-3xl font-black tracking-tighter text-white">
                  Confirm
                </h3>
             </div>
             
             <p className="text-white/50 text-sm mb-8 leading-relaxed font-medium">
               {modModal.type === 'approve' 
                 ? "You are about to approve this content and close this escalation ticket. This action is recorded."
                 : "This will remove the content and resolve this case. You can include a final closing note below."}
             </p>

             {modModal.type !== 'approve' && (
               <div className="mb-8">
                 <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-3 ml-1">Resolution Note</label>
                 <textarea 
                   value={modReason} 
                   onChange={e => setModReason(e.target.value)} 
                   className="w-full bg-black/40 border border-white/5 rounded-[1.5rem] p-5 text-sm text-white outline-none focus:border-sky-500/50 transition-all h-36 resize-none font-medium" 
                   placeholder="Add closing context..." 
                 />
               </div>
             )}

             {/* Flair Assignment Option */}
             <div className="mb-8 border-t border-white/10 pt-6">
                 <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-4 ml-1">Assign Flair (Optional)</label>
                 <div className="flex gap-4 mb-4">
                   <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                     <input type="radio" checked={selectedFlairType === 'post'} onChange={() => { setSelectedFlairType('post'); setSelectedFlairId(null); }} className="accent-sky-500 h-4 w-4" />
                     Post Flair
                   </label>
                   <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                     <input type="radio" checked={selectedFlairType === 'user'} onChange={() => { setSelectedFlairType('user'); setSelectedFlairId(null); }} className="accent-sky-500 h-4 w-4" />
                     User Flair
                   </label>
                   {selectedFlairType && (
                     <button onClick={() => { setSelectedFlairType(null); setSelectedFlairId(null); }} className="text-[10px] text-rose-400 uppercase tracking-widest ml-auto font-black">Clear</button>
                   )}
                 </div>
                 
                 {selectedFlairType === 'post' && localPostFlairs.length > 0 && (
                   <select value={selectedFlairId || ''} onChange={e => setSelectedFlairId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-sky-500/50 appearance-none cursor-pointer">
                     <option value="">-- Select Post Flair --</option>
                     {localPostFlairs.map(f => <option key={f.id} value={f.id}>{f.text}</option>)}
                   </select>
                 )}
                 {selectedFlairType === 'user' && localUserFlairs.length > 0 && (
                   <select value={selectedFlairId || ''} onChange={e => setSelectedFlairId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-sky-500/50 appearance-none cursor-pointer">
                     <option value="">-- Select User Flair --</option>
                     {localUserFlairs.map(f => <option key={f.id} value={f.id}>{f.text}</option>)}
                   </select>
                 )}
                 {selectedFlairType && (selectedFlairType === 'post' ? localPostFlairs.length === 0 : localUserFlairs.length === 0) && (
                   <p className="text-[10px] text-amber-500 italic mt-2 font-bold uppercase tracking-wider">No templates found. Create one in the Flairs tab.</p>
                 )}
             </div>

             <div className="flex flex-col gap-4">
               <button 
                 disabled={actionPending}
                 onClick={performModerationAction} 
                 className={`w-full py-5 rounded-[1.25rem] text-[11px] font-black uppercase tracking-[0.25em] transition-all shadow-2xl ${
                   modModal.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'
                 } text-white flex items-center justify-center gap-2`}
               >
                 {actionPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Finalize & Resolve'}
               </button>
               <button 
                 disabled={actionPending}
                 onClick={() => { setModModal({ isOpen: false, type: null }); setSelectedFlairType(null); setSelectedFlairId(null); }} 
                 className="w-full py-5 rounded-[1.25rem] text-[11px] font-black uppercase tracking-[0.25em] text-white/30 hover:text-white transition-colors"
               >
                 Back
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
                      className="text-sky-500 transition-all duration-500"
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
                    <Zap className="h-8 w-8 text-sky-500 animate-pulse" />
                 </div>
              </div>
              
              <div>
                 <h3 className="text-xl font-black tracking-tight text-white uppercase text-center">Analysing Cases</h3>
                 <p className="mt-2 text-sm text-white/40 font-medium italic text-center">Running AI Semantic Scan...</p>
              </div>

              <div className="space-y-3">
                 <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/30 px-1">
                    <span>Progress</span>
                    <span>{analysisProgress}%</span>
                 </div>
                 <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-500" 
                      style={{ width: `${analysisProgress}%` }}
                    />
                 </div>
              </div>
              
              <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-sky-400/70">
                 <Loader2 className="h-3 w-3 animate-spin" />
                 Processing Logic
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
                 onClick={() => { setIsBanModalOpen(false); setSelectedFlairType(null); setSelectedFlairId(null); }} 
                 className="w-full py-5 rounded-[1.25rem] text-[11px] font-black uppercase tracking-[0.25em] text-white/30 hover:text-white transition-colors"
               >
                 Back
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CommentNode({ comment, depth = 0 }: { comment: any; depth?: number }) {
  return (
    <div className={`relative ${depth > 0 ? 'ml-6 mt-4 border-l-2 border-white/5 pl-6' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">
            <span className="text-orange-400/60">u/{comment.authorName}</span>
            <span>•</span>
            <span className={comment.score >= 0 ? 'text-emerald-500/40' : 'text-rose-500/40'}>{comment.score} PTS</span>
          </div>
          <p className="text-[11px] text-white/50 leading-relaxed font-medium">{comment.body}</p>
        </div>
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-1">
          {comment.replies.map((reply: any) => (
            <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default CasesEscalationPage
