    function openChatAssetDb(): Promise<IDBDatabase> {
        return new Promise<IDBDatabase>((resolve, reject) => {
            if (!window.indexedDB) return reject(new Error('当前环境不支持图片存储'));
            const request = indexedDB.open('smallphone_chat_assets_v1', 2);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('wallpapers')) db.createObjectStore('wallpapers');
                if (!db.objectStoreNames.contains('fonts')) db.createObjectStore('fonts');
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('图片存储开启失败'));
        });
    }
    export async function writeChatWallpaper(key: string, file: Blob) {
        const db = await openChatAssetDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('wallpapers', 'readwrite');
            tx.objectStore('wallpapers').put(file, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('壁纸保存失败'));
        });
        db.close();
    }
    export async function readChatWallpaper(key: string): Promise<Blob | null> {
        const db = await openChatAssetDb();
        const value = await new Promise<Blob | null>((resolve, reject) => {
            const request = db.transaction('wallpapers', 'readonly').objectStore('wallpapers').get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error || new Error('壁纸读取失败'));
        });
        db.close();
        return value;
    }
    export async function deleteChatWallpaper(key: string) {
        const db = await openChatAssetDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('wallpapers', 'readwrite');
            tx.objectStore('wallpapers').delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('壁纸移除失败'));
        });
        db.close();
    }
    export async function writeChatFont(key: string, file: Blob) {
        const db = await openChatAssetDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('fonts', 'readwrite');
            tx.objectStore('fonts').put(file, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('字体保存失败'));
        });
        db.close();
    }
    export async function readChatFont(key: string): Promise<Blob | null> {
        const db = await openChatAssetDb();
        const value = await new Promise<Blob | null>((resolve, reject) => {
            const request = db.transaction('fonts', 'readonly').objectStore('fonts').get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error || new Error('字体读取失败'));
        });
        db.close();
        return value;
    }
    export async function deleteChatFont(key: string) {
        const db = await openChatAssetDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('fonts', 'readwrite');
            tx.objectStore('fonts').delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('字体移除失败'));
        });
        db.close();
    }
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
