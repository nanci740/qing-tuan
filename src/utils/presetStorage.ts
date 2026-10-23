import { kv } from './kvStorage';
import type { Preset, PresetAnchor, PresetBuiltinId, PresetEntry, PresetParams, PresetPlacement, PresetRole, PresetStore } from '../types/preset';
import { showToast } from './toast';

export const PRESET_STORAGE_KEY = 'qingtuan_presets_v1';
const uid = () => String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7);

/** 程序自带的几段，照聊天提示词原本的顺序。 */
export const PRESET_BUILTINS: readonly { id: PresetBuiltinId; name: string; note: string; locked?: boolean }[] = [
  { id: 'basics', name: '基本说明', note: '告诉模型它正在扮演这个角色，跟你用手机聊天。' },
  { id: 'persona', name: '角色人设', note: '角色档案整理成的人设。世界书的「人设前」「人设后」放在它前后。' },
  { id: 'userPersona', name: '你的人设', note: '聊天 App「我」里正在用的人设：名字、外貌、关于你。没选人设就不送。' },
  { id: 'time', name: '当前时间', note: '聊天设置开了时间感知才送。世界书的「中部」放在它后面。' },
  { id: 'presence', name: '在线状态', note: '双方的在线状态，以及角色怎么更新自己的状态。' },
  { id: 'markers', name: '聊天标记说明', note: '聊天记录里出现引用、编辑、撤回的标记时，才送对应的说明。' },
  { id: 'sameTurn', name: '连发提醒', note: '你连着发了两条以上时，提醒它一起回。' },
  { id: 'format', name: '回复格式', note: '回复长度、JSON 格式、分不分条。回复要靠它解析，不能关。', locked: true },
  { id: 'recall', name: '撤回', note: '角色可以把刚发的消息撤回。' },
  { id: 'voice', name: '语音', note: '聊天设置开了语音才送。' },
  { id: 'photo', name: '照片', note: '聊天设置开了发照片才送。' },
  { id: 'location', name: '位置', note: '角色可以发定位卡片，什么时候发、怎么写。' },
  { id: 'sticker', name: '表情', note: '「我 → 表情」里家机能用的表情标签，他只能从里面挑。没有表情就不送。' },
  { id: 'pay', name: '转账红包', note: '角色可以给你转账、发红包，也可以收下或退回你给他的。' },
  { id: 'output', name: '输出规则', note: '不要输出内部标签和 Markdown 代码块。' },
  { id: 'quote', name: '引用', note: '引用规则和可以引用的消息编号。设成不引用时只留一句。' },
];
export const builtinInfo = (id: PresetBuiltinId) => PRESET_BUILTINS.find(item => item.id === id)!;

const defaultParams = (): PresetParams => ({ temperature: { enabled: false, value: 0.8 }, topP: { enabled: false, value: 1 }, maxTokens: { enabled: false, value: 0 } });
const builtinEntry = (id: PresetBuiltinId): PresetEntry => ({ id: 'builtin-' + id, builtin: id, name: builtinInfo(id).name, content: '', enabled: true, role: 'system', placement: 'system', depth: 0 });
export function newPresetEntry(): PresetEntry { return { id: uid(), name: '', content: '', enabled: true, role: 'system', placement: 'system', anchor: 'end', depth: 4 }; }
const isAnchor = (value: unknown): value is PresetAnchor => value === 'start' || value === 'end' || PRESET_BUILTINS.some(item => item.id === value);
export function createPreset(name = '默认预设'): Preset {
  return { id: uid(), name, entries: PRESET_BUILTINS.map(item => builtinEntry(item.id)), params: defaultParams(), updatedAt: Date.now() };
}

