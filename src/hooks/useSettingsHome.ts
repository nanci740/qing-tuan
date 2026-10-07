import { useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { nextVisitorCount, SETTINGS_AVATAR_KEY } from '../utils/settingsStorage';

import {useProfileAvatar} from '../providers/ProfileAvatarProvider';

/** 设置首页的计数、头像和文件选择由 React 管理；保留旧存档键与压缩参数。 */
export function useSettingsHome() {
  const [visitorCount] = useState(nextVisitorCount);
  const {avatar,setAvatar,avatarMissing,setAvatarMissing,restoreSidebar}=useProfileAvatar();
  const pendingRestoreSync=useRef(Boolean(avatar));
  useLayoutEffect(()=>{if(!avatarMissing&&pendingRestoreSync.current){pendingRestoreSync.current=false;restoreSidebar();}},[avatarMissing]);
  const avatarInput = useRef<HTMLInputElement>(null);
  const avatarButton = useRef<HTMLButtonElement | null>(null);
  function chooseAvatar(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault(); event.stopPropagation();
    avatarButton.current = event.currentTarget;
    if (!avatarInput.current) return;
    avatarInput.current.value = '';
    avatarInput.current.click();
    requestAnimationFrame(() => avatarButton.current?.blur());
  }
  function changeAvatar(event: ChangeEvent<HTMLInputElement>) {
    event.stopPropagation();
    const file = event.currentTarget.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 320;
        const scale = Math.min(1, maxSize / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
        canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        let dataUrl = '';
        try {
          dataUrl = canvas.toDataURL('image/webp', .86);
          if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/jpeg', .86);
        } catch { dataUrl = canvas.toDataURL('image/jpeg', .86); }
        setAvatar(dataUrl);
        try { localStorage.setItem(SETTINGS_AVATAR_KEY, dataUrl); } catch { /* 与原行为一致。 */ }
        avatarButton.current?.blur();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }
  return { visitorCount, avatar, avatarMissing, avatarInput, chooseAvatar, changeAvatar,
    avatarLoaded: () => setAvatarMissing(false), avatarFailed: () => setAvatarMissing(true) };
}
