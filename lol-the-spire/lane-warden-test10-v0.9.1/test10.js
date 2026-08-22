(() => {
  'use strict';
  fetch('../lane-warden-test10-v0.9.0/test10.js',{cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text();})
    .then(src=>{
      src=src.split("BUILD='T10-0.9.0',DECL='LW-T10-001'").join("BUILD='T10-0.9.1',DECL='LW-T10-002'");
      src=src.split("$('conEyebrow').textContent='NO EMBER REMAINS';$('conTitle').textContent='THE RUN ENDS HERE';$('conBig').textContent='0 EMBERS · COST CANNOT BE PAID';$('conBody').textContent='No normal battle reward. The Gate falls with you, but there is no further march.';$('conNext').textContent='RUN COMPLETE · REVIEW THE CAMPAIGN';embers(0)")
        .join("$('conEyebrow').textContent='NO EMBER REMAINS';$('conTitle').textContent='THE COST CANNOT BE PAID';$('conBig').textContent='0 EMBERS';$('conBody').textContent='No normal battle reward. The Gate is broken, but there is no Ember left to carry the march onward.';$('conNext').textContent='THE BATTLEFIELD HOLDS FOR ONE FINAL BEAT';embers(0)");

      const resetSentinel="function resetBattle(seq){const b=$('battleWrap');b.className='battle';$('consequence').className='consequence';$('cineTitle').className='title';embers(sequences[seq].embers)}";
      const resetReplacement=resetSentinel+`\nfunction terminalAftermath(){\n  $('consequence').classList.remove('show');\n  const b=$('battleWrap'); b.classList.add('terminal-after');\n  let a=$('terminalAftermath');\n  if(!a){a=document.createElement('div');a.id='terminalAftermath';a.className='terminal-aftermath';a.innerHTML='<div class="after-inner"><small>THE WARDEN’S LAST LIGHT</small><strong>THE GATE IS OPEN.<br>THE MARCH IS OVER.</strong><span>The Last Stand bought the road — not another step.<br>No Ember remains to carry the company through.</span><em>RUN COMPLETE · THE ROAD REMEMBERS</em></div>';b.appendChild(a);}\n  a.classList.remove('show'); void a.offsetWidth; a.classList.add('show');\n}`;
      if(!src.includes(resetSentinel))throw new Error('resetBattle sentinel not found');
      src=src.replace(resetSentinel,resetReplacement);

      const finishSentinel="later(11800,()=>{pb.completedAt=new Date().toISOString();pb.orientationEnd=innerWidth>=innerHeight?'landscape':'portrait';showQuiz(seq)});";
      const finishReplacement="later(11800,()=>{if(seq==='B'){terminalAftermath();later(3600,()=>{pb.completedAt=new Date().toISOString();pb.orientationEnd=innerWidth>=innerHeight?'landscape':'portrait';showQuiz(seq)})}else{pb.completedAt=new Date().toISOString();pb.orientationEnd=innerWidth>=innerHeight?'landscape':'portrait';showQuiz(seq)}});";
      if(!src.includes(finishSentinel))throw new Error('finish sentinel not found');
      src=src.replace(finishSentinel,finishReplacement);

      src=src.replace("note:'Presentation prototype tests comprehension and failure framing. It does not claim final production art/VFX quality.'","note:'Targeted terminal-aftermath rerun. Rules and comprehension answers are frozen from LW-T10-001; only Sequence B closure pacing changed.'");

      const style=document.createElement('style');
      style.textContent=`
        .terminal-aftermath{position:absolute;inset:0;z-index:65;display:grid;align-items:end;justify-items:center;padding:0 24px calc(env(safe-area-inset-bottom,0px) + 28px);background:linear-gradient(180deg,rgba(5,8,12,.04) 0%,rgba(5,8,12,.18) 48%,rgba(5,8,12,.92) 100%);opacity:0;pointer-events:none;transition:opacity 1.05s ease}
        .terminal-aftermath.show{opacity:1}.after-inner{text-align:center;max-width:680px;text-shadow:0 3px 16px #000;transform:translateY(12px);opacity:.2;transition:1.2s ease .2s}.terminal-aftermath.show .after-inner{transform:none;opacity:1}.after-inner small{display:block;font-size:9px;letter-spacing:.22em;color:#d2af62;font-weight:900;margin-bottom:5px}.after-inner strong{display:block;font-size:clamp(22px,5.8vw,40px);line-height:.98;letter-spacing:.025em}.after-inner span{display:block;margin-top:8px;color:#d2dcdd;font-size:11px;line-height:1.35}.after-inner em{display:block;margin-top:11px;padding-top:9px;border-top:1px solid rgba(215,99,104,.48);font-style:normal;font-size:10px;letter-spacing:.13em;color:#e37a7d;font-weight:900}
        .terminal-after .gate{opacity:.12!important;transform:translate(25px,18px) rotate(18deg) scale(.8)!important}.terminal-after .warden{filter:grayscale(.65) brightness(.58)!important;box-shadow:0 0 0 2px rgba(217,170,74,.08)!important}.terminal-after .enemy{opacity:.3;transition:opacity 1.1s ease}.terminal-after .battleGlow{opacity:0!important}
      `;
      document.head.appendChild(style);
      (0,eval)(src);
    })
    .catch(err=>{document.body.innerHTML=`<div style="color:white;font:16px system-ui;padding:30px">Test 10 v0.9.1 layer failed: ${String(err?.message||err)}</div>`;});
})();
