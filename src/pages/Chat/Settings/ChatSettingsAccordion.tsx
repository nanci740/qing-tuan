import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { PressedButton } from '../../../components/shared/PressedButton';

export type ChatSettingsSection = 'role' | 'reply' | 'opening' | 'appearance' | 'feedback' | 'display' | 'data';
interface AccordionState {
  open: ChatSettingsSection | null;
  toggle(section: ChatSettingsSection): void;
}
const AccordionContext = createContext<AccordionState | null>(null);
const SectionContext = createContext<ChatSettingsSection | null>(null);

/** 原栏目仅允许一个展开；返回、换角色或恢复设置不重置当前栏目。 */
export function ChatSettingsAccordion({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<ChatSettingsSection | null>(null);
  const toggle = (section: ChatSettingsSection) => setOpen(current => current === section ? null : section);
  return <AccordionContext.Provider value={{ open, toggle }}>{children}</AccordionContext.Provider>;
}
function useAccordion() {
  const state = useContext(AccordionContext);
  if (!state) throw new Error('ChatSettingsAccordion is required');
  return state;
}
export function ChatSettingsEntry({ section, children }: { section: ChatSettingsSection; children: ReactNode }) {
  const { open } = useAccordion();
  return <SectionContext.Provider value={section}>
    <div className={'chat-settings-entry' + (open === section ? ' is-open' : '')} data-chat-settings-entry={section}>{children}</div>
  </SectionContext.Provider>;
}
export function ChatSettingsEntryButton({ children }: { children: ReactNode }) {
  const { open, toggle } = useAccordion();
  const section = useContext(SectionContext);
  if (!section) throw new Error('ChatSettingsEntry is required');
  return <PressedButton className="chat-settings-entry-button" type="button" aria-expanded={open === section} onClick={() => toggle(section)}>{children}</PressedButton>;
}
