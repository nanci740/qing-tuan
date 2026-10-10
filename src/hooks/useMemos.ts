import { useCallback, useEffect, useRef, useState } from 'react';
import type { MemoKind, MemoNote } from '../types/memos';
import { MemoConflictError, memoId, newMemo, readMemos, writeMemos } from '../utils/memoStorage.ts';
import { showToast } from '../utils/toast';

export function useMemos() {
  const [archive, setArchive] = useState({ notes: [] as MemoNote[], error: '', loading: true, ready: false });
  const [saveState, setSaveState] = useState<'saved' | 'pending' | 'error'>('pending');
  const [saving, setSaving] = useState(false);
  const [conflicted, setConflicted] = useState(false);
  const live = useRef(archive.notes);
  const dirty = useRef(false), ready = useRef(false), conflict = useRef(false), active = useRef(true);
  const revision = useRef(0), generation = useRef(0), readSequence = useRef(0);
  const inflight = useRef<Promise<boolean> | null>(null);

  const flush = useCallback((): Promise<boolean> => {
    if (!ready.current || conflict.current) return Promise.resolve(false);
    if (inflight.current) return inflight.current;
    if (!dirty.current) return Promise.resolve(true);
    if (active.current) setSaving(true);
    // 一次只写一笔事务；写入时继续输入的内容在后续事务保存，不能误报“已保存”。
    const task = (async () => {
      while (dirty.current) {
        const notes = live.current, savedGeneration = generation.current;
        try {
          const snapshot = await writeMemos(notes, revision.current);
          revision.current = snapshot.revision;
          if (generation.current === savedGeneration) dirty.current = false;
        } catch (error) {
          if (error instanceof MemoConflictError) {
            conflict.current = true;
            if (active.current) { setConflicted(true); showToast(error.message); }
          } else if (active.current) showToast('保存失败，当前内容还在，请稍后再试');
          if (active.current) setSaveState('error');
          return false;
        }
      }
      if (active.current) setSaveState('saved');
      return true;
    })().finally(() => {
      inflight.current = null;
      if (active.current) setSaving(false);
    });
    inflight.current = task;
    return task;
  }, []);

  const retryRead = useCallback(async () => {
    // 不得用重读抹掉未保存的编辑；冲突后必须关闭并重新打开。
    if (!active.current || dirty.current || inflight.current || conflict.current) return false;
    const sequence = ++readSequence.current;
    ready.current = false;
    setArchive(current => ({ ...current, loading: true, ready: false, error: '' }));
    try {
      const snapshot = await readMemos();
      if (!active.current || sequence !== readSequence.current) return false;
      live.current = snapshot.notes; revision.current = snapshot.revision; ready.current = true;
      setArchive({ notes: snapshot.notes, loading: false, ready: true, error: '' });
      setSaveState('saved');
      return true;
    } catch {
      if (active.current && sequence === readSequence.current)
        setArchive(current => ({ ...current, loading: false, ready: false, error: '备忘录读不出来，原来的记录还在，请关掉备忘录重新打开' }));
      if (active.current && sequence === readSequence.current) showToast('备忘录读不出来，原来的记录还在，请关掉备忘录重新打开');
      return false;
    }
  }, []);

  useEffect(() => {
    active.current = true;
    void retryRead();
    return () => { void flush(); active.current = false; readSequence.current++; };
  }, [retryRead, flush]);

  useEffect(() => {
    if (!dirty.current || conflict.current) return;
    const timer = window.setTimeout(() => { void flush(); }, 450);
    return () => window.clearTimeout(timer);
  }, [archive.notes, flush]);

  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') void flush(); };
    const pagehide = () => { void flush(); };
    const unload = (event: BeforeUnloadEvent) => {
      if (!dirty.current && !inflight.current) return;
      // IndexedDB 不能在卸载事件里同步保存；未提交完成时保留浏览器离开提醒。
      void flush();
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('beforeunload', unload);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [flush]);

  function commit(notes: MemoNote[]) {
    if (!active.current || !ready.current || conflict.current) return false;
    live.current = notes;
    dirty.current = true; generation.current++;
    setArchive({ notes, error: '', loading: false, ready: true });
    setSaveState('pending');
    return true;
  }

  function update(id: string, values: Partial<Omit<MemoNote, 'id' | 'createdAt'>>) {
    commit(live.current.map(note => note.id === id ? { ...note, ...values, updatedAt: Date.now() } : note));
  }

  function create(kind: MemoKind) {
    if (!active.current || !ready.current || conflict.current) return null;
    const note = newMemo(kind);
    commit([note, ...live.current]);
    return note.id;
  }

  function addItem(id: string) {
    const note = live.current.find(value => value.id === id);
    if (note) update(id, { items: [...note.items, { id: memoId(), text: '', done: false }] });
  }

  return {
    notes: archive.notes, loadError: archive.error, loading: archive.loading, ready: archive.ready, saving, conflicted,
    saveState, flush, update, create, addItem, retryRead,
    trash: (id: string) => update(id, { deletedAt: Date.now() }),
    restore: (id: string) => update(id, { deletedAt: null }),
    erase: (id: string) => commit(live.current.filter(note => note.id !== id)),
  };
}
