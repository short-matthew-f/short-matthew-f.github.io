(() => {
  'use strict';
  fetch('../lane-warden-test8-v0.7.0/test8.js',{cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text();})
    .then(src=>{
      src=src.split('T8-0.7.0').join('T8-0.7.1').split('v0.7.0').join('v0.7.1').split('LW-T8-001').join('LW-T8-002');
      const oldHook="state.originalStart=$('startBattle').onclick;$('startBattle').onclick=function(ev){const r=state.originalStart.call(this,ev);setTimeout(()=>{if($('deployment').hidden)arm();},180);return r;};";
      const newHook="$('startBattle').addEventListener('click',()=>setTimeout(()=>{if($('deployment').hidden&&!state.armed)arm();},180));";
      if(!src.includes(oldHook))throw new Error('Expected T8-0.7.0 start hook sentinel not found');
      src=src.replace(oldHook,newHook);
      (0,eval)(src);
    })
    .catch(err=>{
      const fatal=document.getElementById('fatal');
      if(fatal){fatal.hidden=false;const h=fatal.querySelector('h1'),p=fatal.querySelector('p');if(h)h.textContent='Test 8 v0.7.1 layer failed';if(p)p.textContent=String(err?.message||err);}
    });
})();
