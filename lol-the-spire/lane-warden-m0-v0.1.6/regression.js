(() => {
  'use strict';
  const BUILD = 'M0-0.1.6';
  const DECLARATION_ID = 'LW-0A-003';
  const REQUIRED_MS = 180000;
  const MIN = { pans:12, pinches:6, commanderOrders:3, recenters:1 };
  const canvas = document.getElementById('battlefield');
  const status = document.getElementById('regressionStatus');
  const startButton = document.getElementById('beginRegression');
  const exportButton = document.getElementById('exportRegression');
  const timerEl = document.getElementById('regressionTimer');
  const cancelEl = document.getElementById('cancelStatus');
  const activityEl = document.getElementById('activityStatus');
  const checks = {
    hud: document.getElementById('hudClear'),
    input: document.getElementById('inputClean'),
    audio: document.getElementById('audioHeard')
  };

  const declaration = {
    declarationId: DECLARATION_ID,
    designBaseline: '1.7',
    build: BUILD,
    coreBuild: 'M0-0.1.1',
    delivery: 'installed standalone PWA',
    device: 'iPhone 15 Pro',
    os: 'iOS 26.6',
    purpose: 'Targeted input-remediation regression after DIAG-PC-001',
    durationMs: REQUIRED_MS,
    configuration: 'Stress preset, 180 actors, projectiles on, DPR cap 2',
    activityMinimums: MIN,
    cancellationAcceptance: 'Raw pointercancel is telemetry. A cancel fails only if it commits a Commander order, retains pointer capture after cleanup, or cannot demonstrate subsequent input recovery before completion.',
    retainedEvidence: 'LW-0A-001 supplies the 20-minute renderer/channel stability and performance evidence for the unchanged rendering/simulation path.',
    supersedes: 'LW-0A-002 — superseded before execution'
  };

  let run = null;
  const observedPointers = new Map();
  let laneCounts = {north:0, mid:0, south:0};
  let cancelRecords = [];
  let lifecycleFailures = [];

  const core = () => window.__LW_EVIDENCE__ || null;
  const counters = () => {
    const c = core()?.counters || {};
    return {
      commanderOrders: Number(c.commanderOrders || 0),
      pans: Number(c.pans || 0),
      pinches: Number(c.pinches || 0),
      recenters: Number(c.recenters || 0),
      pointerCancels: Number(c.pointerCancels || 0),
      contextLosses: Number(c.contextLosses || 0)
    };
  };
  const delta = (a,b) => ({
    commanderOrders:b.commanderOrders-a.commanderOrders,
    pans:b.pans-a.pans,
    pinches:b.pinches-a.pinches,
    recenters:b.recenters-a.recenters,
    pointerCancels:b.pointerCancels-a.pointerCancels,
    contextLosses:b.contextLosses-a.contextLosses
  });
  const fmt = ms => {
    const s = Math.max(0, Math.ceil(ms/1000));
    return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  };
  const standalone = () => !!(matchMedia('(display-mode: standalone)').matches || navigator.standalone);
  const landscape = () => innerWidth >= innerHeight;

  function coverage() {
    if (!run) return null;
    const d = delta(run.baseline, counters());
    const lanes = laneCounts;
    const cancelsSafe = cancelRecords.every(r => r.safety === 'pass' && r.recoverySeen === true);
    return {
      stress: core()?.preset === 'stress' || window.__LW_DIAGNOSTICS__?.preset === 'stress',
      pans: d.pans >= MIN.pans,
      pinches: d.pinches >= MIN.pinches,
      commanderOrders: d.commanderOrders >= MIN.commanderOrders,
      recenter: d.recenters >= MIN.recenters,
      north: lanes.north >= 1,
      mid: lanes.mid >= 1,
      south: lanes.south >= 1,
      cancelSafety: cancelsSafe,
      noContextLoss: d.contextLosses === 0,
      lifecycleClean: lifecycleFailures.length === 0
    };
  }

  function activityText() {
    if (!run) return 'Not started';
    const d = delta(run.baseline, counters());
    return `Pan ${d.pans}/${MIN.pans} · pinch ${d.pinches}/${MIN.pinches} · orders ${d.commanderOrders}/${MIN.commanderOrders} · recenter ${d.recenters}/${MIN.recenters} · lanes N${laneCounts.north} M${laneCounts.mid} S${laneCounts.south}`;
  }

  function cancelText() {
    if (!cancelRecords.length) return 'No raw pointercancel observed — acceptable';
    const pass = cancelRecords.filter(r=>r.safety==='pass' && r.recoverySeen).length;
    const bad = cancelRecords.filter(r=>r.safety==='fail').length;
    const pending = cancelRecords.length - pass - bad;
    return `Cancels ${cancelRecords.length} · safe+recovered ${pass} · pending ${pending} · failures ${bad}`;
  }

  function update() {
    activityEl.textContent = activityText();
    cancelEl.textContent = cancelText();
    if (!run) return;
    const elapsed = performance.now() - run.startedPerf;
    timerEl.textContent = fmt(REQUIRED_MS - elapsed);
    const cov = coverage();
    document.querySelectorAll('[data-regression-coverage]').forEach(el => {
      const key = el.dataset.regressionCoverage;
      const ok = !!cov?.[key];
      el.classList.toggle('done', ok);
      const mark = el.querySelector('b');
      if (mark) mark.textContent = ok ? '✓' : '○';
    });
    const timeDone = elapsed >= REQUIRED_MS;
    const complete = timeDone && Object.values(cov).every(Boolean);
    if (complete && run.state === 'running') {
      run.state = 'completed';
      run.completedAt = new Date().toISOString();
      status.textContent = 'PASS candidate — 3m complete and all declared input criteria satisfied. Export evidence.';
      status.classList.add('pass');
      exportButton.disabled = false;
    } else if (run.state === 'running' && timeDone) {
      status.textContent = '3m reached — keep interacting until every required item and any post-cancel recovery is green.';
    }
  }

  function validateSetup() {
    const problems = [];
    if (!standalone()) problems.push('Open the installed PWA');
    if (!landscape()) problems.push('Rotate to landscape');
    if (!window.__LW_CANCEL_REMEDIATION__?.installed) problems.push('Cancel remediation not installed');
    if (!window.__LW_AUDIO_UNLOCKED__) problems.push('Tap Enable sound first');
    if (!checks.hud.checked) problems.push('Confirm HUD/safe areas clear');
    if (!checks.input.checked) problems.push('Confirm ordinary input feels clean');
    if (!checks.audio.checked) problems.push('Confirm tone was audible');
    return problems;
  }

  function begin() {
    const problems = validateSetup();
    if (problems.length) {
      status.textContent = problems.join(' · ');
      status.classList.remove('pass');
      return;
    }
    document.querySelector('[data-preset="stress"]')?.click();
    document.getElementById('projectileToggle').checked = true;
    document.getElementById('projectileToggle').dispatchEvent(new Event('change',{bubbles:true}));
    laneCounts = {north:0, mid:0, south:0};
    cancelRecords = [];
    lifecycleFailures = [];
    const now = performance.now();
    run = {
      runId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      state:'running',
      startedAt:new Date().toISOString(),
      startedPerf:now,
      baseline:counters(),
      initial:{viewport:[innerWidth,innerHeight],orientation:screen.orientation?.type||null,standalone:standalone(),userAgent:navigator.userAgent},
      declaration
    };
    startButton.disabled = true;
    exportButton.disabled = true;
    status.textContent = 'RUNNING — stay foreground + landscape. Keep ordinary pans, pinches, deliberate moves, recenter and lane jumps going for 3 minutes.';
    status.classList.remove('pass');
    update();
  }

  document.addEventListener('pointerdown', e => {
    if (!run || run.state !== 'running' || e.target !== canvas) return;
    observedPointers.set(e.pointerId,{startX:e.clientX,startY:e.clientY,maxTravel:0,downAt:performance.now()});
  }, true);
  document.addEventListener('pointermove', e => {
    const p = observedPointers.get(e.pointerId);
    if (!p) return;
    p.maxTravel = Math.max(p.maxTravel, Math.hypot(e.clientX-p.startX,e.clientY-p.startY));
  }, true);
  document.addEventListener('pointerup', e => observedPointers.delete(e.pointerId), true);
  document.addEventListener('pointercancel', e => {
    if (!run || run.state !== 'running' || e.target !== canvas) return;
    const p = observedPointers.get(e.pointerId) || null;
    observedPointers.delete(e.pointerId);
    const before = counters();
    const record = {
      tMs:Math.round(performance.now()-run.startedPerf), pointerId:e.pointerId, pointerType:e.pointerType,
      durationMs:p ? Math.round(performance.now()-p.downAt) : null,
      maxTravelPx:p ? Math.round(p.maxTravel*10)/10 : null,
      before, hadCaptureAtEvent:canvas.hasPointerCapture?.(e.pointerId) || false,
      safety:'pending', recoverySeen:false
    };
    cancelRecords.push(record);
    setTimeout(() => {
      const after = counters();
      record.after250ms = after;
      record.commanderOrderDelta = after.commanderOrders - before.commanderOrders;
      record.hasCaptureAfter250ms = canvas.hasPointerCapture?.(e.pointerId) || false;
      record.safety = record.commanderOrderDelta === 0 && !record.hasCaptureAfter250ms ? 'pass' : 'fail';
      record.recoveryBaseline = after.pans + after.pinches + after.commanderOrders;
      if (record.safety === 'fail') {
        run.state = 'failed';
        run.failedAt = new Date().toISOString();
        run.failure = 'pointer-cancel-safety-failure';
        status.textContent = 'FAILED — pointercancel caused an order or retained pointer capture.';
        exportButton.disabled = false;
      }
      update();
    },250);
  }, true);

  setInterval(() => {
    if (run?.state === 'running') {
      const c = counters();
      const activity = c.pans + c.pinches + c.commanderOrders;
      for (const r of cancelRecords) {
        if (r.safety === 'pass' && !r.recoverySeen && r.recoveryBaseline != null && activity > r.recoveryBaseline) r.recoverySeen = true;
      }
    }
    update();
  },200);

  document.querySelectorAll('.lane').forEach(btn => btn.addEventListener('click', () => {
    if (!run || run.state !== 'running') return;
    const n = Number(btn.dataset.lane);
    if (n===0) laneCounts.north++; else if (n===1) laneCounts.mid++; else if (n===2) laneCounts.south++;
  }));
  document.addEventListener('visibilitychange', () => {
    if (run?.state === 'running' && document.visibilityState !== 'visible') lifecycleFailures.push({tMs:Math.round(performance.now()-run.startedPerf),type:'visibility-hidden'});
  });
  window.addEventListener('orientationchange', () => {
    if (run?.state === 'running') setTimeout(()=>{ if (!landscape()) lifecycleFailures.push({tMs:Math.round(performance.now()-run.startedPerf),type:'portrait'}); },100);
  });

  function exportEvidence() {
    if (!run) return;
    const now = performance.now();
    const current = counters();
    const payload = {
      schema:1,
      build:BUILD,
      coreBuild:'M0-0.1.1',
      designBaseline:'1.7',
      declarationId:DECLARATION_ID,
      runId:run.runId,
      runState:run.state,
      startedAt:run.startedAt,
      endedAt:new Date().toISOString(),
      elapsedMs:Math.round(now-run.startedPerf),
      declarationSnapshot:declaration,
      initial:run.initial,
      remediation:window.__LW_CANCEL_REMEDIATION__ || null,
      baselineCounters:run.baseline,
      finalCounters:current,
      runCounterDelta:delta(run.baseline,current),
      laneJumpsByLane:laneCounts,
      pointerCancels:cancelRecords,
      lifecycleFailures,
      coverage:coverage(),
      manualChecks:{hudClear:checks.hud.checked,inputClean:checks.input.checked,audioHeard:checks.audio.checked},
      diagnostics:window.__LW_DIAGNOSTICS__ || null,
      coreFrameSummary:core()?.frame ? {
        samples:core().frame.samples,
        maxMs:core().frame.maxMs,
        over33ms:core().frame.over33ms,
        over50ms:core().frame.over50ms
      } : null,
      retainedLongRunEvidence:'LW-0A-001',
      supersededDeclaration:'LW-0A-002'
    };
    const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=`lane-warden-${BUILD}-${DECLARATION_ID}-evidence-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000);
  }

  startButton.addEventListener('click',begin);
  exportButton.addEventListener('click',exportEvidence);
  window.__LW_REGRESSION_DECLARATION__ = declaration;
  update();
})();
