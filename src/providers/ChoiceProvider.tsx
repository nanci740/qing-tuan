import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
export interface ChoiceOption { value: string; label: string }
export interface ChoiceRequest { title?: string; options: (ChoiceOption | string)[]; selected: string; confirm: (value: string) => void }
function useChoiceState() {
  const [state, setState] = useState({ open: false, revision: 0, title: '选择', options: [] as ChoiceOption[], selected: '' });
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<ChoiceRequest['confirm'] | null>(null);
  const open = useCallback((request: ChoiceRequest) => {
    confirmRef.current = request.confirm;
    setState(current => ({ open: true, revision: current.revision + 1, title: request.title || '选择', selected: request.selected || '', options: (request.options || []).map(option => typeof option === 'string' ? { value: option, label: option } : { value: option.value, label: option.label || option.value }) }));
  }, []);
  const close = useCallback(() => { if (document.activeElement instanceof HTMLElement && modalRef.current?.contains(document.activeElement)) document.activeElement.blur(); setState(current => ({ ...current, open: false })); confirmRef.current = null; }, []);
  const confirm = () => { if (state.selected) confirmRef.current?.(state.selected); close(); };
  useEffect(() => {
    const external = (event: Event) => open((event as CustomEvent<ChoiceRequest>).detail);
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('qingtuan:choice-open', external); window.addEventListener('qingtuan:choice-close', close); document.addEventListener('keydown', keyboard);
    return () => { window.removeEventListener('qingtuan:choice-open', external); window.removeEventListener('qingtuan:choice-close', close); document.removeEventListener('keydown', keyboard); };
  }, [open, close]);
  return { ...state, modalRef, openChoice: open, close, confirm, select: (selected: string) => setState(current => ({ ...current, selected })) };
}
const Context = createContext<ReturnType<typeof useChoiceState> | null>(null);
export function ChoiceProvider({ children }: { children: ReactNode }) { const choice = useChoiceState(); return <Context.Provider value={choice}>{children}</Context.Provider>; }
export function useChoice() { const value = useContext(Context); if (!value) throw new Error('ChoiceProvider is required'); return value; }
