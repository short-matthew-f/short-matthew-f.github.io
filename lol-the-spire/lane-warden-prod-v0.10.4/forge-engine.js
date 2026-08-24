(() => {
'use strict';
const E=window.LW_ENGINE,RD=window.LW_REWARD_DATA,W=window.LW_REWARDS;
if(!E||!RD||!W)return;
const BUILD='P2-0.18.0',NODE='A1-F1',NEXT='A1-B3';
const clone=v=>JSON.parse(JSON.stringify(v));
function hash(s){let h=2166136261>>>0;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function targetOwned(run,item){const list=item.target?.kind==='tower'?run.inventory.towers:run.inventory.units;return!!item.target&&list.includes(item.target.id)}
function legalProjects(run){
  run=W.ensureRun(run);const owned=new Set(run.inventory.upgrades||[]);
  return (RD.catalog.upgrade||[]).filter(x=>x.forge&&targetOwned(run,x)&&!owned.has(x.id));
}
function rollOffers(run){
  const thesis=run.thesis,seed=`${run.seed}|${NODE}|forge-v1`;
  return legalProjects(run).slice().sort((a,b)=>{
    const am=(a.thesis||[]).includes(thesis)?0:1,bm=(b.thesis||[]).includes(thesis)?0:1;
    return am-bm||(hash(`${seed}|${a.id}`)-hash(`${seed}|${b.id}`));
  }).slice(0,3).map(clone);
}
function ensure(run){
  run=W.ensureRun(run);run.forge=run.forge||{version:1,visits:0,offers:null,completed:null,history:[]};
  run.forge.version=1;run.forge.history=run.forge.history||[];
  if(!run.forge.completed&&!Array.isArray(run.forge.offers))run.forge.offers=rollOffers(run);
  return run;
}
function open(run){run=ensure(run);if(run.currentNode!==NODE||run.forge.completed)return null;run.forge.visits=(run.forge.visits||0)+1;return{run,offers:run.forge.offers};}
function install(run,id,now=new Date().toISOString()){
  run=ensure(run);if(run.currentNode!==NODE)return{ok:false,reason:'The Forge is not on the current road.'};
  if(run.forge.completed)return{ok:false,reason:'One permanent project is already installed.'};
  const item=(run.forge.offers||[]).find(x=>x.id===id);if(!item)return{ok:false,reason:'That project is not available.'};
  if(!targetOwned(run,item))return{ok:false,reason:'The target is not owned.'};
  if(run.inventory.upgrades.includes(item.id))return{ok:false,reason:'That project is already installed.'};
  const cost=item.forge.cost;if(run.salvage<cost)return{ok:false,reason:`Need ${cost} Salvage.`};
  run.salvage-=cost;run.inventory.upgrades.push(item.id);
  run.forge.completed={project:clone(item),cost,at:now};run.forge.history.push({type:'forge-installed',id:item.id,cost,at:now});
  if(!run.resolvedNodes.some(x=>x.id===NODE))run.resolvedNodes.push({id:NODE,result:'forge',projectId:item.id,cost,at:now});
  run.currentNode=NEXT;return{ok:true,run,project:item,cost,nextNode:NEXT};
}
function openSaved(){const run=W.readSaved();if(!run)return null;const result=open(run);W.persist(run);return result}
function installSaved(id){const run=W.readSaved();if(!run)return{ok:false,reason:'No active run.'};const result=install(run,id);if(result.ok)W.persist(run);return result}
const originalSelfTest=E.selfTest?.bind(E);
E.selfTest=()=>{
  const base=originalSelfTest?originalSelfTest():{pass:true,checks:{}},run=E.newRun('forge-regression');run.currentNode=NODE;run.salvage=280;
  const opened=open(run),offers=opened?.offers||[],ownedOnly=offers.every(x=>targetOwned(run,x)),unique=new Set(offers.map(x=>x.id)).size===offers.length;
  const before=run.salvage,chosen=offers[0],first=chosen&&install(run,chosen.id,'test-time'),saved=first?.ok&&run.salvage===before-chosen.forge.cost&&run.inventory.upgrades.includes(chosen.id)&&run.currentNode===NEXT&&run.resolvedNodes.some(x=>x.id===NODE);
  const second=chosen&&!install(run,chosen.id,'test-time-2').ok;
  const checks={forgeThreeLegalOffers:offers.length===3&&ownedOnly&&unique,forgePersistentInstall:!!saved,forgeOneProjectOnly:!!second};
  return{pass:base.pass&&Object.values(checks).every(Boolean),checks:{...base.checks,...checks}};
};
window.LW_FORGE={build:BUILD,nodeId:NODE,nextNode:NEXT,ensure,open,openSaved,install,installSaved,legalProjects};
})();
