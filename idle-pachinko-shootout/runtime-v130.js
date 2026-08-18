(function(){
'use strict';
if(window.__ipsRuntime130)return;
window.__ipsRuntime130=true;

var api=null;
var board=document.getElementById('board');
var wrap=board&&board.closest('.board-wrap');
var content=document.getElementById('sheetContent');
var PIN=4;
var TYPES=['fire','split','pierce','boom','chain'];
var LABELS={fire:'Tremor Peg',split:'Splitter Peg',pierce:'Piercing Peg',boom:'Dynamite Peg',chain:'Storm Peg',pin:'Firing Pin',n:'Standard Peg'};
var ICONS={fire:'≋',split:'Y',pierce:'↑',boom:'✦',chain:'ϟ',pin:'◆',n:''};
var POS=buildPositions();
var hardwareLayer=null,hardwareNodes=[],lastHardwareSig='';
var pegMenu=null,moving=null,confirmSellUntil=0;
var savedAnchor=null;
var armor={current:0,max:0};
var queuedToasts=[];

var BLUEPRINT_KEY='ips-blueprints-v1';
var BLUEPRINTS={
 fire:{clear:5,cost:250,label:'INCENDIARY WORKS',desc:'Incendiary ammunition',sheets:['ammo'],engineKey:'fire'},
 tremor:{clear:8,cost:420,label:'SEISMIC HAMMER',desc:'Tremor Peg',sheets:['board'],engineKey:'fire'},
 gold:{clear:10,cost:650,label:'GILDED CARTRIDGE',desc:'Golden ammunition',sheets:['ammo']},
 concuss:{clear:12,cost:900,label:'CONCUSSION DIES',desc:'Concussive ammunition',sheets:['ammo']},
 split:{clear:15,cost:1100,label:'SPLITTER JIG',desc:'Splitter Peg',sheets:['board']},
 shrapnel:{clear:18,cost:1500,label:'SHRAPNEL LOADER',desc:'Shrapnel ammunition',sheets:['ammo']},
 pierce:{clear:22,cost:1900,label:'LONGBORE TOOLING',desc:'Piercing ammo + Piercing Peg',sheets:['board','ammo']},
 poison:{clear:26,cost:2600,label:'MIASMA CAPSULE',desc:'Poison Cloud ammunition',sheets:['ammo']},
 boom:{clear:30,cost:3200,label:'BLAST PRESS',desc:'Dynamite ammo + Dynamite Peg',sheets:['board','ammo']},
 chain:{clear:40,cost:5200,label:'STORM COIL',desc:'Storm ammo + Storm Peg',sheets:['board','ammo']}
};
var BLUEPRINT_ORDER=['fire','tremor','gold','concuss','split','shrapnel','pierce','poison','boom','chain'];

function $(id){return document.getElementById(id);}
function q(sel,root){return (root||document).querySelector(sel);}
function qa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel));}
function clone(v){return JSON.parse(JSON.stringify(v||{}));}
function snap(){return api&&api.snapshot?api.snapshot():{};}
function readJson(key){try{var r=localStorage.getItem(key);return r?JSON.parse(r):null;}catch(e){return null;}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}
function buildPositions(){var out=[],r,c,n,g=(393-56)/8;for(r=0;r<8;r++){n=r%2?8:9;for(c=0;c<n;c++)out.push({x:28+c*g+(r%2?g/2:0),y:70+r*44});}return out;}
function emit(name,detail){try{document.dispatchEvent(new CustomEvent('ips:'+name,{detail:detail||{}}));}catch(e){}}

