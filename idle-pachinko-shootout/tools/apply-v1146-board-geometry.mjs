import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const GAME=path.join(ROOT,'idle-pachinko-shootout');
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);

function replaceOnce(src,from,to,label){
  const at=src.indexOf(from);
  if(at<0)throw new Error(`v1.14.6 patch target missing: ${label}`);
  if(src.indexOf(from,at+from.length)>=0)throw new Error(`v1.14.6 patch target is ambiguous: ${label}`);
  return src.slice(0,at)+to+src.slice(at+from.length);
}
function addAfterOnce(src,anchor,addition,label){
  if(src.includes(addition.trim()))return src;
  return replaceOnce(src,anchor,anchor+addition,label);
}

const migrationSource=`function legacyBoardPos(index){var r,c,n,base=0,g=(C.width-56)/8;for(r=0;r<8;r++){n=r%2?8:9;if(index>=base&&index<base+n){c=index-base;return{x:28+c*g+(r%2?g/2:0),y:70+r*44};}base+=n;}return{x:C.width/2,y:114};}\nfunction compactBoardPos(index){var r,c,n,base=0,g=(C.width-56)/8;for(r=0;r<6;r++){n=r%2?8:9;if(index>=base&&index<base+n){c=index-base;return{x:28+c*g+(r%2?g/2:0),y:158+r*44};}base+=n;}return{x:C.width/2,y:158};}\nfunction migrateBoardLayout(){if(Number(save.boardLayout||1)>=2)return;var types=['fire','split','pierce','boom','chain'],entries=[],occupied={},nextPlacements={fire:[],split:[],pierce:[],boom:[],chain:[]},nextMeta={fire:{},split:{},pierce:{},boom:{},chain:{}},order=0,i,j,t,arr,oldIndex,entry,target,best,bestD,p,q,d,meta,priority;save.placements=save.placements||{};save.pegMeta=save.pegMeta||{};for(i=0;i<types.length;i++){t=types[i];arr=save.placements[t]||[];for(j=0;j<arr.length;j++){oldIndex=Number(arr[j]);entries.push({type:t,oldIndex:oldIndex,order:order++});}}entries.sort(function(a,b){var ap=a.oldIndex>=17&&a.oldIndex<=67?0:1,bp=b.oldIndex>=17&&b.oldIndex<=67?0:1;return ap-bp||a.order-b.order;});for(i=0;i<entries.length;i++){entry=entries[i];t=entry.type;oldIndex=entry.oldIndex;target=(oldIndex>=17&&oldIndex<=67)?oldIndex-17:-1;if(target===4||target<0||target>=51||occupied[target]){p=legacyBoardPos(oldIndex);best=-1;bestD=Infinity;for(j=0;j<51;j++){if(j===4||occupied[j])continue;q=compactBoardPos(j);d=(q.x-p.x)*(q.x-p.x)+(q.y-p.y)*(q.y-p.y);priority=j<17?0.001:0;d+=priority;if(d<bestD){bestD=d;best=j;}}target=best;}if(target<0)continue;occupied[target]=t;nextPlacements[t].push(target);meta=save.pegMeta[t]&&save.pegMeta[t][String(oldIndex)];if(meta)nextMeta[t][String(target)]=clone(meta);}save.placements=nextPlacements;save.pegMeta=nextMeta;save.boardLayout=2;try{localStorage.setItem(KEY,JSON.stringify(save));}catch(e){}}`;

// Make the generated engine reproducibly own the new board geometry rather
// than hand-editing engine-v130.js.
const flattenPath=path.join(GAME,'tools','flatten-engine.mjs');
let flatten=read(flattenPath);
if(!flatten.includes('applyV1146BoardGeometry')){
  const helper=`\nfunction replaceV1146(src, from, to, label) {\n  const at = src.indexOf(from);\n  if (at < 0) throw new Error(\`v1.14.6 flatten target missing: \${label}\`);\n  if (src.indexOf(from, at + from.length) >= 0) throw new Error(\`v1.14.6 flatten target ambiguous: \${label}\`);\n  return src.slice(0, at) + to + src.slice(at + from.length);\n}\nfunction applyV1146BoardGeometry(src) {\n  src = replaceV1146(src, 'highest:1,power:0', 'highest:1,boardLayout:1,power:0', 'save layout version');\n  src = replaceV1146(src, \"DEFAULT_SPOTS={fire:[11,22,34,49],split:[17,30,45],pierce:[25,39,52],boom:[20,37,55],chain:[14,33,48]}\", \"DEFAULT_SPOTS={fire:[7,17,32,47],split:[12,23,39],pierce:[8,22,35],boom:[3,20,38],chain:[14,31,46]}\", 'default special-peg spots');\n  src = replaceV1146(src, \"syncCylinder();\\nvar STAGE_TYPES=\", \"syncCylinder();\\n${migrationSource.replace(/\\/g,'\\\\').replace(/\"/g,'\\\"').replace(/\n/g,'\\n')}\\nmigrateBoardLayout();\\nvar STAGE_TYPES=\", 'board save migration');\n  src = replaceV1146(src, \"for(r=0;r<8;r++){n=r%2?8:9;g=(C.width-56)/8;for(c=0;c<n;c++)P.push({x:28+c*g+(r%2?g/2:0),y:70+r*44,r:6,t:'n'});}\", \"for(r=0;r<6;r++){n=r%2?8:9;g=(C.width-56)/8;for(c=0;c<n;c++)P.push({x:28+c*g+(r%2?g/2:0),y:158+r*44,r:6,t:'n'});}\", 'six-row physics field');\n  return src;\n}\n`;
  flatten=replaceOnce(flatten,'const context = vm.createContext(sandbox);','const context = vm.createContext(sandbox);'+helper,'flatten transform helper');
  flatten=replaceOnce(flatten,"  .replace(/version:'1\\.11\\.4'/g, \"version:'1.13.0'\");","  .replace(/version:'1\\.11\\.4'/g, \"version:'1.13.0'\");\n\ncaptured = applyV1146BoardGeometry(captured);",'flatten transform call');
  write(flattenPath,flatten);
}

