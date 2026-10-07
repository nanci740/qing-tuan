import { useSettingsNavigation } from './useSettingsNavigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { showToast } from '../utils/toast';

export interface BackgroundSettings {
  enabled: boolean;
  replyNotification: boolean;
  notificationSound: boolean;
  notificationVibration: boolean;
  screenAwake: boolean;
}
export interface ReplyNotification { title?: string; body?: string; tag?: string; url?: string }
const STORAGE_KEY = 'smallphone_background_activity_v1';
const defaults: BackgroundSettings = { enabled: false, replyNotification: false, notificationSound: true, notificationVibration: true, screenAwake: false };
function loadSettings(): BackgroundSettings {
  try { return { ...defaults, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {}) }; }
  catch { return { ...defaults }; }
}

// 轻量保活 WAV 与原文件使用相同的采样率、时长和音量。
function createQuietWavBlob() {
  const sampleRate = 8000, sampleCount = sampleRate * 4;
  const view = new DataView(new ArrayBuffer(44 + sampleCount * 2));
  function writeText(offset: number, text: string) {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  }
  writeText(0, 'RIFF'); view.setUint32(4, 36 + sampleCount * 2, true);
  writeText(8, 'WAVE'); writeText(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeText(36, 'data'); view.setUint32(40, sampleCount * 2, true);
  for (let i = 0; i < sampleCount; i++) view.setInt16(44 + i * 2, i % 2 ? 1 : -1, true);
  return new Blob([view.buffer], { type: 'audio/wav' });
}

function playNotificationCue() {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass(), oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(660, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.2);
    oscillator.addEventListener('ended', () => { void context.close().catch(() => {}); }, { once: true });
  } catch { /* 原浏览器不支持时保持静默。 */ }
}

