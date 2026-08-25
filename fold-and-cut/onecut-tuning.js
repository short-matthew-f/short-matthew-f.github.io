  // v12 presentation tuning: keep the user's target shape legible on Step 1,
  // then ease back to the full-paper framing for the crease construction.
  // Also give the compound fold a little more time to read visually.

  function targetViewFrame(){
    if(!solution)return null;
    if(solution._targetViewFrame)return solution._targetViewFrame;
    const ids=new Set();
    solution.edges.forEach(e=>{if(edgeKind(e)==='target'){ids.add(e.a);ids.add(e.b);}});
    const verts=[...ids].map(id=>solution.vertices[id]).filter(Boolean);
    if(!verts.length)return null;
    const xs=verts.map(v=>v.x),ys=verts.map(v=>v.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const span=Math.max(maxX-minX,maxY-minY,1)*1.4;
    solution._targetViewFrame={center:[(minX+maxX)/2,(minY+maxY)/2,0],span};
    return solution._targetViewFrame;
  }

  project = function(p){
    const reveal=Math.max(0,Math.min(1,visual.reveal||0));
    const focus=Math.max(0,Math.min(1,visual.frameFocus||0));
    const fullCenter=solution?.center||[360,280,0];
    const fullSpan=solution?Math.max(solution.bounds.maxX-solution.bounds.minX,solution.bounds.maxY-solution.bounds.minY):560;
    const target=targetViewFrame();
    const targetCenter=target?.center||fullCenter,targetSpan=target?.span||fullSpan;
    const c=[
      fullCenter[0]+(targetCenter[0]-fullCenter[0])*focus,
      fullCenter[1]+(targetCenter[1]-fullCenter[1])*focus,
      0
    ];
    const span=fullSpan+(targetSpan-fullSpan)*focus;
    const d=V.sub(p,c);
    const yaw=-.34*(1-reveal),pitch=.72*(1-reveal),cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const x=cy*d[0]-sy*d[1],y=sy*d[0]+cy*d[1],z=d[2],yy=cp*y-sp*z,zz=sp*y+cp*z;
    const scale=Math.min(W,H)*.72/Math.max(1,span),cam=850,persp=cam/(cam-zz);
    return{x:W/2+x*scale*persp,y:H*.53-yy*scale*persp,depth:zz,z:p[2],persp};
  };

  goStep = function(i,instant=false){
    i=Math.max(0,Math.min(steps.length-1,i));
    stepIndex=i;
    const s=steps[i];
    updateStepUI();
    const focus=i===0?1:(s.reveal?.85:0);
    const end={foldStage:s.foldStage,creases:s.creases,cut:s.cut,reveal:s.reveal,frameFocus:focus};
    if(instant){Object.assign(visual,end);render();return;}
    const foldMotion=solution?.mode==='compound'&&Math.abs((end.foldStage||0)-(visual.foldStage||0))>.001;
    const baseDuration=solution?.mode==='compound'?(foldMotion?1700:1450):1050;
    animate({...visual},end,baseDuration/speed);
  };
