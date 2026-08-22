(() => {
  'use strict';

  const BASE='../lane-warden-m0-v0.2.4/';
  const SOURCE=BASE+'main.js';
  const CAMERA_SENTINEL="const camera={x:-30,y:0,zoom:1,tilt:.38};";
  const DIAG_SENTINEL='  // ---- Diagnostics / evidence ----------------------------------------------';
  const STEP_SENTINEL='deriveLaneState();if(currentRun&&world.time>=currentRun.nextSnapshotAt)';
  const FRAME_SENTINEL='const dt=raw*simSpeed;simStep(dt);render();updateUI();';
  const VIS_SENTINEL="addEventListener('visibilitychange',()=>{if(currentRun)ev('visibility',{state:document.visibilityState});});";
  const BOOT_SENTINEL='renderDeployment();updateUI();requestAnimationFrame(animate);';
  const RETURN_SENTINEL="function returnToDeployment(){if(currentRun&&!currentRun.result&&phase==='battle')";
  const FINISH_SENTINEL="function finishBattle(result){if(world.result)return;";

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Failed to load '+src));
      document.body.appendChild(s);
    });
  }

  function loadSource(source){
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    return loadScript(url).finally(()=>URL.revokeObjectURL(url));
  }

  function requireReplace(source,needle,replacement,label){
    if(!source.includes(needle)) throw new Error('M0.5 runtime sentinel mismatch: '+label);
    return source.replace(needle,replacement);
  }

  const RECOVERY_PATCH = String.raw`
  // ---- M0.5 deterministic core / recovery ----------------------------------
  const SNAPSHOT_SCHEMA=1;
  const FIXED_DT=1/60;
  const RECOVERY_INTERVAL=5;
  const RECOVERY_KEY='lane-warden:M0-0.3.0:recovery:v1';
  const RNG_SEED=0x4c573031;
  let rngState=RNG_SEED>>>0;
  let fixedAccumulator=0;
  let lastRecoveryAt=-Infinity;
  let determinismProbe=false;
  const determinismEvents=[];
  const cloneState=v=>JSON.parse(JSON.stringify(v));

  function simRandom(){
    let x=rngState>>>0;
    x^=x<<13;x^=x>>>17;x^=x<<5;
    rngState=x>>>0;
    return rngState/4294967296;
  }
  function stableStringify(value){
    if(value===null||typeof value!=='object')return JSON.stringify(value);
    if(Array.isArray(value))return '['+value.map(stableStringify).join(',')+']';
    return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableStringify(value[k])).join(',')+'}';
  }
  function fnv1a(text){let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,'0');}
  function runStateForDigest(){
    if(!currentRun)return null;
    return {
      deployment:currentRun.deployment,
      parameterRevision:currentRun.parameterRevision,
      events:currentRun.events,
      snapshots:currentRun.snapshots,
      debrief:currentRun.debrief,
      metrics:currentRun.metrics,
      result:currentRun.result,
      nextSnapshotAt:currentRun.nextSnapshotAt
    };
  }
  function deterministicPayload(){return {
    actorSeq,projectileSeq,rngState,fixedAccumulator,phase,selectedLane,waypointTargeting,simSpeed,
    deployment,world,currentRun:runStateForDigest()
  };}
  function stateDigest(){return fnv1a(stableStringify(deterministicPayload()));}
  function recoveryStatus(text,kind='neutral'){
    const el=$('recoveryStatus');if(!el)return;el.textContent=text;el.dataset.kind=kind;
  }
  function snapshotBattle(reason='manual'){
    return {
      snapshotSchema:SNAPSHOT_SCHEMA,
      build:BUILD,
      designBaseline:'1.7',
      fixture:FIXTURE,
      parameterRevision:PARAM_REV,
      fixedDt:FIXED_DT,
      rngAlgorithm:'xorshift32-reserved',
      reason,
      savedAt:new Date().toISOString(),
      stateHash:stateDigest(),
      state:{
        actorSeq,projectileSeq,rngState,phase,selectedLane,waypointTargeting,simSpeed,fixedAccumulator,
        deployment:cloneState(deployment),world:cloneState(world),currentRun:currentRun?cloneState(currentRun):null,
        camera:{x:camera.x,y:camera.y,zoom:camera.zoom,tilt:camera.tilt},
        reserved:{rival:null,reclamation:null}
      },
      telemetry:{determinismEvents:cloneState(determinismEvents)}
    };
  }
  function compatibleSnapshot(snap){
    return !!snap&&snap.snapshotSchema===SNAPSHOT_SCHEMA&&snap.build===BUILD&&snap.fixture===FIXTURE&&snap.parameterRevision===PARAM_REV&&snap.fixedDt===FIXED_DT&&snap.state;
  }
  function clearRecovery(reason='clear'){
    if(determinismProbe)return;
    try{localStorage.removeItem(RECOVERY_KEY);}catch(_){}
    lastRecoveryAt=-Infinity;
    determinismEvents.push({type:'recovery-cleared',t:+world.time.toFixed(2),reason});
    recoveryStatus('No active recovery snapshot');
  }
  function persistRecovery(reason='interval'){
    if(determinismProbe||phase!=='battle'||world.result)return null;
    const snap=snapshotBattle(reason);
    try{
      localStorage.setItem(RECOVERY_KEY,JSON.stringify(snap));
      lastRecoveryAt=world.time;
      determinismEvents.push({type:'recovery-saved',t:+world.time.toFixed(2),reason,hash:snap.stateHash});
      recoveryStatus('Saved '+world.time.toFixed(1)+'s · '+snap.stateHash,'good');
      return snap;
    }catch(err){
      determinismEvents.push({type:'recovery-error',t:+world.time.toFixed(2),reason,message:String(err&&err.message||err)});
      recoveryStatus('Recovery save failed','bad');
      return null;
    }
  }
  function restoreSnapshot(snap,reason='manual'){
    if(!compatibleSnapshot(snap)){
      recoveryStatus('Incompatible recovery snapshot','bad');
      determinismEvents.push({type:'recovery-rejected',t:+world.time.toFixed(2),reason});
      return false;
    }
    const s=cloneState(snap.state);
    if(!determinismProbe&&Array.isArray(snap.telemetry?.determinismEvents)){
      determinismEvents.splice(0,determinismEvents.length,...cloneState(snap.telemetry.determinismEvents));
    }
    actorSeq=s.actorSeq;projectileSeq=s.projectileSeq;rngState=(s.rngState??RNG_SEED)>>>0;
    phase=s.phase;selectedLane=s.selectedLane;waypointTargeting=s.waypointTargeting;simSpeed=s.simSpeed;fixedAccumulator=s.fixedAccumulator||0;
    deployment=s.deployment;
    for(const k of Object.keys(world))delete world[k];
    Object.assign(world,s.world);
    currentRun=s.currentRun;
    if(currentRun){
      const i=evidence.runs.findIndex(r=>r.runId===currentRun.runId);
      if(i>=0)evidence.runs[i]=currentRun;else evidence.runs.push(currentRun);
    }
    if(s.camera){camera.x=s.camera.x;camera.y=s.camera.y;camera.zoom=s.camera.zoom;camera.tilt=s.camera.tilt;clampCamera();}
    $('deployment').hidden=phase!=='deploy';
    $('battleHud').hidden=phase!=='battle';
    $('battleResult').hidden=phase!=='ended';
    if($('simSpeed'))$('simSpeed').value=String(simSpeed);
    document.querySelectorAll('.lane[data-lane]').forEach(x=>x.classList.toggle('selected',x.dataset.lane===selectedLane));
    $('waypointButton')?.classList.toggle('active',waypointTargeting);
    const hash=stateDigest();
    const ok=hash===snap.stateHash;
    determinismEvents.push({type:'recovery-restored',t:+world.time.toFixed(2),reason,expected:snap.stateHash,actual:hash,exact:ok});
    recoveryStatus((ok?'Restored exact · ':'RESTORE MISMATCH · ')+hash,ok?'good':'bad');
    updateUI();
    return ok;
  }
  function latestRecovery(){try{const raw=localStorage.getItem(RECOVERY_KEY);return raw?JSON.parse(raw):null;}catch(_){return null;}}
  function maybeRestoreRecovery(){
    const snap=latestRecovery();if(!snap)return false;
    const ok=restoreSnapshot(snap,'boot');
    if(ok)lastRecoveryAt=world.time;
    return ok;
  }
  function runContinuation(steps){for(let i=0;i<steps&&phase==='battle'&&!world.result;i++)simStep(FIXED_DT);return stateDigest();}
  function runDeterminismCheck(){
    if(phase!=='battle'||world.result){recoveryStatus('Start a battle before self-check','bad');return null;}
    determinismProbe=true;
    const checkpoint=snapshotBattle('determinism-check');
    const roundTripBefore=checkpoint.stateHash;
    const restored=restoreSnapshot(checkpoint,'self-check-roundtrip');
    const roundTripAfter=stateDigest();
    const incompatibleRejected=!restoreSnapshot({...checkpoint,snapshotSchema:SNAPSHOT_SCHEMA+999},'self-check-incompatible');
    const probes=[600,1800];
    const results=[];
    for(const steps of probes){
      restoreSnapshot(checkpoint,'self-check-A');const a=runContinuation(steps);
      restoreSnapshot(checkpoint,'self-check-B');const b=runContinuation(steps);
      results.push({steps,seconds:+(steps*FIXED_DT).toFixed(3),a,b,exact:a===b});
    }
    restoreSnapshot(checkpoint,'self-check-restore');
    determinismProbe=false;
    const pass=restored&&roundTripBefore===roundTripAfter&&incompatibleRejected&&results.every(r=>r.exact);
    const report={type:'determinism-self-check',t:+world.time.toFixed(2),snapshotSchema:SNAPSHOT_SCHEMA,fixedDt:FIXED_DT,roundTrip:{before:roundTripBefore,after:roundTripAfter,exact:roundTripBefore===roundTripAfter},incompatibleRejected,continuations:results,pass};
    determinismEvents.push(report);
    persistRecovery('post-self-check');
    recoveryStatus(pass?'SELF-CHECK PASS · exact continuation':'SELF-CHECK FAIL · inspect export',pass?'good':'bad');
    return report;
  }
  function exportRecovery(){
    const snap=snapshotBattle('manual-export');
    const blob=new Blob([JSON.stringify(snap,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='lane-warden-'+BUILD+'-recovery-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  window.__LW_DETERMINISM__={
    patch:'DET-001',snapshotSchema:SNAPSHOT_SCHEMA,fixedDt:FIXED_DT,recoveryKey:RECOVERY_KEY,rngAlgorithm:'xorshift32-reserved',
    random:simRandom,
    snapshot:()=>({patch:'DET-001',snapshotSchema:SNAPSHOT_SCHEMA,fixedDt:FIXED_DT,rngState,stateHash:stateDigest(),events:determinismEvents.slice(),hasRecovery:!!latestRecovery()}),
    save:()=>persistRecovery('manual'),restore:()=>{const s=latestRecovery();return s?restoreSnapshot(s,'manual'):false;},clear:()=>clearRecovery('manual'),selfCheck:runDeterminismCheck
  };
  $('saveRecovery').onclick=()=>persistRecovery('manual');
  $('reloadRecovery').onclick=()=>{const s=latestRecovery();if(!s)recoveryStatus('No recovery snapshot','bad');else restoreSnapshot(s,'manual');};
  $('clearRecovery').onclick=()=>clearRecovery('manual');
  $('determinismCheck').onclick=runDeterminismCheck;
  $('exportRecovery').onclick=exportRecovery;
`;

  async function boot(){
    const res=await fetch(SOURCE,{cache:'no-store'});
    if(!res.ok)throw new Error('Could not load frozen R01-C runtime: '+res.status);
    let source=await res.text();

    source=requireReplace(source,CAMERA_SENTINEL,CAMERA_SENTINEL+"\n  window.__LW_ATT_CAMERA__=camera; window.__LW_ATT_FOCUS__=(x,y)=>{camera.x=x;camera.y=y;clampCamera();updateUI();};",'camera');
    source=requireReplace(source,DIAG_SENTINEL,RECOVERY_PATCH+'\n'+DIAG_SENTINEL,'recovery injection');
    source=requireReplace(source,STEP_SENTINEL,"deriveLaneState();if(world.time-lastRecoveryAt>=RECOVERY_INTERVAL)persistRecovery('interval');if(currentRun&&world.time>=currentRun.nextSnapshotAt)",'auto recovery cadence');
    source=requireReplace(source,FRAME_SENTINEL,"const dt=raw*simSpeed;if(!document.hidden&&!determinismProbe){fixedAccumulator+=dt;let guard=0;while(fixedAccumulator+1e-12>=FIXED_DT&&guard<20){simStep(FIXED_DT);fixedAccumulator-=FIXED_DT;guard++;}}render();updateUI();",'authoritative fixed step');
    source=requireReplace(source,VIS_SENTINEL,"addEventListener('visibilitychange',()=>{if(currentRun)ev('visibility',{state:document.visibilityState});if(document.hidden)persistRecovery('background');else last=performance.now();});addEventListener('pagehide',()=>persistRecovery('pagehide'));",'lifecycle pause');
    source=requireReplace(source,RETURN_SENTINEL,"function returnToDeployment(){clearRecovery('return-to-deployment');if(currentRun&&!currentRun.result&&phase==='battle')",'recovery clear on redeploy');
    source=requireReplace(source,FINISH_SENTINEL,"function finishBattle(result){if(world.result)return;clearRecovery('battle-ended');",'recovery clear on resolution');
    source=requireReplace(source,"tuningStatus:'exploratory human-test candidate; not shipping balance'","tuningStatus:'deterministic-core / Test 0b entry; R01-C gameplay tuning frozen'",'evidence status');
    source=requireReplace(source,BOOT_SENTINEL,'maybeRestoreRecovery();renderDeployment();updateUI();requestAnimationFrame(animate);','boot recovery');

    await loadSource(source);
    await loadScript(BASE+'decision-legibility.js');

    const attRes=await fetch(BASE+'attention-signaling.js',{cache:'no-store'});
    if(!attRes.ok)throw new Error('Could not load ATT-001 source: '+attRes.status);
    let att=await attRes.text();
    att=att.replace("doc.build==='M0-0.2.4'","doc.build===window.__LW_BUILD__");
    await loadSource(att);
    await loadScript('./determinism-telemetry.js');
  }

  boot().catch(err=>{
    console.error(err);
    const fatal=document.getElementById('fatal');
    if(fatal){fatal.hidden=false;const h=fatal.querySelector('h1');const p=fatal.querySelector('p');if(h)h.textContent='M0.5 boot failed';if(p)p.textContent=err.message;}
  });
})();
