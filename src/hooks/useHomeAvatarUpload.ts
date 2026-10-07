import {useProfileAvatar} from '../providers/ProfileAvatarProvider';
import { useRef, useState } from 'react';
import { prepareImage, readImageSlot, saveImageSlots } from '../utils/imageAssets';
import { showToast } from '../utils/toast';
export function useHomeAvatarUpload(key: string) {
  const input = useRef<HTMLInputElement>(null), busy=useRef(false);
  const [localSrc, setLocalSrc] = useState(() => readImageSlot(key));
  const profile=useProfileAvatar();
  const src=key==='avatar_star_custom'?profile.star:localSrc;
  const setSrc=key==='avatar_star_custom'?profile.setStar:setLocalSrc;
  function choose() { if (input.current) { input.current.value = ''; input.current.click(); } }
  async function upload(file?: File) {
    if (!file || busy.current) return;
    busy.current=true;
    try { const data=await prepareImage(file,400,.9);await saveImageSlots({[key]:data});setSrc(data);showToast('头像已保存'); }
    catch { showToast('头像保存失败，请检查图片或浏览器存储空间'); }
    finally { busy.current=false;if(document.activeElement instanceof HTMLElement)document.activeElement.blur(); }
  }
  return { input, src, choose, upload };
}
