import type { ApiConnection } from '../types/api';
import { getSavedConfig } from './apiStorage';
import { kv } from './kvStorage';
import { readMemories } from './memoryStorage';

/** 向量召回：每条记忆算一串数字（向量）代表它的意思，聊天时拿最近的话去比，意思最接近的几条先想起来。
    向量另外存（vectors 是记忆编号 → 向量，存成 base64 的 Float32），model 是算这些向量用的模型；换了模型就全部重算。 */
interface Store { model: string; vectors: Record<string, string> }
const KEY = 'qingtuan_memory_vectors_v1';
let cache: Store | null = null;
function read(): Store {
  if (!cache) { try { const row = JSON.parse(kv.getItem(KEY) || '{}'); cache = { model: String(row.model || ''), vectors: row.vectors && typeof row.vectors === 'object' ? row.vectors : {} }; } catch { cache = { model: '', vectors: {} }; } }
  return cache;
}
function write(next: Store) { cache = next; kv.setItem(KEY, JSON.stringify(next)); }
const pack = (vector: number[]) => { const bytes = new Uint8Array(new Float32Array(vector).buffer); let text = ''; for (const byte of bytes) text += String.fromCharCode(byte); return btoa(text); };
const unpack = (text: string) => { const raw = atob(text), bytes = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i); return new Float32Array(bytes.buffer); };
function cosine(a: Float32Array, b: Float32Array) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** 用 OpenAI 兼容的 /embeddings 算向量（Claude、Gemini 原生接口没有）。 */
export async function embed(connection: ApiConnection, model: string, input: string[], timeout = 20000) {
  if (!connection.baseUrl || !connection.apiKey) throw new Error('先在设置里接好 API');
  if (connection.provider === 'claude' || /generativelanguage\.googleapis\.com/.test(connection.baseUrl)) throw new Error('这个接口类型没有向量模型');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${connection.baseUrl.replace(/\/+$/, '')}/embeddings`, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${connection.apiKey}` },
      body: JSON.stringify({ model, input }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error?.message || data?.message || `HTTP ${response.status}`);
    const rows = (Array.isArray(data?.data) ? data.data : []).slice().sort((a: { index?: number }, b: { index?: number }) => (a.index ?? 0) - (b.index ?? 0));
    const vectors = rows.map((row: { embedding?: unknown }) => Array.isArray(row.embedding) ? row.embedding.map(Number) : null);
    if (vectors.length !== input.length || vectors.some((vector: number[] | null) => !vector?.length)) throw new Error('接口没有回传向量');
    return vectors as number[][];
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw new Error('向量接口太久没回应');
    throw error;
  } finally { clearTimeout(timer); }
}
/** 设好的向量模型（没设就是空的，照字眼比对）。 */
export function vectorModel() { return String(getSavedConfig()?.featureModels?.embedding || '').trim(); }
const connection = () => { const config = getSavedConfig(); return config ? { provider: config.provider, baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.model } : null; };

let filling = false;
/** 在背后补算：还没有向量的记忆（换了模型就全部重算），一次三十二条；删掉的记忆，向量也清掉。 */
export async function fillVectors() {
  const model = vectorModel(), api = connection();
  if (!model || !api || filling) return;
  filling = true;
  try {
    let store = read();
    if (store.model !== model) { store = { model, vectors: {} }; write(store); }
    const items = readMemories().items, alive = new Set(items.map(item => item.id));
    const stale = Object.keys(store.vectors).filter(id => !alive.has(id));
    if (stale.length) { const vectors = { ...store.vectors }; for (const id of stale) delete vectors[id]; store = { model, vectors }; write(store); }
    for (;;) {
      const todo = readMemories().items.filter(item => !read().vectors[item.id]).slice(0, 32);
      if (!todo.length || read().model !== model) break;
      const vectors = await embed(api, model, todo.map(item => item.text));
      const next = { ...read().vectors };
      todo.forEach((item, index) => { next[item.id] = pack(vectors[index]); });
      write({ model, vectors: next });
    }
  } catch { /* 下次再补 */ }
  finally { filling = false; }
}
/** 照意思排：拿这次聊天的话算一个向量，回传每条记忆跟它有多接近（算不出来就回传 null，照字眼比对）。 */
export async function rankByMeaning(text: string, ids: string[]) {
  const model = vectorModel(), api = connection(), store = read();
  if (!model || !api || store.model !== model || !text.trim() || !ids.some(id => store.vectors[id])) return null;
  try {
    const [query] = await embed(api, model, [text.slice(-600)], 5000), target = new Float32Array(query);
    return new Map(ids.filter(id => store.vectors[id]).map(id => [id, cosine(target, unpack(store.vectors[id]))]));
  } catch { return null; }
}

/** 其他要照意思比的文字（世界书条目这类）：算过的向量照文字记着（换了模型就清掉），最多留五百段。 */
interface TextStore { model: string; vectors: Record<string, string> }
const TEXT_KEY = 'qingtuan_text_vectors_v1';
let texts: TextStore | null = null;
function readTexts(): TextStore {
  if (!texts) { try { const row = JSON.parse(kv.getItem(TEXT_KEY) || '{}'); texts = { model: String(row.model || ''), vectors: row.vectors && typeof row.vectors === 'object' ? row.vectors : {} }; } catch { texts = { model: '', vectors: {} }; } }
  return texts;
}
const hashText = (text: string) => { let a = 5381, b = 52711; for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); a = (a * 33) ^ c; b = (b * 33) ^ c; } return (a >>> 0).toString(36) + (b >>> 0).toString(36) + text.length.toString(36); };
/** query 跟每一段文字有多接近（0 到 1）；没设向量模型或算不出来回传 null。 */
export async function meaningScores(query: string, list: string[]) {
  const model = vectorModel(), api = connection();
  if (!model || !api || !query.trim() || !list.length) return null;
  try {
    let store = readTexts();
    if (store.model !== model) store = { model, vectors: {} };
    const keys = list.map(hashText), missing = [...new Set(list.filter((_, index) => !store.vectors[keys[index]]))];
    const vectors = await embed(api, model, [query.slice(-600), ...missing], 8000);
    const next = { ...store.vectors };
    missing.forEach((text, index) => { next[hashText(text)] = pack(vectors[index + 1]); });
    const names = Object.keys(next);
    if (names.length > 500) for (const name of names.slice(0, names.length - 500)) if (!keys.includes(name)) delete next[name];
    texts = { model, vectors: next };
    kv.setItem(TEXT_KEY, JSON.stringify(texts));
    const target = new Float32Array(vectors[0]);
    return keys.map(key => cosine(target, unpack(next[key])));
  } catch { return null; }
}