type Raw = Record<string, unknown>;
const isRaw = (value: unknown): value is Raw => !!value && typeof value === 'object' && !Array.isArray(value);
const clampNumber = (value: unknown, min: number, max: number, fallback: number) => { const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; };
const ROLES: PresetRole[] = ['system', 'user', 'assistant'], PLACEMENTS: PresetPlacement[] = ['system', 'front', 'tail', 'depth'];
function cleanEntry(value: unknown): PresetEntry | null {
  if (!isRaw(value)) return null;
  const builtin = PRESET_BUILTINS.some(item => item.id === value.builtin) ? value.builtin as PresetBuiltinId : undefined;
  if (builtin) return { ...builtinEntry(builtin), enabled: builtinInfo(builtin).locked ? true : value.enabled !== false };
  const placement = PLACEMENTS.includes(value.placement as PresetPlacement) ? value.placement as PresetPlacement : 'system';
  return {
    id: typeof value.id === 'string' && value.id && !value.id.startsWith('builtin-') ? value.id : uid(),
    name: String(value.name ?? '').slice(0, 80), content: String(value.content ?? ''), enabled: value.enabled !== false,
    role: placement === 'system' ? 'system' : ROLES.includes(value.role as PresetRole) ? value.role as PresetRole : 'system',
    placement, ...(isAnchor(value.anchor) ? { anchor: value.anchor } : {}), depth: Math.floor(clampNumber(value.depth, 0, 999, 4)), ...(value.warn === true ? { warn: true } : {}),
  };
}
function cleanParams(value: unknown): PresetParams {
  const source = isRaw(value) ? value : {}, defaults = defaultParams();
  const param = (key: keyof PresetParams, min: number, max: number) => { const raw = isRaw(source[key]) ? source[key] as Raw : {}; return { enabled: raw.enabled === true, value: clampNumber(raw.value, min, max, defaults[key].value) }; };
  return { temperature: param('temperature', 0, 2), topP: param('topP', 0, 1), maxTokens: param('maxTokens', 0, 32768) };
}
/** 整理一份预设：缺少的自带段落补回原本的位置，回复格式一定开着，同一个自带段落只留一个。
 * 排成自带段落在上、自己写的在下；以前夹在自带段落中间的条目，记下它原本接在哪一段后面（anchor），送出去的位置不变。 */
export function cleanPreset(value: unknown, keepId = true): Preset | null {
  if (!isRaw(value) || !Array.isArray(value.entries)) return null;
  const seen = new Set<string>(), entries: PresetEntry[] = [];
  let lastBuiltin: PresetAnchor = 'start';
  for (const raw of value.entries) {
    const entry = cleanEntry(raw);
    if (!entry || (entry.builtin && seen.has(entry.builtin))) continue;
    if (entry.builtin) { seen.add(entry.builtin); lastBuiltin = entry.builtin; }
    else if (!entry.anchor) entry.anchor = lastBuiltin;
    entries.push(keepId || entry.builtin ? entry : { ...entry, id: uid() });
  }
  entries.sort((a, b) => Number(!a.builtin) - Number(!b.builtin));
  PRESET_BUILTINS.forEach((item, index) => {
    if (seen.has(item.id)) return;
    const previous = PRESET_BUILTINS.slice(0, index).reverse().find(other => seen.has(other.id));
    const at = previous ? entries.findIndex(entry => entry.builtin === previous.id) + 1 : 0;
    entries.splice(at, 0, builtinEntry(item.id)); seen.add(item.id);
  });
  return { id: keepId && typeof value.id === 'string' && value.id ? value.id : uid(), name: String(value.name || '未命名预设').slice(0, 60), entries, params: cleanParams(value.params), updatedAt: Number(value.updatedAt) || Date.now() };
}

