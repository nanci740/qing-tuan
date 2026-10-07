import {useChatControllers} from '../../hooks/useChatControllers';
import {useChatMessages} from '../../providers/ChatMessagesProvider';
export function ChatControllers(){const {api}=useChatMessages();useChatControllers(api);return null;}
