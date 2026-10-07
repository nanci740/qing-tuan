import { CHAT_PREFERENCES_BY_CHAT_KEY, getChatPreferenceDefaults } from './chatPreferences';
/** 与原数据操作相同：写入失败向调用者报告，保留数组 / 原始 JSON 值的旧行为。 */
export function replaceChatPreferences(key: string, patch: object = {}): void {
 const store: unknown = JSON.parse(localStorage.getItem(CHAT_PREFERENCES_BY_CHAT_KEY) || '{}');
 if (store === null || typeof store === 'object') (store as Record<string, unknown>)[key] = { ...getChatPreferenceDefaults(), ...patch };
 localStorage.setItem(CHAT_PREFERENCES_BY_CHAT_KEY, JSON.stringify(store));
}
    export function blobToDataUrl(blob: Blob): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('图片读取失败'));
            reader.readAsDataURL(blob);
        });
    }
    export function sanitizeImportedChatHtml(html: string): string {
        const template = document.createElement('template');
        template.innerHTML = String(html || '');
        template.content.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(node => node.remove());
        template.content.querySelectorAll('*').forEach(node => {
            [...node.attributes].forEach(attr => {
                if (/^on/i.test(attr.name) || attr.name === 'srcdoc') node.removeAttribute(attr.name);
            });
        });
        const holder = document.createElement('div');
        [...template.content.children].filter(node => node.matches('.chat-message-row, .chat-date-divider')).forEach(node => holder.appendChild(node.cloneNode(true)));
        return holder.innerHTML;
    }
