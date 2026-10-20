import type { ApiMessage } from '../types/api';

/** Claude 和 Gemini 原生接口的系统提示只能放在最前面：开头连续的 system 拿去当系统提示，
 * 夹在聊天记录中间的 system（世界书按深度插入的）改成一条 user 消息，留在原来的位置。 */
export function splitLeadingSystem(messages: ApiMessage[]) {
    let lead = 0;
    while (lead < messages.length && messages[lead]?.role === 'system') lead++;
    const system = messages.slice(0, lead).map(item => typeof item.content === 'string' ? item.content : '').filter(Boolean);
    const rest = messages.slice(lead).map(item => item.role === 'system'
        ? { role: 'user', content: `[系统提示] ${typeof item.content === 'string' ? item.content : String(item.content ?? '')}` }
        : item);
    return { system, rest };
}
