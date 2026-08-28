
  // One Cut v2 — sequence-first simple-fold experiment.
  // For convex polygons with reflectional symmetry, attempt an explicit
  // all-layers simple-fold sequence inspired by Demaine et al. (2010):
  // symmetry fold -> end-edge halving -> angle-bisector reductions -> endpoint tucks.
  // If any geometric check fails, the app keeps the general fold-and-cut solver.

  const v2EPS=1e-6;
  const v2Dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const v2Add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
  const v2Sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
  const v2Mul=(a,s)=>[a[0]*s,a[1]*s];
  const v2Dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
  const v2Len=a=>Math.hypot(a[0],a[1]);
  const v2Norm=a=>{const l=v2Len(a)||1;return[a[0]/l,a[1]/l];};
  const v2Perp=a=>[-a[1],a[0]];
  const v2Mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const v2Cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
  const v2Lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];

  function v2PolyArea(poly){
    let a=0;
    for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p[0]*q[1]-p[1]*q[0];}
    return a/2;
  }
  function v2Centroid(poly){
    let x=0,y=0;for(const p of poly){x+=p[0];y+=p[1];}
    return[x/poly.length,y/poly.length];
  }
  function v2IsConvex(poly){
    if(poly.length<3)return false;
    let sign=0;
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],c=poly[(i+2)%poly.length];
      const z=v2Cross(v2Sub(b,a),v2Sub(c,b));
      if(Math.abs(z)<1e-7)continue;
      const s=Math.sign(z);if(!sign)sign=s;else if(s!==sign)return false;
    }
    return !!sign;
  }
  function v2LineSide(line,p){return v2Cross(line.d,v2Sub(p,line.p));}
  function v2Reflect(line,p){
    const d=line.d,n=v2Perp(d),rel=v2Sub(p,line.p);
    return v2Add(line.p,v2Sub(v2Mul(d,v2Dot(rel,d)),v2Mul(n,v2Dot(rel,n))));
  }
  function v2Reflect3(line,p,angle){
    const a=[line.p[0],line.p[1],0],b=[line.p[0]+line.d[0],line.p[1]+line.d[1],0];
    return TA(rotLine(a,b,angle),[p[0],p[1],0]);
  }
  function v2PointLineDistance(line,p){return Math.abs(v2LineSide(line,p));}
  function v2LineIntersectionSeg(line,a,b){
    const sa=v2LineSide(line,a),sb=v2LineSide(line,b),den=sa-sb;
    if(Math.abs(den)<1e-12)return null;
    const t=sa/den;if(t<-1e-8||t>1+1e-8)return null;
    return v2Lerp(a,b,t);
  }
  function v2DedupePoints(poly){
    const out=[];
    for(const p of poly){if(!out.length||v2Dist(out[out.length-1],p)>1e-7)out.push(p);}
    if(out.length>1&&v2Dist(out[0],out[out.length-1])<1e-7)out.pop();
    return out;
  }
  function v2Clip(poly,line,keepSign){
    if(poly.length<3)return[];
    const out=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      const sa=v2LineSide(line,a)*keepSign,sb=v2LineSide(line,b)*keepSign;
      const ina=sa>=-1e-7,inb=sb>=-1e-7;
      if(ina)out.push(a);
      if(ina!==inb){
        const ip=v2LineIntersectionSeg(line,a,b);
        if(ip)out.push(ip);
      }
    }
    return v2DedupePoints(out);
  }
  function v2PieceArea(poly){return Math.abs(v2PolyArea(poly));}

  function v2ApplyPaper(pieces,op){
    const next=[],parts=[];
    for(const poly of pieces){
      let mn=Infinity,mx=-Infinity;
      for(const p of poly){const s=v2LineSide(op.line,p)*op.movingSign;mn=Math.min(mn,s);mx=Math.max(mx,s);}
      if(mx<=1e-7){
        next.push(poly.map(p=>p.slice()));parts.push({before:poly.map(p=>p.slice()),moving:false});
        continue;
      }
      if(mn>=-1e-7){
        const before=poly.map(p=>p.slice()),after=before.map(p=>v2Reflect(op.line,p));
        next.push(after);parts.push({before,moving:true});
        continue;
      }
      const moving=v2Clip(poly,op.line,op.movingSign),stationary=v2Clip(poly,op.line,-op.movingSign);
      if(stationary.length>=3&&v2PieceArea(stationary)>1e-5){
        next.push(stationary.map(p=>p.slice()));parts.push({before:stationary.map(p=>p.slice()),moving:false});
      }
      if(moving.length>=3&&v2PieceArea(moving)>1e-5){
        next.push(moving.map(p=>v2Reflect(op.line,p)));parts.push({before:moving.map(p=>p.slice()),moving:true});
      }
    }
    return{pieces:next,parts};
  }

  function v2SplitSegment(seg,line){
    const a=seg.a,b=seg.b,sa=v2LineSide(line,a),sb=v2LineSide(line,b);
    if(sa*sb<-1e-9){
      const ip=v2LineIntersectionSeg(line,a,b);
      if(ip)return[{a:a.slice(),b:ip.slice()},{a:ip.slice(),b:b.slice()}];
    }
    return[{a:a.slice(),b:b.slice()}];
  }
  function v2ApplyGraph(segments,op){
    const next=[],parts=[];
    for(const seg of segments){
      for(const piece of v2SplitSegment(seg,op.line)){
        const mid=v2Mid(piece.a,piece.b),moving=v2LineSide(op.line,mid)*op.movingSign>1e-7;
        if(moving){
          next.push({a:v2Reflect(op.line,piece.a),b:v2Reflect(op.line,piece.b)});
          parts.push({a:piece.a,b:piece.b,moving:true});
        }else{
          next.push({a:piece.a.slice(),b:piece.b.slice()});
          parts.push({a:piece.a,b:piece.b,moving:false});
        }
      }
    }
    return{segments:next.filter(s=>v2Dist(s.a,s.b)>1e-7),parts};
  }

  function v2CandidateAxes(poly){
    const c=v2Centroid(poly),dirs=[];
    const add=d=>{
      const n=v2Norm(d);if(v2Len(n)<1e-8)return;
      const canon=(n[0]<-1e-8||(Math.abs(n[0])<1e-8&&n[1]<0))?[-n[0],-n[1]]:n;
      if(!dirs.some(x=>Math.abs(v2Cross(x,canon))<1e-5))dirs.push(canon);
    };
    for(const p of poly)add(v2Sub(p,c));
    for(let i=0;i<poly.length;i++)add(v2Sub(v2Mid(poly[i],poly[(i+1)%poly.length]),c));
    for(let i=0;i<poly.length;i++)for(let j=i+1;j<poly.length;j++)add(v2Perp(v2Sub(poly[j],poly[i])));
    return dirs.map(d=>({p:c,d}));
  }
  function v2AxisMatches(poly,line){
    const span=Math.max(...poly.map(p=>v2Dist(p,line.p)),1),tol=span*2e-4;
    const used=new Array(poly.length).fill(false);
    for(const p of poly){
      const r=v2Reflect(line,p);let best=-1,bd=Infinity;
      for(let i=0;i<poly.length;i++)if(!used[i]){const d=v2Dist(r,poly[i]);if(d<bd){bd=d;best=i;}}
      if(best<0||bd>tol)return false;used[best]=true;
    }
    return true;
  }
  function v2FindSymmetry(poly){
    for(const line of v2CandidateAxes(poly))if(v2AxisMatches(poly,line))return line;
    return null;
  }

  function v2AugmentedPolygon(poly,line){
    const out=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      if(!out.length||v2Dist(out[out.length-1],a)>1e-7)out.push(a.slice());
      const sa=v2LineSide(line,a),sb=v2LineSide(line,b);
      if(sa*sb<-1e-9){
        const ip=v2LineIntersectionSeg(line,a,b);
        if(ip&&v2Dist(ip,a)>1e-7&&v2Dist(ip,b)>1e-7)out.push(ip);
      }
    }
    return v2DedupePoints(out);
  }
  function v2Path(aug,i,j){
    const out=[aug[i].slice()];let k=i;
    while(k!==j){k=(k+1)%aug.length;out.push(aug[k].slice());if(out.length>aug.length+2)break;}
    return out;
  }
  function v2HalfChain(poly,line){
    const aug=v2AugmentedPolygon(poly,line),axisIdx=[];
    for(let i=0;i<aug.length;i++)if(Math.abs(v2LineSide(line,aug[i]))<1e-5)axisIdx.push(i);
    if(axisIdx.length<2)return null;
    let bi=axisIdx[0],bj=axisIdx[1],best=-1;
    for(let x=0;x<axisIdx.length;x++)for(let y=x+1;y<axisIdx.length;y++){
      const d=v2Dist(aug[axisIdx[x]],aug[axisIdx[y]]);if(d>best){best=d;bi=axisIdx[x];bj=axisIdx[y];}
    }
    const p1=v2Path(aug,bi,bj),p2=v2Path(aug,bj,bi);
    const avg=path=>path.slice(1,-1).reduce((s,p)=>s+v2LineSide(line,p),0)/Math.max(1,path.length-2);
    const a1=avg(p1),a2=avg(p2);
    let chain=a1>=a2?p1:p2,sign=(a1>=a2?Math.sign(a1||1):Math.sign(a2||1));
    if(sign<0){chain=a1>=a2?p2:p1;sign=1;}
    return{chain:v2DedupePoints(chain),keepSign:1};
  }

  function v2PaperRectangle(poly,axis){
    const c=axis.p,d=axis.d,n=v2Perp(d);let minU=Infinity,maxU=-Infinity,maxV=0;
    for(const p of poly){const r=v2Sub(p,c),u=v2Dot(r,d),v=Math.abs(v2Dot(r,n));minU=Math.min(minU,u);maxU=Math.max(maxU,u);maxV=Math.max(maxV,v);}
    const padU=Math.max(18,(maxU-minU)*.12),padV=Math.max(18,maxV*.20);
    minU-=padU;maxU+=padU;maxV+=padV;
    return[
      v2Add(c,v2Add(v2Mul(d,minU),v2Mul(n,-maxV))),
      v2Add(c,v2Add(v2Mul(d,maxU),v2Mul(n,-maxV))),
      v2Add(c,v2Add(v2Mul(d,maxU),v2Mul(n,maxV))),
      v2Add(c,v2Add(v2Mul(d,minU),v2Mul(n,maxV)))
    ];
  }

  function v2OnlyEndpointMoves(chain,line,sign){
    for(let i=1;i<chain.length;i++)if(v2LineSide(line,chain[i])*sign>2e-5)return false;
    return true;
  }
  function v2ReduceStart(chain){
    if(chain.length<3)return null;
    let c=chain.map(p=>p.slice()),ops=[],guard=0;
    while(v2Dist(c[0],c[1])>v2Dist(c[1],c[2])*.92&&guard++<10){
      const v0=c[0],v1=c[1],e=v2Sub(v1,v0),p=v2Add(v0,v2Mul(e,.25)),line={p,d:v2Perp(v2Norm(e))};
      const sign=Math.sign(v2LineSide(line,v0))||1;
      if(!v2OnlyEndpointMoves(c,line,sign))return null;
      ops.push({kind:'halve',label:'Shorten the end edge',detail:'Fold the exposed end inward by half.',line,movingSign:sign});
      c[0]=v2Mid(v0,v1);
    }
    const v0=c[0],v1=c[1],v2=c[2],u=v2Norm(v2Sub(v0,v1)),w=v2Norm(v2Sub(v2,v1)),sum=v2Add(u,w);
    if(v2Len(sum)<1e-7)return null;
    const line={p:v1.slice(),d:v2Norm(sum)},sign=Math.sign(v2LineSide({p:v1,d:v2Norm(sum)},v0))||1;
    if(!v2OnlyEndpointMoves(c,line,sign))return null;
    const rp=v2Reflect(line,v0);
    const ray=v2Norm(v2Sub(v2,v1)),along=v2Dot(v2Sub(rp,v1),ray);
    if(along<-1e-4||along>v2Dist(v1,v2)+1e-3)return null;
    ops.push({kind:'bisector',label:'Fold the corner onto its neighbor',detail:'An angle-bisector fold removes one turn from the passage.',line,movingSign:sign});
    c=[rp,...c.slice(2)];
    return{chain:c,ops};
  }
  function v2ReduceEnd(chain){
    const r=v2ReduceStart(chain.slice().reverse());
    if(!r)return null;
    return{chain:r.chain.slice().reverse(),ops:r.ops};
  }
  function v2ChooseReduction(chain){
    const a=v2ReduceStart(chain),b=v2ReduceEnd(chain);
    if(!a)return b;if(!b)return a;
    return a.ops.length<=b.ops.length?a:b;
  }

  function v2PointInPoly(p,poly){
    let inside=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const a=poly[i],b=poly[j];
      const hit=((a[1]>p[1])!==(b[1]>p[1]))&&(p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1]+1e-30)+a[0]);
      if(hit)inside=!inside;
    }
    return inside;
  }
  function v2BuildPlan(raw){
    const poly=raw.map(p=>[p.x,p.y]);
    if(!v2IsConvex(poly))return{eligible:false,reason:'This polygon is not convex.'};
    const axis=v2FindSymmetry(poly);
    if(!axis)return{eligible:false,reason:'No reflectional symmetry was found.'};
    const half=v2HalfChain(poly,axis);
    if(!half||half.chain.length<2)return{eligible:false,reason:'Could not extract the symmetric half-passage.'};

    let pieces=[v2PaperRectangle(poly,axis)];
    let segments=poly.map((p,i)=>({a:p.slice(),b:poly[(i+1)%poly.length].slice()}));
    const states=[{pieces:pieces.map(p=>p.map(q=>q.slice())),segments:segments.map(s=>({a:s.a.slice(),b:s.b.slice()}))}];
    const ops=[];
    const addOp=op=>{
      const pr=v2ApplyPaper(pieces,op),gr=v2ApplyGraph(segments,op);
      op.paperParts=pr.parts;op.graphParts=gr.parts;
      pieces=pr.pieces;segments=gr.segments;ops.push(op);
      states.push({pieces:pieces.map(p=>p.map(q=>q.slice())),segments:segments.map(s=>({a:s.a.slice(),b:s.b.slice()}))});
    };

    const movingSign=-1;
    addOp({kind:'symmetry',label:'Fold along the symmetry line',detail:'The first simple fold must be a reflectional symmetry of the polygon.',line:axis,movingSign});
    let chain=half.chain.map(p=>p.slice()),guard=0;
    while(chain.length>2&&guard++<32){
      const r=v2ChooseReduction(chain);
      if(!r)return{eligible:true,valid:false,reason:'The simple-fold construction got stuck while reducing the passage.'};
      for(const op of r.ops)addOp(op);
      chain=r.chain;
    }
    if(chain.length!==2)return{eligible:true,valid:false,reason:'The simple-fold construction did not reduce to one edge.'};

    const a=chain[0],b=chain[1],dir=v2Norm(v2Sub(b,a)),perp=v2Perp(dir),L=v2Dist(a,b);
    // Finish the paper with the successive-halving idea from the simple-fold
    // construction.  Halve a long excess tail until it is shorter than the
    // target segment, then fold the remaining tail exactly at the endpoint.
    // That last fold puts every point of the tail inside the target interval.
    const paperRange=()=>{
      const ts=pieces.flat().map(p=>v2Dot(v2Sub(p,a),dir));
      return{mn:Math.min(...ts),mx:Math.max(...ts)};
    };
    const foldStartTail=()=>{
      let g=0;
      while(g++<16){
        const {mn}=paperRange(),excess=-mn;
        if(excess<=1e-4)break;
        if(excess<=L*.82){
          const line={p:a.slice(),d:perp},probe=v2Add(a,v2Mul(dir,mn));
          addOp({kind:'tuck',label:'Tuck the first cut end',detail:'Fold the remaining short tail exactly at the cut endpoint.',line,movingSign:Math.sign(v2LineSide(line,probe))||1});
          break;
        }
        const creaseT=mn/2,p=v2Add(a,v2Mul(dir,creaseT)),line={p,d:perp},probe=v2Add(a,v2Mul(dir,mn));
        addOp({kind:'halve',label:'Halve excess paper',detail:'A successive-halving fold shortens the paper tail without touching the target edge.',line,movingSign:Math.sign(v2LineSide(line,probe))||1});
      }
    };
    const foldEndTail=()=>{
      let g=0;
      while(g++<16){
        const {mx}=paperRange(),excess=mx-L;
        if(excess<=1e-4)break;
        if(excess<=L*.82){
          const line={p:b.slice(),d:perp},probe=v2Add(a,v2Mul(dir,mx));
          addOp({kind:'tuck',label:'Tuck the second cut end',detail:'Fold the remaining short tail exactly at the opposite cut endpoint.',line,movingSign:Math.sign(v2LineSide(line,probe))||1});
          break;
        }
        const creaseT=L+excess/2,p=v2Add(a,v2Mul(dir,creaseT)),line={p,d:perp},probe=v2Add(a,v2Mul(dir,mx));
        addOp({kind:'halve',label:'Halve excess paper',detail:'A successive-halving fold shortens the opposite paper tail.',line,movingSign:Math.sign(v2LineSide(line,probe))||1});
      }
    };
    foldStartTail();foldEndTail();foldStartTail();

    const cutLine={p:a.slice(),d:dir,a:a.slice(),b:b.slice()};
    let maxOff=0;
    for(const s of segments){maxOff=Math.max(maxOff,v2PointLineDistance(cutLine,s.a),v2PointLineDistance(cutLine,s.b));}
    if(maxOff>2e-3)return{eligible:true,valid:false,reason:'The explicit folds did not align every target edge closely enough.'};

    // Approximate the paper-on-cut condition. This is deliberately conservative:
    // if excess paper still crosses the cut line outside the target interval, use
    // the general theorem solver instead of claiming a simple-fold solution.
    const cutLen=v2Dist(a,b),samples=120;
    let excess=false;
    const allPts=pieces.flat(),ts=allPts.map(p=>v2Dot(v2Sub(p,a),dir));
    const mn=Math.min(...ts),mx=Math.max(...ts);
    for(let i=0;i<=samples;i++){
      const t=mn+(mx-mn)*i/samples,q=v2Add(a,v2Mul(dir,t));
      const inPaper=pieces.some(poly=>v2PointInPoly(q,poly));
      if(inPaper&&(t<-1e-3||t>cutLen+1e-3)){excess=true;break;}
    }
    if(excess)return{eligible:true,valid:false,reason:'The explicit sequence still leaves excess paper on the cut line.'};

    const boundsPts=states[0].pieces.flat(),xs=boundsPts.map(p=>p[0]),ys=boundsPts.map(p=>p[1]);
    return{
      eligible:true,valid:true,axis,ops,states,cutLine,
      bounds:{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)},
      center:[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2],
      finalChain:chain
    };
  }

  const v2PrepareBefore=prepareSolution;
  prepareSolution=function(sol){
    const out=v2PrepareBefore(sol);
    try{
      const p=v2BuildPlan(sol.targetPolygon||[]);
      out.simpleV2=p;
      if(p.valid)out.badge='simple folds · '+p.ops.length+' folds';
      else if(p.eligible)out.simpleV2Note=p.reason;
    }catch(err){
      console.warn('V2 simple-fold path skipped:',err);
      out.simpleV2={eligible:false,valid:false,reason:String(err?.message||err)};
    }
    return out;
  };

  function v2StepName(op,i){
    if(op.kind==='symmetry')return'Fold '+(i+1)+' · symmetry';
    if(op.kind==='halve')return'Fold '+(i+1)+' · shorten edge';
    if(op.kind==='bisector')return'Fold '+(i+1)+' · angle bisector';
    return'Fold '+(i+1)+' · tuck paper';
  }

  const v2BuildStepsBefore=buildSteps;
  buildSteps=function(){
    const plan=solution?.simpleV2;
    if(!plan?.valid)return v2BuildStepsBefore();
    steps=[
      {title:'Your shape',text:'The target polygon, on a sheet with a small working margin.',simpleTime:0,cut:0,reveal:0,guide:-1},
      {title:'Simple-fold solution found',text:'This convex polygon has reflectional symmetry, so V2 can use an explicit sequence of all-layers simple folds.',simpleTime:0,cut:0,reveal:0,guide:0}
    ];
    plan.ops.forEach((op,i)=>steps.push({
      title:v2StepName(op,i),text:op.detail,simpleTime:i+1,cut:0,reveal:0,guide:i
    }));
    steps.push({title:'Make one straight cut',text:'Every target edge is now aligned on this one line, with the excess paper tucked away.',simpleTime:plan.ops.length,cut:1,reveal:0,guide:-1});
    steps.push({title:'Unfold the result',text:'Reverse the simple folds to return to the original sheet and reveal the cut polygon.',simpleTime:0,cut:0,reveal:1,guide:-1});
  };

  function v2RenderStateAt(time){
    const plan=solution.simpleV2,N=plan.ops.length;
    const t=Math.max(0,Math.min(N,time||0)),n=Math.floor(t+1e-9),frac=t-n;
    if(n>=N||frac<1e-7)return{pieces:plan.states[Math.min(n,N)].pieces.map(p=>({pts:p.map(q=>[q[0],q[1],0]),moving:false})),segments:plan.states[Math.min(n,N)].segments.map(s=>({a:[s.a[0],s.a[1],0],b:[s.b[0],s.b[1],0],moving:false})),op:null};
    const op=plan.ops[n],ang=op.movingSign*Math.PI*frac;
    const pieces=op.paperParts.map(part=>({pts:part.moving?part.before.map(p=>v2Reflect3(op.line,p,ang)):part.before.map(p=>[p[0],p[1],0]),moving:part.moving}));
    const segments=op.graphParts.map(part=>({a:part.moving?v2Reflect3(op.line,part.a,ang):[part.a[0],part.a[1],0],b:part.moving?v2Reflect3(op.line,part.b,ang):[part.b[0],part.b[1],0],moving:part.moving}));
    return{pieces,segments,op};
  }

  function v2FrameFor(renderState){
    const pts=renderState.pieces.flatMap(p=>p.pts),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
    if(!pts.length)return{center:solution.simpleV2.center,span:500};
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    return{center:[(minX+maxX)/2,(minY+maxY)/2],span:Math.max(maxX-minX,maxY-minY,1)*1.22};
  }
  function v2Project3(p,frame){
    const reveal=Math.max(0,Math.min(1,visual.reveal||0)),d=[p[0]-frame.center[0],p[1]-frame.center[1],p[2]];
    const yaw=-.30*(1-reveal),pitch=.67*(1-reveal),cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const x=cy*d[0]-sy*d[1],y=sy*d[0]+cy*d[1],z=d[2],yy=cp*y-sp*z,zz=sp*y+cp*z;
    const scale=Math.min(W,H)*.73/frame.span,cam=850,persp=cam/(cam-zz);
    return{x:W/2+x*scale*persp,y:H*.52-yy*scale*persp,depth:zz};
  }
  function v2DrawLine(line,frame,alpha=1){
    const a=v2Project3([line.p[0]-line.d[0]*1000,line.p[1]-line.d[1]*1000,2],frame),b=v2Project3([line.p[0]+line.d[0]*1000,line.p[1]+line.d[1]*1000,2],frame);
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='#9f3026';ctx.lineWidth=2;ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();
  }
  function v2DrawSimple(){
    const state=v2RenderStateAt(visual.simpleTime||0),frame=v2FrameFor(state),reveal=Math.max(0,Math.min(1,visual.reveal||0));
    const faces=state.pieces.map((p,i)=>{
      const pp=p.pts.map(q=>v2Project3(q,frame)),depth=p.pts.reduce((s,q)=>s+v2Project3(q,frame).depth,0)/Math.max(1,p.pts.length);
      return{...p,pp,depth,i};
    }).sort((a,b)=>a.depth-b.depth);
    for(const f of faces){
      ctx.save();ctx.beginPath();f.pp.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
      ctx.fillStyle=f.moving?'#f4ead7':'#fffdf7';ctx.globalAlpha=.985;ctx.fill();ctx.strokeStyle='rgba(83,72,56,.16)';ctx.lineWidth=1;ctx.stroke();ctx.restore();
    }
    for(const s of state.segments){
      const a=v2Project3(s.a,frame),b=v2Project3(s.b,frame);ctx.save();ctx.lineCap='round';
      if(reveal>.001){ctx.globalAlpha=reveal;ctx.strokeStyle='rgba(72,58,42,.24)';ctx.lineWidth=5.2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle='#fffdf7';ctx.lineWidth=2.5;ctx.stroke();}
      else{ctx.strokeStyle='#25231f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
      ctx.restore();
    }
    const step=steps[stepIndex]||{},guide=step.guide;
    if(Number.isInteger(guide)&&guide>=0&&solution.simpleV2.ops[guide])v2DrawLine(solution.simpleV2.ops[guide].line,frame,.72);
    if(visual.cut>.001){
      const line=solution.simpleV2.cutLine,d=line.d;
      let mn=Infinity,mx=-Infinity;
      for(const f of state.pieces)for(const p of f.pts){const t=v2Dot(v2Sub([p[0],p[1]],line.p),d);mn=Math.min(mn,t);mx=Math.max(mx,t);}
      const margin=28,aa=v2Add(line.p,v2Mul(d,mn-margin)),bb=v2Add(line.p,v2Mul(d,mx+margin)),a=v2Project3([aa[0],aa[1],3],frame),b=v2Project3([bb[0],bb[1],3],frame),t=Math.max(0,Math.min(1,visual.cut));
      const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
      ctx.save();ctx.strokeStyle='rgba(187,63,49,.25)';ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(x,y);ctx.stroke();ctx.strokeStyle='#8c261f';ctx.lineWidth=1.8;ctx.stroke();ctx.translate(x,y);ctx.rotate(Math.atan2(b.y-a.y,b.x-a.x));ctx.fillStyle='#25231f';ctx.beginPath();ctx.moveTo(2,0);ctx.lineTo(-18,-7);ctx.lineTo(-13,7);ctx.closePath();ctx.fill();ctx.restore();
    }
  }

  const v2Draw3DBefore=draw3D;
  draw3D=function(){
    if(solution?.simpleV2?.valid)return v2DrawSimple();
    return v2Draw3DBefore();
  };

  const v2GoStepBefore=goStep;
  goStep=function(i,instant=false){
    const plan=solution?.simpleV2;
    if(!plan?.valid)return v2GoStepBefore(i,instant);
    i=Math.max(0,Math.min(steps.length-1,i));stepIndex=i;const s=steps[i];updateStepUI();
    const end={simpleTime:s.simpleTime??visual.simpleTime??0,cut:s.cut||0,reveal:s.reveal||0,creases:0,foldStage:0,frameFocus:0};
    if(instant){Object.assign(visual,end);render();return;}
    const distance=Math.abs((end.simpleTime||0)-(visual.simpleTime||0));
    let duration=distance>1?Math.max(2200,distance*720):1450;
    if(s.reveal)duration=Math.max(3200,distance*760);
    animate({...visual},end,duration/speed);
  };

  const v2StartPlayBefore=startPlay;
  startPlay=async function(){
    const plan=solution?.simpleV2;
    if(!plan?.valid)return v2StartPlayBefore();
    if(stepIndex===steps.length-1)goStep(0,true);
    playing=true;ui.play.textContent='Ⅱ';
    while(playing&&stepIndex<steps.length-1){
      await sleep(900/speed);if(!playing)break;
      goStep(stepIndex+1);
      const s=steps[stepIndex],prev=steps[Math.max(0,stepIndex-1)],distance=Math.abs((s.simpleTime||0)-(prev.simpleTime||0));
      const wait=(s.reveal?Math.max(3400,distance*780):distance>0?1700:1150)/speed;
      await sleep(wait);
    }
    if(stepIndex===steps.length-1)stopPlay();
  };
