import { storeImage, imageReference } from '../utils/imageAssets';
import { useLayoutEffect, useRef, useState } from 'react';
import type { CharacterDossier } from '../types/characterDossier';
import type { ChatCharacter, ChatCharacterRoomServices, ChatCharacterStoreBridge } from '../types/chatCharacters';
import { deleteCharacterArchive, readChatCharacters, shrinkChatCharacterAvatar, writeChatCharacters } from '../utils/chatCharacterStorage';
import { showToast } from '../utils/toast';
function text(value: unknown, fallback = '') {
  return String(value == null ? '' : value).trim() || fallback;
}
/** 角色清单只在 React 内持有；同步 ref 保留原异步归档和连续点击读取最新清单的时机。 */
export function useChatCharacters() {
  const [records, setRecords] = useState<ChatCharacter[]>([]);
  const data = useRef(records),
    room = useRef<ChatCharacterRoomServices | null>(null),
    loaded = useRef(false);
  function update() {
    setRecords([...data.current]);
  }
  async function persist() {
    const ok = await writeChatCharacters(data.current);
    if (!ok) { data.current = readChatCharacters(); update(); }
    return ok;
  }
  async function saveArchive(record: CharacterDossier) {
    const dossierId = text(record?.id, '001');
    let photoUrl = record.photoUrl || '';
    try {
      if (imageReference(photoUrl) === photoUrl && !photoUrl.startsWith('data:image/gif') && !photoUrl.startsWith('data:image/svg+xml')) photoUrl = await shrinkChatCharacterAvatar(photoUrl);
      await storeImage(photoUrl);
    } catch {
      showToast('头像读取失败，请重新上传');
      return false;
    }
    const existingIndex = data.current.findIndex(item => item.dossierId === dossierId);
    const existing = existingIndex >= 0 ? data.current[existingIndex] : null;
    const character: ChatCharacter = {
      ...record,
      id: record.id || dossierId,
      photoUrl,
      dossierId,
      archiveId: existing?.archiveId || 'character-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      name: text(record?.name, text(record?.nickname, '未命名角色')),
      archivedAt: record?.archivedAt || new Date().toISOString(),
      pinned: Boolean(existing?.pinned),
      favorite: Boolean(existing?.favorite)
    };
    data.current = [...data.current];
    if (existingIndex >= 0) data.current.splice(existingIndex, 1, character);else data.current.push(character);
    if (!await persist()) {
      return false;
    }
    update();
    room.current!.render();
    room.current!.syncSaved(character);
    return true;
  }
  async function patch(id: string, fields: {
    pinned?: boolean;
    favorite?: boolean;
  }) {
    const record = data.current.find(item => item.archiveId === id);
    if (!record) return;
    data.current = data.current.map(item => item.archiveId === id ? {...item, ...fields} : item);
    update();
    if (!await persist()) return;
    room.current!.render();
  }
  async function beginRemove(character: ChatCharacter) {
    const next = data.current.filter(item => item.archiveId !== character.archiveId);
    if (!await writeChatCharacters(next)) return false;
    data.current = readChatCharacters();
    update();
    room.current!.cleanup(character);
    room.current!.saveHistories();
    return true;
  }
  async function removeFromList(id: string) {
    const character = data.current.find(item => item.archiveId === id);
    if (!character) return;
    const name = text(character.name, text(character.nickname, '这个角色'));
    const confirmed = await room.current!.confirm({
      title: '删除角色',
      message: '确定删除「' + name + '」吗？删除后，这个角色的档案与聊天记录也会一起移除。',
      confirmText: '删除',
      cancelText: '取消',
      danger: true
    });
    if (!confirmed) return;
    if (!await beginRemove(character)) return;
    const archiveDeleted = await deleteCharacterArchive(character.dossierId);
    room.current!.render();
    room.current!.finishRemoval(character);
    if (archiveDeleted) showToast('角色已删除');
  }
  async function removeByDossier(id: CharacterDossier['id']) {
    const character = data.current.find(item => item.dossierId === String(id));
    if (!character) return true;
    if (!await beginRemove(character)) return false;
    room.current!.render();
    room.current!.finishRemoval(character);
    return true;
  }
  useLayoutEffect(() => {
    const connect = (event: Event) => {
      if (!loaded.current) {
        data.current = readChatCharacters();
        loaded.current = true;
        update();
      }
      const bridge: ChatCharacterStoreBridge = {
        read: () => data.current,
        ordered: () => [...data.current].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))),
        readFlags: id => {
          const record = data.current.find(item => item.archiveId === id);
          return record ? {
            pinned: Boolean(record.pinned),
            favorite: Boolean(record.favorite)
          } : null;
        },
        attach: services => {
          room.current = services;
        },
        saveArchive,
        patch,
        removeFromList,
        removeByDossier
      };
      (event as CustomEvent<{
        accept: (bridge: ChatCharacterStoreBridge) => void;
      }>).detail.accept(bridge);
    };
    window.addEventListener('qingtuan:chat-character-store-connect', connect);
    return () => window.removeEventListener('qingtuan:chat-character-store-connect', connect);
  }, []);
}
