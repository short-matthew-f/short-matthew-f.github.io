import fs from 'node:fs';
import path from 'node:path';

const GAME=path.resolve('idle-pachinko-shootout');
const read=name=>fs.readFileSync(path.join(GAME,name),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const html=read('index.html');
const art=read('art-v18.js');
const runtime=read('runtime-v130.js');
const engine=read('engine-v130.js');

assert(!art.includes('peg-art-overlay'),'legacy art canvas peg overlay still exists');
assert(!art.includes('setupPegOverlay'),'legacy art peg renderer still exists');
assert(!art.includes('for(r=0;r<8;r++)'),'art layer still contains the old eight-row peg loop');
assert(!art.includes('y=70+r*44'),'art layer still contains old peg coordinates');
assert(html.includes('art-v18.js?v=20260818-1148'),'art renderer cache key was not bumped for the overlay retirement');

const sixRowRuntime="for(r=0;r<6;r++){n=r%2?8:9;for(c=0;c<n;c++)out.push({x:28+c*g+(r%2?g/2:0),y:158+r*44});}";
const sixRowEngine="for(r=0;r<6;r++){n=r%2?8:9;g=(C.width-56)/8;for(c=0;c<n;c++)P.push({x:28+c*g+(r%2?g/2:0),y:158+r*44,r:6,t:'n'});}";
assert(runtime.includes(sixRowRuntime),'authoritative DOM peg hardware is not six-row geometry');
assert(engine.includes(sixRowEngine),'authoritative physics peg field is not six-row geometry');

console.log('v1.14.8 single peg renderer smoke PASS');
console.log('legacy art-v18 eight-row overlay retired');
