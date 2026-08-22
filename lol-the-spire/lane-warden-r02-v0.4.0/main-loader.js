(() => {
  'use strict';
  function patch(source,from,to,label,required=true){
    if(!source.includes(from)){
      if(required)throw new Error('R-02 runtime patch sentinel mismatch: '+label);
      return source;
    }
    return source.replace(from,to);
  }
  async function boot(){
    const res=await fetch('./main.js',{cache:'no-store'});
    if(!res.ok)throw new Error('Could not load R-02 runtime: '+res.status);
    let source=await res.text();

    source=patch(source,
      "const speed=a.speed*(world.time<(a.slowUntil||0)?.0.55:1);",
      "const speed=a.speed*(world.time<(a.slowUntil||0)?0.55:1);",
      'slow-state token');

    // Keep physical lane ownership tied to junction travel. Intent may point at the
    // destination immediately, but Presence/combat/lane-strip location follows the
    // lane actually reached along the route, including an intermediate middle lane.
    source=patch(source,"lane:'north',hp:P.commanderHp","lane:'north',targetLane:'north',hp:P.commanderHp",'Commander target lane');
    source=patch(source,
      "if(d<=speed*dt+.02){entity.x=p.x;entity.y=p.y;entity.path.shift();if(!entity.path.length&&onArrive)onArrive();return;}",
      "if(d<=speed*dt+.02){entity.x=p.x;entity.y=p.y;const reached=laneIds.find(l=>Math.abs(laneMeta[l].y-entity.y)<.1);if(reached)entity.lane=reached;entity.path.shift();if(!entity.path.length&&onArrive)onArrive();return;}",
      'physical lane at junction waypoint');
    source=patch(source,"world.commander.path=routeBetween(world.commander.x,world.commander.y,targetX,targetLane);world.commander.lane=targetLane;if(from!==targetLane)","world.commander.path=routeBetween(world.commander.x,world.commander.y,targetX,targetLane);world.commander.targetLane=targetLane;if(from!==targetLane)",'Commander order ownership');
    source=patch(source,"moveAlong(c,dt,5.2,()=>ev('commander-arrived',{lane:c.lane,x:+c.x.toFixed(1)}));","moveAlong(c,dt,5.2,()=>{c.lane=c.targetLane;ev('commander-arrived',{lane:c.lane,x:+c.x.toFixed(1)});});",'Commander arrival ownership');
    source=patch(source,"c.x=-47;c.y=laneMeta[laneId].y;c.lane=laneId;c.path=[];","c.x=-47;c.y=laneMeta[laneId].y;c.lane=laneId;c.targetLane=laneId;c.path=[];",'Waypoint target lane');
    source=patch(source,"c.x=-62;c.y=laneMeta.mid.y;c.lane='mid';c.path=[];","c.x=-62;c.y=laneMeta.mid.y;c.lane='mid';c.targetLane='mid';c.path=[];",'Commander reform target lane');
    source=patch(source,"world.rival.path=routeBetween(world.rival.x,world.rival.y,8,choice.lane);world.rival.lane=choice.lane;world.rival.nextDecision=","world.rival.path=routeBetween(world.rival.x,world.rival.y,8,choice.lane);world.rival.nextDecision=",'Rival order ownership');
    source=patch(source,"moveAlong(r,dt,P.rivalSpeed,()=>ev('rival-arrived',{lane:r.lane,x:+r.x.toFixed(1)}));","moveAlong(r,dt,P.rivalSpeed,()=>{r.lane=r.targetLane;ev('rival-arrived',{lane:r.lane,x:+r.x.toFixed(1)});});",'Rival arrival ownership');

    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(new Error('R-02 runtime parse/boot failure'));document.body.appendChild(s);});
    URL.revokeObjectURL(url);
  }
  boot().catch(err=>{console.error(err);const fatal=document.getElementById('fatal');if(fatal){fatal.hidden=false;const h=fatal.querySelector('h1'),p=fatal.querySelector('p');if(h)h.textContent='R-02 spike boot failed';if(p)p.textContent=err.message;}});
})();
