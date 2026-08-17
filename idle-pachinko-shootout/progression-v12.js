(function(){
'use strict';
var KEY='ips-blueprints-v1';
var OLD_GATES={fire:3,gold:4,split:5,pierce:8,boom:11,chain:16};
var BLUEPRINTS={
  fire:{clear:5,cost:250,label:'INCENDIARY WORKS',desc:'Incendiary ammunition + Fire Peg'},
  gold:{clear:10,cost:650,label:'GILDED CARTRIDGE',desc:'Golden ammunition'},
  split:{clear:15,cost:1100,label:'SPLITTER JIG',desc:'Splitter Peg'},
  pierce:{clear:22,cost:1900,label:'LONGBORE TOOLING',desc:'Piercing ammunition + Piercing Peg'},
  boom:{clear:30,cost:3200,label:'BLAST PRESS',desc:'Dynamite ammunition + Dynamite Peg'},
  chain:{clear:40,cost:5200,label:'STORM COIL',desc:'Storm ammunition + Storm Peg'}
};
function $(id){return document.getElementById(id);}
function read(){try{var r=localStorage.getItem(KEY);return r?JSON.parse(r):{bought:{},seen:{}};}catch(e){return{bought:{},seen:{}};}}
function write(v){try{localStorage.setItem(KEY,JSON.stringify(v));}catch(e){}}
function snap(){return window.__ipsAPI&&window.__ipsAPI.snapshot?window.__ipsAPI.snapshot():{};}
function eligible(def,s){return Number(s.highest||1)>def.clear;}
function ownsLegacy(k,s){return Number(s[k]||0)>0||(s.ammoUnlock&&Number(s.ammoUnlock[k]||0)>0);}
function normalize(m,s){var k,changed=false;m.bought=m.bought||{};m.seen=m.seen||{};for(k in BLUEPRINTS){if(!m.bought[k]&&ownsLegacy(k,s)){m.bought[k]=1;changed=true;}}if(changed)write(m);return m;}
function sheetName(){var t=(($('sheetTitle')&&$('sheetTitle').textContent)||'').toLowerCase();if(t.indexOf('pachinko')>=0)return'board';if(t.indexOf('ammo')>=0)return'ammo';return null;}
function showToast(title,text){var b=$('campaignToast');if(!b)return;b.innerHTML='<b>'+title+'</b><span>'+text+'</span>';b.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(function(){b.classList.remove('show');},3900);}
function statusFor(b,k,def){var id='blueprint-status-'+k+'-'+(b.hasAttribute('data-ammo-unlock')?'ammo':'board'),status=document.getElementById(id);if(!status){status=document.createElement('div');status.id=id;status.className='blueprint-lock-status';b.insertAdjacentElement('afterend',status);}status.textContent='BLUEPRINT: clear Wave '+def.clear+' · '+def.label+' · ● '+def.cost;return status;}
function clearStatus(k){var nodes=document.querySelectorAll('[id^="blueprint-status-'+k+'-"]'),i;for(i=0;i<nodes.length;i++)nodes[i].remove();}
function apply(){if(!window.__ipsAPI)return;var s=snap(),m=normalize(read(),s),highest=Number(s.highest||1),k,def,els,i,b,ok,afford;for(k in BLUEPRINTS){def=BLUEPRINTS[k];els=document.querySelectorAll('[data-board="'+k+'"],[data-ammo-unlock="'+k+'"]');if(m.bought[k]){clearStatus(k);for(i=0;i<els.length;i++){els[i].style.display='';els[i].classList.remove('blueprint-gate');els[i].removeAttribute('data-blueprint-family');}continue;}ok=eligible(def,s);afford=Number(s.coins||0)>=def.cost;for(i=0;i<els.length;i++){b=els[i];if(highest<OLD_GATES[k]){b.style.display='none';statusFor(b,k,def);continue;}clearStatus(k);b.style.display='';b.classList.add('blueprint-gate');b.setAttribute('data-blueprint-family',k);if(!ok){b.disabled=true;b.textContent='CLEAR WAVE '+def.clear+' FOR BLUEPRINT';}else{b.disabled=!afford;b.textContent=(afford?'BUY ':'NEED ● ')+def.label+' · ● '+def.cost;}}}}
function buy(k){var def=BLUEPRINTS[k],s=snap(),m=normalize(read(),s);if(!def||m.bought[k]||!eligible(def,s)||Number(s.coins||0)<def.cost)return;window.__ipsAPI.grant(0,-def.cost,'BLUEPRINT PURCHASED');m.bought[k]=1;write(m);clearStatus(k);showToast('BLUEPRINT PURCHASED',def.desc+' can now be purchased.');var name=sheetName();if(name)window.__ipsAPI.openSheet(name);setTimeout(apply,30);}
function watchAvailability(){var s=snap(),m=normalize(read(),s),k,def,changed=false;for(k in BLUEPRINTS){def=BLUEPRINTS[k];if(!m.seen[k]&&eligible(def,s)){m.seen[k]=1;changed=true;showToast('BLUEPRINT AVAILABLE',def.label+' · '+def.desc+' · ● '+def.cost);break;}}if(changed)write(m);}
function suppressOldBlueprintToast(){var box=$('campaignToast');if(!box)return;var title=box.querySelector('b');if(title&&title.textContent==='NEW BLUEPRINT')box.classList.remove('show');}
function boot(){var content=$('sheetContent');if(content){content.addEventListener('click',function(e){var b=e.target.closest('[data-blueprint-family]');if(!b)return;var k=b.getAttribute('data-blueprint-family'),m=normalize(read(),snap());if(m.bought[k])return;e.preventDefault();e.stopImmediatePropagation();buy(k);},true);new MutationObserver(function(){setTimeout(apply,0);}).observe(content,{childList:true,subtree:true});}var toast=$('campaignToast');if(toast)new MutationObserver(function(){suppressOldBlueprintToast();}).observe(toast,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});setInterval(function(){watchAvailability();apply();},650);setTimeout(function(){watchAvailability();apply();},250);}
window.addEventListener('DOMContentLoaded',function(){var tries=0,t=setInterval(function(){tries++;if(window.__ipsAPI){clearInterval(t);boot();}else if(tries>100)clearInterval(t);},100);});
})();
