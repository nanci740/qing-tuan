const DRAFTS_KEY = 'smallphone_chat_drafts_v1';
function readDrafts(): Record<string, unknown> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved as Record<string, unknown> : {};
  } catch { return {}; }
}
export function readChatDraft(key: string): string {
  if (!key || key === 'no-character') return '';
  return String(readDrafts()[key] || '');
}
export function writeChatDraft(key: string, value: unknown): void {
  if (!key || key === 'no-character') return;
  const drafts = readDrafts(), text = String(value || '');
  if (text) drafts[key] = text; else delete drafts[key];
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); } catch { /* 原保存失败仍发草稿更新事件。 */ }
  window.dispatchEvent(new CustomEvent('smallphone-chat-draft-change', { detail: { chatKey: key, text } }));
}
