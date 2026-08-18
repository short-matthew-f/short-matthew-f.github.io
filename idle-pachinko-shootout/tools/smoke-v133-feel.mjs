import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const GAME=path.resolve('idle-pachinko-shootout');
const html=fs.readFileSync(path.join(GAME,'index.html'),'utf8');
const js=fs.readFileSync(path.join(GAME,'feel-v133.js'),'utf8');
const css=fs.readFileSync(path.join(GAME,'feel-v133.css'),'utf8');
function assert(ok,message){if(!ok)throw new Error(message);}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

const dom=new JSDOM(html,{url:'https://ips.test/',pretendToBeVisual:true,runScripts:'outside-only'});
const {window}=dom;const {document}=window;
window.HTMLElement.prototype.getBoundingClientRect=function(){return{left:10,top:10,right:110,bottom:60,width:100,height:50,x:10,y:10,toJSON(){return this;}};};
let save={xp:100,coins:200};
window.__ipsAPI={snapshot(){return JSON.parse(JSON.stringify(save));}};

// Engine/runtime normally render these. Add deterministic fixtures so the feel
// controller can prove that event details land on the same DOM contract.
const wrap=document.querySelector('.board-wrap');
document.getElementById('slotLabels').innerHTML=Array.from({length:9},(_,i)=>`<div class="slot-label">${i+1}</div>`).join('');
const hardware=document.createElement('span');hardware.className='peg-hardware peg-fire';hardware.setAttribute('data-hardware-index','11');hardware.innerHTML='<i class="peg-face"></i>';wrap.appendChild(hardware);
const enemy=document.createElement('div');enemy.className='enemy focused';enemy.setAttribute('data-enemy-id','e1');document.getElementById('enemyLane').appendChild(enemy);

window.eval(js+'\n//# sourceURL=feel-v133.js');
await sleep(90);
assert(window.__ipsFeel&&window.__ipsFeel.version==='1.13.3','feel controller did not boot');
assert(document.querySelector('.board-feel-layer'),'board feel layer missing');
assert(document.querySelector('.combat-feel-layer'),'combat feel layer missing');

function emit(name,detail){document.dispatchEvent(new window.CustomEvent('ips:'+name,{detail}));}
emit('ballLaunch',{ammo:'fire'});
assert(document.querySelector('.launcher-cap').classList.contains('feel-launch'),'launch cadence feedback missing');
assert(document.querySelector('.feel-launch-ring'),'launch ring missing');

emit('peg',{type:'fire',index:11,level:0});
assert(hardware.classList.contains('feel-peg-hit'),'special peg hardware did not react');
assert(document.querySelector('.feel-peg-burst.feel-fire'),'special peg burst missing');

emit('slot',{slot:4,value:10,crit:true,ammo:'fire'});
assert(document.querySelectorAll('.slot-label')[4].classList.contains('feel-slot-jackpot'),'high-value slot did not get jackpot feedback');
assert(document.querySelector('.feel-slot-pop.high.crit'),'slot payoff label missing');

emit('shot',{kind:'boom',crit:true,ammo:'boom'});
assert(document.getElementById('combat').classList.contains('feel-shot-boom'),'specialty shot wash missing');
assert(document.querySelector('.feel-shot-callout.crit'),'critical specialty callout missing');
emit('enemyHit',{crit:true});
assert(document.querySelector('.feel-impact.crit'),'critical impact feedback missing');

save.xp+=12;save.coins+=20;emit('enemyDeath',{boss:false});
await sleep(10);
assert(document.querySelector('.feel-wallet-delta.earned'),'earned currency float missing');

save.xp-=40;emit('upgrade',{kind:'hero',key:'power'});
await sleep(10);
assert(/UPGRADE LOCKED IN/.test(document.getElementById('feelToast').textContent),'upgrade confirmation toast missing');
assert(document.querySelector('.feel-wallet-delta.spent'),'spent currency float missing');
assert(document.querySelector('.feel-upgrade-stamp'),'sheet upgrade stamp missing');

save.coins+=60;emit('waveClear',{wave:5,bonus:40});
await sleep(10);
assert(document.querySelector('.feel-wave-banner'),'wave-clear banner missing');

emit('loot',{unique:true,rarity:'Unique'});
assert(document.querySelector('#lootModal .loot-card').classList.contains('feel-loot-reveal'),'loot reveal feedback missing');
assert(document.getElementById('newLootCard').classList.contains('feel-unique-loot'),'unique loot emphasis missing');

document.getElementById('campaignToast').innerHTML='<b>BLUEPRINT AVAILABLE</b><span>Test</span>';
await sleep(10);
assert(document.getElementById('campaignToast').classList.contains('feel-blueprint'),'blueprint campaign toast emphasis missing');

// Architecture/accessibility contract: no sheet observer, and reduced motion
// explicitly disables the major animations.
assert(!/observe\([^\n]*sheetContent|observe\(content/.test(js),'feel layer must not observe the upgrade-sheet subtree');
assert(/prefers-reduced-motion:reduce/.test(css),'reduced-motion fallback missing');
assert(/@keyframes feelPegHardware\{0%,100%\{scale:1\}/.test(css),'peg animation must preserve the hardware transform');

console.log('v1.13.3 core game feel smoke PASS');
dom.window.close();
