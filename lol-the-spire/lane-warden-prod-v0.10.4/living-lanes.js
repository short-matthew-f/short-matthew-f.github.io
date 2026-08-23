(() => {
'use strict';
const E=window.LW_ENGINE,D=window.LW_DATA;
if(!E||!D)return;
const BUILD='P2-0.16.1';
const original={createBattle:E.createBattle,stepBattle:E.stepBattle,useAbility:E.useAbility,setCommanderLane:E.setCommanderLane,purchaseStructure:E.purchaseStructure,selfTest:E.selfTest};
const LANES=['north','south'];
const CFG=Object.freeze({
  friendlySpawn:.13, enemySpawn:.87, bastionX:.09, guardX:.91, gateX:.965,
  engage:.042, support:.070, spacing:.020,
  friendlySpeed:.030, enemySpeed:.027,
  initialFriendlyX:.28, initialEnemyX:.67,
  enemyCadenceNorth:14.5, enemyCadenceSouth:15.5,
  commanderSpeed:.090, presenceRadius:.105, presencePower:1.18, presenceDefense:.88,
  rallyRadius:.13, rallyPower:1.36,
  objectiveRange:.032,
  guardDamageScale:.70, gateDamageScale:.42, bastionDamageScale:.62, coreDamageScale:.48,
  enemyHpScale:18, enemyPowerScale:.72,
  friendlyHpScale:20, friendlyPowerScale:.92,
  towerRange:.16, towerDps:.75,
  cleanupDelay:1.4
});
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function unitDef(id){return D.units.find(u=>u.id===id)}
function lanePowerFromDeployment(b,lane){
  let hp=0,power=0,count=0,speed=CFG.friendlySpeed,comp={};
  for(const [id,n0] of Object.entries(b.deployment?.[lane]?.units||{})){
    const n=Number(n0)||0,u=unitDef(id);if(!u||n<=0)continue;
    comp[id]=n;count+=n;hp+=n*(8+u.durability*CFG.friendlyHpScale);power+=n*u.power*CFG.friendlyPowerScale;
    if(u.tags?.includes('swift'))speed=Math.max(speed,.036);
    if(u.tags?.includes('armored'))speed=Math.min(speed,.028);
    if(u.tags?.includes('siege'))speed=Math.min(speed,.024);
  }
  return{hp:Math.max(18,hp),power:Math.max(.7,power),count:Math.max(1,count),speed,composition:comp};
}
function nextId(b,prefix){b.living.nextId=(b.living.nextId||0)+1;return`${prefix}-${b.living.nextId}`}
function makeFriendly(b,lane,x,reinforced=false){
  const s=lanePowerFromDeployment(b,lane),boost=reinforced?1.28:1;
  return{id:nextId(b,'F'),side:'friendly',lane,x,hp:s.hp*boost,maxHp:s.hp*boost,power:s.power*boost,speed:s.speed,composition:s.composition,count:s.count,state:'marching',target:null,spawnedAt:b.elapsed,reinforced,deadAt:null};
}
function enemyKind(b,lane,wave){
  const i=(wave+(lane==='south'?1:0)+(b.seed%3))%4;
  return['line','raider','brute','line'][i];
}
function makeEnemy(b,lane,x,wave){
  const kind=enemyKind(b,lane,wave),base=Math.max(2.2,b.lanes[lane].baseEnemyPower||3);
  const mul=kind==='raider'?{hp:.70,pow:.84,spd:1.38}:kind==='brute'?{hp:1.48,pow:1.30,spd:.72}:{hp:1,pow:1,spd:1};
  const hp=base*CFG.enemyHpScale*mul.hp,power=base*CFG.enemyPowerScale*mul.pow;
  return{id:nextId(b,'E'),side:'enemy',lane,x,hp,maxHp:hp,power,speed:CFG.enemySpeed*mul.spd,kind,count:kind==='brute'?4:kind==='raider'?7:6,state:'marching',target:null,spawnedAt:b.elapsed,deadAt:null};
}
function livingLane(b,id){return b.living.lanes[id]}
function alive(list){return list.filter(c=>c.hp>0)}
function spawnFriendly(b,lane,initial=false,reinforced=false){const ll=livingLane(b,lane);const c=makeFriendly(b,lane,initial?CFG.initialFriendlyX:CFG.friendlySpawn,reinforced);if(!initial){const drummers=b.deployment?.[lane]?.units?.drummer||0;c.x=Math.min(.24,c.x+.006*drummers);if(b.runEffects?.upgrades?.includes('upgrade-slingline-drums')&&(b.deployment?.[lane]?.units?.slingline||0)>0&&b.lanes[lane].pulseCount%3===0)c.x=Math.min(.26,c.x+.018)}ll.friendly.push(c);b.events.push({t:b.elapsed,type:'cohort-spawn',side:'friendly',lane,id:c.id,reinforced});return c}
function spawnEnemy(b,lane,initial=false){const ll=livingLane(b,lane);ll.enemyWave++;const c=makeEnemy(b,lane,initial?CFG.initialEnemyX:CFG.enemySpawn,ll.enemyWave);ll.enemy.push(c);b.events.push({t:b.elapsed,type:'cohort-spawn',side:'enemy',lane,id:c.id,kind:c.kind});return c}
function ensureLiving(b){
  if(!b||b.living)return b;
  b.living={version:1,build:BUILD,nextId:0,lanes:{},rally:null};
  for(const id of LANES){b.living.lanes[id]={friendly:[],enemy:[],enemyWave:0,enemySpawnTimer:id==='north'?8.5:9.5,lastFront:.36,nominalEnemyPower:b.lanes[id].baseEnemyPower||3};spawnFriendly(b,id,true,false);spawnEnemy(b,id,true)}
  b.commander.pos=.30;b.commander.move=null;b.commander.travelTargetPos=null;
  b.events.push({t:b.elapsed||0,type:'living-lanes-init',build:BUILD});
  window.LW_ACTIVE_BATTLE=b;
  return b;
}
function commanderNear(b,lane,x,r=CFG.presenceRadius){const c=b.commander;return !!c&&!c.incapacitated&&!c.travel&&c.lane===lane&&Math.abs((c.pos??.3)-x)<=r}
function towerX(l){return l.tower?.slot==='forward'?.38:.22}
function towerEffects(b,lane,dt){
  const l=b.lanes[lane],ll=livingLane(b,lane),t=l.tower;if(!t?.id||t.hp<=0)return;
  const tx=towerX(l),en=alive(ll.enemy).sort((a,c)=>Math.abs(a.x-tx)-Math.abs(c.x-tx));
  if(!en.length)return;
  const inRange=en.filter(e=>Math.abs(e.x-tx)<=CFG.towerRange+(t.outputLevel||0)*.015);if(!inRange.length)return;
  let dps=CFG.towerDps*(1+(t.outputLevel||0)*.25);
  if(t.effect==='defense'||t.id==='bastionloom'){inRange[0].hp-=dps*dt*1.35}
  else if(t.effect==='swarm'||t.id==='pulsebell'){for(const e of inRange.slice(0,3))e.hp-=dps*dt*.65}
  else if(t.effect==='slow'||t.id==='harpoon'){for(const e of inRange)e.slow=Math.max(e.slow||0,.35);inRange[0].hp-=dps*dt*.40}
  else if(t.effect==='amplify'||t.id==='beacon'){inRange[0].hp-=dps*dt*.30}
}
function friendlyPowerAt(b,lane,c){
  let m=1;if(commanderNear(b,lane,c.x)){m*=CFG.presencePower}
  const r=b.living.rally;if(r&&r.until>b.elapsed&&r.lane===lane&&Math.abs(r.pos-c.x)<=CFG.rallyRadius)m*=CFG.rallyPower;
  const l=b.lanes[lane],tx=towerX(l);if(l.tower?.hp>0&&(l.tower.effect==='amplify'||l.tower.id==='beacon')&&Math.abs(c.x-tx)<=.13)m*=1.16+(l.tower.outputLevel||0)*.025;
  return c.power*m;
}
function enemyPowerAt(b,lane,c){let m=1;const ll=livingLane(b,lane),nom=Math.max(.1,ll.nominalEnemyPower||b.lanes[lane].baseEnemyPower||3);m*=clamp((b.lanes[lane].baseEnemyPower||nom)/nom,.55,1.75);if(commanderNear(b,lane,c.x))m*=CFG.presenceDefense;return c.power*m}
function chooseTargets(ll){
  const F=alive(ll.friendly),E2=alive(ll.enemy);
  for(const c of [...F,...E2]){c.target=null;c.state='marching'}
  for(const f of F){const candidates=E2.filter(e=>Math.abs(e.x-f.x)<=CFG.engage).sort((a,c)=>Math.abs(a.x-f.x)-Math.abs(c.x-f.x));if(candidates[0]){f.target=candidates[0].id;f.state='engaged'}}
  for(const e of E2){const candidates=F.filter(f=>Math.abs(f.x-e.x)<=CFG.engage).sort((a,c)=>Math.abs(a.x-e.x)-Math.abs(c.x-e.x));if(candidates[0]){e.target=candidates[0].id;e.state='engaged'}}
  for(const f of F.filter(c=>!c.target)){const engaged=F.filter(c=>c.target&&c.x>=f.x&&c.x-f.x<=CFG.support).sort((a,c)=>a.x-c.x)[0];if(engaged){const e=E2.find(x=>x.id===engaged.target);if(e&&Math.abs(e.x-f.x)<=CFG.support){f.target=e.id;f.state='supporting'}}}
  for(const e of E2.filter(c=>!c.target)){const engaged=E2.filter(c=>c.target&&c.x<=e.x&&e.x-c.x<=CFG.support).sort((a,c)=>c.x-a.x)[0];if(engaged){const f=F.find(x=>x.id===engaged.target);if(f&&Math.abs(f.x-e.x)<=CFG.support){e.target=f.id;e.state='supporting'}}}
}
function moveCohorts(b,lane,dt){
  const ll=livingLane(b,lane),F=alive(ll.friendly).sort((a,c)=>c.x-a.x),E2=alive(ll.enemy).sort((a,c)=>a.x-c.x);
  for(let i=0;i<F.length;i++){const c=F[i];if(c.target)continue;const ahead=F[i-1];let cap=ahead?ahead.x-CFG.spacing:CFG.guardX-CFG.objectiveRange;c.x=Math.min(cap,c.x+c.speed*dt)}
  for(let i=0;i<E2.length;i++){const c=E2[i];if(c.target)continue;const ahead=E2[i-1];let cap=ahead?ahead.x+CFG.spacing:CFG.bastionX+CFG.objectiveRange;const slow=1-(c.slow||0);c.x=Math.max(cap,c.x-c.speed*slow*dt);c.slow=Math.max(0,(c.slow||0)-dt*.6)}
}
function damageCohorts(b,lane,dt){
  const ll=livingLane(b,lane),F=alive(ll.friendly),E2=alive(ll.enemy),byId=new Map([...F,...E2].map(c=>[c.id,c]));
  for(const f of F){const e=byId.get(f.target);if(e&&e.hp>0)e.hp-=friendlyPowerAt(b,lane,f)*dt}
  for(const e of E2){const f=byId.get(e.target);if(f&&f.hp>0){f.hp-=enemyPowerAt(b,lane,e)*dt;if(commanderNear(b,lane,e.x,.055))b.commander.health=Math.max(0,b.commander.health-enemyPowerAt(b,lane,e)*dt*.16)}}
  for(const c of [...F,...E2])if(c.hp<=0&&c.deadAt==null){c.deadAt=b.elapsed;c.state='fallen';b.events.push({t:b.elapsed,type:'cohort-fallen',side:c.side,lane,id:c.id})}
}
function objectives(b,lane,dt){
  const ll=livingLane(b,lane),l=b.lanes[lane],F=alive(ll.friendly),E2=alive(ll.enemy);
  const attackers=F.filter(c=>c.x>=CFG.guardX-CFG.objectiveRange-.002&&!E2.some(e=>Math.abs(e.x-c.x)<=CFG.engage));
  if(attackers.length){const dmg=attackers.reduce((s,c)=>s+friendlyPowerAt(b,lane,c),0)*dt;if(l.guard>0){const before=l.guard;l.guard=Math.max(0,l.guard-dmg*CFG.guardDamageScale);if(before>0&&l.guard<=0){l.guardDestroyedEver=true;b.gateVulnerabilityLatched=true;b.gateVulnerable=true;if(b.runEffects?.relics?.includes('relic-gatebite-sigil')&&!b.runEffects.gatebiteUsed){b.runEffects.gatebiteUsed=true;b.gate=Math.max(0,b.gate-8);b.events.push({t:b.elapsed,type:'reward-effect',id:'relic-gatebite-sigil',lane})}b.events.push({t:b.elapsed,type:'guard-broken',lane,source:'living-lanes'})}}else if(b.gateVulnerabilityLatched){b.gate=Math.max(0,b.gate-dmg*CFG.gateDamageScale)}}
  const breakers=E2.filter(c=>c.x<=CFG.bastionX+CFG.objectiveRange+.002&&!F.some(f=>Math.abs(f.x-c.x)<=CFG.engage));
  if(breakers.length){const dmg=breakers.reduce((s,c)=>s+enemyPowerAt(b,lane,c),0)*dt;if(l.bastion>0)l.bastion=Math.max(0,l.bastion-dmg*CFG.bastionDamageScale);else b.core=Math.max(0,b.core-dmg*CFG.coreDamageScale);l.status=E.bastionState(l.bastion)}
}
function derivedFront(b,lane){
  const ll=livingLane(b,lane),F=alive(ll.friendly),E2=alive(ll.enemy);let x=.5;
  const engagements=[];for(const f of F)for(const e of E2)if(Math.abs(f.x-e.x)<=CFG.engage)engagements.push((f.x+e.x)/2);
  if(engagements.length)x=engagements.reduce((a,c)=>a+c,0)/engagements.length;
  else if(F.length&&E2.length)x=(Math.max(...F.map(c=>c.x))+Math.min(...E2.map(c=>c.x)))/2;
  else if(F.length)x=Math.max(...F.map(c=>c.x));else if(E2.length)x=Math.min(...E2.map(c=>c.x));
  return clamp(x,.08,.92)
}
function cleanup(ll,now){ll.friendly=ll.friendly.filter(c=>c.deadAt==null||now-c.deadAt<CFG.cleanupDelay);ll.enemy=ll.enemy.filter(c=>c.deadAt==null||now-c.deadAt<CFG.cleanupDelay)}
function stepCommanderSpatial(b,dt,travelBefore){const c=b.commander;if(c.incapacitated){c.move=null;return}if(c.move&&!c.travel){c.move.remaining=Math.max(0,c.move.remaining-dt);const p=1-c.move.remaining/c.move.total;c.pos=c.move.from+(c.move.to-c.move.from)*p;if(c.move.remaining<=0){c.pos=c.move.to;c.move=null;b.events.push({t:b.elapsed,type:'commander-position-arrived',lane:c.lane,pos:c.pos})}}if(travelBefore&&!c.travel){c.pos=clamp(travelBefore.targetPos??.30,.12,.86);c.travelTargetPos=null}}
function spawnAndSpatial(b,dt,pulseBefore,enemyBase){
  for(const lane of LANES){const ll=livingLane(b,lane),l=b.lanes[lane];if(l.pulseCount>pulseBefore[lane]){const reinforced=b.effects?.[lane]?.conscript>0;spawnFriendly(b,lane,false,reinforced)}ll.enemySpawnTimer-=dt;if(ll.enemySpawnTimer<=0){spawnEnemy(b,lane,false);ll.enemySpawnTimer=(lane==='north'?CFG.enemyCadenceNorth:CFG.enemyCadenceSouth)*(enemyBase[lane]>3.4?.92:1)}chooseTargets(ll);moveCohorts(b,lane,dt);chooseTargets(ll);damageCohorts(b,lane,dt);towerEffects(b,lane,dt);objectives(b,lane,dt);l.front=derivedFront(b,lane);cleanup(ll,b.elapsed)}
  if(b.gate<=0&&!b.result){b.result={kind:'victory',at:b.elapsed};b.events.push({t:b.elapsed,type:'victory',source:'living-lanes'})}else if(b.core<=0&&!b.lastStand?.active){b.lastStand={active:true,phase:'core-fallen',t:0,payable:true};b.events.push({t:b.elapsed,type:'core-fallen',source:'living-lanes'})}
  if(b.commander.health<=0&&!b.commander.incapacitated){b.commander.incapacitated=true;b.commander.reform=D.commander.reformTime;b.commander.health=0;b.commander.move=null;b.commander.travel=null;b.commander.lane=null;b.events.push({t:b.elapsed,type:'commander-incapacitated',source:'living-lanes'})}
}
E.createBattle=(run,deployment)=>ensureLiving(original.createBattle(run,deployment));
E.stepBattle=(b,dt)=>{
  ensureLiving(b);window.LW_ACTIVE_BATTLE=b;
  const pulseBefore=Object.fromEntries(LANES.map(id=>[id,b.lanes[id].pulseCount]));
  const enemyBase=Object.fromEntries(LANES.map(id=>[id,b.lanes[id].baseEnemyPower]));
  const saved=LANES.map(id=>({id,ally:b.lanes[id].allyBase,enemy:b.lanes[id].baseEnemyPower}));
  const travelBefore=b.commander.travel?{...b.commander.travel,targetPos:b.commander.travel.targetPos}:null;
  for(const s of saved){b.lanes[s.id].allyBase=0;b.lanes[s.id].baseEnemyPower=0}
  const out=original.stepBattle(b,dt);
  for(const s of saved){b.lanes[s.id].allyBase=s.ally;b.lanes[s.id].baseEnemyPower=s.enemy}
  stepCommanderSpatial(b,dt,travelBefore);
  spawnAndSpatial(b,dt,pulseBefore,enemyBase);
  return out;
};
function frontlinePos(b,lane){const F=alive(livingLane(b,lane).friendly);return F.length?clamp(Math.max(...F.map(c=>c.x))-.025,.15,.84):.30}
E.setCommanderPosition=(b,lane,pos)=>{
  ensureLiving(b);const c=b.commander;if(c.incapacitated||c.travel)return false;pos=clamp(pos,.12,.86);
  if(c.lane!==lane){const ok=E.setCommanderLane(b,lane);if(ok&&c.travel)c.travel.targetPos=pos;return ok}
  const from=c.pos??.30,dist=Math.abs(pos-from);if(dist<.01){c.pos=pos;return true}const total=Math.max(.35,dist/CFG.commanderSpeed);c.move={from,to:pos,total,remaining:total};b.events.push({t:b.elapsed,type:'commander-position-move',lane,from,to:pos});return true
};
E.setCommanderLane=(b,lane)=>{ensureLiving(b);const c=b.commander,fromPos=c.pos??.30;const ok=original.setCommanderLane(b,lane);if(ok&&c.travel){c.move=null;c.travel.fromPos=fromPos;c.travel.targetPos=frontlinePos(b,lane);c.pos=fromPos}return ok};
E.useAbility=(b,id,targetLane)=>{
  ensureLiving(b);const c=b.commander;if(!c||c.incapacitated)return false;const lane=targetLane||c.lane;if(!lane)return false;
  if(id==='sunder'){
    const ll=livingLane(b,lane),pos=c.pos??.3,enemy=alive(ll.enemy).filter(e=>Math.abs(e.x-pos)<=.085).sort((a,z)=>Math.abs(a.x-pos)-Math.abs(z.x-pos))[0];
    const before={front:b.lanes[lane].front,guard:b.lanes[lane].guard,gate:b.gate};b.lanes[lane].front=.2;const ok=original.useAbility(b,id,lane);b.lanes[lane].front=before.front;b.lanes[lane].guard=before.guard;b.gate=before.gate;if(!ok)return false;
    let burst=24;if(b.runEffects?.commander?.includes('cmd-sunder-echo'))burst+=6;const sappers=b.deployment?.[lane]?.units?.sapper||0;burst+=4*sappers;
    if(enemy)enemy.hp-=burst;else if(pos>=.79&&b.lanes[lane].guard>0){const prev=b.lanes[lane].guard;b.lanes[lane].guard=Math.max(0,prev-burst);if(prev>0&&b.lanes[lane].guard<=0){b.lanes[lane].guardDestroyedEver=true;b.gateVulnerabilityLatched=true;b.gateVulnerable=true}}else if(pos>=.82&&b.lanes[lane].guard<=0&&b.gateVulnerabilityLatched){let gateHit=18+(b.runEffects?.commander?.includes('cmd-sunder-echo')?5:0);if(b.runEffects?.upgrades?.includes('upgrade-ram-hook')&&(b.deployment?.[lane]?.units?.ram||0)>0)gateHit+=4;b.gate=Math.max(0,b.gate-gateHit);}
    b.events.push({t:b.elapsed,type:'spatial-sunder',lane,pos,target:enemy?.id||'objective'});return true;
  }
  const ok=original.useAbility(b,id,lane);if(!ok)return false;
  if(id==='rally')b.living.rally={lane,pos:c.pos??.3,until:b.elapsed+6};
  if(id==='waypoint'){c.move=null;c.pos=frontlinePos(b,lane);if(b.effects?.[lane]?.rally>0)b.living.rally={lane,pos:c.pos,until:b.elapsed+Math.min(4,b.effects[lane].rally)};b.events.push({t:b.elapsed,type:'spatial-waypoint',lane,pos:c.pos})}
  return true;
};
E.livingState=b=>b?.living||null;
E.frontlinePosition=frontlinePos;
E.selfTest=()=>{const base=original.selfTest(),run=E.newRun('living-lanes-regression'),b=E.createBattle(run,E.defaultDeployment());const startF=b.living.lanes.north.friendly[0].x,startE=b.living.lanes.north.enemy[0].x;for(let i=0;i<80;i++)E.stepBattle(b,.1);const moved=b.living.lanes.north.friendly.some(c=>c.x>startF)&&b.living.lanes.north.enemy.some(c=>c.x<startE);const countBefore=b.living.lanes.north.friendly.length;b.lanes.north.pulseTimer=.01;E.stepBattle(b,.02);const spawned=b.living.lanes.north.friendly.length>countBefore;const posBefore=b.commander.pos;E.setCommanderPosition(b,'north',.55);for(let i=0;i<40;i++)E.stepBattle(b,.1);const commanderMoved=(b.commander.pos||0)>posBefore;const checks={livingInit:!!b.living&&b.living.version===1,cohortsMove:moved,pulseSpawnsCohort:spawned,commanderSpatial:commanderMoved};return{pass:base.pass&&Object.values(checks).every(Boolean),checks:{...base.checks,...checks}}};
window.LW_LIVING={build:BUILD,cfg:CFG,ensureLiving,frontlinePos};
})();
