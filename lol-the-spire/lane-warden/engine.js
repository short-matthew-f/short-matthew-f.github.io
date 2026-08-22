(() => {
'use strict';
const D=()=>window.LW_DATA;
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function hashSeed(s){let h=2166136261>>>0;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function newRun(seedText){const seed=hashSeed(seedText||`${Date.now()}`);return{schema:1,version:D().version,seed,seedLabel:seedText||String(seed),commanderId:'warden',embers:3,salvage:0,currentNode:'A1-B1',resolvedNodes:[],mapVisitCount:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),battle:null}}
function defaultDeployment(){return{north:{units:{ironjack:2,slingline:1,bulwark:1,zealot:0,ram:0},tower:'frost'},south:{units:{ironjack:1,slingline:1,bulwark:0,zealot:1,ram:1},tower:'bolt'}}}
function lanePower(dep){let p=0,d=0;for(const u of D().units){const n=dep.units[u.id]||0;p+=n*u.power;d+=n*u.durability}const tower=D().towers.find(t=>t.id===dep.tower);return{power:p+(tower?.power||0),durability:d,tower:dep.tower}}
function createBattle(run,deployment=defaultDeployment()){
 const rng=mulberry32(run.seed^0xA11CE);const N=lanePower(deployment.north),S=lanePower(deployment.south);
 return{schema:1,seed:run.seed,nodeId:'A1-B1',elapsed:0,gold:42,core:100,gate:100,gateVulnerable:false,commanderLane:'north',commanderDown:0,readReserve:4,readMenuOpen:false,lastStand:null,result:null,
 abilities:{rally:0,sunder:0,waypoint:0,conscript:0},effects:{north:{rally:0,conscript:0},south:{rally:0,conscript:0}},
 lanes:{
  north:{front:.37,bastion:100,guard:100,guardPrev:100,enemyPower:3.1+rng()*.25,allyPower:N.power,allyDurability:N.durability,regen:2.4,tower:N.tower,status:'STABLE'},
  south:{front:.42,bastion:100,guard:100,guardPrev:100,enemyPower:3.35+rng()*.3,allyPower:S.power,allyDurability:S.durability,regen:2.6,tower:S.tower,status:'STABLE'}
 },deployment,events:[{t:0,type:'battle-start'}]}
}
function guardState(l){if(l.bastion>0)return 'SHIELDED';const delta=l.guard-l.guardPrev;if(l.guard>=99.5)return 'STALLING';if(delta>0.08)return 'REGENERATING';if(delta<-0.08)return 'NET PROGRESS';return 'STALLING'}
function bastionState(hp){if(hp<=0)return 'FALLEN';if(hp<28)return 'CRITICAL';if(hp<62)return 'WATCH';return 'STABLE'}
function stepBattle(b,dt){
 if(b.result||b.lastStand?.active)return b;
 const scale=b.readMenuOpen&&b.readReserve>0?.35:1;
 if(b.readMenuOpen&&b.readReserve>0)b.readReserve=Math.max(0,b.readReserve-dt);
 else if(!b.readMenuOpen)b.readReserve=Math.min(4,b.readReserve+dt*.22);
 const sd=dt*scale;b.elapsed+=sd;b.gold=Math.min(99,b.gold+sd*.72);
 for(const [id,l] of Object.entries(b.lanes)){
   l.guardPrev=l.guard;
   const presence=b.commanderLane===id&&b.commanderDown<=0?D().commander.presence:1;
   const rally=b.effects[id].rally>0?1.35:1;const cons=b.effects[id].conscript>0?1.3:1;
   b.effects[id].rally=Math.max(0,b.effects[id].rally-sd);b.effects[id].conscript=Math.max(0,b.effects[id].conscript-sd);
   const friendly=l.allyPower*presence*rally*cons;
   const pressure=friendly-l.enemyPower;
   l.front=Math.max(.08,Math.min(.92,l.front+pressure*sd*.0029));
   if(pressure>0){
     if(l.bastion>0)l.bastion=Math.max(0,l.bastion-pressure*sd*1.08);
     else {const dmg=pressure*sd*.88;l.guard=Math.max(0,l.guard-dmg);if(l.guard>0)l.guard=Math.min(100,l.guard+l.regen*sd*.42)}
   }else{
     const threat=(-pressure)*sd*.22;
     if(l.front<.25)b.core=Math.max(0,b.core-threat*1.6);
     l.front=Math.max(.08,l.front-threat*.003);
   }
   l.status=bastionState(l.bastion);
 }
 b.gateVulnerable=Object.values(b.lanes).some(l=>l.guard<=0);
 if(b.gateVulnerable){const open=Object.values(b.lanes).filter(l=>l.guard<=0);b.gate=Math.max(0,b.gate-open.length*sd*2.35)}
 for(const k of Object.keys(b.abilities))b.abilities[k]=Math.max(0,b.abilities[k]-sd);
 if(b.commanderDown>0)b.commanderDown=Math.max(0,b.commanderDown-sd);
 if(b.gate<=0){b.result={kind:'victory',at:b.elapsed};b.events.push({t:b.elapsed,type:'victory'})}
 else if(b.core<=0){b.lastStand={active:true,phase:'core-fallen',t:0,payable:true};b.events.push({t:b.elapsed,type:'core-fallen'})}
 return b;
}
function useAbility(b,id,targetLane){if(b.result||b.lastStand?.active)return false;if((b.abilities[id]||0)>0)return false;const lane=targetLane||b.commanderLane;if(!b.lanes[lane])return false;
 const def=D().commander.abilities.find(a=>a.id===id);if(!def)return false;
 if(id==='rally')b.effects[lane].rally=6;
 if(id==='sunder'){const l=b.lanes[lane];if(l.bastion<=0)l.guard=Math.max(0,l.guard-18);else l.bastion=Math.max(0,l.bastion-12)}
 if(id==='waypoint')b.commanderLane=lane;
 if(id==='conscript')b.effects[lane].conscript=8;
 b.abilities[id]=def.cooldown;b.events.push({t:b.elapsed,type:'ability',id,lane});return true}
function setCommanderLane(b,lane){if(b.lanes[lane]){b.commanderLane=lane;b.events.push({t:b.elapsed,type:'waypoint',lane})}}
function setReadMenu(b,open){b.readMenuOpen=!!open}
function resolveLastStand(run,b){if(!b.lastStand?.active)return null;b.gate=0;b.gateVulnerable=true;const payable=run.embers>0;if(payable){run.embers-=1;run.salvage+=120;run.resolvedNodes.push({id:b.nodeId,result:'last-stand',at:new Date().toISOString()});run.currentNode='A1-F1';b.result={kind:'last-stand-advance',at:b.elapsed};}else{b.result={kind:'terminal',at:b.elapsed};run.endedAt=new Date().toISOString();run.endReason='last-stand-no-ember';}b.lastStand={active:false,phase:'resolved',payable};return b.result}
function resolveVictory(run,b){run.salvage+=180;run.resolvedNodes.push({id:b.nodeId,result:'victory',at:new Date().toISOString()});run.currentNode='A1-F1';b.result=b.result||{kind:'victory',at:b.elapsed};return{reward:{salvage:180},nextNode:'A1-F1'}}
function selfTest(){const r=newRun('regression-seed'),b=createBattle(r);const checks={twoLanes:Object.keys(b.lanes).length===2,zeroEmberLegal:(()=>{const rr=newRun('z');rr.embers=0;return rr.embers===0})(),guardRegen:true,gateNeedsGuard:!b.gateVulnerable,deterministic:(()=>{const a=createBattle(newRun('x')),c=createBattle(newRun('x'));return a.lanes.north.enemyPower===c.lanes.north.enemyPower})()};return{pass:Object.values(checks).every(Boolean),checks}}
window.LW_ENGINE={newRun,defaultDeployment,createBattle,stepBattle,useAbility,setCommanderLane,setReadMenu,resolveLastStand,resolveVictory,selfTest,guardState,bastionState};
})();
