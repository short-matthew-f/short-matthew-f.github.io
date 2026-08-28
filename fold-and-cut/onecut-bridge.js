
  // Cross-version comparison bridge.
  const ONECUT_VERSION='v1', ONECUT_OTHER='v2';
  const ONECUT_SHARED_KEY='onecut-shared-shape-v1';
  let sharedSourcePayload=null, sharedToastTimer=null;

  function ensureCompareChrome(){
    if(!document.getElementById('onecutCompareStyle')){
      const s=document.createElement('style');s.id='onecutCompareStyle';s.textContent=`
        .top-actions{display:flex;align-items:center;gap:8px}
        .version-link{display:grid;place-items:center;height:38px;min-width:42px;padding:0 10px;border:1px solid var(--line,#d9d1c3);border-radius:999px;background:rgba(255,255,255,.52);color:var(--muted,#726d63);text-decoration:none;font-size:11px;font-weight:900;letter-spacing:.06em}
        .onecut-toast{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%) translateY(10px);width:min(560px,calc(100vw - 28px));z-index:99999;padding:12px 14px;border-radius:15px;background:rgba(37,35,31,.94);color:#fff;box-shadow:0 12px 32px rgba(0,0,0,.22);font-size:13px;line-height:1.35;font-weight:650;opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease}
        .onecut-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
        .onecut-toast.same{background:rgba(49,93,121,.96)}
        .onecut-toast.different{background:rgba(95,64,37,.96)}
        .onecut-toast.warn{background:rgba(145,54,40,.96)}
      `;document.head.appendChild(s);
    }
    let actions=document.querySelector('.top-actions');
    if(!actions){
      actions=document.createElement('div');actions.className='top-actions';
      const info=document.getElementById('infoBtn'),header=document.querySelector('.topbar');
      if(info&&header){header.insertBefore(actions,info);actions.appendChild(info);}
    }
    let link=document.getElementById('versionSwitchLink')||actions?.querySelector('.version-link');
    if(!link&&actions){
      link=document.createElement('a');link.className='version-link';actions.insertBefore(link,actions.firstChild);
    }
    if(link){
      link.id='versionSwitchLink';link.textContent=ONECUT_OTHER.toUpperCase();
      link.href='../fold-and-cut-v2/?carry=1&from=v1';link.setAttribute('aria-label','Open '+ONECUT_OTHER.toUpperCase());
    }
    if(!document.getElementById('onecutToast')){
      const t=document.createElement('div');t.id='onecutToast';t.className='onecut-toast';t.setAttribute('aria-live','polite');document.body.appendChild(t);
    }
    return link;
  }

  function showCompareToast(message,kind='same',ms=4800){
    const t=document.getElementById('onecutToast');if(!t)return;
    clearTimeout(sharedToastTimer);t.textContent=message;t.className='onecut-toast '+kind;
    requestAnimationFrame(()=>t.classList.add('show'));
    sharedToastTimer=setTimeout(()=>t.classList.remove('show'),ms);
  }

  function clonePts(arr){return Array.isArray(arr)?arr.map(p=>({x:Number(p.x),y:Number(p.y)})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)):[];}

  function currentComparison(){
    if(ONECUT_VERSION!=='v2'||!solution)return null;
    const p=solution.simpleV2;
    if(p?.valid)return{simpleValid:true,eligible:true,foldCount:p.ops?.length||0,reason:null};
    if(p)return{simpleValid:false,eligible:!!p.eligible,foldCount:0,reason:p.reason||solution.simpleV2Note||null};
    return{simpleValid:false,eligible:false,foldCount:0,reason:'V2 did not produce a simple-fold plan.'};
  }

  function saveSharedShape(){
    if(!points?.length)return false;
    let payload={source:ONECUT_VERSION,finished:mode==='demo'||!!solution,comparison:currentComparison(),timestamp:Date.now()};
    if(typeof coordinateRawPoints!=='undefined'&&coordinateRawPoints?.length){
      payload.inputMode='coordinates';payload.rawCoordinates=clonePts(coordinateRawPoints);
    }else{
      payload.inputMode='draw';
      try{payload.solverPoints=clonePts(toSolverPoints(points));}catch(e){console.warn('Could not canonicalize carried shape',e);}
    }
    if((payload.rawCoordinates?.length||payload.solverPoints?.length||0)<1)return false;
    localStorage.setItem(ONECUT_SHARED_KEY,JSON.stringify(payload));return true;
  }

  function fitSolverPointsToScreen(raw){
    const xs=raw.map(p=>p.x),ys=raw.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const w=Math.max(1e-9,maxX-minX),h=Math.max(1e-9,maxY-minY),r=paperRect(),pad=Math.max(34,Math.min(r.w,r.h)*.10),s=Math.min((r.w-2*pad)/w,(r.h-2*pad)/h),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    return raw.map(p=>({x:r.x+r.w/2+(p.x-cx)*s,y:r.y+r.h/2-(p.y-cy)*s}));
  }

  function comparisonMessage(payload){
    const c=payload?.comparison;
    if(!c)return null;
    if(c.simpleValid)return{
      kind:'different',
      text:'Different result: V2 has an explicit '+c.foldCount+'-fold simple sequence for this shape; V1 uses the general theorem construction.'
    };
    return{
      kind:'same',
      text:'Same route: V2 could not validate a simple-fold sequence for this shape, so it uses the same general theorem method as V1.'
    };
  }

  function destinationComparisonMessage(){
    if(ONECUT_VERSION==='v2'&&solution){
      const p=solution.simpleV2;
      if(p?.valid)return{kind:'different',text:'Different result: V2 found an explicit '+(p.ops?.length||0)+'-fold simple sequence. V1 uses the general theorem construction.'};
      const why=p?.reason||solution.simpleV2Note;
      return{kind:'same',text:'Same route: V2 cannot validate its simple-fold path for this shape, so it has fallen back to V1’s general theorem method.'+(why?' ('+why+')':'')};
    }
    if(ONECUT_VERSION==='v1'&&sharedSourcePayload?.comparison)return comparisonMessage(sharedSourcePayload);
    return null;
  }

  async function loadSharedShape(){
    const params=new URLSearchParams(location.search);
    if(params.get('carry')!=='1')return false;
    let payload;try{payload=JSON.parse(localStorage.getItem(ONECUT_SHARED_KEY)||'null');}catch(e){payload=null;}
    if(!payload||payload.source===ONECUT_VERSION)return false;
    sharedSourcePayload=payload;
    try{
      if(payload.inputMode==='coordinates'&&payload.rawCoordinates?.length){
        const raw=clonePts(payload.rawCoordinates),fitted=fitCoordinatePoints(raw);
        coordinateRawPoints=raw;coordinateSolverPoints=fitted.solverPts;points=fitted.screenPts;
      }else if(payload.solverPoints?.length){
        const raw=clonePts(payload.solverPoints);
        coordinateRawPoints=null;coordinateSolverPoints=raw;points=fitSolverPointsToScreen(raw);
      }else return false;
      mode='draw';solution=null;steps=[];stepIndex=0;
      ui.draw.classList.remove('hidden');ui.demo.classList.add('hidden');ui.badge.classList.add('hidden');ui.hint.classList.remove('hidden');ui.loading.classList.add('hidden');
      updateDrawUI();render();
      showCompareToast('Carried the same '+(payload.inputMode==='coordinates'?'coordinate polygon':'drawn polygon')+' from '+payload.source.toUpperCase()+'.','same',2600);
      if(payload.finished&&points.length>=3){
        setTimeout(async()=>{
          await finishBeforeBridge();
          if(mode==='demo'){
            const m=destinationComparisonMessage();if(m)showCompareToast(m.text,m.kind,6200);
          }else{
            showCompareToast(ONECUT_VERSION.toUpperCase()+' could not build this shape even though '+payload.source.toUpperCase()+' had a result.','warn',6200);
          }
        },180);
      }
      return true;
    }catch(err){
      console.error('Could not carry shape between versions',err);showCompareToast('Could not carry this shape into '+ONECUT_VERSION.toUpperCase()+'.','warn');return false;
    }
  }

  const versionSwitch=ensureCompareChrome();
  versionSwitch?.addEventListener('click',()=>saveSharedShape());

  const finishBeforeBridge=finishShape;
  finishShape=async function(){
    await finishBeforeBridge();
    if(mode==='demo'&&sharedSourcePayload){
      const m=destinationComparisonMessage();if(m)showCompareToast(m.text,m.kind,6200);
    }
  };
  ui.finish.onclick=finishShape;

  const restartBeforeBridge=restart;
  restart=function(){sharedSourcePayload=null;restartBeforeBridge();};
  ui.restart.onclick=restart;

  loadSharedShape();
