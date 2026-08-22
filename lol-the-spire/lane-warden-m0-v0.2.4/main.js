(() => {
  'use strict';
  const CFG = window.LW_R01_CONFIG;
  const R = window.LW_RULES;
  if (!CFG || !R) return;
  const BUILD = CFG.BUILD;
  const FIXTURE = CFG.FIXTURE;
  const PARAM_REV = CFG.PARAM_REV;
  const canvas = document.getElementById('battlefield');
  const fatal = document.getElementById('fatal');
  const rotate = document.getElementById('rotateInterstitial');
  const gl = canvas.getContext('webgl2', { alpha:false, antialias:true, depth:true, powerPreference:'high-performance' });
  if (!gl) { fatal.hidden = false; return; }

  window.__LW_BUILD__ = BUILD;
  const $ = id => document.getElementById(id);
  const lanesMeta = { north:{ id:'north', y:11, index:0 }, south:{ id:'south', y:-11, index:1 } };
  const laneIds = ['north','south'];

  // ---- WebGL cube renderer -------------------------------------------------
  const vs = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPosition;
    layout(location=1) in vec3 aNormal;
    uniform vec3 uPos; uniform vec3 uSize; uniform vec2 uCamera; uniform vec2 uHalfView;
    uniform vec3 uColor; uniform float uTilt;
    out vec3 vColor; out float vLight;
    void main(){
      vec3 world=aPosition*uSize+uPos; vec3 p=world-vec3(uCamera,0.0);
      float c=cos(uTilt), s=sin(uTilt); float sy=p.y*c+p.z*s; float depth=p.y*s-p.z*c;
      gl_Position=vec4(p.x/uHalfView.x,sy/uHalfView.y,depth/120.0,1.0);
      vec3 ld=normalize(vec3(-.45,-.35,1.0)); vLight=.62+.38*max(dot(normalize(aNormal),ld),0.0); vColor=uColor;
    }`;
  const fs = `#version 300 es
    precision highp float; in vec3 vColor; in float vLight; out vec4 outColor;
    void main(){outColor=vec4(vColor*vLight,1.0);}`;
  function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const P=[],N=[];const faces=[[[0,0,1],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],[[0,0,-1],[-.5,.5,-.5],[.5,.5,-.5],[.5,-.5,-.5],[-.5,-.5,-.5]],[[0,1,0],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],[[0,-1,0],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]],[[1,0,0],[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],[[-1,0,0],[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]];
  for(const [n,a,b,c,d] of faces)for(const v of [a,b,c,a,c,d]){P.push(...v);N.push(...n)}
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const pbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(P),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);const nbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,nbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(N),gl.STATIC_DRAW);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);
  const U={pos:gl.getUniformLocation(program,'uPos'),size:gl.getUniformLocation(program,'uSize'),camera:gl.getUniformLocation(program,'uCamera'),halfView:gl.getUniformLocation(program,'uHalfView'),color:gl.getUniformLocation(program,'uColor'),tilt:gl.getUniformLocation(program,'uTilt')};
  const C={ground:[.12,.16,.16],lane:[.23,.27,.24],shoulder:[.16,.20,.19],friend:[.83,.61,.22],friend2:[.52,.76,.64],enemy:[.72,.28,.25],enemy2:[.85,.44,.35],commander:[.95,.79,.34],bastion:[.35,.63,.56],guard:[.64,.25,.23],gate:[.48,.37,.23],core:[.30,.48,.55],tower:[.38,.44,.46],pylon:[.48,.66,.57],projectile:[.96,.82,.48],danger:[.90,.41,.34],junction:[.27,.33,.31],presence:[.31,.56,.51],route:[.75,.68,.34]};
  function box(x,y,z,sx,sy,sz,color){gl.uniform3f(U.pos,x,y,z);gl.uniform3f(U.size,sx,sy,sz);gl.uniform3fv(U.color,color);gl.drawArrays(gl.TRIANGLES,0,36)}
  function bar(x,y,z,w,h,ratio,back,fill){box(x,y,z,w,h,.12,back);const fw=Math.max(.05,w*Math.max(0,Math.min(1,ratio)));box(x-(w-fw)/2,y,z+.08,fw,h*.72,.12,fill)}

  // ---- R01-B exploratory human-test parameter set -------------------------
  const PSET = {...CFG.PARAMS};
  const ENEMY = CFG.ENEMY;

  let deployment=R.cloneDeployment(R.PRESETS.siegeDelay);
  let phase='deploy', selectedLane='north', waypointTargeting=false, simSpeed=1;
  let actorSeq=0, projectileSeq=0;
  const camera={x:-30,y:0,zoom:1,tilt:.38};
  const pointers=new Map(); let gesture=null; const DRAG=9;

  function newLane(id){return {id,y:lanesMeta[id].y,bastion:{hp:PSET.bastionHp,max:PSET.bastionHp,broken:false,hits:[]},guard:{hp:PSET.guardHp,max:PSET.guardHp,broken:false,hits:[]},towers:[],overdriveUntil:0,frontX:0,pressure:'below'};}
  const world={time:0,actors:[],projectiles:[],lanes:{north:newLane('north'),south:newLane('south')},gate:{hp:PSET.gateHp,max:PSET.gateHp,vulnerable:false},core:{hp:PSET.coreHp,max:PSET.coreHp},commander:{x:-46,y:11,lane:'north',hp:PSET.commanderHp,max:PSET.commanderHp,path:[],attackCd:0,incapacitated:false,reformAt:0},gold:PSET.initialGold,nextPlayerPulse:1.0,nextEnemy:{north:PSET.enemyNorthInitial,south:PSET.enemySouthInitial},enemyPulseIndex:{north:0,south:0},rallyReady:0,rallyUntil:0,waypointReady:0,interventionReady:0,result:null};

  const evidence={schema:2,build:BUILD,designBaseline:'1.7',fixture:FIXTURE,parameterRevision:PARAM_REV,parameterSet:PSET,fixtureScript:{north:{initial:PSET.enemyNorthInitial,cadence:PSET.enemyPulseNorth,opening:CFG.enemyRecipe('north',0),recurring:CFG.enemyRecipe('north',1)},south:{initial:PSET.enemySouthInitial,cadence:PSET.enemyPulseSouth,opening:CFG.enemyRecipe('south',0),recurring:CFG.enemyRecipe('south',1)}},tuningStatus:'exploratory human-test candidate; not shipping balance',startedAt:new Date().toISOString(),runs:[]};
  let currentRun=null;
  function ev(type,detail={}){if(!currentRun)return;currentRun.events.push({t:+world.time.toFixed(2),type,...detail});if(currentRun.events.length>800)currentRun.events.shift();}

  function resetWorld(){
    world.time=0;world.actors=[];world.projectiles=[];world.lanes={north:newLane('north'),south:newLane('south')};world.gate={hp:PSET.gateHp,max:PSET.gateHp,vulnerable:false};world.core={hp:PSET.coreHp,max:PSET.coreHp};world.commander={x:-46,y:11,lane:'north',hp:PSET.commanderHp,max:PSET.commanderHp,path:[],attackCd:0,incapacitated:false,reformAt:0};world.gold=PSET.initialGold;world.nextPlayerPulse=1;world.nextEnemy={north:PSET.enemyNorthInitial,south:PSET.enemySouthInitial};world.enemyPulseIndex={north:0,south:0};world.rallyReady=0;world.rallyUntil=0;world.waypointReady=0;world.interventionReady=0;world.result=null;selectedLane='north';waypointTargeting=false;camera.x=-30;camera.y=0;camera.zoom=1;
  }

  // ---- Deployment -----------------------------------------------------------
  function deploymentSummary(){return R.deploymentLegal(deployment)}
  function unitControl(lane,id){const u=R.UNITS[id],n=deployment[lane].units[id];return `<div class="unit-control"><strong>${u.name}</strong><small>${u.cost} Unit · ${u.role}</small><div class="stepper"><button type="button" data-step="-1" data-lane="${lane}" data-unit="${id}">−</button><b>${n}</b><button type="button" data-step="1" data-lane="${lane}" data-unit="${id}">+</button></div></div>`}
  function towerOptions(selected){return Object.values(R.TOWERS).map(t=>`<option value="${t.id}" ${selected===t.id?'selected':''}>${t.name} · ${t.cost}</option>`).join('')}
  function renderDeployment(){
    $('deployLanes').innerHTML=laneIds.map(lane=>`<section class="deploy-lane"><h2>${lane.toUpperCase()}</h2><div class="unit-grid">${Object.keys(R.UNITS).map(id=>unitControl(lane,id)).join('')}</div><div class="tower-row"><label>Rear tower<select data-tower-lane="${lane}" data-slot="rear">${towerOptions(deployment[lane].towers.rear)}</select></label><label>Forward tower<select data-tower-lane="${lane}" data-slot="forward">${towerOptions(deployment[lane].towers.forward)}</select></label></div></section>`).join('');
    document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{const lane=b.dataset.lane,id=b.dataset.unit,delta=+b.dataset.step;deployment[lane].units[id]=Math.max(0,deployment[lane].units[id]+delta);renderDeployment();});
    document.querySelectorAll('[data-tower-lane]').forEach(s=>s.onchange=()=>{deployment[s.dataset.towerLane].towers[s.dataset.slot]=s.value;renderDeployment();});
    const ck=deploymentSummary();$('unitBudget').textContent=`Unit ${ck.unitTotal} / ${R.UNIT_CAP}`;$('towerBudget').textContent=`Tower ${ck.towerTotal} / ${R.TOWER_CAP}`;$('unitBudget').classList.toggle('over',ck.unitTotal>R.UNIT_CAP);$('towerBudget').classList.toggle('over',ck.towerTotal>R.TOWER_CAP);$('startBattle').disabled=!ck.legal;$('deployVerdict').textContent=ck.legal?'Legal deployment':ck.errors.join(' · ');$('deployNote').textContent=ck.legal?'Deployment locks when battle begins.':'Adjust the plan before starting.';
  }
  document.querySelectorAll('[data-deploy-preset]').forEach(b=>b.onclick=()=>{deployment=R.cloneDeployment(R.PRESETS[b.dataset.deployPreset]);document.querySelectorAll('[data-deploy-preset]').forEach(x=>x.classList.toggle('active',x===b));renderDeployment();});

  function buildTowers(){
    for(const laneId of laneIds){const lane=world.lanes[laneId];for(const slot of ['rear','forward']){const id=deployment[laneId].towers[slot];if(id==='none')continue;const t=R.TOWERS[id];lane.towers.push({id,type:id,slot,x:slot==='rear'?-47:12,y:lane.y+(slot==='rear'?4.8:-4.8),hp:t.hp,max:t.hp,cd:0,dead:false});}}
  }

  function startBattle(){
    const ck=deploymentSummary();if(!ck.legal)return;resetWorld();buildTowers();phase='battle';$('deployment').hidden=true;$('battleHud').hidden=false;$('battleResult').hidden=true;currentRun={runId:crypto.randomUUID?.()||String(Date.now()),startedAt:new Date().toISOString(),deployment:R.cloneDeployment(deployment),parameterRevision:PARAM_REV,events:[],snapshots:[],debrief:{sacrifice:null,guardRead:null,goldFork:null},metrics:{goldSpent:0,goldEarned:0,pulses:{north:0,south:0},enemyPulses:{north:0,south:0},guardBreakLane:null,guardBreakTimes:{north:null,south:null},bastionBreaks:[],commanderIncapacitations:0,kills:{local:0,remote:0},interventions:{push:0,overdrive:0}},result:null,nextSnapshotAt:10};evidence.runs.push(currentRun);document.querySelectorAll('[data-debrief-key]').forEach(x=>x.classList.remove('selected-choice'));closeActionDrawer();closeLab();ev('battle-start',{deployment:R.cloneDeployment(deployment)});updateUI();
  }
  $('startBattle').onclick=startBattle;
  $('redeployButton').onclick=()=>returnToDeployment();$('resetBattle').onclick=()=>returnToDeployment();
  function returnToDeployment(){if(currentRun&&!currentRun.result&&phase==='battle'){ev('battle-aborted');currentRun.endedAt=new Date().toISOString();}phase='deploy';closeActionDrawer();closeLab();$('deployment').hidden=false;$('battleHud').hidden=true;$('battleResult').hidden=true;resetWorld();renderDeployment();updateUI();}

  // ---- Actors / combat ------------------------------------------------------
  function laneJitter(id){return ((id%5)-2)*.62;}
  function spawnActor(team,laneId,templateId,x,extra={}){
    let base=team===1?R.UNITS[templateId]:ENEMY[templateId];if(team===1&&templateId==='siegeRam')base={...base,hp:PSET.siegeRamHp,structure:PSET.siegeRamStructure};const id=++actorSeq;const a={id,team,lane:laneId,x,y:lanesMeta[laneId].y+laneJitter(id),z:1,templateId,role:base.role,hp:base.hp,max:base.hp,damage:base.damage,range:base.range,speed:base.speed,cadence:base.cadence,structure:base.structure,cd:0,slowUntil:0,dead:false,...extra};world.actors.push(a);return a;
  }
  function spawnPlayerPulse(laneId,source='scheduled'){
    const units=deployment[laneId].units;let offset=0,count=0;for(const [id,n] of Object.entries(units)){for(let i=0;i<n;i++){spawnActor(1,laneId,id,-67-offset);offset+=1.6;count++;}}
    if(count){currentRun.metrics.pulses[laneId]++;ev('player-pulse',{lane:laneId,source,count,types:R.committedTypes(deployment,laneId)});}return count;
  }
  function spawnReinforcement(laneId){
    const types=R.committedTypes(deployment,laneId);let offset=0,count=0;for(const id of types){spawnActor(1,laneId,id,-67-offset);offset+=1.6;count++;}
    if(count){currentRun.metrics.pulses[laneId]++;ev('player-pulse',{lane:laneId,source:'gold-push',count,types});}return count;
  }
  function spawnEnemyPulse(laneId){
    const idx=world.enemyPulseIndex[laneId]++;const recipe=CFG.enemyRecipe(laneId,idx);let offset=0;for(const id of recipe){spawnActor(-1,laneId,id,58+offset);offset+=1.5;}currentRun.metrics.enemyPulses[laneId]++;ev('enemy-pulse',{lane:laneId,index:idx,count:recipe.length,types:[...recipe]});
  }
  function aliveActors(lane,team){return world.actors.filter(a=>!a.dead&&a.lane===lane&&a.team===team)}
  function addProjectile(from,to,color){world.projectiles.push({id:++projectileSeq,x:from.x,y:from.y,z:1.6,tx:to.x,ty:to.y,life:.18,color});}
  function dealActorDamage(target,dmg,source){if(target.dead)return;target.hp-=dmg;if(target.hp<=0){target.dead=true;if(target.team===-1){const local=!world.commander.incapacitated&&Math.hypot(target.x-world.commander.x,target.y-world.commander.y)<=PSET.presenceRadius;const g=local?PSET.fullGold:PSET.remoteGold;world.gold+=g;currentRun.metrics.goldEarned+=g;currentRun.metrics.kills[local?'local':'remote']++;ev('enemy-kill',{lane:target.lane,gold:g,local});}}}
  function attackMultiplier(a){let m=1;if(a.team===1){if(!world.commander.incapacitated&&Math.hypot(a.x-world.commander.x,a.y-world.commander.y)<=PSET.presenceRadius)m*=PSET.presenceDamage;if(world.time<world.rallyUntil&&Math.hypot(a.x-world.commander.x,a.y-world.commander.y)<=PSET.presenceRadius)m*=PSET.rallyDamage;const lane=world.lanes[a.lane];for(const t of lane.towers){if(!t.dead&&t.type==='pylon'&&Math.abs(a.x-t.x)<=R.TOWERS.pylon.radius)m*=R.TOWERS.pylon.buff;}}
    return m;
  }
  function recentDps(hits,windowSec=5){const cutoff=world.time-windowSec;while(hits.length&&hits[0].t<cutoff)hits.shift();return hits.reduce((s,h)=>s+h.d,0)/windowSec;}
  function damageStructure(obj,dmg,laneId,kind){if(obj.broken||obj.hp<=0)return;obj.hp-=dmg;if(kind==='guard')obj.hits.push({t:world.time,d:dmg});if(kind==='bastion')obj.hits.push({t:world.time,d:dmg});if(obj.hp<=0){obj.hp=0;obj.broken=true;if(kind==='guard'){currentRun.metrics.guardBreakTimes[laneId]=+world.time.toFixed(2);if(!world.gate.vulnerable){world.gate.vulnerable=true;currentRun.metrics.guardBreakLane=laneId;ev('gate-vulnerable',{lane:laneId});}ev('guard-broken',{lane:laneId});}if(kind==='bastion'){currentRun.metrics.bastionBreaks.push({lane:laneId,t:+world.time.toFixed(1)});ev('bastion-broken',{lane:laneId});}}}
  function nearestActor(a){let best=null,dist=Infinity;for(const b of world.actors){if(b.dead||b.team===a.team||b.lane!==a.lane)continue;const d=Math.abs(b.x-a.x);if(d<dist){dist=d;best=b}}return {target:best,dist};}
  function towerAheadForEnemy(a){const lane=world.lanes[a.lane];return lane.towers.filter(t=>!t.dead&&t.hp>0&&t.x<a.x+2).sort((p,q)=>q.x-p.x)[0]||null;}
  function actorStep(a,dt){if(a.dead)return;a.cd=Math.max(0,a.cd-dt);const slowFactor=a.slowUntil&&world.time<a.slowUntil.time?a.slowUntil.factor:1;const speed=a.speed*slowFactor;const {target,dist}=nearestActor(a);if(target&&dist<=a.range){if(a.cd<=0){const dmg=a.damage*attackMultiplier(a);dealActorDamage(target,dmg,a);if(a.role==='ranged')addProjectile(a,target,a.team===1?C.projectile:C.enemy2);a.cd=1/a.cadence;}return;}
    if(a.team===1){const lane=world.lanes[a.lane];if(!lane.guard.broken){const d=lane.guard;const dx=65-a.x;if(dx<=a.range+1.3){if(a.cd<=0){const dmg=a.damage*a.structure*attackMultiplier(a);damageStructure(d,dmg,a.lane,'guard');if(a.role==='ranged')addProjectile(a,{x:65,y:lane.y},C.projectile);a.cd=1/a.cadence;}return;}}
      else {const dx=82-a.x;if(dx<=a.range+1.5){if(a.cd<=0){const dmg=a.damage*a.structure*attackMultiplier(a);world.gate.hp=Math.max(0,world.gate.hp-dmg);if(a.role==='ranged')addProjectile(a,{x:82,y:0},C.projectile);a.cd=1/a.cadence;}return;}}
      a.x+=speed*dt;
    } else {
      const tower=towerAheadForEnemy(a);if(tower&&Math.abs(a.x-tower.x)<=a.range+1.2){if(a.cd<=0){tower.hp-=a.damage*a.structure;if(tower.hp<=0){tower.hp=0;tower.dead=true;ev('tower-destroyed',{lane:a.lane,slot:tower.slot,type:tower.type});}a.cd=1/a.cadence;}return;}
      const lane=world.lanes[a.lane];if(!lane.bastion.broken){const dx=a.x-(-74);if(dx<=a.range+1.4){if(a.cd<=0){damageStructure(lane.bastion,a.damage*a.structure,a.lane,'bastion');a.cd=1/a.cadence;}return;}}
      else {const dx=a.x-(-86);if(dx<=a.range+1.5){if(a.cd<=0){world.core.hp=Math.max(0,world.core.hp-a.damage*a.structure);a.cd=1/a.cadence;}return;}}
      a.x-=speed*dt;
    }
  }

  function towerStep(t,dt,laneId){if(t.dead)return;t.cd=Math.max(0,t.cd-dt);if(t.type==='pylon')return;const spec=R.TOWERS[t.type];let target=null,dist=Infinity;for(const a of world.actors){if(a.dead||a.team!==-1||a.lane!==laneId)continue;const d=Math.abs(a.x-t.x);if(d<dist&&d<=spec.range){dist=d;target=a}}if(target&&t.cd<=0){const mult=world.time<world.lanes[laneId].overdriveUntil?PSET.overdriveMultiplier:1;dealActorDamage(target,spec.damage*mult,t);if(spec.slow)target.slowUntil={time:world.time+spec.slowSeconds,factor:spec.slow};addProjectile(t,target,C.projectile);t.cd=1/spec.cadence;}}

  function commanderStep(dt){const c=world.commander;if(c.incapacitated){if(world.time>=c.reformAt){c.incapacitated=false;c.hp=c.max;c.x=-84;c.y=0;c.lane='north';c.path=[];ev('commander-reformed');}return;}
    if(c.path.length){const p=c.path[0],dx=p.x-c.x,dy=p.y-c.y,d=Math.hypot(dx,dy);const step=6.1*dt;if(d<=step){c.x=p.x;c.y=p.y;c.lane=p.lane||c.lane;c.path.shift();}else{c.x+=dx/d*step;c.y+=dy/d*step;}}
    c.attackCd=Math.max(0,c.attackCd-dt);let target=null,dist=Infinity;for(const a of world.actors){if(a.dead||a.team!==-1)continue;const d=Math.hypot(a.x-c.x,a.y-c.y);if(d<dist&&d<=PSET.commanderRange){dist=d;target=a}}if(target&&c.attackCd<=0){dealActorDamage(target,PSET.commanderDamage,c);addProjectile(c,target,C.projectile);c.attackCd=1/PSET.commanderCadence;}
    // Enemies close to Commander contribute personal danger in addition to lane combat.
    let incoming=0;for(const a of world.actors){if(a.dead||a.team!==-1)continue;const d=Math.hypot(a.x-c.x,a.y-c.y);if(d<3.8)incoming+=a.damage*.07;}if(incoming>0)c.hp-=incoming*dt;
    if(c.hp<=0){c.hp=0;c.incapacitated=true;c.reformAt=world.time+PSET.reformSeconds;c.path=[];currentRun.metrics.commanderIncapacitations++;ev('commander-incapacitated',{reformSeconds:PSET.reformSeconds});}
  }

  function setCommanderDestination(x,y){const c=world.commander;if(c.incapacitated||phase!=='battle')return;const targetLane=Math.abs(y-lanesMeta.north.y)<Math.abs(y-lanesMeta.south.y)?'north':'south';const ty=lanesMeta[targetLane].y;const tx=Math.max(-68,Math.min(57,x));const path=[];if(targetLane!==c.lane){path.push({x:PSET.junctionX,y:lanesMeta[c.lane].y,lane:c.lane},{x:PSET.junctionX,y:ty,lane:targetLane});}path.push({x:tx,y:ty,lane:targetLane});c.path=path;ev('commander-order',{fromLane:c.lane,toLane:targetLane,x:+tx.toFixed(1),viaJunction:targetLane!==c.lane});}

  function captureSnapshot(reason='interval'){
    if(!currentRun)return;const laneSnap={};for(const id of laneIds){const l=world.lanes[id];laneSnap[id]={bastionPct:+(l.bastion.hp/l.bastion.max).toFixed(3),guardPct:+(l.guard.hp/l.guard.max).toFixed(3),pressure:l.pressure,frontX:+l.frontX.toFixed(1),friendly:aliveActors(id,1).length,enemy:aliveActors(id,-1).length};}
    currentRun.snapshots.push({t:+world.time.toFixed(1),reason,gold:+world.gold.toFixed(1),gatePct:+(world.gate.hp/world.gate.max).toFixed(3),corePct:+(world.core.hp/world.core.max).toFixed(3),commander:{lane:world.commander.lane,x:+world.commander.x.toFixed(1),incapacitated:world.commander.incapacitated},lanes:laneSnap});
    if(currentRun.snapshots.length>90)currentRun.snapshots.shift();
  }

  // ---- Battle systems -------------------------------------------------------
  function simStep(dt){if(phase!=='battle'||world.result)return;world.time+=dt;
    if(world.time>=world.nextPlayerPulse){for(const l of laneIds)spawnPlayerPulse(l);world.nextPlayerPulse+=PSET.playerPulse;}
    for(const l of laneIds)if(world.time>=world.nextEnemy[l]){spawnEnemyPulse(l);world.nextEnemy[l]+=l==='north'?PSET.enemyPulseNorth:PSET.enemyPulseSouth;}
    for(const laneId of laneIds){const lane=world.lanes[laneId];if(!lane.guard.broken)lane.guard.hp=Math.min(lane.guard.max,lane.guard.hp+PSET.guardRegen*dt);for(const t of lane.towers)towerStep(t,dt,laneId);}
    for(const a of world.actors)actorStep(a,dt);commanderStep(dt);
    world.actors=world.actors.filter(a=>!a.dead&&a.x>-92&&a.x<90);for(const p of world.projectiles){p.life-=dt;const k=Math.min(1,dt/.18*4);p.x+=(p.tx-p.x)*k;p.y+=(p.ty-p.y)*k;}world.projectiles=world.projectiles.filter(p=>p.life>0);
    deriveLaneState();if(currentRun&&world.time>=currentRun.nextSnapshotAt){captureSnapshot();currentRun.nextSnapshotAt+=10;}
    if(world.gate.hp<=0)finishBattle('win');else if(world.core.hp<=0)finishBattle('loss');
  }

  function deriveLaneState(){for(const id of laneIds){const lane=world.lanes[id];const dps=recentDps(lane.guard.hits,5);lane.pressure=lane.guard.broken?'broken':R.guardPressureState(dps,PSET.guardRegen);const friends=aliveActors(id,1),enemies=aliveActors(id,-1);const p=friends.length?Math.max(...friends.map(a=>a.x)):-70;const e=enemies.length?Math.min(...enemies.map(a=>a.x)):60;lane.frontX=(p+e)/2;}}
  function finishBattle(result){if(world.result)return;captureSnapshot('battle-end');world.result=result;phase='ended';closeActionDrawer();closeLab();currentRun.result={result,duration:+world.time.toFixed(1),gateHp:+world.gate.hp.toFixed(1),coreHp:+world.core.hp.toFixed(1),gold:world.gold,guardBreakLane:currentRun.metrics.guardBreakLane,bastionBreaks:currentRun.metrics.bastionBreaks};currentRun.endedAt=new Date().toISOString();ev('battle-end',currentRun.result);$('battleResult').hidden=false;$('resultTitle').textContent=result==='win'?'Gate broken':'Core fallen';$('resultBody').textContent=result==='win'?'The breach converted. Now ask whether you won because you concentrated—or because the other lane never became a meaningful clock.':'The fork closed against you. Inspect which lane was making real Guard progress and which clock you misread.';$('resultStats').innerHTML=`<b>${Math.floor(world.time/60)}:${String(Math.floor(world.time%60)).padStart(2,'0')} battle</b><b>${currentRun.metrics.guardBreakLane||'no'} breach</b><b>${Math.round(world.core.hp/world.core.max*100)}% Core</b>`;updateUI();}

  // ---- Abilities / economy --------------------------------------------------
  function closeActionDrawer(){const d=$('actionDrawer');if(d)d.hidden=true;$('actionsToggle')?.setAttribute('aria-expanded','false');}
  $('actionsToggle').onclick=()=>{const d=$('actionDrawer');d.hidden=!d.hidden;$('actionsToggle').setAttribute('aria-expanded',String(!d.hidden));};
  $('rallyButton').onclick=()=>{if(phase!=='battle'||world.commander.incapacitated||world.time<world.rallyReady)return;world.rallyUntil=world.time+PSET.rallySeconds;world.rallyReady=world.time+PSET.rallyCooldown;ev('rally',{lane:world.commander.lane});closeActionDrawer();};
  $('waypointButton').onclick=()=>{if(phase!=='battle'||world.commander.incapacitated||world.time<world.waypointReady)return;waypointTargeting=!waypointTargeting;$('waypointButton').classList.toggle('active',waypointTargeting);closeActionDrawer();updateUI();};
  $('pushButton').onclick=()=>{if(phase!=='battle'||world.gold<PSET.interventionCost||world.time<world.interventionReady)return;const types=R.committedTypes(deployment,selectedLane);if(!types.length)return;world.gold-=PSET.interventionCost;currentRun.metrics.goldSpent+=PSET.interventionCost;currentRun.metrics.interventions.push++;const n=spawnReinforcement(selectedLane);world.interventionReady=world.time+PSET.interventionCooldown;ev('gold-spend',{kind:'push',lane:selectedLane,cost:PSET.interventionCost,count:n,cooldown:PSET.interventionCooldown});closeActionDrawer();updateUI();};
  $('overdriveButton').onclick=()=>{if(phase!=='battle'||world.gold<PSET.interventionCost||world.time<world.interventionReady)return;const lane=world.lanes[selectedLane];if(!lane.towers.some(t=>!t.dead))return;world.gold-=PSET.interventionCost;currentRun.metrics.goldSpent+=PSET.interventionCost;currentRun.metrics.interventions.overdrive++;lane.overdriveUntil=world.time+PSET.overdriveSeconds;world.interventionReady=world.time+PSET.interventionCooldown;ev('gold-spend',{kind:'tower-overdrive',lane:selectedLane,cost:PSET.interventionCost,seconds:PSET.overdriveSeconds,multiplier:PSET.overdriveMultiplier,cooldown:PSET.interventionCooldown});closeActionDrawer();updateUI();};

  document.querySelectorAll('.lane[data-lane]').forEach(b=>b.onclick=()=>{const id=b.dataset.lane;selectedLane=id;document.querySelectorAll('.lane[data-lane]').forEach(x=>x.classList.toggle('selected',x.dataset.lane===id));if(waypointTargeting&&phase==='battle'&&world.time>=world.waypointReady&&!world.commander.incapacitated){world.commander.x=-68;world.commander.y=lanesMeta[id].y;world.commander.lane=id;world.commander.path=[];world.waypointReady=world.time+PSET.waypointCooldown;waypointTargeting=false;camera.x=world.commander.x+16;camera.y=world.commander.y;ev('waypoint',{lane:id});}else{camera.x=world.lanes[id].frontX;camera.y=lanesMeta[id].y;}clampCamera();updateUI();});
  $('recenterButton').onclick=()=>{camera.x=world.commander.x;camera.y=world.commander.y;clampCamera();if(currentRun)ev('camera-recenter');};

  // ---- Camera / input -------------------------------------------------------
  function resize(){const dpr=Math.min(devicePixelRatio||1,2);const w=Math.max(1,Math.floor(canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);rotate.hidden=innerWidth>=innerHeight;}
  function halfView(){const hw=36/camera.zoom,aspect=Math.max(1,canvas.clientWidth/Math.max(1,canvas.clientHeight));return{x:hw,y:hw/aspect}}
  function clampCamera(){const h=halfView();camera.x=Math.max(-90+h.x,Math.min(90-h.x,camera.x));camera.y=Math.max(-18,Math.min(18,camera.y));}
  function screenToWorld(x,y){const r=canvas.getBoundingClientRect(),h=halfView();return{x:camera.x+((x-r.left)/r.width*2-1)*h.x,y:camera.y-((y-r.top)/r.height*2-1)*h.y/Math.cos(camera.tilt)}}
  canvas.addEventListener('pointerdown',e=>{if(phase!=='battle')return;closeActionDrawer();closeLab();canvas.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY});if(pointers.size===1)gesture={type:'pending'};else if(pointers.size===2){const p=[...pointers.values()];gesture={type:'pinch',dist:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom:camera.zoom};}});
  canvas.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;if(pointers.size===1&&gesture){const dx=p.x-p.sx,dy=p.y-p.sy;if(gesture.type==='pending'&&Math.hypot(dx,dy)>DRAG){gesture={type:'pan',lastX:p.x,lastY:p.y};}else if(gesture.type==='pan'){const h=halfView(),r=canvas.getBoundingClientRect();camera.x-=(p.x-gesture.lastX)/r.width*h.x*2;camera.y+=(p.y-gesture.lastY)/r.height*h.y*2/Math.cos(camera.tilt);gesture.lastX=p.x;gesture.lastY=p.y;clampCamera();}}else if(pointers.size===2){const ps=[...pointers.values()],d=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);if(gesture?.type!=='pinch')gesture={type:'pinch',dist:d,zoom:camera.zoom};camera.zoom=Math.max(.72,Math.min(1.45,gesture.zoom*(d/Math.max(1,gesture.dist))));clampCamera();}});
  function pointerEnd(e,cancelled=false){const p=pointers.get(e.pointerId);if(!p)return;const wasSingle=pointers.size===1,wasTap=wasSingle&&gesture?.type==='pending'&&Math.hypot(p.x-p.sx,p.y-p.sy)<=DRAG;pointers.delete(e.pointerId);if(wasTap&&!cancelled){const w=screenToWorld(e.clientX,e.clientY);setCommanderDestination(w.x,w.y);}if(pointers.size===0)gesture=null;else if(pointers.size===1){const q=[...pointers.values()][0];q.sx=q.x;q.sy=q.y;gesture={type:'pending-after-multitouch'};}}
  canvas.addEventListener('pointerup',e=>pointerEnd(e,false));canvas.addEventListener('pointercancel',e=>pointerEnd(e,true));

  // ---- UI -------------------------------------------------------------------
  function pct(obj){return Math.round(obj.hp/obj.max*100)}
  function bastionBand(lane){if(lane.bastion.broken)return'BROKEN';const dps=recentDps(lane.bastion.hits,5);if(dps<1)return'STABLE';const eta=lane.bastion.hp/dps;if(eta<10)return'NOW';if(eta<30)return'<30s';if(eta<60)return'<1m';return'1m+';}
  function updateLaneUI(id){const lane=world.lanes[id],bp=pct(lane.bastion),gp=pct(lane.guard);const b=$(`${id}Bastion`),g=$(`${id}Guard`),pr=$(`${id}Pressure`);b.textContent=lane.bastion.broken?'B OPEN':`B ${bp} · ${bastionBand(lane)}`;b.className=lane.bastion.broken?'broken':bp<=25?'critical':'good';g.textContent=lane.guard.broken?'G OPEN':`G ${gp}`;g.className=lane.guard.broken?'broken':gp<=20?'critical':'guard';pr.textContent=lane.guard.broken?'BREACH':lane.pressure==='above'?'NET PROGRESS':lane.pressure==='near'?'NEAR REPL':'BELOW REPL';pr.style.color=lane.pressure==='above'?'#8fd5b9':lane.pressure==='near'?'#e0bd65':'#d88b7f';const width=Math.max(4,Math.min(96,(lane.frontX+74)/(65+74)*100));$(`${id}Front`).style.width=`${width}%`;const cm=$(`${id}Commander`);if(!world.commander.incapacitated&&world.commander.lane===id){cm.textContent='◆';cm.style.left=`${Math.max(4,Math.min(96,(world.commander.x+74)/(65+74)*100))}%`;}else cm.textContent='';}
  function updateUI(){resize();updateLaneUI('north');updateLaneUI('south');$('gold').textContent=`${Math.floor(world.gold)}g`;$('timer').textContent=phase==='battle'?`${Math.floor(world.time/60)}:${String(Math.floor(world.time%60)).padStart(2,'0')}`:phase==='ended'?'ENDED':'DEPLOY';$('gateState').textContent=world.gate.vulnerable?'VULNERABLE':'SHIELDED';$('gateState').style.color=world.gate.vulnerable?'#e4b95a':'#a7b0aa';$('gateMeter').value=world.gate.hp/world.gate.max;$('coreMeter').value=world.core.hp/world.core.max;$('coreState').textContent=world.core.hp/world.core.max<.3?'CRITICAL':world.core.hp<world.core.max?'UNDER FIRE':'SECURE';const c=world.commander;const cDanger=!c.incapacitated&&c.hp/c.max<=.3;$('objectiveText').textContent=c.incapacitated?`Commander reforming · ${Math.max(0,Math.ceil(c.reformAt-world.time))}s`:cDanger?'COMMANDER ENDANGERED':world.gate.vulnerable?'One breach is open — finish the Gate':world.lanes[selectedLane].pressure==='above'?`${selectedLane.toUpperCase()} is above replacement`:`${selectedLane.toUpperCase()} selected · read both clocks`;
    const rallyRem=Math.max(0,world.rallyReady-world.time);$('rallyStatus').textContent=world.time<world.rallyUntil?`active ${Math.ceil(world.rallyUntil-world.time)}s`:rallyRem?`${Math.ceil(rallyRem)}s`:'ready';$('rallyButton').disabled=phase!=='battle'||c.incapacitated||rallyRem>0;const wpRem=Math.max(0,world.waypointReady-world.time);$('waypointStatus').textContent=waypointTargeting?'choose lane':wpRem?`${Math.ceil(wpRem)}s`:'ready';$('waypointButton').disabled=phase!=='battle'||c.incapacitated||wpRem>0;const intRem=Math.max(0,world.interventionReady-world.time);$('pushStatus').textContent=`${PSET.interventionCost}g · ${intRem?Math.ceil(intRem)+'s':'ready'} · ${selectedLane}`;$('overdriveStatus').textContent=`${PSET.interventionCost}g · ${intRem?Math.ceil(intRem)+'s':'ready'} · ${selectedLane}`;$('pushButton').disabled=phase!=='battle'||world.gold<PSET.interventionCost||intRem>0||R.committedTypes(deployment,selectedLane).length===0;$('overdriveButton').disabled=phase!=='battle'||world.gold<PSET.interventionCost||intRem>0||!world.lanes[selectedLane].towers.some(t=>!t.dead);$('actionsSummary').textContent=`WP ${wpRem?Math.ceil(wpRem)+'s':'READY'} · ${Math.floor(world.gold)}g`;
  }

  // ---- Rendering ------------------------------------------------------------
  function actorColor(a){if(a.team===1){if(a.role==='siege')return C.friend2;return C.friend;}return a.role==='ranged'?C.enemy2:C.enemy;}
  function render(){resize();const h=halfView();gl.clearColor(.045,.065,.075,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.uniform2f(U.camera,camera.x,camera.y);gl.uniform2f(U.halfView,h.x,h.y);gl.uniform1f(U.tilt,camera.tilt);
    box(0,0,-1,180,42,1.5,C.ground);for(const id of laneIds){const lane=world.lanes[id];box(0,lane.y,-.15,170,8,.5,C.lane);box(-3,lane.y+5.1,-.2,150,1.4,.35,C.shoulder);box(-3,lane.y-5.1,-.2,150,1.4,.35,C.shoulder);box(-74,lane.y,2.2,5.5,7.4,4.4,lane.bastion.broken?C.danger:C.bastion);bar(-74,lane.y,4.8,5,1,lane.bastion.hp/lane.bastion.max,[.12,.12,.12],lane.bastion.hp/lane.bastion.max<.25?C.danger:C.friend2);box(65,lane.y,2.0,4.8,6.8,4,lane.guard.broken?[.20,.14,.13]:C.guard);if(!lane.guard.broken)bar(65,lane.y,4.5,5,1,lane.guard.hp/lane.guard.max,[.12,.12,.12],lane.guard.hp/lane.guard.max<.2?C.danger:C.enemy2);for(const t of lane.towers){if(t.dead)continue;const col=t.type==='pylon'?C.pylon:C.tower;box(t.x,t.y,1.5,3.4,3.4,3,col);bar(t.x,t.y,3.35,3.2,.55,t.hp/t.max,[.12,.12,.12],C.friend2);if(world.time<lane.overdriveUntil)box(t.x,t.y,3.9,1.1,1.1,.45,C.projectile);}}
    box(-86,0,3.0,5.5,32,6,C.core);bar(-86,0,6.3,5.2,1.2,world.core.hp/world.core.max,[.12,.12,.12],world.core.hp/world.core.max<.3?C.danger:C.friend2);box(82,0,3.8,6.5,32,7.6,world.gate.vulnerable?C.gate:[.28,.28,.27]);bar(82,0,7.9,6,1.2,world.gate.hp/world.gate.max,[.12,.12,.12],C.projectile);box(PSET.junctionX,0,.05,9,29,.6,C.junction);
    // Presence and route use low-profile ground markers.
    if(!world.commander.incapacitated){for(let i=0;i<16;i++){const a=i/16*Math.PI*2;box(world.commander.x+Math.cos(a)*PSET.presenceRadius,world.commander.y+Math.sin(a)*PSET.presenceRadius,.18,.65,.65,.12,C.presence);}box(world.commander.x,world.commander.y,1.8,2.6,2.6,3.6,C.commander);bar(world.commander.x,world.commander.y,4,3,.55,world.commander.hp/world.commander.max,[.12,.12,.12],world.commander.hp/world.commander.max<.3?C.danger:C.projectile);for(const p of world.commander.path)box(p.x,p.y,.35,1.0,1.0,.2,C.route);}
    for(const a of world.actors){if(a.dead)continue;const size=a.role==='siege'?[2.7,2.4,2.2]:a.role==='ranged'?[1.3,1.3,1.8]:[1.55,1.55,1.9];box(a.x,a.y,size[2]/2,size[0],size[1],size[2],actorColor(a));if(a.hp/a.max<.35)bar(a.x,a.y,size[2]+.35,1.6,.28,a.hp/a.max,[.12,.12,.12],a.team===1?C.friend2:C.enemy2);}
    for(const p of world.projectiles)box(p.x,p.y,1.4,.5,.5,.5,p.color);
  }

  function closeLab(){const p=$('labPanel');if(p)p.hidden=true;$('labToggle')?.setAttribute('aria-expanded','false');}
  $('labToggle').onclick=()=>{const p=$('labPanel');p.hidden=!p.hidden;$('labToggle').setAttribute('aria-expanded',String(!p.hidden));};
  document.querySelectorAll('[data-debrief-key]').forEach(btn=>btn.onclick=()=>{if(!currentRun)return;const key=btn.dataset.debriefKey,value=btn.dataset.debriefValue;currentRun.debrief[key]=value;document.querySelectorAll(`[data-debrief-key="${key}"]`).forEach(x=>x.classList.toggle('selected-choice',x===btn));});

  // ---- Diagnostics / evidence ----------------------------------------------
  let last=performance.now(),fpsClock=last,fpsFrames=0,fps=60;
  function visibleActors(){const h=halfView();return world.actors.filter(a=>!a.dead&&Math.abs(a.x-camera.x)<h.x+2&&Math.abs(a.y-camera.y)<h.y/Math.cos(camera.tilt)+3).length;}
  function animate(now){const raw=Math.min(.05,(now-last)/1000);last=now;const dt=raw*simSpeed;simStep(dt);render();updateUI();fpsFrames++;if(now-fpsClock>=1000){fps=Math.round(fpsFrames*1000/(now-fpsClock));fpsFrames=0;fpsClock=now;$('fps').textContent=`${fps} fps`;$('actors').textContent=`${visibleActors()} vis · ${world.actors.length} total`;}$('fixture').textContent=PARAM_REV;requestAnimationFrame(animate);}
  $('resultExport').onclick=()=>$('exportEvidence').click();
  $('simSpeed').onchange=e=>{simSpeed=+e.target.value;if(currentRun)ev('sim-speed',{value:simSpeed});};
  let audioContext=null,audioUnlocked=false;$('audioButton').onclick=async()=>{try{const A=window.AudioContext||window.webkitAudioContext;audioContext=audioContext||new A();if(audioContext.state==='suspended')await audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.frequency.value=420;g.gain.value=.035;o.connect(g);g.connect(audioContext.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.12);o.stop(audioContext.currentTime+.13);$('audioButton').textContent='Sound ✓';if(!audioUnlocked&&currentRun)ev('audio-unlock');audioUnlocked=true;}catch(_){$('audioButton').textContent='Sound error';}};
  $('exportEvidence').onclick=()=>{const snapshot={...evidence,exportedAt:new Date().toISOString(),ui:{tapThroughHud:true,labCollapsedByDefault:true,actionsCollapsedByDefault:true},current:{phase,time:+world.time.toFixed(2),gold:world.gold,gateHp:world.gate.hp,coreHp:world.core.hp,actors:world.actors.length,selectedLane}};const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`lane-warden-${BUILD}-${PARAM_REV}-gameplay-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  addEventListener('visibilitychange',()=>{if(currentRun)ev('visibility',{state:document.visibilityState});});addEventListener('orientationchange',()=>{if(currentRun)ev('orientation',{type:screen.orientation?.type||null});});
  addEventListener('resize',()=>{resize();clampCamera();});
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

  renderDeployment();updateUI();requestAnimationFrame(animate);
})();
