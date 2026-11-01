import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { showToast } from '../../../utils/toast';
import { cleanPhotos, cleanVoice, photoItems, scanStorage, voiceItems } from '../../../utils/storageUsage';
import type { AgedItem, StorageUsage } from '../../../utils/storageUsage';

const DAY = 86400000;
const mb = (bytes: number) => bytes >= 1024 * 1024 * 1024 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.max(.1, bytes / 1024 / 1024).toFixed(1)} MB`;
const RANGES = [[30, '30 天前的'], [7, '7 天前的'], [0, '全部']] as const;
type Kind = 'photos' | 'voice';
const KIND: Record<Kind, { title: string; unit: string; note: string }> = {
  photos: { title: '聊天照片', unit: '张', note: '清掉的照片在聊天里会变成文字照片，点开还看得到他写的画面描述。' },
  voice: { title: '语音', unit: '条', note: '清掉的语音在聊天里会变成文字，内容是转写的那段。' },
};

/** 存储空间：浏览器空间用了多少，各类占多少；聊天照片和语音可以按时间清。 */
export function StorageSettings({ open }: { open: boolean }) {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [cleaning, setCleaning] = useState<{ kind: Kind; items: AgedItem[]; days: number } | null>(null), [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    let live = true; setUsage(null);
    scanStorage().then(next => { if (live) setUsage(next); }).catch(() => {});
    return () => { live = false; };
  }, [open]);
  async function start(kind: Kind) {
    const items = kind === 'photos' ? await photoItems() : voiceItems();
    if (!items.length) { showToast(`没有可以清的${KIND[kind].title}`); return; }
    setCleaning({ kind, items, days: 30 });
  }
  const pick = (days: number) => { const before = days ? Date.now() - days * DAY : Infinity; return cleaning?.items.filter(item => item.at < before) || []; };
  async function confirm() {
    if (!cleaning || busy) return;
    const before = cleaning.days ? Date.now() - cleaning.days * DAY : Infinity;
    if (!pick(cleaning.days).length) return;
    setBusy(true);
    try {
      if (cleaning.kind === 'photos') await cleanPhotos(before); else await cleanVoice(before);
      showToast('清理好了，重新开启中…');
      setTimeout(() => location.reload(), 600);
    } catch (error) { setBusy(false); showToast('清理失败：' + String((error as Error)?.message || error).slice(0, 60)); }
  }
  const ratio = usage?.quota ? usage.used / usage.quota : 0;
  const row = (title: string, note: string, size: number | undefined, action?: Kind | string) => <div className="storage-row">
    <dt>{title}<small>{note}</small></dt><dd>{size === undefined ? '…' : mb(size)}</dd>
    <dd>{action === 'photos' || action === 'voice' ? <PressedButton type="button" className="theme-icon-bottom-btn storage-clean-btn" disabled={!usage} onClick={() => void start(action)}>清理</PressedButton> : action ? <span className="storage-go">{action}</span> : null}</dd>
  </div>;
  return <section className="image-storage-tool backup-tool" id="storageSection" aria-labelledby="storageTitle">
    <div className="image-storage-titlebar"><h3 id="storageTitle">存储空间</h3><div className="image-storage-title-tools" /></div>
    <div className="image-storage-content">
      <div className="image-storage-reclaim"><span>青团机用了</span><strong>{usage ? mb(usage.used) : '…'}</strong></div>
      <div className="storage-bar" role="meter" aria-label="浏览器空间" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}><i style={{ width: `${Math.min(100, Math.max(ratio ? 1.5 : 0, ratio * 100))}%` }} /></div>
      <div className="storage-quota"><span>{usage?.quota ? `浏览器给这个网站约 ${mb(usage.quota)}` : usage ? '这个浏览器没提供空间资讯' : '正在计算…'}</span><span>{usage?.quota ? `${Math.max(ratio ? 1 : 0, Math.round(ratio * 100))}%` : ''}</span></div>
      <dl className="image-storage-summary">
        {row('聊天文字', '聊天记录、群聊', usage?.chatText)}
        {row('聊天照片', '他发的、你发的照片', usage?.photos, 'photos')}
        {row('语音', '聊天里的语音消息', usage?.voice, 'voice')}
        {row('图片和表情', '头像、表情包、壁纸', usage?.images, '用下面\n图片清理')}
        {row('音乐', '播放器里的歌', usage?.music, '在音乐\n设置管理')}
        {row('其他', '记忆、日记、朋友圈、设置', usage?.other)}
      </dl>
      <p className="image-storage-status">{ratio > .8 ? '空间快用满了，浏览器可能会自己清掉资料，先备份再清理。' : '快用满时，浏览器可能会自己清掉资料，记得先备份。'}</p>
    </div>
    {cleaning ? createPortal(<div className="sp-confirm-overlay" onClick={event => { if (event.target === event.currentTarget && !busy) setCleaning(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label={'清理' + KIND[cleaning.kind].title}>
        <div className="sp-confirm-bar"><span className="sp-confirm-title">{'清理' + KIND[cleaning.kind].title}</span></div>
        <div className="sp-confirm-body"><div className="sp-confirm-msg">{'要清掉哪些？'}
          <div className="storage-ranges" role="radiogroup" aria-label="清理范围">
            {RANGES.map(([days, label]) => { const items = pick(days); return <button type="button" role="radio" key={days} aria-checked={cleaning.days === days} className={'storage-range' + (cleaning.days === days ? ' active' : '')} onClick={() => setCleaning({ ...cleaning, days })}>
              <span>{label}</span><small>{items.length ? `${items.length} ${KIND[cleaning.kind].unit} · 约 ${mb(items.reduce((sum, item) => sum + item.size, 0))}` : '没有'}</small>
            </button>; })}
          </div>
          {KIND[cleaning.kind].note + '建议先备份。清完会重新开启。'}
        </div></div>
        <div className="sp-confirm-actions">
          <PressedButton type="button" className="sp-confirm-btn" disabled={busy} onClick={() => setCleaning(null)}>取消</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" disabled={busy || !pick(cleaning.days).length} onClick={() => void confirm()}>{busy ? '清理中…' : '清理'}</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}
  </section>;
}
