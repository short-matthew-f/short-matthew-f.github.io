(() => {
  'use strict';

  const BUILD='T7-0.6.0';
  const DECLARATION='LW-T7-001';
  const CATEGORIES=['commander','guard','presence','mobHealth','bastion','gate'];
  const TRIALS=[
    {category:'commander',treatment:'A',question:'Which marker is your Commander?',answers:['A','B','C'],correct:'B'},
    {category:'guard',treatment:'B',question:'Which Guard line is making net progress?',answers:['NORTH','MID','SOUTH'],correct:'MID'},
    {category:'presence',treatment:'A',question:'Which allied unit is inside Presence?',answers:['A','B','C'],correct:'B'},
    {category:'mobHealth',treatment:'B',question:'Which ordinary unit is badly wounded?',answers:['A','B','C'],correct:'B'},
    {category:'bastion',treatment:'A',question:'Which Bastion is in the critical clock state?',answers:['NORTH','MID','SOUTH'],correct:'NORTH'},
    {category:'gate',treatment:'B',question:'What is the Gate state right now?',answers:['SHIELDED','VULNERABLE'],correct:'VULNERABLE'},
    {category:'commander',treatment:'B',question:'Which marker is your Commander?',answers:['A','B','C'],correct:'B'},
    {category:'guard',treatment:'A',question:'Which Guard line is making net progress?',answers:['NORTH','MID','SOUTH'],correct:'MID'},
    {category:'presence',treatment:'B',question:'Which allied unit is inside Presence?',answers:['A','B','C'],correct:'B'},
    {category:'mobHealth',treatment:'A',question:'Which ordinary unit is badly wounded?',answers:['A','B','C'],correct:'B'},
    {category:'bastion',treatment:'B',question:'Which Bastion is in the critical clock state?',answers:['NORTH','MID','SOUTH'],correct:'NORTH'},
    {category:'gate',treatment:'A',question:'What is the Gate state right now?',answers:['SHIELDED','VULNERABLE'],correct:'VULNERABLE'}
  ];
  const THRESHOLDS=Object.freeze({trials:12,candidateCorrect:6,candidateMedianMaxSeconds:4,candidateMaxOverSix:1,overallMinCorrect:11,minTapTarget:44});
  const state={index:0,responses:[],startedAt:null,completedAt:null,shownAt:0,device:null,layoutSamples:[],crowding:{A:null,B:null},preference:null,note:''};
  const $=id=>document.getElementById(id);

  const categoryNames={commander:'COMMANDER IDENTITY',guard:'GUARD THRESHOLD',presence:'PRESENCE',mobHealth:'ORDINARY HEALTH',bastion:'BASTION URGENCY',gate:'GATE VULNERABILITY'};
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function device(){return{userAgent:navigator.userAgent,standalone:!!navigator.standalone||matchMedia('(display-mode: standalone)').matches,language:navigator.language,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1,orientation:innerWidth>=innerHeight?'landscape':'portrait'}};}
  function r1(n){return +n.toFixed(1);}
  function rect(el){if(!el)return null;const r=el.getBoundingClientRect();return{x:r1(r.x),y:r1(r.y),width:r1(r.width),height:r1(r.height),right:r1(r.right),bottom:r1(r.bottom)};}

  function unit(x,label,{enemy=false,commander=false,denseCommander=false,health=null,wounded=false}={}){
    const cls=['unit',enemy?'enemy':'',commander?'commander':''].filter(Boolean).join(' ');
    const glyph=denseCommander?'C':(commander?'◆':'');
    let h=`<span class="${cls}" style="left:${x}%;top:50%"><span class="glyph">${glyph}</span></span>`;
    if(label)h+=`<span class="candidate-label" style="left:${x}%;top:23%">${label}</span>`;
    if(health!==null){h+=`<span class="health ${wounded?'low':''}" style="left:${x}%;top:calc(50% + 11px)"><i style="width:${health}%"></i></span><span class="health-num" style="left:${x}%;top:calc(50% + 17px)">${health}%</span>`;}
    return h;
  }
  function contextualHealth(x,label,hp){return `${unit(x,label,{})}<span class="health low" style="left:${x}%;top:calc(50% + 11px)"><i style="width:${hp}%"></i></span><span class="wounded-tag" style="left:${x}%;top:calc(50% + 18px)">WOUNDED</span>`;}
  function noise(){return `<span class="dense-noise" style="left:40%;top:8%">SPD 1.08</span><span class="dense-noise" style="left:58%;bottom:7%">DMG 12</span><span class="dense-noise" style="left:74%;top:10%">RNG 8</span>`;}
  function lane(id,content=''){return `<div class="lane-row" data-lane="${id}"><span class="lane-label">${id.toUpperCase()}</span><span class="route"></span><span class="gate-post"></span>${content}</div>`;}

  function commanderScene(t){
    const dense=t==='A';
    const row=[
      unit(32,'A',{health:dense?74:null}),
      unit(52,'B',{commander:!dense,denseCommander:dense,health:dense?88:null}),
      unit(71,'C',{health:dense?63:null}), dense?noise():''
    ].join('');
    return lane('north',dense?noise():'')+lane('mid',row)+lane('south',dense?noise():'');
  }
  function presenceScene(t){
    const dense=t==='A';
    let row=`<span class="presence-ring ${dense?'dense':''}" style="left:49%;top:50%;width:36%;height:82%"></span>`;
    row+=unit(23,'A',{health:dense?82:null});
    row+=unit(55,'B',{health:dense?71:null});
    row+=unit(77,'C',{health:dense?94:null});
    row+=unit(49,null,{commander:!dense,denseCommander:dense,health:dense?91:null});
    if(!dense)row+=`<span class="buff-dot" style="left:55%;top:50%"></span>`;
    if(dense)row+=noise();
    return lane('north',dense?noise():'')+lane('mid',row)+lane('south',dense?noise():'');
  }
  function mobScene(t){
    const dense=t==='A';
    let row='';
    if(dense){row+=unit(34,'A',{health:78});row+=unit(53,'B',{health:18,wounded:true});row+=unit(72,'C',{health:64});row+=noise();}
    else{row+=unit(34,'A');row+=contextualHealth(53,'B',18);row+=unit(72,'C');}
    return lane('north',dense?noise():'')+lane('mid',row)+lane('south',dense?noise():'');
  }
  function bastionContent(id,t){
    const data={north:{hp:22,state:'CRITICAL',cls:'critical',pips:1},mid:{hp:58,state:'WATCH',cls:'watch',pips:2},south:{hp:81,state:'STABLE',cls:'good',pips:3}}[id];
    if(t==='A')return `<span class="structure ${id==='north'?'critical':''}" style="left:18%;top:52%"><b>BASTION</b><span class="sbar"><i style="width:${data.hp}%"></i></span><span class="exact">HP ${data.hp}% · −${id==='north'?9:id==='mid'?4:2}/s</span></span>${noise()}`;
    return `<span class="structure" style="left:18%;top:52%;color:${id==='north'?'var(--critical)':id==='mid'?'var(--watch)':'var(--good)'}"><span class="state-tag ${data.cls}">${id==='north'?'! ':''}${data.state}</span><span class="clock-pips">${[1,2,3].map(n=>`<i class="${n<=data.pips?'on':''}"></i>`).join('')}</span></span>`;
  }
  function bastionScene(t){return ['north','mid','south'].map(id=>lane(id,bastionContent(id,t))).join('');}
  function guardContent(id,t){
    const d={north:{hp:64,to:67,state:'REGENERATING',cls:'regen'},mid:{hp:61,to:55,state:'NET PROGRESS',cls:'progressing'},south:{hp:49,to:49,state:'STALLING',cls:'stall'}}[id];
    if(t==='A')return `<span class="structure" style="left:70%;top:52%"><b>GUARD</b><span class="sbar"><i style="width:${d.hp}%"></i></span><span class="exact">${d.hp}% → ${d.to}% · R+${id==='north'?6:id==='mid'?2:4}</span></span>${noise()}`;
    return `<span class="structure" style="left:70%;top:52%"><span class="state-tag ${d.cls}">${id==='north'?'↗ ':id==='mid'?'↘ ':'↔ '}${d.state}</span></span>`;
  }
  function guardScene(t){return ['north','mid','south'].map(id=>lane(id,guardContent(id,t))).join('');}
  function gateScene(t){
    const dense=t==='A';
    let mid='';
    if(dense){mid+=`<span class="gate-state" style="right:40px"><span class="shield">◇</span><b>GATE HP 82%</b><small>SHIELD 0 · BREACH 1 · GUARD N 0</small></span>`+noise();}
    else{mid+=`<span class="gate-state" style="right:40px;color:var(--critical)"><span class="shield">◈</span><b>BREACH OPEN</b><small>GATE VULNERABLE</small></span>`;}
    return lane('north',dense?noise():'')+lane('mid',mid)+lane('south',dense?noise():'');
  }
  function sceneFor(category,t){
    if(category==='commander')return commanderScene(t);
    if(category==='guard')return guardScene(t);
    if(category==='presence')return presenceScene(t);
    if(category==='mobHealth')return mobScene(t);
    if(category==='bastion')return bastionScene(t);
    return gateScene(t);
  }

  function captureLayout(){
    const answerRects=[...document.querySelectorAll('.answer')].map(rect);
    const scene=rect($('scenePanel')),q=rect(document.querySelector('.question-panel'));
    const minW=answerRects.length?Math.min(...answerRects.map(r=>r.width)):0;
    const minH=answerRects.length?Math.min(...answerRects.map(r=>r.height)):0;
    const overflow=[scene,q,...answerRects].some(r=>!r||r.x<-1||r.y<-1||r.right>innerWidth+1||r.bottom>innerHeight+1);
    return{viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1},scene,questionPanel:q,minAnswerWidth:r1(minW),minAnswerHeight:r1(minH),overflow};
  }

  function renderTrial(){
    const tr=TRIALS[state.index];
    $('progress').textContent=`${state.index+1} / ${TRIALS.length}`;
    $('treatmentLabel').textContent=`TREATMENT ${tr.treatment}`;
    $('sceneTreatment').textContent=`TREATMENT ${tr.treatment}`;
    $('categoryLabel').textContent=categoryNames[tr.category];
    $('question').textContent=tr.question;
    $('battlefield').innerHTML=sceneFor(tr.category,tr.treatment);
    $('answers').innerHTML=tr.answers.map(a=>`<button class="answer" type="button" data-answer="${escape(a)}">${escape(a)}</button>`).join('');
    document.querySelectorAll('.answer').forEach(b=>b.onclick=()=>answer(b.dataset.answer));
    state.shownAt=performance.now();
    requestAnimationFrame(()=>state.layoutSamples.push({trial:state.index+1,...captureLayout()}));
  }

  function answer(selected){
    const tr=TRIALS[state.index];
    const seconds=(performance.now()-state.shownAt)/1000;
    state.responses.push({index:state.index+1,category:tr.category,treatment:tr.treatment,question:tr.question,correctAnswer:tr.correct,selectedAnswer:selected,correct:selected===tr.correct,responseSeconds:+seconds.toFixed(3)});
    state.index++;
    document.querySelectorAll('.answer').forEach(b=>b.disabled=true);
    if(state.index>=TRIALS.length){state.completedAt=new Date().toISOString();setTimeout(showFinish,180);}
    else setTimeout(renderTrial,180);
  }

  function median(xs){if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
  function score(){
    const b=state.responses.filter(r=>r.treatment==='B'),all=state.responses;
    const bCorrect=b.filter(r=>r.correct).length,overall=all.filter(r=>r.correct).length;
    const bMedian=median(b.filter(r=>r.correct).map(r=>r.responseSeconds));
    const bSlow=b.filter(r=>r.responseSeconds>6).length;
    const categoryFloor=CATEGORIES.every(c=>all.some(r=>r.category===c&&r.correct));
    const layoutPass=state.layoutSamples.length>=TRIALS.length&&state.layoutSamples.every(x=>!x.overflow&&x.minAnswerWidth>=THRESHOLDS.minTapTarget&&x.minAnswerHeight>=THRESHOLDS.minTapTarget);
    const checks={coverage:all.length===THRESHOLDS.trials,candidateRecognition:bCorrect>=THRESHOLDS.candidateCorrect,candidateMedian:bMedian!==null&&bMedian<=THRESHOLDS.candidateMedianMaxSeconds,candidateSlowTail:bSlow<=THRESHOLDS.candidateMaxOverSix,overallErrorGuard:overall>=THRESHOLDS.overallMinCorrect,categoryFloor,phoneLayout:layoutPass,redundantCriticalEncoding:true};
    return{verdict:Object.values(checks).every(Boolean)?'PASS':'FAIL',checks,metrics:{completed:all.length,overallCorrect:overall,overallAccuracy:all.length?+(overall/all.length).toFixed(3):0,treatmentA:{correct:all.filter(r=>r.treatment==='A'&&r.correct).length,total:6,medianSeconds:median(all.filter(r=>r.treatment==='A'&&r.correct).map(r=>r.responseSeconds))},treatmentB:{correct:bCorrect,total:6,medianSeconds:bMedian===null?null:+bMedian.toFixed(3),overSixSeconds:bSlow},byCategory:Object.fromEntries(CATEGORIES.map(c=>[c,{correct:all.filter(r=>r.category===c&&r.correct).length,total:2}])),crowding:state.crowding,preference:state.preference},layoutSamples:state.layoutSamples};
  }

  function showFinish(){
    $('finish').hidden=false;
    $('scoreSummary').textContent='12 trials recorded. Rate visual crowding before exporting the evidence.';
    document.querySelectorAll('[data-rating]').forEach(row=>{row.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>{row.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');state.crowding[row.dataset.rating]=i+1;});});
    document.querySelectorAll('[data-pref]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-pref]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');state.preference=b.dataset.pref;});
  }

  function exportEvidence(){
    state.note=$('note').value.trim();
    const s=score();
    $('finishTitle').textContent=`TEST 7 COMPLETE · ${s.verdict}`;
    $('scoreSummary').textContent=`${s.metrics.overallCorrect}/12 correct · Treatment B ${s.metrics.treatmentB.correct}/6 · median ${s.metrics.treatmentB.medianSeconds??'—'}s · ${s.verdict}`;
    const doc={schema:1,declarationId:DECLARATION,build:BUILD,designBaseline:'1.7',test:'Test 7 — Information Legibility',question:'What information must remain on the battlefield itself?',device:state.device,thresholds:THRESHOLDS,trialOrder:TRIALS.map(({category,treatment})=>({category,treatment})),startedAt:state.startedAt,completedAt:state.completedAt,responses:state.responses,postTest:{crowding:state.crowding,preference:state.preference,note:state.note},finalScore:s,exportedAt:new Date().toISOString(),note:'Treatment A is the dense/persistent descriptive control. Treatment B is the causal/contextual candidate. Preference/crowding are descriptive, not pass/fail.'};
    const blob=new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`lane-warden-${DECLARATION}-${BUILD}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  $('start').onclick=()=>{state.startedAt=new Date().toISOString();state.device=device();$('intro').hidden=true;renderTrial();};
  $('export').onclick=exportEvidence;
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
