(() => {
'use strict';
const E=window.LW_ENGINE,F=window.LW_FIELDWORKS;
if(!E||!F)return;
const BUILD='P2-0.19.0',NODE='A1-B3';
const PROFILE=Object.freeze({firstWarning:11,warning:7,surge:8,recovery:15,missedBastionHit:10,missedTowerHit:5,wardenGold:7,worksGold:4,missedMultiplier:1.38,worksMultiplier:1.10,wardenMultiplier:.92});
const original={createBattle:E.createBattle.bind(E),stepBattle:E.stepBattle.bind(E),selfTest:E.selfTest?.bind(E)};
const other=lane=>lane==='north'?'south':'north';
function wardenPresent(b,lane){const c=b.commander;return!!c&&!c.incapacitated&&!c.travel&&!c.move&&!c.siteTravel&&!c.atSite&&!c.work&&c.lane===lane}
function completedWorks(b,lane){return F.sites(b).filter(s=>s.lane===lane&&s.status==='complete').length}
function init(b){
  if(!b||b.nodeId!==NODE||b.switchback)return b;
  for(const lane of Object.values(b.lanes)){lane.guard=90;lane.guardPrev=90;lane.bastion=88;lane.status=E.bastionState(lane.bastion);lane.regen*=.82;lane.baseEnemyPower*=.94}
  b.lanes.north.front=Math.min(.92,b.lanes.north.front+.045);b.lanes.south.front=Math.max(.08,b.lanes.south.front-.025);b.gold=Math.max(b.gold,58);b.reclamation.trigger=235;b.rewardAffinity=['upgrade','capacity'];b.encounterName='Broken Switchback';
  b.switchback={version:1,phase:'recovery',timer:PROFILE.firstWarning,target:null,nextTarget:'south',lastTarget:null,protected:false,source:null,intercepts:0,misses:0,sequence:0,message:'The switchback is quiet. Choose whether to push or build.'};
  b.events.push({t:b.elapsed||0,type:'encounter-profile',id:'broken-switchback',build:BUILD});return b;
}
function beginWarning(b){const s=b.switchback;s.phase='warning';s.target=s.nextTarget;s.lastTarget=s.target;s.timer=PROFILE.warning;s.sequence++;s.protected=false;s.source=null;s.message=`${s.target.toUpperCase()} FALL LINE — Presence or completed works can brace it.`;b.events.push({t:b.elapsed,type:'switchback-warning',lane:s.target,seconds:PROFILE.warning,sequence:s.sequence})}
function beginSurge(b){
  const s=b.switchback,lane=b.lanes[s.target],warden=wardenPresent(b,s.target),works=completedWorks(b,s.target);s.phase='surge';s.timer=PROFILE.surge;s.protected=warden||works>0;s.source=warden?'warden':works>0?'fieldworks':null;
  if(s.protected){s.intercepts++;const gain=warden?PROFILE.wardenGold:PROFILE.worksGold;b.gold=Math.min(99,b.gold+gain);lane.front=Math.min(.92,lane.front+(warden ? .018 : .010));s.message=warden?`${s.target.toUpperCase()} BRACED — the Warden turns the collapse into tempo.`:`${s.target.toUpperCase()} WORKS HOLD — infrastructure absorbs the collapse.`;b.events.push({t:b.elapsed,type:'switchback-braced',lane:s.target,source:s.source,gold:gain,sequence:s.sequence})}
  else{s.misses++;lane.bastion=Math.max(0,lane.bastion-PROFILE.missedBastionHit);lane.status=E.bastionState(lane.bastion);if(lane.tower?.hp>0)lane.tower.hp=Math.max(0,lane.tower.hp-PROFILE.missedTowerHit);s.message=`${s.target.toUpperCase()} EXPOSED — the switchback is collapsing into the Bastion.`;b.events.push({t:b.elapsed,type:'switchback-missed',lane:s.target,bastionDamage:PROFILE.missedBastionHit,sequence:s.sequence})}
}
function beginRecovery(b){const s=b.switchback;s.phase='recovery';s.timer=PROFILE.recovery;s.nextTarget=other(s.lastTarget||'north');s.target=null;s.protected=false;s.source=null;s.message=`The fall line shifts. Next collapse: ${s.nextTarget.toUpperCase()}.`;b.events.push({t:b.elapsed,type:'switchback-recovery',nextLane:s.nextTarget,sequence:s.sequence})}
function advance(b,dt){const s=b.switchback;if(!s||b.result||b.lastStand?.active)return;s.timer=Math.max(0,s.timer-dt);if(s.timer>0)return;if(s.phase==='recovery')beginWarning(b);else if(s.phase==='warning')beginSurge(b);else beginRecovery(b)}
E.createBattle=(run,deployment)=>init(original.createBattle(run,deployment));
E.stepBattle=(b,dt)=>{if(b?.nodeId===NODE)init(b);const before=b?.elapsed||0,s=b?.switchback,lane=s?.phase==='surge'&&s.lastTarget?b.lanes[s.lastTarget]:null;let base=null;if(lane){base=lane.baseEnemyPower;lane.baseEnemyPower=base*(s.source==='warden'?PROFILE.wardenMultiplier:s.source==='fieldworks'?PROFILE.worksMultiplier:PROFILE.missedMultiplier)}const out=original.stepBattle(b,dt);if(lane)lane.baseEnemyPower=base;if(b?.nodeId===NODE)advance(b,Math.max(0,(b.elapsed||0)-before));return out};
E.selfTest=()=>{const base=original.selfTest?original.selfTest():{pass:true,checks:{}},run=E.newRun('switchback-regression');run.currentNode=NODE;const b=E.createBattle(run,E.defaultDeployment()),s=b.switchback;s.phase='warning';s.target='north';s.lastTarget='north';s.timer=.001;b.commander.lane='north';b.commander.travel=null;b.commander.move=null;const before=b.lanes.north.bastion;E.stepBattle(b,.01);const warden=s.phase==='surge'&&s.source==='warden'&&b.lanes.north.bastion===before;s.phase='warning';s.target='south';s.lastTarget='south';s.timer=.001;b.commander.lane='north';const beforeMiss=b.lanes.south.bastion;E.stepBattle(b,.01);const miss=s.source===null&&b.lanes.south.bastion<beforeMiss;const site=F.sites(b).find(x=>x.lane==='south');site.kind='relay';site.status='complete';s.phase='warning';s.target='south';s.lastTarget='south';s.timer=.001;const beforeWorks=b.lanes.south.bastion;E.stepBattle(b,.01);const works=s.source==='fieldworks'&&b.lanes.south.bastion===beforeWorks;const checks={switchbackProfile:b.encounterName==='Broken Switchback'&&b.gold>=58,switchbackWardenBrace:warden,switchbackMiss:miss,switchbackWorksBrace:works};return{pass:base.pass&&Object.values(checks).every(Boolean),checks:{...base.checks,...checks}}};
window.LW_SWITCHBACK={build:BUILD,nodeId:NODE,profile:PROFILE,init,wardenPresent,completedWorks};
})();
