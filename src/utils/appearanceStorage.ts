export const CUSTOM_FONT_FAMILY = 'SmallPhoneCustomFont';
const CUSTOM_FONT_DB = 'smallphone_custom_font_db', CUSTOM_FONT_STORE = 'font_store', CUSTOM_FONT_RECORD = 'active_font';
    export function compressWallpaper(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('图片读取失败'));
            reader.onload = () => {
                const image = new Image();
                image.onerror = () => reject(new Error('图片格式不支持'));
                image.onload = () => {
                    const maxSide = 1440;
                    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                    const context = canvas.getContext('2d')!;
                    context.drawImage(image, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.84));
                };
                image.src = String(reader.result);
            };
            reader.readAsDataURL(file);
        });
    }

    export function compressCustomIcon(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('图片读取失败'));
            reader.onload = () => {
                const image = new Image();
                image.onerror = () => reject(new Error('图片格式不支持'));
                image.onload = () => {
                    const maxSide = 256;
                    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                    const context = canvas.getContext('2d')!;
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(image, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/png'));
                };
                image.src = String(reader.result);
            };
            reader.readAsDataURL(file);
        });
    }

    function openFontDb(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                reject(new Error('当前浏览器不支持本地字体储存'));
                return;
            }
            const request = indexedDB.open(CUSTOM_FONT_DB, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(CUSTOM_FONT_STORE)) {
                    db.createObjectStore(CUSTOM_FONT_STORE);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('字体储存打开失败'));
        });
    }

    export async function saveLocalFontRecord(file: File): Promise<void> {
        const db = await openFontDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(CUSTOM_FONT_STORE, 'readwrite');
            tx.objectStore(CUSTOM_FONT_STORE).put({ blob: file, name: file.name, type: file.type }, CUSTOM_FONT_RECORD);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error || new Error('字体储存失败')); };
        });
    }

    export async function readLocalFontRecord(): Promise<{ blob: Blob; name: string; type: string } | null> {
        const db = await openFontDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(CUSTOM_FONT_STORE, 'readonly');
            const req = tx.objectStore(CUSTOM_FONT_STORE).get(CUSTOM_FONT_RECORD);
            req.onsuccess = () => { const value = req.result || null; db.close(); resolve(value); };
            req.onerror = () => { db.close(); reject(req.error || new Error('字体读取失败')); };
        });
    }

    export async function clearLocalFontRecord() {
        try {
            const db = await openFontDb();
            await new Promise<Event>((resolve, reject) => {
                const tx = db.transaction(CUSTOM_FONT_STORE, 'readwrite');
                tx.objectStore(CUSTOM_FONT_STORE).delete(CUSTOM_FONT_RECORD);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
            db.close();
        } catch (err) {}
    }

