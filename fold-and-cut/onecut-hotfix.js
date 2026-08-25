  // v8 reliability hotfix: the legacy theorem solver is authoritative for the
  // crease pattern and final folded coordinates.  Our choreography must never
  // turn a usable solver result into a false "geometry limitation".

  function solverCutLine(sol, targetFrame){
    const pts=[];
    sol.edges.forEach(e=>{
      if(edgeKind(e)!=='target') return;
      const va=sol.vertices[e.a], vb=sol.vertices[e.b];
      if(!va||!vb) return;
      pts.push(TA(targetFrame,[va.fx,va.fy,0]), TA(targetFrame,[vb.fx,vb.fy,0]));
    });
    if(pts.length<2) return null;
    const c=pts.reduce((s,p)=>V.add(s,p),[0,0,0]).map(x=>x/pts.length);
    let xx=0,xy=0,yy=0;
    for(const p of pts){const x=p[0]-c[0],y=p[1]-c[1];xx+=x*x;xy+=x*y;yy+=y*y;}
    const ang=.5*Math.atan2(2*xy,xx-yy),dir=[Math.cos(ang),Math.sin(ang),0];
    let mn=Infinity,mx=-Infinity,rms=0;
    for(const p of pts){const d=V.sub(p,c),t=V.dot(d,dir),perp=d[0]*(-dir[1])+d[1]*dir[0];mn=Math.min(mn,t);mx=Math.max(mx,t);rms+=perp*perp;}
    rms=Math.sqrt(rms/pts.length);
    return {start:V.add(c,V.mul(dir,mn-35)),end:V.add(c,V.mul(dir,mx+35)),rms};
  }

  function prepareSolution(sol){
    sol.faces.forEach((f,i)=>{f.id=i;f.set=new Set(f.verts);});
    sol.edgeFaces=sol.edges.map(()=>[]);
    sol.vertexFaces=sol.vertices.map(()=>[]);
    sol.faces.forEach((f,fi)=>f.verts.forEach(id=>{if(sol.vertexFaces[id]) sol.vertexFaces[id].push(fi);}));
    sol.edges.forEach((e,ei)=>sol.faces.forEach((f,fi)=>{if(f.set.has(e.a)&&f.set.has(e.b))sol.edgeFaces[ei].push(fi);}));
    sol.edgeOwner=sol.edgeFaces.map(a=>a[0]??0);

    const rawTargets=sol.faces.map(f=>rigidMapForFace(f,sol.vertices));
    let root=0,best=-1;
    sol.faces.forEach((f,i)=>{const a=faceArea(f,sol.vertices);if(a>best){best=a;root=i;}});
    sol.root=root;
    const targetFrame=TInv(rawTargets[root]);
    sol.targetFrame=targetFrame;
    sol.targetTransforms=rawTargets.map(T=>TC(targetFrame,T));

    const xs=sol.vertices.map(v=>v.x),ys=sol.vertices.map(v=>v.y);
    sol.bounds={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
    sol.center=[(sol.bounds.minX+sol.bounds.maxX)/2,(sol.bounds.minY+sol.bounds.maxY)/2,0];
    buildCompoundTree(sol);

    // Prefer a genuinely sequential packet construction when our stronger
    // continuity test can prove one.  Failure here is NOT failure of the
    // fold-and-cut construction; it simply means we animate it as one
    // coordinated compound fold.
    let searched=null;
    try{searched=findValidatedGroups(sol);}catch(e){console.warn('Packet-order search skipped:',e);}
    if(searched){
      const line=computeCutLine(sol,searched.transforms);
      if(line&&line.rms<=1.75){
        sol.mode='validated';
        sol.groups=searched.groups;
        sol.fullTransforms=searched.transforms;
        sol.sequenceError=searched.targetError;
        sol.maxSeamError=searched.maxSeam;
        sol.cutLine=line;
        sol.cutRms=line.rms;
        sol.badge=`validated packets · ${sol.groups.length} fold${sol.groups.length===1?'':'s'}`;
        return sol;
      }
    }

    sol.mode='compound';
    const moves=sol.compoundTree.order
      .filter(fi=>fi!==sol.root&&sol.compoundTree.parentEdge[fi]>=0)
      .map(fi=>({edgeIndex:sol.compoundTree.parentEdge[fi],moving:[fi],stationary:sol.compoundTree.parent[fi]}));
    // Keep one visible compound-fold step even if the solver's corridor data
    // contained no individually classified M/V operations.
    sol.groups=[moves.length?moves:[{edgeIndex:-1,moving:sol.faces.map(f=>f.id).filter(i=>i!==sol.root),stationary:sol.root}]];
    sol.fullTransforms=sol.targetTransforms;
    sol.sequenceError=0;
    sol.maxSeamError=0;
    sol.cutLine=solverCutLine(sol,targetFrame);
    if(!sol.cutLine) throw new Error('The solver returned no target cut edges.');
    sol.cutRms=sol.cutLine.rms;
    sol.badge='solver compound fold';
    return sol;
  }

  function solveWithMIT(pts){
    if(typeof window.Point!=='function'||typeof window.foldAndCut!=='function') throw new Error('Fold-and-cut geometry library did not load.');
    const raw=toSolverPoints(pts);
    const editorSeq=raw.map(p=>new window.Point(p.x,p.y));
    editorSeq.push(editorSeq[0]); editorSeq.push('marker');
    const seq=typeof window.removeMarkers==='function'?window.removeMarkers(editorSeq):editorSeq.slice(0,-1);

    const oldAlert=window.alert, legacyAlerts=[];
    window.alert=m=>legacyAlerts.push(String(m));
    let out;
    try{out=window.foldAndCut(seq);}finally{window.alert=oldAlert;}
    if(legacyAlerts.length) console.warn('Legacy solver diagnostics:',legacyAlerts);
    if(!out||!out[0]) throw new Error('The theorem solver did not return a crease pattern.');
    const CP=out[0], CPFaces=Array.isArray(out[1])?out[1]:[];

    let fs;
    try{
      fs=window.foldedState(CP);
      window.fold(CP,fs[2],fs[3]);
    }catch(e){
      throw new Error('The theorem solver could not compute its flat state: '+(e?.message||e));
    }

    const index=new Map(CP.cPVs.map((v,i)=>[v,i]));
    const edgeIndex=new Map(CP.cPEs.map((e,i)=>[e,i]));
    const vertices=CP.cPVs.map((v,i)=>({id:i,x:v.x,y:v.y,fx:v.foldedPos?.x??v.x,fy:v.foldedPos?.y??v.y,type:v.type}));
    const edges=CP.cPEs.map((e,i)=>({id:i,a:index.get(e.endpt1),b:index.get(e.endpt2),type:e.type,assignment:(e.assignment||'u').toLowerCase()})).filter(e=>Number.isInteger(e.a)&&Number.isInteger(e.b));

    const faces=[],faceByKey=new Map();
    function faceIds(df){
      const arr=Array.isArray(df?.[0])?df[0]:(Array.isArray(df)?df:[]),ids=[];
      for(const v of arr){const id=index.get(v);if(Number.isInteger(id)&&ids[ids.length-1]!==id)ids.push(id);}
      if(ids.length>2&&ids[0]===ids[ids.length-1])ids.pop();
      return ids;
    }
    function keyFor(ids){return ids.slice().sort((a,b)=>a-b).join(',');}
    function getFaceId(df){
      const ids=faceIds(df); if(ids.length<3)return-1;
      const key=keyFor(ids);
      if(!faceByKey.has(key)){const id=faces.length;faceByKey.set(key,id);faces.push({id,verts:ids});}
      return faceByKey.get(key);
    }

    // foldAndCut already returns the authoritative face list.  Seed from that
    // first; corridor extraction is only choreography metadata.
    CPFaces.forEach(getFaceId);
    let corridorsRaw=[];
    try{if(typeof window.computeCorridors==='function')corridorsRaw=window.computeCorridors(CP)||[];}catch(e){console.warn('Corridor extraction skipped:',e);}
    const corridors=[];
    corridorsRaw.forEach((corr,ci)=>{
      const ids=(corr.faces||[]).map(getFaceId).filter(id=>id>=0);
      if(ids.length)corridors.push({id:ci,faceIds:ids,raw:corr});
    });
    if(!faces.length) throw new Error('The theorem solver returned no renderable paper faces.');

    const ops=[],byRound=[],corridorOps=Array.from({length:corridors.length},()=>[]);
    corridors.forEach((c,cix)=>{
      const cf=c.raw.faces||[];let localRound=0;
      for(let i=0;i<cf.length-1;i++){
        const eobj=(cf[i][1]||[]).find(e=>(cf[i+1][1]||[]).includes(e));
        if(!eobj)continue;
        const as=(eobj.assignment||'u').toLowerCase();
        if(as!=='m'&&as!=='v')continue;
        const ei=edgeIndex.get(eobj);if(!Number.isInteger(ei))continue;
        const stationary=c.faceIds[i],moving=c.faceIds.slice(i+1).filter(Number.isInteger);
        if(!Number.isInteger(stationary)||!moving.length)continue;
        const op={id:ops.length,corridor:c.id,round:localRound++,edgeIndex:ei,stationary,moving,assignment:as,angle:as==='m'?-Math.PI:Math.PI};
        ops.push(op);(byRound[op.round]??=[]).push(op);corridorOps[cix].push(op);
      }
    });

    return prepareSolution({vertices,edges,faces,corridors,ops,corridorOps,fallbackGroups:byRound.filter(Boolean),targetPolygon:raw,solver:'solver corridor packets'});
  }

  async function finishShape(){
    if(points.length<3)return;
    if(!simplePolygon(points)){ui.hint.textContent='That outline crosses itself. Undo a point and try a simple polygon.';return;}
    mode='busy';ui.loading.classList.remove('hidden');ui.hint.textContent='Building the fold-and-cut construction…';await new Promise(r=>setTimeout(r,60));
    try{
      solution=solveWithMIT(points);buildSteps();mode='demo';ui.loading.classList.add('hidden');ui.draw.classList.add('hidden');ui.demo.classList.remove('hidden');ui.hint.classList.add('hidden');ui.badge.classList.remove('hidden');goStep(0,true);
    }catch(err){
      console.error(err);mode='draw';ui.loading.classList.add('hidden');ui.hint.classList.remove('hidden');
      const msg=(err&&err.message)?err.message:String(err);
      ui.hint.textContent='Could not build this fold: '+msg;
    }
  }
