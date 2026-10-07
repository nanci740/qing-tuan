import type {ReactNode} from 'react';
import {PressedButton} from '../../../components/shared/PressedButton';
import {useChatVoiceState} from '../../../providers/ChatVoiceProvider';
export function ChatMicrophone({children}:{children:ReactNode}){const {view,click}=useChatVoiceState();return <PressedButton className={'chat-mic-btn'+(view.recording?' recording':'')} id="chatMicBtn" type="button" aria-label={view.label} onClick={click}>{children}</PressedButton>;}
