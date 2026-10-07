import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(process.env.QT_TEST_RUNTIME?path.join(process.env.QT_TEST_RUNTIME,'package.json'):import.meta.url);
const {chromium:pw}=require('playwright');const mod=require('@sparticuz/chromium');const chromium=mod.default||mod;
const code=ts.transpileModule(fs.readFileSync(path.join(root,'src/utils/chatRecords.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const server=http.createServer((req,res)=>{
 if(req.url.startsWith('/chatRecords.js')){res.setHeader('Content-Type','text/javascript');return res.end(code);}
 if(req.url==='/test'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><body></body>');}
 const rel=req.url.split('?')[0].replace(/^\/qing-tuan\//,'');
 try{const file=path.join(root,'dist',rel||'index.html');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.webp')?'image/webp':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await pw.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||await chromium.executablePath(),args:process.env.QT_DISABLE_GPU?['--no-sandbox','--disable-gpu','--use-gl=disabled']:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const checks=[];const check=(name,condition)=>{if(!condition)throw Error(name);checks.push(name);};
try {
 const unit=await browser.newPage();await unit.goto(origin+'/test');
 checks.push(...await unit.evaluate(async()=>{
  const names=[];const check=(name,value)=>{if(!value)throw Error(name);names.push(name);};
  const legacy='smallphone_chat_histories_v1',times='smallphone_chat_last_times_v1',drafts='smallphone_chat_drafts_v1';
  const oldHtml='<div class="chat-message-row"><div class="chat-bubble">旧记录</div><span data-quoted-message="x">引用与语音</span></div>';
  localStorage.setItem(legacy,JSON.stringify({a:oldHtml,b:'角色乙'}));localStorage.setItem(times,JSON.stringify({a:123,b:456}));localStorage.setItem(drafts,JSON.stringify({a:'未发送的草稿',b:'另一个草稿'}));
  const api=await import('/chatRecords.js');
  const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){const r=put.apply(this,args);if(this.name==='meta')this.transaction.abort();return r;};
  let failed=false;try{await api.initializeChatRecords();}catch{failed=true;}finally{IDBObjectStore.prototype.put=put;}
  check('failed migration preserves all legacy keys',failed&&localStorage.getItem(legacy).includes('旧记录')&&localStorage.getItem(times)&&localStorage.getItem(drafts));
  await api.initializeChatRecords();let snapshot=api.readChatRecords();
  check('migration preserves exact rich message HTML and timestamps',snapshot.histories.a===oldHtml&&snapshot.times.b===456);
  check('migration preserves per-role drafts',api.readStoredDraft('a')==='未发送的草稿'&&api.readStoredDraft('b')==='另一个草稿');
  check('legacy keys removed only after migration succeeds',![legacy,times,drafts].some(k=>localStorage.getItem(k)));
  const writes=[];IDBObjectStore.prototype.put=function(value,key){if(this.name==='chats')writes.push(key);return put.call(this,value,key);};
  await api.saveChatRecords({...snapshot.histories,a:'新记录'},{...snapshot.times,a:789});IDBObjectStore.prototype.put=put;
  check('one role change writes only that role',JSON.stringify(writes)==='["a"]');
  await Promise.all([api.saveStoredDraft('a','第一稿'),api.saveStoredDraft('a','第二稿'),api.saveStoredDraft('b','独立草稿')]);
  let fresh=await import('/chatRecords.js?refresh');await fresh.initializeChatRecords();
  check('queued writes preserve latest draft and other role',fresh.readStoredDraft('a')==='第二稿'&&fresh.readStoredDraft('b')==='独立草稿');
  const stored=async(store,key)=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('qingtuan_chat_records_v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}};
  api.markChatDraftSent('a');IDBObjectStore.prototype.put=function(...args){const r=put.apply(this,args);if(this.name==='chats')this.transaction.abort();return r;};
  failed=false;try{await api.saveChatRecords({a:'发送消息',b:'角色乙'},{a:900,b:456});}catch{failed=true;}finally{IDBObjectStore.prototype.put=put;}
  check('failed send preserves stored record, timestamp and draft together',failed&&(await stored('chats','a')).html==='新记录'&&(await stored('chats','a')).lastTime===789&&await stored('drafts','a')==='第二稿');
  await api.saveChatRecords({a:'发送消息',b:'角色乙'},{a:900,b:456});
  check('retry saves message and clears sent draft together',(await stored('chats','a')).html==='发送消息'&&await stored('drafts','a')===undefined);
  await api.saveStoredDraft('a','发送后新草稿');
  await api.saveChatRecords({a:'发送消息'},{a:900});await api.saveStoredDraft('b','');
  check('role deletion removes only selected record and draft',await stored('chats','b')===undefined&&await stored('drafts','b')===undefined&&(await stored('chats','a')).html==='发送消息'&&await stored('drafts','a')==='发送后新草稿');
  localStorage.setItem(legacy,JSON.stringify({b:'不该复活的旧记录'}));fresh=await import('/chatRecords.js?again');await fresh.initializeChatRecords();
  check('migration marker prevents stale legacy data resurrection',!fresh.readChatRecords().histories.b&&!localStorage.getItem(legacy));
  return names;
 }));
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/qing-tuan/');
 await page.waitForSelector('#chatAddCharacterBtn',{state:'attached'});
 const click=selector=>page.evaluate(s=>document.querySelector(s).click(),selector);
 const fill=(selector,value)=>page.evaluate(({selector,value})=>{const e=document.querySelector(selector);Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,value);e.dispatchEvent(new Event('input',{bubbles:true}));},{selector,value});
 await click('[data-dock-icon-key="chat"]');
 for(const name of ['记录测试甲','记录测试乙']){await click('#chatAddCharacterBtn');await fill('[data-field="name"]',name);await click('.cc-save');}
 const ids=await page.locator('[data-character-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.characterId));
 const read=async(store,key)=>page.evaluate(async({store,key})=>{const db=await new Promise(resolve=>{const r=indexedDB.open('qingtuan_chat_records_v1');r.onsuccess=()=>resolve(r.result);});try{return await new Promise(resolve=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);});}finally{db.close();}},{store,key});
 const waitStored=async(store,key,expected)=>{await page.waitForFunction(async({store,key,expected})=>{const db=await new Promise(resolve=>{const r=indexedDB.open('qingtuan_chat_records_v1');r.onsuccess=()=>resolve(r.result);});try{const value=await new Promise(resolve=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);});return store==='chats'?value?.html.includes(expected):value===expected;}finally{db.close();}},{store,key,expected});};
 await click(`[data-character-id="${ids[0]}"]`);const keyA=await page.locator('#chatAppPage').getAttribute('data-active-chat-key');
 await fill('#chatComposeField','甲的未发送草稿');await waitStored('drafts',keyA,'甲的未发送草稿');
 await click('#chatRoomBack');await click(`[data-character-id="${ids[1]}"]`);const keyB=await page.locator('#chatAppPage').getAttribute('data-active-chat-key');
 check('role switch does not reuse previous draft',await page.locator('#chatComposeField').inputValue()==='');
 await fill('#chatComposeField','乙的独立草稿');await waitStored('drafts',keyB,'乙的独立草稿');
 await page.reload();await page.waitForSelector('#chatAddCharacterBtn',{state:'attached'});await click('[data-dock-icon-key="chat"]');await click(`[data-character-id="${ids[0]}"]`);
 check('actual draft restores after refresh',await page.locator('#chatComposeField').inputValue()==='甲的未发送草稿');
 await click('#chatSendBtn');await waitStored('chats',keyA,'甲的未发送草稿');
 check('actual send saves timestamp and clears draft',(await read('chats',keyA)).lastTime>0&&await read('drafts',keyA)===undefined);
 await fill('#chatComposeField','失败时要保留的草稿');await waitStored('drafts',keyA,'失败时要保留的草稿');
 await page.evaluate(()=>{window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){const r=window.originalPut.apply(this,args);if(this.name==='chats')this.transaction.abort();return r;};});
 await click('#chatSendBtn');await page.waitForFunction(()=>document.body.textContent.includes('聊天记录保存失败'));
 check('actual failed send retains saved draft',await read('drafts',keyA)==='失败时要保留的草稿'&&!(await read('chats',keyA)).html.includes('失败时要保留的草稿'));
 await page.reload();await page.waitForSelector('#chatAddCharacterBtn',{state:'attached'});await click('[data-dock-icon-key="chat"]');await click(`[data-character-id="${ids[0]}"]`);
 check('failed-send draft survives refresh',await page.locator('#chatComposeField').inputValue()==='失败时要保留的草稿');
 check('saved history survives refresh',await page.locator('#chatAppPage').evaluate(e=>e.textContent.includes('甲的未发送草稿')));
 await click('#chatSendBtn');await waitStored('chats',keyA,'失败时要保留的草稿');
 await click('#chatRoomBack');await click(`[data-character-id="${ids[1]}"]`);
 check('other role draft remains intact',await page.locator('#chatComposeField').inputValue()==='乙的独立草稿');
 await page.evaluate(()=>{window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){const r=window.originalPut.apply(this,args);if(this.name==='drafts')this.transaction.abort();return r;};});
 await fill('#chatComposeField','没有保存成功的新草稿');await page.waitForFunction(()=>document.body.textContent.includes('草稿保存失败'));
 check('failed draft write reports error and retains last saved draft',await read('drafts',keyB)==='乙的独立草稿');
 check('no browser runtime errors',errors.length===0);
 console.log(JSON.stringify({passed:checks.length,checks},null,2));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
