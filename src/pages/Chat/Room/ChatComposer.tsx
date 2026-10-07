import type {ReactNode} from 'react';
import {PressedButton} from '../../../components/shared/PressedButton';
import {useChatComposer} from '../../../providers/ChatComposerProvider';
export function ChatComposeField(){const composer=useChatComposer();return <textarea ref={composer.field} className="chat-compose-field" id="chatComposeField" rows={1} maxLength={2000} placeholder="Message..." style={composer.view.height?{height:composer.view.height}:undefined} onInput={composer.change} onKeyDown={composer.keyDown}/>;}
export function ChatSendButton({children}:{children:ReactNode}){const composer=useChatComposer();return <PressedButton className="chat-send-btn" id="chatSendBtn" type="button" aria-label="发送消息" disabled={composer.view.disabled} onClick={composer.send}>{children}</PressedButton>;}
