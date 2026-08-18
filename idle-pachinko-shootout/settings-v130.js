(function(){
'use strict';
if(window.__ipsSettings130)return;
window.__ipsSettings130=true;

var VERSION='1.13.1';
var ENGINE_KEY='ips-v7';
var PEG_LEDGER_KEY='ips-peg-state-v2';
var OLD_PEG_KEY='ips-peg-meta-v1';
var PEG_TYPES=['fire','split','pierce','boom','chain'];
var RESET_KEYS=['idle-pachinko-shootout-v01','idle-pachinko-shootout-v0.1','ips-v1','ips-v2','ips-v3','ips-v4','ips-v5','ips-v6','ips-v7','ips-v8','ips-v9','ips-v10','ips-idle-v1','ips-telemetry-v1','ips-campaign-v1','ips-contracts-v1','ips-combat-telemetry-v1','ips-blueprints-v1','ips-loot-v1','ips-peg-meta-v1','ips-peg-state-v2','ips-onboarding-v1'];

function $(id){return document.getElementById(id);}
function readJson(key){try{var r=localStorage.getItem(key);return r?JSON.parse(r):null;}catch(e){return null;}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}
function open(id){var el=$(id);if(el)el.classList.remove('hidden');}
function close(id){var el=$(id);if(el)el.classList.add('hidden');}

// One-time compatibility migration. Older builds kept peg levels in a shadow
// ledger because the legacy save merger discarded dynamic peg-position keys.
// v1.13 restores those keys natively, so hydrate once before engine startup,
// retire the shadow keys, and leave ips-v7 as the single source of truth.
function migratePegLedger(){
  var engine=readJson(ENGINE_KEY),ledger=readJson(PEG_LEDGER_KEY)||readJson(OLD_PEG_KEY),placements,i,j,t,idx,key,src,dst,arr;
  if(!engine||!ledger||!ledger.pegMeta)return;
  placements=engine.placements||ledger.placements||{};
  engine.pegMeta=engine.pegMeta||{};
  for(i=0;i<PEG_TYPES.length;i++){
    t=PEG_TYPES[i];
    engine.pegMeta[t]=engine.pegMeta[t]||{};
    arr=placements[t]||[];
    for(j=0;j<arr.length;j++){
      idx=arr[j];key=String(idx);
      src=(ledger.pegMeta[t]&&ledger.pegMeta[t][key])||null;
      if(!src)continue;
      dst=engine.pegMeta[t][key]||{};
      dst.level=Math.max(Number(dst.level||0),Number(src.level||0));
      dst.invested=Math.max(Number(dst.invested||0),Number(src.invested||0));
      engine.pegMeta[t][key]=dst;
    }
  }
  writeJson(ENGINE_KEY,engine);
  try{localStorage.removeItem(PEG_LEDGER_KEY);localStorage.removeItem(OLD_PEG_KEY);}catch(e){}
}
migratePegLedger();

function resetInputState(){var input=$('resetConfirmInput'),button=$('confirmGameReset');if(input)input.value='';if(button){button.disabled=true;button.textContent='PERMANENTLY RESET GAME';}}
function removeGameData(){var i,k,remove=[];for(i=0;i<RESET_KEYS.length;i++){try{localStorage.removeItem(RESET_KEYS[i]);}catch(e){}}try{for(i=0;i<localStorage.length;i++){k=localStorage.key(i)||'';if(/^ips-(v\d+|idle-|telemetry-|campaign-|contracts-|combat-telemetry-|blueprints-|loot-|peg-|onboarding-)/.test(k)||/^idle-pachinko-shootout/.test(k))remove.push(k);}for(i=0;i<remove.length;i++)localStorage.removeItem(remove[i]);}catch(e){}}
function markVersion(){document.title='Idle Pachinko Shootout — v'+VERSION;var brand=document.querySelector('.brand small');if(brand)brand.textContent=' v'+VERSION;var meta=document.querySelector('#settingsModal .settings-meta');if(meta){var bs=meta.querySelectorAll('b');if(bs.length)bs[0].textContent='v'+VERSION;}}
function bind(){
  markVersion();
  var settings=$('settingsButton'),closeSettings=$('closeSettings'),reset=$('resetGameButton'),cancel=$('cancelGameReset'),input=$('resetConfirmInput'),confirm=$('confirmGameReset'),settingsModal=$('settingsModal');
  if(settings)settings.onclick=function(){markVersion();open('settingsModal');};
  if(closeSettings)closeSettings.onclick=function(){close('settingsModal');};
  if(reset)reset.onclick=function(){resetInputState();open('resetConfirmModal');setTimeout(function(){if(input)input.focus();},60);};
  if(cancel)cancel.onclick=function(){close('resetConfirmModal');resetInputState();};
  if(input)input.addEventListener('input',function(){if(confirm)confirm.disabled=this.value!=='RESET';});
  if(confirm)confirm.onclick=function(){if(!input||input.value!=='RESET')return;confirm.disabled=true;confirm.textContent='RESETTING…';removeGameData();location.reload();};
  if(settingsModal)settingsModal.addEventListener('click',function(e){if(e.target===settingsModal)close('settingsModal');});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
