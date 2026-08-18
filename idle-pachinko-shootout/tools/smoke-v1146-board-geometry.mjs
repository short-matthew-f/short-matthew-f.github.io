import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const GAME=path.resolve('idle-pachinko-shootout');
const html=fs.readFileSync(path.join(GAME,'index.html'),'utf8');
const css=fs.readFileSync(path.join(GAME,'board-geometry-v1146.css'),'utf8');
const dom=new JSDOM(html,{url:'https://ips.test/',pretendToBeVisual:true,runScripts:'outside-only'});
const {window}=dom;
const {document}=window;

window.requestAnimationFrame=function(){return 1;};
window.cancelAnimationFrame=function(){};
window.HTMLElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,right:393,bottom:472,width:393,height:472,x:0,y:0,toJSON(){return this;}};};
const gradient={addColorStop(){}};
const noop=()=>{};
const ctx=new Proxy({
  createLinearGradient(){return gradient;},createRadialGradient(){return gradient;},
  measureText(){return{width:10};},setTransform:noop,clearRect:noop,fillRect:noop,
  strokeRect:noop,beginPath:noop,closePath:noop,arc:noop,fill:noop,stroke:noop,
  moveTo:noop,lineTo:noop,fillText:noop,save:noop,restore:noop,translate:noop,
  rotate:noop,scale:noop
},{get(target,key){if(key in target)return target[key];return 0;},set(target,key,value){target[key]=value;return true;}});
window.HTMLCanvasElement.prototype.getContext=function(){return ctx;};

// Legacy v1.14.x save: one peg in a surviving row, one in a removed row, and
// one at the physical point that becomes the new Firing Pin. All investment
// metadata must survive the migration.
window.localStorage.setItem('ips-v7',JSON.stringify({
  coins:100000,xp:100000,fire:1,split:1,pierce:1,
  placements:{fire:[22],split:[11],pierce:[21],boom:[],chain:[]},
  pegMeta:{
    fire:{'22':{level:2,invested:500}},
    split:{'11':{level:1,invested:350}},
    pierce:{'21':{level:3,invested:900}},
    boom:{},chain:{}
  }
}));
window.localStorage.setItem('ips-blueprints-v1',JSON.stringify({bought:{tremor:1,split:1,pierce:1},seen:{},history:{}}));

function evalFile(name){window.eval(fs.readFileSync(path.join(GAME,name),'utf8')+`\n//# sourceURL=${name}`);}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function assert(ok,message){if(!ok)throw new Error(message);}

evalFile('settings-v130.js');
evalFile('engine-v130.js');
evalFile('runtime-v130.js');
await sleep(120);

const snap=window.__ipsAPI.snapshot();
assert(Number(snap.boardLayout)===2,'board layout migration marker missing');
assert((snap.placements.fire||[]).includes(5),'surviving peg did not map from old index 22 to new index 5');
assert(snap.pegMeta.fire&&snap.pegMeta.fire['5']&&Number(snap.pegMeta.fire['5'].level)===2,'surviving peg metadata was not re-keyed');

const all=[];
for(const type of ['fire','split','pierce','boom','chain'])for(const index of (snap.placements[type]||[]))all.push({type,index});
assert(all.every(p=>p.index>=0&&p.index<51),'migration left a peg outside the six-row field');
assert(all.every(p=>p.index!==4),'migration placed a special peg on the Firing Pin');
assert(new Set(all.map(p=>p.index)).size===all.length,'migration created overlapping special pegs');
assert((snap.placements.split||[]).length===1,'removed-row peg was not relocated');
assert((snap.placements.pierce||[]).length===1,'Firing Pin collision peg was not relocated');
const splitIndex=snap.placements.split[0];
const pierceIndex=snap.placements.pierce[0];
assert(snap.pegMeta.split&&snap.pegMeta.split[String(splitIndex)]&&Number(snap.pegMeta.split[String(splitIndex)].invested)===350,'removed-row peg investment was lost');
assert(snap.pegMeta.pierce&&snap.pegMeta.pierce[String(pierceIndex)]&&Number(snap.pegMeta.pierce[String(pierceIndex)].level)===3,'Firing Pin collision peg level was lost');

const hardware=[...document.querySelectorAll('[data-hardware-index]')];
assert(hardware.length===51,`expected 51 rendered pegs, found ${hardware.length}`);
assert(!document.querySelector('[data-hardware-index="51"]'),'seventh peg row still renders');
const first=document.querySelector('[data-hardware-index="0"]');
const pin=document.querySelector('[data-hardware-index="4"]');
const last=document.querySelector('[data-hardware-index="50"]');
assert(first&&Math.abs(parseFloat(first.style.top)-(158/472*100))<0.01,'first peg row is not at y=158');
assert(pin&&pin.classList.contains('peg-pin'),'Firing Pin did not remain at index 4');
assert(pin&&Math.abs(parseFloat(pin.style.top)-(158/472*100))<0.01,'Firing Pin did not move with the first surviving row');
assert(last&&Math.abs(parseFloat(last.style.top)-(378/472*100))<0.01,'bottom surviving peg row moved');
assert(document.querySelectorAll('.slot-label').length===9,'catch-pocket row changed');
assert(/top:42px!important/.test(css),'launcher is not centered in the freed upper band');

console.log('v1.14.6 six-row board smoke PASS');
console.log(`peg count: ${hardware.length}; rows: 6; y-range: 158..378`);
console.log(`migrated indices: fire=5 split=${splitIndex} pierce=${pierceIndex}`);
dom.window.close();
