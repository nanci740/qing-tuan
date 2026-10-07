import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { ReplyDetail, ReplyNotificationBridge, ReplyNotificationServices } from '../types/replyNotification';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import { chatReplyPreview } from '../utils/chatReplyParser';
const UNREAD_KEY = 'smallphone_chat_unread_counts_v1';
function loadUnread() {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(UNREAD_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved as Record<string, unknown> : {};
  } catch {
    return {};
  }
}
export function useReplyNotification() {
  const [services, setServices] = useState<ReplyNotificationServices | null>(null);
  const api = useRef<ReplyNotificationServices | null>(null),
    element = useRef<HTMLButtonElement>(null),
    mounted = useRef(false);
  const [counts, setCounts] = useState<Record<string, unknown>>({});
  const unread = useRef(counts),
    loaded = useRef(false);
  const timer = useRef(0),
    frame = useRef(0),
    chatKey = useRef<unknown>(''),
    pending = useRef<ReplyDetail | null>(null);
  const [shown, setShown] = useState(false),
    [reset, setReset] = useState(false),
    [content, setContent] = useState<{
      avatar?: string;
      name: string;
      body: string;
    }>({
      name: '',
      body: ''
    });
  function setUnread(key: string, count: unknown) {
    if (!key) return;
    const next = Math.max(0, Number(count) || 0);
    if (next) unread.current[key] = next;else delete unread.current[key];
    setCounts({
      ...unread.current
    });
    try {
      localStorage.setItem(UNREAD_KEY, JSON.stringify(unread.current));
    } catch {/* 原未读存储失败不弹提示。 */}
    api.current!.updateThread(key);
  }
  function show(detail: ReplyDetail = {}) {
    const character = api.current!.find(detail.chatKey);
    if (!character) return;
    if (!element.current) {
      pending.current = detail;
      return;
    }
    window.clearTimeout(timer.current);
    window.cancelAnimationFrame(frame.current);
    // 每条消息都先无动画复位到顶端，再单独向下滑入，避免延续上一条的位置。
    flushSync(() => {
      setReset(true);
      setShown(false);
    });
    void element.current.offsetWidth;
    chatKey.current = detail.chatKey;
    flushSync(() => {
      setContent({
        avatar: String(detail.avatar || character.photoUrl || DEFAULT_AVATAR),
        name: String(detail.title || String(character.name == null ? '' : character.name).trim() || '新消息'),
        body: chatReplyPreview(detail.body || '收到一条新回复').replace(/\s+/g, ' ')
      });
      setReset(false);
    });
    void element.current.offsetWidth;
    frame.current = window.requestAnimationFrame(() => flushSync(() => setShown(true)));
    timer.current = window.setTimeout(() => flushSync(() => setShown(false)), 4500);
  }
  function complete(detail?: ReplyDetail) {
    const key = String(detail?.chatKey || '');
    // 通知主画面的消息小窗：不管有没有正在看，都记下最新一句。
    if (key) window.dispatchEvent(new CustomEvent('smallphone:reply', {
      detail: {
        ...detail,
        chatKey: key
      }
    }));
    if (!key || detail?.viewed) return;
    const addedCount = Math.max(1, Number(detail?.unreadCount) || 1);
    setUnread(key, Number(unread.current[key] || 0) + addedCount);
    show(detail);
    window.dispatchEvent(new CustomEvent('qingtuan:notify-reply', {
      detail: {
        title: detail?.title || '小手机',
        body: detail?.body || '收到一条新回复',
        tag: `smallphone-reply-${key}`
      }
    }));
  }
  function click() {
    const character = api.current?.find(chatKey.current);
    window.cancelAnimationFrame(frame.current);
    flushSync(() => setShown(false));
    if (character) api.current!.open(chatKey.current);
  }
  useLayoutEffect(() => {
    const connect = (event: Event) => {
      const {
        accept,
        ...service
      } = (event as CustomEvent<ReplyNotificationServices & {
        accept: (bridge: ReplyNotificationBridge) => void;
      }>).detail;
      api.current = service;
      setServices(service);
      if (!loaded.current) {
        unread.current = loadUnread();
        loaded.current = true;
        setCounts({
          ...unread.current
        });
      }
      accept({
        unread: key => unread.current[key],
        setUnread,
        complete
      });
    };
    window.addEventListener('qingtuan:reply-notification-connect', connect);
    return () => {
      window.removeEventListener('qingtuan:reply-notification-connect', connect);
      window.clearTimeout(timer.current);
      window.cancelAnimationFrame(frame.current);
    };
  }, []);
  useLayoutEffect(() => {
    if (!services || !element.current || mounted.current) return;
    mounted.current = true;
    if (pending.current) {
      const detail = pending.current;
      pending.current = null;
      queueMicrotask(() => show(detail));
    }
  }, [services]);
  return {
    services,
    element,
    shown,
    reset,
    content,
    click
  };
}
