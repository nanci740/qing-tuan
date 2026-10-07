import type {ReactNode} from 'react';
import {PressedButton} from '../../../components/shared/PressedButton';
import {useChatReplyTriggers} from '../../../providers/ChatReplyTriggersProvider';
export function ChatMoonReplyButton({children}:{children:ReactNode}){const reply=useChatReplyTriggers();return <PressedButton className="chat-moon-btn" id="chatMoonReplyBtn" type="button" aria-label="让角色回复" data-title="让角色回复" data-reply-pending={reply.pending===null?undefined:String(reply.pending)} disabled={reply.pending===true} aria-busy={reply.pending===true?'true':undefined} onClick={reply.manual}>{children}</PressedButton>;}
