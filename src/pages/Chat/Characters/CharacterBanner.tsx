import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { useCharacterAvatar } from '../../../hooks/useCharacterAvatar';

/** 顶部资料由 React 状态显示；初次打开前保留原来未填充的节点及属性。 */
export function CharacterBanner() {
  const { bridge, record, rendered, input, bindTools, upload } = useCharacterAvatar();
  const name = rendered ? (record.name || record.nickname || '').trim() || '新角色' : '';
  const text = (field: 'quote' | 'relationship' | 'mbti' | 'constellation') => rendered ? record[field] || '' : '';
  const hidden = (value: unknown) => rendered ? !value : undefined;
  return bridge ? createPortal(<>
    {'\n                '}<PressedButton className="cc-avatar" type="button" aria-label="更换头像" onClick={() => input.current?.click()}><img alt="" hidden={hidden(record.photoUrl)} src={record.photoUrl || undefined} /><span className="cc-avatar-empty" hidden={rendered ? Boolean(record.photoUrl) : undefined}>上传<br />头像</span></PressedButton>
    {'\n                '}<input className="cc-avatar-input" type="file" accept="image/*" hidden ref={input} onChange={event => { void upload(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
    {'\n                '}<div className="cc-banner-text">
      {'\n                    '}<div className="cc-banner-name"><b data-cc-show="name" hidden={hidden(name)}>{name}</b><span className="cc-status">在线</span></div>
      {'\n                    '}<div className="cc-banner-quote" data-cc-show="quote" hidden={hidden(text('quote'))}>{text('quote')}</div>
      {'\n                    '}<div className="cc-banner-chips"><span data-cc-show="relationship" hidden={hidden(text('relationship'))}>{text('relationship')}</span><span data-cc-show="mbti" hidden={hidden(text('mbti'))}>{text('mbti')}</span><span data-cc-show="constellation" hidden={hidden(text('constellation'))}>{text('constellation')}</span></div>
      {'\n                '}</div>
    {'\n                '}<div className="cc-banner-tools" ref={bindTools} />
    {'\n            '}
  </>, bridge.banner) : null;
}