export function useBackgroundActivity() {
  const { registerDestination } = useSettingsNavigation();
  const [settings, setSettings] = useState(loadSettings);
  const current = useRef(settings);
  const [open, setOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlRef = useRef('');
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const resumePending = useRef(false);
  const resumeRef = useRef<() => void>(() => {});

  const save = useCallback((next: BackgroundSettings) => {
    try {localStorage.setItem(STORAGE_KEY, JSON.stringify(next));}
    catch {setSettings({...current.current});showToast('后台活动设置保存失败，请重试');return false;}
    current.current = next;setSettings(next);return true;
  }, []);
  const startKeepAlive = useCallback(async (feedback = false) => {
    if (!current.current.enabled) return false;
    if (!audioRef.current) {
      if (!urlRef.current) urlRef.current = URL.createObjectURL(createQuietWavBlob());
      flushSync(() => setAudioUrl(urlRef.current));
    }
    try {
      await audioRef.current?.play();
      if (feedback) showToast('后台活动已开启');
      return true;
    } catch {
      if (feedback) showToast('已开启，轻触页面后将启动后台保活');
      if (!resumePending.current) {
        resumePending.current = true;
        document.addEventListener('pointerdown', resumeRef.current, { once: true, capture: true });
      }
      return false;
    }
  }, []);
  const stopKeepAlive = useCallback((feedback = false) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    if (feedback) showToast('后台活动已关闭');
  }, []);
  const applyWakeLock = useCallback(async () => {
    if (!current.current.screenAwake || document.visibilityState !== 'visible') {
      const sentinel = wakeLock.current;
      if (sentinel) { try { await sentinel.release(); } catch { /* 释放失败仍清除引用。 */ } wakeLock.current = null; }
      return;
    }
    if (!('wakeLock' in navigator) || wakeLock.current) return;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      wakeLock.current = sentinel;
      sentinel.addEventListener('release', () => { wakeLock.current = null; }, { once: true });
    } catch { wakeLock.current = null; }
  }, []);
  const applyRuntime = useCallback(async (feedback = false) => {
    if (current.current.enabled) await startKeepAlive(feedback); else stopKeepAlive(feedback);
    await applyWakeLock();
  }, [startKeepAlive, stopKeepAlive, applyWakeLock]);
  const notifyReply = useCallback(async ({ title = '小手机', body = '收到一条新回复', tag = 'smallphone-reply', url = location.href }: ReplyNotification = {}) => {
    const latest = loadSettings(); current.current = latest; setSettings(latest);
    if (!latest.replyNotification) return false;
    if (latest.notificationSound) playNotificationCue();
    if (latest.notificationVibration && navigator.vibrate) navigator.vibrate([120, 70, 120]);
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    const options: NotificationOptions & { vibrate?: number[] } = { body, tag, data: { url }, silent: !latest.notificationSound };
    if (latest.notificationVibration) options.vibrate = [120, 70, 120];
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) { await registration.showNotification(title, options); return true; }
      }
      new Notification(title, options); return true;
    } catch { return false; }
  }, []);
  useEffect(() => {
    const resume = () => { resumePending.current = false; if (current.current.enabled) void startKeepAlive(); };
    resumeRef.current = resume;
    const visibility = () => { if (document.visibilityState === 'visible') void applyWakeLock(); };
    const revoke = () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
    const notification = (event: Event) => { void notifyReply((event as CustomEvent<ReplyNotification>).detail); };
    const openPage = () => { const next = loadSettings(); current.current = next; setSettings(next); setOpen(true); void applyRuntime(); };
    const unregister = registerDestination('settingBackground', openPage);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('beforeunload', revoke);
    window.addEventListener('qingtuan:notify-reply', notification);
    // 首次开启保活需要等 React 完成隐藏 audio 的挂载。
    const initial = setTimeout(() => { void applyRuntime(); }, 0);
    return () => {
      clearTimeout(initial); document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('pointerdown', resume, true);
      window.removeEventListener('beforeunload', revoke); window.removeEventListener('qingtuan:notify-reply', notification);
      unregister();
      stopKeepAlive(); void wakeLock.current?.release().catch(() => {}); revoke();
    };
  }, [startKeepAlive, stopKeepAlive, applyWakeLock, applyRuntime, notifyReply, registerDestination]);

  const changeVersions=useRef<Partial<Record<keyof BackgroundSettings,number>>>({});
  async function change(key: keyof BackgroundSettings, value: boolean) {
    const revision=(changeVersions.current[key]||0)+1;changeVersions.current[key]=revision;
    // 异步权限弹窗期间也先保留用户刚勾选的状态。
    setSettings({ ...current.current, [key]: value });
    if (key === 'replyNotification' && value) {
      if (!('Notification' in window)) { value = false; showToast('当前浏览器不支持系统通知'); }
      else {
        let permission = Notification.permission;
        if (permission === 'default') { try { permission = await Notification.requestPermission(); } catch { permission = 'denied'; } }
        if (permission !== 'granted') { value = false; showToast('需要允许通知权限，才能开启回复通知'); }
      }
    }
    if(changeVersions.current[key]!==revision)return;
    if (key === 'screenAwake' && value && !('wakeLock' in navigator)) { value = false; showToast('当前浏览器不支持屏幕常亮'); }
    if (!save({ ...current.current, [key]: value })) return;
    if (key === 'enabled') await applyRuntime(true);
    if (key === 'replyNotification') {
      if (value) showToast('回复通知已开启');
      else if ('Notification' in window && Notification.permission === 'granted') showToast('回复通知已关闭');
    }
    if (key === 'notificationSound') showToast(value ? '回复通知提示音已开启' : '回复通知提示音已关闭');
    if (key === 'notificationVibration') {
      if (value && navigator.vibrate) navigator.vibrate(50);
      showToast(value ? '回复通知震动已开启' : '回复通知震动已关闭');
    }
    if (key === 'screenAwake') { await applyWakeLock(); if ('wakeLock' in navigator) showToast(value ? '屏幕常亮已开启' : '屏幕常亮已关闭'); }
  }
  return { settings, open, close: () => setOpen(false), change, audioUrl, audioRef, notifyReply };
}
