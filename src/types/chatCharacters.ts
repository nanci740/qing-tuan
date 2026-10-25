import type { CharacterDossier } from './characterDossier';
import type { ChatConfirmationOptions } from './chatCharacterActions';
/** 群聊：members 是成员的 archiveId，notice 群公告，nick 你在群里的昵称，know 成员认不认识彼此（照档案里的关系）。 */
export interface ChatGroup { members: string[]; notice: string; nick: string; know: boolean }
export interface ChatCharacter extends CharacterDossier {
  archiveId: string;
  dossierId: string;
  photoUrl: string;
  name: string;
  archivedAt: unknown;
  pinned: boolean;
  favorite: boolean;
  /** 有这个就是群聊（跟角色放在同一份聊天清单里，聊天记录、置顶、未读都共用）。 */
  group?: ChatGroup;
}
export interface ChatCharacterRoomServices {
  render: () => void;
  syncSaved: (character: ChatCharacter) => void;
  cleanup: (character: ChatCharacter) => void;
  saveHistories: () => void;
  finishRemoval: (character: ChatCharacter) => void;
  confirm: (options: ChatConfirmationOptions) => Promise<boolean>;
}
export interface ChatCharacterStoreBridge {
  read: () => ChatCharacter[];
  ordered: () => ChatCharacter[];
  readFlags: (id: string) => {
    pinned: boolean;
    favorite: boolean;
  } | null;
  attach: (services: ChatCharacterRoomServices) => void;
  saveArchive: (record: CharacterDossier) => Promise<boolean>;
  patch: (id: string, fields: {
    pinned?: boolean;
    favorite?: boolean;
  }) => void;
  removeFromList: (id: string) => Promise<void>;
  /** 群聊：新建或整个换掉（照 archiveId）、解散（聊天记录一起删）。 */
  saveGroup: (group: ChatCharacter) => Promise<boolean>;
  removeGroup: (id: string) => Promise<boolean>;
  removeByDossier: (id: CharacterDossier['id']) => Promise<boolean>;
}
