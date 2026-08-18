(function(){
'use strict';
var board=document.getElementById('board'),wrap=board&&board.closest('.board-wrap'),api=null,layer=null,lastSig='';
var PIN=4,TYPES=['fire','split','pierce','boom','chain'];
var LABELS={fire:'Tremor',split:'Splitter',pierce:'Piercing',boom:'Dynamite',chain:'Storm',pin:'Firing Pin',n:'Standard'};
var ICONS={fire:'≋',split:'Y',pierce:'↑',boom:'✦',chain:'ϟ',pin:'◆',n:''};
function positions(){var out=[],r,c,n,g=(393-56)/8;for(r=0;r<8;r++){n=r%2?8:9;for(c=0;c<n;c++)out.push({x:28+c*g+(r%2?g/2:0),y:70+r*44});}return out;}
var POS=positions();
function snapshot(){return api&&api.snapshot?api.snapshot():{};}
function typeAt(index,s){var p=s.placements||{},i,t,a;for(i=0;i<TYPES.length;i++){t=TYPES[i];a=p[t]||[];if(a.indexOf(index)>=0)return t;}return index===PIN?'pin':'n';}
function levelAt(type,index,s){var m=s.pegMeta||{},v=(m[type]&&m[type][String(index)])||{};return Math.max(0,Math.min(3,Number(v.level||0)));}
function ensureLayer(){if(layer||!wrap)return;layer=document.createElement('div');layer.className='peg-hardware-layer';layer.setAttribute('aria-hidden','true');wrap.appendChild(layer);}
function nodeFor(index){var n=layer&&layer.querySelector('[data-hardware-index="'+index+'"]');if(n)return n;n=document.createElement('span');n.className='peg-hardware';n.setAttribute('data-hardware-index',String(index));n.innerHTML='<i class="peg-socket"></i><i class="peg-face"><b class="peg-symbol"></b></i><i class="peg-pips"></i>';layer.appendChild(n);return n;}
function pips(level){var h='',i;for(i=0;i<level;i++)h+='<b></b>';return h;}
function signature(s){return JSON.stringify([s.placements||{},s.pegMeta||{}]);}
function render(force){if(!api)return;ensureLayer();if(!layer)return;var s=snapshot(),sig=signature(s),i,p,t,lvl,n,sym,ps;if(!force&&sig===lastSig)return;lastSig=sig;for(i=0;i<POS.length;i++){p=POS[i];t=typeAt(i,s);lvl=(t==='n'||t==='pin')?0:levelAt(t,i,s);n=nodeFor(i);n.className='peg-hardware peg-'+t+(t!=='n'?' peg-special':'')+(lvl?' peg-upgraded':'');n.style.left=(p.x/393*100)+'%';n.style.top=(p.y/472*100)+'%';n.setAttribute('data-peg-type',t);n.setAttribute('data-peg-level',String(lvl));n.setAttribute('title',LABELS[t]||'Peg');sym=n.querySelector('.peg-symbol');if(sym)sym.textContent=ICONS[t]||'';ps=n.querySelector('.peg-pips');if(ps)ps.innerHTML=pips(lvl);}}
function pulse(index){if(!layer)return;var n=layer.querySelector('[data-hardware-index="'+index+'"]');if(!n)return;n.classList.remove('peg-hit');void n.offsetWidth;n.classList.add('peg-hit');setTimeout(function(){if(n)n.classList.remove('peg-hit');},230);}
function boot(){api=window.__ipsAPI;if(!api||!api.snapshot||!board||!wrap)return false;ensureLayer();render(true);['ips:pegUpgrade','ips:pegMove','ips:pegSell','ips:upgrade','ips:runStart','ips:waveStart'].forEach(function(name){document.addEventListener(name,function(){setTimeout(function(){render(true);},0);});});document.addEventListener('ips:peg',function(e){var d=e&&e.detail||{};if(d.index!==undefined&&d.index!==null)pulse(Number(d.index));else if(d.type==='pin')pulse(PIN);});window.addEventListener('resize',function(){render(true);});setInterval(function(){render(false);},650);return true;}
var tries=0,t=setInterval(function(){tries++;if(boot()||tries>160)clearInterval(t);},100);
})();
