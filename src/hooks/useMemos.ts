import { useCallback, useEffect, useRef, useState } from 'react';
import type { MemoKind, MemoNote } from '../types/memos';
import { memoId, newMemo, readMemos, writeMemos } from '../utils/memoStorage';

function loadArchive() {
  try { return { notes: readMemos(), error: '' }; }
  catch { return { notes: [] as MemoNote[], error: '备忘录暂时无法读取，原来的记录已保留。' }; }
}

export function useMemos() {
  const [archive, setArchive] = useState(loadArchive);
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'error'>('saved');
  const live = useRef(archive.notes);
  const dirty = useRef(false);

  const flush = useCallback(() => {
    if (!dirty.current) return true;
    try {
      writeMemos(live.current);
      dirty.current = false;
      setSaveState('saved');
      return true;
    } catch {
      setSaveState('error');
      return false;
    }
  }, []);

  useEffect(() => {
    if (!dirty.current) return;
    const timer = window.setTimeout(flush, 450);
    return () => window.clearTimeout(timer);
  }, [archive.notes, flush]);

  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    const unload = (event: BeforeUnloadEvent) => {
      if (flush()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', unload);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [flush]);

  function commit(notes: MemoNote[]) {
    if (archive.error) return;
    live.current = notes;
    dirty.current = true;
    setArchive({ notes, error: '' });
    setSaveState('pending');
  }

  function update(id: string, values: Partial<Omit<MemoNote, 'id' | 'createdAt'>>) {
    commit(live.current.map(note => note.id === id ? { ...note, ...values, updatedAt: Date.now() } : note));
  }

  function create(kind: MemoKind) {
    if (archive.error) return null;
    const note = newMemo(kind);
    commit([note, ...live.current]);
    return note.id;
  }

  function addItem(id: string) {
    const note = live.current.find(value => value.id === id);
    if (note) update(id, { items: [...note.items, { id: memoId(), text: '', done: false }] });
  }

  function retryRead() {
    const next = loadArchive();
    live.current = next.notes;
    setArchive(next);
  }

  return {
    notes: archive.notes, loadError: archive.error, saveState, flush, update, create, addItem, retryRead,
    trash: (id: string) => update(id, { deletedAt: Date.now() }),
    restore: (id: string) => update(id, { deletedAt: null }),
    erase: (id: string) => commit(live.current.filter(note => note.id !== id)),
  };
}
