(() => {
  'use strict';

  const LANES=['north','mid','south'];
  const $=id=>document.getElementById(id);
  const laneButton=id=>document.querySelector(`.lane[data-lane="${id}"]`);

  function battleSeconds(){
    const text=$('timer')?.textContent?.trim()||'';
    const m=text.match(/^(\d+):(\d{2})$/);
    return m?Number(m[1])*60+Number(m[2]):null;
  }

  function pct(id){
    const text=$(id)?.textContent||'';
    if(text.includes('✕'))return 0;
    const m=text.match(/B(\d+)/);
    return m?Number(m[1]):null;
  }

  function threatLane(){
    const p=$('dangerPointer');
    if(!p||p.hidden||getComputedStyle(p).display==='none')return null;
    if((p.dataset.severity||'')==='info')return null;
    const label=(p.getAttribute('aria-label')||'')+' '+($('dangerPointerLabel')?.textContent||'');
    return LANES.find(l=>new RegExp(`\\b${l}\\b`,'i').test(label))||null;
  }

  function addStyle(){
    const style=document.createElement('style');
    style.id='t6-051-ui-style';
    style.textContent=`
      #laneStrip{overflow:visible!important}
      #t6OrientationKey{position:absolute;left:50%;top:-27px;transform:translateX(-50%);height:22px;display:flex;align-items:center;gap:10px;padding:0 9px;border-radius:9px;background:rgba(12,20,25,.94);border:1px solid rgba(147,185,199,.28);box-shadow:0 3px 12px rgba(0,0,0,.28);white-space:nowrap;pointer-events:none;color:#c8d4d2;font:800 8px/1 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.05em;transition:opacity .22s ease}
      #t6OrientationKey[hidden]{display:none!important}
      #t6OrientationKey .you{color:#efc34e}#t6OrientationKey .rival{color:#ef685f}#t6OrientationKey .frontkey{color:#9fd0c9}
      #t6OrientationKey i{display:inline-block;width:18px;height:4px;border-radius:999px;background:#9fd0c9;vertical-align:middle;margin-right:3px;box-shadow:0 0 5px rgba(159,208,201,.28)}

      #northBastion,#midBastion,#southBastion{position:relative!important;overflow:hidden!important;outline:1px solid rgba(255,255,255,.08);outline-offset:0;transition:outline-color .15s ease,box-shadow .15s ease,transform .15s ease}
      #northBastion::after,#midBastion::after,#southBastion::after{content:'';position:absolute;left:0;bottom:0;height:3px;width:var(--t6-bastion-fill,100%);background:var(--t6-bastion-color,#7ccfbe);box-shadow:0 0 5px var(--t6-bastion-color,#7ccfbe);transition:width .18s linear,background .18s linear}
      #northBastion.t6-shortest-clock,#midBastion.t6-shortest-clock,#southBastion.t6-shortest-clock{outline:2px solid rgba(239,195,78,.9);box-shadow:0 0 0 2px rgba(239,195,78,.12),0 0 9px rgba(239,195,78,.34);transform:translateY(-1px)}

      #dangerPointer.severity-alert #dangerPointerLabel{position:absolute!important;left:39px!important;top:50%!important;transform:translateY(-50%)!important;width:auto!important;height:24px!important;min-width:34px!important;padding:0 7px!important;margin:0!important;overflow:visible!important;clip:auto!important;clip-path:none!important;white-space:nowrap!important;border:1px solid rgba(var(--alert-rgb,215,182,75),.7)!important;border-radius:8px!important;background:rgba(12,20,25,.96)!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#fff!important;font:900 9px/1 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;letter-spacing:.09em!important;text-shadow:none!important;box-shadow:0 2px 8px rgba(0,0,0,.34)!important;pointer-events:none!important}
      .lane.t6-threat-owner{outline:2px solid rgba(var(--t6-threat-rgb,232,132,47),.92)!important;outline-offset:-2px!important;box-shadow:inset 0 0 0 2px rgba(var(--t6-threat-rgb,232,132,47),.11),0 0 11px rgba(var(--t6-threat-rgb,232,132,47),.25)!important}
      .lane.t6-threat-owner .lane-name::after{content:' !';color:rgb(var(--t6-threat-rgb,232,132,47));font-weight:1000}

      @media(max-width:900px){#t6OrientationKey{gap:7px;padding:0 7px;font-size:7px;top:-25px;height:20px}#dangerPointer.severity-alert #dangerPointerLabel{left:38px!important;min-width:32px!important;height:22px!important;font-size:8px!important}}
      @media(max-height:350px){#t6OrientationKey{top:-23px;height:18px;font-size:7px}}
      @media(prefers-reduced-motion:reduce){#t6OrientationKey,#northBastion,#midBastion,#southBastion{transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  function addOrientationKey(){
    const strip=$('laneStrip');
    if(!strip||$('t6OrientationKey'))return;
    const key=document.createElement('div');
    key.id='t6OrientationKey';
    key.hidden=true;
    key.setAttribute('aria-hidden','true');
    key.innerHTML='<span class="you">◆ YOU</span><span class="rival">✦ RIVAL</span><span class="frontkey"><i></i>YOUR FRONT</span>';
    strip.appendChild(key);
  }

  function updateOrientation(){
    const key=$('t6OrientationKey');
    if(!key)return;
    const deployment=$('deployment');
    const t=battleSeconds();
    const battleLive=!!deployment&&deployment.hidden&&t!==null;
    key.hidden=!(battleLive&&t<=80);
  }

  function updateBastions(){
    const values=[];
    for(const lane of LANES){
      const el=$(`${lane}Bastion`);
      const value=pct(`${lane}Bastion`);
      if(!el||value===null)continue;
      values.push([lane,value]);
      el.style.setProperty('--t6-bastion-fill',`${Math.max(0,Math.min(100,value))}%`);
      const color=value<=30?'#e95e55':value<=55?'#e8842f':value<=80?'#d7b64b':'#7ccfbe';
      el.style.setProperty('--t6-bastion-color',color);
      el.dataset.bastionPct=String(value);
      el.setAttribute('aria-label',`Bastion ${value} percent`);
      el.classList.remove('t6-shortest-clock');
    }
    if(values.length<2)return;
    values.sort((a,b)=>a[1]-b[1]);
    if(values[0][1]<99&&values[1][1]-values[0][1]>=3){
      $(`${values[0][0]}Bastion`)?.classList.add('t6-shortest-clock');
    }
  }

  function updateThreatOwnership(){
    const p=$('dangerPointer');
    const owner=threatLane();
    for(const lane of LANES){
      const b=laneButton(lane);if(!b)continue;
      b.classList.remove('t6-threat-owner');
      b.style.removeProperty('--t6-threat-rgb');
    }
    if(!p||!owner)return;
    const severity=p.dataset.severity||'watch';
    const rgb=severity==='critical'?'216,74,67':severity==='urgent'?'232,132,47':'215,182,75';
    const b=laneButton(owner);
    if(b){b.classList.add('t6-threat-owner');b.style.setProperty('--t6-threat-rgb',rgb);}
    p.dataset.t6Lane=owner;
    const label=$('dangerPointerLabel');
    if(label)label.textContent=owner.toUpperCase();
  }

  function updateShell(){
    document.title='Lane Warden — Test 6 Global Awareness v0.5.1';
    const brand=document.querySelector('.brand span');if(brand)brand.textContent='TEST 6 GLOBAL AWARENESS · 0.5.1';
    const fixture=$('fixture');if(fixture)fixture.textContent='T6-0.5.1';
    const structural=document.querySelector('.structural-note');if(structural)structural.textContent='Same LW-T6-001 thresholds. New read aids: Bastion clocks compare visually, threat alerts name their lane, and the opening legend teaches ◆ / ✦ / front.';
    const note=$('deployNote');if(note)note.textContent='LW-T6-001 unchanged: Middle temptation · 1× · eight live lane-identification prompts.';
  }

  function tick(){
    updateOrientation();
    updateBastions();
    updateThreatOwnership();
  }

  function install(){
    if(!document.querySelector('.lane')||!$('timer')){setTimeout(install,80);return;}
    addStyle();
    addOrientationKey();
    updateShell();
    tick();
    setInterval(tick,120);
  }

  install();
})();
