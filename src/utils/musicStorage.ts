import type { MusicTrack, MusicMode } from '../types/music';
const DB_NAME = 'smallphone_music_db', DB_STORE = 'tracks';
export const PLAYLIST_KEY = 'smallphone_music_playlist', CURRENT_KEY = 'smallphone_music_current', MODE_KEY = 'smallphone_music_mode', AUTO_KEY = 'smallphone_music_autoplay', SHOW_NOTES_KEY = 'smallphone_music_show_notes';
export function readMusicBool(key: string, fallback: boolean) { try { const value = localStorage.getItem(key); return value === null ? fallback : value === '1'; } catch { return fallback; } }
export function saveMusicBool(key: string, value: boolean) { try { localStorage.setItem(key, value ? '1' : '0'); } catch {} }
export function saveMusicValue(key: string, value: string) { try { localStorage.setItem(key, value); } catch {} }
export function createTrackId(prefix: string) { return prefix + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }
export function normalizeMusicTrack(track: Partial<MusicTrack> & { cover?: string } | null): MusicTrack | null { if (!track || typeof track !== 'object') return null; return { id: track.id || createTrackId('t_'), type: track.type === 'url' ? 'url' : 'file', title: (track.title || '').trim() || '未命名音乐', name: track.name || '', url: track.url || '', coverData: track.coverData || track.cover || '' }; }
export function loadMusicState() { let playlist: MusicTrack[] = [], currentId = '', mode: string = 'list'; try { const raw = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || '[]'); playlist = (Array.isArray(raw) ? raw : []).map(normalizeMusicTrack).filter((track): track is MusicTrack => !!track).slice(0, 3); } catch {} try { currentId = localStorage.getItem(CURRENT_KEY) || ''; } catch {} try { mode = localStorage.getItem(MODE_KEY) || 'list'; } catch {} if (!['list', 'single', 'random'].includes(mode)) mode = 'list'; if (!playlist.some(track => track.id === currentId)) currentId = playlist[0]?.id || ''; return { playlist, currentId, mode: mode as MusicMode }; }

    function openDb(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE, { keyPath: 'id' });
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
    export async function putMusicBlob(id: string, blob: Blob) {
        const db = await openDb();
        await new Promise<Event>((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readwrite');
            tx.objectStore(DB_STORE).put({ id, blob });
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    }
    export async function getMusicBlob(id: string): Promise<Blob | undefined> {
        const db = await openDb();
        const record = await new Promise<{ id: string; blob: Blob } | undefined>((resolve, reject) => {
            const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        db.close();
        return record && record.blob;
    }
    export async function deleteMusicBlob(id: string) {
        try {
            const db = await openDb();
            await new Promise<Event>((resolve, reject) => {
                const tx = db.transaction(DB_STORE, 'readwrite');
                tx.objectStore(DB_STORE).delete(id);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
            db.close();
        } catch (e) {}
    }

    export function compressMusicCover(file: File, maxSize = 640, quality = 0.82): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('请选择图片文件'));
                return;
            }
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('封面读取失败'));
            reader.onload = () => {
                const image = new Image();
                image.onerror = () => reject(new Error('封面图片无法读取'));
                image.onload = () => {
                    const width = image.naturalWidth || image.width;
                    const height = image.naturalHeight || image.height;
                    if (!width || !height) {
                        reject(new Error('封面尺寸无效'));
                        return;
                    }
                    const scale = Math.min(1, maxSize / Math.max(width, height));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(width * scale));
                    canvas.height = Math.max(1, Math.round(height * scale));
                    const context = canvas.getContext('2d');
                    if (!context) {
                        reject(new Error('封面处理失败'));
                        return;
                    }
                    context.drawImage(image, 0, 0, canvas.width, canvas.height);
                    let dataUrl = '';
                    try {
                        dataUrl = canvas.toDataURL('image/webp', quality);
                        if (!dataUrl.startsWith('data:image/webp')) {
                            dataUrl = canvas.toDataURL('image/jpeg', quality);
                        }
                    } catch (err) {
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }
                    resolve(dataUrl);
                };
                image.src = String(reader.result);
            };
            reader.readAsDataURL(file);
        });
    }

