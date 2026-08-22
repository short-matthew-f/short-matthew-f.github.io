(() => {
  'use strict';
  const BASE='../lane-warden-r02-v0.4.0/main.js';
  function patch(source,from,to,label,required=true){
    if(!source.includes(from)){
      if(required)throw new Error('R02-B runtime patch sentinel mismatch: '+label);
      return source;
    }
    return source.replace(from,to);
  }
  async function boot(){
    const res=await fetch(BASE,{cache:'no-store'});
    if(!res.ok)throw new Error('Could not load R-02 structural runtime: '+res.status);
    let source=await res.text();

    source=patch(source,"const speed=a.speed*(world.time<(a.slowUntil||0)?.0.55:1);","const speed=a.speed*(world.time<(a.slowUntil||0)?0.55:1);",'slow-state token');

    // Physical lane ownership follows actual junction travel rather than destination intent.
    source=patch(source,"lane:'north',hp:P.commanderHp","lane:'north',targetLane:'north',hp:P.commanderHp",'Commander target lane');
    source=patch(source,"if(d<=speed*dt+.02){entity.x=p.x;entity.y=p.y;entity.path.shift();if(!entity.path.length&&onArrive)onArrive();return;}","if(d<=speed*dt+.02){entity.x=p.x;entity.y=p.y;const reached=laneIds.find(l=>Math.abs(laneMeta[l].y-entity.y)<.1);if(reached)entity.lane=reached;entity.path.shift();if(!entity.path.length&&onArrive)onArrive();return;}",'physical lane at junction waypoint');
    source=patch(source,"world.commander.path=routeBetween(world.commander.x,world.commander.y,targetX,targetLane);world.commander.lane=targetLane;if(from!==targetLane)","world.commander.path=routeBetween(world.commander.x,world.commander.y,targetX,targetLane);world.commander.targetLane=targetLane;if(from!==targetLane)",'Commander order ownership');
    source=patch(source,"moveAlong(c,dt,5.2,()=>ev('commander-arrived',{lane:c.lane,x:+c.x.toFixed(1)}));","moveAlong(c,dt,5.2,()=>{c.lane=c.targetLane;ev('commander-arrived',{lane:c.lane,x:+c.x.toFixed(1)});});",'Commander arrival ownership');
    source=patch(source,"c.x=-47;c.y=laneMeta[laneId].y;c.lane=laneId;c.path=[];","c.x=-47;c.y=laneMeta[laneId].y;c.lane=laneId;c.targetLane=laneId;c.path=[];",'Waypoint target lane');
    source=patch(source,"c.x=-62;c.y=laneMeta.mid.y;c.lane='mid';c.path=[];","c.x=-62;c.y=laneMeta.mid.y;c.lane='mid';c.targetLane='mid';c.path=[];",'Commander reform target lane');
    source=patch(source,"world.rival.path=routeBetween(world.rival.x,world.rival.y,8,choice.lane);world.rival.lane=choice.lane;world.rival.nextDecision=","world.rival.path=routeBetween(world.rival.x,world.rival.y,8,choice.lane);world.rival.nextDecision=",'Rival order ownership');
    source=patch(source,"moveAlong(r,dt,P.rivalSpeed,()=>ev('rival-arrived',{lane:r.lane,x:+r.x.toFixed(1)}));","moveAlong(r,dt,P.rivalSpeed,()=>{r.lane=r.targetLane;ev('rival-arrived',{lane:r.lane,x:+r.x.toFixed(1)});});",'Rival arrival ownership');

    // Event identity is authoritative. Tower archetype gets its own key rather than
    // overwriting `tower-destroyed` in exported telemetry.
    source=patch(source,"currentRun.events.push({t:+world.time.toFixed(2),type,...detail});","currentRun.events.push({t:+world.time.toFixed(2),...detail,type});",'event identity ordering');
    source=patch(source,"ev('tower-destroyed',{lane:a.lane,slot:tower.slot,type:tower.type});","ev('tower-destroyed',{lane:a.lane,slot:tower.slot,towerType:tower.type});",'tower telemetry key');

    // R02-A made every Rival decision 'go where the Commander is not'. R02-B lowers
    // that term, values damaged Guard lines, and requires a meaningful score advantage
    // before abandoning the current lane. This preserves anticipation without ping-pong.
    const oldScore="function rivalScore(laneId){const lane=world.lanes[laneId],friendlies=world.actors.filter(a=>!a.dead&&a.team===1&&a.lane===laneId),front=friendlies.length?Math.max(...friendlies.map(a=>a.x)):-68;const absent=world.commander.incapacitated||world.commander.lane!==laneId?12:0;const breach=laneGuardBroken(lane)?18:0;const bastionDamage=(1-lane.bastion.hp/lane.bastion.max)*8;return front*.13+absent+breach+bastionDamage;}";
    const newScore="function rivalScore(laneId){const lane=world.lanes[laneId],friendlies=world.actors.filter(a=>!a.dead&&a.team===1&&a.lane===laneId),front=friendlies.length?Math.max(...friendlies.map(a=>a.x)):-68;const absent=world.commander.incapacitated||world.commander.lane!==laneId?P.rivalAbsenceWeight:0;const breach=laneGuardBroken(lane)?P.rivalBreachWeight:0;const bastionDamage=(1-lane.bastion.hp/lane.bastion.max)*P.rivalBastionDamageWeight;const gp=guardPct(lane);const guardDamage=(1-gp/100)*P.rivalGuardDamageWeight;return front*.13+absent+breach+bastionDamage+guardDamage;}";
    source=patch(source,oldScore,newScore,'Rival scoring');

    const oldChoice="let choice=scored[0];if(choice.lane===world.rival.lane&&scored[1]&&scored[1].score>choice.score-3)choice=scored[1];const lane=world.lanes[choice.lane];const reason=laneGuardBroken(lane)?'punishing the open breach':(world.commander.incapacitated||world.commander.lane!==choice.lane)?'exploiting your absence':'contesting your strongest visible pressure';";
    const newChoice="let choice=scored[0];const current=scored.find(s=>s.lane===world.rival.lane);if(current&&choice.lane!==current.lane&&choice.score<current.score+P.rivalHoldMargin)choice=current;const lane=world.lanes[choice.lane];const reason=laneGuardBroken(lane)?'punishing the open breach':lane.pressure==='above'?'contesting your winning pressure':(world.commander.incapacitated||world.commander.lane!==choice.lane)?'exploiting your absence':'holding valuable local pressure';";
    source=patch(source,oldChoice,newChoice,'Rival choice hysteresis');

    // Reform at an enemy anchor in the lane that currently matters most rather than
    // always returning to the middle. This makes the reform location itself macro-readable.
    const oldReform="r.incapacitated=false;r.hp=r.max;r.x=52;r.y=laneMeta.mid.y;r.lane='mid';r.targetLane='mid';r.path=[];r.nextDecision=world.time+5;ev('rival-reformed',{lane:'mid'});showRivalIntent('mid','reformed at the enemy anchor');";
    const newReform="const reformLane=laneIds.map(l=>({lane:l,score:rivalScore(l)})).sort((a,b)=>b.score-a.score)[0].lane;r.incapacitated=false;r.hp=r.max;r.x=52;r.y=laneMeta[reformLane].y;r.lane=reformLane;r.targetLane=reformLane;r.path=[];r.nextDecision=world.time+6;ev('rival-reformed',{lane:reformLane});showRivalIntent(reformLane,'reformed at the highest-value enemy anchor');";
    source=patch(source,oldReform,newReform,'Rival reform anchor');

    source=patch(source,"const RECOVERY_KEY='lane-warden:M1-0.4.0:R02-A:recovery:v1';","const RECOVERY_KEY='lane-warden:M1-0.4.1:R02-B:recovery:v1';",'recovery namespace');
    source=patch(source,"tuningStatus:'exploratory R-02 structural parameterization; not canonical encounter balance or formal acceptance evidence'","tuningStatus:'exploratory R02-B rotation/pressure revision; not canonical encounter balance or formal acceptance evidence'",'evidence label');

    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(new Error('R02-B runtime parse/boot failure'));document.body.appendChild(s);});
    URL.revokeObjectURL(url);
  }
  boot().catch(err=>{console.error(err);const fatal=document.getElementById('fatal');if(fatal){fatal.hidden=false;const h=fatal.querySelector('h1'),p=fatal.querySelector('p');if(h)h.textContent='R02-B boot failed';if(p)p.textContent=err.message;}});
})();
