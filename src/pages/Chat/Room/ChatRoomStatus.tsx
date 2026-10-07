import {useChatReplyEngineState} from '../../../providers/ChatReplyEngineProvider';
export function ChatRoomStatus(){const {status}=useChatReplyEngineState();return <div className="chat-room-status" data-reply-resting-text={status.resting} data-reply-typing={status.typing} data-reply-chat-key={status.key}>{status.text}</div>;}
