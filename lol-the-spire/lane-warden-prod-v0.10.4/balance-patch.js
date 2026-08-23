(() => {
'use strict';
const BUILD='P1-0.12.0';
const E=window.LW_ENGINE;
if(!E)return;
const original={
  createBattle:E.createBattle,
  stepBattle:E.stepBattle,
  useAbility:E.useAbility,
  setCommanderLane:E.setCommanderLane,
  purchaseStructure:E.purchaseStructure,
  selfTest:E.selfTest
};
const PROFILE=Object.freeze({allyPower:1.05,enemyPower:.90,guardRegen:.60,guardStart:90,frontAdvance:.03,reclamationTrigger:210,sunderFrontBonus:.015,sunderGuardBonus:6,sunderGateBonus:4});
function expose(b){window.LW_ACTIVE_BATTLE=b;return b}
function markProfile(b){
  if(!b||b.balanceProfile)return b;
  b.balanceProfile=BUILD;
  b.reclamation.trigger=PROFILE.reclamationTrigger;
  for(const lane of Object.values(b.lanes)){
    lane.allyBase*=PROFILE.allyPower;
    lane.baseEnemyPower*=PROFILE.enemyPower;
    lane.regen*=PROFILE.guardRegen;
    lane.front=Math.min(.92,lane.front+PROFILE.frontAdvance);
    lane.guard=PROFILE.guardStart;
    lane.guardPrev=PROFILE.guardStart;
  }
  b.events.push({t:b.elapsed||0,type:'balance-profile',build:BUILD});
  return b;
}
E.createBattle=(run,deployment)=>expose(markProfile(original.createBattle(run,deployment)));
E.stepBattle=(b,dt)=>expose(original.stepBattle(b,dt));
E.setCommanderLane=(b,lane)=>{expose(b);return original.setCommanderLane(b,lane)};
E.purchaseStructure=(b,lane,kind)=>{expose(b);return original.purchaseStructure(b,lane,kind)};
E.useAbility=(b,id,targetLane)=>{
  expose(b);
  if(id==='conscript'&&b.commander?.travel){b.events?.push({t:b.elapsed,type:'ability-blocked',id,reason:'commander-moving'});return false}
  const laneId=targetLane||b.commander?.lane;
  const lane=laneId?b.lanes?.[laneId]:null;
  const before=lane?{front:lane.front,guard:lane.guard,gate:b.gate,gateVulnerable:b.gateVulnerabilityLatched}:null;
  const ok=original.useAbility(b,id,targetLane);
  if(!ok)return false;
  if(id==='sunder'&&lane&&before){
    if(before.guard<=0&&before.gateVulnerable&&before.front>.62){b.gate=Math.max(0,b.gate-PROFILE.sunderGateBonus)}
    else if(before.guard>0&&before.front>.62){
      const preExtra=lane.guard;
      lane.guard=Math.max(0,lane.guard-PROFILE.sunderGuardBonus);
      if(preExtra>0&&lane.guard<=0&&!lane.guardDestroyedEver){
        lane.guardDestroyedEver=true;b.gateVulnerabilityLatched=true;b.gateVulnerable=true;
        b.events.push({t:b.elapsed,type:'guard-broken',lane:laneId,source:'sunder-balance-bonus'});
      }
    }else lane.front=Math.min(.92,lane.front+PROFILE.sunderFrontBonus);
  }
  expose(b);return true;
};
E.abilityAvailability=(b,id)=>{
  if(!b||b.result||b.lastStand?.active)return{usable:false,reason:'ENDED'};
  if(b.commander?.incapacitated)return{usable:false,reason:'REFORM'};
  const cd=b.abilities?.[id]||0;if(cd>0)return{usable:false,reason:'COOLDOWN',seconds:cd};
  if(id==='conscript'){
    if(b.commander?.travel)return{usable:false,reason:'MOVING'};
    const lane=b.commander?.lane&&b.lanes?.[b.commander.lane];
    if(!lane)return{usable:false,reason:'NO LANE'};
    if(lane.unitCost<=0)return{usable:false,reason:'NO UNITS'};
  }
  return{usable:true,reason:'READY'};
};
E.selfTest=()=>{
  const base=original.selfTest();
  const r=E.newRun('p1-0.12.0-regression'),d=E.defaultDeployment(),b=E.createBattle(r,d);
  const tune=b.lanes.north;
  const before=tune.reinforcementPulses;b.commander.travel={from:'north',to:'south',total:7,remaining:3};b.abilities.conscript=0;
  const movingBlocked=E.useAbility(b,'conscript','north')===false&&tune.reinforcementPulses===before;
  const checks={profile:b.balanceProfile===BUILD,reclamation:b.reclamation.trigger===210,guardStart:tune.guard===90,movingConscriptBlocked:movingBlocked};
  return{pass:base.pass&&Object.values(checks).every(Boolean),checks:{...base.checks,...checks}};
};
window.LW_BALANCE_PROFILE={build:BUILD,profile:PROFILE};
})();
