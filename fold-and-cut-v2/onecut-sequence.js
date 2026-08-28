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
  function faceArea(face,verts){return Math.abs(signedArea(face.verts,verts,false));}

  function quatFromMatrix(R){
    const tr=R[0][0]+R[1][1]+R[2][2];let x,y,z,w;
    if(tr>0){const s=Math.sqrt(tr+1)*2;w=.25*s;x=(R[2][1]-R[1][2])/s;y=(R[0][2]-R[2][0])/s;z=(R[1][0]-R[0][1])/s;}
    else if(R[0][0]>R[1][1]&&R[0][0]>R[2][2]){const s=Math.sqrt(1+R[0][0]-R[1][1]-R[2][2])*2;w=(R[2][1]-R[1][2])/s;x=.25*s;y=(R[0][1]+R[1][0])/s;z=(R[0][2]+R[2][0])/s;}
    else if(R[1][1]>R[2][2]){const s=Math.sqrt(1+R[1][1]-R[0][0]-R[2][2])*2;w=(R[0][2]-R[2][0])/s;x=(R[0][1]+R[1][0])/s;y=.25*s;z=(R[1][2]+R[2][1])/s;}
    else{const s=Math.sqrt(1+R[2][2]-R[0][0]-R[1][1])*2;w=(R[1][0]-R[0][1])/s;x=(R[0][2]+R[2][0])/s;y=(R[1][2]+R[2][1])/s;z=.25*s;}
    const l=Math.hypot(x,y,z,w)||1;return[x/l,y/l,z/l,w/l];
  }
  function matrixFromQuat(q){const[x,y,z,w]=q,xx=x*x,yy=y*y,zz=z*z,xy=x*y,xz=x*z,yz=y*z,wx=w*x,wy=w*y,wz=w*z;return[[1-2*(yy+zz),2*(xy-wz),2*(xz+wy)],[2*(xy+wz),1-2*(xx+zz),2*(yz-wx)],[2*(xz-wy),2*(yz+wx),1-2*(xx+yy)]];}
  function slerpQuat(a,b,t){let dot=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3],bb=b;if(dot<0){dot=-dot;bb=b.map(v=>-v);}if(dot>.9995){const q=a.map((v,i)=>v+(bb[i]-v)*t),l=Math.hypot(...q)||1;return q.map(v=>v/l);}const th=Math.acos(Math.max(-1,Math.min(1,dot))),s=Math.sin(th),u=Math.sin((1-t)*th)/s,v=Math.sin(t*th)/s;return a.map((x,i)=>x*u+bb[i]*v);}
  function interpTransform(A,B,t){if(t<=0)return A;if(t>=1)return B;return{R:matrixFromQuat(slerpQuat(quatFromMatrix(A.R),quatFromMatrix(B.R),t)),t:[A.t[0]+(B.t[0]-A.t[0])*t,A.t[1]+(B.t[1]-A.t[1])*t,A.t[2]+(B.t[2]-A.t[2])*t]};}

  function prepareSolution(sol){
    sol.faces.forEach((f,i)=>{f.id=i;f.set=new Set(f.verts);});
    sol.edgeFaces=sol.edges.map(()=>[]);
    sol.vertexFaces=sol.vertices.map(()=>[]);
    sol.faces.forEach((f,fi)=>f.verts.forEach(id=>sol.vertexFaces[id].push(fi)));
    sol.edges.forEach((e,ei)=>sol.faces.forEach((f,fi)=>{if(f.set.has(e.a)&&f.set.has(e.b))sol.edgeFaces[ei].push(fi);}));
    sol.edgeOwner=sol.edgeFaces.map(a=>a[0]??0);

    const rawTargets=sol.faces.map(f=>rigidMapForFace(f,sol.vertices));
    let root=0,best=-1;sol.faces.forEach((f,i)=>{const a=faceArea(f,sol.vertices);if(a>best){best=a;root=i;}});sol.root=root;
    const G=TInv(rawTargets[root]);
    sol.targetTransforms=rawTargets.map(T=>TC(G,T));

    const xs=sol.vertices.map(v=>v.x),ys=sol.vertices.map(v=>v.y);sol.bounds={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
    sol.center=[(sol.bounds.minX+sol.bounds.maxX)/2,(sol.bounds.minY+sol.bounds.maxY)/2,0];
    buildCompoundTree(sol);

    const searched=findValidatedGroups(sol);
    if(searched){
      const line=computeCutLine(sol,searched.transforms);
      if(line&&line.rms<=1.75){
        sol.mode='validated';sol.groups=searched.groups;sol.fullTransforms=searched.transforms;sol.sequenceError=searched.targetError;sol.maxSeamError=searched.maxSeam;sol.cutLine=line;
        sol.badge=`validated packets · ${sol.groups.length} fold${sol.groups.length===1?'':'s'}`;return sol;
      }
    }

    sol.mode='compound';
    sol.groups=[sol.compoundTree.order.filter(fi=>fi!==sol.root).map(fi=>({edgeIndex:sol.compoundTree.parentEdge[fi],moving:[fi],stationary:sol.compoundTree.parent[fi]}))];
    sol.fullTransforms=computeCompoundTransforms(sol,1);
    sol.sequenceError=targetErrorFor(sol,sol.fullTransforms);
    sol.maxSeamError=compoundSeamPeak(sol);
    sol.cutLine=computeCutLine(sol,sol.targetTransforms);
    if(!sol.cutLine||sol.cutLine.rms>2.25)throw new Error('The theorem solver did not produce a clean one-cut alignment for this shape.');
    sol.badge='solver compound fold';
    return sol;
  }

  function buildCompoundTree(sol){
    const adjacency=Array.from({length:sol.faces.length},()=>[]);
    sol.edges.forEach((e,ei)=>{if(edgeKind(e)!=='crease')return;const fs=sol.edgeFaces[ei];if(fs.length!==2)return;adjacency[fs[0]].push({to:fs[1],edgeIndex:ei});adjacency[fs[1]].push({to:fs[0],edgeIndex:ei});});
    const parent=new Array(sol.faces.length).fill(-1),parentEdge=new Array(sol.faces.length).fill(-1),order=[];parent[sol.root]=sol.root;const q=[sol.root];
    while(q.length){const f=q.shift();order.push(f);for(const a of adjacency[f])if(parent[a.to]===-1){parent[a.to]=f;parentEdge[a.to]=a.edgeIndex;q.push(a.to);}}
    for(let i=0;i<parent.length;i++)if(parent[i]===-1){parent[i]=i;order.push(i);}
    sol.compoundTree={adjacency,parent,parentEdge,order};
  }

  function rawCompoundTransforms(sol,t){
    const Ts=sol.faces.map(()=>TI()),tree=sol.compoundTree;Ts[sol.root]=TI();
    for(const fi of tree.order){const p=tree.parent[fi];if(fi===sol.root||p===fi)continue;const ei=tree.parentEdge[fi],e=sol.edges[ei],pt=Ts[p]||TI(),a=TA(pt,[sol.vertices[e.a].x,sol.vertices[e.a].y,0]),b=TA(pt,[sol.vertices[e.b].x,sol.vertices[e.b].y,0]),angle=(e.assignment==='m'?-1:1)*Math.PI*t;Ts[fi]=TC(rotLine(a,b,angle),pt);}
    return Ts;
  }
  function computeCompoundTransforms(sol,t){
    t=Math.max(0,Math.min(1,t));const raw=rawCompoundTransforms(sol,t),settle=t<=.72?0:(t-.72)/.28,s=settle*settle*(3-2*settle);return raw.map((T,i)=>interpTransform(T,sol.targetTransforms[i],s));
  }
  function compoundSeamPeak(sol){let worst=0;for(const t of[.2,.4,.6,.8])worst=Math.max(worst,seamError(sol,computeCompoundTransforms(sol,t)));return worst;}

  function cloneTransforms(Ts){return Ts.slice();}
  function seamError(sol,Ts){
    let worst=0;
    sol.edges.forEach((e,ei)=>{
      if(edgeKind(e)!=='crease')return;const fs=sol.edgeFaces[ei];if(!fs||fs.length<2)return;const p=[sol.vertices[e.a].x,sol.vertices[e.a].y,0],q=[sol.vertices[e.b].x,sol.vertices[e.b].y,0],a0=TA(Ts[fs[0]],p),b0=TA(Ts[fs[0]],q);
      for(let k=1;k<fs.length;k++){const a=TA(Ts[fs[k]],p),b=TA(Ts[fs[k]],q);worst=Math.max(worst,V.len(V.sub(a,a0)),V.len(V.sub(b,b0)));}
    });return worst;
  }
  function targetErrorFor(sol,Ts){let sum=0,n=0;sol.faces.forEach((f,fi)=>f.verts.forEach(id=>{const p=[sol.vertices[id].x,sol.vertices[id].y,0],a=TA(Ts[fi],p),b=TA(sol.targetTransforms[fi],p),d=V.sub(a,b);sum+=V.dot(d,d);n++;}));return Math.sqrt(sum/Math.max(1,n));}
  function permutations(arr){if(arr.length<2)return[arr];const out=[];function rec(prefix,rest){if(!rest.length){out.push(prefix);return;}for(let i=0;i<rest.length;i++)rec(prefix.concat(rest[i]),rest.slice(0,i).concat(rest.slice(i+1)));}rec([],arr);return out;}
  function optionSets(avail){const out=[];for(const x of avail)out.push([x]);const n=avail.length;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)out.push([avail[i],avail[j]]);if(n<=6)for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)for(let k=j+1;k<n;k++)out.push([avail[i],avail[j],avail[k]]);if(n>1)out.push(avail.slice());return out;}
  function tryGroup(sol,startTs,ops){const samples=[.25,.5,.75,1];let worst=0,finalTs=null;for(const t of samples){const Ts=cloneTransforms(startTs);for(const op of ops)applyOp(sol,Ts,op,t);const e=seamError(sol,Ts);worst=Math.max(worst,e);if(e>.35)return null;if(t===1)finalTs=Ts;}return{Ts:finalTs,worst};}
  function findValidatedGroups(sol){
    const seqs=sol.corridorOps||[],total=seqs.reduce((s,a)=>s+a.length,0);if(!total)return null;
    const initial={cursors:seqs.map(()=>0),Ts:sol.faces.map(()=>TI()),groups:[],maxSeam:0};let beam=[initial],finished=[];
    for(let layer=0;layer<Math.min(60,total+8)&&beam.length;layer++){
      const next=[];for(const state of beam){const remaining=state.cursors.reduce((s,c,i)=>s+(seqs[i].length-c),0);if(remaining===0){finished.push(state);continue;}const avail=[];for(let ci=0;ci<seqs.length;ci++)if(state.cursors[ci]<seqs[ci].length)avail.push({ci,op:seqs[ci][state.cursors[ci]]});
        for(const set of optionSets(avail)){if(set.length>4&&avail.length>4)continue;const orders=set.length<=3?permutations(set):[set];for(const order of orders){const ops=order.map(x=>x.op),trial=tryGroup(sol,state.Ts,ops);if(!trial)continue;const cursors=state.cursors.slice();for(const x of set)cursors[x.ci]++;next.push({cursors,Ts:trial.Ts,groups:state.groups.concat([ops]),maxSeam:Math.max(state.maxSeam,trial.worst)});}}}
      if(finished.length)break;const bestByKey=new Map();for(const st of next){const key=st.cursors.join(','),prev=bestByKey.get(key);if(!prev||st.maxSeam<prev.maxSeam)bestByKey.set(key,st);}beam=[...bestByKey.values()].sort((a,b)=>a.maxSeam-b.maxSeam).slice(0,90);
    }
    finished=finished.concat(beam.filter(st=>st.cursors.every((c,i)=>c===seqs[i].length)));if(!finished.length)return null;let best=null;for(const st of finished){const targetError=targetErrorFor(sol,st.Ts),score=targetError+st.maxSeam*4;if(!best||score<best.score)best={...st,targetError,score};}if(!best||best.targetError>2||best.maxSeam>.35)return null;return{groups:best.groups,transforms:best.Ts,targetError:best.targetError,maxSeam:best.maxSeam};
  }

  function applyOp(sol,Ts,op,t){if(t<=0)return;const e=sol.edges[op.edgeIndex],st=Ts[op.stationary]||TI(),a0=[sol.vertices[e.a].x,sol.vertices[e.a].y,0],b0=[sol.vertices[e.b].x,sol.vertices[e.b].y,0],a=TA(st,a0),b=TA(st,b0),H=rotLine(a,b,op.angle*t);for(const fi of op.moving)Ts[fi]=TC(H,Ts[fi]||TI());}
  function computeTransformsFor(sol,foldStage){
    if(sol.mode==='compound')return computeCompoundTransforms(sol,Math.max(0,Math.min(1,foldStage)));
    const Ts=sol.faces.map(()=>TI());for(let g=0;g<sol.groups.length;g++){const t=Math.max(0,Math.min(1,foldStage-g));if(t<=0)break;for(const op of sol.groups[g])applyOp(sol,Ts,op,t);if(t<1)break;}return Ts;
  }
  function sequenceError(sol){return sol.sequenceError??targetErrorFor(sol,sol.fullTransforms);}
  function computeCutLine(sol,Ts){
    const pts=[];sol.edges.forEach((e,ei)=>{if(edgeKind(e)!=='target')return;const owner=sol.edgeOwner[ei]??0,T=Ts[owner]||TI();pts.push(TA(T,[sol.vertices[e.a].x,sol.vertices[e.a].y,0]),TA(T,[sol.vertices[e.b].x,sol.vertices[e.b].y,0]));});
    if(pts.length<2)return null;const c=pts.reduce((s,p)=>V.add(s,p),[0,0,0]).map(x=>x/pts.length);let xx=0,xy=0,yy=0;for(const p of pts){const x=p[0]-c[0],y=p[1]-c[1];xx+=x*x;xy+=x*y;yy+=y*y;}const ang=.5*Math.atan2(2*xy,xx-yy),dir=[Math.cos(ang),Math.sin(ang),0];let mn=Infinity,mx=-Infinity,rms=0;for(const p of pts){const d=V.sub(p,c),tt=V.dot(d,dir),perp=d[0]*(-dir[1])+d[1]*dir[0];mn=Math.min(mn,tt);mx=Math.max(mx,tt);rms+=perp*perp;}rms=Math.sqrt(rms/pts.length);return{start:V.add(c,V.mul(dir,mn-35)),end:V.add(c,V.mul(dir,mx+35)),rms};
  }
