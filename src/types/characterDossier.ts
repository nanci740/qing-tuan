/** 完整私有 PNG 资料允许附加字段；通用卡片只映射原先支持的字段。 */
export interface CharacterDossier {
  id?: string;
  customTags?: string[];
  relationships?: CharacterRelationship[];
  name?: string;
  nickname?: string;
  birthday?: string;
  constellation?: string;
  relationship?: string;
  mbti?: string;
  quote?: string;
  appearanceText?: string;
  speechHabitsText?: string;
  onlineStyle?: string;
  offlineStyle?: string;
  memoriesText?: string;
  otherSettingsText?: string;
  secretMemo?: string;
  favoriteThings?: string;
  dislikes?: string;
  photoUrl?: string;
  photoPositionX?: number | string;
  photoPositionY?: number | string;
  selectedTags?: string[];
  [field: string]: unknown;
}
export type ImportedDossier = Record<string, unknown>;
/** 临时连接尚未迁移的档案编辑器；编辑器迁移后直接传 React 状态及提交函数。 */
export interface CharacterPngEditorBridge {
  container: HTMLElement | null;
  readCurrent: () => CharacterDossier;
  commitImport: (record: ImportedDossier) => Promise<CharacterDossier>;
}
export interface CharacterRelationship {
  id: string;
  targetDossierId?: string;
  targetName?: string;
  relationType?: string;
  note?: string;
  [field: string]: unknown;
}
export interface CharacterEditorBridge {
  container: HTMLElement;
  banner: HTMLElement;
  switchContainer: HTMLElement | null;
  titlebar: HTMLElement;
  footer: HTMLElement;
  prepareOpen: (target?: unknown) => void;
  finishClose: () => void;
  newRecord: () => void;
  saveRecord: () => Promise<void>;
  deleteRecord: () => Promise<void>;
  overlay: HTMLDivElement;
  selectRecord: (index: number) => void;
  patch: (fields: Partial<CharacterDossier>) => void;
  closeMenu: () => void;
}
export interface CharacterEditorSnapshot {
  kind: 'form' | 'fields';
  index: number;
  record: CharacterDossier;
  records: CharacterDossier[];
}

/** 聊天主体尚未迁移，档案保存后的清单同步及共享确认暂经此接口。 */
export interface CharacterChatServices {
  saveToChat: (record: CharacterDossier) => Promise<boolean>;
  removeFromChat: (id: CharacterDossier['id']) => void;
  confirm: (options: { title: string; message: string; confirmText: string; danger: boolean }) => Promise<boolean>;
  syncIdentity: () => void;
}
