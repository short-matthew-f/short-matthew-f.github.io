(() => {
'use strict';
const F=window.LW_FORGE;if(!F)return;
const $=id=>document.getElementById(id),screens=['home','map','deployment','battle','resolution','lastStand','reward','forge'];
const esc=s=>String(s??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
let current=null;
function hideAll(){for(const id of screens){const el=$(id);if(el)el.hidden=true}}
function receipt(completed){
  hideAll();$('forge').hidden=false;$('forgeChoice').hidden=true;$('forgeReceipt').hidden=false;
  $('forgeReceiptName').textContent=completed.project.name;$('forgeReceiptEffect').textContent=completed.project.forge.preview;
  $('forgeReceiptCost').textContent=`${completed.cost} SALVAGE SPENT · INSTALLED FOR THIS RUN`;
}
function render(){
  const opened=F.openSaved();if(!opened)return false;current=opened.run;hideAll();$('forge').hidden=false;$('forgeChoice').hidden=false;$('forgeReceipt').hidden=true;
  $('forgeSalvage').textContent=`${current.salvage} SALVAGE`;$('forgeThesis').textContent=`THESIS · ${(current.thesis||'OPEN').toUpperCase()}`;
  const host=$('forgeProjects');host.innerHTML='';
  for(const p of opened.offers){const card=document.createElement('article'),can=current.salvage>=p.forge.cost;card.className='forge-project';card.innerHTML=`<div class="forge-project-art"><i></i><i></i><i></i></div><span>${esc(p.target.kind.toUpperCase())} PROJECT · ${esc(p.quality.toUpperCase())}</span><h2>${esc(p.name)}</h2><small>${esc((p.tags||[]).join(' · '))}</small><p>${esc(p.description)}</p><div class="forge-consequence"><b>NEXT-BATTLE CONSEQUENCE</b><strong>${esc(p.forge.preview)}</strong></div><button ${can?'':'disabled'} data-forge="${esc(p.id)}">${can?`INSTALL · ${p.forge.cost} SALVAGE`:`NEED ${p.forge.cost} SALVAGE`}</button>`;host.appendChild(card)}
  host.querySelectorAll('[data-forge]').forEach(b=>b.onclick=()=>{const result=F.installSaved(b.dataset.forge);if(result.ok)receipt(result.run.forge.completed);else{$('forgeFeedback').textContent=result.reason;render()}});
  $('forgeFeedback').textContent=opened.offers.length?'Choose one project. The other plans are lost when you leave.':'No legal projects remain for the equipment you own.';return true;
}
window.addEventListener('lw:node-open',e=>{if(e.detail?.nodeId===F.nodeId)render()});
$('forgeReturn').onclick=()=>{sessionStorage.setItem('lw-forge-return','1');location.reload()};
if(sessionStorage.getItem('lw-forge-return')==='1'){sessionStorage.removeItem('lw-forge-return');setTimeout(()=>$('continueRun')?.onclick?.(),0)}
window.LW_FORGE_UI={build:'P2-0.18.0',render};
})();
