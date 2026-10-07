/** 页间通知使用事件传递数据，显示状态由 SaveToast 自己持有。 */
export function showToast(message: string) {
  if (message) window.dispatchEvent(new CustomEvent('qingtuan:toast', { detail: message }));
}
