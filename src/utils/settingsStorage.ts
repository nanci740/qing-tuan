export const SETTINGS_AVATAR_KEY = 'smallphone_settings_profile_avatar_v1';
export function readCollapsedSettings(): string[] {
  try { return JSON.parse(localStorage.getItem('qingtuan_settings_collapsed') || '[]'); }
  catch { return []; }
}
export function toggleCollapsedSetting(number: string, collapsed: boolean): void {
  try {
    const list = new Set<string>(JSON.parse(localStorage.getItem('qingtuan_settings_collapsed') || '[]'));
    if (collapsed) list.add(number); else list.delete(number);
    localStorage.setItem('qingtuan_settings_collapsed', JSON.stringify([...list]));
  } catch { /* 保留原行为：存储失败仍允许本次折叠。 */ }
}
export function nextVisitorCount(): string {
  let visits = 1;
  try {
    visits = (parseInt(localStorage.getItem('qingtuan_visitor_count') || '', 10) || 0) + 1;
    localStorage.setItem('qingtuan_visitor_count', String(visits));
  } catch { /* 原计数回退为 1。 */ }
  return String(visits).padStart(6, '0');
}
export function readSettingsAvatar(): string {
  try { return localStorage.getItem(SETTINGS_AVATAR_KEY) || localStorage.getItem('avatar_star_custom') || ''; }
  catch { return ''; }
}
