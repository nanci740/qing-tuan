import { kv } from '../utils/kvStorage';
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
  /** 强力保活：除了无声音频，再开一个背景计时器（Worker）定时叫醒网页。 */
  strong: boolean;
  /** 提示音是哪一种（NOTIFICATION_SOUNDS）。 */
  sound: string;
}
export interface ReplyNotification { title?: string; body?: string; tag?: string; url?: string }
const STORAGE_KEY = 'smallphone_background_activity_v1';
const defaults: BackgroundSettings = { enabled: false, replyNotification: false, notificationSound: true, notificationVibration: true, screenAwake: false, strong: false, sound: 'ding' };
function loadSettings(): BackgroundSettings {
  try { return { ...defaults, ...(JSON.parse(kv.getItem(STORAGE_KEY) || 'null') || {}) }; }
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

/** 提示音：都是当场合成的，音量跟原本的「叮」差不多。 */
export const NOTIFICATION_SOUNDS = [['ding', '叮'], ['pop', '啵'], ['bell', '铃铛'], ['drop', '水滴'], ['call', '来电'], ['musicbox', '八音盒'], ['chime', '风铃']] as const;
export type NotificationSound = typeof NOTIFICATION_SOUNDS[number][0];
interface Tone { freq: number; to?: number; at?: number; dur: number; type?: OscillatorType; gain?: number }
const CUES: Record<NotificationSound, Tone[]> = {
  ding: [{ freq: 660, dur: .2 }],
  pop: [{ freq: 900, to: 280, dur: .09, gain: .07 }],
  bell: [{ freq: 1320, dur: .35, type: 'triangle' }, { freq: 1760, at: .13, dur: .4, type: 'triangle' }],
  drop: [{ freq: 1400, to: 520, dur: .13 }, { freq: 900, to: 700, at: .16, dur: .06, gain: .025 }],
  call: [0, .15, .3].map(at => ({ freq: 1000, at, dur: .08, type: 'square' as const, gain: .02 })),
  musicbox: [1319, 1568, 2093, 1568].map((freq, index) => ({ freq, at: index * .13, dur: .3, type: 'triangle' as const, gain: .045 })),
  chime: [2093, 2637, 2349, 3136].map((freq, index) => ({ freq, at: index * .09 + (index % 2) * .02, dur: .7, gain: .03 })),
};
export function playNotificationCue(sound: string = 'ding') {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass(), tones = CUES[sound as NotificationSound] || CUES.ding, now = context.currentTime;
    let end = 0;
    for (const { freq, to, at = 0, dur, type = 'sine', gain: peak = .055 } of tones) {
      const oscillator = context.createOscillator(), gain = context.createGain(), start = now + at;
      oscillator.type = type; oscillator.frequency.setValueAtTime(freq, start);
      if (to) oscillator.frequency.exponentialRampToValueAtTime(to, start + dur);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(start); oscillator.stop(start + dur + .02);
      end = Math.max(end, at + dur);
    }
    setTimeout(() => { void context.close().catch(() => {}); }, (end + .3) * 1000);
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
  const heartbeat = useRef<Worker | null>(null);
  // 保活状态：无声音频真的在播就是在跑；被手机拦住就是被暂停了
  const [alive, setAlive] = useState(false);
  const checkAlive = useCallback(() => setAlive(!!audioRef.current && !audioRef.current.paused), []);

  const save = useCallback((next: BackgroundSettings) => {
    try {kv.setItem(STORAGE_KEY, JSON.stringify(next));}
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
  /** 强力保活的背景计时器：每 20 秒叫醒一次网页，顺手把被暂停的无声音频接着播。 */
  const applyHeartbeat = useCallback(() => {
    if (current.current.enabled && current.current.strong) {
      if (heartbeat.current || typeof Worker === 'undefined') return;
      try {
        const url = URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 20000);'], { type: 'text/javascript' }));
        heartbeat.current = new Worker(url); URL.revokeObjectURL(url);
        heartbeat.current.onmessage = () => { const audio = audioRef.current; if (current.current.enabled && audio?.paused) void audio.play().catch(() => {}); checkAlive(); };
      } catch { heartbeat.current = null; }
    } else { heartbeat.current?.terminate(); heartbeat.current = null; }
  }, [checkAlive]);
  const applyRuntime = useCallback(async (feedback = false) => {
    if (current.current.enabled) await startKeepAlive(feedback); else stopKeepAlive(feedback);
    applyHeartbeat(); checkAlive();
    await applyWakeLock();
  }, [startKeepAlive, stopKeepAlive, applyWakeLock, applyHeartbeat, checkAlive]);
  const notifyReply = useCallback(async ({ title = '小手机', body = '收到一条新回复', tag = 'smallphone-reply', url = location.href }: ReplyNotification = {}) => {
    const latest = loadSettings(); current.current = latest; setSettings(latest);
    if (!latest.replyNotification) return false;
    if (latest.notificationSound) playNotificationCue(latest.sound);
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
    const resume = () => { resumePending.current = false; if (current.current.enabled) void startKeepAlive().then(checkAlive); };
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
      stopKeepAlive(); heartbeat.current?.terminate(); heartbeat.current = null; void wakeLock.current?.release().catch(() => {}); revoke();
    };
  }, [startKeepAlive, stopKeepAlive, applyWakeLock, applyRuntime, notifyReply, registerDestination, checkAlive]);

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
    if (key === 'strong') { await applyRuntime(); showToast(value ? '已换成强力保活' : '已换成轻量保活'); }
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
  /** 测试通知：照现在的设定（提示音、震动）发一则。 */
  async function testNotification() {
    if (!current.current.replyNotification) { showToast('先打开回复通知'); return; }
    const sent = await notifyReply({ title: '青团机', body: '这是一则测试通知 ♪', tag: 'smallphone-test' });
    if (sent) showToast('发出去了；没看到的话，检查手机里这个浏览器的通知设定');
    else showToast('没发出去：浏览器没有允许通知，请到浏览器或手机设定里打开');
  }
  /** 无声音频被手机暂停了：等你下一次轻触页面就接着播。 */
  const paused = useCallback(() => {
    checkAlive();
    if (!current.current.enabled || resumePending.current) return;
    resumePending.current = true;
    document.addEventListener('pointerdown', resumeRef.current, { once: true, capture: true });
  }, [checkAlive]);
  // 打开这页时每几秒看一次保活还在不在跑
  useEffect(() => {
    if (!open) return;
    checkAlive();
    const timer = setInterval(checkAlive, 3000);
    return () => clearInterval(timer);
  }, [open, checkAlive]);
  /** 换提示音：存起来，顺便试听一次。 */
  function setSound(sound: string) { if (save({ ...current.current, sound })) playNotificationCue(sound); }
  return { settings, open, close: () => setOpen(false), change, setSound, audioUrl, audioRef, notifyReply, testNotification, alive, paused, playing: checkAlive };
}
