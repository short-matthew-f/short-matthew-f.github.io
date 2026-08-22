(() => {
  'use strict';
  const PATCH='ATT-001';
  const $=id=>document.getElementById(id);
  const canvas=$('battlefield'),toast=$('dangerToast'),toastTitle=$('dangerToastTitle'),toastDetail=$('dangerToastDetail');
  const pointer=$('dangerPointer'),arrow=$('dangerArrow'),pointerLabel=$('dangerPointerLabel');
  if(!canvas||!toast||!pointer||!window.__LW_ATT_CAMERA__||!window.__LW_ATT_FOCUS__)return;
  const events=[];
  const damageAt={north:0,south:0};
  const previousPct={north:null,south:null};
  let activeKey=null,activeSeverity=0,toastUntil=0,lastFrame=0;
  const severityName=['none','warning','critical'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const simTime=()=>{const txt=$('timer')?.textContent||'0:00';if(txt==='ENDED')return events.length?events[events.length-1].t:0;const m=txt.match(/^(\d+):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):0;};
  const bastionPct=id=>{const text=$(`${id}Bastion`)?.textContent||'';if(/OPEN/.test(text))return 0;const m=text.match(/^B\s+(\d+)/);return m?Number(m[1])/100:1;};
  function updateDamageClock(id,now){const pct=bastionPct(id),prev=previousPct[id];if(prev!=null&&pct<prev-.001)damageAt[id]=now;previousPct[id]=pct;return pct;}
  function commanderTarget(){
    for(const id of ['north','south']){const el=$(`${id}Commander`);if(el?.textContent.trim()) {const p=parseFloat(el.style.left)||50;return {x:-74+(p/100)*139,y:id==='north'?11:-11};}}
    return {x:-46,y:11};
  }
  function phaseIsBattle(){return !$('battleHud')?.hidden && $('timer')?.textContent!=='ENDED';}
  function threatFor(now){
    if(!phaseIsBattle())return null;
    const coreValue=Number($('coreMeter')?.value??1), coreState=$('coreState')?.textContent||'';
    if(coreValue<.999||coreState==='UNDER FIRE'||coreState==='CRITICAL')return {key:'core-under-fire',severity:2,title:'CORE UNDER ATTACK',detail:'The sacrifice clock is now final.',label:'CORE',x:-86,y:0,z:3};
    for(const id of ['north','south'])if(/OPEN/.test($(`${id}Bastion`)?.textContent||''))return {key:`${id}-core-exposed`,severity:2,title:`${id.toUpperCase()} BASTION LOST`,detail:'Core exposed. Tap the marker to inspect.',label:'CORE EXPOSED',x:-86,y:0,z:3};
    const candidates=[];
    for(const id of ['north','south']){
      const pct=updateDamageClock(id,now),recent=now-damageAt[id]<=8000,y=id==='north'?11:-11;
      if(recent&&pct<=.35)candidates.push({key:`${id}-bastion-critical`,severity:2,title:`${id.toUpperCase()} BASTION CRITICAL`,detail:`${Math.round(pct*100)}% remaining · collapse is close.`,label:`${id.toUpperCase()} BASTION`,x:-74,y,z:2.4});
      else if(recent&&pct<=.75)candidates.push({key:`${id}-bastion-threat`,severity:1,title:`${id.toUpperCase()} BASTION UNDER PRESSURE`,detail:`${Math.round(pct*100)}% remaining · decide whether to answer it.`,label:`${id.toUpperCase()} BASTION`,x:-74,y,z:2.4});
    }
    if(($('objectiveText')?.textContent||'').includes('COMMANDER ENDANGERED')){const c=commanderTarget();candidates.push({key:'commander-critical',severity:1,title:'COMMANDER ENDANGERED',detail:'Low health. Reposition if this matters now.',label:'COMMANDER',x:c.x,y:c.y,z:2.2});}
    candidates.sort((a,b)=>b.severity-a.severity || (a.key.includes('critical')?-1:1));
    return candidates[0]||null;
  }
  function record(type,detail={}){events.push({type,t:simTime(),patch:PATCH,...detail});}
  function showToast(t){toastTitle.textContent=t.title;toastDetail.textContent=t.detail;toast.hidden=false;toastUntil=performance.now()+2600;}
  function clear(){activeKey=null;activeSeverity=0;pointer.hidden=true;if(performance.now()>=toastUntil)toast.hidden=true;}
  function project(x,y,z=2.4){
    const c=window.__LW_ATT_CAMERA__,r=canvas.getBoundingClientRect(),hw=36/c.zoom,aspect=Math.max(1,canvas.clientWidth/Math.max(1,canvas.clientHeight)),hy=hw/aspect;
    const sy=(y-c.y)*Math.cos(c.tilt)+z*Math.sin(c.tilt);
    const px=r.left+r.width*(.5+(x-c.x)/(2*hw)),py=r.top+r.height*(.5-sy/(2*hy));
    return {x:px,y:py,left:r.left,top:r.top,right:r.right,bottom:r.bottom};
  }
  function placePointer(t){
    const p=project(t.x,t.y,t.z),margin=30,targetX=p.x,targetY=p.y;
    const x=clamp(targetX,p.left+margin,p.right-margin),y=clamp(targetY,p.top+margin,p.bottom-margin);
    const on=targetX>=p.left+margin&&targetX<=p.right-margin&&targetY>=p.top+margin&&targetY<=p.bottom-margin;
    pointer.style.left=`${x}px`;pointer.style.top=`${y}px`;pointer.classList.toggle('onscreen',on);pointer.classList.toggle('critical',t.severity>=2);pointerLabel.textContent=t.label;
    if(on){arrow.textContent='!';arrow.style.transform='rotate(0deg)';}else{arrow.textContent='➤';arrow.style.transform=`rotate(${Math.atan2(targetY-y,targetX-x)*180/Math.PI}deg)`;}
    pointer.hidden=false;pointer.dataset.x=String(t.x);pointer.dataset.y=String(t.y);pointer.dataset.key=t.key;
  }
  pointer.addEventListener('click',()=>{const x=Number(pointer.dataset.x),y=Number(pointer.dataset.y),key=pointer.dataset.key||'threat';if(Number.isFinite(x)&&Number.isFinite(y)){window.__LW_ATT_FOCUS__(x,y);record('attention-focus-tap',{key,x,y});}});
  function frame(ts){
    if(ts-lastFrame<100){requestAnimationFrame(frame);return;}lastFrame=ts;
    const t=threatFor(ts);if(!t){clear();requestAnimationFrame(frame);return;}
    if(t.key!==activeKey||t.severity>activeSeverity){const previous=activeKey;activeKey=t.key;activeSeverity=t.severity;showToast(t);record('danger-cue',{key:t.key,severity:severityName[t.severity],title:t.title,previous});}
    placePointer(t);if(performance.now()>=toastUntil)toast.hidden=true;requestAnimationFrame(frame);
  }
  window.__LW_ATTENTION__={patch:PATCH,events,snapshot:()=>({patch:PATCH,events:events.slice(),activeKey})};
  const NativeBlob=window.Blob;
  window.Blob=function(parts=[],opts={}){let next=parts;if(opts&&opts.type==='application/json'&&typeof parts[0]==='string'){try{const doc=JSON.parse(parts[0]);if(doc&&doc.build==='M0-0.2.4'&&Array.isArray(doc.runs)){doc.attention={patch:PATCH,policy:'toast + world-locked edge/onscreen marker + tap-to-focus; no automatic camera seizure',events:events.slice()};doc.instrumentation={...(doc.instrumentation||{}),attention:PATCH};next=[JSON.stringify(doc,null,2)];}}catch(_){}}return new NativeBlob(next,opts);};
  window.Blob.prototype=NativeBlob.prototype;
  requestAnimationFrame(frame);
})();
