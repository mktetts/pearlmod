import { X } from 'lucide-react'
import type { ModeratorInfo } from '../../shared/api'

type ModListModalProps = {
  isOpen: boolean
  moderators: ModeratorInfo[]
  onClose: () => void
}

export function ModListModal({ isOpen, moderators, onClose }: ModListModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mod-list-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[1.5rem] border border-white/20 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Moderator roster
            </p>
            <h3 id="mod-list-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              All moderators
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            aria-label="Close moderator list"
            title="Close moderator list"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 max-h-80 overflow-auto pr-1">
          <ul className="space-y-3">
            {moderators.map((mod) => (
              <li
                key={mod.username}
                className="rounded-[1rem] bg-slate-50 px-4 py-3 text-sm shadow-sm dark:bg-white/5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">u/{mod.username}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 dark:text-orange-400">
                    {mod.permissions?.includes('all') ? 'Full Access' : 'Limited Access'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {mod.permissions?.map((perm) => (
                    <span
                      key={perm}
                      className="inline-block rounded-md bg-slate-200/50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-400"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
