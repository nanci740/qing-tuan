import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { showToast } from '../../../utils/toast';
import { confirmChat } from '../../../utils/chatConfirm';
import {
  loadStickerImages, newSticker, newStickerGroup, parseStickerLines, prepareStickerFile, readStickers, saveStickerImage,
  stickerSrc, subscribeStickers, writeStickers,
} from '../../../utils/stickerStorage';
import type { Sticker, StickerGroup } from '../../../utils/stickerStorage';

type GroupDraft = { id: string; name: string; ai: boolean; isNew: boolean };
type StickerDraft = { sticker: Sticker; groupId: string; tag: string; moveTo: string };
type AddDraft = { groupId: string; tab: 'upload' | 'url'; files: { data: string; tag: string }[]; lines: string; busy: boolean };

/** 「我」→ 表情：分组排的表情包，每张底下写标签。点表情改标签、换分组；长按多选删除；每组可以设定家机能不能用。 */
export function MeStickers() {
  const groups = useSyncExternalStore(subscribeStickers, readStickers);
  const [loaded, setLoaded] = useState(false), [folded, setFolded] = useState<Record<string, boolean>>({});
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [groupDraft, setGroupDraft] = useState<GroupDraft | null>(null), [stickerDraft, setStickerDraft] = useState<StickerDraft | null>(null), [adding, setAdding] = useState<AddDraft | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null), press = useRef({ x: 0, y: 0, until: 0, id: '' }), file = useRef<HTMLInputElement>(null);
  // 上传的表情要先从图片库读出来才显示得了；有新图就再读一次。
  useEffect(() => {
    let alive = true;
    loadStickerImages(groups).then(() => alive && setLoaded(true), () => { if (alive) { setLoaded(true); showToast('有几张表情暂时读不出来'); } });
    return () => { alive = false; };
  }, [groups]);
  useEffect(() => () => { if (hold.current) clearTimeout(hold.current); }, []);

  const save = (next: StickerGroup[]) => writeStickers(next);
  const update = (groupId: string, change: (group: StickerGroup) => StickerGroup) => save(groups.map(group => group.id === groupId ? change(group) : group));
  // 长按 0.5 秒进入多选并选上这一张；进了多选之后点一下就是勾选／取消。
  function pressDown(id: string, event: ReactPointerEvent<HTMLButtonElement>) {
    if (picked || event.button !== 0) return;
    press.current = { x: event.clientX, y: event.clientY, until: 0, id };
    hold.current = setTimeout(() => { hold.current = null; press.current.until = Date.now() + 600; setPicked(new Set([id])); }, 500);
  }
  function pressMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (hold.current && Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > 9) { clearTimeout(hold.current); hold.current = null; }
  }
  function pressEnd() { if (hold.current) { clearTimeout(hold.current); hold.current = null; } }
  function tap(group: StickerGroup, sticker: Sticker) {
    // 长按放开时跟着来的那一下点击不算（不然刚选上又被取消）
    if (press.current.until > Date.now() && press.current.id === sticker.id) return;
    if (picked) {
      const next = new Set(picked); if (next.has(sticker.id)) next.delete(sticker.id); else next.add(sticker.id);
      setPicked(next.size ? next : null); return;
    }
    setStickerDraft({ sticker, groupId: group.id, tag: sticker.tag, moveTo: group.id });
  }
  async function removePicked() {
    if (!picked?.size) return;
    if (!await confirmChat({ title: '删除表情？', message: `选中的 ${picked.size} 张表情会删掉，他之后也不会再用。`, confirmText: '删除', danger: true })) return;
    save(groups.map(group => ({ ...group, items: group.items.filter(item => !picked.has(item.id)) })));
    setPicked(null);
  }

  function saveGroup(draft: GroupDraft) {
    if (!draft.name.trim()) { showToast('写一个分组名字'); return; }
    if (draft.isNew) save([...groups, { ...newStickerGroup(draft.name, draft.ai), id: draft.id }]);
    else update(draft.id, group => ({ ...group, name: draft.name.trim().slice(0, 20), ai: draft.ai }));
    setGroupDraft(null);
  }
  async function removeGroup(draft: GroupDraft) {
    const group = groups.find(item => item.id === draft.id);
    if (!await confirmChat({ title: '删除分组？', message: `「${group?.name || draft.name}」${group?.items.length ? `和里面的 ${group.items.length} 张表情` : ''}会删掉。`, confirmText: '删除', danger: true })) return;
    save(groups.filter(item => item.id !== draft.id));
    setGroupDraft(null);
  }
  function saveSticker(draft: StickerDraft) {
    if (!draft.tag.trim()) { showToast('写一个标签，他才知道这张什么时候用'); return; }
    const sticker = { ...draft.sticker, tag: draft.tag.trim().slice(0, 20) };
    save(groups.map(group => {
      const items = group.items.filter(item => item.id !== sticker.id);
      if (group.id !== draft.moveTo) return { ...group, items };
      return { ...group, items: group.id === draft.groupId ? group.items.map(item => item.id === sticker.id ? sticker : item) : [...items, sticker] };
    }));
    setStickerDraft(null);
  }
  async function removeSticker(draft: StickerDraft) {
    if (!await confirmChat({ title: '删除表情？', message: `「${draft.sticker.tag || '这张表情'}」会删掉。`, confirmText: '删除', danger: true })) return;
    update(draft.groupId, group => ({ ...group, items: group.items.filter(item => item.id !== draft.sticker.id) }));
    setStickerDraft(null);
  }

  // 加表情：上传的先缩小放在窗口里填标签；贴网址的一行一张。
  async function pickFiles(input: HTMLInputElement) {
    const chosen = [...(input.files || [])]; input.value = '';
    if (!chosen.length || !adding) return;
    const ready: { data: string; tag: string }[] = [];
    for (const item of chosen) {
      try { ready.push({ data: await prepareStickerFile(item), tag: '' }); } catch (error) { showToast(String((error as Error)?.message || error)); }
    }
    setAdding(current => current && { ...current, files: [...current.files, ...ready] });
  }
  async function addStickers(draft: AddDraft) {
    const fromFiles = draft.tab === 'upload';
    if (fromFiles && !draft.files.length) { showToast('先选几张图片'); return; }
    if (fromFiles && draft.files.some(item => !item.tag.trim())) { showToast('每张都要写标签，他才知道什么时候用'); return; }
    const lines = fromFiles ? [] : parseStickerLines(draft.lines);
    if (!fromFiles && !lines.length) { showToast('一行一张：前面写标签，空一格，后面贴网址'); return; }
    setAdding({ ...draft, busy: true });
    try {
      const items = fromFiles
        ? await Promise.all(draft.files.map(async item => newSticker(item.tag, await saveStickerImage(item.data))))
        : lines.map(line => newSticker(line.tag, line.image));
      update(draft.groupId, group => ({ ...group, items: [...group.items, ...items] }));
      setAdding(null);
    } catch (error) {
      showToast('表情存不进去：' + String((error as Error)?.message || error).slice(0, 60));
      setAdding(current => current && { ...current, busy: false });
    }
  }

  const urlCount = adding?.tab === 'url' ? parseStickerLines(adding.lines).length : 0;
  const addingGroup = adding ? groups.find(group => group.id === adding.groupId) : null;
  return <>
    {picked ? <div className="chat-me-st-tools is-picking">
      <span>已选 {picked.size} 张</span>
      <button type="button" className="chat-me-st-btn is-danger" onClick={removePicked}>删除</button>
      <button type="button" className="chat-me-st-btn" onClick={() => setPicked(null)}>取消</button>
    </div> : <div className="chat-me-st-tools">
      <small>点表情改标签，长按多选删除。<br />他照标签挑表情，标签写准一点。</small>
      <button type="button" className="chat-me-st-btn" onClick={() => setGroupDraft({ id: newStickerGroup('', true).id, name: '', ai: true, isNew: true })}>＋ 新分组</button>
    </div>}

    {groups.length ? groups.map(group => <div className="chat-me-group" key={group.id}>
      <div className="chat-me-st-head">
        <button type="button" className="chat-me-group-head" aria-expanded={!folded[group.id]} onClick={() => setFolded(current => ({ ...current, [group.id]: !current[group.id] }))}>
          <span className="chat-me-chev" aria-hidden="true">{folded[group.id] ? '▶' : '▼'}</span>{group.name}<small>({group.items.length})</small>
        </button>
        <label className="chat-me-st-ai"><input type="checkbox" checked={group.ai} onChange={event => { const ai = event.currentTarget.checked; update(group.id, item => ({ ...item, ai })); }} />家机能用</label>
        <button type="button" className="chat-me-st-more" aria-label={`编辑分组「${group.name}」`} onClick={() => setGroupDraft({ id: group.id, name: group.name, ai: group.ai, isNew: false })}>⋯</button>
      </div>
      {folded[group.id] ? null : <div className="chat-me-st-grid">
        {group.items.map(sticker => {
          const src = loaded ? stickerSrc(sticker) : '';
          return <button type="button" key={sticker.id} className={'chat-me-st-cell' + (picked?.has(sticker.id) ? ' is-picked' : '')} aria-pressed={picked ? picked.has(sticker.id) : undefined}
            onPointerDown={event => pressDown(sticker.id, event)} onPointerMove={pressMove} onPointerUp={pressEnd} onPointerCancel={pressEnd} onPointerLeave={pressEnd}
            onContextMenu={event => event.preventDefault()} onClick={() => tap(group, sticker)}>
            <span className="chat-me-st-pic">{src ? <img src={src} alt={sticker.tag} draggable={false} /> : <i>看不到</i>}</span>
            <b>{sticker.tag || '（没写标签）'}</b>
          </button>;
        })}
        {picked ? null : <button type="button" className="chat-me-st-cell is-add" onClick={() => setAdding({ groupId: group.id, tab: 'upload', files: [], lines: '', busy: false })}>
          <span className="chat-me-st-pic">＋</span><b>加表情</b>
        </button>}
      </div>}
    </div>) : <p className="chat-me-note">还没有表情。先按「新分组」建一组，再往里面加表情。</p>}

    {groupDraft ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget) setGroupDraft(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="表情分组">
        <div className="sp-confirm-bar"><span className="sp-confirm-title">{groupDraft.isNew ? '新分组' : '编辑分组'}</span></div>
        <div className="sp-confirm-body chat-me-form">
          <label htmlFor="meStickerGroupName">分组名字</label>
          <input id="meStickerGroupName" maxLength={20} placeholder="例如：猫猫、日常、撒娇" value={groupDraft.name} onChange={event => { const name = event.currentTarget.value; setGroupDraft(current => current && { ...current, name }); }} />
          <label className="chat-me-st-check"><input type="checkbox" checked={groupDraft.ai} onChange={event => { const ai = event.currentTarget.checked; setGroupDraft(current => current && { ...current, ai }); }} /><span>家机能用<small>不勾的话，这组只有你自己用</small></span></label>
        </div>
        <div className="sp-confirm-actions chat-me-form-actions">
          {groupDraft.isNew ? null : <PressedButton type="button" className="sp-confirm-btn is-primary is-danger" onClick={() => removeGroup(groupDraft)}>删除</PressedButton>}
          <PressedButton type="button" className="sp-confirm-btn" onClick={() => setGroupDraft(null)}>取消</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={() => saveGroup(groupDraft)}>保存</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}

    {stickerDraft ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget) setStickerDraft(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="表情">
        <div className="sp-confirm-bar"><span className="sp-confirm-title">表情</span></div>
        <div className="sp-confirm-body chat-me-form">
          <span className="chat-me-st-preview">{stickerSrc(stickerDraft.sticker) ? <img src={stickerSrc(stickerDraft.sticker)} alt={stickerDraft.tag} /> : <i>这张图看不到了</i>}</span>
          <label htmlFor="meStickerTag">标签<small>他照这个挑表情，例如：生气、摸摸头</small></label>
          <input id="meStickerTag" maxLength={20} value={stickerDraft.tag} onChange={event => { const tag = event.currentTarget.value; setStickerDraft(current => current && { ...current, tag }); }} />
          {groups.length > 1 ? <>
            <label htmlFor="meStickerGroup">放在哪一组</label>
            <select id="meStickerGroup" className="chat-me-st-select" value={stickerDraft.moveTo} onChange={event => { const moveTo = event.currentTarget.value; setStickerDraft(current => current && { ...current, moveTo }); }}>
              {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </> : null}
        </div>
        <div className="sp-confirm-actions chat-me-form-actions">
          <PressedButton type="button" className="sp-confirm-btn is-primary is-danger" onClick={() => removeSticker(stickerDraft)}>删除</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn" onClick={() => setStickerDraft(null)}>取消</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" onClick={() => saveSticker(stickerDraft)}>保存</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}

    {adding ? createPortal(<div className="sp-confirm-overlay chat-me-dialog" onClick={event => { if (event.target === event.currentTarget && !adding.busy) setAdding(null); }}>
      <div className="sp-confirm" role="dialog" aria-modal="true" aria-label="加表情">
        <div className="sp-confirm-bar"><span className="sp-confirm-title">加表情到「{addingGroup?.name || '表情'}」</span></div>
        <div className="chat-me-st-tabs">
          <button type="button" className={adding.tab === 'upload' ? 'is-active' : ''} onClick={() => setAdding({ ...adding, tab: 'upload' })}>上传图片</button>
          <button type="button" className={adding.tab === 'url' ? 'is-active' : ''} onClick={() => setAdding({ ...adding, tab: 'url' })}>贴网址</button>
        </div>
        <div className="sp-confirm-body chat-me-form">
          {adding.tab === 'upload' ? <>
            {adding.files.map((item, index) => <div className="chat-me-st-row" key={index}>
              <span className="chat-me-st-pic"><img src={item.data} alt="" /></span>
              <input maxLength={20} placeholder="标签，例如：摸摸头" aria-label={`第 ${index + 1} 张的标签`} value={item.tag} onChange={event => { const tag = event.currentTarget.value; setAdding(current => current && { ...current, files: current.files.map((file, at) => at === index ? { ...file, tag } : file) }); }} />
              <button type="button" className="chat-me-st-x" aria-label="不要这张" onClick={() => setAdding(current => current && { ...current, files: current.files.filter((_, at) => at !== index) })}>×</button>
            </div>)}
            <button type="button" className="chat-me-st-btn chat-me-st-choose" onClick={() => file.current?.click()}>{adding.files.length ? '再选几张' : '选图片'}</button>
            <input ref={file} type="file" accept="image/*" multiple hidden onChange={event => pickFiles(event.currentTarget)} />
            <small className="chat-me-st-hint">图片会缩小到 200px 存在小手机里；动图原样保存，超过 1MB 放不进来。</small>
          </> : <>
            <textarea className="chat-me-st-lines" rows={6} placeholder={'生气 https://files.catbox.moe/a1b2c3.gif\n摸摸头 https://files.catbox.moe/d4e5f6.png'} value={adding.lines} onChange={event => { const lines = event.currentTarget.value; setAdding(current => current && { ...current, lines }); }} />
            <small className="chat-me-st-hint">一行一张：前面写标签，空一格，后面贴网址。{adding.lines.trim() ? `认到 ${urlCount} 张。` : ''}<br />网址的图片放在别人网站上，链接失效就看不到了。</small>
          </>}
        </div>
        <div className="sp-confirm-actions chat-me-form-actions">
          <PressedButton type="button" className="sp-confirm-btn" disabled={adding.busy} onClick={() => setAdding(null)}>取消</PressedButton>
          <PressedButton type="button" className="sp-confirm-btn is-primary" disabled={adding.busy} onClick={() => addStickers(adding)}>{adding.busy ? '存图中…' : '加入'}</PressedButton>
        </div>
      </div>
    </div>, document.body) : null}
  </>;
}
