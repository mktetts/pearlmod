import type { MenuItem, MenuKey } from '../App'
import { X } from 'lucide-react'

type MenuBarProps = {
  items: MenuItem[]
  activeMenu: MenuKey
  onMenuChange: (menu: MenuKey) => void
  isMobileOpen: boolean
  onMobileClose: () => void
}

function MenuBar({ items, activeMenu, onMenuChange, isMobileOpen, onMobileClose }: MenuBarProps) {
  return (
    <>
      <nav className="hidden border-b border-white/10 bg-[#11141b]/95 px-3 py-3 sm:block sm:px-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = activeMenu === item.key

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onMenuChange(item.key)}
                className={[
                  'flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium transition duration-200',
                  'ring-1 ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a18] focus-visible:ring-offset-2 focus-visible:ring-offset-[#11141b]',
                  isActive
                    ? 'bg-[#ff4500] text-white ring-[#ff4500]/50 shadow-[0_14px_30px_rgba(255,69,0,0.2)]'
                    : 'bg-white/5 text-white/70 ring-white/10 hover:bg-white/10 hover:text-white',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 bg-black/65 px-4 py-5 backdrop-blur-sm sm:hidden">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 cursor-default"
            onClick={onMobileClose}
          />

          <div className="relative mx-auto mt-14 w-full max-w-sm rounded-[2rem] border border-white/10 bg-[#11141b] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">Menu</p>
              <button
                type="button"
                onClick={onMobileClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-2">
              {items.map((item) => {
                const Icon = item.icon
                const isActive = activeMenu === item.key

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onMenuChange(item.key)
                      onMobileClose()
                    }}
                    className={[
                      'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition duration-200',
                      'ring-1 ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a18] focus-visible:ring-offset-2 focus-visible:ring-offset-[#11141b]',
                      isActive
                        ? 'bg-[#ff4500] text-white ring-[#ff4500]/50 shadow-[0_14px_30px_rgba(255,69,0,0.2)]'
                        : 'bg-white/5 text-white/70 ring-white/10 hover:bg-white/10 hover:text-white',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default MenuBar
