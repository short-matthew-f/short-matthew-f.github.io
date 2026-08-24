(() => {
'use strict';
const E=window.LW_ENGINE,W=window.LW_REWARDS,F=window.LW_FIELDWORKS;
if(!E||!W||!F)return;
const BUILD='P2-0.20.0',NODE='A1-R1',NEXT='A1-GK',SALVAGE=160;
const BOONS=Object.freeze([
  Object.freeze({id:'rift-pathfold',name:'Pathfold Brand',tag:'MOVEMENT',description:'Normal Warden movement and cut-through routes are 18% faster.'}),
  Object.freeze({id:'rift-longfire',name:'Longfire Standard',tag:'PRESENCE',description:'Warden Presence reaches 25% farther along the occupied lane.'}),
  Object.freeze({id:'rift-ashwright',name:'Ashwright Pact',tag:'FIELDWORK',description:'The Warden completes strategic fieldworks 25% faster.'})
]);
const original={createBattle:E.createBattle.bind(E),stepBattle:E.stepBattle.bind(E),setCommanderPosition:E.setCommanderPosition?.bind(E),setCommanderLane:E.setCommanderLane.bind(E),selfTest:E.selfTest?.bind(E)};
const hash=s=>{let h=2166136261>>>0;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
function ensure(run){run=W.ensureRun(run);run.rift=run.rift||{version:1,opened:0,offer:null,completed:null,history:[]};run.rift.version=1;run.rift.history=run.rift.history||[];if(!run.rift.offer)run.rift.offer=JSON.parse(JSON.stringify(BOONS[hash(`${run.seed}|${NODE}|boon`)%BOONS.length]));return run}
function open(run){run=ensure(run);if(run.currentNode!==NODE||run.rift.completed)return null;run.rift.opened=(run.rift.opened||0)+1;return{run,boon:run.rift.offer,salvage:SALVAGE}}
function resolve(run,choice,now=new Date().toISOString()){
  run=ensure(run);if(run.currentNode!==NODE)return{ok:false,reason:'The Rift is not on the current road.'};if(run.rift.completed)return{ok:false,reason:'The Rift has already closed.'};
  let receipt;if(choice==='power'){if(run.embers<1)return{ok:false,reason:'No Ember remains to offer.'};run.embers--;if(!run.inventory.rift.includes(run.rift.offer.id))run.inventory.rift.push(run.rift.offer.id);receipt={choice,boon:JSON.parse(JSON.stringify(run.rift.offer)),emberCost:1,salvage:0,at:now}}
  else if(choice==='salvage'){run.salvage+=SALVAGE;receipt={choice,boon:null,emberCost:0,salvage:SALVAGE,at:now}}
  else return{ok:false,reason:'Unknown Rift choice.'};
  run.rift.completed=receipt;run.rift.history.push({type:'rift-resolved',...receipt});if(!run.resolvedNodes.some(x=>x.id===NODE))run.resolvedNodes.push({id:NODE,result:`rift-${choice}`,at:now,boonId:receipt.boon?.id||null,salvage:receipt.salvage,emberCost:receipt.emberCost});run.currentNode=NEXT;return{ok:true,run,receipt,nextNode:NEXT};
}
function openSaved(){const run=W.readSaved();if(!run)return null;const out=open(run);W.persist(run);return out}
function resolveSaved(choice){const run=W.readSaved();if(!run)return{ok:false,reason:'No active run.'};const out=resolve(run,choice);if(out.ok)W.persist(run);return out}
function has(b,id){return b?.runEffects?.rift?.includes(id)}
function quicken(t){if(!t||t.riftAdjusted)return;t.total*=.82;t.remaining*=.82;t.riftAdjusted=true}
E.createBattle=(run,deployment)=>{ensure(run);return original.createBattle(run,deployment)};
E.setCommanderLane=(b,lane)=>{const ok=original.setCommanderLane(b,lane);if(ok&&has(b,'rift-pathfold'))quicken(b.commander?.travel);return ok};
if(original.setCommanderPosition)E.setCommanderPosition=(b,lane,pos)=>{const ok=original.setCommanderPosition(b,lane,pos);if(ok&&has(b,'rift-pathfold')){quicken(b.commander?.move);quicken(b.commander?.travel)}return ok};
E.stepBattle=(b,dt)=>{const work=b?.commander?.work?.siteId,before=work?F.site(b,work)?.progress:null,out=original.stepBattle(b,dt);if(work&&before!=null&&has(b,'rift-ashwright')){const site=F.site(b,work),def=site?.kind&&F.kinds[site.kind];if(site&&def&&site.status==='building'){const gained=Math.max(0,site.progress-before);site.progress=Math.min(def.time,site.progress+gained*.25)}}return out};
E.selfTest=()=>{const base=original.selfTest?original.selfTest():{pass:true,checks:{}},a=E.newRun('rift-determinism'),b=E.newRun('rift-determinism');a.currentNode=b.currentNode=NODE;a.salvage=b.salvage=200;const same=open(a).boon.id===open(b).boon.id,embers=a.embers,power=resolve(a,'power','test'),powerApplied=power.ok&&a.embers===embers-1&&a.inventory.rift.includes(a.rift.completed.boon.id)&&a.currentNode===NEXT;const salvageBefore=b.salvage,emberBefore=b.embers,safe=resolve(b,'salvage','test'),salvageApplied=safe.ok&&b.salvage===salvageBefore+SALVAGE&&b.embers===emberBefore&&b.currentNode===NEXT;const checks={riftDeterministic:same,riftPowerSpendsEmber:powerApplied,riftSalvagePreservesEmber:salvageApplied,riftIrreversible:!resolve(a,'salvage','again').ok};return{pass:base.pass&&Object.values(checks).every(Boolean),checks:{...base.checks,...checks}}};
window.LW_RIFT={build:BUILD,nodeId:NODE,nextNode:NEXT,salvage:SALVAGE,boons:BOONS,ensure,open,openSaved,resolve,resolveSaved};
})();
