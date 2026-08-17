(function(){
'use strict';
var KEY='ips-blueprints-v1';
var BLUEPRINTS={
 fire:{clear:5,cost:250,label:'INCENDIARY WORKS',desc:'Fire ammo + Fire Peg',sheets:['board','ammo']},
 gold:{clear:10,cost:650,label:'GILDED CARTRIDGE',desc:'Golden ammunition',sheets:['ammo']},
 concuss:{clear:12,cost:900,label:'CONCUSSION DIES',desc:'Concussive ammunition',sheets:['ammo']},
 split:{clear:15,cost:1100,label:'SPLITTER JIG',desc:'Splitter Peg',sheets:['board']},
 shrapnel:{clear:18,cost:1500,label:'SHRAPNEL LOADER',desc:'Shrapnel ammunition',sheets:['ammo']},
 pierce:{clear:22,cost:1900,label:'LONGBORE TOOLING',desc:'Piercing ammo + Piercing Peg',sheets:['board','ammo']},
 poison:{clear:26,cost:2600,label:'MIASMA CAPSULE',desc:'Poison Cloud ammunition',sheets:['ammo']},
 boom:{clear:30,cost:3200,label:'BLAST PRESS',desc:'Dynamite ammo + Dynamite Peg',sheets:['board','ammo']},
 chain:{clear:40,cost:5200,label:'STORM COIL',desc:'Storm ammo + Storm Peg',sheets:['board','ammo']}
};
var ORDER=['fire','gold','concuss','split','shrapnel','pierce','poison','boom','chain'];
function $(id){return document.getElementById(id);}function snap(){return window.__ipsAPI&&window.__ipsAPI.snapshot?window.__ipsAPI.snapshot():{};}
function read(){try{var r=localStorage.getItem(KEY),v=r?JSON.parse(r):{};v.bought=v.bought||{};v.seen=v.seen||{};v.history=v.history||{};return v;}catch(e){return{bought:{},seen:{},history:{}};}}
function write(v){try{localStorage.setItem(KEY,JSON.stringify(v));}catch(e){}}
function eligible(def,s){return Number(s.highest||1)>def.clear;}function ownsLegacy(k,s){return Number(s[k]||0)>0||(s.ammoUnlock&&Number(s.ammoUnlock[k]||0)>0);}
function normalize(m,s){var k,changed=false;for(k in BLUEPRINTS){if(!m.bought[k]&&ownsLegacy(k,s)){m.bought[k]=1;m.history[k]=m.history[k]||{legacy:true,at:Date.now(),wave:Number(s.highest||1)};changed=true;}}if(changed)write(m);return m;}
function sheetName(){var t=(($('sheetTitle')&&$('sheetTitle').textContent)||'').toLowerCase();if(t.indexOf('pachinko')>=0)return'board';if(t.indexOf('ammo')>=0)return'ammo';return null;}
function showToast(title,text){var b=$('campaignToast');if(!b)return;b.innerHTML='<b>'+title+'</b><span>'+text+'</span>';b.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(function(){b.classList.remove('show');},4100);}
function stateFor(k,def,s,m){if(m.bought[k])return'researched';if(!eligible(def,s))return'locked';return Number(s.coins||0)>=def.cost?'available':'saving';}
function cardHtml(k,def,s,m,nextKey){var st=stateFor(k,def,s,m),coins=Number(s.coins||0),progress=Math.min(100,Math.round(coins/def.cost*100)),h='<article class="research-card '+st+(k===nextKey?' next':'')+'">';h+='<div class="research-top"><div><small>'+ (st==='researched'?'RESEARCHED':st==='locked'?'LOCKED':'BLUEPRINT AVAILABLE') +'</small><h3>'+def.label+'</h3></div><b>WAVE '+def.clear+'</b></div><p>'+def.desc+'</p>';
 if(st==='researched'){h+='<div class="research-complete">✓ BLUEPRINT OWNED</div>';}
 else if(st==='locked'){h+='<div class="research-lock">Clear Wave '+def.clear+' to reveal this blueprint.</div>';}
 else{h+='<div class="research-fund"><i style="width:'+progress+'%"></i></div><div class="research-price"><span>Research cost</span><b>● '+def.cost+'</b></div><button data-blueprint-buy="'+k+'" '+(st==='saving'?'disabled':'')+'>'+ (st==='saving'?'SAVE '+Math.max(0,def.cost-coins)+' MORE':'RESEARCH BLUEPRINT') +'</button>';}
 return h+'</article>';}
function nextUnboughtFor(sheet,m){var i,k,d;for(i=0;i<ORDER.length;i++){k=ORDER[i];d=BLUEPRINTS[k];if(d.sheets.indexOf(sheet)>=0&&!m.bought[k])return k;}return null;}
function renderResearchPanel(){var sheet=sheetName(),content=$('sheetContent');if(!sheet||!content||!window.__ipsAPI)return;var old=content.querySelector('.research-desk');if(old)old.remove();var s=snap(),m=normalize(read(),s),nextKey=nextUnboughtFor(sheet,m),h='<section class="research-desk"><div class="research-heading"><div><small>FRONTIER RESEARCH</small><h3>Blueprint Desk</h3></div><span>● '+Math.floor(Number(s.coins||0))+'</span></div><p class="research-intro">Clearing a milestone makes a blueprint available. Research it with Bounty Coins, then buy and improve the actual ammo or peg separately.</p><div class="research-list">',i,k,d;
 for(i=0;i<ORDER.length;i++){k=ORDER[i];d=BLUEPRINTS[k];if(d.sheets.indexOf(sheet)>=0)h+=cardHtml(k,d,s,m,nextKey);}h+='</div></section>';
 var balance=content.querySelector('.balance-card');if(balance)balance.insertAdjacentHTML('afterend',h);else content.insertAdjacentHTML('afterbegin',h);bindResearchButtons();}
function lockUnderlying(){if(!window.__ipsAPI)return;var s=snap(),m=normalize(read(),s),k,els,i,b,status;for(k in BLUEPRINTS){els=document.querySelectorAll('[data-board="'+k+'"],[data-ammo-unlock="'+k+'"]');for(i=0;i<els.length;i++){b=els[i];status=b.parentNode&&b.parentNode.querySelector('.research-required[data-family="'+k+'"]');if(m.bought[k]){b.style.display='';b.classList.remove('blueprint-gate');if(status)status.remove();continue;}b.style.display='none';if(!status&&b.parentNode){status=document.createElement('div');status.className='research-required';status.setAttribute('data-family',k);status.textContent='REQUIRES '+BLUEPRINTS[k].label+' BLUEPRINT';b.parentNode.insertBefore(status,b.nextSibling);}}}}
function buy(k){var def=BLUEPRINTS[k],s=snap(),m=normalize(read(),s);if(!def||m.bought[k]||!eligible(def,s)||Number(s.coins||0)<def.cost)return;window.__ipsAPI.grant(0,-def.cost,'BLUEPRINT RESEARCH');m.bought[k]=1;m.history[k]={at:Date.now(),wave:Number(s.highest||1),cost:def.cost};write(m);showToast('BLUEPRINT RESEARCHED',def.label+' complete. '+def.desc+' can now be purchased.');var sh=sheetName();if(sh)window.__ipsAPI.openSheet(sh);setTimeout(refresh,40);}
function bindResearchButtons(){var nodes=document.querySelectorAll('[data-blueprint-buy]'),i;for(i=0;i<nodes.length;i++)nodes[i].onclick=function(){buy(this.getAttribute('data-blueprint-buy'));};}
function watchAvailability(){var s=snap(),m=normalize(read(),s),i,k,d,changed=false;for(i=0;i<ORDER.length;i++){k=ORDER[i];d=BLUEPRINTS[k];if(!m.seen[k]&&eligible(d,s)){m.seen[k]=1;changed=true;showToast('BLUEPRINT AVAILABLE',d.label+' · '+d.desc+' · Research ● '+d.cost);break;}}if(changed)write(m);}
function suppressOldBlueprintToast(){var box=$('campaignToast');if(!box)return;var title=box.querySelector('b');if(title&&title.textContent==='NEW BLUEPRINT')box.classList.remove('show');}
function refresh(){lockUnderlying();renderResearchPanel();}
function boot(){var content=$('sheetContent');if(content){content.addEventListener('click',function(e){var hidden=e.target.closest&&e.target.closest('.research-required');if(hidden){e.preventDefault();e.stopPropagation();}},true);new MutationObserver(function(){setTimeout(refresh,0);}).observe(content,{childList:true,subtree:true});}var toast=$('campaignToast');if(toast)new MutationObserver(suppressOldBlueprintToast).observe(toast,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});setInterval(function(){watchAvailability();lockUnderlying();},900);setTimeout(function(){watchAvailability();refresh();},300);}
window.addEventListener('DOMContentLoaded',function(){var tries=0,t=setInterval(function(){tries++;if(window.__ipsAPI){clearInterval(t);boot();}else if(tries>100)clearInterval(t);},100);});
})();