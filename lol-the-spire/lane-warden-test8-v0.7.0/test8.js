(() => {
  'use strict';

  const BUILD='T8-0.7.0';
  const DECLARATION='LW-T8-001';
  const LANES=['north','mid','south'];
  const TASKS=[
    ['pan','Pan the battlefield horizontally'],
    ['rally','Tap RALLY'],
    ['waypoint','Tap WAYPOINT'],
    ['cancelWaypoint','Cancel Waypoint targeting'],
    ['laneJump','Tap MID in the lane strip'],
    ['structureOpen','Tap the selected-structure control'],
    ['structureClose','Close the structure panel'],
    ['recenter','Recenter on the Commander']
  ];
  const THRESHOLDS=Object.freeze({
    requiredTasks:TASKS.length,
    minTapTarget:44,
    maxPersistentOcclusionFraction:0.28,
    maxTransientOcclusionFraction:0.42,
    maxAccidentalInputs:1,
    requireLandscape:true
  });

  const state={
    installed:false,armed:false,startedAt:null,completedAt:null,device:null,
    completed:new Set(),events:[],accidentalInputs:[],layoutSamples:[],survey:{coexist:null,oneThumb:null,battleReadable:null,hardToHit:null,note:''},
    pointerDown:null,panStarted:false,originalStart:null,timer:null
  };
  const $=id=>document.getElementById(id);
  const visible=el=>!!el&&!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
  const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return{x:+r.x.toFixed(1),y:+r.y.toFixed(1),width:+r.width.toFixed(1),height:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)};};
  const event=(type,detail={})=>state.events.push({at:new Date().toISOString(),type,...detail});

  function captureDevice(){return{userAgent:navigator.userAgent,standalone:!!navigator.standalone||matchMedia('(display-mode: standalone)').matches,language:navigator.language,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1,orientation:innerWidth>=innerHeight?'landscape':'portrait'}};}

  function addStyle(){
    const s=document.createElement('style');
    s.id='t8-style';
    s.textContent=`
      .topbar{display:none!important}
      #t8Hud{position:fixed;inset:0;z-index:880;pointer-events:none;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#edf3f2}
      .t8-control{pointer-events:auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      #t8Top{position:absolute;top:calc(env(safe-area-inset-top,0px) + 6px);left:calc(env(safe-area-inset-left,0px) + 8px);right:calc(env(safe-area-inset-right,0px) + 8px);height:44px;display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:13px;background:rgba(11,18,23,.88);border:1px solid rgba(137,174,184,.28);box-shadow:0 4px 18px rgba(0,0,0,.28)}
      #t8Top .brandmark{font-size:8px;font-weight:900;letter-spacing:.08em;color:#9eb4b5;white-space:nowrap}#t8Top .spacer{flex:1}#t8Top .goldchip,#t8Top .wpchip{height:34px;display:flex;align-items:center;padding:0 9px;border-radius:10px;background:rgba(255,255,255,.06);font-size:10px;font-weight:900;white-space:nowrap}#t8Top .goldchip{color:#e2bd62}#t8Top .wpchip.ready{color:#78d1bd}#t8Top button{width:44px;height:44px;min-width:44px;padding:0;border-radius:12px;font-size:18px}
      #t8Abilities{position:absolute;right:calc(env(safe-area-inset-right,0px) + 8px);top:calc(env(safe-area-inset-top,0px) + 60px);display:grid;gap:6px}.t8-ability{width:50px;height:50px;min-width:50px;min-height:50px;border-radius:14px;padding:3px;display:grid;place-items:center;background:rgba(11,18,23,.9);border:1px solid rgba(137,174,184,.32);box-shadow:0 4px 14px rgba(0,0,0,.28);font-size:8px;font-weight:900;letter-spacing:.04em}.t8-ability b{display:block;font-size:15px;line-height:1}.t8-ability.wp{border-color:rgba(120,209,189,.6);color:#8edac8}
      #t8StructureSelect{position:absolute;left:calc(env(safe-area-inset-left,0px) + 8px);bottom:calc(env(safe-area-inset-bottom,0px) + 68px);width:48px;height:48px;min-width:48px;min-height:48px;border-radius:13px;padding:0;background:rgba(11,18,23,.9);border:1px solid rgba(120,209,189,.48);box-shadow:0 4px 14px rgba(0,0,0,.28);font-size:21px;color:#8edac8}
      #t8Guide{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 58px);width:min(390px,calc(100vw - 180px));min-height:42px;padding:6px 10px;border-radius:12px;background:rgba(11,18,23,.88);border:1px solid rgba(214,179,91,.38);box-shadow:0 4px 16px rgba(0,0,0,.25);text-align:center;pointer-events:none}#t8Guide small{display:block;font-size:7px;letter-spacing:.12em;color:#d6b35b;font-weight:900}#t8Guide b{font-size:11px;line-height:1.1}
      #t8WaypointTargets{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 68px);display:flex;gap:5px;padding:5px;border-radius:13px;background:rgba(11,18,23,.96);border:1px solid rgba(120,209,189,.5);box-shadow:0 5px 18px rgba(0,0,0,.35)}#t8WaypointTargets[hidden]{display:none!important}#t8WaypointTargets button{min-width:52px;height:44px;min-height:44px;padding:0 8px;border-radius:10px;font-size:8px;font-weight:900}#t8WaypointTargets .cancel{color:#ef9a91}
      #t8StructurePanel{position:absolute;left:calc(env(safe-area-inset-left,0px) + 62px);bottom:calc(env(safe-area-inset-bottom,0px) + 68px);width:230px;padding:8px;border-radius:14px;background:rgba(11,18,23,.97);border:1px solid rgba(120,209,189,.5);box-shadow:0 6px 22px rgba(0,0,0,.4)}#t8StructurePanel[hidden]{display:none!important}#t8StructurePanel .head{display:flex;align-items:center;gap:6px;margin-bottom:6px}#t8StructurePanel .head div{flex:1}#t8StructurePanel .head small{display:block;font-size:7px;color:#8fa7a5;letter-spacing:.1em}#t8StructurePanel .head b{font-size:11px}#t8StructurePanel .close{width:44px;height:44px;min-width:44px;padding:0;border-radius:10px}#t8StructurePanel .row{display:grid;grid-template-columns:1fr 1fr;gap:5px}#t8StructurePanel .row button{min-height:44px;border-radius:10px;font-size:8px;font-weight:900}#t8StructurePanel .status{font-size:8px;color:#a9bbb8;margin:3px 0 6px}
      #t8Finish{position:fixed;z-index:1100;inset:0;display:grid;place-items:center;background:rgba(5,9,12,.7);padding:18px;pointer-events:auto}#t8Finish[hidden]{display:none!important}#t8Finish .card{width:min(520px,100%);max-height:calc(100vh - 36px);overflow:auto;padding:16px;border-radius:18px;background:#111b22;border:1px solid #38505c;box-shadow:0 12px 38px rgba(0,0,0,.5)}#t8Finish h2{margin:3px 0 8px;font-size:20px}#t8Finish p{font-size:10px;color:#aebfbd}#t8Finish .survey{display:grid;gap:8px;margin:10px 0}#t8Finish .survey-row{display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:center}#t8Finish .survey-row span{font-size:10px}#t8Finish button{min-height:44px;border-radius:10px}#t8Finish button.selected{outline:2px solid #78d1bd}#t8Finish textarea{width:100%;min-height:54px;background:#0c1419;color:#edf3f2;border:1px solid #314550;border-radius:10px;padding:8px}#t8Finish .export{width:100%;margin-top:8px;font-weight:900;background:#2d685d}
      .lane{min-height:44px!important}
      @media(max-height:360px){#t8Guide{top:calc(env(safe-area-inset-top,0px) + 52px);min-height:36px;padding:4px 8px}#t8Abilities{top:calc(env(safe-area-inset-top,0px) + 54px);gap:4px}.t8-ability{width:46px;height:46px;min-width:46px;min-height:46px}#t8StructureSelect{bottom:calc(env(safe-area-inset-bottom,0px) + 62px)}#t8WaypointTargets,#t8StructurePanel{bottom:calc(env(safe-area-inset-bottom,0px) + 62px)}}
    `;
    document.head.appendChild(s);
  }

  function addUI(){
    const root=document.createElement('section');root.id='t8Hud';root.hidden=true;
    root.innerHTML=`
      <div id="t8Top" data-t8-persistent><span class="brandmark">LANE WARDEN</span><span class="spacer"></span><span id="t8Gold" class="goldchip">60g</span><span id="t8WpState" class="wpchip ready">WP READY</span><button id="t8Recenter" class="t8-control" type="button" aria-label="Recenter on Commander">◎</button></div>
      <div id="t8Guide"><small>TEST 8 · HUD TASK</small><b id="t8TaskText">Ready</b></div>
      <div id="t8Abilities" data-t8-persistent><button id="t8Rally" class="t8-control t8-ability" type="button"><b>✦</b>RALLY</button><button id="t8Push" class="t8-control t8-ability" type="button"><b>⇧</b>PUSH</button><button id="t8Waypoint" class="t8-control t8-ability wp" type="button"><b>↯</b>WAYPT</button></div>
      <button id="t8StructureSelect" class="t8-control" data-t8-persistent type="button" aria-label="Selected structure controls">▣</button>
      <div id="t8WaypointTargets" data-t8-transient hidden><button class="t8-control" data-wp="north">NORTH</button><button class="t8-control" data-wp="mid">MID</button><button class="t8-control" data-wp="south">SOUTH</button><button id="t8WaypointCancel" class="t8-control cancel" type="button">CANCEL</button></div>
      <div id="t8StructurePanel" data-t8-transient hidden><div class="head"><div><small>SELECTED · MID</small><b>FROST COIL</b></div><button id="t8StructureClose" class="t8-control close" type="button" aria-label="Close structure panel">×</button></div><div class="status">HEALTHY · control tower · exact values on demand</div><div class="row"><button class="t8-control" type="button">REPAIR · 25g</button><button class="t8-control" type="button">UPGRADE · 40g</button></div></div>`;
    document.body.appendChild(root);

    const finish=document.createElement('section');finish.id='t8Finish';finish.hidden=true;
    finish.innerHTML=`<div class="card"><small>LW-T8-001 · POST-TEST</small><h2>Did the HUD coexist with the battle?</h2><p id="t8Summary">All guided tasks complete.</p><div class="survey">
      <div class="survey-row" data-survey="coexist"><span>Could you use the controls without the HUD getting in the way?</span><button type="button" data-value="yes">YES</button><button type="button" data-value="no">NO</button></div>
      <div class="survey-row" data-survey="oneThumb"><span>Could the ordinary control loop be operated with one thumb?</span><button type="button" data-value="yes">YES</button><button type="button" data-value="no">NO</button></div>
      <div class="survey-row" data-survey="battleReadable"><span>Did enough battlefield remain visible to read combat motion?</span><button type="button" data-value="yes">YES</button><button type="button" data-value="no">NO</button></div>
      <div class="survey-row" data-survey="hardToHit"><span>Was any required control hard to hit reliably?</span><button type="button" data-value="yes">YES</button><button type="button" data-value="no">NO</button></div>
      </div><textarea id="t8Note" placeholder="Optional: what felt cramped, awkward, or especially good?"></textarea><button id="t8Export" class="export" type="button">EXPORT TEST 8 EVIDENCE</button></div>`;
    document.body.appendChild(finish);

    $('t8Rally').onclick=()=>{completeTask('rally');$('rallyButton')?.click();event('hud-action',{action:'rally'});};
    $('t8Push').onclick=()=>{event('hud-action',{action:'push'});$('pushButton')?.click();};
    $('t8Waypoint').onclick=()=>{completeTask('waypoint');$('t8WaypointTargets').hidden=false;event('waypoint-targeting-open');captureAndStore('waypoint-open');};
    $('t8WaypointCancel').onclick=()=>{$('t8WaypointTargets').hidden=true;completeTask('cancelWaypoint');event('waypoint-targeting-cancel');captureAndStore('waypoint-cancel');};
    root.querySelectorAll('[data-wp]').forEach(b=>b.onclick=()=>{$('t8WaypointTargets').hidden=true;event('waypoint-target-preview',{lane:b.dataset.wp});});
    $('t8StructureSelect').onclick=()=>{$('t8StructurePanel').hidden=false;completeTask('structureOpen');event('structure-panel-open');setTimeout(()=>captureAndStore('structure-open'),30);};
    $('t8StructureClose').onclick=()=>{$('t8StructurePanel').hidden=true;completeTask('structureClose');event('structure-panel-close');captureAndStore('structure-close');};
    $('t8Recenter').onclick=()=>{completeTask('recenter');$('recenterButton')?.click();event('hud-action',{action:'recenter'});};
    document.querySelector('.lane[data-lane="mid"]')?.addEventListener('click',()=>completeTask('laneJump'),true);
    document.querySelectorAll('#t8Finish [data-survey]').forEach(row=>row.querySelectorAll('button').forEach(b=>b.onclick=()=>{row.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');state.survey[row.dataset.survey]=b.dataset.value;}));
    $('t8Export').onclick=exportEvidence;
  }

  function taskIndex(){return TASKS.findIndex(([id])=>!state.completed.has(id));}
  function updateGuide(){
    const i=taskIndex();
    if(i<0){$('t8TaskText').textContent='Tasks complete · answer the short debrief';return;}
    $('t8TaskText').textContent=`${i+1}/${TASKS.length} · ${TASKS[i][1]}`;
  }
  function completeTask(id){
    if(!state.armed||state.completed.has(id))return;
    state.completed.add(id);event('task-complete',{task:id,count:state.completed.size});updateGuide();
    if(state.completed.size===TASKS.length)finishTasks();
  }

  function installPanObservers(){
    const canvas=$('battlefield');if(!canvas)return;
    addEventListener('pointerdown',e=>{state.pointerDown={target:e.target,x:e.clientX,y:e.clientY,id:e.pointerId};state.panStarted=false;},true);
    addEventListener('pointermove',e=>{const p=state.pointerDown;if(!p||p.id!==e.pointerId||p.target!==canvas)return;const d=Math.hypot(e.clientX-p.x,e.clientY-p.y);if(d>28){state.panStarted=true;completeTask('pan');}},true);
    addEventListener('pointerup',e=>{const p=state.pointerDown;if(!p||p.id!==e.pointerId)return;const up=e.target;if(p.target===canvas&&up?.classList?.contains('t8-control')){state.accidentalInputs.push({at:new Date().toISOString(),kind:'canvas-drag-ended-on-control',control:up.id||up.textContent?.trim()||'unknown'});event('accidental-input-risk',{control:up.id||null});}state.pointerDown=null;state.panStarted=false;},true);
    addEventListener('pointercancel',()=>{state.pointerDown=null;state.panStarted=false;},true);
  }

  function sumArea(rects){return rects.reduce((n,r)=>n+(r?Math.max(0,r.width)*Math.max(0,r.height):0),0);}
  function captureLayout(label){
    const persistent=[...document.querySelectorAll('[data-t8-persistent]')].filter(visible).map(rect).concat(visible($('laneStrip'))?[rect($('laneStrip'))]:[]);
    const transient=[...document.querySelectorAll('[data-t8-transient]')].filter(visible).map(rect);
    const targets=[...document.querySelectorAll('.t8-control,.lane')].filter(visible).map(el=>({id:el.id||el.dataset.lane||el.textContent.trim(),rect:rect(el)}));
    const v={width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1,orientation:innerWidth>=innerHeight?'landscape':'portrait'};
    const viewportArea=Math.max(1,v.width*v.height);
    const allRects=[...persistent,...transient];
    const inBounds=allRects.every(r=>r&&r.x>=-1&&r.y>=-1&&r.right<=v.width+1&&r.bottom<=v.height+1);
    const minW=targets.length?Math.min(...targets.map(t=>t.rect.width)):0,minH=targets.length?Math.min(...targets.map(t=>t.rect.height)):0;
    return{label,viewport:v,persistentRects:persistent,transientRects:transient,persistentOcclusionFraction:+(sumArea(persistent)/viewportArea).toFixed(3),totalOcclusionFraction:+(sumArea(allRects)/viewportArea).toFixed(3),minTargetWidth:+minW.toFixed(1),minTargetHeight:+minH.toFixed(1),inBounds};
  }
  function captureAndStore(label){const x=captureLayout(label);state.layoutSamples.push(x);return x;}

  function finishTasks(){
    if(state.completedAt)return;
    state.completedAt=new Date().toISOString();captureAndStore('tasks-complete');$('t8Finish').hidden=false;event('tasks-complete');
  }

  function score(){
    const samples=state.layoutSamples.length?state.layoutSamples:[captureLayout('fallback')];
    const persistentMax=Math.max(...samples.map(x=>x.persistentOcclusionFraction));
    const totalMax=Math.max(...samples.map(x=>x.totalOcclusionFraction));
    const minW=Math.min(...samples.map(x=>x.minTargetWidth)),minH=Math.min(...samples.map(x=>x.minTargetHeight));
    const allBounds=samples.every(x=>x.inBounds),landscape=samples.filter(x=>x.label!=='arm').every(x=>x.viewport.orientation==='landscape');
    const checks={
      tasks:state.completed.size===THRESHOLDS.requiredTasks,
      touchTargets:minW>=THRESHOLDS.minTapTarget&&minH>=THRESHOLDS.minTapTarget,
      safeAreaBounds:allBounds,
      persistentOcclusion:persistentMax<=THRESHOLDS.maxPersistentOcclusionFraction,
      transientOcclusion:totalMax<=THRESHOLDS.maxTransientOcclusionFraction,
      accidentalInput:state.accidentalInputs.length<=THRESHOLDS.maxAccidentalInputs,
      landscape:!THRESHOLDS.requireLandscape||landscape,
      humanCoexistence:state.survey.coexist==='yes',
      oneThumb:state.survey.oneThumb==='yes',
      battlefieldReadable:state.survey.battleReadable==='yes',
      hitReliability:state.survey.hardToHit==='no'
    };
    return{verdict:Object.values(checks).every(Boolean)?'PASS':'FAIL',checks,metrics:{tasksCompleted:state.completed.size,accidentalInputs:state.accidentalInputs.length,persistentOcclusionMax:persistentMax,totalOcclusionMax:totalMax,minTargetWidth:minW,minTargetHeight:minH,survey:state.survey},layoutSamples:samples};
  }

  function exportEvidence(){
    state.survey.note=$('t8Note').value.trim();const s=score();$('t8Summary').textContent=`${state.completed.size}/${TASKS.length} tasks · ${state.accidentalInputs.length} accidental-input risks · ${s.verdict}`;
    const doc={schema:1,declarationId:DECLARATION,build:BUILD,designBaseline:'1.7',test:'Test 8 — Phone HUD',question:'Can production controls coexist with the moving battlefield?',frozenGameplayBase:'M1-0.4.3 / R02-D over R02-C parameters',fixture:'R-02-STRUCTURAL',parameterRevision:'R02-C',device:state.device,thresholds:THRESHOLDS,requiredControls:['gold','abilities','Waypoint','lane strip','selected-structure controls','safe-area behavior'],tasks:TASKS.map(([id,label])=>({id,label,completed:state.completed.has(id)})),startedAt:state.startedAt,completedAt:state.completedAt,events:state.events,accidentalInputs:state.accidentalInputs,survey:state.survey,finalScore:s,exportedAt:new Date().toISOString(),note:'Test 8 evaluates production-HUD footprint and interaction coexistence over the frozen moving R02-D battlefield; it does not retune gameplay.'};
    const blob=new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`lane-warden-${DECLARATION}-${BUILD}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function refreshMirrors(){
    if(!state.armed)return;$('t8Gold').textContent=$('gold')?.textContent?.trim()||'—g';const w=($('waypointStatus')?.textContent||'').toLowerCase();const ready=!w||w.includes('ready');$('t8WpState').textContent=ready?'WP READY':'WP '+($('waypointStatus')?.textContent||'');$('t8WpState').classList.toggle('ready',ready);
  }

  function lockConfig(){
    const middle=document.querySelector('[data-deploy-preset="middleTemptation"]');if(middle&&!middle.classList.contains('active'))middle.click();document.querySelectorAll('[data-deploy-preset]').forEach(b=>{b.disabled=true;b.title='LW-T8-001 freezes Middle temptation';});const speed=$('simSpeed');if(speed){speed.value='1';speed.disabled=true;}
  }

  function arm(){
    state.armed=true;state.startedAt=new Date().toISOString();state.completed.clear();state.events=[];state.accidentalInputs=[];state.layoutSamples=[];state.completedAt=null;state.device=captureDevice();$('t8Hud').hidden=false;$('t8Finish').hidden=true;updateGuide();event('test-start',{device:state.device});setTimeout(()=>captureAndStore('arm'),250);
  }

  function updateShell(){
    document.title='Lane Warden — Test 8 Phone HUD v0.7.0';const fixture=$('fixture');if(fixture)fixture.textContent='T8-0.7.0';const note=$('deployNote');if(note)note.textContent='LW-T8-001 · Middle temptation · 1× · guided production-HUD coexistence tasks.';
  }

  function install(){
    if(state.installed)return;const laneReady=LANES.every(l=>typeof document.querySelector(`.lane[data-lane="${l}"]`)?.onclick==='function');if(!laneReady||typeof $('startBattle')?.onclick!=='function'){setTimeout(install,100);return;}
    state.installed=true;addStyle();addUI();updateShell();lockConfig();installPanObservers();
    state.originalStart=$('startBattle').onclick;$('startBattle').onclick=function(ev){const r=state.originalStart.call(this,ev);setTimeout(()=>{if($('deployment').hidden)arm();},180);return r;};
    addEventListener('resize',()=>{if(state.armed&&!state.completedAt)setTimeout(()=>captureAndStore('resize'),50);});
    state.timer=setInterval(refreshMirrors,220);if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  install();
})();