/* ---------- rendered board hardware ---------- */
function typeAt(index,s){var p=(s&&s.placements)||{},i,t,a;for(i=0;i<TYPES.length;i++){t=TYPES[i];a=p[t]||[];if(a.indexOf(index)>=0)return t;}return index===PIN?'pin':'n';}
function levelAt(type,index,s){var m=(s&&s.pegMeta)||{},v=(m[type]&&m[type][String(index)])||{};return Math.max(0,Math.min(3,Number(v.level||0)));}
function ensureHardwareLayer(){if(hardwareLayer||!wrap)return;hardwareLayer=document.createElement('div');hardwareLayer.className='peg-hardware-layer';hardwareLayer.setAttribute('aria-hidden','true');wrap.appendChild(hardwareLayer);}
function hardwareNode(index){var n=hardwareNodes[index];if(n)return n;n=document.createElement('span');n.className='peg-hardware';n.setAttribute('data-hardware-index',String(index));n.innerHTML='<i class="peg-socket"></i><i class="peg-face"><b class="peg-symbol"></b></i><i class="peg-pips"></i>';hardwareNodes[index]=n;hardwareLayer.appendChild(n);return n;}
function pipHtml(level){var h='',i;for(i=0;i<level;i++)h+='<b></b>';return h;}
function hardwareSignature(s){return JSON.stringify([s.placements||{},s.pegMeta||{}]);}
function renderHardware(force){if(!api||!wrap)return;ensureHardwareLayer();var s=snap(),sig=hardwareSignature(s),i,p,t,lvl,n,sym,pips,ph;if(!force&&sig===lastHardwareSig)return;lastHardwareSig=sig;for(i=0;i<POS.length;i++){p=POS[i];t=typeAt(i,s);lvl=(t==='n'||t==='pin')?0:levelAt(t,i,s);n=hardwareNode(i);n.className='peg-hardware peg-'+t+(t!=='n'?' peg-special':'')+(lvl?' peg-upgraded':'');n.style.left=(p.x/393*100)+'%';n.style.top=(p.y/472*100)+'%';n.setAttribute('data-peg-type',t);n.setAttribute('data-peg-level',String(lvl));n.title=LABELS[t]||'Peg';sym=q('.peg-symbol',n);if(sym&&sym.textContent!==(ICONS[t]||''))sym.textContent=ICONS[t]||'';pips=q('.peg-pips',n);if(pips){ph=pipHtml(lvl);if(pips.innerHTML!==ph)pips.innerHTML=ph;}}}
function pulseHardware(index){var n=hardwareNodes[index],face,from,mid;if(!n)return;face=q('.peg-face',n);if(!face)return;from=n.classList.contains('peg-pin')?'translate(-50%,-53%) rotate(45deg) scale(1)':'translate(-50%,-53%) scale(1)';mid=n.classList.contains('peg-pin')?'translate(-50%,-53%) rotate(45deg) scale(1.18)':'translate(-50%,-53%) scale(1.18)';if(face.animate){if(face.__ipsPegAnim)try{face.__ipsPegAnim.cancel();}catch(e){}face.__ipsPegAnim=face.animate([{transform:from,opacity:1},{transform:mid,opacity:.82},{transform:from,opacity:1}],{duration:150,easing:'ease-out'});return;}face.style.opacity='.75';setTimeout(function(){face.style.opacity='';},120);}

