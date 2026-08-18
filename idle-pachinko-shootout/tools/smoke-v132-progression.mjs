import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const GAME=path.resolve('idle-pachinko-shootout');
const html=fs.readFileSync(path.join(GAME,'index.html'),'utf8');
const progression=fs.readFileSync(path.join(GAME,'progression-v132.js'),'utf8');
const runtime=fs.readFileSync(path.join(GAME,'runtime-v130.js'),'utf8');
const engine=fs.readFileSync(path.join(GAME,'engine-v130.js'),'utf8');
const campaign=fs.readFileSync(path.join(GAME,'campaign-v131.js'),'utf8');
function assert(ok,message){if(!ok)throw new Error(message);}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

// Static first-session balance contract. If a source number changes, this test
// forces the opening arc to be reconsidered instead of drifting accidentally.
assert(/fire:\{clear:5,cost:250/.test(runtime),'Incendiary research cost drifted from 250');
assert(/tremor:\{clear:8,cost:420/.test(runtime),'Seismic Hammer research cost drifted from 420');
assert(/fire:\{name:'Incendiary'.*unlock:150/.test(engine),'Incendiary round cost drifted from 150');
assert(/function pegBase\(type\)\{return\{fire:90/.test(engine),'Tremor Peg cost drifted from 90');
assert(/waves:\{progress:0,target:6,tier:1\}/.test(campaign),'First Trailblazer target drifted from six waves');
assert(/FIRST_DEATH=\{xp:60,coins:80\}/.test(progression),'First-death cache drifted from 60 XP / 80 coins');

// Exact gross rewards from the current Wave 1-10 enemy and wave-clear formulas.
const base=[9,10,11,14];
let grossXp=0,grossCoins=0;
const rows=[];
for(let w=1;w<=10;w++){
  let rewards=[];
  if(w===10) rewards=[Math.round(95*(1+w*.095))];
  else {
    const n=w<3?1:w<6?2:3;
    const elite=w%5===0;
    for(let i=0;i<n;i++) rewards.push(Math.round(base[(w+i)%4]*(1+w*.095)*(elite?1.7:1)));
  }
  const xp=rewards.reduce((sum,r)=>sum+Math.round(r*.75),0);
  const coins=rewards.reduce((sum,r)=>sum+r,0)+(20+w*4);
  grossXp+=xp;grossCoins+=coins;rows.push({w,xp,coins,cumXp:grossXp,cumCoins:grossCoins});
}
assert(rows[4].cumXp===100 && rows[4].cumCoins===293,'Wave-5 gross economy no longer matches onboarding baseline');
assert(rows[8].cumXp===269 && rows[8].cumCoins===719,'Wave-9 gross economy no longer matches workshop baseline');
assert(rows[9].cumXp===408 && rows[9].cumCoins===964,'First-boss gross economy drifted');

// Guided baseline: Hero/Board tutorial subsidies make their first purchases
// economy-neutral. At Wave 5, the player has 293 natural coins; Incendiary
// research spends 250, then the tutorial tops the wallet to 150 for the round.
const afterWave5=0;
const wave6to8=rows.slice(5,8).reduce((s,r)=>s+r.coins,0);
const wave9=rows[8].coins;
const firstBountyCoins=85;
const noDeathWave8=afterWave5+wave6to8+firstBountyCoins;
const noDeathWave9=noDeathWave8+wave9;
assert(noDeathWave8===390,'Wave-8 guided wallet target drifted');
assert(noDeathWave8<420,'Seismic Hammer should normally still require saving at Wave 8 without a death cache');
assert(noDeathWave9===511,'Wave-9 guided wallet target drifted');
assert(noDeathWave9>=420+90,'A saver should afford Seismic Hammer + first Tremor Peg before the boss');
const deathWave8=noDeathWave8+80;
assert(deathWave8>=420,'First-death cache should make Seismic research affordable by Wave 8 if saved');
assert(deathWave8-420+wave9>=90,'After Wave 9 the same path should afford the Tremor Peg');

// Behavioral contract with a fake engine API: reward exactly once and pulse
// the Board when the workshop target becomes affordable.
const dom=new JSDOM(html,{url:'https://ips.test/',pretendToBeVisual:true,runScripts:'outside-only'});
const {window}=dom;const {document}=window;
let save={xp:10,coins:20,highest:6,checkpoint:6,fire:0,gear:{gun:null,hat:null,duster:null,boots:null,charm:null},ammoUnlock:{fire:1}};
let grants=[];
window.__ipsAPI={snapshot(){return JSON.parse(JSON.stringify(save));},grant(xp,coins,label){save.xp+=xp;save.coins+=coins;grants.push({xp,coins,label});}};
window.localStorage.setItem('ips-onboarding-v1',JSON.stringify({migrated:false}));
window.eval(progression+'\n//# sourceURL=progression-v132.js');
await sleep(90);
document.getElementById('deathSummary').textContent='Run ended.';
document.dispatchEvent(new window.CustomEvent('ips:heroDeath',{detail:{wave:6}}));
await sleep(10);
assert(grants.length===1 && grants[0].xp===60 && grants[0].coins===80,'first death did not grant the intended cache');
assert(/First fall cache/.test(document.getElementById('deathSummary').textContent),'death summary did not explain the first-fall reward');
document.dispatchEvent(new window.CustomEvent('ips:heroDeath',{detail:{wave:6}}));
assert(grants.length===1,'first-death cache was repeatable');

save.highest=9;save.coins=420;
document.dispatchEvent(new window.CustomEvent('ips:waveClear',{detail:{wave:8}}));
await sleep(10);
const board=document.querySelector('.dock [data-sheet="board"]');
assert(board.classList.contains('ips-guided'),'Board was not called out when Seismic research became affordable');
let firstSession=JSON.parse(window.localStorage.getItem('ips-first-session-v1'));
assert(firstSession.workshop.researchFunded===true,'Seismic funded milestone was not persisted');

window.localStorage.setItem('ips-blueprints-v1',JSON.stringify({bought:{tremor:1}}));
save.coins=90;
document.dispatchEvent(new window.CustomEvent('ips:upgrade',{detail:{kind:'hero',key:'power'}}));
await sleep(10);
firstSession=JSON.parse(window.localStorage.getItem('ips-first-session-v1'));
assert(firstSession.workshop.pegFunded===true,'Tremor Peg funded milestone was not persisted');
save.fire=1;
document.dispatchEvent(new window.CustomEvent('ips:upgrade',{detail:{kind:'board',key:'fire'}}));
await sleep(10);
firstSession=JSON.parse(window.localStorage.getItem('ips-first-session-v1'));
assert(firstSession.workshop.complete===true,'Tremor workshop goal did not complete');
assert(window.__ipsEconomyTelemetry&&window.__ipsEconomyTelemetry.targets.tremor.research===420,'economy telemetry API missing');

console.log('v1.13.2 progression/economy smoke PASS');
console.log('guided no-death wallet: Wave 8 = 390, Wave 9 = 511');
console.log('first-death cache: +60 XP / +80 coins');
dom.window.close();
