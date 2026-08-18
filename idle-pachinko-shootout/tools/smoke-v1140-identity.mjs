import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const GAME=path.resolve('idle-pachinko-shootout');
const html=fs.readFileSync(path.join(GAME,'index.html'),'utf8');
const js=fs.readFileSync(path.join(GAME,'dustwater-v1140.js'),'utf8');
const css=fs.readFileSync(path.join(GAME,'dustwater-v1140.css'),'utf8');
const audio=fs.readFileSync(path.join(GAME,'dustwater-audio-v1140.js'),'utf8');
function assert(ok,message){if(!ok)throw new Error(message);}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

const dom=new JSDOM(html,{url:'https://ips.test/',pretendToBeVisual:true,runScripts:'outside-only'});
const {window}=dom;const {document}=window;

// Add a representative Dustwater enemy. The real engine owns this DOM.
const enemy=document.createElement('article');
enemy.className='enemy role-melee';enemy.setAttribute('data-enemy-id','z1');
enemy.innerHTML='<div class="unit-figure"></div><div class="enemy-name">Zombie Outlaw</div>';
document.getElementById('enemyLane').appendChild(enemy);
window.eval(js+'\n//# sourceURL=dustwater-v1140.js');
await sleep(80);

assert(window.__ipsDustwaterIdentity&&window.__ipsDustwaterIdentity.version==='1.14.0','Dustwater identity controller did not boot');
assert(document.getElementById('app').classList.contains('region-dustwater'),'Wave 1 did not activate Dustwater identity');
assert(document.getElementById('dustwaterIdentity'),'Dustwater scenery layer missing');
assert(document.querySelector('.dw-town .dw-saloon'),'Dustwater town silhouette missing');
assert(document.querySelector('.dustwater-board-plate'),'in-world Board maker plate missing');
assert(document.getElementById('heroUnit').classList.contains('dw-gunslinger'),'Gunslinger identity treatment missing');
assert(enemy.classList.contains('dw-zombie'),'Zombie family was not classified');
assert(enemy.querySelector('.dw-family-tag')?.textContent==='DEAD MAN','Zombie family tag missing');

// Replace with the first boss and verify dedicated Undertaker treatment.
document.getElementById('enemyLane').innerHTML='<article class="enemy boss role-hybrid" data-enemy-id="boss1"><div class="unit-figure"><svg class="undertaker-v15"></svg></div><div class="enemy-name">The Undertaker</div></article>';
document.dispatchEvent(new window.CustomEvent('ips:waveStart',{detail:{wave:10,boss:true}}));
await sleep(40);
const boss=document.querySelector('[data-enemy-id="boss1"]');
assert(boss.classList.contains('dw-undertaker')&&boss.classList.contains('dw-boss'),'Undertaker did not get boss identity');
assert(boss.querySelector('.dw-undertaker-sigil'),'Undertaker grave sigil missing');
assert(document.querySelector('.dw-boss-card'),'Undertaker entrance card missing');

// Leaving Region 1 must turn the identity off without deleting shared game DOM.
document.dispatchEvent(new window.CustomEvent('ips:waveStart',{detail:{wave:11,boss:false}}));
await sleep(20);
assert(!document.getElementById('app').classList.contains('region-dustwater'),'Dustwater identity leaked into Region 2');

// Presentation / accessibility / audio contracts.
assert(/\.dw-undertaker \.unit-figure \.undertaker-v15\{display:block!important/.test(css),'Undertaker vector fallback must remain visible');
assert(/prefers-reduced-motion:reduce/.test(css),'Dustwater reduced-motion rules missing');
assert(/DUSTWATER ARSENAL/.test(js),'Board identity plate copy drifted');
assert(/window\.__ipsAudioCore/.test(audio),'Dustwater audio must share the existing audio core');
assert(/regionForWave\(currentWave\)===1/.test(audio),'Dustwater audio must be Region-1 scoped');
assert(/function bossArrival\(\)/.test(audio)&&/bell\(0\);bell\(\.46\);bell\(\.92\)/.test(audio),'Undertaker three-bell entrance signature missing');
assert(/ips:shot/.test(audio)&&/ips:peg/.test(audio)&&/ips:enemyDeath/.test(audio),'Dustwater audio event coverage missing');
assert(!/fetch\(|new Function\(/.test(js+audio),'identity layer must not introduce dynamic code loading');
assert(!/observe\([^\n]*sheetContent|observe\(content/.test(js+audio),'identity layer must not observe upgrade-sheet subtree');

console.log('v1.14.0 Dustwater identity smoke PASS');
dom.window.close();