/* ---------- peg workshop ---------- */
function boardPoint(ev){var r=board.getBoundingClientRect();return{x:(ev.clientX-r.left)*(board.width/r.width),y:(ev.clientY-r.top)*(board.height/r.height)};}
function nearestIndex(pt,max){var best=-1,bd=Infinity,i,dx,dy,d;for(i=0;i<POS.length;i++){dx=POS[i].x-pt.x;dy=POS[i].y-pt.y;d=dx*dx+dy*dy;if(d<bd){bd=d;best=i;}}return bd<=max*max?best:-1;}
function removePegMenu(){if(pegMenu&&pegMenu.parentNode)pegMenu.parentNode.removeChild(pegMenu);pegMenu=null;confirmSellUntil=0;}
function clampPegMenu(){if(!pegMenu||!wrap)return;var rr=wrap.getBoundingClientRect(),mr=pegMenu.getBoundingClientRect(),left=parseFloat(pegMenu.style.left)||0,top=parseFloat(pegMenu.style.top)||0;pegMenu.style.left=Math.max(8,Math.min(rr.width-mr.width-8,left))+'px';pegMenu.style.top=Math.max(8,Math.min(rr.height-mr.height-8,top))+'px';}
function toast(title,text){var b=$('campaignToast');if(!b)return;b.innerHTML='<b>'+title+'</b><span>'+text+'</span>';b.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(function(){b.classList.remove('show');},2600);}
function showPinMenu(clientX,clientY){removePegMenu();pegMenu=document.createElement('div');pegMenu.className='peg-context firing-pin-context';pegMenu.innerHTML='<div class="peg-context-head"><div><small>BOARD HARDWARE</small><b>Firing Pin</b></div><span>ANCHOR</span></div><div class="peg-effect">Every ball passes through this launch point. It is permanent board hardware and has no upgrade, move, or sell controls.</div>';wrap.appendChild(pegMenu);var wr=wrap.getBoundingClientRect();pegMenu.style.left=(clientX-wr.left+8)+'px';pegMenu.style.top=(clientY-wr.top+8)+'px';requestAnimationFrame(clampPegMenu);}
function showPegMenu(type,index,clientX,clientY){var info=api.getPegInfo(type,index),up,mv,sell,wr;if(!info)return;removePegMenu();pegMenu=document.createElement('div');pegMenu.className='peg-context';pegMenu.setAttribute('role','dialog');pegMenu.setAttribute('aria-label',info.name+' controls');pegMenu.innerHTML='<div class="peg-context-head"><div><small>BOARD PEG</small><b>'+info.name+'</b></div><span>LV '+info.level+'/'+info.maxLevel+'</span></div><div class="peg-effect">'+info.effect+'</div><div class="peg-context-actions"><button data-runtime-peg-upgrade '+(info.level>=info.maxLevel?'disabled':'')+'>'+(info.level>=info.maxLevel?'MAX LEVEL':'UPGRADE · ● '+info.upgradeCost)+'</button><button data-runtime-peg-move>MOVE</button><button class="sell" data-runtime-peg-sell>SELL · ● '+info.sellValue+'</button></div><div class="peg-invested">Invested ● '+info.invested+' · sell returns 50%</div>';wrap.appendChild(pegMenu);wr=wrap.getBoundingClientRect();pegMenu.style.left=(clientX-wr.left+8)+'px';pegMenu.style.top=(clientY-wr.top-24)+'px';requestAnimationFrame(clampPegMenu);
  up=q('[data-runtime-peg-upgrade]',pegMenu);mv=q('[data-runtime-peg-move]',pegMenu);sell=q('[data-runtime-peg-sell]',pegMenu);
  if(up)up.onclick=function(ev){ev.preventDefault();ev.stopPropagation();if(up.disabled)return;var res=api.upgradePeg(type,index);if(res&&res.ok){toast('PEG UPGRADED',res.info.effect);renderHardware(true);showPegMenu(type,index,clientX,clientY);}else if(res&&res.reason==='coins')toast('NOT ENOUGH COINS','Need ● '+Math.ceil(res.need||0)+' more.');};
  if(mv)mv.onclick=function(ev){ev.preventDefault();ev.stopPropagation();moving={type:type,index:index,name:info.name};removePegMenu();mountPlacementBanner();var banner=$('placementBanner'),text=$('placementText');if(text)text.textContent='Move '+info.name+' — tap an empty peg.';if(banner)banner.classList.remove('hidden');if(wrap)wrap.classList.add('peg-moving');};
  if(sell)sell.onclick=function(ev){ev.preventDefault();ev.stopPropagation();var now=performance.now();if(now>confirmSellUntil){confirmSellUntil=now+2400;sell.textContent='TAP AGAIN TO SELL · ● '+info.sellValue;sell.classList.add('confirm');return;}var res=api.sellPeg(type,index);if(res&&res.ok){removePegMenu();toast('PEG SOLD','Recovered ● '+res.value);renderHardware(true);}else toast('SELL FAILED','Peg could not be sold.');};
}
function clearMove(){moving=null;if(wrap)wrap.classList.remove('peg-moving');var banner=$('placementBanner');if(banner)banner.classList.add('hidden');}
function handleBoardPointer(ev){if(!api||!board||!wrap)return;if(wrap.classList.contains('placing'))return;var pt=boardPoint(ev),idx=nearestIndex(pt,24),s=snap(),type,res;if(moving){ev.preventDefault();ev.stopPropagation();if(idx<0){toast('MOVE PEG','Tap closer to a peg.');return;}type=typeAt(idx,s);if((type!=='n'&&idx!==moving.index)||idx===PIN){toast('SPOT OCCUPIED','Choose an empty peg.');return;}res=api.movePeg(moving.type,moving.index,idx);if(res&&res.ok){toast('PEG MOVED',moving.name+' repositioned.');clearMove();renderHardware(true);}else toast('MOVE FAILED','Choose another peg position.');return;}if(idx<0){removePegMenu();return;}type=typeAt(idx,s);if(type==='pin'){ev.preventDefault();ev.stopPropagation();showPinMenu(ev.clientX,ev.clientY);return;}if(type==='n'){removePegMenu();return;}ev.preventDefault();ev.stopPropagation();showPegMenu(type,idx,ev.clientX,ev.clientY);}
function mountPlacementBanner(){var banner=$('placementBanner'),launcher=q('.launcher-cap');if(banner&&launcher&&banner.parentNode!==launcher)launcher.appendChild(banner);if(banner)banner.classList.add('launcher-placement');}

