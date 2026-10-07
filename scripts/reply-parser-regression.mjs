import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root=base;
const names=['extractChatAiReply','parseChatAiQuotedReply','parseChatAiSegmentedReply'];
const old=vm.runInNewContext(fs.readFileSync(root+'/reference/chat-reply-parser-original.js','utf8')+';({'+names.join(',')+'})');
const exports={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/src/utils/chatReplyParser.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});
const values=[undefined,null,false,true,0,1,23,'','正文',' 空白 \n换行 ','\uFEFF正文','a\n\nb','a<SPLIT>b','```text\n正文\n```','【引用消息】 引文 一 【本次回复】正文',[],{},['a'],{text:'文字'}, {reply:'内容',quote_id:'u1'}, {replies:['甲','乙'],quote_id:'u1'}, {replies:[{text:'语音',voice:true},{text:'撤回',recall:'true',quote_id:'u2'}],presence:{state:'online'}}, {replies:[null,false,0,23,{},[],{message:'仅message'},{content:'正文',quoteId:'u2'}],presence:[]}, {reply:0}, {replies:[]}];
const raw=[...values];
for(const v of values){const json=JSON.stringify(v);if(json===undefined)continue;raw.push(json,'```json\n'+json+'\n```','说明 '+json+' 结尾',JSON.stringify(json),json.slice(0,-1),json.slice(1),json.replace(/\\n/g,'\n'));}
raw.push('正文 {"quote_id":"u1"}','正文","quote_id":"u1"}','{"reply":"正文",坏}','{"reply":坏}','前缀 {"reply":坏}', '{"replies":[{"text":"甲","quote_id":"u1","recall":true},{"text":"乙"}],坏}', '{"replies":["甲","乙",],"quote_id":"u2"}', '{"replies":[{"text":"含}括号\\\"","voice":"true"}],"presence":false}');
const choices=[[],[{id:'u1',text:'引文 一',targetId:'m1'},{id:'u2',text:'第二条',targetId:'m2'}],null,{},[{id:'',text:'空编号'}],[{id:'u1',text:'重复1'},{id:'u1',text:'重复2'}]];
const checks=[];
function capture(fn,args){try{return {value:fn(...args)}}catch(e){return {error:e.name+':'+e.message}}}
function compare(name,args,label){const expected=capture(old[name],args),actual=capture(exports[name],args);assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)),JSON.parse(JSON.stringify(expected)),label);checks.push({label,passed:true});}
for(const [index,r] of raw.entries())for(const [q,c] of choices.entries())for(const n of names.slice(1))compare(n,[r,c],n+'-'+index+'-'+q);
for(const [index,v] of values.entries())for(const wrapper of [v,{content:v},{text:v},{choices:[{message:{content:v}}],content:'fallback'},{content:[{text:v},null,{text:'尾'}]}])compare(names[0],[wrapper],'extract-'+index+'-'+checks.length);
const summary={checks,screenshots:0,reference:'Original parser functions, exact result keys and thrown errors compared; deterministic compatibility corpus.',migration_complete:false};
fs.writeFileSync(base+'/docs/reply-parser-validation-results.json',JSON.stringify(summary,null,2));console.log(checks.length+' exact parser comparisons passed');
