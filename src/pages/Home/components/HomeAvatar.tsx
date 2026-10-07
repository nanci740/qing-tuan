import { useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
/** 图片载入状态和上传后的源由 React 管理。 */
export function HomeAvatar({ className: _className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [missing,setMissing]=useState(true);
  return <img {...props} className={missing?'avatar-missing':''} onError={()=>setMissing(true)} onLoad={()=>setMissing(false)} />;
}
