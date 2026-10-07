import { useEffect, useRef, useState } from 'react';

export function SaveToast() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    function show(event: Event) {
      const message = (event as CustomEvent<string>).detail;
      if (!message) return;
      setMessage(message);
      setVisible(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), 1600);
    }
    window.addEventListener('qingtuan:toast', show);
    return () => { window.removeEventListener('qingtuan:toast', show); clearTimeout(timer.current); };
  }, []);
  return <div id="saveToast" className={`save-toast${visible ? ' show' : ''}`} aria-live="polite" aria-atomic="true">{message}</div>;
}
