import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const GAME=path.resolve('idle-pachinko-shootout');
const html=fs.readFileSync(path.join(GAME,'index.html'),'utf8');
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function assert(ok,message){if(!ok)throw new Error(message);}
function makeDom(){
  const dom=new JSDOM(html,{url:'https://ips.test/',pretendToBeVisual:true,runScripts:'outside-only'});
  const {window}=dom;
  window.requestAnimationFrame=function(){return 1;};window.cancelAnimationFrame=function(){};
  window.HTMLElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,right:393,bottom:472,width:393,height:472,x:0,y:0,toJSON(){return this;}};};
  const gradient={addColorStop(){}};const noop=()=>{};
  const ctx=new Proxy({createLinearGradient(){return gradient;},createRadialGradient(){return gradient;},measureText(){return{width:10};},setTransform:noop,clearRect:noop,fillRect:noop,strokeRect:noop,beginPath:noop,closePath:noop,arc:noop,fill:noop,stroke:noop,moveTo:noop,lineTo:noop,fillText:noop,save:noop,restore:noop,translate:noop,rotate:noop,scale:noop},{get(target,key){if(key in target)return target[key];return 0;},set(target,key,value){target[key]=value;return true;}});
  window.HTMLCanvasElement.prototype.getContext=function(){return ctx;};
  return dom;
}
function evalFile(window,name){window.eval(fs.readFileSync(path.join(GAME,name),'utf8')+`\n//# sourceURL=${name}`);}

const dom=makeDom();const {window}=dom;const {document}=window;
evalFile(window,'settings-v130.js');
evalFile(window,'engine-v130.js');
evalFile(window,'runtime-v130.js');
evalFile(window,'campaign-v131.js');
evalFile(window,'onboarding-v131.js');
await sleep(650);

const tab=name=>document.querySelector(`.dock [data-sheet="${name}"]`);
assert(tab('hero').classList.contains('ips-locked'),'Hero should begin locked before intro completion');
assert(tab('board').classList.contains('ips-locked'),'Board should begin locked');
assert(tab('ammo').classList.contains('ips-locked'),'Ammo should begin locked');

// Finish the retained three-card intro.
document.getElementById('tutorialNext').click();document.getElementById('tutorialNext').click();document.getElementById('tutorialNext').click();
await sleep(760);
assert(!tab('hero').classList.contains('ips-locked'),'Hero did not unlock after intro');
assert(tab('board').classList.contains('ips-locked'),'Board unlocked before the Hero lesson');
assert(document.getElementById('sheetTitle').textContent==='Gunslinger','Hero lesson did not open the Hero tab');
let target=document.querySelector('[data-hero="power"]');
assert(target&&target.classList.contains('ips-tutorial-target'),'High Caliber was not highlighted');
assert(window.__ipsAPI.snapshot().xp>=40,'Hero tutorial XP subsidy missing');
target.click();await sleep(60);
assert(window.__ipsAPI.snapshot().power===1,'Hero lesson purchase did not complete');

// Board unlock waits for a natural combat beat.
document.dispatchEvent(new window.CustomEvent('ips:reloadStart',{detail:{duration:1000}}));
await sleep(760);
assert(!tab('board').classList.contains('ips-locked'),'Board did not unlock after Hero lesson + combat beat');
assert(document.getElementById('sheetTitle').textContent==='Pachinko Board','Board lesson did not open');
target=document.querySelector('[data-board="slot"]');
assert(target&&target.classList.contains('ips-tutorial-target'),'Sharpen Slots was not highlighted');
assert(window.__ipsAPI.snapshot().coins>=50,'Board tutorial coin subsidy missing');
target.click();await sleep(60);
assert(window.__ipsAPI.snapshot().slot===1,'Board lesson purchase did not complete');

