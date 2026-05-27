import { useState } from 'react';
import { 
  Plus, Shield, Trash2, MessageSquare, Tag, 
  Search, X, Save, AlertCircle, Loader2, Sparkles,
  ChevronRight, ArrowRight, UserPlus
} from 'lucide-react';
import type { DashboardData, AutoModRule, FlairTemplateData } from '../../../shared/api';

type AutomoderatorsPageProps = {
  dashboardData: DashboardData | null;
};

export default function AutomoderatorsPage({ dashboardData }: AutomoderatorsPageProps) {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newRule, setNewRule] = useState<Partial<AutoModRule>>({
    title: '',
    blacklist: [],
    flairId: '',
    tolerationLimit: 3,
  });
  const [blacklistInput, setBlacklistInput] = useState('');

  const rules = dashboardData?.autoModRules || [];
  const selectedRule = rules.find(r => r.id === selectedRuleId);
  const flairs = dashboardData?.postFlairs || [];

  const handleCreateRule = async () => {
    if (!newRule.title || newRule.blacklist!.length === 0 || !newRule.tolerationLimit) return;
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/automod-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewRule({ title: '', blacklist: [], flairId: '', tolerationLimit: 3 });
        setBlacklistInput('');
        // Reload will happen via polling
      }
    } catch (err) {
      console.error('Failed to create rule', err);
    } finally {
      setIsSaving(false);
    }
  };

  const addBlacklistWord = () => {
    const word = blacklistInput.trim();
    if (word && !newRule.blacklist?.includes(word)) {
      setNewRule(prev => ({
        ...prev,
        blacklist: [...(prev.blacklist || []), word]
      }));
      setBlacklistInput('');
    }
  };

  const removeBlacklistWord = (word: string) => {
    setNewRule(prev => ({
      ...prev,
      blacklist: prev.blacklist?.filter(w => w !== word)
    }));
  };

  return (
    <div className="flex h-full min-h-0 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      {/* Left Panel: List of Rules */}
      <section className="flex min-h-0 w-1/3 flex-col rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.18)] sm:p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">Guardian Engine</p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">Automoderator Rules</h3>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-900/20 transition-all hover:scale-110 active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 rounded-[2rem] border border-dashed border-white/10 text-center p-6">
              <Shield className="h-8 w-8 text-white/10 mb-3" />
              <p className="text-sm text-white/40">No rules active. Create one to start protecting your community.</p>
            </div>
          ) : (
            rules.map((rule) => (
              <button
                key={rule.id}
                onClick={() => setSelectedRuleId(rule.id)}
                className={`group w-full flex flex-col gap-2 rounded-[1.5rem] border p-4 text-left transition-all ${
                  selectedRuleId === rule.id
                    ? 'border-orange-500/50 bg-orange-500/10'
                    : 'border-white/5 bg-black/20 hover:border-white/10 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white line-clamp-1">{rule.title}</h4>
                  <ChevronRight className={`h-4 w-4 text-white/20 transition-transform ${selectedRuleId === rule.id ? 'rotate-90 text-orange-400' : ''}`} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-widest text-white/40">
                    {rule.blacklist.length} Words • Limit: {rule.tolerationLimit}
                  </span>
                  {rule.flairText && (
                    <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-white/60 ring-1 ring-white/10">
                      {rule.flairText}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Right Panel: Rule Details */}
      <section className="flex-1 min-h-0 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.18)] sm:p-5 flex flex-col">
        {selectedRule ? (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between border-b border-white/5 pb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/40">Rule Configuration</p>
                <h3 className="mt-1 text-2xl font-black text-white">{selectedRule.title}</h3>
                <div className="mt-2 flex items-center gap-3 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                  <span>Created by u/{selectedRule.createdBy}</span>
                  <span>•</span>
                  <span>{new Date(selectedRule.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-rose-500 hover:bg-rose-500/10 transition-colors">
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 space-y-8">
              <div>
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4">
                  <Tag className="h-3.5 w-3.5" /> Applied Action
                </h4>
                <div className="rounded-[1.5rem] bg-black/20 border border-white/5 p-5 flex items-center gap-5">
                   <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                      <Sparkles className="h-6 w-6" />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-white">Assign Post Flair</p>
                      <p className="text-xs text-white/40 mt-1">
                        Selected: <span className="text-orange-400 font-black">{selectedRule.flairText || 'None'}</span>
                      </p>
                   </div>
                   <div className="ml-auto">
                      <ArrowRight className="h-5 w-5 text-white/20" />
                   </div>
                </div>
              </div>

              <div>
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4">
                  <AlertCircle className="h-3.5 w-3.5" /> Blacklisted Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedRule.blacklist.map((word, i) => (
                    <span key={i} className="rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-white/80 border border-white/5 hover:border-orange-500/30 transition-colors">
                      {word}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-blue-500/10 border border-blue-500/20 p-5">
                 <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                       <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                       <h5 className="text-sm font-black text-white uppercase tracking-tight">Automated Enforcement Logic</h5>
                       <ul className="mt-3 space-y-2 text-xs text-white/60 list-disc pl-4 leading-relaxed">
                          <li>If a post contains these words, the flair is applied and the author is private messaged.</li>
                          <li>Comments containing these words are <b>immediately removed</b>.</li>
                          <li>If removed comments exceed <b>{selectedRule.tolerationLimit} per post</b>, the entire thread is locked.</li>
                          <li>Private messages are sent to the post owner upon thread locking.</li>
                       </ul>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="grid h-24 w-24 place-items-center rounded-[2.5rem] bg-white/5 text-white/10 ring-1 ring-white/10">
              <Shield className="h-12 w-12" />
            </div>
            <h3 className="mt-8 text-2xl font-black">Control Center</h3>
            <p className="mt-3 max-w-[280px] text-sm text-white/40 leading-relaxed">
              Select a rule from the left panel to view its enforcement details and management options.
            </p>
          </div>
        )}
      </section>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="bg-[#11141b] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl ring-1 ring-white/10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black tracking-tight text-white uppercase">New Guardian Rule</h3>
                <p className="text-xs text-white/40 font-medium italic mt-1">Define your community safeguards</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Rule Title</label>
                <input
                  type="text"
                  placeholder="e.g., Anti-Scam Filter"
                  value={newRule.title}
                  onChange={(e) => setNewRule(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-[1.25rem] bg-white/5 border border-white/10 p-4 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Target Action: Assign Flair</label>
                <select
                  value={newRule.flairId}
                  onChange={(e) => {
                    const flair = flairs.find(f => f.id === e.target.value);
                    setNewRule(prev => ({ ...prev, flairId: e.target.value, flairText: flair?.text }));
                  }}
                  className="w-full rounded-[1.25rem] bg-white/5 border border-white/10 p-4 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors appearance-none"
                >
                  <option value="" disabled className="bg-slate-900">Select a post flair...</option>
                  {flairs.map(flair => (
                    <option key={flair.id} value={flair.id} className="bg-slate-900">{flair.text}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Comment Toleration Limit</label>
                <div className="flex items-center gap-4 rounded-[1.25rem] bg-white/5 border border-white/10 p-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={newRule.tolerationLimit}
                    onChange={(e) => setNewRule(prev => ({ ...prev, tolerationLimit: parseInt(e.target.value) }))}
                    className="flex-1 accent-orange-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="w-8 text-center text-sm font-black text-orange-400">{newRule.tolerationLimit}</span>
                </div>
                <p className="text-[9px] text-white/20 ml-1 italic">Number of allowed comments with blacklist words before thread lock.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Blacklist Words</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter word and press +"
                    value={blacklistInput}
                    onChange={(e) => setBlacklistInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addBlacklistWord()}
                    className="flex-1 rounded-[1.25rem] bg-white/5 border border-white/10 p-4 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                  />
                  <button
                    onClick={addBlacklistWord}
                    className="h-[52px] w-[52px] rounded-[1.25rem] bg-orange-600 flex items-center justify-center text-white hover:bg-orange-500 transition-colors"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {newRule.blacklist?.map((word, i) => (
                    <span key={i} className="inline-flex items-center gap-2 rounded-xl bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-400 border border-orange-500/20">
                      {word}
                      <button onClick={() => removeBlacklistWord(word)}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              <button
                disabled={isSaving || !newRule.title || newRule.blacklist?.length === 0}
                onClick={handleCreateRule}
                className="w-full flex items-center justify-center gap-3 rounded-[1.5rem] bg-white py-4 text-sm font-black uppercase tracking-[0.2em] text-black hover:bg-orange-50 transition-all disabled:opacity-50 shadow-xl"
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
