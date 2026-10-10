import { useLayoutEffect } from 'react';
import type { ForwardRecordsApi } from '../types/chatForwardRecords';
import { createForwardRecord, FORWARD_SAVE_ERROR } from '../utils/chatForwardRecords';
import { CHAT_RECORDS_BLOCKED_MESSAGE, readStoredForwardRecord, saveStoredForwardRecord } from '../utils/chatRecords';
import { showToast } from '../utils/toast';

/** 同步读取开机缓存；新增记录后台单条保存，失败通过全站小弹窗提示。 */
export function useChatForwardRecords() {
  useLayoutEffect(() => {
    const connect = (event: Event) => {
      const detail = (event as CustomEvent<{ accept(api: ForwardRecordsApi): void }>).detail;
      const failed = (error: unknown) => showToast(error instanceof Error && error.message === CHAT_RECORDS_BLOCKED_MESSAGE ? CHAT_RECORDS_BLOCKED_MESSAGE : FORWARD_SAVE_ERROR);
      detail.accept({
        read: readStoredForwardRecord,
        create(items, sourceChatName) {
          const record = createForwardRecord(items, sourceChatName);
          try {void saveStoredForwardRecord(record).catch(failed);}
          catch (error) {failed(error);}
          return record;
        }
      });
    };
    window.addEventListener('qingtuan:forward-records-connect', connect);
    return () => window.removeEventListener('qingtuan:forward-records-connect', connect);
  }, []);
}