// Advance to Wave 4, where campaign-v131 guarantees the first field gear drop.
for(let i=0;i<3;i++){window.__ipsDebug.killWave();await sleep(45);}
assert(window.__ipsDebug.state().wave===4,'expected Wave 4 before guaranteed gear lesson');
await sleep(900);
assert(!document.getElementById('lootModal').classList.contains('hidden'),'guaranteed first gear did not open on Wave 4');
assert(document.getElementById('equipNew').classList.contains('ips-tutorial-target'),'first gear did not guide Equip New');
assert(document.getElementById('sellNew').disabled===true,'first gear lesson should prevent selling the teaching item');
document.getElementById('equipNew').click();await sleep(760);
assert(!tab('gear').classList.contains('ips-locked'),'Gear did not unlock after first equipped item');
assert(document.getElementById('sheetTitle').textContent==='Gear','Gear lesson did not open');
const gearCard=document.querySelector('.gear-slot:not(.empty)');
assert(gearCard&&gearCard.classList.contains('ips-tutorial-target'),'First gear was not highlighted');
gearCard.click();await sleep(30);

// Clear Waves 4 and 5. The Wave 5 clear reveals the first ammo blueprint.
for(let i=0;i<2;i++){window.__ipsDebug.killWave();await sleep(45);}
await sleep(760);
assert(!tab('ammo').classList.contains('ips-locked'),'Ammo did not unlock after first blueprint milestone');
assert(document.getElementById('sheetTitle').textContent==='Ammo Lab','Ammo lesson did not open');
let bp=document.querySelector('[data-blueprint-buy="fire"]');
assert(bp&&bp.classList.contains('ips-tutorial-target'),'First blueprint research was not highlighted');
assert(window.__ipsAPI.snapshot().coins>=250,'Blueprint tutorial subsidy missing');
bp.click();await sleep(100);
let ammoBuy=document.querySelector('[data-ammo-unlock="fire"]');
assert(ammoBuy&&ammoBuy.classList.contains('ips-tutorial-target'),'Incendiary ammo purchase was not highlighted after research');
assert(window.__ipsAPI.snapshot().coins>=150,'Ammo purchase tutorial subsidy missing');
ammoBuy.click();await sleep(80);
assert(window.__ipsAPI.snapshot().ammoUnlock.fire===1,'Ammo lesson purchase did not complete');

// Sixth clear makes the fresh Trailblazer contract claimable.
window.__ipsDebug.killWave();await sleep(760);
assert(!tab('bounties').classList.contains('ips-locked'),'Bounties did not unlock when the first contract became ready');
assert(document.getElementById('sheetTitle').textContent==='Bounties','Bounties lesson did not open');
const claim=document.querySelector('[data-contract-claim]:not([disabled])');
assert(claim&&claim.classList.contains('ips-tutorial-target'),'First contract claim was not highlighted');
claim.click();await sleep(50);
const onboarding=JSON.parse(window.localStorage.getItem('ips-onboarding-v1'));
for(const name of ['hero','board','ammo','gear','bounties'])assert(onboarding.completed[name]===true,`${name} onboarding lesson did not complete`);

// Lifecycle seal: death -> restart -> boss loot -> next region -> save reload.
window.__ipsDebug.killHero();assert(!document.getElementById('deathModal').classList.contains('hidden'),'death modal did not open');
window.__ipsAPI.grant(1000,1000,'TEST');document.getElementById('rideAgain').click();await sleep(20);assert(window.__ipsDebug.state().state!=='dead','Ride Again did not restart gameplay');
while(window.__ipsDebug.state().wave<10){window.__ipsDebug.killWave();await sleep(20);}
window.__ipsDebug.killWave();await sleep(30);assert(!document.getElementById('lootModal').classList.contains('hidden'),'boss loot modal did not open');document.getElementById('equipNew').click();await sleep(30);assert(window.__ipsDebug.state().wave===11,'boss loot did not advance to next region');
const persisted=window.localStorage.getItem('ips-v7');assert(persisted,'canonical save missing after lifecycle');

const reloadDom=makeDom();reloadDom.window.localStorage.setItem('ips-v7',persisted);evalFile(reloadDom.window,'settings-v130.js');evalFile(reloadDom.window,'engine-v130.js');await sleep(30);assert(reloadDom.window.__ipsAPI.snapshot().highest>=11,'save/reload lost campaign progression');

console.log('v1.13.1 onboarding + lifecycle smoke PASS');
dom.window.close();reloadDom.window.close();
