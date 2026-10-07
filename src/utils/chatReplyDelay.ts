const AUTO_REPLY_DELAY_KEY = 'smallphone_chat_auto_reply_delay';
export function getAutoReplyDelayMs(): number {
  let sec = 7;
  try {
    const saved = Number(localStorage.getItem(AUTO_REPLY_DELAY_KEY));
    if (Number.isFinite(saved) && saved >= 1 && saved <= 120) sec = saved;
  } catch { /* 原读取失败使用默认秒数。 */ }
  return sec * 1000;
}
export function setAutoReplyDelay(value: unknown): void {
  try { localStorage.setItem(AUTO_REPLY_DELAY_KEY, String(value)); } catch { /* 原保存失败不提示。 */ }
}
