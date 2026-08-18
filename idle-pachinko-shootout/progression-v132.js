(function(){
'use strict';
if(window.__ipsProgression132)return;
window.__ipsProgression132=true;

var SESSION_KEY='ips-first-session-v1';
var ECON_KEY='ips-economy-telemetry-v1';
var BLUEPRINT_KEY='ips-blueprints-v1';
var ONBOARDING_KEY='ips-onboarding-v1';
var FIRST_DEATH={xp:60,coins:80};
var TREMOR_GOAL={clear:8,research:420,peg:90};
var api=null;

function $(id){return document.getElementById(id);}
function read(key,fallback){try{var raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}
function snap(){return api&&api.snapshot?api.snapshot():{};}
function now(){return Date.now();}
function elapsed(start){return Math.max(0,now()-Number(start||now()));}
function session(){var s=read(SESSION_KEY,{});s.version=1;s.startedAt=Number(s.startedAt||now());s.firstDeathRewarded=!!s.firstDeathRewarded;s.workshop=s.workshop||{};return s;}
function saveSession(s){write(SESSION_KEY,s);}
function economy(){var e=read(ECON_KEY,{});e.version=1;e.startedAt=Number(e.startedAt||now());e.runs=Number(e.runs||0);e.events=e.events||[];e.waves=e.waves||[];e.milestones=e.milestones||{};return e;}
function saveEconomy(e){if(e.events.length>160)e.events=e.events.slice(-160);if(e.waves.length>40)e.waves=e.waves.slice(-40);write(ECON_KEY,e);}
function gearCount(s){var g=(s&&s.gear)||{},n=0,k;for(k in g)if(g[k])n++;return n;}
function compactSnapshot(){var s=snap();return{xp:Math.floor(Number(s.xp||0)),coins:Math.floor(Number(s.coins||0)),highest:Number(s.highest||1),checkpoint:Number(s.checkpoint||1),power:Number(s.power||0),slot:Number(s.slot||0),firePeg:Number(s.fire||0),fireAmmo:Number((s.ammoUnlock&&s.ammoUnlock.fire)||0),gear:gearCount(s)};}
function record(type,detail){var e=economy(),shot=compactSnapshot();e.events.push({type:type,at:now(),elapsedMs:elapsed(e.startedAt),wave:Number((detail&&detail.wave)||shot.highest||1),xp:shot.xp,coins:shot.coins,detail:detail||{}});if(type==='waveClear')e.waves.push({wave:Number((detail&&detail.wave)||0),at:now(),elapsedMs:elapsed(e.startedAt),xp:shot.xp,coins:shot.coins,checkpoint:shot.checkpoint,gear:shot.gear});saveEconomy(e);}
function milestone(name,detail){var e=economy();if(e.milestones[name])return;e.milestones[name]={at:now(),elapsedMs:elapsed(e.startedAt),snapshot:compactSnapshot(),detail:detail||{}};saveEconomy(e);}
function attachInitialRun(){var e=economy();if(e.runs>0)return;e.runs=1;e.events.push({type:'runAttach',at:now(),elapsedMs:elapsed(e.startedAt),wave:compactSnapshot().highest,xp:compactSnapshot().xp,coins:compactSnapshot().coins,detail:{initial:true}});saveEconomy(e);}
function toast(title,text){var box=$('campaignToast');if(!box)return;box.innerHTML='<b>'+title+'</b><span>'+text+'</span>';box.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(function(){box.classList.remove('show');},3600);}
function boardTab(){return document.querySelector('.dock [data-sheet="board"]');}
function pulseBoard(){var b=boardTab();if(!b)return;b.classList.add('ips-guided','ips-new');}
function clearBoardPulse(){var b=boardTab();if(!b)return;b.classList.remove('ips-guided','ips-new');}
function blueprintState(){var b=read(BLUEPRINT_KEY,{});b.bought=b.bought||{};return b;}
function isFreshOpening(){var o=read(ONBOARDING_KEY,{}),s=snap();if(o&&o.migrated)return false;return Number(s.highest||1)<=11;}

function rewardFirstDeath(detail){
  var s=session(),wave=Number((detail&&detail.wave)||1),summary;
  if(s.firstDeathRewarded||!isFreshOpening())return;
  s.firstDeathRewarded=true;s.firstDeathWave=wave;s.firstDeathAt=now();saveSession(s);
  api.grant(FIRST_DEATH.xp,FIRST_DEATH.coins,'LAST STAND CACHE');
  summary=$('deathSummary');if(summary)summary.textContent+=' First fall cache: +'+FIRST_DEATH.xp+' XP + '+FIRST_DEATH.coins+' coins. Spend it before the next ride.';
  milestone('firstDeath',{wave:wave,reward:FIRST_DEATH});
  record('firstDeathReward',{wave:wave,xp:FIRST_DEATH.xp,coins:FIRST_DEATH.coins});
}

function workshopGoal(){
  var s=snap(),m=session(),b=blueprintState(),eligible=Number(s.highest||1)>TREMOR_GOAL.clear,coins=Number(s.coins||0),owned=Number(s.fire||0)>0;
  if(!eligible)return;
  if(owned){
    if(!m.workshop.complete){m.workshop.complete=true;m.workshop.completedAt=now();saveSession(m);clearBoardPulse();toast('BUILD ONLINE','Tremor Peg is ready for the first boss.');milestone('firstTremorPeg',{});}
    return;
  }
  if(b.bought.tremor){
    if(coins>=TREMOR_GOAL.peg&&!m.workshop.pegFunded){m.workshop.pegFunded=true;m.workshop.pegFundedAt=now();saveSession(m);pulseBoard();toast('PEG FUNDED','You can now buy the first Tremor Peg in Board.');milestone('tremorPegFunded',{});}return;
  }
  if(coins>=TREMOR_GOAL.research&&!m.workshop.researchFunded){m.workshop.researchFunded=true;m.workshop.researchFundedAt=now();saveSession(m);pulseBoard();toast('WORKSHOP FUNDED','You can now research Seismic Hammer in Board.');milestone('tremorResearchFunded',{});}
}

function fmtTime(ms){var sec=Math.round(Number(ms||0)/1000);if(sec<60)return sec+'s';var min=Math.floor(sec/60),rem=sec%60;return min+'m '+rem+'s';}
function economySummary(){
  var e=economy(),m=e.milestones||{},waves=e.waves||[],last=waves.slice(-10),lines=[],names=[['firstDeath','First death'],['tremorResearchFunded','Seismic funded'],['tremorPegFunded','Tremor funded'],['firstTremorPeg','Tremor online'],['firstBossLoot','First boss loot']];
  names.forEach(function(pair){var x=m[pair[0]];if(x)lines.push(pair[1]+': '+fmtTime(x.elapsedMs)+(x.detail&&x.detail.wave?' · Wave '+x.detail.wave:''));});
  return{runs:e.runs,milestones:lines,waves:last.map(function(w){return'W'+w.wave+' · ✦'+w.xp+' · ●'+w.coins+' · gear '+w.gear;})};
}
function enhanceTelemetry(){
  var btn=$('devButton');if(!btn)return;
  btn.addEventListener('click',function(){setTimeout(function(){var root=$('telemetryContent'),old,box,s;if(!root)return;old=root.querySelector('.first-session-economy');if(old)old.remove();s=economySummary();box=document.createElement('div');box.className='telemetry-section first-session-economy';box.innerHTML='<h3>First-session economy</h3><p><b>'+s.runs+' run'+(s.runs===1?'':'s')+' observed</b></p><pre>'+(s.milestones.length?s.milestones.join('\n'):'No first-session milestones recorded yet.')+'\n\n'+(s.waves.length?s.waves.join('\n'):'No wave snapshots yet.')+'</pre><small>Local balance telemetry only. It records wallet snapshots and milestone timing, not personal data.</small>';root.appendChild(box);},70);});
}

function bind(){
  document.addEventListener('ips:runStart',function(e){var econ=economy();econ.runs++;saveEconomy(econ);record('runStart',e.detail||{});});
  document.addEventListener('ips:waveClear',function(e){record('waveClear',e.detail||{});workshopGoal();});
  document.addEventListener('ips:heroDeath',function(e){record('heroDeath',e.detail||{});rewardFirstDeath(e.detail||{});});
  document.addEventListener('ips:upgrade',function(e){record('upgrade',e.detail||{});workshopGoal();});
  document.addEventListener('ips:contractClaim',function(e){record('contractClaim',e.detail||{});milestone('firstBountyClaim',e.detail||{});workshopGoal();});
  document.addEventListener('ips:lootChoice',function(e){record('lootChoice',e.detail||{});if((e.detail||{}).equip)milestone('firstGearEquipped',e.detail||{});});
  document.addEventListener('ips:loot',function(e){var d=e.detail||{},shot=compactSnapshot();record('loot',d);if(d.source==='boss')milestone('firstBossLoot',{wave:Math.max(1,shot.highest-1)});});
  document.addEventListener('ips:onboardingComplete',function(e){var d=e.detail||{};record('onboardingComplete',d);if(d.tab)milestone('lesson_'+d.tab,d);});
  document.addEventListener('ips:menu',function(e){if((e.detail||{}).name==='board')clearBoardPulse();});
}
function boot(){api=window.__ipsAPI;if(!api||!api.snapshot||!api.grant)return false;attachInitialRun();bind();enhanceTelemetry();workshopGoal();window.__ipsEconomyTelemetry={snapshot:function(){return JSON.parse(JSON.stringify(economy()));},targets:{firstDeath:FIRST_DEATH,tremor:TREMOR_GOAL}};return true;}
var tries=0,timer=setInterval(function(){tries++;if(boot()||tries>120)clearInterval(timer);},50);
})();
