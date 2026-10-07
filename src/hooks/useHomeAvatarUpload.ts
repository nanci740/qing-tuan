import { useRef, useState } from 'react';
function read(key: string) { try { return localStorage.getItem(key) || ''; } catch { return ''; } }
export function useHomeAvatarUpload(key: string) {
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState(() => read(key));
  function choose() { if (input.current) { input.current.value = ''; input.current.click(); } }
  function upload(file?: File) {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 400 / Math.max(image.width, image.height));
          canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
          const context = canvas.getContext('2d'); if (!context) return;
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.9); setSrc(compressed);
          try { localStorage.setItem(key, compressed); } catch { /* 原存储回退。 */ }
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    }
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }
  return { input, src, choose, upload };
}
