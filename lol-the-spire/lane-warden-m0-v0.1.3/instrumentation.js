(() => {
  'use strict';

  const BUILD = 'M0-0.1.3';
  const CORE_BUILD = 'M0-0.1.1';
  const EVIDENCE_SCHEMA = 3;
  const EVIDENCE_KEY = `lane-warden-${BUILD}-active-evidence`;
  const DECLARATION_ID = 'LW-0A-001';
  const DECLARED_DEVICE = 'iPhone 15 Pro';
  const DECLARED_OS = 'iOS 26.6';
  const FORMAL_STRESS_MS = 20 * 60 * 1000;
  const LIFECYCLE_ADJACENCY_MS = 1500;

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
  let lastLifecycleAtMs = -Infinity;
  let lastLifecycleType = null;
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

  function projectilesNow() {
    return !!document.getElementById('projectileToggle')?.checked;
  }

  function pausedNow() {
    return !!document.getElementById('pauseToggle')?.checked;
  }

  function effectiveDprNow() {
    return canvas.clientWidth ? Math.round((canvas.width / canvas.clientWidth) * 100) / 100 : null;
  }

  function presetAggregate() {
    return {samples:0,sumMs:0,maxMs:0,over33ms:0,over50ms:0};
  }

  function stressAttempt() {
    return {
      attemptNumber: 0,
      status: 'active',
      startedAt: nowIso(),
      startedAtMs: 0,
      endedAt: null,
      endedAtMs: null,
      qualifiedForegroundMs: 0,
      wallElapsedMs: 0,
      interruptions: [],
      frame: {...presetAggregate(), secondBuckets: []},
      baselineCounters: null
    };
  }

  function newEvidence() {
    const mode = inputValue('testMode', 'formal-candidate');
    return {
      schema:EVIDENCE_SCHEMA,
      build:BUILD,
      coreBuild:CORE_BUILD,
      designBaseline:'1.7',
      test:mode === 'formal-candidate' ? '0a-formal-candidate' : '0a-exploratory',
      declarationId:inputValue('declarationId') || null,
      declarationSnapshot: mode === 'formal-candidate' ? {
        id:DECLARATION_ID,
        deviceFloor:DECLARED_DEVICE,
        osFloor:DECLARED_OS,
        channel:'installed standalone PWA',
        stressPreset:'stress',
        projectiles:true,
        effectiveRenderDpr:2,
        requiredStressMs:FORMAL_STRESS_MS
      } : null,
      runSetup:{
        mode,
        deviceModel:inputValue('deviceModel') || null,
        declaredOS:inputValue('declaredOS') || null,
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
      input:{pointerCancelEvents:[]},
      audio:{attempts:0,unlocked:false,state:null,atMs:null,history:[]},
      manualChecks:{hudClear:false,noAccidentalOrders:false,audioHeard:false},
      frame:{
        samples:0,sumMs:0,maxMs:0,over33ms:0,over50ms:0,
        byPreset:{sparse:presetAggregate(),target:presetAggregate(),stress:presetAggregate()},secondBuckets:[]
      },
      formalStress:{requiredMs:FORMAL_STRESS_MS,active:false,complete:false,attempts:[],currentAttemptNumber:null},
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
      return parsed?.schema===EVIDENCE_SCHEMA && parsed?.build===BUILD && parsed?.runState==='active' ? parsed : null;
    } catch (_) { return null; }
  }

  let evidence=loadEvidence() || newEvidence();
  const recovered=!!evidence.persistence?.checkpoints;
  runStartPerf=performance.now()-Math.max(0,Number(evidence.elapsedMs||0));

  function elapsed() { return Math.round(performance.now()-runStartPerf); }

  function event(type,detail={}) {
    evidence.lifecycle.push({tMs:elapsed(),type,...detail});
    if(evidence.lifecycle.length>2000) evidence.lifecycle.shift();
  }

  function coreEvidence() { return window.__LW_EVIDENCE__ || null; }
  function diagnostics() { return window.__LW_DIAGNOSTICS__ || {}; }

  function syncCoreCounters() {
    const core=coreEvidence();
    if(!core?.counters) return;
    for(const key of ['commanderOrders','pans','pinches','recenters','contextLosses']) {
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

  function currentStressAttempt() {
    const n=evidence.formalStress?.currentAttemptNumber;
    if(!n) return null;
    return evidence.formalStress.attempts.find(a=>a.attemptNumber===n) || null;
  }

  function setupCoverage() {
    syncCoreCounters();
    const lanes=evidence.counters.laneJumpsByLane||{};
    return {
      audioUnlockAttempted:evidence.audio.attempts>0,
      audioUnlocked:evidence.audio.unlocked===true,
      panExercised:evidence.counters.pans>=3,
      pinchExercised:evidence.counters.pinches>=3,
      commanderOrderExercised:evidence.counters.commanderOrders>=3,
      recenterExercised:evidence.counters.recenters>=1,
      northLaneJump:(lanes.north||0)>=1,midLaneJump:(lanes.mid||0)>=1,southLaneJump:(lanes.south||0)>=1,
      portraitObserved:evidence.counters.portraitObservations>0,
      lifecycleCycleObserved:evidence.counters.backgroundCycles>0,
      standalone:standaloneNow(),
      deviceModelDeclared:!!evidence.runSetup?.deviceModel,
      osDeclared:!!evidence.runSetup?.declaredOS,
      declarationIdPresent:evidence.runSetup?.mode==='formal-candidate' ? !!evidence.declarationId : null,
      hudClearConfirmed:evidence.manualChecks?.hudClear===true,
      noAccidentalOrdersConfirmed:evidence.manualChecks?.noAccidentalOrders===true,
      audioHeardConfirmed:evidence.manualChecks?.audioHeard===true
    };
  }

  function coverage() {
    const setup=setupCoverage();
    return {
      stressSelected:evidence.configurations.some(c=>c.preset==='stress') || diagnostics().preset==='stress',
      ...setup,
      formalStressComplete:evidence.runSetup?.mode==='formal-candidate' ? evidence.formalStress?.complete===true : null
    };
  }

  function updateStressStatus() {
    const el=document.getElementById('formalStressStatus');
    if(!el) return;
    el.classList.remove('active','complete','failed');
    const attempt=currentStressAttempt();
    if(evidence.formalStress?.complete) {
      el.textContent='20m Stress complete · ready to export';
      el.classList.add('complete');
      return;
    }
    if(evidence.formalStress?.active && attempt) {
      const remain=Math.max(0,FORMAL_STRESS_MS-attempt.qualifiedForegroundMs);
      const m=Math.floor(remain/60000), s=Math.floor((remain%60000)/1000);
      el.textContent=`Attempt ${attempt.attemptNumber} active · ${m}:${String(s).padStart(2,'0')} remaining`;
      el.classList.add('active');
      return;
    }
    const last=evidence.formalStress?.attempts?.at(-1);
    if(last?.status==='interrupted') {
      el.textContent=`Attempt ${last.attemptNumber} interrupted · Begin 20m Stress to restart`;
      el.classList.add('failed');
      return;
    }
    el.textContent='Not started · complete setup coverage first';
  }

  function setFormalLocks(locked) {
    document.querySelectorAll('[data-preset]').forEach(b=>b.disabled=locked);
    const proj=document.getElementById('projectileToggle'); if(proj) proj.disabled=locked;
    const pause=document.getElementById('pauseToggle'); if(pause) pause.disabled=locked;
    ['testMode','deviceModel','declaredOS','declarationId'].forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=locked;});
    const begin=document.getElementById('beginFormalStress'); if(begin) begin.disabled=locked || evidence.formalStress?.complete===true;
  }

  function updateCoverageUI() {
    evidence.coverage=coverage();
    document.querySelectorAll('[data-coverage]').forEach(el=>{
      const value=evidence.coverage[el.dataset.coverage];
      const na=value===null;
      const done=value===true;
      el.classList.toggle('done',done);el.classList.toggle('na',na);
      const mark=el.querySelector('.check-mark');
      if(mark) mark.textContent=na?'—':(done?'✓':'○');
    });
    document.querySelectorAll('[data-manual-check]').forEach(el=>{
      el.checked=!!evidence.manualChecks?.[el.dataset.manualCheck];
    });
    const status=document.getElementById('runStatus');
    if(status) {
      const vals=Object.values(evidence.coverage);
      status.textContent=`${evidence.test} · ${vals.filter(Boolean).length}/${vals.length} coverage`;
    }
    updateStressStatus();
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
      tMs:elapsed(),reason,preset:d.preset||null,projectiles:projectilesNow(),paused:pausedNow(),
      viewport:[innerWidth,innerHeight],render:[canvas.width,canvas.height],
      dpr:devicePixelRatio||1,effectiveDpr:effectiveDprNow(),
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

  function validateFormalSetupFields() {
    if(!standaloneNow()) return 'Formal candidate must run from the installed standalone PWA.';
    if(inputValue('deviceModel')!==DECLARED_DEVICE) return `Formal device must be exactly ${DECLARED_DEVICE}.`;
    if(inputValue('declaredOS')!==DECLARED_OS) return `Formal OS must be exactly ${DECLARED_OS}.`;
    if(inputValue('declarationId')!==DECLARATION_ID) return `Formal declaration must be ${DECLARATION_ID}.`;
    return null;
  }

  function startNewRun() {
    const mode=inputValue('testMode','formal-candidate');
    const error=document.getElementById('setupError');
    if(mode==='formal-candidate') {
      const msg=validateFormalSetupFields();
      if(msg){if(error)error.textContent=msg;return;}
    }
    if(error) error.textContent='';
    evidence=newEvidence();
    setFormalLocks(false);
    runStartPerf=performance.now();
    lastFrame=performance.now();lastBucket=lastFrame;bucketFrames=0;bucketSum=0;bucketMax=0;lastTelemetry=0;
    captureWebGLIdentity();
    evidence.sessions.push({bootId,startedAt:nowIso(),tMs:0,navigationType:'new-run',recovered:false,standalone:standaloneNow(),viewport:[innerWidth,innerHeight],orientation:orientationName()});
    event('evidence-reset');captureConfig('initial');persist('new-run');updateCoverageUI();
  }

  function beginFormalStress() {
    const error=document.getElementById('setupError');
    if(evidence.runSetup?.mode!=='formal-candidate') {
      if(error)error.textContent='20m formal segment is only available in Formal candidate mode.';return;
    }
    const fieldError=validateFormalSetupFields();
    if(fieldError){if(error)error.textContent=fieldError;return;}
    const setup=setupCoverage();
    const missing=Object.entries(setup).filter(([,v])=>!v).map(([k])=>k);
    if(missing.length){if(error)error.textContent=`Complete setup coverage first: ${missing.join(', ')}`;return;}
    if(evidence.formalStress?.complete){if(error)error.textContent='Formal stress segment is already complete.';return;}
    if(error)error.textContent='';

    const stressBtn=document.querySelector('[data-preset="stress"]');
    if(stressBtn && diagnostics().preset!=='stress') stressBtn.click();
    const proj=document.getElementById('projectileToggle');
    if(proj && !proj.checked){proj.checked=true;proj.dispatchEvent(new Event('change',{bubbles:true}));}
    const pause=document.getElementById('pauseToggle');
    if(pause && pause.checked){pause.checked=false;pause.dispatchEvent(new Event('change',{bubbles:true}));}

    setTimeout(()=>{
      const attempt=stressAttempt();
      attempt.attemptNumber=(evidence.formalStress.attempts?.length||0)+1;
      attempt.startedAtMs=elapsed();
      syncCoreCounters();
      attempt.baselineCounters={...evidence.counters,laneJumpsByLane:{...(evidence.counters.laneJumpsByLane||{})}};
      evidence.formalStress.attempts.push(attempt);
      evidence.formalStress.currentAttemptNumber=attempt.attemptNumber;
      evidence.formalStress.active=true;
      lastFrame=performance.now();lastBucket=lastFrame;bucketFrames=0;bucketSum=0;bucketMax=0;
      evidence.formalStress.complete=false;
      captureConfig('formal-stress-start');
      event('formal-stress-start',{attempt:attempt.attemptNumber,requiredMs:FORMAL_STRESS_MS});
      setFormalLocks(true);persist('formal-stress-start');updateCoverageUI();
    },50);
  }

  function interruptFormalStress(reason,detail={}) {
    if(!evidence.formalStress?.active) return;
    const attempt=currentStressAttempt();
    if(!attempt) return;
    attempt.interruptions.push({tMs:elapsed(),reason,...detail});
    attempt.status='interrupted';attempt.endedAt=nowIso();attempt.endedAtMs=elapsed();attempt.wallElapsedMs=attempt.endedAtMs-attempt.startedAtMs;
    evidence.formalStress.active=false;
    event('formal-stress-interrupted',{attempt:attempt.attemptNumber,reason,...detail});
    setFormalLocks(false);persist('formal-stress-interrupted');updateCoverageUI();
  }

  function completeFormalStress() {
    const attempt=currentStressAttempt();
    if(!attempt || !evidence.formalStress?.active) return;
    attempt.status='complete';attempt.endedAt=nowIso();attempt.endedAtMs=elapsed();attempt.wallElapsedMs=attempt.endedAtMs-attempt.startedAtMs;
    evidence.formalStress.active=false;evidence.formalStress.complete=true;
    event('formal-stress-complete',{attempt:attempt.attemptNumber,qualifiedForegroundMs:Math.round(attempt.qualifiedForegroundMs)});
    setFormalLocks(true);persist('formal-stress-complete');updateCoverageUI();
  }

  function finishExport() {
    const error=document.getElementById('setupError');
    if(evidence.runSetup?.mode==='formal-candidate' && !evidence.formalStress?.complete) {
      if(error)error.textContent='Formal export is locked until a 20-minute Stress attempt completes.';return;
    }
    if(error)error.textContent='';
    syncCoreCounters();
    evidence.endedAt=nowIso();evidence.elapsedMs=elapsed();evidence.runState='completed';evidence.coverage=coverage();
    persist('export');
    try{localStorage.removeItem(EVIDENCE_KEY);}catch(_){ }
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
      dpr:devicePixelRatio||1,effectiveDpr:effectiveDprNow(),projectiles:projectilesNow(),paused:pausedNow(),
      orientation:orientationName(),visibility:document.visibilityState,standalone:standaloneNow(),
      formalStressAttempt:evidence.formalStress?.active ? evidence.formalStress.currentAttemptNumber : null
    });
    if(evidence.telemetry.length>7200)evidence.telemetry.shift();
    const mem=performance.memory;
    if(mem && (!evidence.memory.length || elapsed()-evidence.memory.at(-1).tMs>=5000)) {
      evidence.memory.push({tMs:elapsed(),usedJSHeapMB:Math.round(mem.usedJSHeapSize/104857.6)/10,totalJSHeapMB:Math.round(mem.totalJSHeapSize/104857.6)/10});
    }
    updateCoverageUI();
  }

  function sampleFormalStress(raw) {
    if(!evidence.formalStress?.active) return;
    const attempt=currentStressAttempt();
    if(!attempt) return;
    const d=diagnostics();
    attempt.wallElapsedMs=elapsed()-attempt.startedAtMs;
    const valid=document.visibilityState==='visible' && orientationName().startsWith('landscape') && d.preset==='stress' && projectilesNow() && !pausedNow() && standaloneNow();
    if(!valid) return;
    if(raw<1000) {
      attempt.qualifiedForegroundMs+=raw;
      attempt.frame.samples++;attempt.frame.sumMs+=raw;attempt.frame.maxMs=Math.max(attempt.frame.maxMs,raw);
      if(raw>33.34)attempt.frame.over33ms++;if(raw>50)attempt.frame.over50ms++;
    }
    if(attempt.qualifiedForegroundMs>=FORMAL_STRESS_MS) completeFormalStress();
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
        sampleFormalStress(raw);
      }
      if(now-lastBucket>=1000) {
        const d=diagnostics();
        const bucket={
          tMs:elapsed(),preset:d.preset||null,frames:bucketFrames,
          avgMs:bucketFrames?Math.round((bucketSum/bucketFrames)*100)/100:null,maxMs:Math.round(bucketMax*100)/100,
          visibleActors:d.visibleActors??null,totalActors:d.totalActors??null,viewport:[innerWidth,innerHeight],render:[canvas.width,canvas.height],
          effectiveDpr:effectiveDprNow(),projectiles:projectilesNow(),orientation:orientationName(),standalone:standaloneNow()
        };
        evidence.frame.secondBuckets.push(bucket);
        if(evidence.frame.secondBuckets.length>7200)evidence.frame.secondBuckets.shift();
        const attempt=currentStressAttempt();
        if(evidence.formalStress?.active && attempt) attempt.frame.secondBuckets.push({...bucket,formalStressAttempt:attempt.attemptNumber});
        lastBucket=now;bucketFrames=0;bucketSum=0;bucketMax=0;
      }
      sampleTelemetry(now);
    } else lastFrame=now;
    window.__LW_EVIDENCE_V3__=evidence;
    requestAnimationFrame(frame);
  }

  document.querySelectorAll('.lane').forEach(btn=>btn.addEventListener('click',()=>{
    const lane=['north','mid','south'][Number(btn.dataset.lane)];
    evidence.counters.laneJumps++;evidence.counters.laneJumpsByLane[lane]++;
    event('lane-jump',{lane,formalStressAttempt:evidence.formalStress?.active?evidence.formalStress.currentAttemptNumber:null});updateCoverageUI();
  }));

  document.querySelectorAll('[data-preset]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>{
    captureConfig('preset');event('preset-change',{preset:diagnostics().preset||btn.dataset.preset});updateCoverageUI();
    if(evidence.formalStress?.active && diagnostics().preset!=='stress') interruptFormalStress('preset-changed',{preset:diagnostics().preset});
  },0)));

  document.getElementById('projectileToggle')?.addEventListener('change',()=>setTimeout(()=>{
    captureConfig('projectiles');
    if(evidence.formalStress?.active && !projectilesNow()) interruptFormalStress('projectiles-disabled');
  },0));
  document.getElementById('pauseToggle')?.addEventListener('change',()=>setTimeout(()=>{
    captureConfig('pause');
    if(evidence.formalStress?.active && pausedNow()) interruptFormalStress('simulation-paused');
  },0));

  document.getElementById('audioButton')?.addEventListener('click',()=>{
    const attempt={tMs:elapsed(),success:false,state:null,error:null};evidence.audio.attempts++;
    setTimeout(()=>{
      const core=coreEvidence();attempt.success=!!window.__LW_AUDIO_UNLOCKED__;attempt.state=core?.audio?.state||null;
      evidence.audio.unlocked=attempt.success;evidence.audio.state=attempt.state;evidence.audio.atMs=elapsed();evidence.audio.history.push(attempt);
      event('audio-observed',{success:attempt.success,state:attempt.state});updateCoverageUI();persist('audio');
    },250);
  },true);

  canvas.addEventListener('pointerdown',e=>{
    gesturePointers.set(e.pointerId,{startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,pointerType:e.pointerType});
    if(gesturePointers.size===1)gestureState={type:'pending',id:e.pointerId,dragged:false};
    else if(gesturePointers.size===2){gestureState={type:'pinch'};event('gesture-pinch-start');}
  },true);
  canvas.addEventListener('pointermove',e=>{
    const p=gesturePointers.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;
    if(gesturePointers.size===1&&gestureState?.id===e.pointerId){const dist=Math.hypot(e.clientX-p.startX,e.clientY-p.startY);if(dist>DRAG_THRESHOLD&&!gestureState.dragged){gestureState.type='pan';gestureState.dragged=true;event('gesture-pan-start',{travelPx:Math.round(dist)});}}
  },true);
  function gestureEnd(e,kind='up') {
    const p=gesturePointers.get(e.pointerId);if(!p)return;
    const dist=Math.hypot(e.clientX-p.startX,e.clientY-p.startY);
    event('gesture-end',{endKind:kind,classification:gestureState?.type||'other',travelPx:Math.round(dist*10)/10});
    gesturePointers.delete(e.pointerId);if(!gesturePointers.size)gestureState=null;
  }
  canvas.addEventListener('pointerup',e=>gestureEnd(e,'up'),true);
  canvas.addEventListener('pointercancel',e=>{
    const t=elapsed();
    const since=t-lastLifecycleAtMs;
    const classification=(document.visibilityState!=='visible'||since<=LIFECYCLE_ADJACENCY_MS)?'lifecycle-adjacent':'interaction';
    evidence.counters.pointerCancels++;
    evidence.input.pointerCancelEvents.push({
      tMs:t,pointerId:e.pointerId,pointerType:e.pointerType||null,classification,
      activeGesture:gestureState?.type||null,activePointerCount:gesturePointers.size,
      orientation:orientationName(),visibility:document.visibilityState,
      viewport:[innerWidth,innerHeight],lastLifecycleType,lastLifecycleAgeMs:Number.isFinite(since)?Math.round(since):null,
      formalStressAttempt:evidence.formalStress?.active?evidence.formalStress.currentAttemptNumber:null
    });
    event('pointercancel',{classification,lastLifecycleType,lastLifecycleAgeMs:Number.isFinite(since)?Math.round(since):null});
    gestureEnd(e,'cancel');persist('pointercancel');updateCoverageUI();
  },true);

  document.querySelectorAll('[data-manual-check]').forEach(el=>el.addEventListener('change',()=>{
    evidence.manualChecks[el.dataset.manualCheck]=!!el.checked;event('manual-check',{check:el.dataset.manualCheck,value:!!el.checked});updateCoverageUI();persist('manual-check');
  }));

  function markLifecycle(type) { lastLifecycleAtMs=elapsed();lastLifecycleType=type; }
  function noteOrientation(source){
    markLifecycle(source);
    const o=orientationName();if(o!==lastOrientation){evidence.counters.orientationChanges++;lastOrientation=o;}
    if(o.startsWith('portrait'))evidence.counters.portraitObservations++;
    event(source,{orientation:o,w:innerWidth,h:innerHeight,dpr:devicePixelRatio||1});updateCoverageUI();
    if(evidence.formalStress?.active && o.startsWith('portrait')) interruptFormalStress('orientation-left-landscape',{orientation:o,source});
  }
  addEventListener('resize',()=>{noteOrientation('resize');captureConfig('resize');});
  addEventListener('orientationchange',()=>{noteOrientation('orientationchange');setTimeout(()=>captureConfig('orientationchange'),100);});
  document.addEventListener('visibilitychange',()=>{
    markLifecycle('visibilitychange');
    if(lastVisibility==='hidden'&&document.visibilityState==='visible')evidence.counters.backgroundCycles++;
    lastVisibility=document.visibilityState;event('visibilitychange',{state:document.visibilityState});lastFrame=performance.now();
    if(evidence.formalStress?.active && document.visibilityState!=='visible') interruptFormalStress('visibility-hidden');
    persist('visibilitychange');updateCoverageUI();
  });
  addEventListener('pagehide',e=>{markLifecycle('pagehide');event('pagehide',{persisted:e.persisted});if(evidence.formalStress?.active)interruptFormalStress('pagehide',{persisted:e.persisted});persist('pagehide');});
  addEventListener('pageshow',e=>{markLifecycle('pageshow');event('pageshow',{persisted:e.persisted});});
  addEventListener('beforeunload',()=>persist('beforeunload'));
  addEventListener('unhandledrejection',e=>event('unhandledrejection',{reason:String(e.reason?.message||e.reason||'unknown')}));

  ['testMode','deviceModel','declaredOS','declarationId','operatorNotes'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>updateCoverageUI()));

  replaceButton('resetEvidence',startNewRun);
  replaceButton('exportEvidence',finishExport);
  replaceButton('beginFormalStress',beginFormalStress);

  if(evidence.runSetup?.mode)document.getElementById('testMode').value=evidence.runSetup.mode;
  if(evidence.runSetup?.deviceModel)document.getElementById('deviceModel').value=evidence.runSetup.deviceModel;
  if(evidence.runSetup?.declaredOS)document.getElementById('declaredOS').value=evidence.runSetup.declaredOS;
  if(evidence.declarationId)document.getElementById('declarationId').value=evidence.declarationId;
  if(evidence.runSetup?.operatorNotes)document.getElementById('operatorNotes').value=evidence.runSetup.operatorNotes;

  captureWebGLIdentity();
  if(lastOrientation.startsWith('portrait'))evidence.counters.portraitObservations++;
  beginSession();captureConfig(recovered?'restored':'initial');
  if(recovered)event('active-run-restored',{navigationType});
  if(evidence.formalStress?.active) setFormalLocks(true);
  window.__LW_BUILD__=BUILD;window.__LW_CORE_BUILD__=CORE_BUILD;
  updateCoverageUI();persist(recovered?'restore':'startup');
  setInterval(()=>persist('periodic'),2000);
  requestAnimationFrame(frame);
})();
