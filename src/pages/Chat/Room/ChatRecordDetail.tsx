import {createPortal} from 'react-dom';
import {PressedButton} from '../../../components/shared/PressedButton';
import {useChatRecordDetail} from '../../../hooks/useChatRecordDetail';
export function ChatRecordDetail(){
 const detail=useChatRecordDetail();
 return detail.services?createPortal(<div ref={detail.element} className="chat-record-view" hidden={!detail.view.open}>{"\n        "}<div className="chat-record-view-header">{"\n            "}<PressedButton className="chat-record-view-back" type="button" aria-label="返回聊天" onClick={detail.close}>{"\n                "}<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>{"\n            "}</PressedButton>{"\n            "}<div className="chat-record-view-title">{detail.view.title}</div>{"\n            "}<div className="chat-record-view-subtitle">{detail.view.subtitle}</div>{"\n        "}</div>{"\n        "}<div className="chat-record-view-list">{detail.view.rows.map((row,index)=><Row key={detail.view.generation+':'+index} row={row}/>)}</div></div>,detail.services.host):null;
}
function Row({row}:{row:import('../../../types/chatRecordDetail').RecordDetailRow}){
 return <>{"\n                "}<div className={'chat-record-item'+(row.continued?' is-continued':'')}>{"\n                    "}<span className="chat-record-item-avatar" style={!row.continued&&row.avatar?{backgroundImage:`url('${row.avatar}')`}:undefined}/>{"\n                    "}<div className="chat-record-item-main">{"\n                        "}<div className="chat-record-item-head">{"\n                            "}<div className="chat-record-item-speaker">{row.speaker}</div>{"\n                            "}<div className="chat-record-item-time">{row.time}</div>{"\n                        "}</div>{"\n                        "}<div className="chat-record-item-text">{row.text}</div>{"\n                    "}</div>{"\n                "}</div></>;
}
