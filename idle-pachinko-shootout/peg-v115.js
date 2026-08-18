(function(){
'use strict';
var banner=document.getElementById('placementBanner'),launcher=document.querySelector('.launcher-cap'),toast=document.getElementById('campaignToast');
function mount(){
  if(!banner||!launcher)return;
  if(banner.parentNode!==launcher)launcher.appendChild(banner);
  banner.classList.add('launcher-placement');
}
function suppressDuplicateMoveToast(){
  if(!toast)return;
  var title=toast.querySelector('b');
  if(title&&title.textContent.trim()==='MOVE PEG')toast.classList.remove('show');
}
mount();
if(toast)new MutationObserver(suppressDuplicateMoveToast).observe(toast,{childList:true,subtree:true});
document.addEventListener('ips:pegMove',function(){if(banner)banner.classList.add('hidden');});
document.addEventListener('ips:pegSell',function(){if(banner)banner.classList.add('hidden');});
window.addEventListener('resize',mount);
})();
