(() => {
  'use strict';
  const BASE_LOADER='../lane-warden-r02-v0.4.2/main-loader.js';

  function required(text,from,to,label){
    if(!text.includes(from))throw new Error('R02-D wrapper sentinel mismatch: '+label);
    return text.replace(from,to);
  }

  function installShell(){
    document.title='Lane Warden — R-02 Severity Alerts v0.4.3';
    const brand=document.querySelector('.brand span');if(brand)brand.textContent='R-02 SEVERITY ALERTS · 0.4.3';
    const objectiveLabel=document.querySelector('.objective-copy .label');if(objectiveLabel)objectiveLabel.textContent='R02-D · ATT-002';
    const labToggle=document.getElementById('labToggle');if(labToggle)labToggle.textContent='LAB · R02-D';
    const fixture=document.getElementById('fixture');if(fixture)fixture.textContent='R02-D';
    const deployLabel=document.querySelector('.deploy-head .label');if(deployLabel)deployLabel.textContent='R-02 STRUCTURAL SPIKE · R02-D';
    const deployTitle=document.querySelector('.deploy-head h1');if(deployTitle)deployTitle.textContent='Attention You Can See';
    const deployCopy=document.querySelector('.deploy-head p');if(deployCopy)deployCopy.textContent='R02-C proved selectable reform anchors work. R02-D freezes that gameplay and replaces the hard-to-see edge threat marker with a compact severity alert.';
    const structural=document.querySelector('.structural-note');if(structural)structural.textContent='Grey = info · yellow = watch · orange = urgent · red = critical. Tap the pulsing ! to focus the threatened lane.';
    const resultLabel=document.querySelector('#battleResult .label');if(resultLabel)resultLabel.textContent='R02-D EXPLORATORY';
    const labCopy=document.querySelector('#labPanel p');if(labCopy)labCopy.textContent='R02-C gameplay and REFORM-001 are frozen. ATT-002 only: safe-area severity badge with a 48px tap target and severity-scaled pulse.';

    const pointer=document.getElementById('dangerPointer');
    const glyph=document.getElementById('dangerArrow');
    if(pointer){pointer.classList.add('severity-alert','severity-watch');pointer.setAttribute('aria-label','Focus threatened lane');}
    if(glyph){glyph.textContent='!';glyph.classList.add('severity-glyph');}

    const style=document.createElement('style');
    style.id='att002-severity-style';
    style.textContent=`
      #attentionLayer{position:fixed!important;inset:0!important;z-index:1000!important;overflow:visible!important;pointer-events:none!important}
      #dangerPointer.severity-alert{position:fixed!important;left:calc(env(safe-area-inset-left,0px) + 8px)!important;top:calc(env(safe-area-inset-top,0px) + 8px)!important;right:auto!important;bottom:auto!important;transform:none!important;width:48px!important;height:48px!important;min-width:48px!important;min-height:48px!important;margin:0!important;padding:0!important;border:0!important;border-radius:50%!important;background:transparent!important;box-shadow:none!important;display:grid!important;place-items:center!important;overflow:visible!important;pointer-events:auto!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;cursor:pointer!important;color:#fff!important}
      #dangerPointer.severity-alert[hidden]{display:none!important}
      #dangerPointer.severity-alert::before{content:'';position:absolute;width:30px;height:30px;border-radius:50%;background:var(--alert-bg,#d7b64b);border:2px solid rgba(255,255,255,.9);box-shadow:0 0 0 3px rgba(var(--alert-rgb,215,182,75),.18),0 3px 12px rgba(0,0,0,.42);transform:scale(1)}
      #dangerPointer.severity-alert .severity-glyph{position:relative!important;z-index:2!important;display:block!important;width:auto!important;height:auto!important;line-height:1!important;font:900 22px/1 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;color:#fff!important;transform:translateY(-.5px)!important;text-shadow:0 1px 2px rgba(0,0,0,.45)!important}
      #dangerPointer.severity-alert #dangerPointerLabel{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
      #dangerPointer.severity-info{--alert-bg:#667078;--alert-rgb:102,112,120}
      #dangerPointer.severity-watch{--alert-bg:#d7b64b;--alert-rgb:215,182,75}
      #dangerPointer.severity-urgent{--alert-bg:#e8842f;--alert-rgb:232,132,47}
      #dangerPointer.severity-critical{--alert-bg:#d84a43;--alert-rgb:216,74,67}
      @keyframes lwSeverityPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 3px rgba(var(--alert-rgb),.16),0 3px 12px rgba(0,0,0,.42)}50%{transform:scale(1.18);box-shadow:0 0 0 9px rgba(var(--alert-rgb),0),0 3px 14px rgba(0,0,0,.48)}}
      #dangerPointer.severity-watch::before{animation:lwSeverityPulse 2.4s ease-in-out infinite}
      #dangerPointer.severity-urgent::before{animation:lwSeverityPulse 1.45s ease-in-out infinite}
      #dangerPointer.severity-critical::before{animation:lwSeverityPulse .95s ease-in-out infinite}
      #dangerPointer.severity-alert.acknowledged::before{animation-play-state:paused!important;transform:scale(.92)!important}
      @media(prefers-reduced-motion:reduce){#dangerPointer.severity-alert::before{animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  async function boot(){
    installShell();
    const res=await fetch(BASE_LOADER,{cache:'no-store'});
    if(!res.ok)throw new Error('Could not load R02-C runtime loader: '+res.status);
    let loader=await res.text();

    loader=required(loader,'R02-C runtime patch sentinel mismatch','R02-D runtime patch sentinel mismatch','runtime label');
    loader=required(loader,"lane-warden:M1-0.4.2:R02-C:recovery:v1","lane-warden:M1-0.4.3:R02-D:recovery:v1",'recovery namespace');
    loader=required(loader,'exploratory R02-C REFORM-001 isolation over frozen R02-B combat pacing; not formal acceptance evidence','exploratory R02-D ATT-002 severity-alert isolation over frozen R02-C reform/gameplay; not formal acceptance evidence','evidence label');
    loader=required(loader,"note:'R02-C REFORM-001 over frozen R02-B pressure'","note:'R02-D ATT-002 over frozen R02-C reform/gameplay'",'battle-start note');
    loader=required(loader,'R02-C runtime parse/boot failure','R02-D runtime parse/boot failure','parse label');
    loader=required(loader,"if(h)h.textContent='R02-C boot failed';","if(h)h.textContent='R02-D boot failed';",'fatal label');

    const oldAttention="function attention(title,detail,lane,severity='warning'){attentionLane=lane;$('dangerToastTitle').textContent=title;$('dangerToastDetail').textContent=detail;$('dangerToast').hidden=false;$('dangerToast').dataset.severity=severity;$('dangerPointerLabel').textContent=lane?`${lane.toUpperCase()} ${severity==='critical'?'CRITICAL':'THREAT'}`:'THREAT';$('dangerPointer').hidden=false;clearTimeout(attentionTimer);attentionTimer=setTimeout(()=>{$('dangerToast').hidden=true;},4200);}";
    const newAttention="function attentionSeverity(title,severity){if(['info','watch','urgent','critical'].includes(severity))return severity;if(title.includes('WAYPOINT')||title.startsWith('REFORM ANCHOR')||title==='REFORM LOCKED')return 'info';if(title.includes('BASTION CRITICAL')||title.includes('COMMANDER ENDANGERED')||title.includes('BREACH OPEN'))return 'urgent';if(title.includes('BASTION LOST')||title.includes('COMMANDER INCAPACITATED')||title.includes('CORE'))return 'critical';return severity==='critical'?'critical':'watch';}\n  function attention(title,detail,lane,severity='warning'){const level=attentionSeverity(title,severity);attentionLane=lane;$('dangerToastTitle').textContent=title;$('dangerToastDetail').textContent=detail;$('dangerToast').hidden=false;$('dangerToast').dataset.severity=(level==='urgent'||level==='critical')?'critical':'warning';$ ('dangerToast').dataset.alertSeverity=level;const pointer=$('dangerPointer');pointer.classList.remove('severity-info','severity-watch','severity-urgent','severity-critical','acknowledged');pointer.classList.add('severity-alert','severity-'+level);pointer.dataset.severity=level;pointer.setAttribute('aria-label',lane?`${title}. Focus ${lane.toUpperCase()} lane.`:title);$('dangerPointerLabel').textContent=lane?`${lane.toUpperCase()} ${level.toUpperCase()}`:level.toUpperCase();pointer.hidden=false;ev('attention-shown',{lane,severity:level,title});clearTimeout(attentionTimer);attentionTimer=setTimeout(()=>{$('dangerToast').hidden=true;},4200);}";
    const oldClick="$('dangerPointer').onclick=()=>{if(!attentionLane)return;focusLane(attentionLane,'attention');currentRun.metrics.attentionFocus++;ev('attention-focus',{lane:attentionLane});};";
    const newClick="$('dangerPointer').onclick=()=>{if(!attentionLane)return;focusLane(attentionLane,'attention');currentRun.metrics.attentionFocus++;ev('attention-focus',{lane:attentionLane,severity:$('dangerPointer').dataset.severity||null});const p=$('dangerPointer');p.classList.add('acknowledged');setTimeout(()=>p.classList.remove('acknowledged'),1400);};";
    const oldClaims="structuralClaims:{threeLanes:true,unitCapacity:8,towerCapacity:6,authoredJunctions:true,rivalLifecycle:true,rivalLaneStripMarker:true,orderedGuardLineModel:true,deterministicRecovery:true}";
    const newClaims="structuralClaims:{threeLanes:true,unitCapacity:8,towerCapacity:6,authoredJunctions:true,rivalLifecycle:true,rivalLaneStripMarker:true,orderedGuardLineModel:true,deterministicRecovery:true,attentionSeverityBadge:true}";
    const marker="    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));";
    const injection=[
      '    // ATT-002: compact safe-area severity badge. Gameplay remains frozen.',
      `    source=patch(source,${JSON.stringify(oldAttention)},${JSON.stringify(newAttention)},'ATT-002 severity attention');`,
      `    source=patch(source,${JSON.stringify(oldClick)},${JSON.stringify(newClick)},'ATT-002 acknowledgement');`,
      `    source=patch(source,${JSON.stringify(oldClaims)},${JSON.stringify(newClaims)},'ATT-002 evidence claim');`,
      '',
      marker
    ].join('\n');
    loader=required(loader,marker,injection,'ATT-002 injection');

    const url=URL.createObjectURL(new Blob([loader],{type:'text/javascript'}));
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(new Error('R02-D wrapper parse/boot failure'));document.body.appendChild(s);});
    URL.revokeObjectURL(url);
  }

  boot().catch(err=>{console.error(err);const fatal=document.getElementById('fatal');if(fatal){fatal.hidden=false;const h=fatal.querySelector('h1'),p=fatal.querySelector('p');if(h)h.textContent='R02-D boot failed';if(p)p.textContent=err.message;}});
})();
