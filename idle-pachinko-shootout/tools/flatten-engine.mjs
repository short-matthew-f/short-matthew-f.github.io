import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const GAME = path.resolve('idle-pachinko-shootout');
const ENTRY = 'engine-v121-loader.js';
const OUT = path.join(GAME, 'engine-v130.js');
let captured = null;
let functionCount = 0;

function readLocal(url) {
  const clean = String(url).split('?')[0].replace(/^\.\//, '');
  const file = path.join(GAME, clean);
  if (!fs.existsSync(file)) throw new Error(`flatten fetch target missing: ${clean}`);
  return fs.readFileSync(file, 'utf8');
}

const sandbox = {
  console,
  Promise,
  performance: { now: () => 0 },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  document: {
    getElementById() {
      return { className: '', textContent: '' };
    }
  },
  window: {}
};
const context = vm.createContext(sandbox);
function replaceV1146(src, from, to, label) {
  const at = src.indexOf(from);
  if (at < 0) throw new Error(`v1.14.6 flatten target missing: ${label}`);
  if (src.indexOf(from, at + from.length) >= 0) throw new Error(`v1.14.6 flatten target ambiguous: ${label}`);
  return src.slice(0, at) + to + src.slice(at + from.length);
}
function applyV1146BoardGeometry(src) {
  src = replaceV1146(src, 'highest:1,power:0', 'highest:1,boardLayout:1,power:0', 'save layout version');
  src = replaceV1146(src, "DEFAULT_SPOTS={fire:[11,22,34,49],split:[17,30,45],pierce:[25,39,52],boom:[20,37,55],chain:[14,33,48]}", "DEFAULT_SPOTS={fire:[7,17,32,47],split:[12,23,39],pierce:[8,22,35],boom:[3,20,38],chain:[14,31,46]}", 'default special-peg spots');
  src = replaceV1146(src, "syncCylinder();\nvar STAGE_TYPES=", "syncCylinder();\nfunction legacyBoardPos(index){var r,c,n,base=0,g=(C.width-56)/8;for(r=0;r<8;r++){n=r%2?8:9;if(index>=base&&index<base+n){c=index-base;return{x:28+c*g+(r%2?g/2:0),y:70+r*44};}base+=n;}return{x:C.width/2,y:114};}\nfunction compactBoardPos(index){var r,c,n,base=0,g=(C.width-56)/8;for(r=0;r<6;r++){n=r%2?8:9;if(index>=base&&index<base+n){c=index-base;return{x:28+c*g+(r%2?g/2:0),y:158+r*44};}base+=n;}return{x:C.width/2,y:158};}\nfunction migrateBoardLayout(){if(Number(save.boardLayout||1)>=2)return;var types=['fire','split','pierce','boom','chain'],entries=[],occupied={},nextPlacements={fire:[],split:[],pierce:[],boom:[],chain:[]},nextMeta={fire:{},split:{},pierce:{},boom:{},chain:{}},order=0,i,j,t,arr,oldIndex,entry,target,best,bestD,p,q,d,meta,priority;save.placements=save.placements||{};save.pegMeta=save.pegMeta||{};for(i=0;i<types.length;i++){t=types[i];arr=save.placements[t]||[];for(j=0;j<arr.length;j++){oldIndex=Number(arr[j]);entries.push({type:t,oldIndex:oldIndex,order:order++});}}entries.sort(function(a,b){var ap=a.oldIndex>=17&&a.oldIndex<=67?0:1,bp=b.oldIndex>=17&&b.oldIndex<=67?0:1;return ap-bp||a.order-b.order;});for(i=0;i<entries.length;i++){entry=entries[i];t=entry.type;oldIndex=entry.oldIndex;target=(oldIndex>=17&&oldIndex<=67)?oldIndex-17:-1;if(target===4||target<0||target>=51||occupied[target]){p=legacyBoardPos(oldIndex);best=-1;bestD=Infinity;for(j=0;j<51;j++){if(j===4||occupied[j])continue;q=compactBoardPos(j);d=(q.x-p.x)*(q.x-p.x)+(q.y-p.y)*(q.y-p.y);priority=j<17?0.001:0;d+=priority;if(d<bestD){bestD=d;best=j;}}target=best;}if(target<0)continue;occupied[target]=t;nextPlacements[t].push(target);meta=save.pegMeta[t]&&save.pegMeta[t][String(oldIndex)];if(meta)nextMeta[t][String(target)]=clone(meta);}save.placements=nextPlacements;save.pegMeta=nextMeta;save.boardLayout=2;try{localStorage.setItem(KEY,JSON.stringify(save));}catch(e){}}\nmigrateBoardLayout();\nvar STAGE_TYPES=", 'board save migration');
  src = replaceV1146(src, "for(r=0;r<8;r++){n=r%2?8:9;g=(C.width-56)/8;for(c=0;c<n;c++)P.push({x:28+c*g+(r%2?g/2:0),y:70+r*44,r:6,t:'n'});}", "for(r=0;r<6;r++){n=r%2?8:9;g=(C.width-56)/8;for(c=0;c<n;c++)P.push({x:28+c*g+(r%2?g/2:0),y:158+r*44,r:6,t:'n'});}", 'six-row physics field');
  return src;
}

sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.fetch = async function fetchLocal(url) {
  const text = readLocal(url);
  return { ok: true, status: 200, text: async () => text };
};

sandbox.Function = function FlattenFunction(...args) {
  const body = String(args.pop() || '');
  const params = args.map(String);
  functionCount++;

  // The nested loaders eventually compile the real game runtime. Capture that
  // source instead of executing it in this build-time DOM-less context.
  if (body.includes("var C=document.getElementById('board')") &&
      body.includes('window.__ipsAPI')) {
    captured = body.replace(/\n?\/\/# sourceURL=.*$/m, '').trimEnd() + '\n';
    return function capturedRuntime() {};
  }

  const wrapped = `(function(${params.join(',')}){\n${body}\n})`;
  return new vm.Script(wrapped, { filename: `flatten-loader-${functionCount}.js` })
    .runInContext(context);
};

const top = fs.readFileSync(path.join(GAME, ENTRY), 'utf8');
new vm.Script(top, { filename: ENTRY }).runInContext(context);

const deadline = Date.now() + 5000;
while (!captured && Date.now() < deadline) {
  await new Promise(resolve => setTimeout(resolve, 10));
}
if (!captured) throw new Error('flatten failed: final engine source was never captured');

captured = captured
  .replace(/version:'1\.11\.7'/g, "version:'1.13.0'")
  .replace(/version:'1\.11\.4'/g, "version:'1.13.0'");

captured = applyV1146BoardGeometry(captured);

if (/fetch\(['"]engine-v/.test(captured)) {
  throw new Error('flatten failed: engine still contains loader fetches');
}
if (/replaceFunction\(|mustReplace\(/.test(captured)) {
  throw new Error('flatten failed: patch compiler leaked into runtime');
}
new vm.Script(captured, { filename: 'engine-v130.js' });

const banner = `/* Idle Pachinko Shootout v1.13.0 — flattened static engine.\n` +
  ` * Generated from the v1.12.2 runtime chain by tools/flatten-engine.mjs.\n` +
  ` * Do not hand-edit generated output; update source/runtime logic and regenerate.\n` +
  ` */\n`;
fs.writeFileSync(OUT, banner + captured);
console.log(`flattened ${functionCount} generated Function layers -> ${OUT}`);
console.log(`static engine bytes: ${fs.statSync(OUT).size}`);
