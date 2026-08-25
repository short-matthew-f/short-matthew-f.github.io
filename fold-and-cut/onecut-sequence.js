  function edgeKind(e){if(e.type==='graph'||e.type==='quasiGraph')return'target';if(e.type==='boundary')return'paper';if(e.type==='skeleton'||e.type==='perp'||e.type==='quasiSkeleton')return'crease';return'other';}
  function signedArea(ids,verts,folded=false){let a=0;for(let i=0;i<ids.length;i++){const p=verts[ids[i]],q=verts[ids[(i+1)%ids.length]],px=folded?p.fx:p.x,py=folded?p.fy:p.y,qx=folded?q.fx:q.x,qy=folded?q.fy:q.y;a+=px*qy-py*qx;}return a/2;}
  function basisMatrix(u,v,n){return[[u[0],v[0],n[0]],[u[1],v[1],n[1]],[u[2],v[2],n[2]]];}
  function rigidMapForFace(face,verts){
    const ids=face.verts;let i1=1,i2=-1;const p0=[verts[ids[0]].x,verts[ids[0]].y,0],q0=[verts[ids[0]].fx,verts[ids[0]].fy,0];
    while(i1<ids.length&&Math.hypot(verts[ids[i1]].x-p0[0],verts[ids[i1]].y-p0[1])<1e-6)i1++;
    if(i1>=ids.length)return TI();
    const p1=[verts[ids[i1]].x,verts[ids[i1]].y,0],q1=[verts[ids[i1]].fx,verts[ids[i1]].fy,0];
    for(let i=i1+1;i<ids.length;i++){const p=[verts[ids[i]].x,verts[ids[i]].y,0];if(Math.abs((p1[0]-p0[0])*(p[1]-p0[1])-(p1[1]-p0[1])*(p[0]-p0[0]))>1e-5){i2=i;break;}}
    const us=V.norm(V.sub(p1,p0)),ns=[0,0,1],vs=V.cross(ns,us);
    const ut=V.norm(V.sub(q1,q0));let parity=1;
    if(i2>=0){const p2=verts[ids[i2]],q2=[p2.fx,p2.fy,0],src=(p1[0]-p0[0])*(p2.y-p0[1])-(p1[1]-p0[1])*(p2.x-p0[0]),tgt=(q1[0]-q0[0])*(q2[1]-q0[1])-(q1[1]-q0[1])*(q2[0]-q0[0]);parity=src*tgt<0?-1:1;}
    const nt=[0,0,parity],vt=V.cross(nt,ut),Bs=basisMatrix(us,vs,ns),Bt=basisMatrix(ut,vt,nt),R=M.mul(Bt,M.T(Bs));
    return{R,t:V.sub(q0,M.apply(R,p0))};
  }

  function prepareSolution(sol){
    sol.faces.forEach((f,i)=>{f.id=i;f.set=new Set(f.verts);});
    sol.edgeFaces=sol.edges.map(()=>[]);
    sol.edges.forEach((e,ei)=>sol.faces.forEach((f,fi)=>{if(f.set.has(e.a)&&f.set.has(e.b))sol.edgeFaces[ei].push(fi);}));
    sol.edgeOwner=sol.edgeFaces.map(a=>a[0]??0);
    sol.targetTransforms=sol.faces.map(f=>rigidMapForFace(f,sol.vertices));
    const xs=sol.vertices.map(v=>v.x),ys=sol.vertices.map(v=>v.y);sol.bounds={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
    sol.center=[(sol.bounds.minX+sol.bounds.maxX)/2,(sol.bounds.minY+sol.bounds.maxY)/2,0];
    const searched=findValidatedGroups(sol);
    if(!searched) throw new Error('No hinge-continuous packet sequence was found for this crease pattern.');
    sol.groups=searched.groups; sol.fullTransforms=searched.transforms; sol.sequenceError=searched.targetError; sol.maxSeamError=searched.maxSeam;
    sol.cutLine=computeCutLine(sol,sol.fullTransforms);
    if(!sol.cutLine || sol.cutLine.rms>1.75) throw new Error('The candidate packet sequence did not align the target edges closely enough for one cut.');
    sol.badge=`validated packets · ${sol.groups.length} fold${sol.groups.length===1?'':'s'}`;
    return sol;
  }

  function cloneTransforms(Ts){return Ts.slice();}
  function seamError(sol,Ts){
    let worst=0;
    sol.edges.forEach((e,ei)=>{
      if(edgeKind(e)!=='crease') return;
      const fs=sol.edgeFaces[ei]; if(!fs||fs.length<2) return;
      const p=[sol.vertices[e.a].x,sol.vertices[e.a].y,0],q=[sol.vertices[e.b].x,sol.vertices[e.b].y,0];
      const a0=TA(Ts[fs[0]],p),b0=TA(Ts[fs[0]],q);
      for(let k=1;k<fs.length;k++){
        const a=TA(Ts[fs[k]],p),b=TA(Ts[fs[k]],q);
        worst=Math.max(worst,V.len(V.sub(a,a0)),V.len(V.sub(b,b0)));
      }
    });
    return worst;
  }
  function targetErrorFor(sol,Ts){
    const tgt=sol.targetTransforms,G=TC(tgt[0],TInv(Ts[0]));let sum=0,n=0;
    sol.faces.forEach((f,fi)=>f.verts.forEach(id=>{
      const p=[sol.vertices[id].x,sol.vertices[id].y,0],a=TA(TC(G,Ts[fi]),p),b=TA(tgt[fi],p),d=V.sub(a,b);
      sum+=V.dot(d,d);n++;
    }));
    return Math.sqrt(sum/Math.max(1,n));
  }
  function permutations(arr){
    if(arr.length<2)return[arr]; const out=[];
    function rec(prefix,rest){if(!rest.length){out.push(prefix);return;}for(let i=0;i<rest.length;i++)rec(prefix.concat(rest[i]),rest.slice(0,i).concat(rest.slice(i+1)));}
    rec([],arr);return out;
  }
  function optionSets(avail){
    const out=[]; for(const x of avail)out.push([x]); const n=avail.length;
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)out.push([avail[i],avail[j]]);
    if(n<=6)for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)for(let k=j+1;k<n;k++)out.push([avail[i],avail[j],avail[k]]);
    if(n>1)out.push(avail.slice()); return out;
  }
  function tryGroup(sol,startTs,ops){
    const samples=[.25,.5,.75,1];let worst=0,finalTs=null;
    for(const t of samples){
      const Ts=cloneTransforms(startTs); for(const op of ops)applyOp(sol,Ts,op,t);
      const e=seamError(sol,Ts); worst=Math.max(worst,e); if(e>.35)return null; if(t===1)finalTs=Ts;
    }
    return{Ts:finalTs,worst};
  }
  function findValidatedGroups(sol){
    const seqs=sol.corridorOps||[],total=seqs.reduce((s,a)=>s+a.length,0);
    const initial={cursors:seqs.map(()=>0),Ts:sol.faces.map(()=>TI()),groups:[],maxSeam:0};
    let beam=[initial],finished=[];
    for(let layer=0;layer<Math.min(60,total+8)&&beam.length;layer++){
      const next=[];
      for(const state of beam){
        const remaining=state.cursors.reduce((s,c,i)=>s+(seqs[i].length-c),0);
        if(remaining===0){finished.push(state);continue;}
        const avail=[];for(let ci=0;ci<seqs.length;ci++)if(state.cursors[ci]<seqs[ci].length)avail.push({ci,op:seqs[ci][state.cursors[ci]]});
        for(const set of optionSets(avail)){
          if(set.length>4&&avail.length>4)continue;
          const orders=set.length<=3?permutations(set):[set];
          for(const order of orders){
            const ops=order.map(x=>x.op),trial=tryGroup(sol,state.Ts,ops); if(!trial)continue;
            const cursors=state.cursors.slice();for(const x of set)cursors[x.ci]++;
            next.push({cursors,Ts:trial.Ts,groups:state.groups.concat([ops]),maxSeam:Math.max(state.maxSeam,trial.worst)});
          }
        }
      }
      if(finished.length)break;
      const bestByKey=new Map();
      for(const st of next){const key=st.cursors.join(','),prev=bestByKey.get(key);if(!prev||st.maxSeam<prev.maxSeam)bestByKey.set(key,st);}
      beam=[...bestByKey.values()].sort((a,b)=>a.maxSeam-b.maxSeam).slice(0,90);
    }
    finished=finished.concat(beam.filter(st=>st.cursors.every((c,i)=>c===seqs[i].length)));
    if(!finished.length)return null;
    let best=null;
    for(const st of finished){const targetError=targetErrorFor(sol,st.Ts),score=targetError+st.maxSeam*4;if(!best||score<best.score)best={...st,targetError,score};}
    if(!best||best.targetError>2.0||best.maxSeam>.35)return null;
    return{groups:best.groups,transforms:best.Ts,targetError:best.targetError,maxSeam:best.maxSeam};
  }

  function applyOp(sol,Ts,op,t){
    if(t<=0)return;const e=sol.edges[op.edgeIndex],st=Ts[op.stationary]||TI();
    const a0=[sol.vertices[e.a].x,sol.vertices[e.a].y,0],b0=[sol.vertices[e.b].x,sol.vertices[e.b].y,0];
    const a=TA(st,a0),b=TA(st,b0),H=rotLine(a,b,op.angle*t);
    for(const fi of op.moving)Ts[fi]=TC(H,Ts[fi]||TI());
  }
  function computeTransformsFor(sol,foldStage){
    const Ts=sol.faces.map(()=>TI());
    for(let g=0;g<sol.groups.length;g++){
      const t=Math.max(0,Math.min(1,foldStage-g));if(t<=0)break;
      for(const op of sol.groups[g])applyOp(sol,Ts,op,t);
      if(t<1)break;
    }
    return Ts;
  }
  function sequenceError(sol){
    const sim=sol.fullTransforms,tgt=sol.targetTransforms,root=0,G=TC(tgt[root],TInv(sim[root]));let sum=0,n=0;
    sol.faces.forEach((f,fi)=>f.verts.forEach(id=>{const p=[sol.vertices[id].x,sol.vertices[id].y,0],a=TA(TC(G,sim[fi]),p),b=TA(tgt[fi],p);sum+=V.dot(V.sub(a,b),V.sub(a,b));n++;}));
    return Math.sqrt(sum/Math.max(1,n));
  }
  function computeCutLine(sol,Ts){
    const pts=[];sol.edges.forEach((e,ei)=>{if(edgeKind(e)!=='target')return;const T=Ts[sol.edgeOwner[ei]]||TI();pts.push(TA(T,[sol.vertices[e.a].x,sol.vertices[e.a].y,0]),TA(T,[sol.vertices[e.b].x,sol.vertices[e.b].y,0]));});
    if(pts.length<2)return null;const c=pts.reduce((s,p)=>V.add(s,p),[0,0,0]).map(x=>x/pts.length);let xx=0,xy=0,yy=0;for(const p of pts){const x=p[0]-c[0],y=p[1]-c[1];xx+=x*x;xy+=x*y;yy+=y*y;}const ang=.5*Math.atan2(2*xy,xx-yy),dir=[Math.cos(ang),Math.sin(ang),0];let mn=Infinity,mx=-Infinity,rms=0;for(const p of pts){const d=V.sub(p,c),t=V.dot(d,dir),perp=d[0]*(-dir[1])+d[1]*dir[0];mn=Math.min(mn,t);mx=Math.max(mx,t);rms+=perp*perp;}rms=Math.sqrt(rms/pts.length);return{start:V.add(c,V.mul(dir,mn-35)),end:V.add(c,V.mul(dir,mx+35)),rms};
  }
