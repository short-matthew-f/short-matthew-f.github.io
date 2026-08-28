  'use strict';

  const $ = id => document.getElementById(id);
  const stage = $('stage');
  const ctx = stage.getContext('2d');
  const ui = {
    hint:$('hint'), badge:$('badge'), loading:$('loading'), draw:$('drawControls'), demo:$('demoControls'),
    undo:$('undoBtn'), finish:$('finishBtn'), back:$('backBtn'), next:$('nextBtn'), play:$('playBtn'),
    restart:$('restartBtn'), count:$('stepCount'), title:$('stepTitle'), text:$('stepText'), speed:$('speedBtn'),
    info:$('infoBtn'), dialog:$('infoDialog'), closeInfo:$('closeInfo')
  };

  let dpr=1,W=0,H=0, points=[], mode='draw', solution=null, steps=[], stepIndex=0;
  let playing=false, animToken=0, speed=1;
  const speeds=[0.7,1,1.35];
  const visual={foldStage:0,creases:0,cut:0,reveal:0};

  const V={
    add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
    sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
    mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
    dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
    cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
    len:a=>Math.hypot(a[0],a[1],a[2]),
    norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];}
  };
  const I3=()=>[[1,0,0],[0,1,0],[0,0,1]];
  const M={
    apply:(A,v)=>[A[0][0]*v[0]+A[0][1]*v[1]+A[0][2]*v[2],A[1][0]*v[0]+A[1][1]*v[1]+A[1][2]*v[2],A[2][0]*v[0]+A[2][1]*v[1]+A[2][2]*v[2]],
    mul:(A,B)=>A.map((r,i)=>B[0].map((_,j)=>r[0]*B[0][j]+r[1]*B[1][j]+r[2]*B[2][j])),
    T:A=>[[A[0][0],A[1][0],A[2][0]],[A[0][1],A[1][1],A[2][1]],[A[0][2],A[1][2],A[2][2]]]
  };
  const TI=()=>({R:I3(),t:[0,0,0]});
  const TA=(T,p)=>V.add(M.apply(T.R,p),T.t);
  const TC=(A,B)=>({R:M.mul(A.R,B.R),t:V.add(M.apply(A.R,B.t),A.t)});
  const TInv=A=>{const R=M.T(A.R);return{R,t:V.mul(M.apply(R,A.t),-1)}};

  function rotAxis(axis,angle){
    const [x,y,z]=V.norm(axis),c=Math.cos(angle),s=Math.sin(angle),q=1-c;
    return [[c+x*x*q,x*y*q-z*s,x*z*q+y*s],[y*x*q+z*s,c+y*y*q,y*z*q-x*s],[z*x*q-y*s,z*y*q+x*s,c+z*z*q]];
  }
  function rotLine(a,b,angle){const R=rotAxis(V.sub(b,a),angle);return{R,t:V.sub(a,M.apply(R,a))};}

  function resize(){
    const r=stage.parentElement.getBoundingClientRect();
    dpr=Math.min(window.devicePixelRatio||1,2); W=r.width; H=r.height;
    stage.width=Math.max(1,Math.round(W*dpr)); stage.height=Math.max(1,Math.round(H*dpr));
    stage.style.width=W+'px'; stage.style.height=H+'px'; ctx.setTransform(dpr,0,0,dpr,0,0); render();
  }
  new ResizeObserver(resize).observe(stage.parentElement);
  function paperRect(){const m=Math.max(24,Math.min(W,H)*.075);return{x:m,y:m+12,w:W-2*m,h:H-2*m-18};}
  function pointerPoint(e){const r=stage.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  function insidePaper(p){const r=paperRect();return p.x>r.x+8&&p.x<r.x+r.w-8&&p.y>r.y+8&&p.y<r.y+r.h-8;}
  const d2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const orient=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  function segIntersect(a,b,c,d){const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);return((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0));}
  function simplePolygon(p){
    const n=p.length;if(n<3)return false;
    for(let i=0;i<n;i++){for(let j=i+1;j<n;j++){if(Math.abs(i-j)<=1||(i===0&&j===n-1))continue;if(segIntersect(p[i],p[(i+1)%n],p[j],p[(j+1)%n]))return false;}}
    return true;
  }

  stage.addEventListener('pointerup',e=>{
    if(mode!=='draw')return;const p=pointerPoint(e);if(!insidePaper(p))return;if(points.length&&d2(points[points.length-1],p)<12)return;
    points.push(p);updateDrawUI();render();
  });
  ui.undo.onclick=()=>{points.pop();updateDrawUI();render();};
  ui.finish.onclick=finishShape; ui.restart.onclick=restart;
  ui.back.onclick=()=>goStep(stepIndex-1); ui.next.onclick=()=>goStep(stepIndex+1);
  ui.play.onclick=()=>playing?stopPlay():startPlay();
  ui.speed.onclick=()=>{speed=speeds[(speeds.indexOf(speed)+1)%speeds.length];ui.speed.textContent=(speed===1?'1':speed.toFixed(2).replace(/0$/,''))+'×';};
  ui.info.onclick=()=>ui.dialog.showModal(); ui.closeInfo.onclick=()=>ui.dialog.close();

  function updateDrawUI(){
    ui.undo.disabled=!points.length;ui.finish.disabled=points.length<3;
    ui.hint.textContent=points.length===0?'Tap the paper to place your first vertex.':points.length<3?'Keep tapping to add vertices.':'Add vertices, then tap Finish shape.';
  }
  function restart(){
    animToken++;playing=false;points=[];solution=null;steps=[];stepIndex=0;mode='draw';Object.assign(visual,{foldStage:0,creases:0,cut:0,reveal:0});
    ui.draw.classList.remove('hidden');ui.demo.classList.add('hidden');ui.badge.classList.add('hidden');ui.hint.classList.remove('hidden');ui.loading.classList.add('hidden');updateDrawUI();render();
  }
  function toSolverPoints(pts){const r=paperRect(),sx=560/r.w,sy=420/r.h;return pts.map(p=>({x:80+(p.x-r.x)*sx,y:70+(r.y+r.h-p.y)*sy}));}

  async function finishShape(){
    if(points.length<3)return;
    if(!simplePolygon(points)){ui.hint.textContent='That outline crosses itself. Undo a point and try a simple polygon.';return;}
    mode='busy';ui.loading.classList.remove('hidden');ui.hint.textContent='Building solver-derived fold packets…';await new Promise(r=>setTimeout(r,60));
    try{
      solution=solveWithMIT(points);buildSteps();mode='demo';ui.loading.classList.add('hidden');ui.draw.classList.add('hidden');ui.demo.classList.remove('hidden');ui.hint.classList.add('hidden');ui.badge.classList.remove('hidden');goStep(0,true);
    }catch(err){
      console.error(err);mode='draw';ui.loading.classList.add('hidden');ui.hint.classList.remove('hidden');ui.hint.textContent='This shape hit a geometry limitation. Try moving one vertex slightly and finish again.';
    }
  }

  function solveWithMIT(pts){
    if(typeof window.Point!=='function'||typeof window.foldAndCut!=='function'||typeof window.computeCorridors!=='function')throw new Error('Fold-and-cut geometry library did not load.');
    const raw=toSolverPoints(pts);const editorSeq=raw.map(p=>new window.Point(p.x,p.y));editorSeq.push(editorSeq[0]);editorSeq.push('marker');
    const seq=typeof window.removeMarkers==='function'?window.removeMarkers(editorSeq):editorSeq.slice(0,-1);
    const oldAlert=window.alert;let solverAlert='';window.alert=m=>{solverAlert=String(m)};let out;
    try{out=window.foldAndCut(seq);}finally{window.alert=oldAlert;}
    if(solverAlert)throw new Error(solverAlert);
    const CP=out[0];if(!CP||!CP.cPVs||!CP.cPEs||out[4])throw new Error('No usable crease pattern.');

    const corridorsRaw=window.computeCorridors(CP);
    const index=new Map(CP.cPVs.map((v,i)=>[v,i]));
    const edgeIndex=new Map(CP.cPEs.map((e,i)=>[e,i]));

    let fs;
    try{fs=window.foldedState(CP);window.fold(CP,fs[2],fs[3]);}catch(e){throw new Error('Could not compute the final folded state: '+e.message);}

    const vertices=CP.cPVs.map((v,i)=>({id:i,x:v.x,y:v.y,fx:v.foldedPos?.x??v.x,fy:v.foldedPos?.y??v.y,type:v.type}));
    const edges=CP.cPEs.map((e,i)=>({id:i,a:index.get(e.endpt1),b:index.get(e.endpt2),type:e.type,assignment:(e.assignment||'u').toLowerCase()})).filter(e=>Number.isInteger(e.a)&&Number.isInteger(e.b));

    const faces=[];const faceByKey=new Map();
    function faceIds(df){
      const arr=Array.isArray(df?.[0])?df[0]:[];const ids=[];
      for(const v of arr){const id=index.get(v);if(Number.isInteger(id)&&ids[ids.length-1]!==id)ids.push(id);}if(ids.length>2&&ids[0]===ids[ids.length-1])ids.pop();return ids;
    }
    function keyFor(ids){return ids.slice().sort((a,b)=>a-b).join(',');}
    function getFaceId(df){
      const ids=faceIds(df);if(ids.length<3)return-1;const key=keyFor(ids);
      if(!faceByKey.has(key)){const id=faces.length;faceByKey.set(key,id);faces.push({id,verts:ids});}
      return faceByKey.get(key);
    }
    const corridors=[];
    corridorsRaw.forEach((corr,ci)=>{
      const ids=corr.faces.map(getFaceId).filter(id=>id>=0);
      if(ids.length) corridors.push({id:ci,faceIds:ids,raw:corr});
    });
    if(!faces.length)throw new Error('Solver returned no paper faces.');

    const ops=[];const byRound=[];const corridorOps=Array.from({length:corridors.length},()=>[]);
    corridors.forEach(c=>{
      const cf=c.raw.faces;let localRound=0;
      for(let i=0;i<cf.length-1;i++){
        const eobj=(cf[i][1]||[]).find(e=>(cf[i+1][1]||[]).includes(e));
        if(!eobj)continue;const as=(eobj.assignment||'u').toLowerCase();if(as!=='m'&&as!=='v')continue;
        const ei=edgeIndex.get(eobj);if(!Number.isInteger(ei))continue;
        const stationary=c.faceIds[i],moving=c.faceIds.slice(i+1).filter(Number.isInteger);
        if(!Number.isInteger(stationary)||!moving.length)continue;
        const op={id:ops.length,corridor:c.id,round:localRound++,edgeIndex:ei,stationary,moving,assignment:as,angle:as==='m'?-Math.PI:Math.PI};
        ops.push(op);(byRound[op.round]??=[]).push(op);corridorOps[corridors.indexOf(c)].push(op);
      }
    });
    if(!ops.length)throw new Error('No fold packet sequence was found.');

    return prepareSolution({vertices,edges,faces,corridors,ops,corridorOps,fallbackGroups:byRound.filter(Boolean),targetPolygon:raw,solver:'solver corridor packets'});
  }
