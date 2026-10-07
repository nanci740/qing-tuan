import { Children, cloneElement, isValidElement, useState } from 'react';
import type { ReactNode, ReactElement } from 'react';
import { readCollapsedSettings, toggleCollapsedSetting } from '../../utils/settingsStorage';

interface SectionProps { number: string; children: ReactNode; }
export function SettingsSection({ number, children }: SectionProps) {
  const [collapsed, setCollapsed] = useState(() => readCollapsedSettings().includes(number));
  function flip() {
    const next = !collapsed;
    setCollapsed(next);
    toggleCollapsedSetting(number, next);
  }
  const itemCount = Children.toArray(children).filter(child => isValidElement<{ className?: string }>(child) && child.props.className?.split(' ').includes('settings-item')).length;
  const content = Children.toArray(children).flatMap<ReactNode>(child => {
    if (!isValidElement<{ className?: string; children?: ReactNode }>(child) || child.props.className !== 'settings-section-title') return [child];
    const title = cloneElement(child as ReactElement<Record<string, unknown>>, {
      role: 'button', tabIndex: 0, 'aria-expanded': !collapsed,
      onClick: flip,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flip(); }
      },
      children: <span className="retro-sec-head"><span className="retro-sec-toggle" /><span className="retro-sec-no">{number.padStart(2, '0')}</span><span className="retro-sec-text">{child.props.children}</span></span>,
    });
    return number === '1' ? [title, <div key="menubar" className="retro-menubar" aria-hidden="true">{['文件', '编辑', '查看', '帮助'].map(label => <span key={label}>{label}</span>)}</div>] : [title];
  });
  return <div className={collapsed ? 'settings-section is-collapsed' : 'settings-section'}>{content}{number === '2' && <div className="retro-win-status" aria-hidden="true"><span>{`${itemCount} 个项目`}</span><span>就绪</span></div>}</div>;
}
