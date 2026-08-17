(function(){
'use strict';
var ASSET='assets/sprites/';
var META={
 hero:{src:'hero-gunslinger.webp',cellW:256,cellH:384,frames:{idle:0,moveA:1,moveB:2,attack:3,hurt:4}},
 zombie:{src:'enemy-zombie.webp',cellW:256,cellH:384,frames:{idle:0,moveA:1,moveB:2,attack:3,hurt:4}},
 ghoul:{src:'enemy-ghoul.webp',cellW:256,cellH:384,frames:{idle:0,moveA:1,moveB:2,attack:3,hurt:4}},
 ghost:{src:'enemy-ghost.webp',cellW:256,cellH:384,frames:{idle:0,moveA:1,moveB:2,attack:3,hurt:4}},
 troll:{src:'enemy-troll.webp',cellW:320,cellH:384,frames:{idle:0,moveA:1,moveB:2,attack:3,hurt:4}},
 undertaker:{src:'boss-undertaker.webp',cellW:320,cellH:448,frames:{idle:0,moveA:1,moveB:2,attack:3,hurt:4}},
 deadeye:{src:'boss-deadeye.webp',cellW:320,cellH:448,frames:{idle:0,moveA:1,moveB:2,attack:3,hurt:4}},
 hank:{src:'boss-hank.webp',cellW:352,cellH:448,frames:{idle:0,moveA:1,moveB:2,attack:3,hurt:4}},
 nevermore:{src:'boss-nevermore.webp',cellW:320,cellH:448,frames:{idle:0,moveA:1,moveB:2,attack:3,hurt:4}},
 train:{src:'boss-last-train.webp',cellW:384,cellH:320,frames:{idle:0,moveA:1,moveB:2,attack:3,hurt:4}}
};
var cache={},views={},heroView=null,raf=0;
function now(){return performance.now();}
function load(key){if(cache[key])return cache[key];var m=META[key],img=new Image();cache[key]={img:img,ready:false,failed:false};img.onload=function(){cache[key].ready=true;};img.onerror=function(){cache[key].failed=true;};img.src=ASSET+m.src;return cache[key];}
function keyFor(el){var boss=el&&el.getAttribute('data-boss-type'),kind=el&&el.getAttribute('data-kind');return boss||kind||'zombie';}
function makeCanvas(host,key,id){var old=host.querySelector('.sprite-canvas');if(old)return old;var c=document.createElement('canvas');c.className='sprite-canvas';c.width=256;c.height=384;c.setAttribute('aria-hidden','true');c.dataset.spriteKey=key;c.dataset.entityId=id||'';host.appendChild(c);host.classList.add('sprite-ready');return c;}
function viewForEnemy(el){var id=el.getAttribute('data-enemy-id');if(!id)return null;var key=keyFor(el),host=el.querySelector('.unit-figure'),v=views[id];if(!host||!META[key])return null;if(!v||v.key!==key||!v.canvas.isConnected){var c=makeCanvas(host,key,id);v=views[id]={id:id,key:key,el:el,host:host,canvas:c,ctx:c.getContext('2d'),state:'idle',until:0,frame:-1,movePhase:0,lastAdvance:null,lastMoveAt:0};}else{v.el=el;v.host=host;}return v;}
function ensureHero(){var host=document.querySelector('.hero-art');if(!host)return null;if(!heroView||!heroView.canvas.isConnected){var c=makeCanvas(host,'hero','hero');heroView={id:'hero',key:'hero',el:document.getElementById('heroUnit'),host:host,canvas:c,ctx:c.getContext('2d'),state:'idle',until:0,frame:-1,movePhase:0,lastMoveAt:0};}return heroView;}
function state(v,s,ms){if(!v)return;var priority={idle:0,move:1,attack:2,hurt:3,death:4};if(priority[s]>=priority[v.state]||now()>=v.until){v.state=s;v.until=ms?now()+ms:0;v.frame=-1;}}
function draw(v,t){var m=META[v.key],a=load(v.key);if(!m||!a.ready||a.failed)return;var s=v.state;if(v.until&&t>=v.until){v.state='idle';v.until=0;s='idle';}var fi=m.frames.idle;if(s==='attack')fi=m.frames.attack;else if(s==='hurt'||s==='death')fi=m.frames.hurt;else if(s==='move'){fi=((Math.floor(t/260)+v.movePhase)&1)?m.frames.moveA:m.frames.moveB;}else if(v.id==='hero'){fi=((Math.floor(t/1450))&1)?m.frames.moveA:m.frames.idle;}if(fi===v.frame&&!v.el.classList.contains('focused'))return;v.frame=fi;var ctx=v.ctx,c=v.canvas;ctx.clearRect(0,0,c.width,c.height);ctx.save();if(v.el&&v.el.classList.contains('summoned'))ctx.globalAlpha=.86;ctx.drawImage(a.img,fi*m.cellW,0,m.cellW,m.cellH,0,0,c.width,c.height);ctx.restore();}
function scan(){var live={},els=document.querySelectorAll('#enemyLane .enemy'),i,v;for(i=0;i<els.length;i++){v=viewForEnemy(els[i]);if(v)live[v.id]=1;}Object.keys(views).forEach(function(id){if(!live[id])delete views[id];});ensureHero();}
function inferMovement(v,t){if(!v||!v.el)return;var tr=v.el.style.transform||'',m=/translate3d\((-?[\d.]+)px/.exec(tr),x=m?Number(m[1]):0;if(v.lastAdvance===null)v.lastAdvance=x;if(Math.abs(x-v.lastAdvance)>.12){v.lastMoveAt=t;v.lastAdvance=x;if(v.state==='idle')v.state='move';}else if(v.state==='move'&&t-v.lastMoveAt>220)v.state='idle';if(v.el.classList.contains('enemy-lunge'))state(v,'attack',260);if(v.el.classList.contains('hit'))state(v,'hurt',180);}
function loop(t){scan();Object.keys(views).forEach(function(id){var v=views[id];inferMovement(v,t);draw(v,t);});if(heroView){if(heroView.el&&heroView.el.classList.contains('hero-hit'))state(heroView,'hurt',210);draw(heroView,t);}raf=requestAnimationFrame(loop);}
function enemyById(id){return id&&views[id]||null;}
function primaryEnemy(){var f=document.querySelector('#enemyLane .enemy.focused')||document.querySelector('#enemyLane .enemy');return f?enemyById(f.getAttribute('data-enemy-id')):null;}
document.addEventListener('ips:shot',function(){state(heroView||ensureHero(),'attack',165);});
document.addEventListener('ips:heroHit',function(){state(heroView||ensureHero(),'hurt',220);});
document.addEventListener('ips:heroDeath',function(){state(heroView||ensureHero(),'death',700);});
document.addEventListener('ips:enemyAttack',function(e){state(enemyById(e.detail&&e.detail.id)||primaryEnemy(),'attack',260);});
document.addEventListener('ips:enemyHit',function(e){var v=enemyById(e.detail&&e.detail.id)||primaryEnemy();state(v,'hurt',185);});
document.addEventListener('ips:enemyDeath',function(e){var v=enemyById(e.detail&&e.detail.id);state(v,'death',420);});
document.addEventListener('ips:waveStart',function(){scan();});
Object.keys(META).forEach(load);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){scan();raf=requestAnimationFrame(loop);});else{scan();raf=requestAnimationFrame(loop);}
window.__ipsSprites={meta:META,refresh:scan};
})();
