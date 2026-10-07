import type { ForwardRecord, RecordDetailRow } from '../types/chatRecordDetail';

// 旧 innerHTML 解析会规范化 CR/LF 并忽略 NUL；保留这些文字兼容行为。
const parsedText = (value: unknown) => String(value).replace(/\r\n?/g, '\n').replace(/\0/g, '');

export function describeForwardRecord(record: ForwardRecord, avatars: { selfAvatar: string; peerAvatar: string }) {
  const items = record.items || [];
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateOf = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };
  const timeOf = (ms: number) => {
    const d = new Date(ms);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  // 副标题：有完整时间就写「2026年9月23日 至 2026年9月26日」（同一天只写一天），旧记录照原本的
  const stamps = items.map(item => Number(item.sentAt)).filter(ms => ms > 0);
  let subtitle = record.subtitle || '';
  if (stamps.length) {
    const first = dateOf(Math.min(...stamps)), last = dateOf(Math.max(...stamps));
    subtitle = first === last ? first : `${first} 至 ${last}`;
  }
  const sourceName = record.sourceName || String(record.title || '').replace(/^你与/, '').replace(/的聊天记录$/, '');
  let prevSide: unknown = '';
  const rows: RecordDetailRow[] = items.map(item => {
    const side = item.side || (item.speaker === '你' || item.speaker === '我' ? 'user' : 'peer');
    const speaker = side === 'user' ? '我' : (item.speaker || sourceName || '对方');
    const time = Number(item.sentAt) > 0 ? timeOf(Number(item.sentAt)) : (item.time || '');
    // 旧记录的「[语音 4″]」改成「[语音] 4″」
    const text = String(item.text || '[消息]').replace(/^\[语音 (.+)\]$/, '[语音] $1');
    const continued = side === prevSide;
    prevSide = side;
    return {
      continued, avatar: side === 'user' ? avatars.selfAvatar : avatars.peerAvatar,
      speaker: parsedText(speaker), time: parsedText(time), text: parsedText(text)
    };
  });
  return { title: String(record.title || '聊天记录'), subtitle: String(subtitle), rows };
}
