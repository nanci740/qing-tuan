import { PressedButton } from '../../components/shared/PressedButton';
import { flushSync } from 'react-dom';
import { useWorld } from '../../providers/WorldProvider';
import { WorldShelf, WorldBookView, WorldBookForm, WorldEntryForm } from './components/WorldViews';
/** 原页面的静态结构；所有页面保持挂载，由原脚本切换显示状态。 */
export function World() {
  const world = useWorld();
  return <section id="worldPage" className={'world-page' + (world.open ? ' open' : '')} aria-hidden={!world.open} ref={world.pageRef}>
      {"\n  "}
      <div className="world-shell">
        {"\n    "}
        <div className="world-top">
          {"\n      "}
          <PressedButton className="world-icon-btn" id="worldBack" type="button" aria-label="返回" onClick={world.back}>
            <svg viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </PressedButton>
          {"\n      "}
          <div className="world-main-title" id="worldPageTitle">{world.title}</div>
          {"\n      "}
          <PressedButton className="world-icon-btn" id="worldTopAction" type="button" aria-controls="worldActionMenu" onClick={world.topAction} ref={world.topActionRef} aria-expanded={world.menuOpen} aria-label={world.view === 'list' ? '世界书管理' : world.view === 'book' ? '新增条目' : ''} disabled={world.view === 'bookForm' || world.view === 'entry'} style={{
          opacity: world.view === 'bookForm' || world.view === 'entry' ? '0' : '1',
          pointerEvents: world.view === 'bookForm' || world.view === 'entry' ? 'none' : 'auto'
        }}>{world.view === 'list' || world.view === 'book' ? <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 5v14M5 12h14' /></svg> : null}</PressedButton>
          {"\n      "}
          <div id="worldActionMenu" role="menu" aria-label="世界书管理" className={'world-action-menu' + (world.menuOpen ? ' open' : '')} aria-hidden={!world.menuOpen} ref={world.menuRef}>
            {"\n        "}
            <PressedButton className="world-action-menu-item" id="worldMenuNew" role="menuitem" type="button" onClick={world.newBook}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>
                {"新增世界书"}
              </span>
            </PressedButton>
            {"\n        "}
            <PressedButton className="world-action-menu-item" id="worldMenuImport" role="menuitem" type="button" onClick={() => {
            world.setMenuOpen(false);
            world.importInput.current?.click();
          }}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 17V3" />
                <path d="m6 11 6 6 6-6" />
                <path d="M19 21H5" />
              </svg>
              <span>
                {"导入 JSON"}
              </span>
            </PressedButton>
            {"\n        "}
            <PressedButton className="world-action-menu-item" id="worldMenuExport" role="menuitem" type="button" onClick={event => {
            flushSync(()=>world.setMenuOpen(false));
            event.currentTarget.blur();
            world.exportJson();
          }}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m18 9-6-6-6 6" />
                <path d="M12 3v14" />
                <path d="M5 21h14" />
              </svg>
              <span>
                {"导出 JSON"}
              </span>
            </PressedButton>
            {"\n      "}
          </div>
          {"\n      "}
          <input id="worldImportJsonFile" type="file" accept=".json,application/json" hidden ref={world.importInput} onChange={world.importJson} />
          {"\n      "}
          <div className="world-address" aria-hidden="true">
            <span className="world-address-label">
              {"地址"}
            </span>
            <span className="world-address-field">
              <span className="world-address-icon" />
              <span id="worldAddressText">{world.address}</span>
            </span>
          </div>
          {"\n    "}
        </div>
        {"\n    "}
        <div id="worldContent">{world.view === 'list' ? <WorldShelf /> : world.view === 'book' ? <WorldBookView key={world.revision} /> : world.view === 'bookForm' ? <WorldBookForm key={world.revision} /> : <WorldEntryForm key={world.revision} />}</div>
        {"\n  "}
      </div>
      {"\n"}
    </section>;
}
