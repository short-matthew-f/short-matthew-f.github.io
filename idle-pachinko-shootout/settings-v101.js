(function(){
'use strict';
var RESET_KEYS=[
  'idle-pachinko-shootout-v01',
  'idle-pachinko-shootout-v0.1',
  'ips-v1','ips-v2','ips-v3','ips-v4','ips-v5','ips-v6','ips-v7','ips-v8','ips-v9','ips-v10',
  'ips-idle-v1','ips-telemetry-v1','ips-campaign-v1','ips-contracts-v1','ips-combat-telemetry-v1'
];
function $(id){return document.getElementById(id);}
function open(id){var el=$(id);if(el)el.classList.remove('hidden');}
function close(id){var el=$(id);if(el)el.classList.add('hidden');}
function resetInputState(){var input=$('resetConfirmInput'),button=$('confirmGameReset');if(input)input.value='';if(button){button.disabled=true;button.textContent='PERMANENTLY RESET GAME';}}
function removeGameData(){var i;for(i=0;i<RESET_KEYS.length;i++){try{localStorage.removeItem(RESET_KEYS[i]);}catch(e){}}
  /* Remove only Idle Pachinko Shootout namespaces, never unrelated site data. */
  try{
    var remove=[],k;
    for(i=0;i<localStorage.length;i++){
      k=localStorage.key(i)||'';
      if(/^ips-(v\d+|idle-|telemetry-|campaign-|contracts-|combat-telemetry-)/.test(k)||/^idle-pachinko-shootout/.test(k))remove.push(k);
    }
    for(i=0;i<remove.length;i++)localStorage.removeItem(remove[i]);
  }catch(e){}
}
function bind(){
  var settings=$('settingsButton'),closeSettings=$('closeSettings'),reset=$('resetGameButton'),cancel=$('cancelGameReset'),input=$('resetConfirmInput'),confirm=$('confirmGameReset');
  if(settings)settings.onclick=function(){open('settingsModal');};
  if(closeSettings)closeSettings.onclick=function(){close('settingsModal');};
  if(reset)reset.onclick=function(){resetInputState();open('resetConfirmModal');setTimeout(function(){if(input)input.focus();},60);};
  if(cancel)cancel.onclick=function(){close('resetConfirmModal');resetInputState();};
  if(input)input.addEventListener('input',function(){if(confirm)confirm.disabled=this.value!=='RESET';});
  if(confirm)confirm.onclick=function(){if(!input||input.value!=='RESET')return;confirm.disabled=true;confirm.textContent='RESETTING…';removeGameData();location.reload();};
  var settingsModal=$('settingsModal');
  if(settingsModal)settingsModal.addEventListener('click',function(e){if(e.target===settingsModal)close('settingsModal');});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
