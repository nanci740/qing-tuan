import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import ts from 'typescript';
import path from 'node:path';import {fileURLToPath} from 'node:url';const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const names=['roundedBubblePath','tailedBubblePath'];
const old=vm.runInNewContext(fs.readFileSync(root+'/reference/chat-bubble-geometry-original.js','utf8')+';({'+names.join(',')+'})');
const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/src/utils/chatBubbleGeometry.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});
let count=0;
for(const width of [0,1,3,8,12,23,40,97,150,250,390,430,1000])for(const height of [0,1,3,8,10,14,24,38,43,86,110,280,1000])for(const radius of [0,1,5,8,12,20])for(const tail of [0,8])for(const name of names){assert.equal(exports[name](width,height,radius,tail),old[name](width,height,radius,tail));count++;}
console.log(count+' exact SVG geometry comparisons passed');

fs.writeFileSync(root+'/docs/bubble-geometry-validation-results.json',JSON.stringify({checks:[{label:'4056-SVG-path-comparisons',comparisonCount:count,passed:true}],migration_complete:false},null,2));
