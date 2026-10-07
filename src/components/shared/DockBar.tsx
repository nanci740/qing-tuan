import { useChatNavigationSurface } from './ChatNavigationSurface';
import { useChatNavigation } from '../../providers/ChatNavigationProvider';
import { useAppearance } from '../../providers/AppearanceProvider';
import { useSettingsNavigation } from '../../hooks/useSettingsNavigation';
/** 原页面的静态结构；所有页面保持挂载，由原脚本切换显示状态。 */
export function DockBar() {
  const chat = useChatNavigation();
  const surface = useChatNavigationSurface('dock', 'dock-bar');
  const appearance = useAppearance();
  const navigation = useSettingsNavigation();
  return <nav {...surface} id="dockBar" onClickCapture={event => {
    const item = (event.target as Element).closest<HTMLElement>('.dock-item');
    if (item) {
      event.preventDefault();
      navigation.setActiveDock(item.dataset.dockIconKey || 'home');
    }
  }}>
      {"\n"}
      <a href="#" onClick={event => { event.preventDefault(); event.stopPropagation(); chat.closeApp(); }} data-dock-icon-key="home" className={(navigation.activeDock === 'home' ? 'dock-item active' : 'dock-item') + (appearance.icons.dock['home'] ? ' has-custom-icon' : '')}>
        {"\n"}
        <img className="dock-icon-image" alt="Home icon" src={appearance.icons.dock['home'] || undefined} />
        {"\n"}
        <svg className="px-icon" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
          <rect className="px-x" x="7" y="1" width="1" height="1" />
          <rect className="px-x" x="6" y="2" width="3" height="1" />
          <rect className="px-x" x="11" y="2" width="1" height="1" />
          <rect className="px-x" x="5" y="3" width="2" height="1" />
          <rect className="px-o" x="7" y="3" width="1" height="1" />
          <rect className="px-x" x="8" y="3" width="2" height="1" />
          <rect className="px-x" x="11" y="3" width="1" height="1" />
          <rect className="px-x" x="4" y="4" width="2" height="1" />
          <rect className="px-o" x="6" y="4" width="3" height="1" />
          <rect className="px-x" x="9" y="4" width="3" height="1" />
          <rect className="px-x" x="3" y="5" width="2" height="1" />
          <rect className="px-o" x="5" y="5" width="5" height="1" />
          <rect className="px-x" x="10" y="5" width="2" height="1" />
          <rect className="px-x" x="2" y="6" width="2" height="1" />
          <rect className="px-o" x="4" y="6" width="7" height="1" />
          <rect className="px-x" x="11" y="6" width="2" height="1" />
          <rect className="px-x" x="1" y="7" width="2" height="1" />
          <rect className="px-o" x="3" y="7" width="9" height="1" />
          <rect className="px-x" x="12" y="7" width="2" height="1" />
          <rect className="px-x" x="0" y="8" width="2" height="1" />
          <rect className="px-o" x="2" y="8" width="11" height="1" />
          <rect className="px-x" x="13" y="8" width="2" height="1" />
          <rect className="px-x" x="1" y="9" width="1" height="1" />
          <rect className="px-o" x="2" y="9" width="3" height="1" />
          <rect className="px-x" x="5" y="9" width="5" height="1" />
          <rect className="px-o" x="10" y="9" width="3" height="1" />
          <rect className="px-x" x="13" y="9" width="1" height="1" />
          <rect className="px-x" x="1" y="10" width="1" height="1" />
          <rect className="px-o" x="2" y="10" width="3" height="1" />
          <rect className="px-x" x="5" y="10" width="1" height="1" />
          <rect className="px-w" x="6" y="10" width="3" height="1" />
          <rect className="px-x" x="9" y="10" width="1" height="1" />
          <rect className="px-o" x="10" y="10" width="3" height="1" />
          <rect className="px-x" x="13" y="10" width="1" height="1" />
          <rect className="px-x" x="1" y="11" width="1" height="1" />
          <rect className="px-o" x="2" y="11" width="3" height="1" />
          <rect className="px-x" x="5" y="11" width="1" height="1" />
          <rect className="px-w" x="6" y="11" width="3" height="1" />
          <rect className="px-x" x="9" y="11" width="1" height="1" />
          <rect className="px-o" x="10" y="11" width="3" height="1" />
          <rect className="px-x" x="13" y="11" width="1" height="1" />
          <rect className="px-x" x="1" y="12" width="1" height="1" />
          <rect className="px-o" x="2" y="12" width="3" height="1" />
          <rect className="px-x" x="5" y="12" width="1" height="1" />
          <rect className="px-w" x="6" y="12" width="3" height="1" />
          <rect className="px-x" x="9" y="12" width="1" height="1" />
          <rect className="px-o" x="10" y="12" width="3" height="1" />
          <rect className="px-x" x="13" y="12" width="1" height="1" />
          <rect className="px-x" x="1" y="13" width="13" height="1" />
        </svg>
        {"\n"}
        <span>
          {"Home"}
        </span>
        {"\n"}
      </a>
      {"\n"}
      <a href="#" onClick={event => { event.preventDefault(); event.stopPropagation(); chat.openApp(); }} data-dock-icon-key="chat" className={(navigation.activeDock === 'chat' ? 'dock-item active' : 'dock-item') + (appearance.icons.dock['chat'] ? ' has-custom-icon' : '')}>
        {"\n"}
        <img className="dock-icon-image" alt="Chat icon" src={appearance.icons.dock['chat'] || undefined} />
        {"\n"}
        <svg className="px-icon" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
          <rect className="px-x" x="3" y="2" width="10" height="1" />
          <rect className="px-x" x="2" y="3" width="1" height="1" />
          <rect className="px-o" x="3" y="3" width="10" height="1" />
          <rect className="px-x" x="13" y="3" width="1" height="1" />
          <rect className="px-x" x="1" y="4" width="1" height="1" />
          <rect className="px-o" x="2" y="4" width="12" height="1" />
          <rect className="px-x" x="14" y="4" width="1" height="1" />
          <rect className="px-x" x="1" y="5" width="1" height="1" />
          <rect className="px-o" x="2" y="5" width="12" height="1" />
          <rect className="px-x" x="14" y="5" width="1" height="1" />
          <rect className="px-x" x="1" y="6" width="1" height="1" />
          <rect className="px-o" x="2" y="6" width="12" height="1" />
          <rect className="px-x" x="14" y="6" width="1" height="1" />
          <rect className="px-x" x="1" y="7" width="1" height="1" />
          <rect className="px-o" x="2" y="7" width="12" height="1" />
          <rect className="px-x" x="14" y="7" width="1" height="1" />
          <rect className="px-x" x="1" y="8" width="1" height="1" />
          <rect className="px-o" x="2" y="8" width="12" height="1" />
          <rect className="px-x" x="14" y="8" width="1" height="1" />
          <rect className="px-x" x="1" y="9" width="1" height="1" />
          <rect className="px-o" x="2" y="9" width="12" height="1" />
          <rect className="px-x" x="14" y="9" width="1" height="1" />
          <rect className="px-x" x="2" y="10" width="1" height="1" />
          <rect className="px-o" x="3" y="10" width="10" height="1" />
          <rect className="px-x" x="13" y="10" width="1" height="1" />
          <rect className="px-x" x="3" y="11" width="3" height="1" />
          <rect className="px-o" x="6" y="11" width="2" height="1" />
          <rect className="px-x" x="8" y="11" width="5" height="1" />
          <rect className="px-x" x="6" y="12" width="1" height="1" />
          <rect className="px-o" x="7" y="12" width="1" height="1" />
          <rect className="px-x" x="8" y="12" width="1" height="1" />
          <rect className="px-x" x="6" y="13" width="2" height="1" />
        </svg>
        {"\n"}
        <span>
          {"Chat"}
        </span>
        {"\n"}
      </a>
      {"\n"}
      <a href="#" data-dock-icon-key="diary" className={"dock-item" + (appearance.icons.dock['diary'] ? ' has-custom-icon' : '')}>
        {"\n"}
        <img className="dock-icon-image" alt="Diary icon" src={appearance.icons.dock['diary'] || undefined} />
        {"\n"}
        <svg className="px-icon" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
          <rect className="px-x" x="3" y="1" width="11" height="1" />
          <rect className="px-x" x="2" y="2" width="1" height="1" />
          <rect className="px-o" x="3" y="2" width="1" height="1" />
          <rect className="px-x" x="4" y="2" width="1" height="1" />
          <rect className="px-o" x="5" y="2" width="8" height="1" />
          <rect className="px-x" x="13" y="2" width="1" height="1" />
          <rect className="px-x" x="2" y="3" width="1" height="1" />
          <rect className="px-o" x="3" y="3" width="1" height="1" />
          <rect className="px-x" x="4" y="3" width="1" height="1" />
          <rect className="px-o" x="5" y="3" width="1" height="1" />
          <rect className="px-x" x="6" y="3" width="6" height="1" />
          <rect className="px-o" x="12" y="3" width="1" height="1" />
          <rect className="px-x" x="13" y="3" width="1" height="1" />
          <rect className="px-x" x="2" y="4" width="1" height="1" />
          <rect className="px-o" x="3" y="4" width="1" height="1" />
          <rect className="px-x" x="4" y="4" width="1" height="1" />
          <rect className="px-o" x="5" y="4" width="1" height="1" />
          <rect className="px-x" x="6" y="4" width="1" height="1" />
          <rect className="px-w" x="7" y="4" width="4" height="1" />
          <rect className="px-x" x="11" y="4" width="1" height="1" />
          <rect className="px-o" x="12" y="4" width="1" height="1" />
          <rect className="px-x" x="13" y="4" width="1" height="1" />
          <rect className="px-x" x="2" y="5" width="1" height="1" />
          <rect className="px-o" x="3" y="5" width="1" height="1" />
          <rect className="px-x" x="4" y="5" width="1" height="1" />
          <rect className="px-o" x="5" y="5" width="1" height="1" />
          <rect className="px-x" x="6" y="5" width="6" height="1" />
          <rect className="px-o" x="12" y="5" width="1" height="1" />
          <rect className="px-x" x="13" y="5" width="1" height="1" />
          <rect className="px-x" x="2" y="6" width="1" height="1" />
          <rect className="px-o" x="3" y="6" width="1" height="1" />
          <rect className="px-x" x="4" y="6" width="1" height="1" />
          <rect className="px-o" x="5" y="6" width="8" height="1" />
          <rect className="px-x" x="13" y="6" width="1" height="1" />
          <rect className="px-x" x="2" y="7" width="1" height="1" />
          <rect className="px-o" x="3" y="7" width="1" height="1" />
          <rect className="px-x" x="4" y="7" width="1" height="1" />
          <rect className="px-o" x="5" y="7" width="8" height="1" />
          <rect className="px-x" x="13" y="7" width="1" height="1" />
          <rect className="px-x" x="2" y="8" width="1" height="1" />
          <rect className="px-o" x="3" y="8" width="1" height="1" />
          <rect className="px-x" x="4" y="8" width="1" height="1" />
          <rect className="px-o" x="5" y="8" width="8" height="1" />
          <rect className="px-x" x="13" y="8" width="1" height="1" />
          <rect className="px-x" x="2" y="9" width="1" height="1" />
          <rect className="px-o" x="3" y="9" width="1" height="1" />
          <rect className="px-x" x="4" y="9" width="1" height="1" />
          <rect className="px-o" x="5" y="9" width="8" height="1" />
          <rect className="px-x" x="13" y="9" width="1" height="1" />
          <rect className="px-x" x="2" y="10" width="1" height="1" />
          <rect className="px-o" x="3" y="10" width="1" height="1" />
          <rect className="px-x" x="4" y="10" width="1" height="1" />
          <rect className="px-o" x="5" y="10" width="8" height="1" />
          <rect className="px-x" x="13" y="10" width="1" height="1" />
          <rect className="px-x" x="2" y="11" width="1" height="1" />
          <rect className="px-o" x="3" y="11" width="1" height="1" />
          <rect className="px-x" x="4" y="11" width="1" height="1" />
          <rect className="px-o" x="5" y="11" width="8" height="1" />
          <rect className="px-x" x="13" y="11" width="1" height="1" />
          <rect className="px-x" x="2" y="12" width="1" height="1" />
          <rect className="px-o" x="3" y="12" width="1" height="1" />
          <rect className="px-x" x="4" y="12" width="10" height="1" />
          <rect className="px-x" x="2" y="13" width="1" height="1" />
          <rect className="px-o" x="3" y="13" width="1" height="1" />
          <rect className="px-w" x="4" y="13" width="9" height="1" />
          <rect className="px-x" x="13" y="13" width="1" height="1" />
          <rect className="px-x" x="3" y="14" width="11" height="1" />
        </svg>
        {"\n"}
        <span>
          {"Diary"}
        </span>
        {"\n"}
      </a>
      {"\n"}
      <a href="#" data-dock-icon-key="space" className={"dock-item cat-item" + (appearance.icons.dock['space'] ? ' has-custom-icon' : '')}>
        {"\n"}
        <img className="dock-icon-image" alt="Space icon" src={appearance.icons.dock['space'] || undefined} />
        {"\n"}
        <svg className="px-icon" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
          <rect className="px-x" x="4" y="1" width="2" height="1" />
          <rect className="px-x" x="10" y="1" width="2" height="1" />
          <rect className="px-x" x="3" y="2" width="1" height="1" />
          <rect className="px-o" x="4" y="2" width="2" height="1" />
          <rect className="px-x" x="6" y="2" width="1" height="1" />
          <rect className="px-x" x="9" y="2" width="1" height="1" />
          <rect className="px-o" x="10" y="2" width="2" height="1" />
          <rect className="px-x" x="12" y="2" width="1" height="1" />
          <rect className="px-x" x="3" y="3" width="1" height="1" />
          <rect className="px-o" x="4" y="3" width="2" height="1" />
          <rect className="px-x" x="6" y="3" width="1" height="1" />
          <rect className="px-x" x="9" y="3" width="1" height="1" />
          <rect className="px-o" x="10" y="3" width="2" height="1" />
          <rect className="px-x" x="12" y="3" width="1" height="1" />
          <rect className="px-x" x="1" y="4" width="2" height="1" />
          <rect className="px-x" x="4" y="4" width="2" height="1" />
          <rect className="px-x" x="10" y="4" width="2" height="1" />
          <rect className="px-x" x="13" y="4" width="2" height="1" />
          <rect className="px-x" x="0" y="5" width="1" height="1" />
          <rect className="px-o" x="1" y="5" width="2" height="1" />
          <rect className="px-x" x="3" y="5" width="1" height="1" />
          <rect className="px-x" x="12" y="5" width="1" height="1" />
          <rect className="px-o" x="13" y="5" width="2" height="1" />
          <rect className="px-x" x="15" y="5" width="1" height="1" />
          <rect className="px-x" x="0" y="6" width="1" height="1" />
          <rect className="px-o" x="1" y="6" width="2" height="1" />
          <rect className="px-x" x="3" y="6" width="1" height="1" />
          <rect className="px-x" x="6" y="6" width="4" height="1" />
          <rect className="px-x" x="12" y="6" width="1" height="1" />
          <rect className="px-o" x="13" y="6" width="2" height="1" />
          <rect className="px-x" x="15" y="6" width="1" height="1" />
          <rect className="px-x" x="1" y="7" width="2" height="1" />
          <rect className="px-x" x="5" y="7" width="1" height="1" />
          <rect className="px-o" x="6" y="7" width="4" height="1" />
          <rect className="px-x" x="10" y="7" width="1" height="1" />
          <rect className="px-x" x="13" y="7" width="2" height="1" />
          <rect className="px-x" x="3" y="8" width="1" height="1" />
          <rect className="px-o" x="4" y="8" width="8" height="1" />
          <rect className="px-x" x="12" y="8" width="1" height="1" />
          <rect className="px-x" x="2" y="9" width="1" height="1" />
          <rect className="px-o" x="3" y="9" width="10" height="1" />
          <rect className="px-x" x="13" y="9" width="1" height="1" />
          <rect className="px-x" x="2" y="10" width="1" height="1" />
          <rect className="px-o" x="3" y="10" width="10" height="1" />
          <rect className="px-x" x="13" y="10" width="1" height="1" />
          <rect className="px-x" x="2" y="11" width="1" height="1" />
          <rect className="px-o" x="3" y="11" width="10" height="1" />
          <rect className="px-x" x="13" y="11" width="1" height="1" />
          <rect className="px-x" x="3" y="12" width="1" height="1" />
          <rect className="px-o" x="4" y="12" width="3" height="1" />
          <rect className="px-x" x="7" y="12" width="2" height="1" />
          <rect className="px-o" x="9" y="12" width="3" height="1" />
          <rect className="px-x" x="12" y="12" width="1" height="1" />
          <rect className="px-x" x="4" y="13" width="3" height="1" />
          <rect className="px-x" x="9" y="13" width="3" height="1" />
        </svg>
        {"\n"}
        <span>
          {"Space"}
        </span>
        {"\n"}
      </a>
      {"\n"}
      <a href="#" id="navSettingsBtn" onClick={event => {
      event.preventDefault();
      event.stopPropagation();
      void navigation.openSettings();
    }} data-dock-icon-key="settings" className={(navigation.activeDock === 'settings' ? 'dock-item active' : 'dock-item') + (appearance.icons.dock['settings'] ? ' has-custom-icon' : '')}>
        {"\n"}
        <img className="dock-icon-image" alt="Settings icon" src={appearance.icons.dock['settings'] || undefined} />
        {"\n"}
        <svg className="px-icon" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
          <rect className="px-x" x="6" y="1" width="3" height="1" />
          <rect className="px-x" x="3" y="2" width="2" height="1" />
          <rect className="px-x" x="6" y="2" width="1" height="1" />
          <rect className="px-o" x="7" y="2" width="1" height="1" />
          <rect className="px-x" x="8" y="2" width="1" height="1" />
          <rect className="px-x" x="10" y="2" width="2" height="1" />
          <rect className="px-x" x="2" y="3" width="1" height="1" />
          <rect className="px-o" x="3" y="3" width="2" height="1" />
          <rect className="px-x" x="5" y="3" width="1" height="1" />
          <rect className="px-o" x="6" y="3" width="3" height="1" />
          <rect className="px-x" x="9" y="3" width="1" height="1" />
          <rect className="px-o" x="10" y="3" width="2" height="1" />
          <rect className="px-x" x="12" y="3" width="1" height="1" />
          <rect className="px-x" x="2" y="4" width="1" height="1" />
          <rect className="px-o" x="3" y="4" width="9" height="1" />
          <rect className="px-x" x="12" y="4" width="1" height="1" />
          <rect className="px-x" x="3" y="5" width="1" height="1" />
          <rect className="px-o" x="4" y="5" width="2" height="1" />
          <rect className="px-x" x="6" y="5" width="3" height="1" />
          <rect className="px-o" x="9" y="5" width="2" height="1" />
          <rect className="px-x" x="11" y="5" width="1" height="1" />
          <rect className="px-x" x="1" y="6" width="2" height="1" />
          <rect className="px-o" x="3" y="6" width="2" height="1" />
          <rect className="px-x" x="5" y="6" width="1" height="1" />
          <rect className="px-w" x="6" y="6" width="3" height="1" />
          <rect className="px-x" x="9" y="6" width="1" height="1" />
          <rect className="px-o" x="10" y="6" width="2" height="1" />
          <rect className="px-x" x="12" y="6" width="2" height="1" />
          <rect className="px-x" x="1" y="7" width="1" height="1" />
          <rect className="px-o" x="2" y="7" width="3" height="1" />
          <rect className="px-x" x="5" y="7" width="1" height="1" />
          <rect className="px-w" x="6" y="7" width="1" height="1" />
          <rect className="px-x" x="7" y="7" width="1" height="1" />
          <rect className="px-w" x="8" y="7" width="1" height="1" />
          <rect className="px-x" x="9" y="7" width="1" height="1" />
          <rect className="px-o" x="10" y="7" width="3" height="1" />
          <rect className="px-x" x="13" y="7" width="1" height="1" />
          <rect className="px-x" x="1" y="8" width="2" height="1" />
          <rect className="px-o" x="3" y="8" width="2" height="1" />
          <rect className="px-x" x="5" y="8" width="1" height="1" />
          <rect className="px-w" x="6" y="8" width="3" height="1" />
          <rect className="px-x" x="9" y="8" width="1" height="1" />
          <rect className="px-o" x="10" y="8" width="2" height="1" />
          <rect className="px-x" x="12" y="8" width="2" height="1" />
          <rect className="px-x" x="3" y="9" width="1" height="1" />
          <rect className="px-o" x="4" y="9" width="2" height="1" />
          <rect className="px-x" x="6" y="9" width="3" height="1" />
          <rect className="px-o" x="9" y="9" width="2" height="1" />
          <rect className="px-x" x="11" y="9" width="1" height="1" />
          <rect className="px-x" x="2" y="10" width="1" height="1" />
          <rect className="px-o" x="3" y="10" width="9" height="1" />
          <rect className="px-x" x="12" y="10" width="1" height="1" />
          <rect className="px-x" x="2" y="11" width="1" height="1" />
          <rect className="px-o" x="3" y="11" width="2" height="1" />
          <rect className="px-x" x="5" y="11" width="1" height="1" />
          <rect className="px-o" x="6" y="11" width="3" height="1" />
          <rect className="px-x" x="9" y="11" width="1" height="1" />
          <rect className="px-o" x="10" y="11" width="2" height="1" />
          <rect className="px-x" x="12" y="11" width="1" height="1" />
          <rect className="px-x" x="3" y="12" width="2" height="1" />
          <rect className="px-x" x="6" y="12" width="1" height="1" />
          <rect className="px-o" x="7" y="12" width="1" height="1" />
          <rect className="px-x" x="8" y="12" width="1" height="1" />
          <rect className="px-x" x="10" y="12" width="2" height="1" />
          <rect className="px-x" x="6" y="13" width="3" height="1" />
        </svg>
        {"\n"}
        <span>
          {"Settings"}
        </span>
        {"\n"}
      </a>
      {"\n"}
    </nav>;
}