// Keep the rendered/clickable peg hardware in the same coordinate system as
// the physics engine.
const runtimePath=path.join(GAME,'runtime-v130.js');
let runtime=read(runtimePath);
const oldPositions="function buildPositions(){var out=[],r,c,n,g=(393-56)/8;for(r=0;r<8;r++){n=r%2?8:9;for(c=0;c<n;c++)out.push({x:28+c*g+(r%2?g/2:0),y:70+r*44});}return out;}";
const newPositions="function buildPositions(){var out=[],r,c,n,g=(393-56)/8;for(r=0;r<6;r++){n=r%2?8:9;for(c=0;c<n;c++)out.push({x:28+c*g+(r%2?g/2:0),y:158+r*44});}return out;}";
if(runtime.includes(oldPositions))runtime=replaceOnce(runtime,oldPositions,newPositions,'runtime six-row positions');
else if(!runtime.includes(newPositions))throw new Error('runtime board position shape is neither old nor v1.14.6');
write(runtimePath,runtime);

// Wire the visual launcher band and advance the displayed shell version.
const indexPath=path.join(GAME,'index.html');
let index=read(indexPath);
if(!index.includes('board-geometry-v1146.css')){
  index=replaceOnce(index,'<link rel="stylesheet" href="launcher-stability-v1144.css?v=20260818-1145">','<link rel="stylesheet" href="launcher-stability-v1144.css?v=20260818-1145"><link rel="stylesheet" href="board-geometry-v1146.css?v=20260818-1146">','v1.14.6 stylesheet wiring');
}
index=index.replace(/v1\.14\.4/g,'v1.14.6');
write(indexPath,index);

// Keep the main PR gate aware of this regression forever.
const workflowPath=path.join(ROOT,'.github','workflows','ips-v130-check.yml');
let workflow=read(workflowPath).replace('name: IPS v1.14.4 runtime check','name: IPS v1.14.6 runtime check');
if(!workflow.includes("      - 'idle-pachinko-shootout/board-geometry-v1146.css'")){
  workflow=workflow.replaceAll("      - 'idle-pachinko-shootout/launcher-stability-v1144.css'","      - 'idle-pachinko-shootout/launcher-stability-v1144.css'\n      - 'idle-pachinko-shootout/board-geometry-v1146.css'");
}
if(!workflow.includes("      - 'idle-pachinko-shootout/tools/smoke-v1146-board-geometry.mjs'")){
  workflow=workflow.replaceAll("      - 'idle-pachinko-shootout/tools/smoke-v1144-crossbar-stability.mjs'","      - 'idle-pachinko-shootout/tools/smoke-v1144-crossbar-stability.mjs'\n      - 'idle-pachinko-shootout/tools/smoke-v1146-board-geometry.mjs'");
}
if(!workflow.includes('node --check idle-pachinko-shootout/tools/smoke-v1146-board-geometry.mjs')){
  workflow=workflow.replace('          node --check idle-pachinko-shootout/tools/smoke-v1144-crossbar-stability.mjs','          node --check idle-pachinko-shootout/tools/smoke-v1144-crossbar-stability.mjs\n          node --check idle-pachinko-shootout/tools/smoke-v1146-board-geometry.mjs');
}
if(!workflow.includes("grep -q 'board-geometry-v1146.css' idle-pachinko-shootout/index.html")){
  workflow=workflow.replace("          grep -q 'launcher-stability-v1144.css' idle-pachinko-shootout/index.html","          grep -q 'launcher-stability-v1144.css' idle-pachinko-shootout/index.html\n          grep -q 'board-geometry-v1146.css' idle-pachinko-shootout/index.html");
}
if(!workflow.includes('Six-row board geometry / save migration smoke test')){
  workflow=workflow.replace('      - name: Diff sanity\n        run: git diff --check','      - name: Six-row board geometry / save migration smoke test\n        run: node idle-pachinko-shootout/tools/smoke-v1146-board-geometry.mjs\n      - name: Diff sanity\n        run: git diff --check');
}
write(workflowPath,workflow);

// Regenerate the authoritative static artifact from the patched build source.
execFileSync(process.execPath,[path.join(GAME,'tools','flatten-engine.mjs')],{stdio:'inherit'});
console.log('v1.14.6 board geometry patch applied');
