(function(){
'use strict';
if(window.__ipsCoreCoherency1147)return;
window.__ipsCoreCoherency1147=true;

var BUILD='20260818-1147';
var REFRESH_KEY='ips-core-refresh-'+BUILD;
var tries=0,timer=null;

function bootError(message){
  var b=document.getElementById('bootError');
  if(!b)return;
  b.className='boot-error';
  b.textContent=message;
}
function forceFreshDocument(){
  try{
    if(sessionStorage.getItem(REFRESH_KEY)==='1')return false;
    sessionStorage.setItem(REFRESH_KEY,'1');
    var u=new URL(window.location.href);
    u.searchParams.set('core',BUILD);
    window.location.replace(u.toString());
    return true;
  }catch(e){return false;}
}
function verify(){
  var api=window.__ipsAPI,s;
  if(!api||!api.snapshot)return false;
  try{s=api.snapshot();}catch(e){return false;}
  if(Number(s&&s.boardLayout||0)>=2){
    try{sessionStorage.removeItem(REFRESH_KEY);}catch(e){}
    document.documentElement.setAttribute('data-ips-core-build',BUILD);
    return true;
  }

  /* A six-row DOM runtime paired with a pre-v1.14.6 engine produces exactly
     the phantom two peg rows and two-row hit-ring offset seen on cached iOS
     Safari. Never leave that mixed board on screen. */
  var wrap=document.querySelector('.board-wrap');
  if(wrap)wrap.classList.add('core-mismatch');
  if(forceFreshDocument())return true;
  bootError('Board assets are out of date. Reload once to finish the v1.14.7 update.');
  return true;
}
function tick(){
  tries++;
  if(verify()||tries>=160){
    if(timer)clearInterval(timer);
    if(tries>=160&&!window.__ipsAPI)bootError('Game startup error: v1.14.7 core did not finish booting.');
  }
}

timer=setInterval(tick,50);
tick();
})();
