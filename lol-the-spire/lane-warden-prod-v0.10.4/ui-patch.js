(() => {
'use strict';
const BUILD='P2-0.15.2';
const $=id=>document.getElementById(id);
const battle=$('battle'),laneStrip=$('laneStrip'),readToggle=$('readToggle'),readPanel=$('readPanel'),targetPanel=$('targetPanel'),structurePanel=$('structurePanel');
if(!battle||!laneStrip)return;
let openLane=null,targetMode=false,lastAbilityState=new Map();
if($('structureButton')) $('structureButton').setAttribute('aria-hidden','true');
if(structurePanel) structurePanel.setAttribute('aria-hidden','true');
if(readToggle){readToggle.textContent='?';readToggle.setAttribute('aria-label','Tactical reference');readToggle.title='Tactical reference';}
const tray=document.createElement('div');tray.id='laneActionTray';tray.className='lane-action-tray';tray.hidden=true;tray.innerHTML=`<div class="lane-tray-head"><div><b id="laneTrayTitle">LANE ACTIONS</b><small id="laneTrayStatus">Select a lane</small></div><button id="laneTrayClose" class="lane-tray-close" type="button" aria-label="Close lane actions">×</button></div><div class="lane-tray-actions"><button id="uiFortify" type="button">FORTIFY<small>28g</small></button><button id="uiOvercharge" type="button">OVERCHARGE<small>36g</small></button><button id="uiReinforce" type="button">REINFORCE<small>30g · 2 pulses</small></button></div><small id="laneTrayFeedback" class="lane-tray-feedback"></small>`;battle.appendChild(tray);
const targetCancel=document.createElement('button');targetCancel.id='uiTargetCancel';targetCancel.className='ui-target-cancel';targetCancel.type='button';targetCancel.hidden=true;targetCancel.textContent='CANCEL WAYPOINT';battle.appendChild(targetCancel);
function laneButtons(){return [...laneStrip.querySelectorAll('[data-lane]')]}
function ensureLaneChips(){for(const card of laneButtons()){if(card.querySelector('.lane-move-chip'))continue;const chip=document.createElement('span');chip.className='lane-move-chip';chip.dataset.uiLane=card.dataset.lane;chip.textContent='WALK HERE';card.appendChild(chip)}}ensureLaneChips();
function positionTray(){if(tray.hidden||!openLane)return;const card=laneStrip.querySelector(`[data-lane="${openLane}"]`);if(!card)return;const cr=card.getBoundingClientRect(),br=battle.getBoundingClientRect();tray.style.left=`${Math.max(6,cr.left-br.left)}px`;tray.style.width=`${Math.max(230,cr.width)}px`;tray.style.bottom=`${Math.max(66,br.bottom-cr.top+5)}px`}
function closeTray(){openLane=null;tray.hidden=true;if(structurePanel)structurePanel.hidden=true}
function openTray(lane){openLane=lane;tray.hidden=false;if(structurePanel)structurePanel.hidden=false;positionTray();syncTray()}
function toggleTray(lane){if(openLane===lane)closeTray();else openTray(lane)}
function proxyClick(sourceId){const s=$(sourceId);if(s&&!s.disabled)s.click();setTimeout(syncTray,0)}
$('uiFortify').onclick=e=>{e.stopPropagation();proxyClick('fortifyTower')};$('uiOvercharge').onclick=e=>{e.stopPropagation();proxyClick('overchargeTower')};$('uiReinforce').onclick=e=>{e.stopPropagation();proxyClick('reinforceLane')};$('laneTrayClose').onclick=e=>{e.stopPropagation();closeTray()};targetCancel.onclick=e=>{e.stopPropagation();$('targetCancel')?.click();syncTargetMode()};
readPanel?.addEventListener('click',e=>{if(e.target.closest('#readAbilityList button')){e.preventDefault();e.stopImmediatePropagation()}},true);
$('abilityRail')?.addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(!b)return;if(b.dataset.id==='waypoint'&&targetMode){e.preventDefault();e.stopImmediatePropagation();$('targetCancel')?.click();syncTargetMode()}},true);
laneStrip.addEventListener('click',e=>{const card=e.target.closest('[data-lane]');if(!card)return;const lane=card.dataset.lane;if(targetMode){e.preventDefault();e.stopImmediatePropagation();targetPanel?.querySelector(`[data-target="${lane}"]`)?.click();syncTargetMode();closeTray();return}if(e.target.closest('.lane-move-chip')){document.querySelector(`[data-walk="${lane}"]`)?.click();closeTray();return}toggleTray(lane)});
document.addEventListener('pointerdown',e=>{const t=e.target;if(!battle||battle.hidden)return;if(openLane&&!tray.contains(t)&&!t.closest('#laneStrip'))closeTray();if(readPanel&&!readPanel.hidden&&!readPanel.contains(t)&&t!==readToggle&&!t.closest('#readToggle'))readToggle?.click();if(targetMode&&!t.closest('#laneStrip')&&!t.closest('#abilityRail')&&!t.closest('#uiTargetCancel')){$('targetCancel')?.click();syncTargetMode()}},true);
function syncReference(){if(!readToggle||!readPanel)return;const open=!readPanel.hidden;readToggle.textContent=open?'×':'?';readToggle.setAttribute('aria-expanded',String(open));const intro=readPanel.firstElementChild;if(intro){const b=intro.querySelector('b'),s=intro.querySelector('small');if(b)b.textContent='TACTICAL REFERENCE';if(s)s.textContent='Protected reading is active while this reference is open. Abilities are used from the right rail; lane actions live in the lane cards.'}for(const b of readPanel.querySelectorAll('#readAbilityList button')){b.tabIndex=-1;b.setAttribute('aria-disabled','true')}}
function syncAbilities(){
 const bs=window.LW_ACTIVE_BATTLE||null;
 for(const b of document.querySelectorAll('#abilityRail button[data-id]')){
  let state='ready',label='READY';
  const a=bs&&window.LW_ENGINE?.abilityAvailability?.(bs,b.dataset.id);
  if(a){
    if(!a.usable){if(a.reason==='COOLDOWN'){state='cooldown';label=`${Math.ceil(a.seconds||0)}s`}else{state='down';label=a.reason||'DOWN'}}
    b.disabled=!a.usable;
  }else{
    const cd=parseFloat(b.title);if(b.disabled){if(Number.isFinite(cd)&&cd>0){state='cooldown';label=`${Math.ceil(cd)}s`}else{state='down';label='DOWN'}}
  }
  const prev=lastAbilityState.get(b.dataset.id);b.classList.toggle('ui-ready',state==='ready');b.classList.toggle('ui-cooldown',state==='cooldown');b.classList.toggle('ui-down',state==='down');
  let s=b.querySelector('.ui-ability-state');if(!s){s=document.createElement('span');s.className='ui-ability-state';b.appendChild(s)}s.textContent=label;
  if(prev&&prev!=='ready'&&state==='ready'){b.classList.remove('ui-ready-ping');void b.offsetWidth;b.classList.add('ui-ready-ping');setTimeout(()=>b.classList.remove('ui-ready-ping'),750)}lastAbilityState.set(b.dataset.id,state)
 }
}
function syncTargetMode(){targetMode=!!targetPanel&&!targetPanel.hidden;laneStrip.classList.toggle('ui-targeting',targetMode);targetCancel.hidden=!targetMode}
function syncLaneChips(){ensureLaneChips();for(const card of laneButtons()){const chip=card.querySelector('.lane-move-chip'),cmd=card.querySelector('[id$="Cmd"]')?.textContent?.trim(),extra=card.querySelector('[id$="Extra"]')?.textContent?.trim();chip.classList.remove('current','moving');if(targetMode){chip.textContent='WAYPOINT HERE';continue}if(cmd){chip.textContent='COMMANDER';chip.classList.add('current')}else if(extra==='WALKING'){chip.textContent='MOVING';chip.classList.add('moving')}else chip.textContent='WALK HERE'}}
function syncTray(){if(tray.hidden||!openLane)return;const title=$('structureTitle')?.textContent||`${openLane.toUpperCase()} ACTIONS`,status=$('structureStatus')?.textContent||'';$('laneTrayTitle').textContent=title;$('laneTrayStatus').textContent=status;$('laneTrayFeedback').textContent=$('purchaseFeedback')?.textContent||'';for(const [ui,src] of[['uiFortify','fortifyTower'],['uiOvercharge','overchargeTower'],['uiReinforce','reinforceLane']]){const a=$(ui),b=$(src);if(a&&b)a.disabled=b.disabled}positionTray()}
function syncBuildMarker(){document.querySelectorAll('.build-id').forEach(el=>el.textContent='0.15.2')}
function sync(){syncReference();syncAbilities();syncTargetMode();syncLaneChips();syncTray();syncBuildMarker()}
setInterval(sync,120);addEventListener('resize',positionTray);addEventListener('orientationchange',()=>setTimeout(positionTray,80));sync();window.LW_UI_PATCH={build:BUILD};
})();