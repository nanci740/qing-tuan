import type { CharacterDossier } from './characterDossier';
import type { ChatConfirmationOptions } from './chatCharacterActions';
export interface ChatCharacter extends CharacterDossier {
  archiveId: string;
  dossierId: string;
  photoUrl: string;
  name: string;
  archivedAt: unknown;
  pinned: boolean;
  favorite: boolean;
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
  removeByDossier: (id: CharacterDossier['id']) => Promise<boolean>;
}
