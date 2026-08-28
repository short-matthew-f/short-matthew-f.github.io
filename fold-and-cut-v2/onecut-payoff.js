  // v11 payoff rendering: make the cut read as a physical operation on the
  // folded packet, and make the reveal read as cut paper rather than an overlay.

  function fullCutScreenSegment(Ts){
    if(!solution?.cutLine)return null;
    const p0=project(solution.cutLine.start),p1=project(solution.cutLine.end);
    let dx=p1.x-p0.x,dy=p1.y-p0.y,L=Math.hypot(dx,dy);
    if(L<1e-6)return{a:p0,b:p1};
    dx/=L;dy/=L;
    let mn=Infinity,mx=-Infinity;
    solution.faces.forEach((f,i)=>{
      const world=faceWorld(f,Ts[i],Ts);
      world.forEach(w=>{
        const p=project(w),t=(p.x-p0.x)*dx+(p.y-p0.y)*dy;
        mn=Math.min(mn,t);mx=Math.max(mx,t);
      });
    });
    if(!Number.isFinite(mn)||!Number.isFinite(mx))return{a:p0,b:p1};
    const margin=34;
    return{
      a:{x:p0.x+dx*(mn-margin),y:p0.y+dy*(mn-margin)},
      b:{x:p0.x+dx*(mx+margin),y:p0.y+dy*(mx+margin)}
    };
  }

  function strokeSegment(a,b,style,width,alpha=1,dash=[]){
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=style;ctx.lineWidth=width;ctx.lineCap='round';ctx.setLineDash(dash);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();
  }

  function drawPhysicalTargetEdges(Ts){
    const reveal=Math.max(0,Math.min(1,visual.reveal||0));
    solution.edges.forEach(e=>{
      if(edgeKind(e)!=='target')return;
      const[a,b]=edgeWorld(e,Ts),pa=project(a),pb=project(b);
      if(reveal<1){
        strokeSegment(pa,pb,'#25231f',3,1-reveal);
      }
      if(reveal>.001){
        // A cut is a slit in the sheet, not a colored shape painted over it.
        // Two soft shadow shoulders around a paper-colored center make the seam
        // read as depth while keeping the same physical paper geometry.
        const r=reveal;
        strokeSegment(pa,pb,'rgba(72,58,42,.22)',5.5,r);
        strokeSegment(pa,pb,'#fffdf7',2.7,r);
        strokeSegment(pa,pb,'rgba(72,58,42,.16)',.8,r);
      }
    });
  }

  function draw3D(){
    const Ts=computeTransformsFor(solution,visual.foldStage);
    const faceDraw=solution.faces.map((f,i)=>{
      const world=faceWorld(f,Ts[i],Ts),avg=world.reduce((s,p)=>s+project(p).depth,0)/world.length,raise=world.reduce((s,p)=>s+Math.abs(p[2]),0)/world.length;
      return{f,i,world,avg,raise};
    }).sort((a,b)=>a.avg-b.avg);

    faceDraw.forEach(o=>{
      if(o.raise<.2)return;
      const pp=o.world.map(p=>project([p[0],p[1],0]));
      ctx.save();ctx.globalAlpha=Math.min(.13,.025+o.raise/650)*(1-(visual.reveal||0));ctx.fillStyle='#51483d';ctx.beginPath();
      pp.forEach((p,i)=>i?ctx.lineTo(p.x+5,p.y+8):ctx.moveTo(p.x+5,p.y+8));ctx.closePath();ctx.fill();ctx.restore();
    });

    faceDraw.forEach(o=>{
      pathProjected(o.world);const nz=faceNormal(o.world)[2];ctx.save();ctx.fillStyle=nz>=0?'#fffdf7':'#f1e6d2';ctx.globalAlpha=.985;ctx.fill();
      ctx.strokeStyle=solution.mode==='compound'?'rgba(83,72,56,.10)':'rgba(83,72,56,.22)';ctx.lineWidth=1;ctx.stroke();ctx.restore();
    });

    drawPhysicalTargetEdges(Ts);

    if(visual.creases>.02){
      const s=steps[stepIndex]||{},active=s.group>=0&&solution.groups[s.group]?new Set(solution.groups[s.group].map(op=>op.edgeIndex)):new Set();
      solution.edges.forEach((e,ei)=>{
        if(edgeKind(e)!=='crease')return;
        const[a,b]=edgeWorld(e,Ts),pa=project(a),pb=project(b),on=solution.mode==='compound'&&s.group===0?true:active.has(ei);
        ctx.save();ctx.globalAlpha=Math.max(.15,visual.creases*(on?1:.48));ctx.strokeStyle=e.assignment==='m'?'#bd4a3d':e.assignment==='v'?'#3d718e':'#948c80';ctx.lineWidth=on?2.7:1.15;ctx.setLineDash(on?[]:[5,5]);
        ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();ctx.restore();
      });
    }

    if(visual.cut>.01&&solution.cutLine){
      const seg=fullCutScreenSegment(Ts);
      if(seg){
        const a=seg.a,b=seg.b,t=Math.max(0,Math.min(1,visual.cut)),bladeX=a.x+(b.x-a.x)*t,bladeY=a.y+(b.y-a.y)*t;
        // The cut begins outside the packet and exits outside the other side.
        strokeSegment(a,{x:bladeX,y:bladeY},'rgba(187,63,49,.24)',8,1);
        strokeSegment(a,{x:bladeX,y:bladeY},'#8c261f',1.8,1);
        ctx.save();ctx.translate(bladeX,bladeY);ctx.rotate(Math.atan2(b.y-a.y,b.x-a.x));ctx.fillStyle='#25231f';ctx.beginPath();ctx.moveTo(2,0);ctx.lineTo(-18,-7);ctx.lineTo(-13,7);ctx.closePath();ctx.fill();ctx.restore();
      }
    }
  }
