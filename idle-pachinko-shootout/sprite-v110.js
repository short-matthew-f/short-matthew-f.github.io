(function(){
'use strict';

var META={
  hero:{src:'assets/sprites/v110/hero.png',fw:64,fh:80,facing:'right'},
  zombie:{src:'assets/sprites/v110/zombie.png',fw:64,fh:80,facing:'left'},
  ghoul:{src:'assets/sprites/v110/ghoul.png',fw:64,fh:80,facing:'left'},
  ghost:{src:'assets/sprites/v110/ghost.png',fw:64,fh:80,facing:'left',floating:true},
  troll:{src:'assets/sprites/v110/troll.png',fw:80,fh:96,facing:'left',heavy:true}
};
var FRAME={idle:0,moveA:1,moveB:2,attack:3,hurt:4};
var images={},status={},views={},hero=null,lastScan=0;

Object.keys(META).forEach(function(key){
  status[key]='loading';
  var im=new Image();
  images[key]=im;
  im.decoding='async';
  im.onload=function(){
    var m=META[key];
    if(im.naturalWidth!==m.fw*5||im.naturalHeight!==m.fh){
      status[key]='failed';
      console.warn('IPS v1.10 '+key+' sprite has unexpected dimensions; using painted fallback.',im.naturalWidth,im.naturalHeight);
      return;
    }
    status[key]='ready';
    scan(true);
  };
  im.onerror=function(){
    status[key]='failed';
    console.warn('IPS v1.10 '+key+' pixel sprite failed; using painted fallback.');
  };
  im.src=META[key].src+'?v=1';
});

function now(){return performance.now();}
function enemyId(el){return el&&el.getAttribute('data-enemy-id');}
function keyFromName(name){
  var n=(name||'').toLowerCase();
  if(n.indexOf('undertaker')>=0)return'undertaker';
  if(n.indexOf('dead-eye')>=0||n.indexOf('dead eye')>=0)return'deadeye';
  if(n.indexOf('big hank')>=0)return'hank';
  if(n.indexOf('nevermore')>=0)return'nevermore';
  if(n.indexOf('last train')>=0)return'train';
  if(n.indexOf('troll')>=0)return'troll';
  if(n.indexOf('ghost')>=0||n.indexOf('wraith')>=0||n.indexOf('specter')>=0||n.indexOf('gunner')>=0||n.indexOf('gunhand')>=0)return'ghost';
  if(n.indexOf('ghoul')>=0||n.indexOf('hound')>=0||n.indexOf('stalker')>=0)return'ghoul';
  return'zombie';
}

function makeCanvas(host,id,key){
  var m=META[key];
  if(!m)return null;
  var c=host.querySelector('canvas.sprite-v110');
  if(!c){
    c=document.createElement('canvas');
    c.className='sprite-v110 sprite-'+key;
    c.width=m.fw;
    c.height=m.fh;
    c.setAttribute('aria-hidden','true');
    c.dataset.entityId=id||'';
    c.dataset.spriteKey=key;
    host.appendChild(c);
    var ctx=c.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    if('webkitImageSmoothingEnabled' in ctx)ctx.webkitImageSmoothingEnabled=false;
    if('mozImageSmoothingEnabled' in ctx)ctx.mozImageSmoothingEnabled=false;
  }
  if(status[key]==='ready')host.classList.add('sprite-v110-ready');
  return c;
}

function view(el){
  var id=enemyId(el),host=el&&el.querySelector('.unit-figure'),name=el&&el.querySelector('.enemy-name'),key,v,c;
  if(!id||!host)return null;
  key=keyFromName(name&&name.textContent);
  el.dataset.spriteKey=key;
  if(name&&/Wraith Deputy/i.test(name.textContent||''))el.dataset.summoned='1';

  // Bosses that do not yet have validated v1.10 pixel art deliberately keep the v1.8 painted fallback.
  if(!META[key]){
    host.classList.remove('sprite-v110-ready');
    return null;
  }

  v=views[id];
  if(!v||v.key!==key){
    c=makeCanvas(host,id,key);
    if(!c)return null;
    v=views[id]={id:id,key:key,el:el,host:host,c:c,ctx:c.getContext('2d'),state:'idle',until:0,lastX:null,lastMove:0,phase:(id.length%2),frame:-1};
    v.ctx.imageSmoothingEnabled=false;
  }else{
    v.el=el;v.host=host;
    if(!v.c.isConnected){
      v.c=makeCanvas(host,id,key);
      if(!v.c)return null;
      v.ctx=v.c.getContext('2d');
      v.ctx.imageSmoothingEnabled=false;
      v.frame=-1;
    }
  }
  if(status[key]==='ready')host.classList.add('sprite-v110-ready');
  return v;
}

function heroView(){
  var host=document.querySelector('.hero-art'),unit=document.getElementById('heroUnit'),c;
  if(!host)return null;
  if(!hero||!hero.c.isConnected){
    c=makeCanvas(host,'hero','hero');
    if(!c)return null;
    hero={id:'hero',key:'hero',el:unit,host:host,c:c,ctx:c.getContext('2d'),state:'idle',until:0,phase:0,frame:-1};
    hero.ctx.imageSmoothingEnabled=false;
  }
  if(status.hero==='ready')host.classList.add('sprite-v110-ready');
  return hero;
}

function priority(s){return {idle:0,move:1,attack:2,hurt:3,death:4}[s]||0;}
function setState(v,state,ms){
  if(!v)return;
  var n=now();
  if(n>=v.until||priority(state)>=priority(v.state)){
    v.state=state;
    v.until=ms?n+ms:0;
    v.frame=-1;
  }
}
function syncClass(v){
  if(!v||!v.el)return;
  v.el.classList.toggle('sprite-hurt',v.state==='hurt'||v.state==='death');
  v.el.classList.toggle('sprite-attack',v.state==='attack');
}

function frameFor(v,t){
  if(v.state==='hurt'||v.state==='death')return FRAME.hurt;
  if(v.state==='attack')return FRAME.attack;
  if(v.state==='move')return ((Math.floor(t/(v.key==='ghoul'?170:230))+v.phase)&1)?FRAME.moveA:FRAME.moveB;
  if(v.key==='hero')return (Math.floor(t/1450)&1)?FRAME.moveA:FRAME.idle;
  if(v.key==='ghost')return (Math.floor(t/1050)&1)?FRAME.moveA:FRAME.idle;
  return FRAME.idle;
}

function draw(v,t){
  if(!v||status[v.key]!=='ready')return;
  var im=images[v.key],m=META[v.key];
  if(!im||!im.naturalWidth||!m)return;
  if(v.until&&t>=v.until){v.state='idle';v.until=0;v.frame=-1;}
  var f=frameFor(v,t);
  if(f===v.frame){syncClass(v);return;}
  v.frame=f;
  var ctx=v.ctx;
  ctx.imageSmoothingEnabled=false;
  ctx.clearRect(0,0,m.fw,m.fh);
  ctx.drawImage(im,f*m.fw,0,m.fw,m.fh,0,0,m.fw,m.fh);
  syncClass(v);
}

function motion(v,t){
  var s=v.el&&v.el.style.transform||'',match=/translate3d\((-?[\d.]+)px/.exec(s),x=match?Number(match[1]):0;
  if(v.lastX===null)v.lastX=x;
  if(Math.abs(x-v.lastX)>.08){
    v.lastX=x;v.lastMove=t;
    if(v.state==='idle')v.state='move';
  }else if(v.state==='move'&&t-v.lastMove>210){
    v.state='idle';
  }
  if(v.el&&v.el.classList.contains('enemy-lunge'))setState(v,'attack',240);
}

function scan(force){
  var t=now();
  if(!force&&t-lastScan<120)return;
  lastScan=t;
  var els=document.querySelectorAll('#enemyLane .enemy'),live={},i,v;
  for(i=0;i<els.length;i++){
    v=view(els[i]);
    if(v)live[v.id]=1;
  }
  Object.keys(views).forEach(function(id){if(!live[id])delete views[id];});
  heroView();
}

function currentHit(){
  var el=document.querySelector('#enemyLane .enemy.hit');
  return el?views[enemyId(el)]||view(el):null;
}
function attackerFromFx(){
  var lung=document.querySelector('#enemyLane .enemy.enemy-lunge');
  if(lung)return views[enemyId(lung)]||view(lung);
  var lines=document.querySelectorAll('#combatFx .enemy-tracer'),line=lines.length?lines[lines.length-1]:null,combat=document.getElementById('combat');
  if(line&&combat){
    var cr=combat.getBoundingClientRect(),sx=parseFloat(line.style.left)||0,sy=parseFloat(line.style.top)||0,best=null,bd=1e9;
    document.querySelectorAll('#enemyLane .enemy').forEach(function(el){
      var r=el.getBoundingClientRect(),dx=(r.left-cr.left+r.width*.35)-sx,dy=(r.top-cr.top+r.height*.42)-sy,d=dx*dx+dy*dy;
      if(d<bd){bd=d;best=el;}
    });
    if(best)return views[enemyId(best)]||view(best);
  }
  return null;
}

document.addEventListener('ips:shot',function(){setState(heroView(),'attack',160);});
document.addEventListener('ips:heroHit',function(){setState(heroView(),'hurt',220);setState(attackerFromFx(),'attack',230);});
document.addEventListener('ips:heroDeath',function(){setState(heroView(),'death',900);});
document.addEventListener('ips:enemyHit',function(){setState(currentHit(),'hurt',180);});
document.addEventListener('ips:enemyDeath',function(){setState(currentHit(),'death',400);});
document.addEventListener('ips:waveStart',function(){setTimeout(function(){scan(true);},0);});

function loop(t){
  scan(false);
  Object.keys(views).forEach(function(id){motion(views[id],t);draw(views[id],t);});
  draw(heroView(),t);
  requestAnimationFrame(loop);
}
function boot(){
  scan(true);
  var lane=document.getElementById('enemyLane');
  if(lane)new MutationObserver(function(){scan(true);}).observe(lane,{childList:true,subtree:true});
  requestAnimationFrame(loop);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,120);});
else setTimeout(boot,120);

window.__ipsSpriteV110={refresh:function(){scan(true);},meta:META,status:status};
})();
