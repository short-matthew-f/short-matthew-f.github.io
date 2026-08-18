import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const GAME=path.resolve('idle-pachinko-shootout');
const html=fs.readFileSync(path.join(GAME,'index.html'),'utf8');
const js=fs.readFileSync(path.join(GAME,'board-machine-v1142.js'),'utf8');
const css=fs.readFileSync(path.join(GAME,'board-machine-v1142.css'),'utf8');
function assert(ok,message){if(!ok)throw new Error(message);}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

const dom=new JSDOM(html,{url:'https://ips.test/',pretendToBeVisual:true,runScripts:'outside-only'});
const {window}=dom;const {document}=window;
window.eval(js+'\n//# sourceURL=board-machine-v1142.js');
await sleep(80);

const wrap=document.querySelector('.board-wrap');
const layer=document.querySelector('.board-machine-v1142');
assert(window.__ipsBoardMachine&&window.__ipsBoardMachine.version==='1.14.2','board machine controller did not boot');
assert(wrap?.classList.contains('machine-v1142'),'board machine class missing');
assert(layer&&layer.querySelector('.bm-left')&&layer.querySelector('.bm-right'),'machine side rails missing');
assert(layer.querySelector('.bm-top-rib')&&layer.querySelector('.bm-slot-rib'),'machine cross rails missing');
assert(layer.querySelector('.bm-bore'),'center bore guide missing');

// Event feedback remains presentation-only.
document.dispatchEvent(new window.CustomEvent('ips:ballLaunch',{detail:{ammo:'standard'}}));
assert(document.querySelector('.launcher-cap')?.classList.contains('bm-cycle'),'ball launch did not cycle cylinder presentation');
document.dispatchEvent(new window.CustomEvent('ips:slot',{detail:{slot:0,value:10}}));
assert(wrap.classList.contains('bm-catch'),'slot event did not move catch presentation');
await sleep(360);
assert(!document.querySelector('.launcher-cap')?.classList.contains('bm-cycle'),'cylinder pulse did not settle');
assert(!wrap.classList.contains('bm-catch'),'catch pulse did not settle');

// Visual contract from the phone screenshot review.
assert(/dustwater-board-plate\{top:7px!important/.test(css),'maker plate must stay in the machine header');
assert(/\.peg-n \.peg-face/.test(css),'ordinary pegs need a deliberately quieter material treatment');
assert(/\.peg-fire:after/.test(css)&&/\.peg-split:after/.test(css)&&/\.peg-pierce:after/.test(css)&&/\.peg-boom:after/.test(css)&&/\.peg-chain:after/.test(css),'special peg silhouettes are incomplete');
assert(/\.slot-label\.edge/.test(css)&&/font-size:17px!important/.test(css),'high-value catch pockets need stronger hierarchy');
assert(/bullet-queue:before/.test(css)&&/bullet-queue:after/.test(css),'cylinder housing fasteners missing');
assert(/prefers-reduced-motion:reduce/.test(css),'board machine reduced-motion rules missing');
assert(!/MutationObserver/.test(js),'board machine presentation must remain event-driven');
assert(!/fetch\(|new Function\(/.test(js),'board machine must not introduce dynamic code loading');

console.log('v1.14.2 board machine smoke PASS');
dom.window.close();
