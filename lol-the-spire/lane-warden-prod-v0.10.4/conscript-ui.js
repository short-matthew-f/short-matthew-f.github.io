(() => {
'use strict';
const BUILD='P2-0.17.1';
const $=id=>document.getElementById(id);
function battle(){return window.LW_ACTIVE_BATTLE||null}
function ensureLaneBadges(){
  for(const card of document.querySelectorAll('#laneStrip [data-lane]')){
    if(card.querySelector('.ui-cons-badge'))continue;
    const s=document.createElement('span');s.className='ui-cons-badge';s.hidden=true;card.appendChild(s);
  }
}
function syncConscript(){
  const b=battle(),button=document.querySelector('#abilityRail button[data-id="conscript"]');
  if(!button)return;
  let detail=button.querySelector('.ui-ability-detail');
  if(!detail){detail=document.createElement('span');detail.className='ui-ability-detail';button.appendChild(detail)}
  if(!b){detail.textContent='NEXT 2 PULSES';return}
  const a=window.LW_ENGINE?.abilityAvailability?.(b,'conscript');
  const laneId=b.commander?.lane,lane=laneId?b.lanes?.[laneId]:null;
  const queued=lane?.reinforcementPulses||0,active=laneId&&b.effects?.[laneId]?.conscript>0;
  button.classList.toggle('ui-blocked',!!a&&!a.usable&&a.reason!=='COOLDOWN'&&a.reason!=='REFORM');
  if(a?.reason==='MOVING'||a?.reason==='NO LANE'||a?.reason==='NO UNITS'){
    button.disabled=true;
    const state=button.querySelector('.ui-ability-state');if(state)state.textContent=a.reason;
  }
  if(active&&queued>0)detail.textContent=`REINFORCED · ${queued} QUEUED`;
  else if(active)detail.textContent='REINFORCED NOW';
  else if(queued>0)detail.textContent=`${queued} PULSE${queued===1?'':'S'} QUEUED`;
  else detail.textContent='NEXT 2 PULSES';
}
function syncLaneBadges(){
  ensureLaneBadges();const b=battle();
  for(const card of document.querySelectorAll('#laneStrip [data-lane]')){
    const badge=card.querySelector('.ui-cons-badge'),laneId=card.dataset.lane,l=b?.lanes?.[laneId],active=b?.effects?.[laneId]?.conscript>0,q=l?.reinforcementPulses||0;
    if(active){badge.hidden=false;badge.textContent='REINFORCED'}
    else if(q>0){badge.hidden=false;badge.textContent=`REINF ×${q}`}
    else badge.hidden=true;
  }
}
function syncBuild(){document.querySelectorAll('.build-id').forEach(x=>x.textContent='0.17.1');const r=$('regression');if(r&&r.textContent)r.textContent=r.textContent.replace(/P1-0\.11\.0|P1-0\.11\.1|P1-0\.11\.2/g,BUILD)}
function sync(){syncConscript();syncLaneBadges();syncBuild()}
setInterval(sync,100);sync();
window.LW_CONSCRIPT_UI={build:BUILD};
})();
