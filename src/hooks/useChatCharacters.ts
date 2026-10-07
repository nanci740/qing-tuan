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
  function persist() {
    const ok = writeChatCharacters(data.current);
    if (!ok) showToast('角色保存失败：请检查浏览器存储空间');
    return ok;
  }
  async function saveArchive(record: CharacterDossier) {
    const dossierId = text(record?.id, '001');
    const existingIndex = data.current.findIndex(item => item.dossierId === dossierId);
    const existing = existingIndex >= 0 ? data.current[existingIndex] : null;
    let photoUrl = record.photoUrl || '';
    try {
      photoUrl = await shrinkChatCharacterAvatar(photoUrl);
    } catch {
      showToast('头像读取失败，请重新上传');
      return false;
    }
    const character: ChatCharacter = {
      ...record,
      photoUrl,
      dossierId,
      archiveId: existing?.archiveId || 'character-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      name: text(record?.name, text(record?.nickname, '未命名角色')),
      archivedAt: record?.archivedAt || new Date().toISOString(),
      pinned: Boolean(existing?.pinned),
      favorite: Boolean(existing?.favorite)
    };
    const previous = data.current;
    data.current = [...data.current];
    if (existingIndex >= 0) data.current.splice(existingIndex, 1, character);else data.current.push(character);
    if (!persist()) {
      data.current = previous;
      update();
      showToast('保存失败：请清理浏览器存储空间后重试');
      return false;
    }
    update();
    room.current!.render();
    room.current!.syncSaved(character);
    return true;
  }
  function patch(id: string, fields: {
    pinned?: boolean;
    favorite?: boolean;
  }) {
    const record = data.current.find(item => item.archiveId === id);
    if (!record) return;
    Object.assign(record, fields);
    update();
    persist();
    room.current!.render();
  }
  function beginRemove(character: ChatCharacter) {
    data.current = data.current.filter(item => item.archiveId !== character.archiveId);
    update();
    room.current!.cleanup(character);
    persist();
    room.current!.saveHistories();
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
    beginRemove(character);
    deleteCharacterArchive(character.dossierId);
    room.current!.render();
    room.current!.finishRemoval(character);
    showToast('角色已删除');
  }
  function removeByDossier(id: CharacterDossier['id']) {
    const character = data.current.find(item => item.dossierId === String(id));
    if (!character) return;
    beginRemove(character);
    room.current!.render();
    room.current!.finishRemoval(character);
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
