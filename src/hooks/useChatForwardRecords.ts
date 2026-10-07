import { useLayoutEffect, useRef, useState } from 'react';
import type { ForwardRecord } from '../types/chatRecordDetail';
import type { ForwardRecordsApi } from '../types/chatForwardRecords';
import { appendForwardRecord, createForwardRecord, loadForwardRecords, saveForwardRecords } from '../utils/chatForwardRecords';
import type { ForwardRecordsStorage } from '../utils/chatForwardRecords';

/** 记录数据由 React 状态和同步 ref 管理；旧消息服务仅提交输入并读取结果。 */
export function useChatForwardRecords() {
  const [records, setRecords] = useState<ForwardRecordsStorage>({});
  const current = useRef(records);
  useLayoutEffect(() => {
    const connect = (event: Event) => {
      const detail = (event as CustomEvent<{ accept(api: ForwardRecordsApi): void }>).detail;
      current.current = loadForwardRecords();
      setRecords(current.current);
      detail.accept({
        read: id => current.current[id] as ForwardRecord | undefined,
        create(items, sourceChatName) {
          const record = createForwardRecord(items, sourceChatName);
          current.current = appendForwardRecord(current.current, record);
          setRecords(current.current);
          saveForwardRecords(current.current);
          return record;
        }
      });
    };
    window.addEventListener('qingtuan:forward-records-connect', connect);
    return () => window.removeEventListener('qingtuan:forward-records-connect', connect);
  }, []);
}
