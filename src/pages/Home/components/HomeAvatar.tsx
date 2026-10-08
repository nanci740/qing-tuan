import { useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { DEFAULT_BIRD_AVATAR, DEFAULT_FOX_AVATAR } from '../../../utils/defaultAvatar';
export function HomeAvatar({ className: _className, src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failedSource, setFailedSource] = useState<string>();
  const fallback = props.id === 'starAvatarImg' ? DEFAULT_BIRD_AVATAR : DEFAULT_FOX_AVATAR;
  return <img {...props} src={!src || src === failedSource ? fallback : src} onError={() => setFailedSource(src)} />;
}
