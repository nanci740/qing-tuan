import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
export interface ChoiceOption { value: string; label: string }
export interface ChoiceRequest { title?: string; options: (ChoiceOption | string)[]; selected: string; confirm: (value: string) => void }
function useChoiceState() {
  const [state, setState] = useState({ open: false, revision: 0, title: '选择', options: [] as ChoiceOption[], selected: '' });
  const modalRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const confirmRef = useRef<ChoiceRequest['confirm'] | null>(null);
  const open = useCallback((request: ChoiceRequest) => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirmRef.current = request.confirm;
    setState(current => ({ open: true, revision: current.revision + 1, title: request.title || '选择', selected: request.selected || '', options: (request.options || []).map(option => typeof option === 'string' ? { value: option, label: option } : { value: option.value, label: option.label || option.value }) }));
  }, []);
  const close = useCallback(() => { if (document.activeElement instanceof HTMLElement && modalRef.current?.contains(document.activeElement)) document.activeElement.blur(); setState(current => ({ ...current, open: false })); confirmRef.current = null; const trigger=returnFocus.current; requestAnimationFrame(()=>{if(trigger?.isConnected)trigger.focus();}); }, []);
  const confirm = () => { if (state.options.some(option => option.value === state.selected)) confirmRef.current?.(state.selected); close(); };
  useEffect(() => {
    const external = (event: Event) => open((event as CustomEvent<ChoiceRequest>).detail);
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('qingtuan:choice-open', external); window.addEventListener('qingtuan:choice-close', close); document.addEventListener('keydown', keyboard);
    return () => { window.removeEventListener('qingtuan:choice-open', external); window.removeEventListener('qingtuan:choice-close', close); document.removeEventListener('keydown', keyboard); };
  }, [open, close]);
  useEffect(() => {
    if(!state.open)return;
    const modal=modalRef.current;
    const frame=requestAnimationFrame(()=>(modal?.querySelector<HTMLButtonElement>('.vi-choice-item.selected') ?? modal?.querySelector<HTMLButtonElement>('.vi-choice-item'))?.focus());
    const trap=(event:KeyboardEvent)=>{
      if(event.key!=='Tab'||!modal)return;
      const controls=Array.from(modal.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(e=>e.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown',trap);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',trap);};
  }, [state.open, state.revision]);
  return { ...state, modalRef, openChoice: open, close, confirm, select: (selected: string) => setState(current => ({ ...current, selected })) };
}
const Context = createContext<ReturnType<typeof useChoiceState> | null>(null);
export function ChoiceProvider({ children }: { children: ReactNode }) { const choice = useChoiceState(); return <Context.Provider value={choice}>{children}</Context.Provider>; }
export function useChoice() { const value = useContext(Context); if (!value) throw new Error('ChoiceProvider is required'); return value; }
