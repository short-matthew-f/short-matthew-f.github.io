(() => {
  'use strict';

  const BUILD='T6-0.5.0';
  const DECLARATION='LW-T6-001';
  const REQUIRED=['commander','rival','front','bastion','guard','threat'];
  const PLAN=['commander','rival','front','bastion','guard','threat','front','bastion'];
  const LANES=['north','mid','south'];
  const THRESHOLDS=Object.freeze({questions:8,minCorrect:7,medianCorrectMaxSeconds:4,maxCorrectOverSixSeconds:2,maxCameraTaxPrompts:1,maxIncorrect:1,minTapTarget:44});

  const test={
    installed:false,
    armed:false,
    active:null,
    responses:[],
    cancellations:[],
    nextAt:25,
    promptIndex:0,
    startedAt:null,
    completedAt:null,
    cameraTax:false,
    cameraTaxReasons:[],
    pointerStarts:new Map(),
    layoutAtStart:null,
    badgeLayout:null,
    device:null,
    timer:null,
    originalLaneHandlers:new Map(),
    originalStart:null
  };

  const $=id=>document.getElementById(id);
  const laneButton=id=>document.querySelector(`.lane[data-lane="${id}"]`);
  const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return{x:+r.x.toFixed(1),y:+r.y.toFixed(1),width:+r.width.toFixed(1),height:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)};};
  const intersects=(a,b)=>!!a&&!!b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  const isVisible=el=>!!el&&!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';

  function battleTime(){
    const t=$('timer')?.textContent?.trim()||'';
    const m=t.match(/^(\d+):(\d{2})$/);
    return m?Number(m[1])*60+Number(m[2]):null;
  }

  function pctFrom(text,prefix){
    if(!text)return null;
    if(text.includes('✕'))return 0;
    const m=text.match(new RegExp(prefix+'(\\d+)'));
    return m?Number(m[1]):null;
  }

  function lanes(){
    return Object.fromEntries(LANES.map(id=>{
      const front=$(`${id}Front`);
      return [id,{
        commander:($(`${id}Commander`)?.textContent||'').includes('◆'),
        rival:($(`${id}Rival`)?.textContent||'').includes('✦'),
        bastion:pctFrom($(`${id}Bastion`)?.textContent,'B'),
        guard:pctFrom($(`${id}Guard`)?.textContent,'G'),
        pressure:($(`${id}Pressure`)?.textContent||'').trim(),
        front:front?parseFloat(front.style.width||'0')||0:0
      }];
    }));
  }

  function uniqueBy(values,mode,gap){
    const arr=Object.entries(values).filter(([,v])=>Number.isFinite(v));
    if(arr.length<2)return null;
    arr.sort((a,b)=>mode==='min'?a[1]-b[1]:b[1]-a[1]);
    return Math.abs(arr[0][1]-arr[1][1])>=gap?arr[0][0]:null;
  }

  function threatLane(){
    const p=$('dangerPointer');
    if(!isVisible(p))return null;
    const severity=p.dataset.severity||'';
    if(severity==='info')return null;
    const label=(p.getAttribute('aria-label')||'')+' '+($('dangerPointerLabel')?.textContent||'');
    return LANES.find(l=>new RegExp(`\\b${l}\\b`,'i').test(label))||null;
  }

  function answerFor(category){
    const s=lanes();
    if(category==='commander'){
      const hits=LANES.filter(l=>s[l].commander);
      return hits.length===1?hits[0]:null;
    }
    if(category==='rival'){
      const hits=LANES.filter(l=>s[l].rival);
      return hits.length===1?hits[0]:null;
    }
    if(category==='front')return uniqueBy(Object.fromEntries(LANES.map(l=>[l,s[l].front])),'max',5);
    if(category==='bastion'){
      if(!LANES.some(l=>s[l].bastion!==null&&s[l].bastion<99))return null;
      return uniqueBy(Object.fromEntries(LANES.map(l=>[l,s[l].bastion])),'min',3);
    }
    if(category==='guard'){
      const broken=LANES.filter(l=>s[l].guard===0);
      if(broken.length===1)return broken[0];
      if(!LANES.some(l=>s[l].guard!==null&&s[l].guard<98))return null;
      return uniqueBy(Object.fromEntries(LANES.map(l=>[l,s[l].guard])),'min',5);
    }
    if(category==='threat')return threatLane();
    return null;
  }

  function question(category){
    return ({
      commander:'Where is your Commander?',
      rival:'Where is the Rival Commander?',
      front:'Which lane has your furthest-advanced front?',
      bastion:'Which Bastion is on the shortest clock?',
      guard:'Which lane has made the most Guard progress?',
      threat:'Which lane owns the active offscreen threat alert?'
    })[category];
  }

  function addStyle(){
    const style=document.createElement('style');
    style.id='test6-style';
    style.textContent=`
      :root{--t6-alert-left:16px;--t6-alert-top:55vh}
      #dangerPointer.severity-alert{left:var(--t6-alert-left)!important;top:var(--t6-alert-top)!important;right:auto!important;bottom:auto!important}
      .front em{font-style:normal!important;font-size:15px!important;font-weight:900!important;color:#efc34e!important;text-shadow:0 0 2px #101518,0 0 7px rgba(239,195,78,.55)!important}
      .front strong{font-size:15px!important;font-weight:900!important;color:#ef685f!important;text-shadow:0 0 2px #101518,0 0 7px rgba(239,104,95,.62)!important}
      #t6Prompt{position:fixed;z-index:950;left:50%;transform:translateX(-50%);width:min(560px,calc(100vw - 340px));min-width:300px;padding:9px 13px;border-radius:14px;background:rgba(12,20,25,.96);border:1px solid rgba(147,185,199,.45);box-shadow:0 7px 28px rgba(0,0,0,.42);pointer-events:none;color:#edf3f2}
      #t6Prompt[hidden]{display:none!important}#t6Prompt .t6row{display:flex;gap:12px;align-items:center;justify-content:space-between}#t6Prompt small{font-size:9px;letter-spacing:.12em;color:#91aaa8;font-weight:800}#t6Prompt b{font-size:14px;letter-spacing:.01em}#t6Prompt em{font-style:normal;font-size:10px;color:#d6b35b;white-space:nowrap}
      #t6Done{position:fixed;z-index:960;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 86px);padding:9px 11px;border-radius:13px;background:rgba(12,20,25,.97);border:1px solid rgba(124,211,190,.55);box-shadow:0 7px 26px rgba(0,0,0,.42);display:flex;gap:10px;align-items:center;color:#edf3f2}
      #t6Done[hidden]{display:none!important}#t6Done b{font-size:11px;letter-spacing:.08em}#t6Done button{min-height:40px;padding:0 13px;border-radius:10px;font-weight:800}
      .lane.t6-answer-ready{box-shadow:inset 0 0 0 1px rgba(214,179,91,.25)}
      @media(max-width:900px){#t6Prompt{width:min(430px,calc(100vw - 300px));min-width:270px;padding:7px 10px}#t6Prompt b{font-size:12px}#t6Done{bottom:calc(env(safe-area-inset-bottom,0px) + 78px)}}
    `;
    document.head.appendChild(style);
  }

  function addUI(){
    const prompt=document.createElement('section');
    prompt.id='t6Prompt';prompt.hidden=true;prompt.setAttribute('aria-live','assertive');
    prompt.innerHTML='<div class="t6row"><div><small>TEST 6 · TAP A LANE</small><br><b id="t6Question">Global awareness</b></div><em id="t6Progress">0 / 8</em></div>';
    document.body.appendChild(prompt);
    const done=document.createElement('section');
    done.id='t6Done';done.hidden=true;done.innerHTML='<b id="t6DoneText">TEST 6 COMPLETE</b><button id="t6Export" type="button">EXPORT TEST 6</button>';
    document.body.appendChild(done);
    $('t6Export').onclick=exportTest;
  }

  function positionTestUI(){
    const objective=document.querySelector('.objective')?.getBoundingClientRect();
    const rival=$('rivalIntent')?.getBoundingClientRect();
    const prompt=$('t6Prompt');
    if(prompt){
      const top=Math.max((objective?.bottom||105)+8,(rival?.bottom||0)+8);
      prompt.style.top=`${Math.round(top)}px`;
    }
    const strip=$('laneStrip')?.getBoundingClientRect();
    if(strip){
      const left=Math.max(8,strip.left+8);
      const top=Math.max((objective?.bottom||100)+8,strip.top-58);
      document.documentElement.style.setProperty('--t6-alert-left',`${Math.round(left)}px`);
      document.documentElement.style.setProperty('--t6-alert-top',`${Math.round(top)}px`);
    }
  }

  function captureLayout(){
    const strip=$('laneStrip');
    const p=$('dangerPointer');
    const brand=document.querySelector('.brand');
    const pr=p?.getBoundingClientRect();
    const br=brand?.getBoundingClientRect();
    const laneRects=Object.fromEntries(LANES.map(l=>[l,rect(laneButton(l))]));
    const visibleControls=['labToggle','actionsToggle','t6Prompt'].map(id=>$(id)).filter(isVisible).map(el=>({id:el.id,rect:rect(el)}));
    const sr=strip?.getBoundingClientRect();
    return {
      viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1,orientation:innerWidth>=innerHeight?'landscape':'portrait'},
      laneStrip:rect(strip),lanes:laneRects,
      severityBadge:isVisible(p)?rect(p):null,
      brand:rect(brand),
      badgeOverlapsBrand:isVisible(p)&&pr&&br?intersects(pr,br):false,
      visibleControlOverlapsLaneStrip:sr?visibleControls.filter(x=>{const r=$(x.id)?.getBoundingClientRect();return r?intersects(r,sr):false;}).map(x=>x.id):[]
    };
  }

  function captureDevice(){
    return {
      declared:'iPhone 15 Pro · iOS 26.6 · installed standalone PWA',
      userAgent:navigator.userAgent,
      standalone:!!navigator.standalone||matchMedia('(display-mode: standalone)').matches,
      language:navigator.language,
      viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1}
    };
  }

  function markCameraTax(reason){
    if(!test.active)return;
    test.cameraTax=true;
    if(!test.cameraTaxReasons.includes(reason))test.cameraTaxReasons.push(reason);
  }

  function installCameraObservers(){
    const canvas=$('battlefield');
    if(canvas){
      canvas.addEventListener('pointerdown',e=>{
        if(!test.active)return;
        test.pointerStarts.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(test.pointerStarts.size>=2)markCameraTax('pinch');
      },true);
      canvas.addEventListener('pointermove',e=>{
        if(!test.active)return;
        const p=test.pointerStarts.get(e.pointerId);if(!p)return;
        if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>12)markCameraTax('pan');
      },true);
      const end=e=>test.pointerStarts.delete(e.pointerId);
      canvas.addEventListener('pointerup',end,true);canvas.addEventListener('pointercancel',end,true);
    }
    $('recenterButton')?.addEventListener('click',()=>markCameraTax('recenter'),true);
    $('dangerPointer')?.addEventListener('click',()=>markCameraTax('attention-focus'),true);
  }

  function installLaneAnswers(){
    LANES.forEach(l=>{
      const b=laneButton(l);if(!b)return;
      test.originalLaneHandlers.set(l,b.onclick);
      b.onclick=function(ev){
        if(test.active){recordAnswer(l);return false;}
        const original=test.originalLaneHandlers.get(l);
        return typeof original==='function'?original.call(this,ev):undefined;
      };
    });
  }

  function cancelActive(reason){
    if(!test.active)return;
    test.cancellations.push({category:test.active.category,correctLane:test.active.correctLane,shownAtBattle:test.active.battleTime,reason,elapsed:+((performance.now()-test.active.startedPerf)/1000).toFixed(3)});
    test.active=null;test.cameraTax=false;test.cameraTaxReasons=[];
    $('t6Prompt').hidden=true;
    document.querySelectorAll('.lane').forEach(x=>x.classList.remove('t6-answer-ready'));
  }

  function showPrompt(category,correctLane,simTime){
    test.cameraTax=false;test.cameraTaxReasons=[];
    test.active={category,correctLane,battleTime:simTime,startedPerf:performance.now(),cameraStart:captureLayout().viewport};
    $('t6Question').textContent=question(category);
    $('t6Progress').textContent=`${test.responses.length+1} / ${THRESHOLDS.questions}`;
    $('t6Prompt').hidden=false;
    document.querySelectorAll('.lane').forEach(x=>x.classList.add('t6-answer-ready'));
  }

  function recordAnswer(selectedLane){
    const a=test.active;if(!a)return;
    const responseSeconds=(performance.now()-a.startedPerf)/1000;
    const item={
      index:test.responses.length+1,
      category:a.category,
      question:question(a.category),
      correctLane:a.correctLane,
      selectedLane,
      correct:selectedLane===a.correctLane,
      responseSeconds:+responseSeconds.toFixed(3),
      battleTime:a.battleTime,
      cameraTax:test.cameraTax,
      cameraTaxReasons:[...test.cameraTaxReasons]
    };
    test.responses.push(item);
    test.active=null;test.cameraTax=false;test.cameraTaxReasons=[];
    $('t6Question').textContent='Recorded';
    $('t6Progress').textContent=`${test.responses.length} / ${THRESHOLDS.questions}`;
    document.querySelectorAll('.lane').forEach(x=>x.classList.remove('t6-answer-ready'));
    setTimeout(()=>{if(!test.active)$('t6Prompt').hidden=true;},420);
    const now=battleTime()||a.battleTime;
    test.nextAt=now+16;
    if(test.responses.length>=THRESHOLDS.questions)complete();
  }

  function currentPromptStillValid(){
    if(!test.active)return true;
    const current=answerFor(test.active.category);
    return current===test.active.correctLane;
  }

  function tick(){
    positionTestUI();
    const p=$('dangerPointer');
    if(isVisible(p))test.badgeLayout=captureLayout();
    if(!test.armed||test.completedAt)return;
    const sim=battleTime();if(sim===null)return;
    if(test.active){
      if(!answerFor('commander')){cancelActive('player-commander-unavailable');test.nextAt=sim+5;return;}
      if(!currentPromptStillValid()){cancelActive('state-changed-before-answer');test.nextAt=sim+3;return;}
      return;
    }
    if(test.responses.length>=THRESHOLDS.questions)return;
    if(sim<test.nextAt)return;
    const category=PLAN[test.responses.length];
    const correct=answerFor(category);
    if(correct)showPrompt(category,correct,sim);
  }

  function median(xs){if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}

  function layoutVerdict(layout){
    const lanesOkay=LANES.every(l=>{const r=layout?.lanes?.[l];return r&&r.width>0&&r.height>=44&&r.x>=0&&r.right<=innerWidth+1;});
    const badge=layout?.severityBadge;
    const badgeOkay=badge&&badge.width>=THRESHOLDS.minTapTarget&&badge.height>=THRESHOLDS.minTapTarget&&!layout.badgeOverlapsBrand;
    const noLaneOverlap=(layout?.visibleControlOverlapsLaneStrip||[]).length===0;
    return{lanesOkay:!!lanesOkay,badgeOkay:!!badgeOkay,noLaneOverlap,pass:!!lanesOkay&&!!badgeOkay&&noLaneOverlap};
  }

  function score(){
    const correct=test.responses.filter(r=>r.correct);
    const categorySet=new Set(test.responses.map(r=>r.category));
    const coverage=PLAN.length===test.responses.length&&REQUIRED.every(c=>categorySet.has(c));
    const med=median(correct.map(r=>r.responseSeconds));
    const slow=correct.filter(r=>r.responseSeconds>6).length;
    const cameraTax=test.responses.filter(r=>r.cameraTax).length;
    const incorrect=test.responses.filter(r=>!r.correct).length;
    const layout=test.badgeLayout||captureLayout();
    const lv=layoutVerdict(layout);
    const checks={
      coverage,
      accuracy:correct.length>=THRESHOLDS.minCorrect,
      medianCorrect:med!==null&&med<=THRESHOLDS.medianCorrectMaxSeconds,
      slowTail:slow<=THRESHOLDS.maxCorrectOverSixSeconds,
      cameraTax:cameraTax<=THRESHOLDS.maxCameraTaxPrompts,
      laneTargeting:incorrect<=THRESHOLDS.maxIncorrect,
      layout:lv.pass
    };
    return{
      verdict:Object.values(checks).every(Boolean)?'PASS':'FAIL',
      checks,
      metrics:{completed:test.responses.length,correct:correct.length,incorrect,accuracy:test.responses.length?+(correct.length/test.responses.length).toFixed(3):0,medianCorrectSeconds:med===null?null:+med.toFixed(3),correctOverSixSeconds:slow,cameraTaxPrompts:cameraTax,categories:[...categorySet],layout:lv},
      layout
    };
  }

  function complete(){
    test.completedAt=new Date().toISOString();
    $('t6Prompt').hidden=true;
    const s=score();
    $('t6DoneText').textContent=`TEST 6 COMPLETE · ${s.verdict}`;
    $('t6Done').hidden=false;
  }

  function exportTest(){
    const s=score();
    const doc={
      schema:1,
      declarationId:DECLARATION,
      build:BUILD,
      designBaseline:'1.7',
      frozenGameplayBase:'M1-0.4.3 / R02-D over R02-C parameters',
      fixture:'R-02-STRUCTURAL',
      parameterRevision:'R02-C',
      declaredDevice:'iPhone 15 Pro · iOS 26.6 · installed standalone PWA',
      observedDevice:test.device,
      thresholds:THRESHOLDS,
      plan:PLAN,
      startedAt:test.startedAt,
      completedAt:test.completedAt,
      responses:test.responses,
      cancellations:test.cancellations,
      layoutAtStart:test.layoutAtStart,
      finalScore:s,
      exportedAt:new Date().toISOString(),
      note:'Device-scoped formal Test 6 evidence. PASS does not close the broader smallest-supported-iPhone requirement unless this device is the declared support floor or the same thresholds reproduce there.'
    };
    const blob=new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`lane-warden-${DECLARATION}-${BUILD}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function arm(){
    test.armed=true;test.startedAt=new Date().toISOString();test.responses=[];test.cancellations=[];test.active=null;test.nextAt=25;test.completedAt=null;test.badgeLayout=null;
    $('t6Done').hidden=true;$('t6Prompt').hidden=true;
    test.layoutAtStart=captureLayout();
  }

  function lockFormalConfig(){
    const middle=document.querySelector('[data-deploy-preset="middleTemptation"]');
    if(middle&&!middle.classList.contains('active'))middle.click();
    document.querySelectorAll('[data-deploy-preset]').forEach(b=>{b.disabled=true;b.title='LW-T6-001 freezes Middle temptation';});
    const speed=$('simSpeed');if(speed){speed.value='1';speed.disabled=true;speed.title='LW-T6-001 is preregistered at 1×';}
    const note=$('deployNote');if(note)note.textContent='LW-T6-001: Middle temptation · 1× · eight live lane-identification prompts.';
  }

  function updateShell(){
    document.title='Lane Warden — Test 6 Global Awareness v0.5.0';
    const brand=document.querySelector('.brand span');if(brand)brand.textContent='TEST 6 GLOBAL AWARENESS · 0.5.0';
    const label=document.querySelector('.objective-copy .label');if(label)label.textContent='LW-T6-001 · FORMAL DEVICE-SCOPED';
    const lab=$('labToggle');if(lab)lab.textContent='LAB · TEST 6';
    const fixture=$('fixture');if(fixture)fixture.textContent='T6-0.5.0';
    const deployLabel=document.querySelector('.deploy-head .label');if(deployLabel)deployLabel.textContent='TEST 6 · GLOBAL AWARENESS / LANE STRIP';
    const h=document.querySelector('.deploy-head h1');if(h)h.textContent='Read the Whole Battle';
    const ps=document.querySelectorAll('.deploy-head p');if(ps[0])ps[0].textContent='Gameplay is frozen from R02-D. This run measures whether the global information layer lets you identify important offscreen state without camera housekeeping.';
    const structural=document.querySelector('.structural-note');if(structural)structural.textContent='Middle temptation and 1× are locked. When TEST 6 asks a question, tap NORTH / MID / SOUTH in the lane strip. The battle keeps running.';
    const labCopy=document.querySelector('#labPanel p');if(labCopy)labCopy.textContent='Formal LW-T6-001. Simulation speed is locked at 1×; Test 6 exports separate preregistered evidence.';
  }

  function install(){
    if(test.installed)return;
    const laneReady=LANES.every(l=>typeof laneButton(l)?.onclick==='function');
    if(!laneReady||typeof $('startBattle')?.onclick!=='function'){setTimeout(install,100);return;}
    test.installed=true;
    addStyle();addUI();updateShell();positionTestUI();lockFormalConfig();installCameraObservers();installLaneAnswers();
    test.device=captureDevice();
    test.originalStart=$('startBattle').onclick;
    $('startBattle').onclick=function(ev){
      const result=test.originalStart.call(this,ev);
      setTimeout(()=>{if($('deployment').hidden)arm();},180);
      return result;
    };
    addEventListener('resize',()=>{positionTestUI();if(test.armed&&!test.completedAt)test.layoutAtStart=test.layoutAtStart||captureLayout();});
    test.timer=setInterval(tick,180);
    if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  install();
})();
