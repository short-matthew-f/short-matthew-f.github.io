import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const GAME=path.resolve('idle-pachinko-shootout');
const html=fs.readFileSync(path.join(GAME,'index.html'),'utf8');
const pegCss=fs.readFileSync(path.join(GAME,'peg-v113.css'),'utf8');
const dom=new JSDOM(html,{url:'https://ips.test/',pretendToBeVisual:true,runScripts:'outside-only'});
const {window}=dom;
const {document}=window;

// Keep the smoke deterministic and finite. We only need boot, save, menu and
// DOM-controller behavior; the real animation loop is exercised on-device.
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

// Seed a real dynamic pegMeta key. This is exactly the shape that the legacy
// merger used to discard on reload. boardLayout:2 keeps this persistence test
// focused on dynamic-key survival; legacy layout relocation is covered by the
// dedicated v1.14.6 migration smoke.
window.localStorage.setItem('ips-v7',JSON.stringify({
  coins:100000,xp:100000,fire:1,boardLayout:2,
  placements:{fire:[11],split:[],pierce:[],boom:[],chain:[]},
  pegMeta:{fire:{'11':{level:2,invested:500}},split:{},pierce:{},boom:{},chain:{}}
}));
window.localStorage.setItem('ips-blueprints-v1',JSON.stringify({bought:{tremor:1},seen:{},history:{}}));

function evalFile(name){window.eval(fs.readFileSync(path.join(GAME,name),'utf8')+`\n//# sourceURL=${name}`);}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function assert(ok,message){if(!ok)throw new Error(message);}

evalFile('settings-v130.js');
evalFile('engine-v130.js');
evalFile('runtime-v130.js');
await sleep(120);

assert(window.__ipsBooted===true,'engine did not set __ipsBooted');
assert(window.__ipsAPI&&window.__ipsAPI.version==='1.13.0','v1.13 API missing');
let snap=window.__ipsAPI.snapshot();
assert(snap.pegMeta&&snap.pegMeta.fire&&snap.pegMeta.fire['11'],'dynamic peg metadata was dropped at boot');
assert(Number(snap.pegMeta.fire['11'].level)===2,'peg level did not survive engine load');

const hardware=document.querySelector('[data-hardware-index="11"]');
assert(hardware,'rendered peg hardware missing');
assert(hardware.getAttribute('data-peg-level')==='2','rendered peg level does not match save');

const sheet=document.getElementById('sheet');
const content=document.getElementById('sheetContent');
let mutations=0;
const observer=new window.MutationObserver(list=>{mutations+=list.length;});
observer.observe(content,{childList:true,subtree:true});

window.__ipsAPI.openSheet('board');
await sleep(80);
assert(sheet.classList.contains('open'),'Board sheet did not open');
assert(document.querySelectorAll('.research-desk').length===1,'Blueprint Desk should render exactly once');

// Repeated Board upgrades used to trigger a self-feeding MutationObserver loop.
for(let i=0;i<4;i++){
  const button=content.querySelector('[data-board="slot"]');
  assert(button,'Sharpen Slots button missing');
  button.click();
  await sleep(35);
  assert(document.querySelectorAll('.research-desk').length===1,'Blueprint Desk duplicated after board upgrade');
}
await sleep(160);
observer.disconnect();

snap=window.__ipsAPI.snapshot();
assert(Number(snap.slot)===4,'Board upgrades did not complete normally');
assert(mutations<180,`runaway sheet mutations detected: ${mutations}`);
// JSDOM does not apply external stylesheets in this harness, so assert the
// legacy place/move control remains hidden by the active board-workshop CSS.
assert(/\.sheet-content\s+\[data-place\]\s*\{\s*display:none!important\s*\}/.test(pegCss),'legacy move/place control is not hidden by active CSS');

console.log('v1.13 smoke PASS');
console.log(`sheet mutations across open + 4 upgrades: ${mutations}`);
console.log(`peg 11 level: ${snap.pegMeta.fire['11'].level}`);
dom.window.close();
