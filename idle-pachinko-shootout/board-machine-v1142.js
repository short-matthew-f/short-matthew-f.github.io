(function(){
'use strict';
if(window.__ipsBoardMachine1142)return;
window.__ipsBoardMachine1142=true;

var wrap=null,launcher=null,catchTimer=null,cycleTimer=null;
function q(sel,root){return(root||document).querySelector(sel);}
function install(){
  wrap=q('.board-wrap');launcher=q('.launcher-cap');
  if(!wrap)return false;
  wrap.classList.add('machine-v1142');
  if(!q('.board-machine-v1142',wrap)){
    var layer=document.createElement('div');
    layer.className='board-machine-v1142';
    layer.setAttribute('aria-hidden','true');
    layer.innerHTML='<i class="bm-side bm-left"></i><i class="bm-side bm-right"></i><i class="bm-top-rib"></i><i class="bm-slot-rib"></i><i class="bm-bore"></i>';
    wrap.appendChild(layer);
  }
  return true;
}
function cycle(){
  if(!launcher)launcher=q('.launcher-cap');if(!launcher)return;
  launcher.classList.remove('bm-cycle');void launcher.offsetWidth;launcher.classList.add('bm-cycle');
  clearTimeout(cycleTimer);cycleTimer=setTimeout(function(){if(launcher)launcher.classList.remove('bm-cycle');},320);
}
function catchBeat(){
  if(!wrap)wrap=q('.board-wrap');if(!wrap)return;
  wrap.classList.remove('bm-catch');void wrap.offsetWidth;wrap.classList.add('bm-catch');
  clearTimeout(catchTimer);catchTimer=setTimeout(function(){if(wrap)wrap.classList.remove('bm-catch');},210);
}
function boot(){
  if(!install())return;
  document.addEventListener('ips:ballLaunch',cycle);
  document.addEventListener('ips:slot',catchBeat);
  document.addEventListener('ips:runStart',install);
  window.__ipsBoardMachine={version:'1.14.2',refresh:install};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,35);});else setTimeout(boot,35);
})();
