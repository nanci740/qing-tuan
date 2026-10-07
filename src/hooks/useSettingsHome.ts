import { prepareImage, saveImageSlots } from '../utils/imageAssets';
import { showToast } from '../utils/toast';
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
  const savingAvatar=useRef(false);
  async function changeAvatar(event: ChangeEvent<HTMLInputElement>) {
    event.stopPropagation();
    const file=event.currentTarget.files?.[0];if(!file||savingAvatar.current)return;
    event.currentTarget.value='';savingAvatar.current=true;
    try {const data=await prepareImage(file,320,.86);await saveImageSlots({[SETTINGS_AVATAR_KEY]:data});setAvatar(data);showToast('头像已保存');}
    catch {showToast('头像保存失败，请检查图片或浏览器存储空间');}
    finally {savingAvatar.current=false;avatarButton.current?.blur();if(document.activeElement instanceof HTMLElement)document.activeElement.blur();}
  }
  return { visitorCount, avatar, avatarMissing, avatarInput, chooseAvatar, changeAvatar,
    avatarLoaded: () => setAvatarMissing(false), avatarFailed: () => setAvatarMissing(true) };
}
