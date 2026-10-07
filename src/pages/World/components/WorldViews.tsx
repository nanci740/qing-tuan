import { PressedButton } from '../../../components/shared/PressedButton';
import { Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useWorldEntrySort } from '../../../hooks/useWorldEntrySort';
import type { WorldEntry } from '../../../types/world';
import { useWorld } from '../../../providers/WorldProvider';
import type { WorldBook, WorldBookDraft } from '../../../types/world';
import { WorldCover } from './WorldCover';
import { useWorldFields } from './WorldFields';
// 从原世界书模板生成的静态 React 结构；交互由 WorldProvider 管理。
export function WorldShelf() {
  const world = useWorld(),
    {
      books,
      bookId,
      entryId,
      entrySearch,
      entryFilter,
      roleName
    } = world;
  const {
    field,
    area,
    choice,
    toggle
  } = useWorldFields();
  const coverHtml = (book: WorldBook | WorldBookDraft) => <WorldCover book={world.view === 'bookForm' ? {
    ...book,
    name: world.coverName
  } : book} />;
  return <>{"" + "\n      "}<div className={"world-intro"}>{"" + "\n        "}<div className={"world-small"}>{"" + "WORLD ARCHIVE · 青团"}</div>{"" + "\n        "}<h2>{"" + "世界书"}</h2>{"" + "\n        "}<p>{"" + "收藏那些尚未说完的故事"}</p>{"" + "\n      "}</div>{"" + "\n\n      "}<div className={"world-section-head"}>{"" + "\n        "}<b>{"" + "世界档案"}</b>{"" + "\n        "}<small>{"" + books.length + " BOOKS"}</small>{"" + "\n      "}</div>{"" + "\n\n      "}<div id={"worldBookList"} className={"world-shelf"}>{"" + "\n        "}{books.map(b => <>{"" + "\n          "}<article className={"world-shelf-item"} key={b.id}>{"" + "\n            "}<PressedButton className={"world-shelf-open"} type={"button"} data-open-book={b.id} onClick={() => world.openBook(b.id)}>{"" + "\n              "}<span className={"world-shelf-cover"}>{coverHtml(b)}</span>{"" + "\n              "}<span className={"world-shelf-name"}>{"" + (b.name || '未命名世界书')}</span>{"" + "\n              "}<span className={"world-shelf-meta"}>{"" + (b.bindId === 'all' ? '全部角色' : roleName(b.bindId))}</span>{"" + "\n            "}</PressedButton>{"" + "\n            "}<input className={"world-toggle world-shelf-toggle"} type={"checkbox"} data-toggle-book={b.id} checked={b.enabled !== false} aria-label={"启用世界书"} onChange={event => world.toggleBook(b.id, event.currentTarget.checked)}></input>{"" + "\n          "}</article>{"" + "\n        "}</>)}{"" + "\n      "}</div>{"" + "\n\n      "}{books.length ? '' : <div className={"world-empty-note"}>{"" + "还没有世界书。"}<br></br>{"" + "点右上角 ＋ 新建一本吧。"}</div>}{"" + "\n    "}</>;
}
export function WorldEntryList() {
  const world = useWorld(),
    {
      books,
      bookId,
      entryId,
      entrySearch,
      entryFilter,
      roleName
    } = world;
  const {
    field,
    area,
    choice,
    toggle
  } = useWorldFields();
  const coverHtml = (book: WorldBook | WorldBookDraft) => <WorldCover book={world.view === 'bookForm' ? {
    ...book,
    name: world.coverName
  } : book} />;
  const all = world.book?.entries || [],
    query = entrySearch.trim().toLocaleLowerCase();
  const filtered = all.map((entry, index) => ({
    entry,
    index
  })).filter(({
    entry
  }) => (!query || [entry.title, entry.keys, entry.secondaryKeys].some(value => String(value || '').toLocaleLowerCase().includes(query))) && (entryFilter === 'all' || (entryFilter === 'enabled' ? entry.enabled !== false : entry.enabled === false)));
  const sort = useWorldEntrySort(filtered);
  function renderCard({
    entry: e,
    index: i
  }: {
    entry: WorldEntry;
    index: number;
  }, ghost = false) {
    return <div data-world-entry-card={e.id} className={'world-paper world-entry-card' + (ghost ? ' world-sort-ghost' : sort.drag?.id === e.id ? ' world-sort-active' : '')} style={ghost && sort.drag ? {
        width: sort.drag.width + 'px',
        height: sort.drag.height + 'px',
        left: sort.drag.left + 'px',
        top: sort.drag.top + 'px'
      } : undefined} {...ghost ? {} : sort.bind(e.id)}>{"" + "\n          "}<PressedButton className={"world-entry-copy"} type={"button"} data-copy-entry={e.id} aria-label={"复制条目"} data-title={"复制条目"} onClick={() => world.copyEntry(e.id)}><svg viewBox={"0 0 24 24"} aria-hidden={"true"}><rect x={"8"} y={"8"} width={"12"} height={"12"} rx={"2"}></rect><path d={"M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"}></path></svg></PressedButton>{"" + "\n          "}<div className={"world-row"}>{"" + "\n            "}<PressedButton className={"world-book-open" + (ghost && sort.drag?.buttonPressed ? " sp-press-bare" : "")} data-sp-press={ghost && sort.drag?.buttonPressed ? "1" : undefined} type={"button"} data-open-entry={e.id} onClick={() => world.openEntry(e.id)}>{"" + "\n              "}<div className={"world-entry-title"}><span className={"world-entry-no"}>{"" + "No."}{String(i + 1).padStart(2, '0')}</span>{"" + (e.title || '未命名条目')}</div>{"" + "\n              "}<div className={"world-entry-preview"}>{"" + (e.content || '尚未填写条目内容')}</div>{"" + "\n              "}<div style={{
              "display": "flex",
              "gap": "5px",
              "marginTop": "9px"
            }}>{"" + "\n                "}<span className={"world-chip"}>{"" + (e.trigger === 'always' ? '常驻' : '关键词')}</span>{"" + "\n                "}<span className={"world-chip"}>{"" + (({
                  head: '头部',
                  before: '人设前',
                  after: '人设后',
                  middle: '中部',
                  tail: '尾部'
                } as Record<string, string>)[e.position] || '人设后')}</span>{"" + "\n              "}</div>{"" + "\n            "}</PressedButton>{"" + "\n            "}<div className={"world-entry-controls"}>{"" + "\n              "}<input className={"world-toggle"} type={"checkbox"} data-entry-toggle={e.id} checked={e.enabled !== false} aria-label={"启用条目"} onChange={event => world.toggleEntry(e.id, event.currentTarget.checked)}></input>{"" + "\n            "}</div>{"" + "\n          "}</div>{"" + "\n        "}</div>;
  }
  const layout = sort.drag?.layout || [{text:"\n        ",key:"start"},...sort.items.flatMap((item,index)=>[{id:item.entry.id},{text:index<sort.items.length-1?"\n      \n        ":"\n      ",key:"gap"+index}])];
  return <>{sort.items.length ? layout.map(token => <Fragment key={"id" in token ? token.id : token.key}>{"id" in token ? renderCard(sort.items.find(item=>item.entry.id===token.id)!) : token.text}</Fragment>) : <div className="world-empty-note">{all.length ? '没有符合条件的条目。' : '暂无条目，点右上角 ＋ 新建一条世界设定吧。'}</div>}{sort.drag && world.pageRef.current ? createPortal(renderCard(sort.ghost!, true), world.pageRef.current) : null}</>;
}
export function WorldBookView() {
  const world = useWorld(),
    {
      books,
      bookId,
      entryId,
      entrySearch,
      entryFilter,
      roleName
    } = world;
  const {
    field,
    area,
    choice,
    toggle
  } = useWorldFields();
  const coverHtml = (book: WorldBook | WorldBookDraft) => <WorldCover book={world.view === 'bookForm' ? {
    ...book,
    name: world.coverName
  } : book} />;
  const b = world.book;
  if (!b) return null;
  return <>{"" + "\n      "}<div className={"world-intro"} style={{
      "margin": "21px auto 24px"
    }}>{"" + "\n        "}<div className={"world-small"}>{"" + "WORLD RECORD · " + (b.bindId === 'all' ? 'GLOBAL' : roleName(b.bindId))}</div>{"" + "\n        "}<h2>{"" + (b.name || '未命名世界书')}</h2>{"" + "\n        "}<p>{"" + (b.description || '尚未填写说明')}</p>{"" + "\n      "}</div>{"" + "\n\n      "}<div className={"world-paper"}>{"" + "\n        "}<div className={"world-row"}>{"" + "\n          "}<div>{"" + "\n            "}<div className={"world-label"}>{"" + "档案状态"}</div>{"" + "\n            "}<div className={"world-hint"}>{"" + (b.bindId === 'all' ? '全部角色可使用' : `关联角色：${roleName(b.bindId)}`)}</div>{"" + "\n          "}</div>{"" + "\n          "}<input id={"worldBookEnabled"} className={"world-toggle"} type={"checkbox"} checked={b.enabled !== false} onChange={event => world.toggleBook(world.bookId, event.currentTarget.checked)}></input>{"" + "\n        "}</div>{"" + "\n        "}<PressedButton className={"world-action secondary"} id={"worldEditBook"} style={{
        "width": "100%",
        "padding": "8px"
      }} onClick={world.editBook}>{"" + "编辑世界书资料与绑定"}</PressedButton>{"" + "\n      "}</div>{"" + "\n\n      "}<div className={"world-section-head"}>{"" + "\n        "}<b>{"" + "条目档案"}</b>{"" + "\n        "}<small id={"worldEntryCount"}>{entrySearch || entryFilter !== 'all' ? `${world.filteredEntryCount} / ${(b.entries || []).length} ENTRIES` : `${(b.entries || []).length} ENTRIES`}</small>{"" + "\n      "}</div>{"" + "\n      "}{(b.entries || []).length ? <>{"" + "\n        "}<div className={"world-entry-tools"}>{"" + "\n          "}<div className={"world-entry-search-wrap"}>{"" + "\n            "}<input className={"world-entry-search"} id={"worldEntrySearch"} type={"search"} placeholder={"搜索条目标题或关键词"} aria-label={"搜索世界书条目"} value={entrySearch} ref={world.searchRef} onChange={event => world.setEntrySearch(event.currentTarget.value)}></input>{"" + "\n            "}<PressedButton className={"world-entry-clear"} id={"worldEntryClear"} type={"button"} aria-label={"清空搜索"} hidden={!entrySearch} onClick={() => {
            world.setEntrySearch('');
            world.searchRef.current?.focus();
          }}><svg viewBox={"0 0 24 24"} aria-hidden={"true"}><path d={"M6 6l12 12M18 6L6 18"}></path></svg></PressedButton>{"" + "\n          "}</div>{"" + "\n          "}<div className={"world-sort-hint"}>{"" + "长按条目卡片拖拽排序（搜索或筛选时暂停排序）"}</div>{"" + "\n          "}<div className={"world-entry-filters"} role={"group"} aria-label={"按启用状态筛选条目"}>{"" + "\n            "}<PressedButton type={"button"} className={"world-entry-filter" + (entryFilter === 'all' ? ' is-active' : world.usedFilters.includes('all') ? '' : ' ')} data-world-entry-filter={"all"} onClick={() => world.setEntryFilter("all")}>{"" + "全部"}</PressedButton>{"" + "\n            "}<PressedButton type={"button"} className={"world-entry-filter" + (entryFilter === 'enabled' ? ' is-active' : world.usedFilters.includes('enabled') ? '' : ' ')} data-world-entry-filter={"enabled"} onClick={() => world.setEntryFilter("enabled")}>{"" + "已启用"}</PressedButton>{"" + "\n            "}<PressedButton type={"button"} className={"world-entry-filter" + (entryFilter === 'disabled' ? ' is-active' : world.usedFilters.includes('disabled') ? '' : ' ')} data-world-entry-filter={"disabled"} onClick={() => world.setEntryFilter("disabled")}>{"" + "未启用"}</PressedButton>{"" + "\n          "}</div>{"" + "\n        "}</div></> : ''}{"" + "\n      "}<div id={"worldEntryList"}><WorldEntryList /></div>{"" + "\n    "}</>;
}
export function WorldBookForm() {
  const world = useWorld(),
    {
      books,
      bookId,
      entryId,
      entrySearch,
      entryFilter,
      roleName
    } = world;
  const {
    field,
    area,
    choice,
    toggle
  } = useWorldFields();
  const coverHtml = (book: WorldBook | WorldBookDraft) => <WorldCover book={world.view === 'bookForm' ? {
    ...book,
    name: world.coverName
  } : book} />;
  const b = world.bookDraft!,
    chars = world.characters;
  return <>{"" + "\n      "}<div className={"world-intro"}>{"" + "\n        "}<div className={"world-small"}>{"" + "WORLD RECORD"}</div>{"" + "\n        "}<h2>{"" + (bookId ? '编辑档案' : '新建世界书')}</h2>{"" + "\n        "}<p>{"" + "为这段故事建立独立的世界"}</p>{"" + "\n      "}</div>{"" + "\n\n      "}<div className={"world-paper"}>{"" + "\n        "}{field('世界书名称', 'wbName', b.name, '例如：青丘旧事')}{"" + "\n        "}<div className={"world-field"}>{"" + "\n          "}<span className={"world-label"}>{"" + "封面"}</span>{"" + "\n          "}<div className={"world-cover-pick"}>{"" + "\n            "}<PressedButton type={"button"} className={"world-cover-thumb"} id={"wbCoverThumb"} aria-label={"选择封面图片"} onClick={world.chooseCover}>{coverHtml(b)}</PressedButton>{"" + "\n            "}<div className={"world-cover-actions"}>{"" + "\n              "}<PressedButton type={"button"} className={"world-cover-btn"} id={"wbCoverChoose"} onClick={world.chooseCover}>{"" + "选择图片"}</PressedButton>{"" + "\n              "}<PressedButton type={"button"} className={"world-cover-btn"} id={"wbCoverClear"} hidden={!b.cover} onClick={() => {
              world.updateBookDraft('cover', '');
              if (world.bookDraft?.name.trim()) world.updateBookDraft('name', world.bookDraft.name);
            }}>{"" + "移除封面"}</PressedButton>{"" + "\n              "}<span className={"world-hint"}>{"" + "没选的话会用预设封面，书名会印在上面。"}</span>{"" + "\n            "}</div>{"" + "\n          "}</div>{"" + "\n          "}<input type={"file"} id={"wbCoverFile"} accept={"image/*"} hidden ref={world.coverInput} onChange={world.onCover}></input>{"" + "\n        "}</div>{"" + "\n        "}{area('档案简介', 'wbDesc', b.description || '', '一句话概括这本世界书的内容。')}{"" + "\n        "}{choice('关联角色', 'wbBind', [['all', '全部角色（全局）'], ...chars.map(c => [c.archiveId, c.name || '未命名角色'])], b.bindId || 'all')}{"" + "\n        "}{toggle('启用世界书', 'wbEnabled', b.enabled !== false)}{"" + "\n      "}</div>{"" + "\n\n      "}<div className={"world-action-bar"}>{"" + "\n        "}<PressedButton className={"world-action secondary"} id={"wbCancel"} onClick={world.back}>{"" + "返回"}</PressedButton>{"" + "\n        "}<PressedButton className={"world-action"} id={"wbSave"} onClick={world.saveBook}>{"" + "保存世界书"}</PressedButton>{"" + "\n        "}{bookId ? <PressedButton className={"world-action danger"} id={"wbDelete"} onClick={world.deleteBook}>{"" + "删除"}</PressedButton> : ''}{"" + "\n      "}</div>{"" + "\n    "}</>;
}
export function WorldEntryForm() {
  const world = useWorld(),
    {
      books,
      bookId,
      entryId,
      entrySearch,
      entryFilter,
      roleName
    } = world;
  const {
    field,
    area,
    choice,
    toggle
  } = useWorldFields();
  const coverHtml = (book: WorldBook | WorldBookDraft) => <WorldCover book={world.view === 'bookForm' ? {
    ...book,
    name: world.coverName
  } : book} />;
  const e = world.draft;
  if (!e) return null;
  return <>{"" + "\n      "}<div className={"world-intro"} style={{
      "margin": "16px 0 25px"
    }}>{"" + "\n        "}<div className={"world-small"}>{"" + "ENTRY RECORD"}</div>{"" + "\n        "}<h2>{"" + (entryId ? '编辑条目' : '新建条目')}</h2>{"" + "\n        "}<p>{"" + "每一条，都是故事的一部分"}</p>{"" + "\n      "}</div>{"" + "\n\n      "}<div className={"world-paper"}>{"" + "\n        "}{field('条目标题', 'weTitle', e.title, '例如：青丘的月夜')}{"" + "\n        "}{area('设定内容', 'weContent', e.content, '家机可使用的世界设定文本。', true)}{"" + "\n        "}{field('触发关键词', 'weKeys', e.keys, '例如：青丘, 月夜, 狐族')}{"" + "\n        "}<p className={"world-hint"}>{"" + "多个关键词用英文或中文逗号分隔。常驻条目不需要关键词。"}</p>{"" + "\n        "}{toggle('启用此条目', 'weEnabled', e.enabled !== false)}{"" + "\n      "}</div>{"" + "\n\n      "}<details className={"world-advanced"}>{"" + "\n        "}<summary>{"" + "高级设置 · 触发与注入"}</summary>{"" + "\n        "}<div className={"world-advanced-body"}>{"" + "\n\n          "}<div className={"world-advanced-group"}>{"" + "\n            "}<h4>{"" + "01 · 触发逻辑"}</h4>{"" + "\n            "}{choice('触发方式', 'weTrigger', [['keyword', '关键词触发'], ['always', '常驻注入']], e.trigger)}{"" + "\n            "}{field('辅助关键词（可选）', 'weSecondary', e.secondaryKeys, '例如：山林, 夜晚')}{"" + "\n            "}{choice('匹配模式', 'weMatch', [['normal', '普通文本'], ['regex', '正则表达式']], e.match)}{"" + "\n            "}<div className={"world-field"}>{"" + "\n              "}<span className={"world-label"}>{"" + "激活概率 "}<span id={"weProbabilityLabel"}>{"" + (e.probability ?? 100) + "%"}</span></span>{"" + "\n              "}<input className={"world-range"} type={"range"} id={"weProbability"} min={"0"} max={"100"} step={"5"} value={e.probability ?? 100} onChange={event => world.setField('weProbability', event.currentTarget.value)}></input>{"" + "\n            "}</div>{"" + "\n          "}</div>{"" + "\n\n          "}<div className={"world-advanced-group"}>{"" + "\n            "}<h4>{"" + "02 · 注入策略"}</h4>{"" + "\n            "}{choice('注入位置', 'wePosition', [['head', '头部'], ['before', '人设前'], ['after', '人设后'], ['middle', '中部'], ['tail', '尾部']], e.position)}{"" + "\n            "}{choice('注入角色', 'weRole', [['system', 'system'], ['user', 'user'], ['assistant', 'assistant']], e.role)}{"" + "\n            "}{field('优先级（数值越大越靠前）', 'wePriority', e.priority ?? 100, '100', 'number')}{"" + "\n          "}</div>{"" + "\n\n          "}<div className={"world-advanced-group"}>{"" + "\n            "}<h4>{"" + "03 · 行为策略"}</h4>{"" + "\n            "}{field('扫描深度（最近几条消息）', 'weDepth', e.depth ?? 10, '10', 'number')}{"" + "\n            "}{field('持续轮数（0 = 当前轮）', 'weSticky', e.sticky ?? 0, '0', 'number')}{"" + "\n            "}{toggle('区分大小写', 'weCase', e.caseSensitive)}{"" + "\n            "}{toggle('递归触发', 'weRecursive', e.recursive)}{"" + "\n          "}</div>{"" + "\n\n        "}</div>{"" + "\n      "}</details>{"" + "\n\n      "}<div className={"world-action-bar"}>{"" + "\n        "}<PressedButton className={"world-action secondary"} id={"weCancel"} onClick={world.back}>{"" + "返回"}</PressedButton>{"" + "\n        "}<PressedButton className={"world-action"} id={"weSave"} onClick={world.saveEntry}>{"" + "保存条目"}</PressedButton>{"" + "\n        "}{entryId ? <PressedButton className={"world-action danger"} id={"weDelete"} onClick={world.deleteEntry}>{"" + "删除"}</PressedButton> : ''}{"" + "\n      "}</div>{"" + "\n    "}</>;
}
