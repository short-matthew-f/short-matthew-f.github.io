(() => {
  'use strict';

  const DIAGNOSTIC_BUILD = 'M0-0.1.5';
  const DIAGNOSTIC_ID = 'DIAG-PC-001';
  const TRACE_LIMIT = 800;
  const canvas = document.getElementById('battlefield');
  const pointers = new Map();
  let gesture = null;
  const startedPerf = performance.now();

  const elapsed = () => Math.round(performance.now() - startedPerf);
  const coreCounters = () => {
    const c = window.__LW_EVIDENCE__?.counters || {};
    return {
      pans:Number(c.pans||0), pinches:Number(c.pinches||0), commanderOrders:Number(c.commanderOrders||0),
      recenters:Number(c.recenters||0), pointerCancels:Number(c.pointerCancels||0)
    };
  };
  const delta = (after,before={}) => Object.fromEntries(Object.keys(after).map(k=>[k,Number(after[k]||0)-Number(before[k]||0)]));

  function evidence() {
    const e = window.__LW_EVIDENCE_V4__;
    if (!e) return null;
    e.diagnostic ||= {
      diagnosticBuild:DIAGNOSTIC_BUILD,
      diagnosticId:DIAGNOSTIC_ID,
      formalTest:false,
      note:'Short pointer-cancel probe layered over M0-0.1.4 instrumentation. LW-0A-002 remains unexecuted.',
      pointerTrace:[], captureEvents:[], cancels:[]
    };
    return e;
  }

  function pushTrace(type,ev,detail={}) {
    const e=evidence(); if(!e)return;
    const list=e.diagnostic.pointerTrace;
    list.push({
      tMs:elapsed(), type, pointerId:ev?.pointerId??null, pointerType:ev?.pointerType||null,
      isPrimary:ev?.isPrimary??null, buttons:ev?.buttons??null, pressure:ev?.pressure??null,
      x:Number.isFinite(ev?.clientX)?Math.round(ev.clientX*10)/10:null,
      y:Number.isFinite(ev?.clientY)?Math.round(ev.clientY*10)/10:null,
      hasCapture:Number.isFinite(ev?.pointerId)?(canvas.hasPointerCapture?.(ev.pointerId)??null):null,
      gesture:gesture?.type||null, trackedPointers:pointers.size,
      visibility:document.visibilityState,
      orientation:screen.orientation?.type || (innerWidth>=innerHeight?'landscape':'portrait'),
      ...detail
    });
    if(list.length>TRACE_LIMIT)list.shift();
  }

  function updateStatus() {
    const el=document.getElementById('pointerDiagnosticStatus'); if(!el)return;
    const e=evidence(); const cancels=e?.diagnostic?.cancels||[];
    const latest=cancels.at(-1);
    el.textContent=`Diagnostic ${DIAGNOSTIC_ID} · cancels ${cancels.length}${latest?` · last ${latest.gesture||'none'} / ${latest.travelPx??0}px / capture ${latest.hadPointerCapture?'yes':'no'}`:' · do pans, pinches, taps for 1–2 min'}`;
  }

  canvas.addEventListener('gotpointercapture',ev=>{
    const e=evidence(); if(e)e.diagnostic.captureEvents.push({tMs:elapsed(),type:'gotpointercapture',pointerId:ev.pointerId,pointerType:ev.pointerType||null});
    pushTrace('gotpointercapture',ev);
  },true);
  canvas.addEventListener('lostpointercapture',ev=>{
    const e=evidence(); if(e)e.diagnostic.captureEvents.push({tMs:elapsed(),type:'lostpointercapture',pointerId:ev.pointerId,pointerType:ev.pointerType||null});
    pushTrace('lostpointercapture',ev);
  },true);

  canvas.addEventListener('pointerdown',ev=>{
    const before=coreCounters();
    pointers.set(ev.pointerId,{startX:ev.clientX,startY:ev.clientY,downAt:elapsed(),moves:0,maxTravel:0,coreAtDown:before});
    if(pointers.size===1)gesture={type:'pending',id:ev.pointerId};
    else if(pointers.size===2)gesture={type:'pinch'};
    pushTrace('pointerdown',ev,{coreAtDown:before});
  },true);

  canvas.addEventListener('pointermove',ev=>{
    const p=pointers.get(ev.pointerId); if(!p)return;
    p.moves++;
    const travel=Math.hypot(ev.clientX-p.startX,ev.clientY-p.startY); p.maxTravel=Math.max(p.maxTravel,travel);
    if(pointers.size===1 && gesture?.id===ev.pointerId && travel>9)gesture.type='pan';
    if(p.moves<=3 || p.moves%20===0)pushTrace('pointermove',ev,{moveCount:p.moves,travelPx:Math.round(travel*10)/10});
  },true);

  function finishPointer(ev,kind) {
    const p=pointers.get(ev.pointerId); if(!p)return;
    const travel=Math.hypot(ev.clientX-p.startX,ev.clientY-p.startY);
    pushTrace(kind,ev,{durationMs:Math.max(0,elapsed()-p.downAt),moveCount:p.moves,travelPx:Math.round(travel*10)/10,coreDelta:delta(coreCounters(),p.coreAtDown)});
    pointers.delete(ev.pointerId);
    if(!pointers.size)gesture=null;
    else if(pointers.size===1){const [id]=pointers.keys();gesture={type:'pending-after-multitouch',id};}
  }

  canvas.addEventListener('pointerup',ev=>finishPointer(ev,'pointerup'),true);
  canvas.addEventListener('pointercancel',ev=>{
    const e=evidence(); if(!e)return;
    const p=pointers.get(ev.pointerId)||null;
    const before=coreCounters();
    const rec={
      tMs:elapsed(), pointerId:ev.pointerId, pointerType:ev.pointerType||null,
      gesture:gesture?.type||null, trackedPointer:!!p, trackedPointers:pointers.size,
      durationMs:p?Math.max(0,elapsed()-p.downAt):null,
      moveCount:p?.moves||0,
      travelPx:p?Math.round(Math.hypot(ev.clientX-p.startX,ev.clientY-p.startY)*10)/10:null,
      maxTravelPx:p?Math.round(p.maxTravel*10)/10:null,
      hadPointerCapture:canvas.hasPointerCapture?.(ev.pointerId)??null,
      isPrimary:ev.isPrimary??null, buttons:ev.buttons??null, pressure:ev.pressure??null,
      coreAtDown:p?.coreAtDown||null, coreAtCancel:before,
      coreDeltaAtCancel:p?delta(before,p.coreAtDown):null,
      post250ms:null
    };
    e.diagnostic.cancels.push(rec);
    pushTrace('pointercancel',ev,{gesture:rec.gesture,durationMs:rec.durationMs,moveCount:rec.moveCount,travelPx:rec.travelPx,coreDeltaAtCancel:rec.coreDeltaAtCancel});
    finishPointer(ev,'cancel-end');
    setTimeout(()=>{
      rec.post250ms={coreCounters:coreCounters(),coreDeltaFromCancel:delta(coreCounters(),before),trackedPointers:pointers.size,gesture:gesture?.type||null,hasCapture:canvas.hasPointerCapture?.(ev.pointerId)??null};
      updateStatus();
    },250);
    updateStatus();
  },true);

  const formalBtn=document.getElementById('beginFormalStress'); if(formalBtn){formalBtn.disabled=true;formalBtn.hidden=true;}
  const mode=document.getElementById('testMode'); if(mode){mode.value='exploratory';mode.disabled=true;}
  const declaration=document.getElementById('declarationId'); if(declaration){declaration.value=DIAGNOSTIC_ID;declaration.disabled=true;}
  window.__LW_DIAGNOSTIC_BUILD__=DIAGNOSTIC_BUILD;
  setInterval(updateStatus,500);
  updateStatus();
})();
