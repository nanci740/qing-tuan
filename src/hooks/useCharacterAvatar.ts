import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { CharacterDossier, CharacterEditorBridge, CharacterEditorSnapshot } from '../types/characterDossier';
import { compressCharacterAvatar } from '../utils/characterAvatar';
import { showToast } from '../utils/toast';

export function useCharacterAvatar() {
  const [bridge, setBridge] = useState<CharacterEditorBridge | null>(null);
  const [record, setRecord] = useState<CharacterDossier>({});
  const [rendered, setRendered] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    const ready = (event: Event) => setBridge((event as CustomEvent<CharacterEditorBridge>).detail);
    const snapshot = (event: Event) => { setRecord((event as CustomEvent<CharacterEditorSnapshot>).detail.record); setRendered(true); };
    window.addEventListener('qingtuan:character-editor-ready', ready);
    window.addEventListener('qingtuan:character-editor-snapshot', snapshot);
    return () => { window.removeEventListener('qingtuan:character-editor-ready', ready); window.removeEventListener('qingtuan:character-editor-snapshot', snapshot); };
  }, []);
  const bindTools = useCallback((container: HTMLDivElement | null) => {
    window.dispatchEvent(new CustomEvent('qingtuan:character-png-container', { detail: container }));
  }, []);
  async function upload(file?: File) {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const photoUrl = await compressCharacterAvatar(file);
      bridge?.patch({ photoUrl, photoPositionX: 50, photoPositionY: 50 });
    } catch { showToast('头像读取失败，请换一张图片'); }
  }
  return { bridge, record, rendered, input, bindTools, upload };
}
