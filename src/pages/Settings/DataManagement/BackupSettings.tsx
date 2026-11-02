import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ChangeEvent } from 'react';
import { PressedButton } from '../../../components/shared/PressedButton';
import { confirmChat } from '../../../utils/chatConfirm';
import { showToast } from '../../../utils/toast';
import { checkBackup, createBackup, mergeBackup, mergeChoices, readBackup, readBackupMeta, restoreBackup, scanBackup, updateBackupMeta } from '../../../utils/fullBackup';
import type { BackupFile, BackupInclude, BackupMeta, BackupPart, MergePick } from '../../../utils/fullBackup';

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
  const [restoring, setRestoring] = useState<{ backup: BackupFile; mode: 'all' | 'pick'; choices: ReturnType<typeof mergeChoices>; pick: MergePick } | null>(null);
  useEffect(() => {
    if (!open) return;
    let live = true; setSizes(null); setMeta(readBackupMeta());
    if (!navigator.storage?.persisted) setKept('none'); else navigator.storage.persisted().then(on => { if (live) setKept(on ? 'on' : 'off'); }).catch(() => { if (live) setKept('none'); });
    scanBackup().then(next => { if (live) setSizes(next); }).catch(() => { if (live) setSizes({ core: 0, images: 0, voice: 0, music: 0, keys: 0, photos: [] }); });
    return () => { live = false; };
  }, [open]);
  // 聊天照片只带最近几天：图片那一项扣掉更早的照片
  const older = sizes && include.photoDays ? sizes.photos.filter(photo => photo.at < Date.now() - include.photoDays! * 86400000).reduce((sum, photo) => sum + photo.size, 0) : 0;
  const partSize = (part: BackupPart) => sizes ? (part === 'images' ? sizes.images - older : sizes[part]) : 0;
  const total = sizes ? sizes.core + PARTS.reduce((sum, [part]) => sum + (include[part] ? partSize(part) : 0), 0) : 0;
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
    setBusy('正在检查…');
    const problems = await checkBackup(include).catch(error => [String((error as Error)?.message || error)]);
    if (problems.length && !await confirmChat({ title: '备份可能不完整', message: problems.join('\n') + '\n\n照这样备份，这些东西不会在文件里。建议先重新开启青团机再备份。', confirmText: '还是备份', cancelText: '先不要' })) { setBusy(''); return; }
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
      const backup = await readBackup(picked);
      setRestoring({ backup, mode: 'all', choices: mergeChoices(backup), pick: { chats: [], memories: false, diary: false, moments: false, worlds: false } });
    } catch (error) { showToast(String((error as Error)?.message || error).slice(0, 80)); }
  }
  async function confirmRestore() {
    if (!restoring || busy) return;
    setBusy(restoring.mode === 'all' ? '正在还原…' : '正在拿回来…');
    try {
      if (restoring.mode === 'all') await restoreBackup(restoring.backup);
      else { await mergeBackup(restoring.backup, restoring.pick); showToast('拿回来了，重新开启中…'); }
      setTimeout(() => location.reload(), restoring.mode === 'all' ? 0 : 600);
    } catch (error) { setBusy(''); showToast(String((error as Error)?.message || error).slice(0, 80)); }
  }
  /** 整份换掉之前写给你看的：几个角色、几条聊天、没带哪些。 */
  function summary(header: BackupFile['header']) {
    const { stats, include: had } = header, missing = PARTS.filter(([part]) => part !== 'keys' && !had[part]).map(([part]) => PART_NAME[part]);
    return `${stats.characters} 个角色、${stats.messages} 条聊天${had.images ? `、图片 ${stats.images} 张` : ''}${had.music ? `、音乐 ${stats.tracks} 首` : ''}\n` +
      (missing.length ? `没有备份${missing.join('、')}（现在手机里的也会清掉）\n` : '') + (had.keys === false ? '没有备份 API Key（会沿用这台手机现在的）\n' : '') +
      (had.images && had.photoDays ? `聊天照片只有最近 ${had.photoDays} 天的（更早的会变成文字照片）\n` : '') + '现在手机里的资料会整份换成这份备份，没办法复原。还原完会自动重新开启。';
  }
  const pickCount = restoring ? restoring.pick.chats.length + (['memories', 'diary', 'moments', 'worlds'] as const).filter(kind => restoring.pick[kind]).length : 0;
  const setPick = (patch: Partial<MergePick>) => setRestoring(value => value && { ...value, pick: { ...value.pick, ...patch } });
  const when2 = (at: number) => { const d = new Date(at); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
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
          <Check on={include[part]} /><span>{title}<small>{note}</small></span><span className="backup-size">{part === 'keys' ? '' : sizes ? size(partSize(part)) : '…'}</span>
        </button>).flatMap((button, index) => PARTS[index][0] === 'images' && include.images ? [button, <div className="backup-row backup-sub" key="photoDays"><small>聊天照片只带</small>
          <span className="theme-segmented" role="radiogroup" aria-label="聊天照片只带">
            {([[0, '全部'], [7, '最近 7 天'], [3, '最近 3 天']] as const).map(([days, label]) => <button type="button" role="radio" key={days} aria-checked={(include.photoDays || 0) === days} className={'theme-segment-btn' + ((include.photoDays || 0) === days ? ' active' : '')} onClick={() => setInclude(value => ({ ...value, photoDays: days }))}>{label}</button>)}
          </span></div>] : [button])}
      </div>
      <p className="image-storage-status" role="status">{busy || (sizes ? `备份文件约 ${size(total)}` : '正在计算大小…')}</p>
      <div className="backup-remind"><span>提醒我备份</span>
        <span className="theme-segmented" role="radiogroup" aria-label="提醒我备份">
          {([['week', '每周'], ['month', '每月'], ['off', '不提醒']] as const).map(([value, label]) => <button type="button" role="radio" key={value} aria-checked={meta.remind === value} className={'theme-segment-btn' + (meta.remind === value ? ' active' : '')} onClick={() => remind(value)}>{label}</button>)}
        </span>
      </div>
      <div className="backup-remind"><span>浏览器保护<small>降低浏览器自己清掉资料的机率，不能代替备份</small></span>
        {kept === 'on' ? <span className="backup-kept">已开启</span> : kept === 'none' ? <span className="backup-kept is-off">这个浏览器不支持</span>
          : kept === 'off' ? <PressedButton type="button" className="theme-icon-bottom-btn backup-protect-btn" onClick={() => void protect()}>申请保护</PressedButton> : null}
      </div>
      <div className="image-storage-scope"><p className="image-storage-note">前三项一定会备份。还原会把现在手机里的资料整份换掉，没带进备份的那几类也会清空，还原前会先问你；没带 API Key 的话，还原后沿用这台手机现在的。</p></div>
      <div className="theme-icon-bottom-actions">
        <PressedButton type="button" className="theme-icon-bottom-btn" disabled={!!busy} onClick={() => file.current?.click()}>从文件还原</PressedButton>
        <PressedButton type="button" className="theme-icon-bottom-btn primary ui-cyan-btn" disabled={!!busy || !sizes} onClick={() => void backup()}>备份到文件</PressedButton>
      </div>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={event => void restore(event)} />
    </div>
    {restoring ? createPortal(<div className="sp-confirm-overlay" onClick={event => { if (event.target === event.currentTarget && !busy) setRestoring(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="怎么还原">
        <div className="sp-confirm-bar"><span className="sp-confirm-title">怎么还原？</span></div>
        <div className="sp-confirm-body"><div className="sp-confirm-msg">
          {'备份时间：' + when2(restoring.backup.header.at)}
          <div className="restore-modes" role="radiogroup" aria-label="还原方式">
            {([['all', '整份换掉', '手机里的资料整份换成这份备份'], ['pick', '只拿回某几样', '勾的那几样合并回来，其他的不动']] as const).map(([mode, title, note]) =>
              <button type="button" role="radio" key={mode} aria-checked={restoring.mode === mode} className={'restore-mode' + (restoring.mode === mode ? ' active' : '')} onClick={() => setRestoring({ ...restoring, mode })}><span>{title}</span><small>{note}</small></button>)}
          </div>
          {restoring.mode === 'all' ? <p className="restore-note">{summary(restoring.backup.header)}</p> : <>
            <div className="backup-list restore-list">
              {restoring.choices.chats.length ? <button type="button" role="checkbox" aria-checked={restoring.pick.chats.length === restoring.choices.chats.length} className="backup-row" onClick={() => setPick({ chats: restoring.pick.chats.length === restoring.choices.chats.length ? [] : restoring.choices.chats.map(chat => chat.key) })}>
                <Check on={restoring.pick.chats.length === restoring.choices.chats.length} /><span>聊天记录</span><span className="backup-size">{restoring.choices.chats.length} 个聊天</span></button> : null}
              {restoring.choices.chats.map(chat => { const on = restoring.pick.chats.includes(chat.key); return <button type="button" role="checkbox" aria-checked={on} key={chat.key} className="backup-row restore-sub" onClick={() => setPick({ chats: on ? restoring.pick.chats.filter(key => key !== chat.key) : [...restoring.pick.chats, chat.key] })}>
                <Check on={on} /><span>{chat.name}</span><span className="backup-size">{chat.count} 条</span></button>; })}
              {([['memories', '记忆', '条'], ['diary', '日记', '篇'], ['moments', '朋友圈', '条'], ['worlds', '世界书', '本']] as const).filter(([kind]) => restoring.choices[kind]).map(([kind, title, unit]) =>
                <button type="button" role="checkbox" aria-checked={restoring.pick[kind]} key={kind} className="backup-row" onClick={() => setPick({ [kind]: !restoring.pick[kind] })}>
                  <Check on={restoring.pick[kind]} /><span>{title}</span><span className="backup-size">{restoring.choices[kind]} {unit}</span></button>)}
            </div>
            <p className="restore-note">同一笔用备份里的，手机里多出来的会留着。勾了的聊天会整段换成备份里的那段。拿回来后会重新开启。</p>
          </>}
        </div></div>
        <div className="sp-confirm-actions">
          <PressedButton type="button" className="sp-confirm-btn" disabled={!!busy} onClick={() => setRestoring(null)}>取消</PressedButton>
          <PressedButton type="button" className={'sp-confirm-btn is-primary' + (restoring.mode === 'all' ? ' is-danger' : '')} disabled={!!busy || restoring.mode === 'pick' && !pickCount} onClick={() => void confirmRestore()}>{busy || (restoring.mode === 'all' ? '还原' : '拿回来')}</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}
  </section>;
}
