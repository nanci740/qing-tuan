// Keep the existing database and keys so previously saved chat assets remain readable.
function openChatAssetDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject(new Error('当前环境不支持聊天资源存储'));
        const request = indexedDB.open('smallphone_chat_assets_v1', 2);
        request.onupgradeneeded = () => {
            for (const name of ['wallpapers', 'fonts']) {
                if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
            }
        };
        let blocked = false;
        request.onsuccess = () => {if (blocked) request.result.close(); else resolve(request.result);};
        request.onerror = () => reject(request.error || new Error('聊天资源存储开启失败'));
        request.onblocked = () => {blocked = true;reject(new Error('请关闭其他青团机页面后重试'));};
    });
}
async function chatAssetTransaction<T>(stores: string[], mode: IDBTransactionMode, action: (tx: IDBTransaction, result: (value: T) => void) => void): Promise<T> {
    const db = await openChatAssetDb();
    try {
        return await new Promise<T>((resolve, reject) => {
            const tx = db.transaction(stores, mode);
            let value: T;
            tx.oncomplete = () => resolve(value);
            tx.onerror = tx.onabort = () => reject(tx.error || new Error('聊天资源操作失败，请重试'));
            try { action(tx, result => { value = result; }); }
            catch (error) { tx.abort(); reject(error); }
        });
    } finally { db.close(); }
}
export function updateChatAssets(key: string, assets: {wallpaper?: Blob | null; font?: Blob | null}) {
    return chatAssetTransaction<void>(['wallpapers', 'fonts'], 'readwrite', tx => {
        for (const [property, store] of [['wallpaper', 'wallpapers'], ['font', 'fonts']] as const) {
            if (assets[property] === undefined) continue;
            if (assets[property] === null) tx.objectStore(store).delete(key);
            else tx.objectStore(store).put(assets[property], key);
        }
    });
}
function readChatAsset(store: string, key: string): Promise<Blob | null> {
    return chatAssetTransaction([store], 'readonly', (tx, result) => {
        const request = tx.objectStore(store).get(key);
        request.onsuccess = () => result(request.result || null);
    });
}
export const writeChatWallpaper = (key: string, file: Blob) => updateChatAssets(key, {wallpaper: file});
export const readChatWallpaper = (key: string) => readChatAsset('wallpapers', key);
export const deleteChatWallpaper = (key: string) => updateChatAssets(key, {wallpaper: null});
export const writeChatFont = (key: string, file: Blob) => updateChatAssets(key, {font: file});
export const readChatFont = (key: string) => readChatAsset('fonts', key);
export const deleteChatFont = (key: string) => updateChatAssets(key, {font: null});
    export function scopeChatBubbleCss(source: string) {
        const css = String(source || '').trim();
        if (!css) return '';
        if (/@import|@font-face|url\s*\(|expression\s*\(|javascript:|<\/?style|<script/i.test(css)) {
            throw new Error('样式中含有不允许的外部内容');
        }
        let count = 0;
        const scoped = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/([^{}]+)\{([^{}]*)\}/g, (_whole: string, selectorText: string, body: string) => {
            const selectors = selectorText.split(',').map(item => item.trim()).filter(item =>
                item && !item.startsWith('@') && /\.chat-(?:bubble|message-row|quoted-message|voice)/.test(item)
            );
            if (!selectors.length) return '';
            count += 1;
            const safeBody = body.replace(/position\s*:\s*fixed\s*;?/gi, '').replace(/z-index\s*:\s*\d+\s*;?/gi, '');
            return selectors.map(item => `#chatAppPage.chat-custom-bubble-active ${item}`).join(',') + `{${safeBody}}`;
        });
        if (!count) throw new Error('请使用 .chat-bubble 或 .chat-message-row 作为选择器');
        return scoped;
    }
