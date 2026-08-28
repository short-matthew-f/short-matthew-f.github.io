  // v13 staged compound choreography.
  // General fold-and-cut constructions may require a compound fold, but the
  // motion is easier to read if the hinge tree cascades from parent to child
  // instead of every hinge rotating at once.

  function compoundSchedule(sol){
    if(sol._compoundSchedule)return sol._compoundSchedule;
    const tree=sol.compoundTree,depth=new Array(sol.faces.length).fill(0);
    let maxDepth=0;
    for(const fi of tree.order){
      const p=tree.parent[fi];
      if(fi===sol.root||p===fi){depth[fi]=0;continue;}
      depth[fi]=(depth[p]||0)+1;maxDepth=Math.max(maxDepth,depth[fi]);
    }
    sol._compoundSchedule={depth,maxDepth:Math.max(1,maxDepth)};
    return sol._compoundSchedule;
  }

  rawCompoundTransforms = function(sol,t){
    const Ts=sol.faces.map(()=>TI()),tree=sol.compoundTree,sched=compoundSchedule(sol);
    Ts[sol.root]=TI();
    for(const fi of tree.order){
      const p=tree.parent[fi];
      if(fi===sol.root||p===fi)continue;
      const ei=tree.parentEdge[fi];
      if(ei<0){Ts[fi]=Ts[p]||TI();continue;}
      const d=sched.depth[fi]||1;
      const ratio=sched.maxDepth<=1?0:(d-1)/(sched.maxDepth-1);
      const start=.05+.53*ratio;
      const duration=.30;
      let lt=Math.max(0,Math.min(1,(t-start)/duration));
      lt=lt*lt*(3-2*lt);
      const e=sol.edges[ei],pt=Ts[p]||TI();
      const a=TA(pt,[sol.vertices[e.a].x,sol.vertices[e.a].y,0]);
      const b=TA(pt,[sol.vertices[e.b].x,sol.vertices[e.b].y,0]);
      const angle=(e.assignment==='m'?-1:1)*Math.PI*lt;
      Ts[fi]=TC(rotLine(a,b,angle),pt);
    }
    return Ts;
  };

  computeCompoundTransforms = function(sol,t){
    t=Math.max(0,Math.min(1,t));
    const raw=rawCompoundTransforms(sol,t);
    const settle=t<=.90?0:(t-.90)/.10;
    const s=settle*settle*(3-2*settle);
    return raw.map((T,i)=>interpTransform(T,sol.targetTransforms[i],s));
  };

  const buildStepsBeforeStaging=buildSteps;
  buildSteps=function(){
    buildStepsBeforeStaging();
    if(solution?.mode==='compound'){
      const s=steps.find(x=>x.title==='Compound fold');
      if(s){
        s.title='Staged compound fold';
        s.text='The connected folds cascade from the outer packet inward, then settle together onto the solver’s exact flat state.';
      }
      solution.badge='solver compound fold · staged';
    }
  };

  const goStepBeforeStaging=goStep;
  goStep=function(i,instant=false){
    if(instant)return goStepBeforeStaging(i,true);
    i=Math.max(0,Math.min(steps.length-1,i));
    stepIndex=i;
    const s=steps[i];
    updateStepUI();
    const focus=i===0?1:(s.reveal?0.85:0);
    const end={foldStage:s.foldStage,creases:s.creases,cut:s.cut,reveal:s.reveal,frameFocus:focus};
    const foldMotion=solution?.mode==='compound'&&Math.abs((end.foldStage||0)-(visual.foldStage||0))>.001;
    const duration=solution?.mode==='compound'?(foldMotion?3100:1500):1050;
    animate({...visual},end,duration/speed);
  };

  startPlay=async function(){
    if(stepIndex===steps.length-1)goStep(0,true);
    playing=true;ui.play.textContent='Ⅱ';
    while(playing&&stepIndex<steps.length-1){
      await sleep(1150/speed);if(!playing)break;
      goStep(stepIndex+1);
      const current=steps[stepIndex];
      const wait=(solution?.mode==='compound'&&current?.title==='Staged compound fold'?3350:1250)/speed;
      await sleep(wait);
    }
    if(stepIndex===steps.length-1)stopPlay();
  };
