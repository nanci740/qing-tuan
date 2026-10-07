import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(process.env.QT_TEST_RUNTIME?path.join(process.env.QT_TEST_RUNTIME,'package.json'):import.meta.url);
const {chromium:pw}=require('playwright');const mod=require('@sparticuz/chromium');const chromium=mod.default||mod;
const code=ts.transpileModule(fs.readFileSync(path.join(root,'src/utils/settingsPersistence.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const server=http.createServer((req,res)=>{
 if(req.url==='/settingsPersistence.js'){res.setHeader('Content-Type','text/javascript');return res.end(code);}
 const rel=req.url.split('?')[0].replace(/^\/qing-tuan\//,'');
 const file=req.url==='/fixture.otf'?path.join(root,'reference/chat-font-fixture.otf'):path.join(root,'dist',rel||'index.html');
 try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.webp')?'image/webp':file.endsWith('.otf')?'font/otf':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await pw.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||await chromium.executablePath(),args:process.env.QT_DISABLE_GPU?['--no-sandbox','--disable-gpu','--use-gl=disabled']:chromium.args.filter(a=>a!=='--single-process'),headless:true});
const checks=[];const check=(name,condition)=>{if(!condition)throw Error(name);checks.push(name);};
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('smallphone_music_playlist'))localStorage.setItem('smallphone_music_playlist',JSON.stringify([{id:'settings-test',type:'url',title:'原音乐标题',url:'https://example.com/test.mp3',coverData:''}]));});
 await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 await page.goto(origin+'/qing-tuan/');await page.waitForSelector('#customFontFileInput',{state:'attached'});
 await page.evaluate(()=>{window.toasts=[];window.addEventListener('qingtuan:toast',e=>window.toasts.push(e.detail));window.originalSet=Storage.prototype.setItem;window.originalRemove=Storage.prototype.removeItem;Storage.prototype.setItem=function(k,v){if(window.failKeys?.includes(k))throw Error('simulated quota');return window.originalSet.call(this,k,v);};Storage.prototype.removeItem=function(k){if(window.failKeys?.includes(k))throw Error('simulated quota');return window.originalRemove.call(this,k);};});
 const click=s=>page.evaluate(s=>document.querySelector(s).click(),s);
 const fill=(selector,value)=>page.evaluate(({selector,value})=>{const e=document.querySelector(selector);Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,value);e.dispatchEvent(new Event('input',{bubbles:true}));},{selector,value});
 const fail=keys=>page.evaluate(keys=>{window.failKeys=keys;window.toasts=[];},keys);
 const ls=key=>page.evaluate(key=>localStorage.getItem(key),key);
 const toasts=()=>page.evaluate(()=>window.toasts);
 const noSuccess=async()=>!(await toasts()).some(t=>t.includes('已保存')||t.includes('已恢复'));
 checks.push(...await page.evaluate(async()=>{
  const {writeSettingsBatch}=await import('/settingsPersistence.js');localStorage.setItem('batch-one','old');localStorage.setItem('batch-two','old');window.failKeys=['batch-two'];let rejected=false;
  try{writeSettingsBatch({'batch-one':'new','batch-two':'new'});}catch{rejected=true;}window.failKeys=[];
  if(!rejected||localStorage.getItem('batch-one')!=='old'||localStorage.getItem('batch-two')!=='old')throw Error('batch rollback');return ['multi-key failure restores earlier written settings'];
 }));
 await click('#settingTheme');await click('[data-color="#B5D9DC"]');check('theme color saves normally',await ls('smallphone_theme_color')==='#B5D9DC');
 await fail(['smallphone_theme_color']);await click('[data-color="#EBC0CA"]');check('failed preset keeps old theme and does not report success',await page.locator('#themeColorValue').textContent()==='#B5D9DC'&&await ls('smallphone_theme_color')==='#B5D9DC'&&await noSuccess());
 await fill('#themeHexInput','#123456');await click('#applyThemeHexBtn');check('failed custom theme keeps old color',await page.locator('#themeColorValue').textContent()==='#B5D9DC'&&await noSuccess());
 await click('#themeColorPickerWrap');await fill('#themeColorModalHexInput','#345678');await click('#applyThemeColorModalHexBtn');await click('#applyThemeColorModalBtn');check('failed theme confirmation keeps dialog open',await page.locator('#themeColorModal').evaluate(e=>e.classList.contains('active'))&&await noSuccess());await click('#cancelThemeColorModal');
 const glass=await page.locator('#glassStrengthValue').textContent();await fail(['smallphone_glass_strength']);await fill('#glassStrengthRange','78');check('failed glass update keeps previous appearance',await page.locator('#glassStrengthValue').textContent()===glass);
 const opacity=await page.locator('#wallpaperOpacityValue').textContent();await fail(['smallphone_wallpaper_opacity']);await fill('#wallpaperOpacity','42');check('failed opacity update keeps previous value',await page.locator('#wallpaperOpacityValue').textContent()===opacity);
 await fail([]);await fill('#editStarBubble','原星星文字');await fill('#editMoonBubble','原月亮文字');await fill('#editMainSubtitle','原副标题');await fill('#editSongTitle','原音乐标题');await click('#saveMainTextsBtn');
 const oldTexts=await page.evaluate(()=>Object.fromEntries(['bubble_star_custom','bubble_moon_custom','main_subtitle_custom','player_song_title','smallphone_music_playlist'].map(k=>[k,localStorage.getItem(k)])));
 await fill('#editStarBubble','不该保存的星星');await fill('#editMoonBubble','不该保存的月亮');await fill('#editMainSubtitle','不该保存的副标题');await fail(['main_subtitle_custom']);await click('#saveMainTextsBtn');
 check('failed text batch restores stored text and playlist',JSON.stringify(await page.evaluate(()=>Object.fromEntries(['bubble_star_custom','bubble_moon_custom','main_subtitle_custom','player_song_title','smallphone_music_playlist'].map(k=>[k,localStorage.getItem(k)]))))===JSON.stringify(oldTexts)&&await noSuccess());
 check('failed text save leaves home display unchanged',await page.locator('#starBubbleText').textContent()==='原星星文字');
 await fill('#editSongTitle','不该保存的音乐名');await fail(['smallphone_music_playlist']);await click('#saveMainTextsBtn');
 check('failed linked playlist write restores all home text keys',JSON.stringify(await page.evaluate(()=>Object.fromEntries(['bubble_star_custom','bubble_moon_custom','main_subtitle_custom','player_song_title','smallphone_music_playlist'].map(k=>[k,localStorage.getItem(k)]))))===JSON.stringify(oldTexts)&&await noSuccess());

 await fail([]);const fixture={name:'original.otf',mimeType:'font/otf',buffer:fs.readFileSync(path.join(root,'reference/chat-font-fixture.otf'))};await page.locator('#customFontFileInput').setInputFiles(fixture);await page.waitForFunction(()=>document.querySelector('#customFontName').textContent==='original.otf');
 check('global font saves normally',await ls('smallphone_custom_font_type')==='file');
 const readFont=()=>page.evaluate(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('smallphone_custom_font_db');r.onsuccess=()=>resolve(r.result);});try{return await new Promise(resolve=>{const r=db.transaction('font_store').objectStore('font_store').get('active_font');r.onsuccess=()=>resolve(r.result?.name||null);});}finally{db.close();}});
 await fail(['smallphone_custom_font_name']);await page.locator('#customFontFileInput').setInputFiles({...fixture,name:'replacement.otf'});await page.waitForFunction(()=>window.toasts.some(t=>t.includes('设置保存失败')));
 check('font metadata failure restores old file and active font',await readFont()==='original.otf'&&await ls('smallphone_custom_font_name')==='original.otf'&&await page.locator('#customFontName').textContent()==='original.otf'&&await noSuccess());
 await fail([]);await page.evaluate(()=>{window.originalDelete=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.delete=function(...args){const r=window.originalDelete.apply(this,args);if(this.name==='font_store')this.transaction.abort();return r;};});await click('#resetCustomFontBtn');await page.waitForFunction(()=>window.toasts.some(t=>t.includes('字体存储操作失败')));
 check('aborted font reset preserves original font',await readFont()==='original.otf'&&await page.locator('#customFontName').textContent()==='original.otf'&&await noSuccess());await page.evaluate(()=>IDBObjectStore.prototype.delete=window.originalDelete);

 await fail(['smallphone_custom_font_name']);await fill('#customFontUrlInput',origin+'/fixture.otf');await click('#applyCustomFontUrlBtn');await page.waitForFunction(()=>window.toasts.some(t=>t.includes('设置保存失败')));
 check('failed font URL save restores old file and metadata',await readFont()==='original.otf'&&await ls('smallphone_custom_font_type')==='file'&&await page.locator('#customFontName').textContent()==='original.otf'&&await noSuccess());
 await fail(['smallphone_custom_font_type']);await click('#resetCustomFontBtn');await page.waitForFunction(()=>window.toasts.some(t=>t.includes('设置保存失败')));
 check('failed font reset metadata restores old blob',await readFont()==='original.otf'&&await ls('smallphone_custom_font_type')==='file'&&await page.locator('#customFontName').textContent()==='original.otf'&&await noSuccess());
 await fail([]);await page.locator('#customFontFileInput').setInputFiles({name:'bad.otf',mimeType:'font/otf',buffer:Buffer.from('invalid-font')});await page.waitForFunction(()=>window.toasts.length>0);
 check('invalid global font does not replace saved or active font',await readFont()==='original.otf'&&await page.locator('#customFontName').textContent()==='original.otf');
 await fail([]);await click('#settingVoiceAi');await fill('#voiceBaseUrl','https://example.com/original');await fill('#voiceModel','original-voice');await click('#voiceSaveBtn');
 const oldVoice=JSON.parse(await ls('smallphone_voice_image_settings_v1')).voice;
 await fail(['smallphone_voice_image_settings_v1']);await fill('#voiceBaseUrl','https://example.com/unsaved');await click('#voiceSaveBtn');check('failed voice save preserves stored configuration',JSON.stringify(JSON.parse(await ls('smallphone_voice_image_settings_v1')).voice)===JSON.stringify(oldVoice)&&await noSuccess());
 const voiceEnabled=await page.locator('#voiceEnabled').isChecked();await click('#voiceEnabled');check('failed voice toggle rolls back switch',await page.locator('#voiceEnabled').isChecked()===voiceEnabled);
 await fail([]);await fill('#imageModel','image-model');await click('#imageSaveBtn');check('image save does not commit previously failed voice draft',JSON.stringify(JSON.parse(await ls('smallphone_voice_image_settings_v1')).voice)===JSON.stringify(oldVoice));
 await fail(['smallphone_voice_image_settings_v1']);const enabled=await page.locator('#imageEnabled').isChecked();await click('#imageEnabled');check('failed image toggle rolls back switch',await page.locator('#imageEnabled').isChecked()===enabled);
 await fail(['smallphone_background_activity_v1']);const bg=await page.locator('#backgroundActivityEnabled').isChecked();await click('#backgroundActivityEnabled');check('failed background toggle preserves switch and reports failure',await page.locator('#backgroundActivityEnabled').isChecked()===bg&&(await toasts()).some(t=>t.includes('后台活动设置保存失败')));
 await fail(['smallphone_api_settings_v1']);const fallback=await page.locator('#apiFallbackEnabled').isChecked();await click('#apiFallbackEnabled');check('failed fallback toggle keeps previous switch',await page.locator('#apiFallbackEnabled').isChecked()===fallback);
 await fail(['smallphone_mcp_settings_v1']);const mcp=await page.locator('#mcpMasterEnabled').isChecked();await click('#mcpMasterEnabled');check('failed MCP toggle preserves state',await page.locator('#mcpMasterEnabled').isChecked()===mcp&&(await toasts()).some(t=>t.includes('MCP 设置保存失败')));

 await click('#mcpAddServiceBtn');await fill('#mcpNameInput','保存测试服务');await fill('#mcpUrlInput','https://example.com/mcp');await click('#mcpSaveBtn');
 check('failed MCP service save keeps editor open without success toast',await page.locator('#mcpServiceModal').evaluate(e=>e.classList.contains('open'))&&await noSuccess());
 await fail([]);await click('#mcpSaveBtn');check('MCP service saves on retry',JSON.parse(await ls('smallphone_mcp_settings_v1')).services.some(s=>s.name==='保存测试服务'));
 await fail(['smallphone_music_autoplay']);const auto=await page.locator('#musicAutoPlaySwitch').evaluate(e=>e.classList.contains('on'));await click('#musicAutoPlaySwitch');check('failed music autoplay preserves switch',await page.locator('#musicAutoPlaySwitch').evaluate(e=>e.classList.contains('on'))===auto);
 await fail(['smallphone_music_show_notes']);const notes=await page.locator('#musicShowNotesSwitch').evaluate(e=>e.classList.contains('on'));await click('#musicShowNotesSwitch');check('failed music notes toggle preserves switch',await page.locator('#musicShowNotesSwitch').evaluate(e=>e.classList.contains('on'))===notes);

 await fail(['smallphone_music_mode']);await click('#musicModeSegment [data-mode="single"]');check('failed music mode preserves selection',await page.locator('#musicModeSegment [data-mode="list"]').evaluate(e=>e.classList.contains('active')));
 await fail([]);await click('#settingMusic');await fill('#musicTitleInput','不该保存的标题');const playlist=await ls('smallphone_music_playlist');await fail(['smallphone_music_playlist']);await click('#musicSaveMetaBtn');check('failed music metadata keeps original playlist and no success toast',await ls('smallphone_music_playlist')===playlist&&await noSuccess());
 await fail([]);await page.reload();await page.waitForSelector('#customFontFileInput',{state:'attached'});await page.waitForFunction(()=>document.querySelector('#customFontName').textContent==='original.otf');
 check('saved theme, font and voice restore after refresh',await page.locator('#themeColorValue').textContent()==='#B5D9DC'&&await page.locator('#voiceBaseUrl').inputValue()==='https://example.com/original');
 check('only one global font face remains active',await page.evaluate(()=>[...document.fonts].filter(f=>f.family==='SmallPhoneCustomFont').length===1));

 await click('#resetCustomFontBtn');await page.waitForFunction(()=>document.querySelector('#customFontBadge').textContent==='DEFAULT');check('global font resets successfully on retry',await readFont()===null&&await ls('smallphone_custom_font_type')===null);
 check('no browser runtime errors',errors.length===0);console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
