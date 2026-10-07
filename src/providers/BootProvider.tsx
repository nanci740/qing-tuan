import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
interface BootState { run: boolean; ready: boolean; fading: boolean; hidden: boolean; mainVisible: boolean; mainOpaque: boolean; }
interface BootContextValue extends BootState { reveal: () => void; }
const Context = createContext<BootContextValue | null>(null);
function initialBoot(): BootState {
  let play = true;
  try {
    const mode = localStorage.getItem('smallphone_splash_mode') || 'always';
    if (mode === 'off') play = false;
    else if (mode === 'daily') {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      play = (localStorage.getItem('smallphone_splash_last_shown') || '') !== today;
      if (play) localStorage.setItem('smallphone_splash_last_shown', today);
    }
  } catch { play = true; }
  return { run: play, ready: false, fading: false, hidden: !play, mainVisible: !play, mainOpaque: !play };
}
export function BootProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialBoot);
  const done = useRef(state.hidden);
  const readyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (done.current) return;
    readyTimer.current = setTimeout(() => { if (!done.current) setState(current => ({ ...current, ready: true })); }, 2400);
    return () => {
      clearTimeout(readyTimer.current); clearTimeout(fadeTimer.current);
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, []);
  const reveal = useCallback(() => {
    if (done.current) return;
    done.current = true;
    clearTimeout(readyTimer.current);
    setState(current => ({ ...current, fading: true }));
    fadeTimer.current = setTimeout(() => {
      setState(current => ({ ...current, hidden: true, mainVisible: true }));
      frame.current = requestAnimationFrame(() => setState(current => ({ ...current, mainOpaque: true })));
    }, 550);
  }, []);
  return <Context.Provider value={{ ...state, reveal }}>{children}</Context.Provider>;
}
export function useBoot() {
  const state = useContext(Context);
  if (!state) throw new Error('BootProvider is required');
  return state;
}
