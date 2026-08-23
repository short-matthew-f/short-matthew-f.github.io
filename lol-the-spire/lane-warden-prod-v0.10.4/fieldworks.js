(() => {
'use strict';
const E=window.LW_ENGINE,L=window.LW_LIVING;
if(!E||!L)return;
const BUILD='P2-0.17.0';
const original={
  createBattle:E.createBattle.bind(E),stepBattle:E.stepBattle.bind(E),
  setCommanderPosition:E.setCommanderPosition.bind(E),setCommanderLane:E.setCommanderLane.bind(E),
  useAbility:E.useAbility.bind(E),abilityAvailability:E.abilityAvailability?.bind(E),selfTest:E.selfTest?.bind(E)
};
const KINDS=Object.freeze({
  tower:Object.freeze({id:'tower',name:'TOWER EMPLACEMENT',cost:32,time:8,description:'Autonomous fire controls this stretch of road.'}),
  muster:Object.freeze({id:'muster',name:'MUSTER CAMP',cost:38,time:9,description:'Controlled reinforcements enter from this camp.'}),
  relay:Object.freeze({id:'relay',name:'FIELD RELAY',cost:28,time:7,description:'Shortens travel through the paired cut-through.'})
});
const LAYOUT=Object.freeze([
  Object.freeze({id:'north-rear',lane:'north',role:'rear',pos:.31,offset:-.17,name:'NORTH RIDGEWORKS'}),
  Object.freeze({id:'north-forward',lane:'north',role:'forward',pos:.68,offset:-.17,name:'NORTH FORWARD WORKS'}),
  Object.freeze({id:'south-rear',lane:'south',role:'rear',pos:.31,offset:.17,name:'SOUTH CREEKWORKS'}),
  Object.freeze({id:'south-forward',lane:'south',role:'forward',pos:.68,offset:.17,name:'SOUTH FORWARD WORKS'})
]);
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function freshSite(d){return{...d,kind:null,status:'empty',progress:0,costPaid:false,completedAt:null,towerHp:0,towerMaxHp:0}}
function ensure(b){
  if(!b)return b;
  if(!b.fieldworks)b.fieldworks={version:1,build:BUILD,sites:LAYOUT.map(freshSite)};
  else{
    b.fieldworks.version=1;b.fieldworks.build=BUILD;
    const existing=new Map((b.fieldworks.sites||[]).map(s=>[s.id,s]));
    b.fieldworks.sites=LAYOUT.map(d=>{const s=existing.get(d.id)||freshSite(d),defaults=freshSite(d);for(const [k,v] of Object.entries(defaults))if(s[k]===undefined)s[k]=v;Object.assign(s,{id:d.id,lane:d.lane,role:d.role,pos:d.pos,offset:d.offset,name:d.name});return s});
  }
  return b;
}
function sites(b){ensure(b);return b?.fieldworks?.sites||[]}
function site(b,id){return sites(b).find(s=>s.id===id)||null}
function def(kind){return KINDS[kind]||null}
function pauseWork(b,reason='left-site'){
  const c=b?.commander;if(!c?.work)return false;
  const s=site(b,c.work.siteId);if(s&&s.status==='building')b.events?.push({t:b.elapsed,type:'fieldwork-paused',site:s.id,kind:s.kind,progress:s.progress,reason});
  c.work=null;return true;
}
function leaveSite(b,reason='move'){
  const c=b?.commander;if(!c)return;
  pauseWork(b,reason);c.atSite=null;c.siteTravel=null;c.fieldTarget=null;
}
function selectSite(b,id){
  ensure(b);const s=site(b,id),c=b?.commander;
  if(!s||!c||c.incapacitated||b.result||b.lastStand?.active)return{ok:false,reason:'Unavailable'};
  if(c.atSite===id){b.events.push({t:b.elapsed,type:'fieldwork-site-selected',site:s.id,lane:s.lane,pos:s.pos});return{ok:true,site:s}}
  leaveSite(b,'new-destination');c.fieldTarget=s.id;
  let ok=original.setCommanderPosition(b,s.lane,s.pos);
  if(!ok&&c.lane===s.lane&&!c.travel&&!c.move&&Math.abs((c.pos??.3)-s.pos)<.012)ok=true;
  if(!ok){c.fieldTarget=null;return{ok:false,reason:'Cannot reach site'}}
  b.events.push({t:b.elapsed,type:'fieldwork-site-selected',site:s.id,lane:s.lane,pos:s.pos});
  return{ok:true,site:s};
}
function begin(b,id,kind){
  ensure(b);const s=site(b,id),d=def(kind),c=b?.commander;
  if(!s||!d||!c||c.incapacitated||b.result||b.lastStand?.active)return{ok:false,reason:'Unavailable'};
  if(c.atSite!==id)return{ok:false,reason:'Warden must be on site'};
  if(s.status==='complete')return{ok:false,reason:'Site already complete'};
  if(s.kind&&s.kind!==kind)return{ok:false,reason:`Committed to ${def(s.kind)?.name||s.kind}`};
  if(!s.kind){if(b.gold<d.cost)return{ok:false,reason:`Need ${d.cost}g`};b.gold-=d.cost;s.kind=kind;s.status='building';s.costPaid=true;b.events.push({t:b.elapsed,type:'fieldwork-committed',site:id,lane:s.lane,kind,cost:d.cost})}
  s.status='building';c.work={siteId:id,kind:s.kind};b.events.push({t:b.elapsed,type:'fieldwork-resumed',site:id,kind:s.kind,progress:s.progress});return{ok:true,site:s};
}
function resume(b,id){const s=site(b,id);return begin(b,id,s?.kind)}
function siteControlled(b,s){
  const ll=b?.living?.lanes?.[s.lane];if(!ll)return false;
  const enemies=(ll.enemy||[]).filter(c=>c.hp>0&&Math.abs(c.x-s.pos)<=.075);
  const friends=(ll.friendly||[]).filter(c=>c.hp>0);const front=friends.length?Math.max(...friends.map(c=>c.x)):.09;
  return enemies.length===0&&front>=s.pos-.065;
}
function musterSpawn(b,lane){const ready=sites(b).filter(s=>s.lane===lane&&s.kind==='muster'&&s.status==='complete'&&siteControlled(b,s));return ready.length?Math.max(...ready.map(s=>s.pos-.012)):null}
function relayMultiplier(b,crossing,fromLane,toLane){
  const x=window.LW_MOVEMENT?.crossings?.find(c=>c.id===crossing)?.x;if(x==null)return 1;
  return sites(b).some(s=>s.kind==='relay'&&s.status==='complete'&&(s.lane===fromLane||s.lane===toLane)&&Math.abs(s.pos-x)<=.075)?.78:1;
}
function towerFire(b,s,dt){
  if(s.kind!=='tower'||s.status!=='complete'||s.towerHp<=0)return;
  const ll=b?.living?.lanes?.[s.lane],targets=(ll?.enemy||[]).filter(c=>c.hp>0&&Math.abs(c.x-s.pos)<=.145).sort((a,z)=>Math.abs(a.x-s.pos)-Math.abs(z.x-s.pos));
  if(targets[0]){targets[0].hp-=.72*dt;s.firingAt=targets[0].id;s.firingUntil=b.elapsed+.12}else if((s.firingUntil||0)<=b.elapsed)s.firingAt=null;
}
function finish(b,s){const d=def(s.kind);s.progress=d.time;s.status='complete';s.completedAt=b.elapsed;if(s.kind==='tower'){s.towerHp=90;s.towerMaxHp=90}b.commander.work=null;b.events.push({t:b.elapsed,type:'fieldwork-complete',site:s.id,lane:s.lane,kind:s.kind})}
function advanceArrival(b,dt){
  const c=b.commander;if(!c||c.incapacitated)return;
  if(c.fieldTarget&&!c.travel&&!c.move&&!c.siteTravel){const s=site(b,c.fieldTarget);if(s&&c.lane===s.lane&&Math.abs((c.pos??.3)-s.pos)<.015)c.siteTravel={siteId:s.id,total:.9,remaining:.9}}
  if(c.siteTravel){c.siteTravel.remaining=Math.max(0,c.siteTravel.remaining-dt);if(c.siteTravel.remaining<=0){c.atSite=c.siteTravel.siteId;c.fieldTarget=null;c.siteTravel=null;b.events.push({t:b.elapsed,type:'fieldwork-site-arrived',site:c.atSite})}}
}
E.createBattle=(run,deployment)=>ensure(original.createBattle(run,deployment));
E.stepBattle=(b,dt)=>{ensure(b);const before=b.elapsed||0,out=original.stepBattle(b,dt),sd=Math.max(0,(b.elapsed||0)-before);advanceArrival(b,sd);const c=b.commander;if(c?.work){const s=site(b,c.work.siteId),d=def(s?.kind);if(!s||!d||c.incapacitated||c.atSite!==s.id)pauseWork(b,'interrupted');else{s.progress=clamp((s.progress||0)+sd,0,d.time);if(s.progress>=d.time)finish(b,s)}}for(const s of sites(b))towerFire(b,s,sd);return out};
E.setCommanderPosition=(b,lane,pos)=>{ensure(b);leaveSite(b,'move');return original.setCommanderPosition(b,lane,pos)};
E.setCommanderLane=(b,lane)=>{ensure(b);leaveSite(b,'change-lane');return original.setCommanderLane(b,lane)};
E.useAbility=(b,id,targetLane)=>{ensure(b);const c=b?.commander;if(c&&(c.work||c.atSite||c.siteTravel||c.fieldTarget)){if(id!=='waypoint'){b.events?.push({t:b.elapsed,type:'ability-blocked',id,reason:'fieldwork'});return false}leaveSite(b,'waypoint')}return original.useAbility(b,id,targetLane)};
if(original.abilityAvailability)E.abilityAvailability=(b,id)=>{const a=original.abilityAvailability(b,id);if(a.usable&&id!=='waypoint'&&(b?.commander?.work||b?.commander?.atSite||b?.commander?.siteTravel||b?.commander?.fieldTarget))return{usable:false,reason:'FIELDWORK'};return a};
E.selectFieldSite=selectSite;E.beginFieldwork=begin;E.resumeFieldwork=resume;E.pauseFieldwork=b=>pauseWork(b,'manual');E.fieldworkSites=sites;E.fieldworkState=(b,id)=>{const s=site(b,id);if(!s)return null;const d=def(s.kind);return{...s,definition:d,remaining:d?Math.max(0,d.time-s.progress):0,controlled:s.kind==='muster'&&s.status==='complete'?siteControlled(b,s):null}};
E.selfTest=()=>{const base=original.selfTest?original.selfTest():{pass:true,checks:{}},b=E.createBattle(E.newRun('fieldworks-regression'),E.defaultDeployment()),s=site(b,'north-rear');b.commander.lane='north';b.commander.pos=s.pos;b.commander.atSite=s.id;const gold=b.gold,started=begin(b,s.id,'tower').ok&&b.gold===gold-KINDS.tower.cost;E.stepBattle(b,1);const partial=s.progress>0&&s.progress<KINDS.tower.time;E.setCommanderPosition(b,'north',.5);const preserved=s.progress>0&&!b.commander.work; b.commander.move=null;b.commander.pos=s.pos;b.commander.atSite=s.id;resume(b,s.id);for(let i=0;i<90&&s.status!=='complete';i++)E.stepBattle(b,.1);const completed=s.status==='complete'&&s.towerHp===90;const b2=E.createBattle(E.newRun('fieldworks-muster'),E.defaultDeployment()),m=site(b2,'north-rear');m.kind='muster';m.status='complete';b2.living.lanes.north.friendly[0].x=.5;const muster=musterSpawn(b2,'north')>.25;const r=site(b2,'north-forward');r.kind='relay';r.status='complete';const relay=relayMultiplier(b2,'ridge-cut','north','south')<1;const checks={fieldworksInit:sites(b).length===4,fieldworkCostsTime:started&&partial,fieldworkProgressPersists:preserved,fieldworkCompletes:completed,musterControlledSpawn:muster,relayShortensRoute:relay};return{pass:base.pass&&Object.values(checks).every(Boolean),checks:{...base.checks,...checks}}};
window.LW_FIELDWORKS={build:BUILD,kinds:KINDS,layout:LAYOUT,ensure,sites,site,selectSite,begin,resume,musterSpawn,relayMultiplier,siteControlled};
})();
