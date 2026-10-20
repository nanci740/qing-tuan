import { readWorldBooks } from './worldStorage';
interface ChatWorldEntry {id?:unknown;enabled?:boolean;keys?:unknown;secondaryKeys?:unknown;trigger?:unknown;match?:unknown;caseSensitive?:boolean;content?:unknown;priority?:unknown;title?:unknown;probability?:unknown;position?:unknown;role?:unknown;depth?:unknown;sticky?:unknown;recursive?:boolean;}
interface ChatWorldBook {id?:unknown;name?:unknown;enabled?:boolean;bindId?:unknown;entries?:ChatWorldEntry[];}
export type WorldPosition = 'head'|'before'|'after'|'middle'|'tail';
export interface WorldInjection {
    /** role 为 system 的条目，按注入位置拼好的文字，放进系统提示词。 */
    system: Record<WorldPosition, string>;
    /** role 为 user / assistant 的条目，单独当成一条消息；tail 放在聊天记录最后，其他放在聊天记录前面。 */
    messages: {role:'user'|'assistant';content:string;tail:boolean}[];
}
const POSITIONS:WorldPosition[] = ['head','before','after','middle','tail'];
const LIMIT = 10000, RECURSION_ROUNDS = 3, STICKY_KEY = 'qingtuan_world_sticky_v1';
export function readChatWorldBooks():ChatWorldBook[]{return readWorldBooks();}
export function emptyWorldInjection():WorldInjection{return {system:{head:'',before:'',after:'',middle:'',tail:''},messages:[]};}

const splitKeys = (value:unknown) => String(value || '').split(/[,，]/).map(key => key.trim()).filter(Boolean);
/** 普通文本：原样出现就算；正则：真的拿去对，写错的正则当作没命中。 */
function hits(keys:string[], text:string, entry:ChatWorldEntry) {
    if (entry.match === 'regex') return keys.some(key => { try { return new RegExp(key, entry.caseSensitive ? 'm' : 'im').test(text); } catch { return false; } });
    const haystack = entry.caseSensitive ? text : text.toLowerCase();
    return keys.some(key => haystack.includes(entry.caseSensitive ? key : key.toLowerCase()));
}
function keywordActive(entry:ChatWorldEntry, text:string) {
    const keys = splitKeys(entry.keys);
    if (!keys.length || !hits(keys, text, entry)) return false;
    // 辅助关键词：填了就要再命中其中一个才算。
    const secondary = splitKeys(entry.secondaryKeys);
    return !secondary.length || hits(secondary, text, entry);
}
function readSticky():Record<string,Record<string,number>> { try { const value = JSON.parse(localStorage.getItem(STICKY_KEY) || '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; } }
function writeSticky(value:Record<string,Record<string,number>>) { try { localStorage.setItem(STICKY_KEY, JSON.stringify(value)); } catch {} }

/** 每次回复前调用：挑出这次要带上的世界书条目。
 * 带上的书：聊天设置里勾选的，加上「关联角色」是全部角色或这个角色的；书本身要开着。
 * 条目：常驻的一定带；关键词的在最近「扫描深度」条消息里命中才带，再按概率决定；触发后按「持续轮数」再带几轮。 */
export function collectWorldInjection(options:{selectedIds:string[];characterId:string;chatKey:string;recentMessages:{content?:unknown}[]}):WorldInjection {
    const selected = new Set((options.selectedIds || []).map(String));
    const books = readChatWorldBooks().filter(book => book && book.enabled !== false && (selected.has(String(book.id)) || book.bindId === 'all' || (!!options.characterId && String(book.bindId) === options.characterId)));
    const entries = books.flatMap(book => (Array.isArray(book.entries) ? book.entries : []).filter(entry => entry && entry.enabled !== false && String(entry.content || '').trim()));
    const result = emptyWorldInjection();
    if (!entries.length) return result;
    const texts = options.recentMessages.map(item => String(item.content || ''));
    const scanText = (entry:ChatWorldEntry) => { const depth = Math.floor(Number(entry.depth)); return (depth > 0 ? texts.slice(-depth) : texts).join('\n'); };
    const stickyAll = readSticky(), sticky = { ...(stickyAll[options.chatKey] || {}) };
    const idOf = (entry:ChatWorldEntry, index:number) => String(entry.id || index);
    const active = new Map<ChatWorldEntry, boolean>();
    entries.forEach(entry => {
        if (entry.trigger === 'always') { active.set(entry, true); return; }
        if (keywordActive(entry, scanText(entry))) {
            const probability = Number(entry.probability);
            if (Number.isFinite(probability) && probability < 100 && Math.random() * 100 >= Math.max(0, probability)) return;
            active.set(entry, true);
        }
    });
    // 递归：开了递归的条目，内容也拿去触发其他条目，最多三层。
    for (let round = 0; round < RECURSION_ROUNDS; round++) {
        const extra = [...active.keys()].filter(entry => entry.recursive).map(entry => String(entry.content || '')).join('\n');
        if (!extra) break;
        let added = false;
        entries.forEach(entry => { if (!active.has(entry) && entry.trigger !== 'always' && keywordActive(entry, extra)) { active.set(entry, true); added = true; } });
        if (!added) break;
    }
    // 持续轮数：这一轮触发的记下来，之后几轮没触发也照样带。
    entries.forEach((entry, index) => {
        const id = idOf(entry, index), turns = Math.max(0, Math.floor(Number(entry.sticky) || 0));
        if (active.has(entry)) { if (entry.trigger !== 'always' && turns > 0) sticky[id] = turns; else delete sticky[id]; }
        else if (sticky[id] > 0) { active.set(entry, true); if (--sticky[id] <= 0) delete sticky[id]; }
    });
    if (Object.keys(sticky).length) stickyAll[options.chatKey] = sticky; else delete stickyAll[options.chatKey];
    writeSticky(stickyAll);

    const chosen = [...active.keys()].sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0));
    let budget = LIMIT;
    const take = (entry:ChatWorldEntry) => { const text = `${entry.title ? `[${String(entry.title)}] ` : ''}${String(entry.content)}`.slice(0, Math.max(0, budget)); budget -= text.length; return text; };
    const grouped:Record<WorldPosition,string[]> = {head:[],before:[],after:[],middle:[],tail:[]};
    for (const entry of chosen) {
        if (budget <= 0) break;
        const position:WorldPosition = POSITIONS.includes(entry.position as WorldPosition) ? entry.position as WorldPosition : 'after';
        const text = take(entry);
        if (!text) continue;
        if (entry.role === 'user' || entry.role === 'assistant') result.messages.push({ role: entry.role, content: text, tail: position === 'tail' });
        else grouped[position].push(text);
    }
    for (const position of POSITIONS) if (grouped[position].length) result.system[position] = `\n以下是世界书设定，请自然遵守：\n${grouped[position].join('\n')}\n`;
    return result;
}
