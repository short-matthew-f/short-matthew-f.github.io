(() => {
'use strict';
const BUILD='P2-0.18.0',E=window.LW_ENGINE,F=window.LW_FIELDWORKS;
const battle=document.getElementById('battle');if(!battle||!E||!F)return;
let selected=null,feedback='';
const panel=document.createElement('section');panel.id='fieldworkPanel';panel.className='fieldwork-panel';panel.hidden=true;panel.setAttribute('aria-label','Strategic fieldworks');
panel.innerHTML=`<header><div><b id="fieldworkTitle">STRATEGIC FIELDWORKS</b><small id="fieldworkStatus">Select a marked site</small></div><button id="fieldworkClose" type="button" aria-label="Close fieldworks">×</button></header><div class="fieldwork-progress"><i id="fieldworkProgress"></i></div><div id="fieldworkActions" class="fieldwork-actions"></div><small id="fieldworkFeedback" class="fieldwork-feedback"></small>`;
battle.appendChild(panel);
const $=id=>document.getElementById(id),active=()=>window.LW_ACTIVE_BATTLE||null;
function select(id){const b=active();if(!b)return;const r=F.selectSite(b,id);selected=id;feedback=r.ok?'Route committed. Construction requires the Warden on site.':r.reason;panel.hidden=false;sync()}
function close(){panel.hidden=true;selected=null;feedback=''}
function actionButton(label,sub,disabled,onclick,cls=''){const b=document.createElement('button');b.type='button';b.className=cls;b.disabled=disabled;b.innerHTML=`<b>${label}</b><small>${sub}</small>`;b.onclick=e=>{e.stopPropagation();onclick()};return b}
function build(kind){const b=active(),r=E.beginFieldwork?.(b,selected,kind);feedback=r?.ok?`${F.kinds[kind].name} committed. Stay here to finish it.`:r?.reason||'Unavailable';sync()}
function resume(){const b=active(),r=E.resumeFieldwork?.(b,selected);feedback=r?.ok?'Work resumed. Tap elsewhere to pause without losing progress.':r?.reason||'Unavailable';sync()}
function go(){const b=active(),r=F.selectSite(b,selected);feedback=r?.ok?'Warden is moving to the site.':r?.reason||'Unavailable';sync()}
function sync(){
  const b=active();if(!b||!selected||panel.hidden)return;F.ensure(b);const s=E.fieldworkState?.(b,selected),c=b.commander;if(!s){close();return}
  $('fieldworkTitle').textContent=s.name;const d=s.definition,at=c.atSite===s.id,approaching=c.fieldTarget===s.id||c.siteTravel?.siteId===s.id,working=c.work?.siteId===s.id;
  let status='EMPTY WORKSITE';if(approaching)status=c.siteTravel?'APPROACHING SITE':'WALKING TO SITE';else if(working)status=`BUILDING · ${d?.name}`;else if(s.status==='building')status=`PAUSED · ${d?.name}`;else if(s.status==='complete')status=s.kind==='muster'&&!s.controlled?'MUSTER CAMP · CONTESTED':`${d?.name} · ACTIVE`;else if(at)status='WARDEN ON SITE · CHOOSE A PLAN';else status='WARDEN ELSEWHERE';
  $('fieldworkStatus').textContent=status;const p=d?Math.max(0,Math.min(1,s.progress/d.time)):0;$('fieldworkProgress').style.width=`${Math.round(p*100)}%`;
  const actions=$('fieldworkActions');actions.innerHTML='';
  if(s.status==='empty')for(const kind of ['tower','muster','relay']){const k=F.kinds[kind];actions.appendChild(actionButton(k.name,`${k.cost}g · ${k.time}s`,!at||b.gold<k.cost,()=>build(kind)))}
  else if(s.status==='building'){actions.appendChild(actionButton(working?'BUILDING':'RESUME WORK',working?`${s.remaining.toFixed(1)}s remaining`:`${s.remaining.toFixed(1)}s · progress saved`,!at||working,resume,'wide'));if(!at&&!approaching)actions.appendChild(actionButton('RETURN TO SITE','Resume without paying again',false,go,'wide'))}
  else actions.appendChild(actionButton(s.kind==='tower'?'TOWER HOLDING':s.kind==='muster'?(s.controlled?'REINFORCEMENTS FORWARD':'CAMP CONTESTED'):'CUT-THROUGH RELAY',s.kind==='muster'?'Scheduled cohorts only · no free units':s.kind==='relay'?'Matching crossing travel −22%':'Autonomous local fire',true,'','wide'));
  $('fieldworkFeedback').textContent=feedback||(at?'Building suspends Presence. Progress persists if you leave.':'Tap the marked site again to return.');
}
$('fieldworkClose').onclick=e=>{e.stopPropagation();close()};
addEventListener('lw-fieldsite-selected',e=>{selected=e.detail?.siteId||null;feedback='';panel.hidden=!selected;sync()});
document.addEventListener('pointerdown',e=>{if(panel.hidden||panel.contains(e.target)||e.target.closest('#laneStrip')||e.target.closest('#abilityRail'))return;if(!e.target.closest('#battlefield')&&!e.target.closest('#livingBattlefield'))close()},true);
setInterval(sync,100);window.LW_FIELDWORKS_UI={build:BUILD,select,close};
})();
