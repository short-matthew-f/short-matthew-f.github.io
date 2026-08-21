(() => {
  'use strict';

  const BUILD = 'M0-0.1.2';
  const CORE_BUILD = 'M0-0.1.1';
  const EVIDENCE_KEY = `lane-warden-${BUILD}-active-evidence`;
  const canvas = document.getElementById('battlefield');
  const navigationType = performance.getEntriesByType?.('navigation')?.[0]?.type || 'unknown';
  const bootId = globalThis.crypto?.randomUUID?.() || `boot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso = () => new Date().toISOString();
  let runStartPerf = performance.now();
  let lastFrame = performance.now();
  let lastBucket = lastFrame;
  let bucketFrames = 0;
  let bucketSum = 0;
  let bucketMax = 0;
  let lastTelemetry = 0;
  let lastVisibility = document.visibilityState;
  let lastOrientation = orientationName();
  const gesturePointers = new Map();
  let gestureState = null;
  const DRAG_THRESHOLD = 9;

  function inputValue(id, fallback='') {
    const el = document.getElementById(id);
    return el ? String(el.value || fallback).trim() : fallback;
  }

  function orientationName() {
    return screen.orientation?.type || (innerWidth >= innerHeight ? 'landscape' : 'portrait');
  }

  function standaloneNow() {
    return !!(matchMedia?.('(display-mode: standalone)').matches || navigator.standalone);
  }

  function presetAggregate() {
    return {samples:0,sumMs:0,maxMs:0,over33ms:0,over50ms:0};
  }

  function newEvidence() {
    const mode = inputValue('testMode', 'exploratory');
    return {
      schema:2,
      build:BUILD,
      coreBuild:CORE_BUILD,
      designBaseline:'1.7',
      test:mode === 'formal-candidate' ? '0a-formal-candidate' : '0a-exploratory',
      declarationId:inputValue('declarationId') || null,
      runSetup:{
        mode,
        deviceModel:inputValue('deviceModel') || null,
        operatorNotes:inputValue('operatorNotes') || null
      },
      runId:globalThis.crypto?.randomUUID?.() || `run-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      runState:'active',
      startedAt:nowIso(),
      userAgent:navigator.userAgent,
      platform:navigator.platform || null,
      initial:{
        innerWidth,innerHeight,screenWidth:screen.width,screenHeight:screen.height,
        dpr:devicePixelRatio || 1,orientation:orientationName(),standalone:standaloneNow(),
        webglRenderer:null,webglVendor:null
      },
      sessions:[],
      counters:{
        commanderOrders:0,pans:0,pinches:0,laneJumps:0,laneJumpsByLane:{north:0,mid:0,south:0},
        recenters:0,pointerCancels:0,contextLosses:0,orientationChanges:0,portraitObservations:0,
        backgroundCycles:0,recoveredBoots:0
      },
      audio:{attempts:0,unlocked:false,state:null,atMs:null,history:[]},
      manualChecks:{hudClear:false,noAccidentalOrders:false,audioHeard:false},
      frame:{
        samples:0,sumMs:0,maxMs:0,over33ms:0,over50ms:0,
        byPreset:{sparse:presetAggregate(),target:presetAggregate(),stress:presetAggregate()},secondBuckets:[]
      },
      lifecycle:[],telemetry:[],memory:[],configurations:[],
      persistence:{checkpoints:0,recovered:false,lastCheckpointAt:null},
      coverage:{},endedAt:null,elapsedMs:0
    };
  }

  function loadEvidence() {
    try {
      const raw=localStorage.getItem(EVIDENCE_KEY);
      if(!raw) return null;
      const parsed=JSON.parse(raw);
      return parsed?.schema===2 && parsed?.build===BUILD && parsed?.runState==='active' ? parsed : null;
    } catch (_) { return null; }
  }

  let evidence=loadEvidence() || newEvidence();
  const recovered=!!evidence.persistence?.checkpoints;
  runStartPerf=performance.now()-Math.max(0,Number(evidence.elapsedMs||0));

  function elapsed() { return Math.round(performance.now()-runStartPerf); }

  function event(type,detail={}) {
    evidence.lifecycle.push({tMs:elapsed(),type,...detail});
    if(evidence.lifecycle.length>1500) evidence.lifecycle.shift();
  }

  function coreEvidence() { return window.__LW_EVIDENCE__ || null; }
  function diagnostics() { return window.__LW_DIAGNOSTICS__ || {}; }

  function syncCoreCounters() {
    const core=coreEvidence();
    if(!core?.counters) return;
    for(const key of ['commanderOrders','pans','pinches','recenters','pointerCancels','contextLosses']) {
      evidence.counters[key]=Math.max(evidence.counters[key]||0,core.counters[key]||0);
    }
  }

  function captureWebGLIdentity() {
    try {
      const gl=canvas.getContext('webgl2');
      const ext=gl?.getExtension('WEBGL_debug_renderer_info');
      if(ext) {
        evidence.initial.webglRenderer=gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
        evidence.initial.webglVendor=gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
      }
    } catch (_) {}
  }

  function coverage() {
    syncCoreCounters();
    const lanes=evidence.counters.laneJumpsByLane||{};
    return {
      stressSelected:evidence.configurations.some(c=>c.preset==='stress') || diagnostics().preset==='stress',
      audioUnlockAttempted:evidence.audio.attempts>0,
      audioUnlocked:evidence.audio.unlocked===true,
      panExercised:evidence.counters.pans>0,
      pinchExercised:evidence.counters.pinches>0,
      commanderOrderExercised:evidence.counters.commanderOrders>0,
      recenterExercised:evidence.counters.recenters>0,
      northLaneJump:(lanes.north||0)>0,midLaneJump:(lanes.mid||0)>0,southLaneJump:(lanes.south||0)>0,
      portraitObserved:evidence.counters.portraitObservations>0,
      lifecycleCycleObserved:evidence.counters.backgroundCycles>0,
      standalone:standaloneNow(),deviceModelDeclared:!!evidence.runSetup?.deviceModel,
      declarationIdPresent:evidence.runSetup?.mode!=='formal-candidate'||!!evidence.declarationId,
      hudClearConfirmed:evidence.manualChecks?.hudClear===true,
      noAccidentalOrdersConfirmed:evidence.manualChecks?.noAccidentalOrders===true,
      audioHeardConfirmed:evidence.manualChecks?.audioHeard===true
    };
  }

  function updateCoverageUI() {
    evidence.coverage=coverage();
    document.querySelectorAll('[data-coverage]').forEach(el=>{
      const done=!!evidence.coverage[el.dataset.coverage];
      el.classList.toggle('done',done);
      const mark=el.querySelector('.check-mark');
      if(mark) mark.textContent=done?'✓':'○';
    });
    document.querySelectorAll('[data-manual-check]').forEach(el=>{
      el.checked=!!evidence.manualChecks?.[el.dataset.manualCheck];
    });
    const status=document.getElementById('runStatus');
    if(status) {
      const vals=Object.values(evidence.coverage);
      status.textContent=`${evidence.test} · ${vals.filter(Boolean).length}/${vals.length} coverage`;
    }
  }

  function persist(reason='periodic') {
    try {
      evidence.elapsedMs=elapsed();
      evidence.coverage=coverage();
      evidence.persistence ||= {checkpoints:0,recovered:false,lastCheckpointAt:null};
      evidence.persistence.checkpoints=(evidence.persistence.checkpoints||0)+1;
      evidence.persistence.lastCheckpointAt=nowIso();
      localStorage.setItem(EVIDENCE_KEY,JSON.stringify(evidence));
      if(reason!=='periodic') event('checkpoint',{reason});
    } catch(err) {
      event('checkpoint-error',{reason,error:String(err?.message||err)});
    }
  }

  function captureConfig(reason) {
    const d=diagnostics();
    evidence.configurations.push({
      tMs:elapsed(),reason,preset:d.preset||null,projectiles:true,
      viewport:[innerWidth,innerHeight],render:[canvas.width,canvas.height],
      dpr:devicePixelRatio||1,effectiveDpr:canvas.clientWidth?Math.round((canvas.width/canvas.clientWidth)*100)/100:null,
      orientation:orientationName(),standalone:standaloneNow()
    });
  }

  function beginSession() {
    evidence.persistence ||= {checkpoints:0,recovered:false,lastCheckpointAt:null};
    evidence.persistence.recovered=evidence.persistence.recovered||recovered;
    if(recovered) evidence.counters.recoveredBoots++;
    evidence.sessions.push({
      bootId,startedAt:nowIso(),tMs:elapsed(),navigationType,recovered,standalone:standaloneNow(),
      viewport:[innerWidth,innerHeight],orientation:orientationName()
    });
    event(recovered?'session-recovered':'session-start',{bootId,navigationType});
  }

  function replaceButton(id,handler) {
    const old=document.getElementById(id);
    if(!old) return;
    const fresh=old.cloneNode(true);
    old.replaceWith(fresh);
    fresh.addEventListener('click',handler);
  }

  function startNewRun() {
    const mode=inputValue('testMode','exploratory');
    const error=document.getElementById('setupError');
    if(mode==='formal-candidate' && (!inputValue('deviceModel') || !inputValue('declarationId'))) {
      if(error) error.textContent='Formal candidate requires device model and declaration ID.';
      return;
    }
    if(error) error.textContent='';
    evidence=newEvidence();
    runStartPerf=performance.now();
    lastFrame=performance.now();lastBucket=lastFrame;bucketFrames=0;bucketSum=0;bucketMax=0;lastTelemetry=0;
    captureWebGLIdentity();
    evidence.sessions.push({bootId,startedAt:nowIso(),tMs:0,navigationType:'new-run',recovered:false,standalone:standaloneNow(),viewport:[innerWidth,innerHeight],orientation:orientationName()});
    event('evidence-reset');captureConfig('initial');persist('new-run');updateCoverageUI();
  }

  function finishExport() {
    syncCoreCounters();
    evidence.endedAt=nowIso();evidence.elapsedMs=elapsed();evidence.runState='completed';evidence.coverage=coverage();
    persist('export');
    try{localStorage.removeItem(EVIDENCE_KEY);}catch(_){}
    const blob=new Blob([JSON.stringify(evidence,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download=`lane-warden-${BUILD}-evidence-${nowIso().replace(/[:.]/g,'-')}.json`;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);updateCoverageUI();
  }

  function sampleTelemetry(now) {
    if(now-lastTelemetry<1000) return;
    lastTelemetry=now;syncCoreCounters();
    const d=diagnostics();
    evidence.telemetry.push({
      tMs:elapsed(),preset:d.preset||null,fps:d.fps||0,visibleActors:d.visibleActors??null,totalActors:d.totalActors??null,
      zoom:d.zoom??null,camera:d.camera||null,viewport:[innerWidth,innerHeight],render:[canvas.width,canvas.height],
      dpr:devicePixelRatio||1,effectiveDpr:canvas.clientWidth?Math.round((canvas.width/canvas.clientWidth)*100)/100:null,
      orientation:orientationName(),visibility:document.visibilityState,standalone:standaloneNow()
    });
    if(evidence.telemetry.length>7200)evidence.telemetry.shift();
    const mem=performance.memory;
    if(mem && (!evidence.memory.length || elapsed()-evidence.memory.at(-1).tMs>=5000)) {
      evidence.memory.push({tMs:elapsed(),usedJSHeapMB:Math.round(mem.usedJSHeapSize/104857.6)/10,totalJSHeapMB:Math.round(mem.totalJSHeapSize/104857.6)/10});
    }
    updateCoverageUI();
  }

  function frame(now) {
    if(document.visibilityState==='visible') {
      const raw=Math.max(0,now-lastFrame);lastFrame=now;
      if(raw<1000) {
        evidence.frame.samples++;evidence.frame.sumMs+=raw;evidence.frame.maxMs=Math.max(evidence.frame.maxMs,raw);
        if(raw>33.34)evidence.frame.over33ms++;if(raw>50)evidence.frame.over50ms++;
        const preset=diagnostics().preset||'target';
        const agg=evidence.frame.byPreset[preset]||(evidence.frame.byPreset[preset]=presetAggregate());
        agg.samples++;agg.sumMs+=raw;agg.maxMs=Math.max(agg.maxMs,raw);if(raw>33.34)agg.over33ms++;if(raw>50)agg.over50ms++;
        bucketFrames++;bucketSum+=raw;bucketMax=Math.max(bucketMax,raw);
      }
      if(now-lastBucket>=1000) {
        const d=diagnostics();
        evidence.frame.secondBuckets.push({
          tMs:elapsed(),preset:d.preset||null,frames:bucketFrames,
          avgMs:bucketFrames?Math.round((bucketSum/bucketFrames)*100)/100:null,maxMs:Math.round(bucketMax*100)/100,
          visibleActors:d.visibleActors??null,totalActors:d.totalActors??null,viewport:[innerWidth,innerHeight],render:[canvas.width,canvas.height],
          effectiveDpr:canvas.clientWidth?Math.round((canvas.width/canvas.clientWidth)*100)/100:null
        });
        if(evidence.frame.secondBuckets.length>7200)evidence.frame.secondBuckets.shift();
        lastBucket=now;bucketFrames=0;bucketSum=0;bucketMax=0;
      }
      sampleTelemetry(now);
    } else lastFrame=now;
    window.__LW_EVIDENCE_V2__=evidence;
    requestAnimationFrame(frame);
  }

  document.querySelectorAll('.lane').forEach(btn=>btn.addEventListener('click',()=>{
    const lane=['north','mid','south'][Number(btn.dataset.lane)];
    evidence.counters.laneJumps++;evidence.counters.laneJumpsByLane[lane]++;
    event('lane-jump',{lane});updateCoverageUI();
  }));
  document.querySelectorAll('[data-preset]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>{captureConfig('preset');event('preset-change',{preset:diagnostics().preset||btn.dataset.preset});updateCoverageUI();},0)));

  document.getElementById('audioButton')?.addEventListener('click',()=>{
    const attempt={tMs:elapsed(),success:false,state:null,error:null};evidence.audio.attempts++;
    setTimeout(()=>{
      const core=coreEvidence();attempt.success=!!window.__LW_AUDIO_UNLOCKED__;attempt.state=core?.audio?.state||null;
      evidence.audio.unlocked=attempt.success;evidence.audio.state=attempt.state;evidence.audio.atMs=elapsed();evidence.audio.history.push(attempt);
      event('audio-observed',{success:attempt.success,state:attempt.state});updateCoverageUI();persist('audio');
    },250);
  },true);

  canvas.addEventListener('pointerdown',e=>{
    gesturePointers.set(e.pointerId,{startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY});
    if(gesturePointers.size===1)gestureState={type:'pending',id:e.pointerId,dragged:false};
    else if(gesturePointers.size===2){gestureState={type:'pinch'};event('gesture-pinch-start');}
  },true);
  canvas.addEventListener('pointermove',e=>{
    const p=gesturePointers.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;
    if(gesturePointers.size===1&&gestureState?.id===e.pointerId){const dist=Math.hypot(e.clientX-p.startX,e.clientY-p.startY);if(dist>DRAG_THRESHOLD&&!gestureState.dragged){gestureState.type='pan';gestureState.dragged=true;event('gesture-pan-start',{travelPx:Math.round(dist)});}}
  },true);
  const gestureEnd=e=>{
    const p=gesturePointers.get(e.pointerId);if(!p)return;const dist=Math.hypot(e.clientX-p.startX,e.clientY-p.startY);
    event('gesture-end',{classification:gestureState?.type||'other',travelPx:Math.round(dist*10)/10});gesturePointers.delete(e.pointerId);if(!gesturePointers.size)gestureState=null;
  };
  canvas.addEventListener('pointerup',gestureEnd,true);canvas.addEventListener('pointercancel',gestureEnd,true);

  document.querySelectorAll('[data-manual-check]').forEach(el=>el.addEventListener('change',()=>{
    evidence.manualChecks[el.dataset.manualCheck]=!!el.checked;event('manual-check',{check:el.dataset.manualCheck,value:!!el.checked});updateCoverageUI();persist('manual-check');
  }));

  function noteOrientation(source){const o=orientationName();if(o!==lastOrientation){evidence.counters.orientationChanges++;lastOrientation=o;}if(o.startsWith('portrait'))evidence.counters.portraitObservations++;event(source,{orientation:o,w:innerWidth,h:innerHeight,dpr:devicePixelRatio||1});updateCoverageUI();}
  addEventListener('resize',()=>{noteOrientation('resize');captureConfig('resize');});
  addEventListener('orientationchange',()=>{noteOrientation('orientationchange');setTimeout(()=>captureConfig('orientationchange'),100);});
  document.addEventListener('visibilitychange',()=>{if(lastVisibility==='hidden'&&document.visibilityState==='visible')evidence.counters.backgroundCycles++;lastVisibility=document.visibilityState;event('visibilitychange',{state:document.visibilityState});lastFrame=performance.now();persist('visibilitychange');updateCoverageUI();});
  addEventListener('pagehide',e=>{event('pagehide',{persisted:e.persisted});persist('pagehide');});
  addEventListener('pageshow',e=>event('pageshow',{persisted:e.persisted}));
  addEventListener('beforeunload',()=>persist('beforeunload'));
  addEventListener('unhandledrejection',e=>event('unhandledrejection',{reason:String(e.reason?.message||e.reason||'unknown')}));

  ['testMode','deviceModel','declarationId','operatorNotes'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>updateCoverageUI()));

  replaceButton('resetEvidence',startNewRun);
  replaceButton('exportEvidence',finishExport);
  if(evidence.runSetup?.mode)document.getElementById('testMode').value=evidence.runSetup.mode;
  if(evidence.runSetup?.deviceModel)document.getElementById('deviceModel').value=evidence.runSetup.deviceModel;
  if(evidence.declarationId)document.getElementById('declarationId').value=evidence.declarationId;
  if(evidence.runSetup?.operatorNotes)document.getElementById('operatorNotes').value=evidence.runSetup.operatorNotes;

  captureWebGLIdentity();
  if(lastOrientation.startsWith('portrait'))evidence.counters.portraitObservations++;
  beginSession();captureConfig(recovered?'restored':'initial');
  if(recovered)event('active-run-restored',{navigationType});
  window.__LW_BUILD__=BUILD;window.__LW_CORE_BUILD__=CORE_BUILD;
  updateCoverageUI();persist(recovered?'restore':'startup');
  setInterval(()=>persist('periodic'),2000);
  requestAnimationFrame(frame);
})();
