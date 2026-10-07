import { useSettingsNavigation } from './useSettingsNavigation';
import { useEffect, useRef, useState } from 'react';
export const PROFILE_TEXT_KEYS = ['personal_profile_name', 'personal_profile_birthday', 'personal_profile_mbti', 'personal_profile_location', 'personal_profile_mood', 'personal_profile_special', 'personal_profile_love_1', 'personal_profile_love_2', 'personal_profile_love_3', 'personal_profile_love_4', 'personal_profile_dislike_1', 'personal_profile_dislike_2', 'personal_profile_dislike_3'];
export function readProfileText(key: string, fallback = '') { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
function saveText(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* 原存储回退。 */ } }
export function usePersonalProfile() {
  const { registerDestination } = useSettingsNavigation();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState(() => readProfileText('personal_profile_polaroid_photo'));
  const [mood, setMood] = useState(() => readProfileText('personal_profile_mood'));
  const [counter] = useState(() => {
    let today = 1, total = 1;
    try {
      total = parseInt(localStorage.getItem('qingtuan_visitor_count') || '', 10) || 1;
      const d = new Date().toDateString();
      const saved = JSON.parse(localStorage.getItem('qingtuan_profile_today') || '{}');
      today = saved.d === d ? (saved.n || 0) + 1 : 1;
      localStorage.setItem('qingtuan_profile_today', JSON.stringify({ d, n: today }));
    } catch { /* 原访客计数回退。 */ }
    return { today, total };
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const lines = useRef<(HTMLInputElement | null)[]>([]);
  const focusTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const enter = async () => {
      if (document.fonts?.load) { try { await Promise.all([document.fonts.load('16.5px Georgia'), document.fonts.load('italic 10px Georgia'), document.fonts.load('15px "LXGW WenKai TC"', '个人信息')]); } catch { /* 原字体回退。 */ } }
      setOpen(true);
    };
    const unregister = registerDestination('settingPersonal', enter);
    const close = () => setOpen(false);
    window.addEventListener('qingtuan:close-settings', close);
    return () => { window.removeEventListener('qingtuan:close-settings', close); unregister(); focusTimers.current.forEach(clearTimeout); };
  }, [registerDestination]);
  function changeMood(value: string) { setMood(value); saveText('personal_profile_mood', value); }
  function choosePhoto() { if (fileRef.current) { fileRef.current.value = ''; fileRef.current.click(); } }
  function changePhoto(file?: File) {
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 700 / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.86); setPhoto(data);
        try { localStorage.setItem('personal_profile_polaroid_photo', data); } catch (err) { console.warn('个人信息拍立得照片保存失败:', err); }
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }
  function nextLine(index: number) { if (lines.current[index + 1]) focusTimers.current.push(setTimeout(() => lines.current[index + 1]?.focus(), 0)); }
  return { open, close: () => setOpen(false), photo, mood, counter, fileRef, lines, nextLine, changeMood, choosePhoto, changePhoto };
}
export function useProfileText(key: string, fallback = '') {
  const [value, setValue] = useState(() => readProfileText(key, fallback));
  return [value, (next: string) => { setValue(next); saveText(key, next); }] as const;
}
