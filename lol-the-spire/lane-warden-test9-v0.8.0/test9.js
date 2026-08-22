(() => {
  'use strict';

  const BUILD='T9-0.8.0';
  const DECLARATION='LW-T9-001';
  const WARMUP_MS=2000;
  const MEASURE_MS=8000;
  const PHASES=[
    {id:'reference',name:'Reference target',local:42,total:168,projectiles:0,particles:0,structures:0,zoom:1,gate:'reference'},
    {id:'visible',name:'Visible actor stress',local:90,total:168,projectiles:0,particles:0,structures:0,zoom:1,gate:'isolated'},
    {id:'offscreen',name:'Offscreen actor stress',local:42,total:270,projectiles:0,particles:0,structures:0,zoom:1,gate:'isolated'},
    {id:'projectiles',name:'Projectile stress',local:42,total:168,projectiles:160,particles:0,structures:0,zoom:1,gate:'isolated'},
    {id:'particles',name:'Particle stress',local:42,total:168,projectiles:0,particles:320,structures:0,zoom:1,gate:'isolated'},
    {id:'structures',name:'Structure stress',local:42,total:168,projectiles:0,particles:0,structures:48,zoom:1,gate:'isolated'},
    {id:'zoom',name:'Wide zoom stress',local:42,total:168,projectiles:0,particles:0,structures:0,zoom:.72,gate:'isolated'},
    {id:'compound',name:'Compound stress',local:90,total:270,projectiles:160,particles:320,structures:48,zoom:.72,gate:'compound'}
  ];
  const THRESHOLDS={
    phases:8,
    reference:{meanFpsMin:55,p95MsMax:33.4,maxFrameMsMax:150},
    isolated:{meanFpsMin:45,p95MsMax:33.4,maxFrameMsMax:200},
    compound:{meanFpsMin:30,p95MsMax:50,maxFrameMsMax:250},
    maxContextLosses:0,
    requireStandalone:true,
    requireLandscape:true
  };
  const state={startedAt:null,completedAt:null,device:null,results:[],running:false,contextLossStart:0,lifecycleStart:0};
  const $=id=>document.getElementById(id);
  const delay=ms=>new Promise(r=>setTimeout(r,ms));
  const seeded=i=>{const x=Math.sin(i*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
  const round=(n,d=2)=>+n.toFixed(d);
  function percentile(xs,p){if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y);const idx=Math.min(a.length-1,Math.max(0,Math.ceil(p*a.length)-1));return a[idx];}
  function median(xs){if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
  function device(){return{userAgent:navigator.userAgent,standalone:!!navigator.standalone||matchMedia('(display-mode: standalone)').matches,language:navigator.language,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1,orientation:innerWidth>=innerHeight?'landscape':'portrait'}};}

  function actor(i,local,laneY){
    const lane=i%3,team=i%2===0?1:-1,role=i%9===0?'siege':i%4===0?'ranged':'melee';
    const sx=role==='siege'?2.2:role==='ranged'?1.35:1.5,sy=sx,sz=role==='siege'?2.1:role==='ranged'?2:1.7;
    let x;
    if(local){
      const band=(i%14)/13;
      x=-27+54*band+(seeded(i+30)-.5)*2.4;
    }else{
      const side=i%2===0?-1:1;
      x=side*(42+seeded(i+71)*39);
    }
    return{x,y:laneY[lane]+(seeded(i+9)-.5)*5,z:sz/2,team,lane,role,sx,sy,sz,speed:0,phase:seeded(i+101)*6.28,hp:1};
  }

  function applyPhase(p){
    const b=window.__LW_T9_BASE__,w=b.world,c=b.camera;
    w.projectilesOn=false;w.projectiles=[];w.t9Particles=[];w.t9Structures=[];w.actors=[];w.paused=false;
    c.x=0;c.y=0;c.zoom=p.zoom;c.tilt=.39;
    for(let i=0;i<p.local;i++)w.actors.push(actor(i,true,w.lanes));
    for(let i=p.local;i<p.total;i++)w.actors.push(actor(i,false,w.lanes));
    for(let i=0;i<p.projectiles;i++){
      const lane=i%3;w.projectiles.push({x:-32+seeded(i+210)*64,y:w.lanes[lane]+(seeded(i+220)-.5)*7,vx:0,life:9999});
    }
    for(let i=0;i<p.particles;i++){
      const lane=i%3;w.t9Particles.push({x:-34+seeded(i+310)*68,y:w.lanes[lane]+(seeded(i+320)-.5)*9,z:.6+seeded(i+330)*3.2,phase:seeded(i+340)*6.28,color:i%2?[.92,.72,.32]:[.62,.86,.78]});
    }
    for(let i=0;i<p.structures;i++){
      const lane=i%3,side=i%2===0?-1:1;w.t9Structures.push({x:-36+(i%16)*4.8,y:w.lanes[lane]+side*(5.8+(i%3)*.7),z:1.1,sx:2.1,sy:2.1,sz:2.2,color:i%2?[.36,.44,.46]:[.32,.54,.50]});
    }
    w.commander.x=-18;w.commander.y=0;w.commander.dest=null;w.rival.x=24;w.rival.y=20;
  }

  function phaseThreshold(p){return THRESHOLDS[p.gate];}
  function phasePass(p,r){const t=phaseThreshold(p);return r.meanFps>=t.meanFpsMin&&r.p95FrameMs<=t.p95MsMax&&r.maxFrameMs<=t.maxFrameMsMax;}

  async function measurePhase(p,index){
    applyPhase(p);
    $('t9Phase').textContent=`${index+1}/${PHASES.length}`;$('t9Title').textContent=p.name;$('t9Load').textContent=`${p.local}/${p.total}`;$('t9Fx').textContent=`P${p.projectiles} · F${p.particles}`;$('t9Timer').textContent='WARM';$('t9Live').textContent=`Warm-up · ${p.structures} extra structures · zoom ${p.zoom.toFixed(2)}`;$('t9Progress').style.width='0%';
    const warmStart=performance.now();
    while(performance.now()-warmStart<WARMUP_MS){$('t9Progress').style.width=`${Math.min(20,((performance.now()-warmStart)/WARMUP_MS)*20)}%`;await delay(100);}
    $('t9Timer').textContent='MEASURE';

    return new Promise(resolve=>{
      const frames=[],visible=[],totals=[];let start=null,last=null,lastDiag=0;
      function tick(now){
        if(start===null){start=now;last=now;}
        else{const dt=now-last;frames.push(dt);last=now;}
        const elapsed=now-start;
        if(now-lastDiag>250){const d=window.__LW_DIAGNOSTICS__;if(d){visible.push(d.visibleActors);totals.push(d.totalActors);}lastDiag=now;}
        $('t9Progress').style.width=`${20+Math.min(80,(elapsed/MEASURE_MS)*80)}%`;$('t9Timer').textContent=`${Math.max(0,(MEASURE_MS-elapsed)/1000).toFixed(1)}s`;
        if(elapsed<MEASURE_MS){requestAnimationFrame(tick);return;}
        const sum=frames.reduce((a,b)=>a+b,0),mean=sum/Math.max(1,frames.length),result={
          id:p.id,name:p.name,gate:p.gate,configuration:{localActorTarget:p.local,totalActors:p.total,projectiles:p.projectiles,particles:p.particles,extraStructures:p.structures,zoom:p.zoom},
          measuredMs:round(elapsed,1),frames:frames.length,meanFrameMs:round(mean,3),medianFrameMs:round(median(frames)||0,3),p95FrameMs:round(percentile(frames,.95)||0,3),maxFrameMs:round(Math.max(0,...frames),3),meanFps:round(1000/Math.max(.001,mean),2),visibleActors:{median:round(median(visible)||0,1),min:visible.length?Math.min(...visible):0,max:visible.length?Math.max(...visible):0},totalActors:{median:round(median(totals)||0,1)},pass:false};
        result.pass=phasePass(p,result);resolve(result);
      }
      requestAnimationFrame(tick);
    });
  }

  function sessionScore(){
    const e=window.__LW_EVIDENCE__||{},losses=Math.max(0,(e.counters?.contextLosses||0)-state.contextLossStart),lifecycle=(e.lifecycle||[]).slice(state.lifecycleStart);const hidden=lifecycle.filter(x=>x.type==='visibilitychange'&&x.state==='hidden').length;
    const checks={phaseCoverage:state.results.length===THRESHOLDS.phases,allPhaseGates:state.results.length===THRESHOLDS.phases&&state.results.every(r=>r.pass),contextLosses:losses<=THRESHOLDS.maxContextLosses,standalone:!THRESHOLDS.requireStandalone||state.device?.standalone===true,landscape:!THRESHOLDS.requireLandscape||state.device?.viewport?.orientation==='landscape',noBackgroundDuringMatrix:hidden===0};
    return{verdict:Object.values(checks).every(Boolean)?'PASS':'FAIL',checks,metrics:{contextLosses:losses,hiddenTransitions:hidden,phasePasses:state.results.filter(r=>r.pass).length,totalPhases:state.results.length},lifecycleDuringMatrix:lifecycle};
  }

  function showFinish(){
    const s=sessionScore();$('t9Finish').hidden=false;$('t9Verdict').textContent=`TEST 9 · ${s.verdict}`;$('t9Verdict').className=s.verdict==='PASS'?'pass':'fail';$('t9Summary').textContent=`${s.metrics.phasePasses}/${s.metrics.totalPhases} phase gates passed · ${s.metrics.contextLosses} WebGL context losses.`;
    $('t9Rows').innerHTML=state.results.map(r=>`<tr><td>${r.name}</td><td>${r.meanFps.toFixed(1)}</td><td>${r.p95FrameMs.toFixed(1)}</td><td>${r.maxFrameMs.toFixed(1)}</td><td class="${r.pass?'pass':'fail'}">${r.pass?'PASS':'FAIL'}</td></tr>`).join('');
  }

  async function run(){
    if(state.running)return;state.running=true;state.startedAt=new Date().toISOString();state.device=device();state.results=[];const e=window.__LW_EVIDENCE__||{};state.contextLossStart=e.counters?.contextLosses||0;state.lifecycleStart=(e.lifecycle||[]).length;$('t9Start').disabled=true;$('t9Start').textContent='RUNNING';
    for(let i=0;i<PHASES.length;i++){const r=await measurePhase(PHASES[i],i);state.results.push(r);$('t9Live').textContent=`${r.pass?'PASS':'FAIL'} · ${r.meanFps.toFixed(1)} fps · p95 ${r.p95FrameMs.toFixed(1)} ms`;await delay(350);}
    state.completedAt=new Date().toISOString();state.running=false;$('t9Progress').style.width='100%';showFinish();
  }

  function exportEvidence(){
    const s=sessionScore();const doc={schema:1,declarationId:DECLARATION,build:BUILD,designBaseline:'1.7',test:'Test 9 — Distributed Stress & Performance',question:'What does the target phone sustain when the battlefield is large and active?',device:state.device,thresholds:THRESHOLDS,phasePlan:PHASES,startedAt:state.startedAt,completedAt:state.completedAt,results:state.results,finalScore:s,sourceHarness:'M0 WebGL channel-spike renderer adapted with preregistered distributed stress dimensions',exportedAt:new Date().toISOString(),note:'Counts are stress-harness proxies, not shipping wave sizes or production content limits. Readability is not inferred from performance.'};
    const blob=new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`lane-warden-${DECLARATION}-${BUILD}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  }

  function install(){
    if(!window.__LW_READY__||!window.__LW_T9_BASE__){setTimeout(install,80);return;}
    window.__LW_T9_BASE__.world.projectilesOn=false;document.getElementById('projectileToggle').checked=false;$('t9Start').onclick=run;$('t9Export').onclick=exportEvidence;
  }
  install();
})();
