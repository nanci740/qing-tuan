export const MY_PRESENCE_KEY='smallphone_my_presence_v1';
export const MY_PRESENCE_STATES=['在线','忙碌','离开','隐身'] as const;
export function readMyPresence(){try{const saved=JSON.parse(localStorage.getItem(MY_PRESENCE_KEY)||'{}')||{},online=String(saved.online||'').trim().slice(0,8);return {online:online||'在线',custom:!!online&&!MY_PRESENCE_STATES.some(state=>state===online)};}catch{return {online:'在线',custom:false};}}
export function persistMyPresence(online:string){try{localStorage.setItem(MY_PRESENCE_KEY,JSON.stringify({online}));}catch{/* 原页面存储失败时仍重新读取旧状态。 */}return readMyPresence();}
export const photoBackground=(src:string)=>src?`url("${src.replace(/"/g,'%22')}")`:'';
