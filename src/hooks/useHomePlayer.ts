import { defaultHomeTexts as defaults, useHomeTexts } from '../providers/HomeTextsProvider';
import { useMusic } from '../providers/MusicProvider';
import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, TouchEvent } from 'react';
interface Note { id: number; char: string; style: CSSProperties }
function read(key: string, fallback = '') { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
function save(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* 原储存回退。 */ } }
export function formatPlayerTime(sec: number) { const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return `${m}:${s < 10 ? '0' : ''}${s}`; }
export function useHomePlayer() {
  const music = useMusic();
  const audio = music.audio;
  const progressBar = useRef<HTMLDivElement>(null);
  const seeking = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(320);
  const [liked, setLiked] = useState(() => read('qingtuan_player_heart_liked') === 'true');
  const [starred, setStarred] = useState(() => read('qingtuan_player_star_starred') === 'true');
  const { texts, setText } = useHomeTexts();
  const [notes, setNotes] = useState<Note[]>([]);
  const latest = useRef({ playing, duration }); latest.current = { playing, duration };
  const noteId = useRef(0);
  const noteTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const notesEnabled = useRef(music.showNotes); notesEnabled.current = music.showNotes;
  useLayoutEffect(() => {
    const progressTimer = setInterval(() => {
      if (latest.current.playing && !audio.current?.src) setProgress(value => value + 1 >= latest.current.duration ? 0 : value + 1);
    }, 1000);
    const noteChars = ['♪', '♫', '♩', '♬', '⋆', '𝜗𝜚', '✦'];
    const notesTimer = setInterval(() => {
      if (!latest.current.playing || document.visibilityState === 'hidden' || !notesEnabled.current) return;
      const id = ++noteId.current;
      const char = noteChars[Math.floor(Math.random() * noteChars.length)];
      const style = { left: (15 + Math.random() * 70) + '%', '--rand-x': (Math.random() * 40 - 20) + 'px', '--rand-rot': (Math.random() * 40 - 20) + 'deg' } as CSSProperties;
      setNotes(current => [...current, { id, char, style }]);
      const timer = setTimeout(() => { setNotes(current => current.filter(note => note.id !== id)); noteTimers.current.delete(timer); }, 2800); noteTimers.current.add(timer);
    }, 1800);
    const reset = () => { setProgress(0); setDuration(320); };
    window.addEventListener('qingtuan:player-reset', reset);
    function seek(clientX: number) {
      if (audio.current?.src || !progressBar.current) return;
      const rect = progressBar.current.getBoundingClientRect();
      setProgress(Math.floor(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * latest.current.duration));
    }
    const move = (event: globalThis.MouseEvent) => { if (seeking.current) seek(event.clientX); };
    const touch = (event: globalThis.TouchEvent) => { if (seeking.current && event.touches[0]) seek(event.touches[0].clientX); };
    const stop = () => { seeking.current = false; };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', stop);
    window.addEventListener('touchmove', touch, { passive: true }); window.addEventListener('touchend', stop);
    return () => {
      clearInterval(progressTimer); clearInterval(notesTimer); noteTimers.current.forEach(clearTimeout);
      window.removeEventListener('qingtuan:player-reset', reset);
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); window.removeEventListener('touchmove', touch); window.removeEventListener('touchend', stop);
    };
  }, []);
  function seek(clientX: number) {
    if (audio.current?.src || !progressBar.current) return;
    const rect = progressBar.current.getBoundingClientRect(); setProgress(Math.floor(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration));
  }
  function changeText(id: keyof typeof defaults, value: string, blur = false) {
    const next = blur ? (id === 'songDetails' && value.trim() ? value : value.trim() || defaults[id]) : value;
    setText(id, next, true);
    if (id === 'songTitle') window.dispatchEvent(new CustomEvent('qingtuan:rename-track', { detail: next }));
  }
  function onMetadata() { if (audio.current && Number.isFinite(audio.current.duration) && audio.current.duration > 0) { setDuration(audio.current.duration); setProgress(audio.current.currentTime || 0); } }
  function onTimeUpdate() { if (audio.current) { setProgress(audio.current.currentTime || 0); if (Number.isFinite(audio.current.duration) && audio.current.duration > 0) setDuration(audio.current.duration); } }
  return { audio, progressBar, playing, progress, duration, liked, starred, texts, notes, miniCover: music.miniCover, onEnded: music.onEnded,
    togglePlay: () => { void music.togglePlay(); if (!audio.current?.src) setPlaying(value => !value); },
    moveTrack: (delta: number) => { void music.moveTrack(delta); if (!audio.current?.src) setProgress(0); },
    toggleLike: () => { const value = !liked; setLiked(value); save('qingtuan_player_heart_liked', String(value)); },
    toggleStar: () => { const value = !starred; setStarred(value); save('qingtuan_player_star_starred', String(value)); },
    onClickSeek: (event: MouseEvent) => { music.seek(event.clientX, progressBar.current); seek(event.clientX); },
    onMouseDownSeek: (event: MouseEvent) => { seeking.current = true; seek(event.clientX); },
    onTouchStartSeek: (event: TouchEvent) => { seeking.current = true; if (event.touches[0]) seek(event.touches[0].clientX); },
    onMetadata, onTimeUpdate, onPlay: () => setPlaying(true), onPause: () => setPlaying(false), changeText,
  };
}
