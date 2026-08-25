  function buildSteps(){
    steps=[
      {title:'Your shape',text:'This is the straight-line cut pattern you drew.',foldStage:0,creases:0,cut:0,reveal:0,group:-1},
      {title:'Crease construction',text:'The theorem solver builds the straight-skeleton crease network and divides the paper into connected faces.',foldStage:0,creases:1,cut:0,reveal:0,group:-1}
    ];
    if(solution.mode==='compound'){
      steps.push({title:'Compound fold',text:'The connected hinge angles move together toward the solver’s exact flat-folded state.',foldStage:1,creases:1,cut:0,reveal:0,group:0});
    }else{
      solution.groups.forEach((group,g)=>{
        const packets=group.length,faces=new Set(group.flatMap(op=>op.moving)).size;
        steps.push({title:packets>1?`Compound fold ${g+1}`:`Packet fold ${g+1}`,text:packets>1?`${packets} independently valid packets move together while every shared hinge stays connected.`:`Fold the whole ${faces}-face packet around the solver-selected crease.`,foldStage:g+1,creases:1,cut:0,reveal:0,group:g});
      });
    }
    const finalStage=solution.mode==='compound'?1:solution.groups.length;
    const q=solution.mode==='compound'?'The coordinated fold settles onto the solver’s exact flat state, where every target edge lies on one line.':'The validated packet sequence reaches the solver’s computed flat state.';
    steps.push({title:'One flat stack',text:q,foldStage:finalStage,creases:1,cut:0,reveal:0,group:-1});
    steps.push({title:'Make one straight cut',text:'The blade passes once through the folded stack along the line shared by the target edges.',foldStage:finalStage,creases:1,cut:1,reveal:0,group:-1});
    steps.push({title:'Unfold the result',text:'The same paper opens back out while the camera returns overhead. The cut edges on the paper reveal the complete shape you drew.',foldStage:0,creases:0,cut:0,reveal:1,group:-1});
  }

  function goStep(i,instant=false){
    i=Math.max(0,Math.min(steps.length-1,i));stepIndex=i;const s=steps[i];updateStepUI();
    const end={foldStage:s.foldStage,creases:s.creases,cut:s.cut,reveal:s.reveal};if(instant){Object.assign(visual,end);render();return;}
    animate({...visual},end,solution?.mode==='compound'?1450/speed:1050/speed);
  }
  function animate(start,end,duration){const token=++animToken,t0=performance.now();function f(now){if(token!==animToken)return;let t=Math.min(1,(now-t0)/duration);t=t*t*(3-2*t);for(const k in end)visual[k]=start[k]+(end[k]-start[k])*t;render();if(t<1)requestAnimationFrame(f);}requestAnimationFrame(f);}
  function updateStepUI(){const s=steps[stepIndex];ui.count.textContent=`Step ${stepIndex+1} of ${steps.length}`;ui.title.textContent=s.title;ui.text.textContent=s.text;ui.back.disabled=stepIndex===0;ui.next.disabled=stepIndex===steps.length-1;ui.badge.textContent=solution.badge;}
  async function startPlay(){if(stepIndex===steps.length-1)goStep(0,true);playing=true;ui.play.textContent='Ⅱ';while(playing&&stepIndex<steps.length-1){await sleep(1550/speed);if(!playing)break;goStep(stepIndex+1);await sleep(1100/speed);}if(stepIndex===steps.length-1)stopPlay();}
  function stopPlay(){playing=false;ui.play.textContent='▶';}const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function project(p){
    const c=solution?.center||[360,280,0],d=V.sub(p,c),reveal=Math.max(0,Math.min(1,visual.reveal||0));
    // During the final unfold, return the camera to a true overhead view.
    // This keeps the result in the same physical coordinate system as the paper
    // instead of overlaying the user's original screen-space taps.
    const yaw=-.34*(1-reveal),pitch=.72*(1-reveal),cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const x=cy*d[0]-sy*d[1],y=sy*d[0]+cy*d[1],z=d[2],yy=cp*y-sp*z,zz=sp*y+cp*z,span=Math.max(solution.bounds.maxX-solution.bounds.minX,solution.bounds.maxY-solution.bounds.minY),scale=Math.min(W,H)*.72/Math.max(1,span),cam=850,persp=cam/(cam-zz);
    return{x:W/2+x*scale*persp,y:H*.53-yy*scale*persp,depth:zz,z:p[2],persp};
  }
  function averagedVertexWorld(id,Ts){
    const p=[solution.vertices[id].x,solution.vertices[id].y,0],fs=solution.vertexFaces?.[id]||[];
    if(solution.mode!=='compound'||!fs.length){const fi=fs[0]??0;return TA(Ts[fi]||TI(),p);}
    let sum=[0,0,0];for(const fi of fs)sum=V.add(sum,TA(Ts[fi]||TI(),p));return V.mul(sum,1/fs.length);
  }
  function faceWorld(face,T,Ts){return solution.mode==='compound'?face.verts.map(id=>averagedVertexWorld(id,Ts)):face.verts.map(id=>TA(T,[solution.vertices[id].x,solution.vertices[id].y,0]));}
  function pathProjected(pts){const pp=pts.map(project);ctx.beginPath();pp.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();return pp;}
  function edgeWorld(e,Ts){
    if(solution.mode==='compound')return[averagedVertexWorld(e.a,Ts),averagedVertexWorld(e.b,Ts)];
    const T=Ts[solution.edgeOwner[e.id]]||TI();return[TA(T,[solution.vertices[e.a].x,solution.vertices[e.a].y,0]),TA(T,[solution.vertices[e.b].x,solution.vertices[e.b].y,0])];
  }

  function render(){
    if(!W||!H)return;ctx.clearRect(0,0,W,H);if(mode==='draw'||mode==='busy'||!solution){drawFlatInput();return;}draw3D();
  }
  function drawFlatInput(){
    const r=paperRect();ctx.save();ctx.fillStyle='#fffdf7';ctx.shadowColor='rgba(58,45,27,.14)';ctx.shadowBlur=18;ctx.shadowOffsetY=8;roundRect(ctx,r.x,r.y,r.w,r.h,6);ctx.fill();ctx.restore();if(!points.length)return;
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#28251f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.stroke();points.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,i===0?6:5,0,Math.PI*2);ctx.fillStyle=i===0?'#bb3f31':'#28251f';ctx.fill();});ctx.restore();
  }
  function roundRect(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);}

  function draw3D(){
    const Ts=computeTransformsFor(solution,visual.foldStage);const faceDraw=solution.faces.map((f,i)=>{const world=faceWorld(f,Ts[i],Ts),avg=world.reduce((s,p)=>s+project(p).depth,0)/world.length,raise=world.reduce((s,p)=>s+Math.abs(p[2]),0)/world.length;return{f,i,world,avg,raise};}).sort((a,b)=>a.avg-b.avg);
    faceDraw.forEach(o=>{if(o.raise<.2)return;const pp=o.world.map(p=>project([p[0],p[1],0]));ctx.save();ctx.globalAlpha=Math.min(.13,.025+o.raise/650)*(1-(visual.reveal||0));ctx.fillStyle='#51483d';ctx.beginPath();pp.forEach((p,i)=>i?ctx.lineTo(p.x+5,p.y+8):ctx.moveTo(p.x+5,p.y+8));ctx.closePath();ctx.fill();ctx.restore();});
    faceDraw.forEach(o=>{pathProjected(o.world);const nz=faceNormal(o.world)[2];ctx.save();ctx.fillStyle=nz>=0?'#fffdf7':'#f1e6d2';ctx.globalAlpha=.985;ctx.fill();ctx.strokeStyle=solution.mode==='compound'?'rgba(83,72,56,.10)':'rgba(83,72,56,.22)';ctx.lineWidth=1;ctx.stroke();ctx.restore();});
    // Target edges are part of the physical paper. They remain attached during
    // every fold and become the highlighted cut only as the sheet opens again.
    solution.edges.forEach(e=>{if(edgeKind(e)!=='target')return;const[a,b]=edgeWorld(e,Ts),pa=project(a),pb=project(b);ctx.save();ctx.lineCap='round';ctx.strokeStyle='#25231f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();if((visual.reveal||0)>.001){ctx.globalAlpha=visual.reveal;ctx.strokeStyle='#9f3026';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();}ctx.restore();});
    if(visual.creases>.02){
      const s=steps[stepIndex]||{},active=s.group>=0&&solution.groups[s.group]?new Set(solution.groups[s.group].map(op=>op.edgeIndex)):new Set();
      solution.edges.forEach((e,ei)=>{if(edgeKind(e)!=='crease')return;const[a,b]=edgeWorld(e,Ts),pa=project(a),pb=project(b),on=solution.mode==='compound'&&s.group===0?true:active.has(ei);ctx.save();ctx.globalAlpha=Math.max(.15,visual.creases*(on?1:.48));ctx.strokeStyle=e.assignment==='m'?'#bd4a3d':e.assignment==='v'?'#3d718e':'#948c80';ctx.lineWidth=on?2.7:1.15;ctx.setLineDash(on?[]:[5,5]);ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();ctx.restore();});
    }
    if(visual.cut>.01&&solution.cutLine){
      const a=project(solution.cutLine.start),b=project(solution.cutLine.end),t=visual.cut,bladeX=a.x+(b.x-a.x)*t,bladeY=a.y+(b.y-a.y)*t;ctx.save();ctx.strokeStyle='rgba(187,63,49,.28)';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(bladeX,bladeY);ctx.stroke();ctx.strokeStyle='#8c261f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(bladeX,bladeY);ctx.stroke();ctx.translate(bladeX,bladeY);ctx.rotate(Math.atan2(b.y-a.y,b.x-a.x));ctx.fillStyle='#25231f';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-18,-7);ctx.lineTo(-13,7);ctx.closePath();ctx.fill();ctx.restore();
    }
  }
  function faceNormal(world){if(world.length<3)return[0,0,1];return V.norm(V.cross(V.sub(world[1],world[0]),V.sub(world[2],world[0])));}

  updateDrawUI();resize();
