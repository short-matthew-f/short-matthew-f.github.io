(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const stage = $('stage'), c = stage.getContext('2d');
  const ui = {
    hint:$('hint'), badge:$('badge'), loading:$('loading'), draw:$('drawControls'), demo:$('demoControls'),
    undo:$('undoBtn'), finish:$('finishBtn'), back:$('backBtn'), next:$('nextBtn'), play:$('playBtn'), restart:$('restartBtn'),
    count:$('stepCount'), title:$('stepTitle'), text:$('stepText'), speed:$('speedBtn'), info:$('infoBtn'), dialog:$('infoDialog'), closeInfo:$('closeInfo')
  };

  let dpr=1,W=0,H=0, points=[], mode='draw', solution=null, steps=[], stepIndex=0, visual={fold:0,revealSkeleton:0,cut:0,unfold:0}, animToken=0, playing=false, speed=1;
  const speeds=[.7,1,1.35];

  function resize(){
    const r=stage.parentElement.getBoundingClientRect(); dpr=Math.min(devicePixelRatio||1,2); W=r.width; H=r.height;
    stage.width=Math.round(W*dpr); stage.height=Math.round(H*dpr); stage.style.width=W+'px'; stage.style.height=H+'px';
    c.setTransform(dpr,0,0,dpr,0,0); render();
  }
  new ResizeObserver(resize).observe(stage.parentElement);

  function paperRect(){ const m=Math.max(24,Math.min(W,H)*.075); return {x:m,y:m+10,w:W-2*m,h:H-2*m-10}; }
  function canvasPoint(ev){ const r=stage.getBoundingClientRect(); return {x:ev.clientX-r.left,y:ev.clientY-r.top}; }
  function insidePaper(p){ const r=paperRect(); return p.x>r.x+6&&p.x<r.x+r.w-6&&p.y>r.y+6&&p.y<r.y+r.h-6; }
  function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function orient(a,b,c0){return (b.x-a.x)*(c0.y-a.y)-(b.y-a.y)*(c0.x-a.x)}
  function segIntersect(a,b,c0,d){
    const o1=orient(a,b,c0),o2=orient(a,b,d),o3=orient(c0,d,a),o4=orient(c0,d,b);
    return ((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0));
  }
  function simplePolygon(pts){
    const n=pts.length; if(n<3)return false;
    for(let i=0;i<n;i++){ const a=pts[i],b=pts[(i+1)%n]; for(let j=i+1;j<n;j++){
      if(Math.abs(i-j)<=1||(i===0&&j===n-1))continue; const cc=pts[j],d=pts[(j+1)%n]; if(segIntersect(a,b,cc,d))return false;
    }} return true;
  }

  stage.addEventListener('pointerup', e=>{
    if(mode!=='draw')return; const p=canvasPoint(e); if(!insidePaper(p))return;
    if(points.length && dist(points[points.length-1],p)<12)return;
    points.push(p); updateDrawUI(); render();
  });
  ui.undo.onclick=()=>{points.pop();updateDrawUI();render()};
  ui.finish.onclick=finishShape;
  ui.restart.onclick=restart;
  ui.back.onclick=()=>goStep(stepIndex-1);
  ui.next.onclick=()=>goStep(stepIndex+1);
  ui.play.onclick=()=> playing ? stopPlay() : startPlay();
  ui.speed.onclick=()=>{ const i=(speeds.indexOf(speed)+1)%speeds.length; speed=speeds[i]; ui.speed.textContent=(speed===1?'1':speed.toFixed(2).replace(/0$/,''))+'×'; };
  ui.info.onclick=()=>ui.dialog.showModal(); ui.closeInfo.onclick=()=>ui.dialog.close();

  function updateDrawUI(){
    ui.undo.disabled=!points.length; ui.finish.disabled=points.length<3;
    ui.hint.textContent=points.length===0?'Tap the paper to place your first vertex.':points.length<3?'Keep tapping to add vertices.':'Add vertices, then tap Finish shape.';
  }

  function restart(){ animToken++;playing=false;points=[];solution=null;steps=[];stepIndex=0;mode='draw';visual={fold:0,revealSkeleton:0,cut:0,unfold:0};ui.draw.classList.remove('hidden');ui.demo.classList.add('hidden');ui.badge.classList.add('hidden');ui.hint.classList.remove('hidden');updateDrawUI();render(); }

  async function finishShape(){
    if(points.length<3)return;
    if(!simplePolygon(points)){ ui.hint.textContent='That outline crosses itself. Undo a point and try a simple polygon.'; return; }
    mode='busy'; ui.loading.classList.remove('hidden'); ui.hint.textContent='Building the crease pattern…';
    await new Promise(r=>setTimeout(r,60));
    try{ solution=solveWithMIT(points); }
    catch(err){ console.warn('MIT solver unavailable or failed; using illustrative fallback.',err); solution=solveFallback(points); }
    buildSteps(); mode='demo'; ui.loading.classList.add('hidden'); ui.draw.classList.add('hidden'); ui.demo.classList.remove('hidden'); ui.hint.classList.add('hidden'); ui.badge.classList.remove('hidden'); goStep(0,true);
  }

  function toSolverPoints(pts){
    const r=paperRect(), sx=560/r.w, sy=420/r.h;
    return pts.map(p=>({x:80+(p.x-r.x)*sx,y:70+(r.y+r.h-p.y)*sy}));
  }

  function solveWithMIT(pts){
    if(typeof window.Point!=='function'||typeof window.foldAndCut!=='function') throw new Error('Geometry library not loaded');
    const raw=toSolverPoints(pts); const seq=raw.map(p=>new window.Point(p.x,p.y)); seq.push(seq[0]); seq.push('marker');
    const oldAlert=window.alert; let solverAlert=''; window.alert=(m)=>{solverAlert=String(m)}; let out; try{out=window.foldAndCut(seq)} finally{window.alert=oldAlert} if(solverAlert) throw new Error(solverAlert); const CP=out[0];
    if(!CP||!CP.cPVs||!CP.cPEs||out[4]) throw new Error('Solver did not produce a usable crease pattern');
    try{ const fs=window.foldedState(CP); window.fold(CP,fs[2],fs[3]); }catch(e){ console.warn('Flat-state computation issue',e); }
    const vertices=CP.cPVs.map((v,i)=>({id:i,x:v.x,y:v.y,fx:v.foldedPos?.x??v.x,fy:v.foldedPos?.y??v.y,type:v.type}));
    const index=new Map(CP.cPVs.map((v,i)=>[v,i]));
    const edges=CP.cPEs.map(e=>({a:index.get(e.endpt1),b:index.get(e.endpt2),type:e.type,assignment:(e.assignment||'u').toLowerCase()})).filter(e=>Number.isInteger(e.a)&&Number.isInteger(e.b));
    return normalizeSolution({vertices,edges,solver:'MIT straight-skeleton'});
  }

  function solveFallback(pts){
    const raw=toSolverPoints(pts), cen=raw.reduce((s,p)=>({x:s.x+p.x/raw.length,y:s.y+p.y/raw.length}),{x:0,y:0});
    const vertices=raw.map((p,i)=>({id:i,x:p.x,y:p.y,fx:100+i*12,fy:250,type:'graph'}));
    const ci=vertices.length; vertices.push({id:ci,x:cen.x,y:cen.y,fx:100+raw.length*6,fy:250,type:'skeleton'});
    const edges=[]; for(let i=0;i<raw.length;i++){ edges.push({a:i,b:(i+1)%raw.length,type:'graph',assignment:'b'}); edges.push({a:i,b:ci,type:'skeleton',assignment:i%2?'m':'v'}); }
    return normalizeSolution({vertices,edges,solver:'illustrative fallback'});
  }

  function normalizeSolution(sol){
    const vals=[]; sol.vertices.forEach(v=>{vals.push([v.x,v.y],[v.fx,v.fy])});
    let minX=Math.min(...vals.map(p=>p[0])),maxX=Math.max(...vals.map(p=>p[0])),minY=Math.min(...vals.map(p=>p[1])),maxY=Math.max(...vals.map(p=>p[1]));
    if(maxX-minX<1)maxX=minX+1;if(maxY-minY<1)maxY=minY+1;
    sol.bounds={minX,maxX,minY,maxY}; return sol;
  }

  function edgeClass(e){
    if(e.type==='skeleton'||e.type==='perp')return 'crease';
    if(e.type==='graph'||e.type==='quasiGraph')return 'target';
    if(e.type==='boundary')return 'paper'; return 'other';
  }

  function buildSteps(){
    const creases=solution.edges.filter(e=>edgeClass(e)==='crease');
    const groupCount=Math.max(1,Math.min(6,Math.ceil(creases.length/4))), groups=Array.from({length:groupCount},()=>[]);
    creases.forEach((e,i)=>groups[Math.min(groupCount-1,Math.floor(i*groupCount/creases.length))].push(e));
    steps=[
      {title:'Your shape',text:'The outline you drew is the cut pattern we want to make with one straight cut.',fold:0,sk:0,cut:0},
      {title:'Find the straight skeleton',text:'Imagine the edges moving inward at the same speed. The paths traced by the corners form the straight skeleton.',fold:0,sk:1,cut:0}
    ];
    groups.forEach((g,i)=>steps.push({title:`Fold ${i+1}`,text:i===0?'The crease pattern starts collapsing the boundary toward a common line. Mountain folds are warm; valley folds are blue.':'Continue flattening the crease pattern. Each group moves the cut edges closer to the same line.',fold:(i+1)/groups.length,sk:1,cut:0,highlight:g}));
    steps.push({title:'Everything lines up',text:'In the computed flat state, the target boundary lands on one common cutting line.',fold:1,sk:1,cut:0});
    steps.push({title:'Make one straight cut',text:'One complete straight cut passes through every aligned edge at once.',fold:1,sk:1,cut:1});
    steps.push({title:'Unfold the result',text:'Open the paper back out: the single cut recreates the polygon you drew.',fold:0,sk:0,cut:0,reveal:1});
  }

  function goStep(i,instant=false){
    i=Math.max(0,Math.min(steps.length-1,i)); const target=steps[i]; stepIndex=i; updateStepUI();
    const start={...visual}, end={fold:target.fold, revealSkeleton:target.sk, cut:target.cut, unfold:target.reveal||0};
    if(instant){visual=end;render();return}
    animate(start,end,850/speed);
  }
  function animate(start,end,duration){
    const token=++animToken, t0=performance.now();
    function frame(now){ if(token!==animToken)return; let t=Math.min(1,(now-t0)/duration); t=t*t*(3-2*t); for(const k in end)visual[k]=start[k]+(end[k]-start[k])*t; render(); if(t<1)requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
  }
  function updateStepUI(){ const s=steps[stepIndex]; ui.count.textContent=`Step ${stepIndex+1} of ${steps.length}`; ui.title.textContent=s.title; ui.text.textContent=s.text; ui.back.disabled=stepIndex===0; ui.next.disabled=stepIndex===steps.length-1; ui.badge.textContent=solution.solver; }
  async function startPlay(){ if(stepIndex===steps.length-1)goStep(0,true); playing=true;ui.play.textContent='Ⅱ'; while(playing&&stepIndex<steps.length-1){ await sleep(1350/speed); if(!playing)break; goStep(stepIndex+1); await sleep(900/speed); } if(stepIndex===steps.length-1)stopPlay(); }
  function stopPlay(){playing=false;ui.play.textContent='▶'} function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

  function mapPos(v,fold=0){
    const r=paperRect(), b=solution.bounds, pad=28; const sx=(r.w-2*pad)/(b.maxX-b.minX), sy=(r.h-2*pad)/(b.maxY-b.minY), s=Math.min(sx,sy);
    const ox=r.x+r.w/2-(b.minX+b.maxX)*s/2, oy=r.y+r.h/2+(b.minY+b.maxY)*s/2;
    const x=v.x+(v.fx-v.x)*fold, y=v.y+(v.fy-v.y)*fold; return {x:ox+x*s,y:oy-y*s};
  }
  function drawPaper(){ const r=paperRect(); c.save(); c.fillStyle='#fffdf7';c.shadowColor='rgba(58,45,27,.14)';c.shadowBlur=18;c.shadowOffsetY=8;roundRect(c,r.x,r.y,r.w,r.h,6);c.fill();c.shadowColor='transparent';c.strokeStyle='rgba(90,75,50,.13)';c.lineWidth=1;c.stroke();c.restore(); }
  function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h));}

  function render(){ if(!W||!H)return; c.clearRect(0,0,W,H); drawPaper(); if(mode==='draw'||mode==='busy'){renderDraw();return;} if(!solution)return; renderSolution(); }
  function renderDraw(){
    if(!points.length)return; c.save(); c.lineCap='round';c.lineJoin='round';c.strokeStyle='#28251f';c.lineWidth=3;c.beginPath();c.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)c.lineTo(points[i].x,points[i].y);c.stroke();
    points.forEach((p,i)=>{c.beginPath();c.arc(p.x,p.y,i===0?6:5,0,Math.PI*2);c.fillStyle=i===0?'#bb3f31':'#28251f';c.fill();c.beginPath();c.arc(p.x,p.y,12,0,Math.PI*2);c.strokeStyle='rgba(37,35,31,.10)';c.lineWidth=1;c.stroke();});c.restore();
  }

  function renderSolution(){
    const s=steps[stepIndex]||{}, fold=visual.fold;
    const r=paperRect();c.save();c.globalAlpha=.18;c.strokeStyle='#d9d1c3';c.lineWidth=.5;for(let y=r.y+14;y<r.y+r.h;y+=22){c.beginPath();c.moveTo(r.x+10,y);c.lineTo(r.x+r.w-10,y);c.stroke()}c.restore();
    if(fold<.98){ c.save(); c.globalAlpha=(1-fold)*.75; c.strokeStyle='#25231f'; c.lineWidth=2.8; c.lineJoin='round'; c.beginPath(); c.moveTo(points[0].x,points[0].y); for(let i=1;i<points.length;i++)c.lineTo(points[i].x,points[i].y); c.closePath(); c.stroke(); c.restore(); }
    if(visual.unfold>0){ c.save();c.globalAlpha=visual.unfold*.20;c.fillStyle='#bb3f31';c.beginPath();c.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)c.lineTo(points[i].x,points[i].y);c.closePath();c.fill();c.restore(); }
    const hi=new Set((s.highlight||[]).map(e=>solution.edges.indexOf(e)));
    solution.edges.forEach((e,idx)=>{
      const cls=edgeClass(e); if(cls==='paper')return; if(cls==='crease'&&visual.revealSkeleton<.02)return;
      const a=mapPos(solution.vertices[e.a],fold),b=mapPos(solution.vertices[e.b],fold); c.save();c.lineCap='round';
      if(cls==='target'){c.strokeStyle='#25231f';c.lineWidth=2.8;c.globalAlpha=visual.unfold?1-visual.unfold*.55:1}
      else if(cls==='crease'){ const as=e.assignment;c.strokeStyle=as==='m'?'#bb4b3d':as==='v'?'#39708d':'#968e80';c.lineWidth=hi.has(idx)?3.1:1.35;c.globalAlpha=Math.max(.2,visual.revealSkeleton*(hi.size?(hi.has(idx)?1:.28):.75));c.setLineDash(as==='m'?[7,5]:as==='v'?[2,5]:[5,5]);}
      else {c.strokeStyle='#9b9488';c.lineWidth=1;c.globalAlpha=.25}
      c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.restore();
    });
    if(fold>.05){const pts=solution.vertices.filter(v=>v.type==='graph'||v.type==='quasiGraph').map(v=>mapPos(v,fold)); if(pts.length){const cx=pts.reduce((s,p)=>s+p.x,0)/pts.length,cy=pts.reduce((s,p)=>s+p.y,0)/pts.length;c.save();c.globalAlpha=.12*fold;c.fillStyle='#25231f';c.beginPath();c.ellipse(cx,cy+8,42+30*(1-fold),8+7*(1-fold),0,0,Math.PI*2);c.fill();c.restore();}}
    if(visual.cut>0.01)drawCutLine(visual.cut);
    if(visual.unfold>0.01)drawReveal(visual.unfold);
  }

  function targetFoldedPoints(){return solution.vertices.filter(v=>v.type==='graph'||v.type==='quasiGraph').map(v=>({x:v.fx,y:v.fy}));}
  function drawCutLine(alpha){
    const pts=targetFoldedPoints(); let dir={x:1,y:0},cen={x:0,y:0};
    if(pts.length){cen=pts.reduce((s,p)=>({x:s.x+p.x/pts.length,y:s.y+p.y/pts.length}),{x:0,y:0}); let xx=0,xy=0,yy=0;pts.forEach(p=>{const x=p.x-cen.x,y=p.y-cen.y;xx+=x*x;xy+=x*y;yy+=y*y});const ang=.5*Math.atan2(2*xy,xx-yy);dir={x:Math.cos(ang),y:Math.sin(ang)}}
    const fakeA={x:cen.x-dir.x*900,y:cen.y-dir.y*900,fx:cen.x-dir.x*900,fy:cen.y-dir.y*900},fakeB={x:cen.x+dir.x*900,y:cen.y+dir.y*900,fx:cen.x+dir.x*900,fy:cen.y+dir.y*900};const a=mapPos(fakeA,1),b=mapPos(fakeB,1);
    c.save();c.globalAlpha=alpha;c.strokeStyle='#bb3f31';c.lineWidth=5;c.lineCap='round';c.shadowColor='rgba(187,63,49,.25)';c.shadowBlur=12;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(a.x+(b.x-a.x)*alpha,a.y+(b.y-a.y)*alpha);c.stroke();c.restore();
    const t=.12+.78*alpha,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;c.save();c.globalAlpha=alpha;c.font='25px serif';c.translate(x,y);c.rotate(Math.atan2(b.y-a.y,b.x-a.x));c.fillText('✂',-10,-9);c.restore();
  }
  function drawReveal(t){
    c.save();c.globalAlpha=t;c.strokeStyle='#bb3f31';c.lineWidth=5;c.lineJoin='round';c.beginPath();c.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)c.lineTo(points[i].x,points[i].y);c.closePath();c.stroke();c.restore();
    if(t>.65){c.save();c.globalAlpha=(t-.65)/.35;c.fillStyle='#25231f';c.font='700 15px ui-rounded,system-ui';c.textAlign='center';c.fillText('One cut. Your shape.',W/2,paperRect().y+paperRect().h-22);c.restore();}
  }
  updateDrawUI(); resize();
})();
