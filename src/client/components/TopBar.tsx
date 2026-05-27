import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  KeyRound,
  Menu,
  Shield,
  X,
  RefreshCw,
} from 'lucide-react';

type TopBarProps = {
  title: string;
  username: string;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
};

function TopBar({
  title,
  username,
  isMenuOpen,
  onMenuToggle,
  onRefresh,
  isRefreshing,
}: TopBarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const usernameButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        isUserMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(target) &&
        usernameButtonRef.current &&
        !usernameButtonRef.current.contains(target)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsApiModalOpen(false);
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isUserMenuOpen]);

  const openApiKeyModal = () => {
    setIsUserMenuOpen(false);
    setIsApiModalOpen(true);
  };

  const closeApiKeyModal = () => {
    setIsApiModalOpen(false);
  };

  const handleSaveApiKey = () => {
    setIsApiModalOpen(false);
  };

  return (
    <>
      <header className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a18] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1115] sm:hidden"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-8 w-8 object-contain"
            />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">
              Mod Console
            </p>
            <h2 className="text-lg font-semibold text-white sm:text-xl">
              {title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`hidden items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-2 text-white/55 transition hover:bg-white/10 hover:text-white sm:flex ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              ref={usernameButtonRef}
              type="button"
              onClick={() => setIsUserMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
              className="flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a18] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1115]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#ff7a18] to-[#ff4500] text-sm font-semibold text-white">
                U
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">
                  Signed in as
                </p>
                <p className="text-sm font-medium text-white">{username}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-white/55" />
            </button>

            {isUserMenuOpen ? (
              <div
                ref={userMenuRef}
                role="menu"
                className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-64 overflow-hidden rounded-3xl border border-white/10 bg-[#11141b] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={openApiKeyModal}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <KeyRound className="h-4 w-4 text-[#ff9c75]" />
                  <span>OpenAI API key</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {isApiModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close API key modal"
            className="absolute inset-0 cursor-default"
            onClick={closeApiKeyModal}
          />

          <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#11141b] p-5 shadow-[0_35px_120px_rgba(0,0,0,0.55)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/40">
                  Credentials
                </p>
                <h3 className="mt-1 text-xl font-semibold text-white">
                  OpenAI API key
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Enter the API key you want this mod tool to use.
                </p>
              </div>

              <button
                type="button"
                onClick={closeApiKeyModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5">
              <label
                htmlFor="openai-api-key"
                className="mb-2 block text-sm font-medium text-white/75"
              >
                API key
              </label>
              <input
                id="openai-api-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-..."
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#ff7a18] focus:ring-2 focus:ring-[#ff7a18]/30"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeApiKeyModal}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="rounded-full bg-[#ff4500] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#ff5b1a]"
              >
                Save key
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default TopBar;
