import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Logo from './components/Logo';

export const Splash = () => {
  return (
    <main className="relative flex h-screen w-full overflow-hidden bg-[#0f1115] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,126,64,0.22),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(255,69,0,0.16),_transparent_42%),linear-gradient(180deg,_#151821_0%,_#0f1115_100%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:72px_72px]" />

      <section className="relative z-10 flex w-full flex-1 items-center justify-center px-6 py-8">
        <div className="flex w-full max-w-xl flex-col items-center justify-center text-center">
          <Logo />

          <h1 className="mt-8 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Pearl Mod Tools
          </h1>

          <p className="mt-4 max-w-md text-sm leading-6 text-white/70 sm:text-base">
            A focused control center for moderators to move faster, stay organized, and keep communities healthy.
          </p>

          <button
            type="button"
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
            className="mt-10 inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-[#111318] shadow-[0_18px_50px_rgba(0,0,0,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#fff4ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a18] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1115]"
          >
            Enter
          </button>
        </div>
      </section>
    </main>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