/* ---------- blueprint progression ---------- */
function readBlueprints(){var v=readJson(BLUEPRINT_KEY)||{};v.bought=v.bought||{};v.seen=v.seen||{};v.history=v.history||{};return v;}
function eligible(def,s){return Number(s.highest||1)>def.clear;}
function ownsLegacy(k,s){if(k==='fire')return !!(s.ammoUnlock&&Number(s.ammoUnlock.fire||0)>0);if(k==='tremor')return Number(s.fire||0)>0;var d=BLUEPRINTS[k],ek=(d&&d.engineKey)||k;return Number(s[ek]||0)>0||(s.ammoUnlock&&Number(s.ammoUnlock[ek]||0)>0);}
function normalizeBlueprints(m,s){var k,changed=false;for(k in BLUEPRINTS){if(!m.bought[k]&&ownsLegacy(k,s)){m.bought[k]=1;m.history[k]=m.history[k]||{legacy:true,at:Date.now(),wave:Number(s.highest||1)};changed=true;}}if(changed)writeJson(BLUEPRINT_KEY,m);return m;}
function currentSheet(){var title=(($('sheetTitle')&&$('sheetTitle').textContent)||'').toLowerCase();if(title.indexOf('pachinko')>=0)return'board';if(title.indexOf('ammo')>=0)return'ammo';if(title.indexOf('gunslinger')>=0)return'hero';return null;}
function sheetOpen(){var s=$('sheet');return !!(s&&s.classList.contains('open'));}
function modalVisible(id){var e=$(id);return !!(e&&!e.classList.contains('hidden'));}
function rewardFlowBlocked(){return modalVisible('lootModal')||modalVisible('deathModal')||modalVisible('returnModal')||modalVisible('tutorialModal')||modalVisible('resetConfirmModal');}
function paintToast(title,text){var b=$('campaignToast');if(!b)return;b.innerHTML='<b>'+title+'</b><span>'+text+'</span>';b.classList.add('show');clearTimeout(paintToast.t);paintToast.t=setTimeout(function(){b.classList.remove('show');},4100);}
function showBlueprintToast(title,text){if(rewardFlowBlocked()){queuedToasts.push({title:title,text:text});return;}paintToast(title,text);}
function flushToasts(){if(rewardFlowBlocked()||!queuedToasts.length)return;var t=queuedToasts.shift();paintToast(t.title,t.text);}
function stateFor(k,def,s,m){if(m.bought[k])return'researched';if(!eligible(def,s))return'locked';return Number(s.coins||0)>=def.cost?'available':'saving';}
function nextUnboughtFor(sheet,m){var i,k,d;for(i=0;i<BLUEPRINT_ORDER.length;i++){k=BLUEPRINT_ORDER[i];d=BLUEPRINTS[k];if(d.sheets.indexOf(sheet)>=0&&!m.bought[k])return k;}return null;}
function cardHtml(k,def,s,m,nextKey){var st=stateFor(k,def,s,m),coins=Number(s.coins||0),progress=Math.min(100,Math.round(coins/def.cost*100)),h='<article class="research-card '+st+(k===nextKey?' next':'')+'">';h+='<div class="research-top"><div><small>'+(st==='researched'?'RESEARCHED':st==='locked'?'LOCKED':'BLUEPRINT AVAILABLE')+'</small><h3>'+def.label+'</h3></div><b>WAVE '+def.clear+'</b></div><p>'+def.desc+'</p>';if(st==='researched')h+='<div class="research-complete">✓ BLUEPRINT OWNED</div>';else if(st==='locked')h+='<div class="research-lock">Clear Wave '+def.clear+' to reveal this blueprint.</div>';else h+='<div class="research-fund"><i style="width:'+progress+'%"></i></div><div class="research-price"><span>Research cost</span><b>● '+def.cost+'</b></div><button data-blueprint-buy="'+k+'" '+(st==='saving'?'disabled':'')+'>'+(st==='saving'?'SAVE '+Math.max(0,def.cost-coins)+' MORE':'RESEARCH BLUEPRINT')+'</button>';return h+'</article>';}
function selectorsFor(k,def){if(k==='fire')return['[data-ammo-unlock="fire"]'];if(k==='tremor')return['[data-board="fire"]'];var ek=def.engineKey||k,out=[];if(def.sheets.indexOf('board')>=0)out.push('[data-board="'+ek+'"]');if(def.sheets.indexOf('ammo')>=0)out.push('[data-ammo-unlock="'+ek+'"]');return out;}
function lockUnderlying(sheet,s,m){var k,def,selectors,si,els,i,b,status;for(k in BLUEPRINTS){def=BLUEPRINTS[k];if(def.sheets.indexOf(sheet)<0)continue;selectors=selectorsFor(k,def);for(si=0;si<selectors.length;si++){els=qa(selectors[si],content);for(i=0;i<els.length;i++){b=els[i];status=b.parentNode&&q('.research-required[data-family="'+k+'"]',b.parentNode);if(m.bought[k]){b.style.display='';if(status)status.remove();continue;}b.style.display='none';if(!status&&b.parentNode){status=document.createElement('div');status.className='research-required';status.setAttribute('data-family',k);status.textContent='REQUIRES '+def.label+' BLUEPRINT';b.parentNode.insertBefore(status,b.nextSibling);}}}}}
function renderResearchPanel(sheet,s,m){var old=q('.research-desk',content);if(old)old.remove();var nextKey=nextUnboughtFor(sheet,m),h='<section class="research-desk"><div class="research-heading"><div><small>FRONTIER RESEARCH</small><h3>Blueprint Desk</h3></div><span>● '+Math.floor(Number(s.coins||0))+'</span></div><p class="research-intro">Clearing a milestone reveals a blueprint. Research it, then buy the actual round or peg separately.</p><div class="research-list">',i,k,d,target;for(i=0;i<BLUEPRINT_ORDER.length;i++){k=BLUEPRINT_ORDER[i];d=BLUEPRINTS[k];if(d.sheets.indexOf(sheet)>=0)h+=cardHtml(k,d,s,m,nextKey);}h+='</div></section>';target=sheet==='board'?q('.upgrade-grid',content):q('.ammo-grid',content);if(target)target.insertAdjacentHTML('afterend',h);else content.insertAdjacentHTML('beforeend',h);}
function watchBlueprintAvailability(){if(!api)return;var s=snap(),m=normalizeBlueprints(readBlueprints(),s),i,k,d,changed=false;for(i=0;i<BLUEPRINT_ORDER.length;i++){k=BLUEPRINT_ORDER[i];d=BLUEPRINTS[k];if(!m.seen[k]&&eligible(d,s)){m.seen[k]=1;changed=true;showBlueprintToast('BLUEPRINT AVAILABLE',d.label+' · '+d.desc+' · Research ● '+d.cost);break;}}if(changed)writeJson(BLUEPRINT_KEY,m);}
function buyBlueprint(k){var def=BLUEPRINTS[k],s=snap(),m=normalizeBlueprints(readBlueprints(),s),sheet=currentSheet();if(!def||m.bought[k]||!eligible(def,s)||Number(s.coins||0)<def.cost)return;api.grant(0,-def.cost,'BLUEPRINT RESEARCH');m.bought[k]=1;m.history[k]={at:Date.now(),wave:Number(s.highest||1),cost:def.cost};writeJson(BLUEPRINT_KEY,m);showBlueprintToast('BLUEPRINT RESEARCHED',def.label+' complete. '+def.desc+' can now be purchased.');if(sheet)api.openSheet(sheet);}
function suppressLegacyBlueprintToast(){var box=$('campaignToast'),title=box&&q('b',box);if(title&&title.textContent==='NEW BLUEPRINT')box.classList.remove('show');}

