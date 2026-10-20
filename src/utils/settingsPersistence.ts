import { kv } from './kvStorage';
/** Commit related local settings before updating the UI; restore written keys on failure. */
export function writeSettingsBatch(values: Record<string, string | null>): void {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, kv.getItem(key)]));
  const changed: string[] = [];
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === previous[key]) continue;
      if (value === null) kv.removeItem(key);else kv.setItem(key, value);
      changed.push(key);
    }
  } catch {
    let restored = true;
    for (const key of changed.reverse()) {
      try {if (previous[key] === null) kv.removeItem(key);else kv.setItem(key, previous[key]);}
      catch {restored = false;}
    }
    throw new Error(restored ? '设置保存失败，请检查浏览器存储空间后重试' : '设置保存失败，部分旧设置未能恢复，请重新检查设置');
  }
}
