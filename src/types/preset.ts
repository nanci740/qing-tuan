/** 程序自带的聊天规矩，每段一个编号；内容由程序产生，预设里只能排顺序、开关（回复格式不能关）。 */
export type PresetBuiltinId = 'basics' | 'persona' | 'userPersona' | 'time' | 'presence' | 'markers' | 'sameTurn' | 'format' | 'recall' | 'voice' | 'photo' | 'location' | 'output' | 'quote';
/** system：放进系统提示词，按条目顺序排；front / tail：聊天记录前面、最后，单独成一条消息；depth：插在倒数第几条消息之前。 */
export type PresetPlacement = 'system' | 'front' | 'tail' | 'depth';
export type PresetRole = 'system' | 'user' | 'assistant';
export type PresetAnchor = 'start' | 'end' | PresetBuiltinId;
export interface PresetEntry {
  id: string;
  /** 有值就是程序自带的那段；没有就是自己写的条目。 */
  builtin?: PresetBuiltinId;
  name: string;
  content: string;
  enabled: boolean;
  role: PresetRole;
  placement: PresetPlacement;
  /** 放进系统提示词时接在哪一段自带段落后面；'start' 是最前面，'end' 是最后面。自带段落永远排在自己写的条目上面。 */
  anchor?: PresetAnchor;
  depth: number;
  /** 导入时看起来跟回复格式有关，先关掉，提醒检查。 */
  warn?: boolean;
}
export interface PresetParam { enabled: boolean; value: number }
/** 打开的参数会盖过 API 设置；单次回复上限 0 表示不限。 */
export interface PresetParams { temperature: PresetParam; topP: PresetParam; maxTokens: PresetParam }
export interface Preset { id: string; name: string; entries: PresetEntry[]; params: PresetParams; updatedAt: number }
export interface PresetStore { presets: Preset[]; defaultId: string }