// ===== 存取：放在 IndexedDB 设定库（kv），改了通知订阅的画面 =====
let cache: PresetStore | null = null;
const listeners = new Set<() => void>();
export function readPresetStore(): PresetStore {
  if (cache) return cache;
  let saved: unknown = null;
  try { saved = JSON.parse(kv.getItem(PRESET_STORAGE_KEY) || 'null'); } catch { saved = null; }
  const presets = isRaw(saved) && Array.isArray(saved.presets) ? saved.presets.map(item => cleanPreset(item)).filter((item): item is Preset => !!item) : [];
  if (!presets.length) presets.push(createPreset());
  const defaultId = isRaw(saved) && presets.some(item => item.id === saved.defaultId) ? String(saved.defaultId) : presets[0].id;
  cache = { presets, defaultId };
  return cache;
}
/** 存进去了回 true。存不进去（多半是浏览器空间满了）就保留上次存的、提醒一声，回 false。 */
export function writePresetStore(next: PresetStore): boolean {
  const presets = next.presets.length ? next.presets : [createPreset()];
  const candidate = { presets, defaultId: presets.some(item => item.id === next.defaultId) ? next.defaultId : presets[0].id };
  try { kv.setItem(PRESET_STORAGE_KEY, JSON.stringify(candidate)); }
  catch {
    showToast('预设没有存进去：浏览器的存储空间可能满了，可以先导出备份，再删掉用不到的预设');
    listeners.forEach(listener => listener());
    return false;
  }
  cache = candidate;
  listeners.forEach(listener => listener());
  return true;
}
export function subscribePresets(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
/** 聊天用哪份预设：聊天设置另选的那份，没选或找不到就用默认那份。 */
export function resolvePreset(presetId?: string): Preset {
  const store = readPresetStore();
  return store.presets.find(item => item.id === presetId) || store.presets.find(item => item.id === store.defaultId) || store.presets[0];
}

// ===== 导出、导入 =====
export function exportPresetsJson(presets: Preset[]) { return JSON.stringify({ format: 'qingtuan-preset', version: 1, exportedAt: new Date().toISOString(), presets }, null, 2); }
/** 酒馆里这些是占位条目（人设、聊天记录、世界书……），我们自己有，跳过。 */
const ST_MARKERS = new Set(['chatHistory', 'worldInfoBefore', 'worldInfoAfter', 'charDescription', 'charPersonality', 'scenario', 'personaDescription', 'dialogueExamples']);
/** 看起来跟回复格式有关的条目：先关掉，提醒检查，免得跟我们的 JSON 格式打架。 */
const FORMAT_HINT = /输出格式|回复格式|格式要求|格式规范|JSON|XML|markdown|代码块|<\/?[a-z_][\w-]*>|\bformat\b|\boutput\b/i;
function convertSillyTavernPreset(source: Raw, name: string): Preset {
  const prompts = (source.prompts as unknown[]).filter(isRaw);
  const orders = Array.isArray(source.prompt_order) ? source.prompt_order.filter(isRaw) : [];
  const chosen = orders.find(item => Number(item.character_id) === 100001) || orders.slice().sort((a, b) => (Array.isArray(b.order) ? b.order.length : 0) - (Array.isArray(a.order) ? a.order.length : 0))[0];
  const order = chosen && Array.isArray(chosen.order) ? chosen.order.filter(isRaw).map(item => ({ identifier: String(item.identifier), enabled: item.enabled !== false })) : prompts.map(item => ({ identifier: String(item.identifier), enabled: item.enabled !== false }));
  const historyAt = order.findIndex(item => item.identifier === 'chatHistory');
  const systemEntries: PresetEntry[] = [], messageEntries: PresetEntry[] = [];
  order.forEach((slot, index) => {
    const prompt = prompts.find(item => String(item.identifier) === slot.identifier);
    if (!prompt || prompt.marker === true || ST_MARKERS.has(slot.identifier) || !String(prompt.content ?? '').trim()) return;
    const role = ROLES.includes(prompt.role as PresetRole) ? prompt.role as PresetRole : 'system';
    const afterHistory = historyAt >= 0 && index > historyAt;
    const placement: PresetPlacement = Number(prompt.injection_position) === 1 ? 'depth' : afterHistory ? 'tail' : role === 'system' ? 'system' : 'front';
    const content = String(prompt.content), warn = FORMAT_HINT.test(content);
    const entry: PresetEntry = { id: uid(), name: String(prompt.name || slot.identifier).slice(0, 80), content, enabled: slot.enabled && !warn, role: placement === 'system' ? 'system' : role, placement, depth: Math.floor(clampNumber(prompt.injection_depth, 0, 999, 4)), ...(warn ? { warn: true } : {}) };
    (placement === 'system' ? systemEntries : messageEntries).push(entry);
  });
  const preset = createPreset(name);
  // 酒馆的系统条目接在「角色人设」后面，单独成消息的照原本顺序排在后面。
  preset.entries.push(...systemEntries.map(entry => ({ ...entry, anchor: 'persona' as const })), ...messageEntries);
  // 单次回复上限先不打开：酒馆预设的数字常常太小，思考型模型会想完就没额度。
  if (typeof source.temperature === 'number') preset.params.temperature = { enabled: true, value: clampNumber(source.temperature, 0, 2, 0.8) };
  if (typeof source.top_p === 'number') preset.params.topP = { enabled: true, value: clampNumber(source.top_p, 0, 1, 1) };
  if (typeof source.openai_max_tokens === 'number') preset.params.maxTokens = { enabled: false, value: clampNumber(source.openai_max_tokens, 0, 32768, 0) };
  return preset;
}
/** 认得我们的格式（一份或多份）和酒馆预设；认不出就丢错误。导进来的都给新编号。 */
export function parsePresetImport(value: unknown, fileName: string): Preset[] {
  const name = fileName.replace(/\.json$/i, '') || '导入的预设';
  if (isRaw(value) && Array.isArray(value.prompts)) return [convertSillyTavernPreset(value, name)];
  const list = isRaw(value) && Array.isArray(value.presets) ? value.presets : Array.isArray(value) ? value : isRaw(value) && Array.isArray(value.entries) ? [value] : null;
  if (!list || !list.length || list.length > 100) throw Error('不是有效的预设 JSON');
  const presets = list.map(item => cleanPreset(item, false));
  if (presets.some(item => !item)) throw Error('预设 JSON 格式不符');
  return presets as Preset[];
}
