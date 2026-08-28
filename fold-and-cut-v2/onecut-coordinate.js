  // v13 coordinate-entry mode.
  let coordinateSolverPoints=null;
  let coordinateRawPoints=null;
  const coordsBtn=document.getElementById('coordsBtn');
  const coordsDialog=document.getElementById('coordsDialog');
  const coordsInput=document.getElementById('coordsInput');
  const coordsError=document.getElementById('coordsError');
  const coordsCancel=document.getElementById('coordsCancel');
  const coordsApply=document.getElementById('coordsApply');

  const toSolverPointsBeforeCoordinates=toSolverPoints;
  toSolverPoints=function(pts){
    if(coordinateSolverPoints&&pts===points){
      return coordinateSolverPoints.map(p=>({x:p.x,y:p.y}));
    }
    return toSolverPointsBeforeCoordinates(pts);
  };

  function parseCoordinateText(text){
    const rows=text.split(/\n|;/).map(s=>s.trim()).filter(Boolean),out=[];
    for(let i=0;i<rows.length;i++){
      const parts=rows[i].split(/[\s,]+/).filter(Boolean);
      if(parts.length!==2)throw new Error(`Line ${i+1}: use x, y`);
      const x=Number(parts[0]),y=Number(parts[1]);
      if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error(`Line ${i+1}: coordinates must be numbers`);
      out.push({x,y});
    }
    if(out.length>1&&Math.hypot(out[0].x-out[out.length-1].x,out[0].y-out[out.length-1].y)<1e-10)out.pop();
    if(out.length<3)throw new Error('Enter at least three points.');
    let area=0;
    for(let i=0;i<out.length;i++){const a=out[i],b=out[(i+1)%out.length];area+=a.x*b.y-a.y*b.x;}
    if(Math.abs(area)<1e-9)throw new Error('Those points do not enclose an area.');
    return out;
  }

  function fitCoordinatePoints(raw){
    const xs=raw.map(p=>p.x),ys=raw.map(p=>p.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const w=Math.max(1e-9,maxX-minX),h=Math.max(1e-9,maxY-minY);
    // Solver-space fit preserves the user's coordinate geometry exactly.
    const solverPad=42,availW=560-2*solverPad,availH=420-2*solverPad;
    const s=Math.min(availW/w,availH/h);
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    const solverPts=raw.map(p=>({x:360+(p.x-cx)*s,y:280+(p.y-cy)*s}));

    // Screen-space fit is also uniform so the preview has the same proportions.
    const r=paperRect(),pad=Math.max(34,Math.min(r.w,r.h)*.10);
    const ss=Math.min((r.w-2*pad)/w,(r.h-2*pad)/h);
    const screenPts=raw.map(p=>({
      x:r.x+r.w/2+(p.x-cx)*ss,
      y:r.y+r.h/2-(p.y-cy)*ss
    }));
    return{solverPts,screenPts};
  }

  function showCoordinateDialog(){
    coordsError.textContent='';
    if(coordinateRawPoints){
      coordsInput.value=coordinateRawPoints.map(p=>`${p.x}, ${p.y}`).join('\n');
    }else{
      coordsInput.value='';
    }
    coordsDialog.showModal();
    setTimeout(()=>coordsInput.focus(),60);
  }

  coordsBtn?.addEventListener('click',showCoordinateDialog);
  coordsCancel?.addEventListener('click',()=>coordsDialog.close());
  coordsApply?.addEventListener('click',()=>{
    try{
      const raw=parseCoordinateText(coordsInput.value);
      const fitted=fitCoordinatePoints(raw);
      if(!simplePolygon(fitted.screenPts))throw new Error('That polygon crosses itself.');
      coordinateRawPoints=raw;
      coordinateSolverPoints=fitted.solverPts;
      points=fitted.screenPts;
      mode='draw';
      updateDrawUI();render();
      ui.hint.textContent='Coordinates loaded. Finish the shape, or edit the coordinates.';
      coordsDialog.close();
    }catch(err){
      coordsError.textContent=err?.message||String(err);
    }
  });

  const undoBeforeCoordinates=ui.undo.onclick;
  ui.undo.onclick=()=>{
    if(coordinateSolverPoints){
      points.pop();coordinateSolverPoints.pop();
      if(coordinateRawPoints)coordinateRawPoints.pop();
      updateDrawUI();render();return;
    }
    undoBeforeCoordinates();
  };

  stage.addEventListener('pointerdown',()=>{
    if(mode==='draw'&&coordinateSolverPoints){
      coordinateSolverPoints=null;coordinateRawPoints=null;
    }
  },{capture:true});

  const restartBeforeCoordinates=restart;
  restart=function(){
    coordinateSolverPoints=null;coordinateRawPoints=null;
    restartBeforeCoordinates();
  };
  ui.restart.onclick=restart;
