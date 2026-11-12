import { kv } from './kvStorage';

/**
 * 主画面后来加的三个组件（一句话、登录框、日历）里自己写的字；图片另外存在图片库（IMAGE_SLOT）。
 * 存在设定里，整机备份、主题方案都会一起带。
 */
export const HOME_WIDGETS_KEY = 'qingtuan_home_widgets_v1';
export const HOME_WIDGETS_EVENT = 'qingtuan:home-widgets';
export type WidgetId = 'hello' | 'login' | 'calendar';
export const WIDGET_IDS: WidgetId[] = ['hello', 'login', 'calendar'];
/** 每个组件那张图存在图片库的哪一格。 */
export const WIDGET_IMAGE: Record<WidgetId, string> = { hello: 'qingtuan_home_widget_hello', login: 'qingtuan_home_widget_login', calendar: 'qingtuan_home_widget_calendar' };

export interface WidgetField { key: string; label: string; max: number; placeholder: string }
/** 每个组件能写的几行字（设定框照这个排）。 */
export const WIDGET_FIELDS: Record<WidgetId, WidgetField[]> = {
  hello: [
    { key: 'name', label: '名字', max: 16, placeholder: '粗体那一行' },
    { key: 'text', label: '那句话', max: 40, placeholder: '名字下面那一行' }
  ],
  login: [
    { key: 'name', label: '第一栏', max: 16, placeholder: '例如名字' },
    { key: 'second', label: '第二栏', max: 20, placeholder: '例如 •••••••• 或一句话' }
  ],
  calendar: [
    { key: 'caption', label: '图片上的字', max: 24, placeholder: '空着就不显示' },
    { key: 'status', label: '最底下那栏', max: 30, placeholder: '例如 今天也要开心 ♡' }
  ]
};
export const WIDGET_DEFAULTS: Record<WidgetId, Record<string, string>> = {
  hello: { name: '青团', text: '今天也要好好吃饭。' },
  login: { name: '青团', second: '••••••••' },
  calendar: { caption: 'have a nice day ♡', status: '今天也要开心 ♡' }
};
export type WidgetTexts = Record<WidgetId, Record<string, string>>;

/** 读回来的：只留认得的字，太长的切掉，没写过的用预设。 */
export function normalizeWidgets(raw: unknown): WidgetTexts {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const out = {} as WidgetTexts;
  for (const id of WIDGET_IDS) {
    const given = source[id] && typeof source[id] === 'object' ? source[id] as Record<string, unknown> : {};
    out[id] = Object.fromEntries(WIDGET_FIELDS[id].map(field => [field.key, typeof given[field.key] === 'string' ? String(given[field.key]).slice(0, field.max) : WIDGET_DEFAULTS[id][field.key]]));
  }
  return out;
}
export function readWidgets(): WidgetTexts {
  try { const text = kv.getItem(HOME_WIDGETS_KEY); return normalizeWidgets(text ? JSON.parse(text) : null); } catch { return normalizeWidgets(null); }
}
export function writeWidgets(texts: WidgetTexts) {
  try { kv.setItem(HOME_WIDGETS_KEY, JSON.stringify(normalizeWidgets(texts))); } catch { /* 存不了就只在这次有效 */ }
  window.dispatchEvent(new CustomEvent(HOME_WIDGETS_EVENT));
}