/* ---------- sheet stability / explanations ---------- */
function selectorFor(btn){var attrs=['data-hero','data-board','data-ammo-rank','data-ammo-qty','data-ammo-unlock','data-ammo-load','data-blueprint-buy','data-chamber'],i,a,v;for(i=0;i<attrs.length;i++){a=attrs[i];v=btn.getAttribute&&btn.getAttribute(a);if(v!==null)return'['+a+'="'+String(v).replace(/"/g,'\\"')+'"]';}return null;}
function captureAnchor(e){if(!content)return;var btn=e.target&&e.target.closest?e.target.closest('button'):null;if(!btn||!content.contains(btn))return;var sel=selectorFor(btn),r=btn.getBoundingClientRect(),cr=content.getBoundingClientRect();savedAnchor={selector:sel,offset:r.top-cr.top,scroll:content.scrollTop,until:performance.now()+1200};}
function restoreAnchor(){if(!savedAnchor||!content||performance.now()>savedAnchor.until)return;var target=savedAnchor.selector?q(savedAnchor.selector,content):null;if(target){var r=target.getBoundingClientRect(),cr=content.getBoundingClientRect();content.scrollTop+=r.top-cr.top-savedAnchor.offset;}else content.scrollTop=savedAnchor.scroll;}
function tuneText(type,rank){var text='Each Tune rank adds +4% multiplicative impact damage.';if(type==='concuss')text+=' Stun duration: '+(1.4+rank*.25).toFixed(2)+'s → '+(1.4+(rank+1)*.25).toFixed(2)+'s.';if(type==='poison')text+=' Cloud duration: '+(5+Math.min(3,rank*.5)).toFixed(1)+'s → '+(5+Math.min(3,(rank+1)*.5)).toFixed(1)+'s.';return text;}
function explainAmmoTuning(s){var buttons=qa('[data-ammo-rank]',content),i,btn,type,card,p;for(i=0;i<buttons.length;i++){btn=buttons[i];type=btn.getAttribute('data-ammo-rank');card=btn.closest('.ammo-card');if(!card||q('.tune-explainer',card))continue;p=document.createElement('p');p.className='tune-explainer';p.textContent=tuneText(type,Number((s.ammoRank&&s.ammoRank[type])||0));btn.parentNode.insertBefore(p,btn);}}
function refreshSheet(){if(!sheetOpen()||!content||!api)return;var sheet=currentSheet(),s=snap(),m;if(sheet==='board'||sheet==='ammo'){m=normalizeBlueprints(readBlueprints(),s);lockUnderlying(sheet,s,m);renderResearchPanel(sheet,s,m);}if(sheet==='ammo')explainAmmoTuning(s);requestAnimationFrame(restoreAnchor);setTimeout(restoreAnchor,40);}

/* ---------- enemy threat shorthand / hero armor ---------- */
function threatSignature(el){return[el.classList.contains('role-melee')?'m':'',el.classList.contains('role-ranged')?'r':'',el.classList.contains('role-hybrid')?'h':'',el.classList.contains('armored')?'a':'',el.classList.contains('regenerating')?'g':'',el.classList.contains('spectral')?'s':'',el.classList.contains('warded')?'w':'',el.classList.contains('stunned')?'t':''].join('');}
function decorateEnemies(){var lane=$('enemyLane');if(!lane)return;var enemies=qa('.enemy',lane),i,el,sig,old,icons,parts,j,span,bar,fill;for(i=0;i<enemies.length;i++){el=enemies[i];sig=threatSignature(el);old=q('.threat-icons',el);if(old&&old.getAttribute('data-threat-sig')===sig)continue;if(old)old.remove();parts=[];icons=document.createElement('div');icons.className='threat-icons';icons.setAttribute('data-threat-sig',sig);if(el.classList.contains('role-melee'))parts.push(['⚔','Melee']);else if(el.classList.contains('role-ranged'))parts.push(['➶','Ranged']);else if(el.classList.contains('role-hybrid'))parts.push(['◈','Hybrid']);if(el.classList.contains('armored'))parts.push(['▣','Armor']);if(el.classList.contains('regenerating'))parts.push(['↻','Regen']);if(el.classList.contains('spectral'))parts.push(['✧','Spectral']);if(el.classList.contains('warded'))parts.push(['⬡','Ward']);if(el.classList.contains('stunned'))parts.push(['✹','Stunned']);for(j=0;j<parts.length;j++){span=document.createElement('span');span.textContent=parts[j][0];span.setAttribute('aria-label',parts[j][1]);icons.appendChild(span);}el.insertBefore(icons,el.firstChild);bar=q('.hp-track',el);fill=bar&&q('.hp-fill',bar);if(bar&&fill)bar.setAttribute('aria-label',Math.round(parseFloat(fill.style.width)||0)+'% health remaining');}}
function ensureArmorBar(){var hero=$('heroUnit'),hp=hero&&q('.hp-track',hero),track;if(!hero||!hp)return null;track=q('.hero-armor-track',hero);if(!track){track=document.createElement('div');track.className='hero-armor-track';track.innerHTML='<i></i>';hp.insertAdjacentElement('afterend',track);}return track;}
function paintArmor(){var track=ensureArmorBar(),fill;if(!track)return;track.classList.toggle('active',armor.max>0);fill=q('i',track);if(fill)fill.style.width=(armor.max?Math.max(0,Math.min(100,armor.current/armor.max*100)):0)+'%';track.title=armor.max?Math.ceil(armor.current)+' / '+Math.ceil(armor.max)+' armor':'';}

function bindEvents(){
  mountPlacementBanner();
  if(board)board.addEventListener('pointerup',handleBoardPointer,true);
  document.addEventListener('pointerdown',function(ev){if(pegMenu&&!pegMenu.contains(ev.target)&&ev.target!==board)removePegMenu();},true);
  if(content){content.addEventListener('pointerdown',captureAnchor,true);content.addEventListener('click',function(e){captureAnchor(e);var buy=e.target&&e.target.closest?e.target.closest('[data-blueprint-buy]'):null;if(buy&&content.contains(buy)){e.preventDefault();e.stopPropagation();buyBlueprint(buy.getAttribute('data-blueprint-buy'));}},true);}
  var cancel=$('cancelPlacement');if(cancel)cancel.addEventListener('click',function(){if(moving)clearMove();});
  window.addEventListener('resize',function(){removePegMenu();renderHardware(true);});

  ['ips:pegUpgrade','ips:pegMove','ips:pegSell','ips:pegPlace'].forEach(function(name){document.addEventListener(name,function(){renderHardware(true);});});
  document.addEventListener('ips:upgrade',function(){renderHardware(true);});
  document.addEventListener('ips:peg',function(e){var d=e&&e.detail||{};if(d.index!==undefined&&d.index!==null)pulseHardware(Number(d.index));else if(d.type==='pin')pulseHardware(PIN);});
  document.addEventListener('ips:menu',function(){refreshSheet();});
  document.addEventListener('ips:ammoLoad',function(){requestAnimationFrame(restoreAnchor);});
  document.addEventListener('ips:waveClear',function(){watchBlueprintAvailability();setTimeout(suppressLegacyBlueprintToast,0);});
  document.addEventListener('ips:waveStart',function(e){var d=e.detail||{},s=snap();armor.max=Number(d.armorMax!==undefined?d.armorMax:Number(s.armor||0)*10);armor.current=Number(d.armor!==undefined?d.armor:armor.max);paintArmor();setTimeout(suppressLegacyBlueprintToast,0);});
  document.addEventListener('ips:runStart',function(e){var d=e.detail||{},s=snap();armor.max=Number(d.armorMax!==undefined?d.armorMax:Number(s.armor||0)*10);armor.current=Number(d.armor!==undefined?d.armor:armor.max);paintArmor();watchBlueprintAvailability();setTimeout(flushToasts,100);});
  document.addEventListener('ips:heroHit',function(e){var d=e.detail||{};if(d.armorMax!==undefined)armor.max=Number(d.armorMax||0);if(d.armor!==undefined)armor.current=Number(d.armor||0);paintArmor();});
  document.addEventListener('ips:lootChoice',function(){setTimeout(flushToasts,100);});

  var lane=$('enemyLane');
  if(lane)new MutationObserver(function(){requestAnimationFrame(decorateEnemies);}).observe(lane,{childList:true});
}

function boot(){api=window.__ipsAPI;if(!api||!api.snapshot||!board||!wrap)return false;bindEvents();renderHardware(true);decorateEnemies();var s=snap();armor.max=Number(s.armor||0)*10;armor.current=armor.max;paintArmor();watchBlueprintAvailability();if(sheetOpen())refreshSheet();return true;}
var tries=0,timer=setInterval(function(){tries++;if(boot()||tries>120)clearInterval(timer);},50);
})();
