import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { CharacterDossier, CharacterEditorBridge, CharacterEditorSnapshot } from '../types/characterDossier';
/** 标题栏和操作按钮从原生档案控制器接收状态和回调。 */
export function useCharacterDialog() {
  const [bridge, setBridge] = useState<CharacterEditorBridge | null>(null);
  const adapter = useRef<CharacterEditorBridge | null>(null);
  const [record, setRecord] = useState<CharacterDossier | null>(null);
  const close = useCallback(() => adapter.current?.finishClose(), []);
  useLayoutEffect(() => {
    const ready = (event: Event) => {
      const next = (event as CustomEvent<CharacterEditorBridge>).detail;
      adapter.current = next;
      setBridge(next);
    };
    const snapshot = (event: Event) => setRecord((event as CustomEvent<CharacterEditorSnapshot>).detail.record);
    window.addEventListener('qingtuan:character-editor-ready', ready);
    window.addEventListener('qingtuan:character-editor-snapshot', snapshot);
    return () => {
      window.removeEventListener('qingtuan:character-editor-ready', ready);
      window.removeEventListener('qingtuan:character-editor-snapshot', snapshot);
    };
  }, []);
  const bindSwitch = useCallback((container: HTMLDivElement | null) => {
    window.dispatchEvent(new CustomEvent('qingtuan:character-switch-container', {
      detail: container
    }));
  }, []);
  return {
    bridge,
    record,
    close,
    bindSwitch
  };
}
