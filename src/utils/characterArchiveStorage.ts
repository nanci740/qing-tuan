import { readCatalogRecords, writeCatalogRecords } from './catalogStorage';
import type { CharacterDossier } from '../types/characterDossier';
import { todayStampDate } from './characterPng';
export const CHARACTER_RECORDS_KEY = 'smallphone_dossier_records_v1';
export function blankCharacterRecord(id: number): CharacterDossier {
  const no = String(id).padStart(3, '0');
  return {
    id: no,
    fileNo: '· FILE ' + no,
    tabLabel: '档案' + no,
    sealNo: 'NO.' + no,
    quote: '',
    photoUrl: undefined,
    photoCaption: '',
    name: '',
    nickname: '',
    birthday: '',
    constellation: '',
    relationship: '',
    mbti: '',
    favoriteThings: '',
    tokenItem: '',
    dislikes: '',
    onlineStyle: '',
    offlineStyle: '',
    relationshipNetworkText: '',
    relationships: [],
    activeNavTab: 'appearance',
    appearanceText: '',
    selectedTags: [],
    customTags: [],
    speechHabitsText: '',
    memoriesText: '',
    otherSettingsText: '',
    secretMemo: '',
    isStamped: false,
    stampDate: todayStampDate(),
    stampStyle: 'confidential'
  };
}
export function readCharacterRecords(): CharacterDossier[] { return readCatalogRecords('characterRecords'); }
export function writeCharacterRecords(records: CharacterDossier[]): Promise<boolean> { return writeCatalogRecords('characterRecords', records); }
export function nextCharacterId(records: CharacterDossier[]) {
  return records.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}
