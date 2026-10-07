import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { describeForwardRecord } from '../utils/chatRecordDetail';
import type { RecordDetailServices, RecordDetailView } from '../types/chatRecordDetail';

export function useChatRecordDetail() {
  const [services, setServices] = useState<RecordDetailServices | null>(null);
  const service = useRef<RecordDetailServices | null>(null);
  const [view, setView] = useState<RecordDetailView>({ open: false, title: '', subtitle: '', rows: [], generation: 0 });
  const element = useRef<HTMLDivElement>(null), ready = useRef(false);
  function close() {
    const update = () => setView(previous => ({ ...previous, open: false }));
    if (ready.current) flushSync(update); else update();
  }
  useEffect(() => {
    ready.current = true;
    return () => { ready.current = false; };
  }, []);
  useLayoutEffect(() => {
    const connect = (event: Event) => {
      const detail = (event as CustomEvent<RecordDetailServices>).detail;
      service.current = detail;
      setServices(detail);
      detail.accept({ close });
    };
    const open = (event: Event) => {
      const api = service.current;
      if (!api) return;
      const id = (event as CustomEvent<string>).detail;
      if (!id) return;
      const record = api.read(id);
      if (!record) return;
      const next = describeForwardRecord(record, api.avatars(record));
      flushSync(() => setView(previous => ({ ...next, open: true, generation: previous.generation + 1 })));
    };
    window.addEventListener('qingtuan:record-detail-connect', connect);
    window.addEventListener('qingtuan:record-detail-open', open);
    return () => {
      window.removeEventListener('qingtuan:record-detail-connect', connect);
      window.removeEventListener('qingtuan:record-detail-open', open);
    };
  }, []);
  return { services, element, view, close };
}
