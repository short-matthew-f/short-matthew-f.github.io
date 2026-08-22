(() => {
  'use strict';
  const BASE='../lane-warden-r02-v0.4.0/main.js';
  function patch(source,from,to,label,required=true){
    if(!source.includes(from)){
      if(required)throw new Error('R02-C runtime patch sentinel mismatch: '+label);
      return source;
    }
    return source.replace(from,to);
  }
  async function boot(){
    const res=await fetch(BASE,{cache:'no-store'});
    if(!res.ok)throw new Error('Could not load R-02 structural runtime: '+res.status);
    let source=await res.text();

    // Carry forward the validated R02-B structural fixes.
    source=patch(source,"const speed=a.speed*(world.time<(a.slowUntil||0)?.0.55:1);","const speed=a.speed*(world.time<(a.slowUntil||0)?0.55:1);",'slow-state token');
    source=patch(source,"lane:'north',hp:P.commanderHp","lane:'north',targetLane:'north',reformTargetLane:'north',reformLocked:false,hp:P.commanderHp",'Commander reform state');
    source=patch(source,"lane:'mid',targetLane:'mid',hp:P.rivalHp","lane:'mid',targetLane:'mid',reformTargetLane:'mid',reformLocked:false,nextReformEval:0,hp:P.rivalHp",'Rival reform state');
    source=patch(source,"if(d<=speed*dt+.02){entity.x=p.x;entity.y=p.y;entity.path.shift();if(!entity.path.length&&onArrive)onArrive();return;}","if(d<=speed*dt+.02){entity.x=p.x;entity.y=p.y;const reached=laneIds.find(l=>Math.abs(laneMeta[l].y-entity.y)<.1);if(reached)entity.lane=reached;entity.path.shift();if(!entity.path.length&&onArrive)onArrive();return;}",'physical lane at junction waypoint');
    source=patch(source,"world.commander.path=routeBetween(world.commander.x,world.commander.y,targetX,targetLane);world.commander.lane=targetLane;if(from!==targetLane)","world.commander.path=routeBetween(world.commander.x,world.commander.y,targetX,targetLane);world.commander.targetLane=targetLane;if(from!==targetLane)",'Commander order ownership');
    source=patch(source,"moveAlong(c,dt,5.2,()=>ev('commander-arrived',{lane:c.lane,x:+c.x.toFixed(1)}));","moveAlong(c,dt,5.2,()=>{c.lane=c.targetLane;ev('commander-arrived',{lane:c.lane,x:+c.x.toFixed(1)});});",'Commander arrival ownership');
    source=patch(source,"c.x=-47;c.y=laneMeta[laneId].y;c.lane=laneId;c.path=[];","c.x=-47;c.y=laneMeta[laneId].y;c.lane=laneId;c.targetLane=laneId;c.path=[];",'Waypoint target lane');
    source=patch(source,"world.rival.path=routeBetween(world.rival.x,world.rival.y,8,choice.lane);world.rival.lane=choice.lane;world.rival.nextDecision=","world.rival.path=routeBetween(world.rival.x,world.rival.y,8,choice.lane);world.rival.nextDecision=",'Rival order ownership');
    source=patch(source,"moveAlong(r,dt,P.rivalSpeed,()=>ev('rival-arrived',{lane:r.lane,x:+r.x.toFixed(1)}));","moveAlong(r,dt,P.rivalSpeed,()=>{r.lane=r.targetLane;ev('rival-arrived',{lane:r.lane,x:+r.x.toFixed(1)});});",'Rival arrival ownership');
    source=patch(source,"currentRun.events.push({t:+world.time.toFixed(2),type,...detail});","currentRun.events.push({...detail,t:+world.time.toFixed(2),type});",'event identity ordering');
    source=patch(source,"ev('tower-destroyed',{lane:a.lane,slot:tower.slot,type:tower.type});","ev('tower-destroyed',{lane:a.lane,slot:tower.slot,towerType:tower.type});",'tower telemetry key');

    const oldScore="function rivalScore(laneId){const lane=world.lanes[laneId],friendlies=world.actors.filter(a=>!a.dead&&a.team===1&&a.lane===laneId),front=friendlies.length?Math.max(...friendlies.map(a=>a.x)):-68;const absent=world.commander.incapacitated||world.commander.lane!==laneId?12:0;const breach=laneGuardBroken(lane)?18:0;const bastionDamage=(1-lane.bastion.hp/lane.bastion.max)*8;return front*.13+absent+breach+bastionDamage;}";
    const newScore="function rivalScore(laneId){const lane=world.lanes[laneId],friendlies=world.actors.filter(a=>!a.dead&&a.team===1&&a.lane===laneId),front=friendlies.length?Math.max(...friendlies.map(a=>a.x)):-68;const absent=world.commander.incapacitated||world.commander.lane!==laneId?P.rivalAbsenceWeight:0;const breach=laneGuardBroken(lane)?P.rivalBreachWeight:0;const bastionDamage=(1-lane.bastion.hp/lane.bastion.max)*P.rivalBastionDamageWeight;const gp=guardPct(lane);const guardDamage=(1-gp/100)*P.rivalGuardDamageWeight;return front*.13+absent+breach+bastionDamage+guardDamage;}";
    source=patch(source,oldScore,newScore,'Rival scoring');

    const oldChoice="let choice=scored[0];if(choice.lane===world.rival.lane&&scored[1]&&scored[1].score>choice.score-3)choice=scored[1];const lane=world.lanes[choice.lane];const reason=laneGuardBroken(lane)?'punishing the open breach':(world.commander.incapacitated||world.commander.lane!==choice.lane)?'exploiting your absence':'contesting your strongest visible pressure';";
    const newChoice="let choice=scored[0];const current=scored.find(s=>s.lane===world.rival.lane);if(current&&choice.lane!==current.lane&&choice.score<current.score+P.rivalHoldMargin)choice=current;const lane=world.lanes[choice.lane];const reason=laneGuardBroken(lane)?'punishing the open breach':lane.pressure==='above'?'contesting your winning pressure':(world.commander.incapacitated||world.commander.lane!==choice.lane)?'exploiting your absence':'holding valuable local pressure';";
    source=patch(source,oldChoice,newChoice,'Rival choice hysteresis');

    // REFORM-001 helpers. Player chooses manually; Rival re-evaluates safe anchors until lock.
    source=patch(source,
      "function damageCommander(amount){const c=world.commander;if(c.incapacitated)return;c.hp-=amount;if(c.hp<=0){c.hp=0;c.incapacitated=true;c.reformAt=world.time+P.reformSeconds;c.path=[];currentRun.metrics.commanderIncapacitations++;ev('commander-incapacitated',{lane:c.lane,reformAt:+c.reformAt.toFixed(2)});attention('COMMANDER INCAPACITATED','Presence and abilities are offline until reform.',c.lane,'critical');}}",
      "function selectPlayerReform(laneId){const c=world.commander;if(!c.incapacitated)return false;const remaining=c.reformAt-world.time;if(c.reformLocked||remaining<=P.reformLockSeconds){attention('REFORM ANCHOR LOCKED',`${c.reformTargetLane.toUpperCase()} · ${Math.max(0,remaining).toFixed(1)}s`,c.reformTargetLane,'warning');return false;}const from=c.reformTargetLane;c.reformTargetLane=laneId;ev('commander-reform-target',{from,to:laneId,remaining:+remaining.toFixed(2)});attention('REFORM ANCHOR SELECTED',`${laneId.toUpperCase()} · changeable until ${P.reformLockSeconds}s remain`,laneId,'warning');return true;}\n  function damageCommander(amount){const c=world.commander;if(c.incapacitated)return;c.hp-=amount;if(c.hp<=0){c.hp=0;c.incapacitated=true;c.reformAt=world.time+P.reformSeconds;c.reformTargetLane=c.lane;c.reformLocked=false;c.path=[];currentRun.metrics.commanderIncapacitations++;ev('commander-incapacitated',{lane:c.lane,reformAt:+c.reformAt.toFixed(2),reformTargetLane:c.reformTargetLane});attention('COMMANDER INCAPACITATED',`Tap a lane to choose reform anchor · ${P.reformSeconds}s`,c.lane,'critical');}}",
      'player reform selection');

    source=patch(source,
      "function tickCommander(dt){const c=world.commander;if(c.incapacitated){if(world.time>=c.reformAt){c.incapacitated=false;c.hp=c.max;c.x=-62;c.y=laneMeta.mid.y;c.lane='mid';c.path=[];ev('commander-reformed',{lane:'mid'});}return;}",
      "function tickCommander(dt){const c=world.commander;if(c.incapacitated){const remaining=c.reformAt-world.time;if(!c.reformLocked&&remaining<=P.reformLockSeconds){c.reformLocked=true;ev('commander-reform-locked',{lane:c.reformTargetLane,remaining:+Math.max(0,remaining).toFixed(2)});attention('REFORM LOCKED',`${c.reformTargetLane.toUpperCase()} · arriving in ${Math.max(0,remaining).toFixed(1)}s`,c.reformTargetLane,'warning');}if(world.time>=c.reformAt){const lane=c.reformTargetLane||c.lane;c.incapacitated=false;c.reformLocked=false;c.hp=c.max;c.x=-62;c.y=laneMeta[lane].y;c.lane=lane;c.targetLane=lane;c.path=[];ev('commander-reformed',{lane});}return;}",
      'player reform lifecycle');

    source=patch(source,
      "function incapacitateRival(){const r=world.rival;if(r.incapacitated)return;r.hp=0;r.incapacitated=true;r.path=[];r.reformAt=world.time+P.rivalReformSeconds;currentRun.metrics.rivalIncapacitations++;ev('rival-incapacitated',{lane:r.lane,reformAt:+r.reformAt.toFixed(2),reward:'macro-window-only'});showRivalIntent(r.lane,'incapacitated — temporary macro window');}",
      "function rivalAnchorThreat(laneId){let risk=world.actors.filter(a=>!a.dead&&a.team===1&&a.lane===laneId&&a.x>=P.rivalReformCampX).length*P.rivalReformCampActorPenalty;const c=world.commander;if(!c.incapacitated&&c.lane===laneId&&c.x>=P.rivalReformCampX)risk+=P.rivalReformCommanderPenalty;return risk;}\n  function chooseRivalReformLane(){return laneIds.map(l=>({lane:l,score:rivalScore(l)-rivalAnchorThreat(l)})).sort((a,b)=>b.score-a.score)[0].lane;}\n  function incapacitateRival(){const r=world.rival;if(r.incapacitated)return;r.hp=0;r.incapacitated=true;r.path=[];r.reformAt=world.time+P.rivalReformSeconds;r.reformTargetLane=chooseRivalReformLane();r.reformLocked=false;r.nextReformEval=world.time+P.rivalReformRecheckSeconds;currentRun.metrics.rivalIncapacitations++;ev('rival-incapacitated',{lane:r.lane,reformAt:+r.reformAt.toFixed(2),reformTargetLane:r.reformTargetLane,reward:'macro-window-only'});showRivalIntent(r.lane,'incapacitated — choosing reform anchor');}",
      'Rival reform selection');

    source=patch(source,
      "function tickRival(dt){const r=world.rival;if(r.incapacitated){if(world.time>=r.reformAt){r.incapacitated=false;r.hp=r.max;r.x=52;r.y=laneMeta.mid.y;r.lane='mid';r.targetLane='mid';r.path=[];r.nextDecision=world.time+5;ev('rival-reformed',{lane:'mid'});showRivalIntent('mid','reformed at the enemy anchor');}return;}",
      "function tickRival(dt){const r=world.rival;if(r.incapacitated){const remaining=r.reformAt-world.time;if(!r.reformLocked&&remaining>P.reformLockSeconds&&world.time>=r.nextReformEval){const next=chooseRivalReformLane();if(next!==r.reformTargetLane){const from=r.reformTargetLane;r.reformTargetLane=next;ev('rival-reform-retarget',{from,to:next,remaining:+remaining.toFixed(2),campRisk:Object.fromEntries(laneIds.map(l=>[l,rivalAnchorThreat(l)]))});}r.nextReformEval=world.time+P.rivalReformRecheckSeconds;}if(!r.reformLocked&&remaining<=P.reformLockSeconds){r.reformLocked=true;ev('rival-reform-locked',{lane:r.reformTargetLane,remaining:+Math.max(0,remaining).toFixed(2)});showRivalIntent(r.reformTargetLane,`REFORM LOCKED · ${Math.max(0,remaining).toFixed(1)}s`);}if(world.time>=r.reformAt){const lane=r.reformTargetLane||r.lane;r.incapacitated=false;r.reformLocked=false;r.hp=r.max;r.x=52;r.y=laneMeta[lane].y;r.lane=lane;r.targetLane=lane;r.path=[];r.nextDecision=world.time+6;ev('rival-reformed',{lane});showRivalIntent(lane,'reformed at selected enemy anchor');}return;}",
      'Rival reform lifecycle');

    // Lane strip becomes the player's reform selector while incapacitated.
    source=patch(source,
      "document.querySelectorAll('.lane[data-lane]').forEach(b=>b.onclick=()=>{const lane=b.dataset.lane;if(waypointTargeting){useWaypoint(lane);focusLane(lane,'waypoint-target');return;}focusLane(lane,'lane-strip');if(currentRun)currentRun.metrics.laneStripJumps[lane]++;});",
      "document.querySelectorAll('.lane[data-lane]').forEach(b=>b.onclick=()=>{const lane=b.dataset.lane;if(world.commander.incapacitated){selectPlayerReform(lane);return;}if(waypointTargeting){useWaypoint(lane);focusLane(lane,'waypoint-target');return;}focusLane(lane,'lane-strip');if(currentRun)currentRun.metrics.laneStripJumps[lane]++;});",
      'lane strip reform selection');

    // Reform status remains globally readable without taking the camera.
    source=patch(source,
      "if(phase==='battle')$('objectiveText').textContent=world.gate.vulnerable?'One breach is open — finish or rotate':'Read Rival intent, Guard thresholds, and Bastion clocks';",
      "if(phase==='battle'){const c=world.commander;if(c.incapacitated){const remaining=Math.max(0,c.reformAt-world.time);$('objectiveText').textContent=c.reformLocked?`REFORM LOCKED → ${c.reformTargetLane.toUpperCase()} · ${remaining.toFixed(1)}s`:`REFORMING · tap a lane for anchor · ${remaining.toFixed(1)}s`;}else $('objectiveText').textContent=world.gate.vulnerable?'One breach is open — finish or rotate':'Read Rival intent, Guard thresholds, and Bastion clocks';}",
      'objective reform status');
    source=patch(source,
      "for(const id of laneIds)updateLaneUI(id);",
      "for(const id of laneIds)updateLaneUI(id);document.querySelectorAll('.lane[data-lane]').forEach(n=>n.classList.toggle('reform-target',world.commander.incapacitated&&n.dataset.lane===world.commander.reformTargetLane));",
      'reform target marker');
    source=patch(source,
      "$('rivalIntent').hidden=phase!=='battle';if(phase==='battle'){const b=$('rivalIntent').querySelector('b');b.textContent=world.rival.incapacitated?'RIVAL DOWN':`RIVAL → ${world.rival.targetLane.toUpperCase()}`;$('rivalIntentReason').textContent=world.rival.incapacitated?`${Math.max(0,world.rival.reformAt-world.time).toFixed(0)}s to reform`:world.rival.intentReason;}",
      "$('rivalIntent').hidden=phase!=='battle';if(phase==='battle'){const r=world.rival,b=$('rivalIntent').querySelector('b');if(r.incapacitated){const remaining=Math.max(0,r.reformAt-world.time);b.textContent=r.reformLocked?`RIVAL REFORM → ${r.reformTargetLane.toUpperCase()}`:'RIVAL DOWN';$('rivalIntentReason').textContent=r.reformLocked?`${remaining.toFixed(1)}s · anchor locked`:`${remaining.toFixed(0)}s · choosing anchor`;}else{b.textContent=`RIVAL → ${r.targetLane.toUpperCase()}`;$('rivalIntentReason').textContent=r.intentReason;}}",
      'Rival reform UI');

    source=patch(source,"const RECOVERY_KEY='lane-warden:M1-0.4.0:R02-A:recovery:v1';","const RECOVERY_KEY='lane-warden:M1-0.4.2:R02-C:recovery:v1';",'recovery namespace');
    source=patch(source,"tuningStatus:'exploratory R-02 structural parameterization; not canonical encounter balance or formal acceptance evidence'","tuningStatus:'exploratory R02-C REFORM-001 isolation over frozen R02-B combat pacing; not formal acceptance evidence'",'evidence label');
    source=patch(source,"note:'R02-A structural parameterization'","note:'R02-C REFORM-001 over frozen R02-B pressure'",'battle-start note');

    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(new Error('R02-C runtime parse/boot failure'));document.body.appendChild(s);});
    URL.revokeObjectURL(url);
  }
  boot().catch(err=>{console.error(err);const fatal=document.getElementById('fatal');if(fatal){fatal.hidden=false;const h=fatal.querySelector('h1'),p=fatal.querySelector('p');if(h)h.textContent='R02-C boot failed';if(p)p.textContent=err.message;}});
})();
