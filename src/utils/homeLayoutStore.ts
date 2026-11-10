import { kv } from './kvStorage';
import { DEFAULT_LAYOUT, normalize } from './homeLayout';
import type { HomeLayout } from './homeLayout';

/** 主画面排法存在设定里（整机备份会一起带）。 */
const KEY = 'qingtuan_home_layout_v1';
export const HOME_LAYOUT_EVENT = 'qingtuan:home-layout';
export function readLayout(): HomeLayout { try { const text = kv.getItem(KEY); return text ? normalize(JSON.parse(text)) : DEFAULT_LAYOUT; } catch { return DEFAULT_LAYOUT; } }
export function writeLayout(layout: HomeLayout) {
  try { kv.setItem(KEY, JSON.stringify(layout)); } catch { /* 存不了就只在这次有效 */ }
  window.dispatchEvent(new CustomEvent(HOME_LAYOUT_EVENT));
}
