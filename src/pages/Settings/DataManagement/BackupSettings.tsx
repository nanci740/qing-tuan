import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { PressedButton } from '../../../components/shared/PressedButton';
import { confirmChat } from '../../../utils/chatConfirm';
import { showToast } from '../../../utils/toast';
import { createBackup, readBackup, readBackupMeta, restoreBackup, scanBackup, updateBackupMeta } from '../../../utils/fullBackup';
import type { BackupInclude, BackupMeta, BackupPart } from '../../../utils/fullBackup';

const size = (bytes: number) => `${Math.max(.1, bytes / 1024 / 1024).toFixed(1)} MB`;
const when = (at: number) => { const d = new Date(at); return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const PARTS: [BackupPart, string, string][] = [['images', '图片和表情', '头像、聊天照片、表情包、壁纸'], ['voice', '语音', '聊天里的语音消息'], ['music', '音乐', '播放器里的歌'], ['keys', 'API Key', '勾了的话，这个文件不要传给别人']];
const PART_NAME: Record<BackupPart, string> = { images: '图片和表情', voice: '语音', music: '音乐', keys: 'API Key' };

function Check({ on }: { on: boolean }) {
  return <i className={'backup-check' + (on ? ' is-on' : '')} aria-hidden="true" />;
}

/** 整机备份：勾要带哪些、备份到文件、从文件还原，还有多久提醒一次。 */
export function BackupSettings({ open }: { open: boolean }) {
  const [sizes, setSizes] = useState<Awaited<ReturnType<typeof scanBackup>> | null>(null);
  const [include, setInclude] = useState<BackupInclude>({ images: true, voice: true, music: false, keys: false });
  const [meta, setMeta] = useState<BackupMeta>(readBackupMeta), [busy, setBusy] = useState(''), file = useRef<HTMLInputElement>(null);
  // 浏览器保护（持久化储存）：on 已开启、off 没开、none 这个浏览器不支持
  const [kept, setKept] = useState<'on' | 'off' | 'none' | ''>('');
  useEffect(() => {
    if (!open) return;
    let live = true; setSizes(null); setMeta(readBackupMeta());
    if (!navigator.storage?.persisted) setKept('none'); else navigator.storage.persisted().then(on => { if (live) setKept(on ? 'on' : 'off'); }).catch(() => { if (live) setKept('none'); });
    scanBackup().then(next => { if (live) setSizes(next); }).catch(() => { if (live) setSizes({ core: 0, images: 0, voice: 0, music: 0, keys: 0 }); });
    return () => { live = false; };
  }, [open]);
  const total = sizes ? sizes.core + PARTS.reduce((sum, [part]) => sum + (include[part] ? sizes[part] : 0), 0) : 0;
  function remind(value: BackupMeta['remind']) { updateBackupMeta({ remind: value }); setMeta(readBackupMeta()); }
  async function protect() {
    try {
      const on = await navigator.storage.persist();
      setKept(on ? 'on' : 'off');
      showToast(on ? '已开启浏览器保护' : '浏览器没有同意，记得常备份；把青团机加到主画面再试，比较容易成功');
    } catch { setKept('none'); }
  }
  async function backup() {
    if (busy) return;
    setBusy('正在备份…');
    try {
      const blob = await createBackup(include), url = URL.createObjectURL(blob), link = document.createElement('a'), d = new Date();
      link.href = url; link.download = `qingtuan-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      updateBackupMeta({ last: Date.now() }); setMeta(readBackupMeta()); showToast('备份好了');
    } catch (error) { showToast('备份失败：' + String((error as Error)?.message || error).slice(0, 60)); }
    finally { setBusy(''); }
  }
  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.currentTarget.files?.[0]; event.currentTarget.value = '';
    if (!picked || busy) return;
    try {
      const backup = await readBackup(picked), { at, stats, include: had } = backup.header, d = new Date(at);
      const missing = PARTS.filter(([part]) => part !== 'keys' && !had[part]).map(([part]) => PART_NAME[part]);
      const message = `备份时间：${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}\n` +
        `${stats.characters} 个角色、${stats.messages} 条聊天${had.images ? `、图片 ${stats.images} 张` : ''}${had.music ? `、音乐 ${stats.tracks} 首` : ''}\n` +
        (missing.length ? `没有备份${missing.join('、')}（现在手机里的也会清掉）\n` : '') + (had.keys === false ? '没有备份 API Key（会沿用这台手机现在的）\n' : '') + '\n现在手机里的资料会整份换成这份备份，没办法复原。还原完会自动重新开启。';
      if (!await confirmChat({ title: '还原这份备份？', message, confirmText: '还原', danger: true })) return;
      setBusy('正在还原…');
      await restoreBackup(backup);
      location.reload();
    } catch (error) { setBusy(''); showToast(String((error as Error)?.message || error).slice(0, 80)); }
  }
  return <section className="image-storage-tool backup-tool" id="backupSection" aria-labelledby="backupTitle">
    <div className="image-storage-titlebar"><h3 id="backupTitle">整机备份</h3><div className="image-storage-title-tools" /></div>
    <div className="image-storage-content" aria-busy={!!busy}>
      <div className="image-storage-intro">
        <svg className="image-storage-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M4 3h13l3 3v15H4z" /><path d="M8 3v5h8V3" /><rect x="7" y="13" width="10" height="8" /><path d="M13 4.5v2" /></svg>
        <p>把整台青团机存成一个文件<span>换手机、换浏览器、清缓存之前，先备份一次。</span></p>
      </div>
      <div className="backup-last"><span>上次备份</span><span>{meta.last ? when(meta.last) : '还没备份过'}</span></div>
      <div className="backup-list">
        <div className="backup-row is-locked"><Check on /><span>聊天和角色<small>聊天记录、角色、群聊、通讯录</small></span></div>
        <div className="backup-row is-locked"><Check on /><span>记忆、日记、朋友圈<small>还有账本、备忘录、钱包</small></span></div>
        <div className="backup-row is-locked"><Check on /><span>设置和美化<small>模型、预设、世界书、主题、字体</small></span></div>
        {PARTS.map(([part, title, note]) => <button type="button" role="checkbox" aria-checked={include[part]} key={part} className={'backup-row' + (include[part] ? '' : ' is-off')} onClick={() => setInclude(value => ({ ...value, [part]: !value[part] }))}>
          <Check on={include[part]} /><span>{title}<small>{note}</small></span><span className="backup-size">{part === 'keys' ? '' : sizes ? size(sizes[part]) : '…'}</span>
        </button>)}
      </div>
      <p className="image-storage-status" role="status">{busy || (sizes ? `备份文件约 ${size(total)}` : '正在计算大小…')}</p>
      <div className="backup-option">
        <div className="theme-option-title"><span>提醒我备份</span><span className="theme-option-value">{({ week: '每周', month: '每月', off: '不提醒' })[meta.remind]}</span></div>
        <div className="theme-segmented" role="radiogroup" aria-label="提醒我备份">
          {([['week', '每周'], ['month', '每月'], ['off', '不提醒']] as const).map(([value, label]) => <button type="button" role="radio" key={value} aria-checked={meta.remind === value} className={'theme-segment-btn' + (meta.remind === value ? ' active' : '')} onClick={() => remind(value)}>{label}</button>)}
        </div>
        <span className="theme-setting-note">时间到了，打开设置时会问你一次。</span>
      </div>
      <div className="backup-option">
        <div className="theme-option-title"><span>浏览器保护</span><span className="theme-option-value">{kept === 'on' ? '已开启' : kept === 'none' ? '不支持' : kept === 'off' ? '没开' : ''}</span></div>
        {kept === 'off' && <PressedButton type="button" className="theme-icon-bottom-btn backup-protect-btn" onClick={() => void protect()}>申请保护</PressedButton>}
        <span className="theme-setting-note">{kept === 'none' ? '这个浏览器不支持，记得常备份。' : '降低浏览器自己清掉资料的机率，不能代替备份。'}</span>
      </div>
      <div className="image-storage-scope"><p className="image-storage-note">前三项一定会备份。还原会把现在手机里的资料整份换掉，没带进备份的那几类也会清空，还原前会先问你；没带 API Key 的话，还原后沿用这台手机现在的。</p></div>
      <div className="theme-icon-bottom-actions">
        <PressedButton type="button" className="theme-icon-bottom-btn" disabled={!!busy} onClick={() => file.current?.click()}>从文件还原</PressedButton>
        <PressedButton type="button" className="theme-icon-bottom-btn primary ui-cyan-btn" disabled={!!busy || !sizes} onClick={() => void backup()}>备份到文件</PressedButton>
      </div>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={event => void restore(event)} />
    </div>
  </section>;
}
