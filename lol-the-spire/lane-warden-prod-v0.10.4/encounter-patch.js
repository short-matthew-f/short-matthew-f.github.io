(() => {
'use strict';
const E=window.LW_ENGINE;
if(!E)return;
const BUILD='P2-0.14.0',NODE='A1-B2';
const original={createBattle:E.createBattle,stepBattle:E.stepBattle,selfTest:E.selfTest};
const PROFILE=Object.freeze({
  quietEnemyMultiplier:.86,
  guardStart:82,
  bastionStart:84,
  reclamationTrigger:225,
  firstWarningDelay:9,
  telegraph:8,
  surge:8,
  recovery:9,
  missedSurgeMultiplier:1.55,
  interceptedSurgeMultiplier:1.12,
  missedBastionHit:11,
  missedTowerHit:4,
  interceptFrontShove:.020,
  interceptGold:8
});
function present(b,lane){const c=b.commander;return!!c&&!c.incapacitated&&!c.travel&&c.lane===lane}
function other(lane){return lane==='north'?'south':'north'}
function initCauseway(b){
  if(!b||b.nodeId!==NODE||b.causeway)return b;
  for(const lane of Object.values(b.lanes)){
    lane.baseEnemyPower*=PROFILE.quietEnemyMultiplier;
    lane.guard=PROFILE.guardStart;
    lane.guardPrev=PROFILE.guardStart;
    lane.bastion=PROFILE.bastionStart;
    lane.status=E.bastionState(lane.bastion);
  }
  b.lanes.north.front=Math.min(.92,b.lanes.north.front+.025);
  b.lanes.south.front=Math.max(.08,b.lanes.south.front-.005);
  b.reclamation.trigger=PROFILE.reclamationTrigger;
  b.rewardAffinity=['commander','logistics'];
  b.encounterName='Split Causeway';
  b.causeway={
    version:1,
    phase:'recovery',
    timer:PROFILE.firstWarningDelay,
    target:null,
    nextTarget:'south',
    lastTarget:null,
    intercepted:false,
    intercepts:0,
    misses:0,
    sequence:0,
    message:'Enemy horns are quiet. Watch both causeways.'
  };
  b.events.push({t:b.elapsed||0,type:'encounter-profile',id:'split-causeway-rotation',build:BUILD});
  return b;
}
function beginTelegraph(b){
  const c=b.causeway;c.phase='telegraph';c.target=c.nextTarget;c.lastTarget=c.target;c.timer=PROFILE.telegraph;c.intercepted=false;c.sequence++;
  c.message=`${c.target.toUpperCase()} RAID INCOMING — rotate before impact.`;
  b.events.push({t:b.elapsed,type:'causeway-telegraph',lane:c.target,seconds:PROFILE.telegraph,sequence:c.sequence});
}
function beginSurge(b){
  const c=b.causeway,lane=b.lanes[c.target],braced=present(b,c.target);c.phase='surge';c.timer=PROFILE.surge;c.intercepted=braced;
  if(braced){
    c.intercepts++;lane.front=Math.min(.92,lane.front+PROFILE.interceptFrontShove);b.gold=Math.min(99,b.gold+PROFILE.interceptGold);b.readReserve=Math.min(4,b.readReserve+.5);
    c.message=`${c.target.toUpperCase()} INTERCEPTED — the raid loses momentum.`;
    b.events.push({t:b.elapsed,type:'causeway-intercept',lane:c.target,gold:PROFILE.interceptGold,sequence:c.sequence});
  }else{
    c.misses++;lane.bastion=Math.max(0,lane.bastion-PROFILE.missedBastionHit);lane.status=E.bastionState(lane.bastion);if(lane.tower?.hp>0)lane.tower.hp=Math.max(0,lane.tower.hp-PROFILE.missedTowerHit);
    c.message=`${c.target.toUpperCase()} BREACHED — raid pressure is surging.`;
    b.events.push({t:b.elapsed,type:'causeway-missed',lane:c.target,bastionDamage:PROFILE.missedBastionHit,sequence:c.sequence});
  }
}
function beginRecovery(b){
  const c=b.causeway;c.phase='recovery';c.timer=PROFILE.recovery;c.nextTarget=other(c.target||c.lastTarget||'north');c.target=null;c.intercepted=false;
  c.message=`Raid broken. Next signal: ${c.nextTarget.toUpperCase()}.`;
  b.events.push({t:b.elapsed,type:'causeway-recovery',nextLane:c.nextTarget,sequence:c.sequence});
}
function advanceCauseway(b,dt){
  const c=b.causeway;if(!c||b.result||b.lastStand?.active)return;
  c.timer=Math.max(0,c.timer-dt);
  if(c.timer>0)return;
  if(c.phase==='recovery')beginTelegraph(b);else if(c.phase==='telegraph')beginSurge(b);else beginRecovery(b);
}
E.createBattle=(run,deployment)=>initCauseway(original.createBattle(run,deployment));
E.stepBattle=(b,dt)=>{
  if(b?.nodeId===NODE)initCauseway(b);
  const c=b?.causeway,target=c?.phase==='surge'?c.target:null,lane=target&&b.lanes?.[target];
  let base=null;
  if(lane){base=lane.baseEnemyPower;lane.baseEnemyPower=base*(c.intercepted?PROFILE.interceptedSurgeMultiplier:PROFILE.missedSurgeMultiplier)}
  const out=original.stepBattle(b,dt);
  if(lane)lane.baseEnemyPower=base;
  if(b?.nodeId===NODE)advanceCauseway(b,dt);
  return out;
};
E.causewayState=b=>b?.nodeId===NODE?b.causeway:null;
E.selfTest=()=>{
  const base=original.selfTest(),run=E.newRun('causeway-regression');run.currentNode=NODE;const b=E.createBattle(run,E.defaultDeployment()),c=b.causeway;
  c.phase='telegraph';c.target='north';c.nextTarget='north';c.timer=.001;b.commander.lane='north';b.commander.travel=null;b.commander.incapacitated=false;const before=b.lanes.north.bastion;E.stepBattle(b,.01);
  const intercepted=c.phase==='surge'&&c.intercepted&&b.lanes.north.bastion===before;
  c.phase='telegraph';c.target='south';c.timer=.001;b.commander.lane='north';const beforeMiss=b.lanes.south.bastion;E.stepBattle(b,.01);
  const missed=c.phase==='surge'&&!c.intercepted&&b.lanes.south.bastion<beforeMiss;
  const checks={causewayProfile:b.nodeId===NODE&&b.encounterName==='Split Causeway',causewayTelegraph:PROFILE.telegraph>=(window.LW_DATA?.commander?.walkTime||7),causewayIntercept:intercepted,causewayMiss:missed};
  return{pass:base.pass&&Object.values(checks).every(Boolean),checks:{...base.checks,...checks}};
};
window.LW_ENCOUNTERS={build:BUILD,splitCauseway:{nodeId:NODE,profile:PROFILE,init:initCauseway}};
})();
