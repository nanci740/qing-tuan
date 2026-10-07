import {readStoredDraft, saveStoredDraft, markChatDraftSent} from './chatRecords';
import {showToast} from './toast';
let lastErrorAt = 0;
export function readChatDraft(key: string): string {
  if (!key || key === 'no-character') return '';
  return readStoredDraft(key);
}
export function writeChatDraft(key: string, value: unknown): void {
  if (!key || key === 'no-character') return;
  const text = String(value || '');
  void saveStoredDraft(key, text).catch(() => {
    // Keep unsaved text in this session; do not interrupt typing with a toast per keystroke.
    if (!lastErrorAt || Date.now() - lastErrorAt > 8000) {
      lastErrorAt = Date.now();showToast('草稿保存失败，文字暂留在本次页面中，请重试');
    }
  });
  window.dispatchEvent(new CustomEvent('smallphone-chat-draft-change', { detail: { chatKey: key, text } }));
}

export function clearSentChatDraft(key: string): void {
  if (!key || key === 'no-character') return;
  markChatDraftSent(key);
  window.dispatchEvent(new CustomEvent('smallphone-chat-draft-change', {detail: {chatKey: key, text: ''}}));
}
