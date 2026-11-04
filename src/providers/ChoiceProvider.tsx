import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
export interface ChoiceOption { value: string; label: string }
/** content：不是单选清单的时候（例如要填名字），清单那格放这个；confirm 回传 false 就不关。 */
export interface ChoiceRequest { style?: 'settings' | 'chat-settings'; title?: string; options: (ChoiceOption | string)[]; selected: string; confirm: (value: string) => void | boolean | Promise<void | boolean>; content?: ReactNode; confirmText?: string; cancelText?: string }
function useChoiceState() {
  const [state, setState] = useState({ open: false, style: undefined as ChoiceRequest['style'], revision: 0, title: '选择', options: [] as ChoiceOption[], selected: '', content: null as ReactNode, confirmText: '', cancelText: '' });
  const modalRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const confirmRef = useRef<ChoiceRequest['confirm'] | null>(null);
  const open = useCallback((request: ChoiceRequest) => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirmRef.current = request.confirm;
    setState(current => ({ open: true, style: request.style, revision: current.revision + 1, title: request.title || '选择', selected: request.selected || '', content: request.content ?? null, confirmText: request.confirmText || '', cancelText: request.cancelText || '', options: (request.options || []).map(option => typeof option === 'string' ? { value: option, label: option } : { value: option.value, label: option.label || option.value }) }));
  }, []);
  const close = useCallback(() => { if (document.activeElement instanceof HTMLElement && modalRef.current?.contains(document.activeElement)) document.activeElement.blur(); setState(current => ({ ...current, open: false })); confirmRef.current = null; const trigger=returnFocus.current; requestAnimationFrame(()=>{if(trigger?.isConnected)trigger.focus();}); }, []);
  const busy = useRef(false);
  const confirm = async () => {
    if (busy.current) return;
    const valid = state.options.some(option => option.value === state.selected);
    if (!valid && !state.content) { close(); return; }
    busy.current = true;
    try { if (await confirmRef.current?.(valid ? state.selected : '') === false) return; } finally { busy.current = false; }
    close();
  };
  useEffect(() => {
    const external = (event: Event) => open((event as CustomEvent<ChoiceRequest>).detail);
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('qingtuan:choice-open', external); window.addEventListener('qingtuan:choice-close', close); document.addEventListener('keydown', keyboard);
    return () => { window.removeEventListener('qingtuan:choice-open', external); window.removeEventListener('qingtuan:choice-close', close); document.removeEventListener('keydown', keyboard); };
  }, [open, close]);
  useEffect(() => {
    if(!state.open)return;
    const modal=modalRef.current;
    const frame=requestAnimationFrame(()=>(modal?.querySelector<HTMLButtonElement>('.vi-choice-item.selected, .api-model-item.selected') ?? modal?.querySelector<HTMLButtonElement>('.vi-choice-item, .api-model-item'))?.focus());
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
