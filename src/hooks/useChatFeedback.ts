import { useEffect, useRef } from 'react';
import type { ChatPreferences } from '../types/chatPreferences';
/** 原发送 / 收到消息提示音与震动；音频实例归 React ref 持有。 */
export function useChatFeedback() {
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => () => { void audio.current?.close().catch(() => {}); audio.current = null; }, []);
  return (kind: 'send' | 'receive', preferences: ChatPreferences) => {
    if (preferences.soundFeedback) {
      try {
        const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audio.current = audio.current || new AudioContextClass();
          const context = audio.current;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = kind === 'receive' ? 610 : 480;
          oscillator.type = 'sine';
          gain.gain.setValueAtTime(.0001, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(.045, context.currentTime + .01);
          gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .09);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start(); oscillator.stop(context.currentTime + .1);
        }
      } catch { /* 原环境不支持或调用失败时保持静默。 */ }
    }
    if (preferences.vibrationFeedback && navigator.vibrate) {
      try { navigator.vibrate(kind === 'receive' ? [15, 28, 15] : 12); } catch { /* 原设备回退。 */ }
    }
  };
}
