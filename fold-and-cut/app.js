(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const ctx = stage.getContext('2d');

  const ui = {
    hint: $('hint'), badge: $('badge'), loading: $('loading'),
    draw: $('drawControls'), demo: $('demoControls'),
    undo: $('undoBtn'), finish: $('finishBtn'),
    back: $('backBtn'), next: $('nextBtn'), play: $('playBtn'),
    restart: $('restartBtn'), count: $('stepCount'),
    title: $('stepTitle'), text: $('stepText'), speed: $('speedBtn'),
    info: $('infoBtn'), dialog: $('infoDialog'), closeInfo: $('closeInfo')
  };

  let dpr = 1, W = 0, H = 0;
  let points = [];
  let mode = 'draw';
  let solution = null;
  let steps = [];
  let stepIndex = 0;
  let playing = false;
  let animToken = 0;
  let speed = 1;
  const speeds = [0.7, 1, 1.35];

  const visual = {
    fold: 0,
    creases: 0,
    cut: 0,
    reveal: 0
  };

  const V = {
    add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
    sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
    mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
    dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
    cross:(a,b)=>[
      a[1]*b[2]-a[2]*b[1],
      a[2]*b[0]-a[0]*b[2],
      a[0]*b[1]-a[1]*b[0]
    ],
    len:(a)=>Math.hypot(a[0],a[1],a[2]),
    norm:(a)=>{ const l=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/l,a[1]/l,a[2]/l]; },
    lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]
  };

  const I3 = () => [[1,0,0],[0,1,0],[0,0,1]];
  const M = {
    apply:(A,v)=>[
      A[0][0]*v[0]+A[0][1]*v[1]+A[0][2]*v[2],
      A[1][0]*v[0]+A[1][1]*v[1]+A[1][2]*v[2],
      A[2][0]*v[0]+A[2][1]*v[1]+A[2][2]*v[2]
    ],
    mul:(A,B)=>[
      [
        A[0][0]*B[0][0]+A[0][1]*B[1][0]+A[0][2]*B[2][0],
        A[0][0]*B[0][1]+A[0][1]*B[1][1]+A[0][2]*B[2][1],
        A[0][0]*B[0][2]+A[0][1]*B[1][2]+A[0][2]*B[2][2]
      ],
      [
        A[1][0]*B[0][0]+A[1][1]*B[1][0]+A[1][2]*B[2][0],
        A[1][0]*B[0][1]+A[1][1]*B[1][1]+A[1][2]*B[2][1],
        A[1][0]*B[0][2]+A[1][1]*B[1][2]+A[1][2]*B[2][2]
      ],
      [
        A[2][0]*B[0][0]+A[2][1]*B[1][0]+A[2][2]*B[2][0],
        A[2][0]*B[0][1]+A[2][1]*B[1][1]+A[2][2]*B[2][1],
        A[2][0]*B[0][2]+A[2][1]*B[1][2]+A[2][2]*B[2][2]
      ]
    ],
    T:(A)=>[[A[0][0],A[1][0],A[2][0]],[A[0][1],A[1][1],A[2][1]],[A[0][2],A[1][2],A[2][2]]]
  };

  const TIdentity = () => ({R:I3(), t:[0,0,0]});
  const TApply = (T,p) => V.add(M.apply(T.R,p),T.t);
  const TCompose = (A,B) => ({R:M.mul(A.R,B.R), t:V.add(M.apply(A.R,B.t),A.t)});
  const TInverse = (A) => {
    const R = M.T(A.R);
    return {R, t:V.mul(M.apply(R,A.t),-1)};
  };

  function rotAxis(axis, angle) {
    const [x,y,z] = V.norm(axis), c=Math.cos(angle), s=Math.sin(angle), q=1-c;
    return [
      [c+x*x*q, x*y*q-z*s, x*z*q+y*s],
      [y*x*q+z*s, c+y*y*q, y*z*q-x*s],
      [z*x*q-y*s, z*y*q+x*s, c+z*z*q]
    ];
  }

  function rotAroundLine(a,b,angle) {
    const R=rotAxis(V.sub(b,a),angle);
    return {R, t:V.sub(a,M.apply(R,a))};
  }

  function resize() {
    const r = stage.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    stage.width = Math.max(1,Math.round(W*dpr));
    stage.height = Math.max(1,Math.round(H*dpr));
    stage.style.width = W+'px';
    stage.style.height = H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    render();
  }
  new ResizeObserver(resize).observe(stage.parentElement);

  function paperRect() {
    const m=Math.max(24,Math.min(W,H)*0.075);
    return {x:m,y:m+12,w:W-2*m,h:H-2*m-18};
  }
  function pointerPoint(ev) {
    const r=stage.getBoundingClientRect();
    return {x:ev.clientX-r.left,y:ev.clientY-r.top};
  }
  function insidePaper(p) {
    const r=paperRect();
    return p.x>r.x+8&&p.x<r.x+r.w-8&&p.y>r.y+8&&p.y<r.y+r.h-8;
  }
  const d2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const orient=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  function segIntersect(a,b,c,d) {
    const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
    return ((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0));
  }
  function simplePolygon(p) {
    const n=p.length;
    if(n<3) return false;
    for(let i=0;i<n;i++){
      const a=p[i],b=p[(i+1)%n];
      for(let j=i+1;j<n;j++){
        if(Math.abs(i-j)<=1||(i===0&&j===n-1)) continue;
        if(segIntersect(a,b,p[j],p[(j+1)%n])) return false;
      }
    }
    return true;
  }

  stage.addEventListener('pointerup', e => {
    if(mode!=='draw') return;
    const p=pointerPoint(e);
    if(!insidePaper(p)) return;
    if(points.length&&d2(points[points.length-1],p)<12) return;
    points.push(p);
    updateDrawUI();
    render();
  });

  ui.undo.onclick=()=>{ points.pop(); updateDrawUI(); render(); };
  ui.finish.onclick=finishShape;
  ui.restart.onclick=restart;
  ui.back.onclick=()=>goStep(stepIndex-1);
  ui.next.onclick=()=>goStep(stepIndex+1);
  ui.play.onclick=()=>playing?stopPlay():startPlay();
  ui.speed.onclick=()=>{
    const i=(speeds.indexOf(speed)+1)%speeds.length;
    speed=speeds[i];
    ui.speed.textContent=(speed===1?'1':speed.toFixed(2).replace(/0$/,''))+'×';
  };
  ui.info.onclick=()=>ui.dialog.showModal();
  ui.closeInfo.onclick=()=>ui.dialog.close();

  function updateDrawUI() {
    ui.undo.disabled=!points.length;
    ui.finish.disabled=points.length<3;
    ui.hint.textContent=
      points.length===0?'Tap the paper to place your first vertex.':
      points.length<3?'Keep tapping to add vertices.':
      'Add vertices, then tap Finish shape.';
  }

  function restart() {
    animToken++;
    playing=false;
    points=[];
    solution=null;
    steps=[];
    stepIndex=0;
    mode='draw';
    visual.fold=0; visual.creases=0; visual.cut=0; visual.reveal=0;
    ui.draw.classList.remove('hidden');
    ui.demo.classList.add('hidden');
    ui.badge.classList.add('hidden');
    ui.hint.classList.remove('hidden');
    ui.loading.classList.add('hidden');
    updateDrawUI();
    render();
  }

  function toSolverPoints(pts) {
    const r=paperRect(), sx=560/r.w, sy=420/r.h;
    return pts.map(p=>({x:80+(p.x-r.x)*sx,y:70+(r.y+r.h-p.y)*sy}));
  }

  async function finishShape() {
    if(points.length<3) return;
    if(!simplePolygon(points)) {
      ui.hint.textContent='That outline crosses itself. Undo a point and try a simple polygon.';
      return;
    }

    mode='busy';
    ui.loading.classList.remove('hidden');
    ui.hint.textContent='Building the crease pattern and 3D hinges…';
    await new Promise(r=>setTimeout(r,60));

    try {
      solution=solveWithMIT(points);
    } catch(err) {
      console.warn('Full solver failed; using a small 3D illustrative construction.',err);
      solution=solveFallback(points);
    }

    buildSteps();
    mode='demo';
    ui.loading.classList.add('hidden');
    ui.draw.classList.add('hidden');
    ui.demo.classList.remove('hidden');
    ui.hint.classList.add('hidden');
    ui.badge.classList.remove('hidden');
    goStep(0,true);
  }

  function solveWithMIT(pts) {
    if(typeof window.Point!=='function'||typeof window.foldAndCut!=='function') {
      throw new Error('Fold-and-cut geometry library did not load.');
    }

    const raw=toSolverPoints(pts);
    const seq=raw.map(p=>new window.Point(p.x,p.y));
    seq.push(seq[0]);
    seq.push('marker');

    const oldAlert=window.alert;
    let solverAlert='';
    window.alert=m=>{solverAlert=String(m);};
    let out;
    try { out=window.foldAndCut(seq); }
    finally { window.alert=oldAlert; }
    if(solverAlert) throw new Error(solverAlert);

    const CP=out[0], CPFaces=out[1];
    if(!CP||!CP.cPVs||!CP.cPEs||out[4]) throw new Error('No usable crease pattern.');

    try {
      const fs=window.foldedState(CP);
      window.fold(CP,fs[2],fs[3]);
    } catch(e) {
      console.warn('Flat-state pass reported an issue.',e);
    }

    const vertices=CP.cPVs.map((v,i)=>({
      id:i, x:v.x, y:v.y,
      fx:v.foldedPos?.x ?? v.x,
      fy:v.foldedPos?.y ?? v.y,
      type:v.type
    }));
    const index=new Map(CP.cPVs.map((v,i)=>[v,i]));
    const edges=CP.cPEs.map((e,i)=>({
      id:i,
      a:index.get(e.endpt1), b:index.get(e.endpt2),
      type:e.type,
      assignment:(e.assignment||'u').toLowerCase()
    })).filter(e=>Number.isInteger(e.a)&&Number.isInteger(e.b));

    const faces=(CPFaces||[]).map((f,fi)=>{
      const arr=Array.isArray(f?.[0])?f[0]:(Array.isArray(f)?f:[]);
      const ids=[];
      for(const v of arr){
        const id=index.get(v);
        if(Number.isInteger(id)&&ids[ids.length-1]!==id) ids.push(id);
      }
      if(ids.length>2&&ids[0]===ids[ids.length-1]) ids.pop();
      return {id:fi, verts:ids};
    }).filter(f=>f.verts.length>=3);

    if(faces.length<1) throw new Error('Solver returned no paper faces.');

    return prepareSolution({
      vertices, edges, faces,
      targetPolygon:raw,
      solver:'3D straight-skeleton model'
    });
  }

  function solveFallback(pts) {
    const raw=toSolverPoints(pts);
    const minX=Math.min(...raw.map(p=>p.x))-60, maxX=Math.max(...raw.map(p=>p.x))+60;
    const minY=Math.min(...raw.map(p=>p.y))-60, maxY=Math.max(...raw.map(p=>p.y))+60;
    const cx=(minX+maxX)/2, cy=(minY+maxY)/2;

    const a=[minX,minY], b=[maxX,maxY];
    const reflect2=(p)=>{
      const vx=b[0]-a[0],vy=b[1]-a[1], wx=p[0]-a[0],wy=p[1]-a[1];
      const t=(wx*vx+wy*vy)/(vx*vx+vy*vy);
      const fx=a[0]+t*vx,fy=a[1]+t*vy;
      return [2*fx-p[0],2*fy-p[1]];
    };
    const r1=reflect2([maxX,minY]);
    const vertices=[
      {id:0,x:minX,y:minY,fx:minX,fy:minY,type:'boundary'},
      {id:1,x:maxX,y:minY,fx:r1[0],fy:r1[1],type:'boundary'},
      {id:2,x:maxX,y:maxY,fx:maxX,fy:maxY,type:'boundary'},
      {id:3,x:minX,y:maxY,fx:minX,fy:maxY,type:'boundary'}
    ];
    const edges=[
      {id:0,a:0,b:1,type:'boundary',assignment:'b'},
      {id:1,a:1,b:2,type:'boundary',assignment:'b'},
      {id:2,a:2,b:3,type:'boundary',assignment:'b'},
      {id:3,a:3,b:0,type:'boundary',assignment:'b'},
      {id:4,a:0,b:2,type:'skeleton',assignment:'v'}
    ];
    const faces=[
      {id:0,verts:[0,1,2]},
      {id:1,verts:[0,2,3]}
    ];
    return prepareSolution({
      vertices,edges,faces,targetPolygon:raw,
      solver:'3D illustrative fallback'
    });
  }

  function signedArea(ids, vertices, folded=false) {
    let a=0;
    for(let i=0;i<ids.length;i++){
      const p=vertices[ids[i]],q=vertices[ids[(i+1)%ids.length]];
      const px=folded?p.fx:p.x, py=folded?p.fy:p.y;
      const qx=folded?q.fx:q.x, qy=folded?q.fy:q.y;
      a+=px*qy-qx*py;
    }
    return a/2;
  }

  function findNonCollinear(ids, vertices, folded=false) {
    for(let i=0;i<ids.length-2;i++){
      for(let j=i+1;j<ids.length-1;j++){
        for(let k=j+1;k<ids.length;k++){
          const a=vertices[ids[i]],b=vertices[ids[j]],c=vertices[ids[k]];
          const ax=folded?a.fx:a.x, ay=folded?a.fy:a.y;
          const bx=folded?b.fx:b.x, by=folded?b.fy:b.y;
          const cx=folded?c.fx:c.x, cy=folded?c.fy:c.y;
          if(Math.abs((bx-ax)*(cy-ay)-(by-ay)*(cx-ax))>1e-5) return [ids[i],ids[j],ids[k]];
        }
      }
    }
    return null;
  }

  function rigidMapForFace(face, vertices) {
    const tri=findNonCollinear(face.verts,vertices,false);
    if(!tri) return TIdentity();
    const [ia,ib,ic]=tri;
    const va=vertices[ia],vb=vertices[ib],vc=vertices[ic];
    const p0=[va.x,va.y,0],p1=[vb.x,vb.y,0],p2=[vc.x,vc.y,0];
    const q0=[va.fx,va.fy,0],q1=[vb.fx,vb.fy,0],q2=[vc.fx,vc.fy,0];

    const e1=V.norm(V.sub(p1,p0));
    const n0=[0,0,1];
    const e2=V.norm(V.cross(n0,e1));

    const f1=V.norm(V.sub(q1,q0));
    const so=Math.sign(V.cross(V.sub(p1,p0),V.sub(p2,p0))[2])||1;
    const st=Math.sign(V.cross(V.sub(q1,q0),V.sub(q2,q0))[2])||so;
    const nt=[0,0,so===st?1:-1];
    const f2=V.norm(V.cross(nt,f1));

    const B0=[
      [e1[0],e2[0],n0[0]],
      [e1[1],e2[1],n0[1]],
      [e1[2],e2[2],n0[2]]
    ];
    const B1=[
      [f1[0],f2[0],nt[0]],
      [f1[1],f2[1],nt[1]],
      [f1[2],f2[2],nt[2]]
    ];
    const R=M.mul(B1,M.T(B0));
    const t=V.sub(q0,M.apply(R,p0));
    return {R,t};
  }

  function edgeKind(e) {
    if(e.type==='skeleton'||e.type==='perp') return 'crease';
    if(e.type==='graph'||e.type==='quasiGraph') return 'target';
    if(e.type==='boundary') return 'boundary';
    return 'other';
  }

  function faceArea(face, vertices) {
    return Math.abs(signedArea(face.verts,vertices,false));
  }

  function prepareSolution(sol) {
    sol.faces.forEach((f,i)=>{f.id=i;f.set=new Set(f.verts);});
    sol.originalTargets=sol.faces.map(f=>rigidMapForFace(f,sol.vertices));

    let root=0, best=-1;
    sol.faces.forEach((f,i)=>{
      const a=faceArea(f,sol.vertices);
      if(a>best){best=a;root=i;}
    });
    sol.root=root;

    const rootInv=TInverse(sol.originalTargets[root]);
    sol.targetTransforms=sol.originalTargets.map(T=>TCompose(rootInv,T));

    sol.edgeFace=new Array(sol.edges.length).fill(null);
    sol.edges.forEach((e,ei)=>{
      const owner=sol.faces.findIndex(f=>f.set.has(e.a)&&f.set.has(e.b));
      if(owner>=0) sol.edgeFace[ei]=owner;
    });

    const adjacency=Array.from({length:sol.faces.length},()=>[]);
    sol.edges.forEach((e,ei)=>{
      if(edgeKind(e)!=='crease') return;
      const pair=[];
      sol.faces.forEach((f,fi)=>{
        if(f.set.has(e.a)&&f.set.has(e.b)) pair.push(fi);
      });
      if(pair.length>=2){
        const a=pair[0],b=pair[1];
        adjacency[a].push({to:b,edgeIndex:ei});
        adjacency[b].push({to:a,edgeIndex:ei});
      }
    });
    sol.adjacency=adjacency;

    const parent=new Array(sol.faces.length).fill(-1);
    const parentEdge=new Array(sol.faces.length).fill(-1);
    const order=[];
    parent[root]=root;
    const q=[root];
    while(q.length){
      const f=q.shift();
      order.push(f);
      for(const link of adjacency[f]){
        if(parent[link.to]!==-1) continue;
        parent[link.to]=f;
        parentEdge[link.to]=link.edgeIndex;
        q.push(link.to);
      }
    }

    for(let i=0;i<parent.length;i++){
      if(parent[i]===-1){parent[i]=i;order.push(i);}
    }

    sol.parent=parent;
    sol.parentEdge=parentEdge;
    sol.faceOrder=order;
    sol.ops=[];
    sol.opByFace=new Array(sol.faces.length).fill(null);

    for(const child of order){
      const p=parent[child];
      if(child===p) continue;
      const ei=parentEdge[child], e=sol.edges[ei];
      const rel=TCompose(TInverse(sol.targetTransforms[p]),sol.targetTransforms[child]);
      const a=[sol.vertices[e.a].x,sol.vertices[e.a].y,0];
      const b=[sol.vertices[e.b].x,sol.vertices[e.b].y,0];
      const axis=V.norm(V.sub(b,a));
      const R=rel.R;
      const cos=Math.max(-1,Math.min(1,(R[0][0]+R[1][1]+R[2][2]-1)/2));
      const skew=[R[2][1]-R[1][2],R[0][2]-R[2][0],R[1][0]-R[0][1]];
      const sin=V.dot(axis,skew)/2;
      let angle=Math.atan2(sin,cos);

      if(Math.abs(Math.abs(angle)-Math.PI)<0.08){
        angle=(e.assignment==='m'?-1:1)*Math.PI;
      }
      if(Math.abs(angle)<0.015) angle=0;

      const op={
        id:angle===0?-1:sol.ops.length,
        face:child,parent:p,edgeIndex:ei,
        a,b,angle,assignment:e.assignment
      };
      if(angle!==0) sol.ops.push(op);
      sol.opByFace[child]=op;
    }

    const xs=sol.vertices.map(v=>v.x), ys=sol.vertices.map(v=>v.y);
    sol.bounds={
      minX:Math.min(...xs),maxX:Math.max(...xs),
      minY:Math.min(...ys),maxY:Math.max(...ys)
    };
    sol.center=[
      (sol.bounds.minX+sol.bounds.maxX)/2,
      (sol.bounds.minY+sol.bounds.maxY)/2,
      0
    ];

    const foldedPts=[];
    sol.edges.forEach(e=>{
      if(edgeKind(e)!=='target') return;
      for(const id of [e.a,e.b]){
        const v=sol.vertices[id];
        foldedPts.push(TApply(rootInv,[v.fx,v.fy,0]));
      }
    });
    sol.cutLine=principalLine(foldedPts.length?foldedPts:[
      [sol.center[0]-100,sol.center[1],0],
      [sol.center[0]+100,sol.center[1],0]
    ]);

    return sol;
  }

  function principalLine(pts) {
    const c=pts.reduce((s,p)=>V.add(s,V.mul(p,1/pts.length)),[0,0,0]);
    let xx=0,xy=0,yy=0;
    for(const p of pts){
      const dx=p[0]-c[0],dy=p[1]-c[1];
      xx+=dx*dx;xy+=dx*dy;yy+=dy*dy;
    }
    const ang=0.5*Math.atan2(2*xy,xx-yy);
    const dir=[Math.cos(ang),Math.sin(ang),0];
    let mn=Infinity,mx=-Infinity;
    for(const p of pts){
      const t=V.dot(V.sub(p,c),dir);
      mn=Math.min(mn,t);mx=Math.max(mx,t);
    }
    const pad=Math.max(28,(mx-mn)*0.12);
    return {
      center:c,dir,
      start:V.add(c,V.mul(dir,mn-pad)),
      end:V.add(c,V.mul(dir,mx+pad))
    };
  }

  function buildSteps() {
    const n=solution.ops.length;
    const maxFoldSteps=9;
    const groupSize=Math.max(1,Math.ceil(n/maxFoldSteps));
    const groups=[];
    for(let i=0;i<n;i+=groupSize){
      groups.push({start:i,end:Math.min(n,i+groupSize)});
    }

    steps=[
      {
        title:'Your shape',
        text:'Your cut outline sits on a single sheet of paper in 3D space.',
        fold:0,creases:0,cut:0,reveal:0
      },
      {
        title:'Build the crease pattern',
        text:'The straight-skeleton construction divides the sheet into rigid panels connected by crease hinges.',
        fold:0,creases:1,cut:0,reveal:0
      }
    ];

    groups.forEach((g,i)=>{
      const count=g.end-g.start;
      steps.push({
        title:`Fold ${i+1} of ${groups.length}`,
        text:count===1
          ?'Watch the moving packet rotate around the highlighted crease. The paper panels themselves stay rigid.'
          :`This stage contains ${count} consecutive hinge folds. Watch each packet lift, rotate, and settle before the next begins.`,
        fold:g.end,creases:1,cut:0,reveal:0,
        opRange:g
      });
    });

    steps.push({
      title:'The cut edges align',
      text:'The hinge sequence reaches the solver’s flat state, bringing the target cut edges onto one straight line.',
      fold:n,creases:0,cut:0,reveal:0
    });
    steps.push({
      title:'Make one straight cut',
      text:'The blade travels once through the folded stack along the common cutting line.',
      fold:n,creases:0,cut:1,reveal:0
    });
    steps.push({
      title:'Unfold the paper',
      text:'The folds reverse and the cut opens back out into the exact outline you drew.',
      fold:0,creases:0,cut:0,reveal:1
    });
  }

  function goStep(i,instant=false) {
    i=Math.max(0,Math.min(steps.length-1,i));
    const target=steps[i];
    stepIndex=i;
    updateStepUI();

    const start={...visual};
    const end={
      fold:target.fold,
      creases:target.creases,
      cut:target.cut,
      reveal:target.reveal
    };

    if(instant){
      Object.assign(visual,end);
      render();
      return;
    }

    const foldDelta=Math.abs(end.fold-start.fold);
    let duration=(700+Math.min(1700,foldDelta*360))/speed;
    if(target.reveal===1||start.reveal===1) duration=2100/speed;
    animateVisual(start,end,duration);
  }

  function animateVisual(start,end,duration) {
    const token=++animToken;
    const t0=performance.now();
    function frame(now){
      if(token!==animToken) return;
      let t=Math.min(1,(now-t0)/duration);
      t=t*t*(3-2*t);
      for(const k of Object.keys(end)) visual[k]=start[k]+(end[k]-start[k])*t;
      render();
      if(t<1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function updateStepUI() {
    const s=steps[stepIndex];
    ui.count.textContent=`Step ${stepIndex+1} of ${steps.length}`;
    ui.title.textContent=s.title;
    ui.text.textContent=s.text;
    ui.back.disabled=stepIndex===0;
    ui.next.disabled=stepIndex===steps.length-1;
    ui.badge.textContent=solution.solver;
  }

  async function startPlay() {
    if(stepIndex===steps.length-1) goStep(0,true);
    playing=true;
    ui.play.textContent='Ⅱ';
    while(playing&&stepIndex<steps.length-1){
      await sleep(1050/speed);
      if(!playing) break;
      goStep(stepIndex+1);
      const s=steps[stepIndex];
      const pause=(s.opRange?1350:950)/speed;
      await sleep(pause);
    }
    if(stepIndex===steps.length-1) stopPlay();
  }
  function stopPlay(){playing=false;ui.play.textContent='▶';}
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function opProgress(opIndex,foldProgress) {
    if(opIndex<0) return 1;
    return Math.max(0,Math.min(1,foldProgress-opIndex));
  }

  function currentTransforms(foldProgress) {
    const Ts=new Array(solution.faces.length);
    for(const fi of solution.faceOrder){
      const p=solution.parent[fi];
      if(fi===p||!solution.opByFace[fi]){
        Ts[fi]=TIdentity();
        continue;
      }
      const op=solution.opByFace[fi];
      const parentT=Ts[p]||TIdentity();
      const t=opProgress(op.id,foldProgress);
      const H=rotAroundLine(op.a,op.b,op.angle*t);
      Ts[fi]=TCompose(parentT,H);
    }
    return Ts;
  }

  function pointForVertex(id,Ts,preferredFace=null) {
    let fi=preferredFace;
    if(fi==null||fi<0) {
      fi=solution.faces.findIndex(f=>f.set.has(id));
      if(fi<0) fi=solution.root;
    }
    const v=solution.vertices[id];
    return TApply(Ts[fi]||TIdentity(),[v.x,v.y,0]);
  }

  function cameraFor(Ts) {
    const c0=solution.center;
    const foldRatio=solution.ops.length?visual.fold/solution.ops.length:0;
    const yaw=-0.12+0.07*Math.sin(foldRatio*Math.PI);
    const dx=-350*Math.cos(yaw)-110*Math.sin(yaw);
    const dy=-760*Math.cos(yaw)+130*Math.sin(yaw);
    const cam=[c0[0]+dx,c0[1]+dy,620];
    const target=[c0[0],c0[1],20];
    const forward=V.norm(V.sub(target,cam));
    const right=V.norm(V.cross(forward,[0,0,1]));
    const up=V.norm(V.cross(right,forward));
    const focal=Math.min(W,H)*1.72;
    return {cam,target,forward,right,up,focal};
  }

  function project(p,cam) {
    const r=V.sub(p,cam.cam);
    const z=V.dot(r,cam.forward);
    if(z<10) return null;
    return {
      x:W*0.5+cam.focal*V.dot(r,cam.right)/z,
      y:H*0.53-cam.focal*V.dot(r,cam.up)/z,
      depth:z
    };
  }

  function faceWorld(face,T) {
    return face.verts.map(id=>{
      const v=solution.vertices[id];
      return TApply(T,[v.x,v.y,0]);
    });
  }

  function polyNormal(poly) {
    for(let i=1;i<poly.length-1;i++){
      const n=V.cross(V.sub(poly[i],poly[0]),V.sub(poly[i+1],poly[0]));
      if(V.len(n)>1e-6) return V.norm(n);
    }
    return [0,0,1];
  }

  function render() {
    if(!W||!H) return;
    ctx.clearRect(0,0,W,H);
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#f9f5ec');
    g.addColorStop(1,'#eee6d8');
    ctx.fillStyle=g;
    ctx.fillRect(0,0,W,H);

    if(mode==='draw'||mode==='busy') {
      renderDraw();
      return;
    }
    if(solution) render3D();
  }

  function drawRoundedRect(x,y,w,h,r) {
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x,y,w,h,r);
    else ctx.rect(x,y,w,h);
  }

  function renderDraw() {
    const r=paperRect();
    ctx.save();
    ctx.fillStyle='#fffdf7';
    ctx.shadowColor='rgba(58,45,27,.15)';
    ctx.shadowBlur=20;ctx.shadowOffsetY=8;
    drawRoundedRect(r.x,r.y,r.w,r.h,7);
    ctx.fill();
    ctx.shadowColor='transparent';
    ctx.strokeStyle='rgba(90,75,50,.14)';
    ctx.lineWidth=1;
    ctx.stroke();

    if(points.length){
      ctx.lineJoin='round';ctx.lineCap='round';
      ctx.strokeStyle='#28251f';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
      for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x,points[i].y);
      ctx.stroke();

      points.forEach((p,i)=>{
        ctx.beginPath();ctx.arc(p.x,p.y,i===0?6:5,0,Math.PI*2);
        ctx.fillStyle=i===0?'#bb3f31':'#28251f';ctx.fill();
        ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);
        ctx.strokeStyle='rgba(37,35,31,.10)';ctx.lineWidth=1;ctx.stroke();
      });
    }
    ctx.restore();
  }

  function render3D() {
    const Ts=currentTransforms(visual.fold);
    const cam=cameraFor(Ts);

    const groundY=H*0.74;
    const shadow=ctx.createRadialGradient(W/2,groundY,10,W/2,groundY,Math.min(W,H)*0.48);
    shadow.addColorStop(0,'rgba(83,67,44,.17)');
    shadow.addColorStop(1,'rgba(83,67,44,0)');
    ctx.fillStyle=shadow;
    ctx.beginPath();
    ctx.ellipse(W/2,groundY,Math.min(W,H)*0.44,Math.min(W,H)*0.11,0,0,Math.PI*2);
    ctx.fill();

    const rendered=solution.faces.map((face,fi)=>{
      const world=faceWorld(face,Ts[fi]||TIdentity());
      const proj=world.map(p=>project(p,cam));
      const depth=proj.reduce((s,p)=>s+(p?.depth||0),0)/proj.length;
      return {face,fi,world,proj,depth,normal:polyNormal(world)};
    }).filter(x=>x.proj.every(Boolean));

    rendered.sort((a,b)=>b.depth-a.depth);

    const light=V.norm([-0.45,-0.65,1]);
    rendered.forEach((item,drawOrder)=>{
      const p=item.proj;
      const lum=0.82+0.16*Math.abs(V.dot(item.normal,light));
      const r=Math.round(255*lum), g=Math.round(252*lum), b=Math.round(242*lum);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p[0].x,p[0].y);
      for(let i=1;i<p.length;i++) ctx.lineTo(p[i].x,p[i].y);
      ctx.closePath();
      ctx.fillStyle=`rgb(${r},${g},${b})`;
      ctx.shadowColor='rgba(48,39,26,.18)';
      ctx.shadowBlur=5;ctx.shadowOffsetY=2;
      ctx.fill();
      ctx.shadowColor='transparent';
      ctx.strokeStyle='rgba(92,79,58,.16)';
      ctx.lineWidth=0.8;
      ctx.stroke();
      ctx.restore();
    });

    drawTargetOutline(Ts,cam);
    if(visual.creases>0.01) drawCreases(Ts,cam);
    if(visual.cut>0.001) drawCut(Ts,cam);
    if(visual.reveal>0.001) drawReveal(cam);

    ctx.save();
    ctx.font='700 10px ui-rounded, system-ui';
    ctx.fillStyle='rgba(65,58,48,.5)';
    ctx.textAlign='left';
    ctx.fillText('3D PAPER MODEL',14,H-14);
    ctx.restore();
  }

  function drawLine3D(a,b,cam,style,width=1,dash=[]) {
    const pa=project(a,cam),pb=project(b,cam);
    if(!pa||!pb) return;
    ctx.save();
    ctx.strokeStyle=style;ctx.lineWidth=width;ctx.lineCap='round';
    ctx.setLineDash(dash);
    ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();
    ctx.restore();
  }

  function drawTargetOutline(Ts,cam) {
    const alpha=visual.reveal>0?1:Math.max(0.18,1-visual.fold/(Math.max(1,solution.ops.length))*0.45);
    solution.edges.forEach((e,ei)=>{
      if(edgeKind(e)!=='target') return;
      const fi=solution.edgeFace[ei]??solution.root;
      const a=pointForVertex(e.a,Ts,fi);
      const b=pointForVertex(e.b,Ts,fi);
      drawLine3D(a,b,cam,visual.reveal>0?'rgba(187,63,49,.95)':`rgba(40,37,31,${alpha})`,visual.reveal>0?3.2:2.2);
    });
  }

  function currentHighlightedEdges() {
    const s=steps[stepIndex];
    if(!s?.opRange) return new Set();
    const set=new Set();
    for(let i=s.opRange.start;i<s.opRange.end;i++){
      const op=solution.ops[i];
      if(op) set.add(op.edgeIndex);
    }
    return set;
  }

  function drawCreases(Ts,cam) {
    const hi=currentHighlightedEdges();
    solution.edges.forEach((e,ei)=>{
      if(edgeKind(e)!=='crease') return;
      const fi=solution.edgeFace[ei]??solution.root;
      const a=pointForVertex(e.a,Ts,fi);
      const b=pointForVertex(e.b,Ts,fi);
      const highlighted=hi.has(ei);
      const style=e.assignment==='m'
        ?`rgba(190,72,59,${0.25+0.75*visual.creases})`
        :e.assignment==='v'
          ?`rgba(54,107,139,${0.25+0.75*visual.creases})`
          :`rgba(109,101,88,${0.2+0.55*visual.creases})`;
      drawLine3D(a,b,cam,style,highlighted?3.6:1.35,highlighted?[]:[6,5]);
      if(highlighted){
        drawLine3D(V.add(a,[0,0,1.8]),V.add(b,[0,0,1.8]),cam,'rgba(255,255,255,.6)',1.1);
      }
    });
  }

  function drawCut(Ts,cam) {
    const line=solution.cutLine;
    const p0=line.start,p1=line.end;
    const progress=Math.max(0,Math.min(1,visual.cut));
    const tip=V.lerp(p0,p1,progress);

    drawLine3D(V.add(p0,[0,0,2]),V.add(tip,[0,0,2]),cam,'rgba(190,48,38,.98)',4.2);

    const d=V.norm(V.sub(p1,p0));
    const side=V.norm([-d[1],d[0],0]);
    const top=V.add(tip,[0,0,105]);
    const pts=[
      V.add(top,V.mul(side,13)),
      V.add(top,V.mul(side,-13)),
      V.add(tip,V.mul(side,-5)),
      V.add(tip,V.mul(side,5))
    ].map(p=>project(p,cam));
    if(pts.every(Boolean)){
      const grad=ctx.createLinearGradient(pts[0].x,pts[0].y,pts[2].x,pts[2].y);
      grad.addColorStop(0,'rgba(245,247,248,.96)');
      grad.addColorStop(.45,'rgba(143,151,157,.96)');
      grad.addColorStop(1,'rgba(70,76,82,.96)');
      ctx.save();
      ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
      ctx.closePath();ctx.fillStyle=grad;
      ctx.shadowColor='rgba(0,0,0,.25)';ctx.shadowBlur=8;ctx.fill();
      ctx.restore();
    }

    const pp=project(tip,cam);
    if(pp){
      ctx.save();
      ctx.beginPath();ctx.arc(pp.x,pp.y,7,0,Math.PI*2);
      ctx.fillStyle='rgba(202,54,42,.26)';ctx.fill();
      ctx.restore();
    }
  }

  function drawReveal(cam) {
    const z=10+22*visual.reveal;
    const poly=solution.targetPolygon.map(p=>project([p.x,p.y,z],cam)).filter(Boolean);
    if(poly.length<3) return;

    ctx.save();
    ctx.beginPath();ctx.moveTo(poly[0].x,poly[0].y);
    for(let i=1;i<poly.length;i++)ctx.lineTo(poly[i].x,poly[i].y);
    ctx.closePath();
    ctx.fillStyle=`rgba(187,63,49,${0.10+0.14*visual.reveal})`;
    ctx.shadowColor=`rgba(68,44,30,${0.20*visual.reveal})`;
    ctx.shadowBlur=12*visual.reveal;ctx.shadowOffsetY=7*visual.reveal;
    ctx.fill();
    ctx.shadowColor='transparent';
    ctx.strokeStyle=`rgba(187,63,49,${0.95*visual.reveal})`;
    ctx.lineWidth=3.4;
    ctx.stroke();

    const c=poly.reduce((s,p)=>({x:s.x+p.x/poly.length,y:s.y+p.y/poly.length}),{x:0,y:0});
    ctx.fillStyle=`rgba(117,46,39,${0.8*visual.reveal})`;
    ctx.font='800 11px ui-rounded, system-ui';
    ctx.textAlign='center';
    ctx.fillText('ONE CUT',c.x,c.y);
    ctx.restore();
  }

  updateDrawUI();
  resize();
})();
