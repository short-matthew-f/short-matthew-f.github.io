(function(){
'use strict';
var ENGINE_KEY='ips-v7',PEG_SHADOW_KEY='ips-peg-meta-v1',NativeFunction=window.Function,pegApi=null;
function readJson(key){try{var r=localStorage.getItem(key);return r?JSON.parse(r):null;}catch(e){return null;}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}
function hydratePegShadow(){var engine=readJson(ENGINE_KEY),shadow=readJson(PEG_SHADOW_KEY);if(!engine||!shadow||!shadow.pegMeta)return;engine.pegMeta=shadow.pegMeta;writeJson(ENGINE_KEY,engine);}
function safeGearCardSource(){return "function gearCard(slot,it){if(!it)return'<article class=\"gear-slot empty\"><div class=\"gear-slot-label\">'+SLOT_NAMES[slot]+'</div><h3>Empty</h3><p>Enemy and boss drops can fill this slot.</p></article>';return'<article class=\"gear-slot '+it.rarityClass+'\"><div class=\"gear-slot-label\">'+SLOT_NAMES[slot]+' · '+it.rarity+'</div><h3>'+it.name+'</h3><div class=\"gear-stats\">'+itemStatsHtml(it)+'</div><small>Sell value ● '+it.sell+'</small></article>';}\n";}
function sanitizeGeneratedEngine(body){var start,end;if(typeof body!=='string'||body.indexOf("var SLOTS=[10,7,4,2,1,2,4,7,10]")<0)return body;start=body.indexOf('function gearCard(');end=body.indexOf('function showLoot(',start);if(start>=0&&end>start)body=body.slice(0,start)+safeGearCardSource()+body.slice(end);return body;}
window.Function=function(){var args=Array.prototype.slice.call(arguments),i=args.length-1;if(i>=0)args[i]=sanitizeGeneratedEngine(args[i]);return NativeFunction.apply(null,args);};
window.Function.prototype=NativeFunction.prototype;
hydratePegShadow();
function savePegShadow(){if(!pegApi||!pegApi.snapshot)return;var s=pegApi.snapshot();if(s&&s.pegMeta)writeJson(PEG_SHADOW_KEY,{pegMeta:s.pegMeta,updatedAt:Date.now()});}
function bindPegPersistence(){pegApi=window.__ipsAPI;if(!pegApi||!pegApi.snapshot)return false;savePegShadow();document.addEventListener('ips:pegUpgrade',savePegShadow);document.addEventListener('ips:pegMove',savePegShadow);document.addEventListener('ips:pegSell',savePegShadow);document.addEventListener('ips:pegPlace',savePegShadow);document.addEventListener('ips:upgrade',function(e){if(e&&e.detail&&e.detail.kind==='board')setTimeout(savePegShadow,0);});window.addEventListener('pagehide',savePegShadow);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')savePegShadow();});window.Function=NativeFunction;return true;}
var persistTries=0,persistTimer=setInterval(function(){persistTries++;if(bindPegPersistence()||persistTries>160){clearInterval(persistTimer);window.Function=NativeFunction;}},100);
var RESET_KEYS=[
  'idle-pachinko-shootout-v01',
  'idle-pachinko-shootout-v0.1',
  'ips-v1','ips-v2','ips-v3','ips-v4','ips-v5','ips-v6','ips-v7','ips-v8','ips-v9','ips-v10',
  'ips-idle-v1','ips-telemetry-v1','ips-campaign-v1','ips-contracts-v1','ips-combat-telemetry-v1','ips-blueprints-v1','ips-loot-v1','ips-peg-meta-v1'
];
function $(id){return document.getElementById(id);}
function open(id){var el=$(id);if(el)el.classList.remove('hidden');}
function close(id){var el=$(id);if(el)el.classList.add('hidden');}
function resetInputState(){var input=$('resetConfirmInput'),button=$('confirmGameReset');if(input)input.value='';if(button){button.disabled=true;button.textContent='PERMANENTLY RESET GAME';}}
function removeGameData(){var i;for(i=0;i<RESET_KEYS.length;i++){try{localStorage.removeItem(RESET_KEYS[i]);}catch(e){}}
  try{var remove=[],k;for(i=0;i<localStorage.length;i++){k=localStorage.key(i)||'';if(/^ips-(v\d+|idle-|telemetry-|campaign-|contracts-|combat-telemetry-|blueprints-|loot-|peg-)/.test(k)||/^idle-pachinko-shootout/.test(k))remove.push(k);}for(i=0;i<remove.length;i++)localStorage.removeItem(remove[i]);}catch(e){}
}
function markVersion(){document.title='Idle Pachinko Shootout — v1.11.8';var brand=document.querySelector('.brand small');if(brand)brand.textContent=' v1.11.8';var meta=document.querySelector('#settingsModal .settings-meta');if(meta){var bs=meta.querySelectorAll('b');if(bs.length)bs[0].textContent='v1.11.8';}}
function bind(){markVersion();var settings=$('settingsButton'),closeSettings=$('closeSettings'),reset=$('resetGameButton'),cancel=$('cancelGameReset'),input=$('resetConfirmInput'),confirm=$('confirmGameReset');if(settings)settings.onclick=function(){markVersion();open('settingsModal');};if(closeSettings)closeSettings.onclick=function(){close('settingsModal');};if(reset)reset.onclick=function(){resetInputState();open('resetConfirmModal');setTimeout(function(){if(input)input.focus();},60);};if(cancel)cancel.onclick=function(){close('resetConfirmModal');resetInputState();};if(input)input.addEventListener('input',function(){if(confirm)confirm.disabled=this.value!=='RESET';});if(confirm)confirm.onclick=function(){if(!input||input.value!=='RESET')return;confirm.disabled=true;confirm.textContent='RESETTING…';removeGameData();location.reload();};var settingsModal=$('settingsModal');if(settingsModal)settingsModal.addEventListener('click',function(e){if(e.target===settingsModal)close('settingsModal');});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();