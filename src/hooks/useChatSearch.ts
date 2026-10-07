import { useLayoutEffect, useRef, useState } from 'react';
import type { ChatFilter, ChatListServices, ChatThreadsEvent, ChatThreadSnapshot } from '../types/chatThread';

// Chat 首页搜索：按角色名字和最后一句聊天内容筛选；角色列表重画时自动再筛一次。
export function useChatSearch() {
  const [threads, setThreads] = useState<ChatThreadSnapshot[]>([]);
  const records = useRef<ChatThreadSnapshot[]>([]);
  const [query, setQuery] = useState('');
  const queryRef = useRef(query);
  const [filter, setFilter] = useState<ChatFilter>('all');
  const filterRef = useRef(filter);
  const [misses, setMisses] = useState<Set<string>>(() => new Set());
  const [emptyHidden, setEmptyHidden] = useState(true);
  const [revision, setRevision] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const services = useRef<ChatListServices | null>(null);
  const timers = useRef<Set<number>>(new Set());
  function apply(value = input.current?.value ?? queryRef.current) {
    const normalized = value.trim().toLocaleLowerCase();
    const next = new Set(records.current.filter(thread => Boolean(normalized) && !(thread.name + ' ' + thread.preview).toLocaleLowerCase().includes(normalized)).map(thread => thread.id));
    setMisses(next);
    // 一个角色都没有、或在群聊分页时，已有别的空白提示，不叠一张「找不到」。
    setEmptyHidden(!normalized || !records.current.length || filterRef.current === 'group' || next.size < records.current.length);
  }
  function changeQuery(value: string) {
    queryRef.current = value;
    setQuery(value);
    apply(value);
  }
  function selectFilter(next: ChatFilter) {
    filterRef.current = next;
    setFilter(next);
    // 换 All / Chats / Group 分页后再判断一次（等分页自己的程序先跑完）。
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      apply();
    }, 0);
    timers.current.add(timer);
  }
  useLayoutEffect(() => {
    const snapshot = (event: Event) => {
      const {
        kind,
        threads: incoming
      } = (event as CustomEvent<ChatThreadsEvent>).detail;
      if (kind === 'rebuild') {
        records.current = incoming;
        setThreads(incoming);
        setRevision(current => current + 1);
        // 原搜索观察的是列表 childList，预览内容的局部更新不会自动重筛。
        apply(input.current?.value ?? queryRef.current);
      } else {
        const updates = new Map(incoming.map(thread => [thread.id, thread]));
        records.current = records.current.map(thread => updates.has(thread.id) ? {
          ...thread,
          preview: updates.get(thread.id)!.preview,
          draft: updates.get(thread.id)!.draft,
          time: updates.get(thread.id)!.time,
          unread: updates.get(thread.id)!.unread
        } : thread);
        setThreads(records.current);
      }
    };
    const ready = (event: Event) => {
      services.current = (event as CustomEvent<ChatListServices>).detail;
    };
    const load = () => apply(input.current?.value ?? queryRef.current);
    window.addEventListener('qingtuan:chat-thread-snapshot', snapshot);
    window.addEventListener('qingtuan:chat-list-services', ready);
    window.addEventListener('load', load);
    return () => {
      window.removeEventListener('qingtuan:chat-thread-snapshot', snapshot);
      window.removeEventListener('qingtuan:chat-list-services', ready);
      window.removeEventListener('load', load);
      timers.current.forEach(timer => window.clearTimeout(timer));
    };
  }, []);
  // 输入保持原来的无 value HTML 属性；搜索值和筛选结果在 React 状态中。
  useLayoutEffect(() => {
    if (input.current && input.current.value !== query) input.current.value = query;
  }, [query]);
  return {
    threads,
    query,
    filter,
    misses,
    emptyHidden,
    revision,
    input,
    changeQuery,
    selectFilter,
    newCharacter: () => services.current?.openCharacterCard()
  };
}
