import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useChatPreferences } from '../../../providers/ChatPreferencesProvider';
import { PressedButton } from '../../../components/shared/PressedButton';
export function ChatDataButton({id,className,children}:{id:'chatExportCurrent'|'chatImportCurrent'|'chatResetPreferences'|'chatClearCurrent';className:string;children:ReactNode}) {
 const {data}=useChatPreferences();
 const actions={chatExportCurrent:data.exportCurrent,chatImportCurrent:data.chooseImport,chatResetPreferences:data.resetPreferences,chatClearCurrent:data.clearCurrent};
 return <PressedButton type="button" id={id} className={className} onClick={()=>void actions[id]()}>{children}</PressedButton>;
}
export function ChatDataInput(){const {data}=useChatPreferences();return <input id="chatImportFile" ref={data.input} type="file" accept="application/json,.json" hidden onChange={event=>{const file=event.currentTarget.files?.[0];if(file)void data.importCurrent(file);}}/>;}
export function ChatDataDownload(){const {data}=useChatPreferences();return data.download?createPortal(<a ref={data.downloadLink} href={data.download.url} download={data.download.name}/>,document.body):null;}
