(() => {
  'use strict';

  async function loadScriptFromSource(source,label){
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    try{
      await new Promise((resolve,reject)=>{
        const s=document.createElement('script');
        s.src=url;
        s.onload=resolve;
        s.onerror=()=>reject(new Error(label+' failed to load'));
        document.body.appendChild(s);
      });
    }finally{
      URL.revokeObjectURL(url);
    }
  }

  async function loadExternal(src,label){
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;
      s.onload=resolve;
      s.onerror=()=>reject(new Error(label+' failed to load'));
      document.body.appendChild(s);
    });
  }

  async function boot(){
    const res=await fetch('../lane-warden-test6-v0.5.0/test6.js',{cache:'no-store'});
    if(!res.ok)throw new Error('Could not load frozen LW-T6-001 harness: '+res.status);
    let source=await res.text();
    const sentinel="const BUILD='T6-0.5.0';";
    if(!source.includes(sentinel))throw new Error('LW-T6-001 harness sentinel mismatch');
    source=source.replace(sentinel,"const BUILD='T6-0.5.1';");
    source=source.replaceAll('Global Awareness v0.5.0','Global Awareness v0.5.1');
    source=source.replaceAll('GLOBAL AWARENESS · 0.5.0','GLOBAL AWARENESS · 0.5.1');
    source=source.replaceAll("fixture.textContent='T6-0.5.0'","fixture.textContent='T6-0.5.1'");
    await loadScriptFromSource(source,'LW-T6-001 harness');
    await loadExternal('./t6-ui.js','T6-0.5.1 UI intervention');
  }

  boot().catch(err=>{
    console.error(err);
    const fatal=document.getElementById('fatal');
    if(fatal){
      fatal.hidden=false;
      const h=fatal.querySelector('h1'),p=fatal.querySelector('p');
      if(h)h.textContent='Test 6 v0.5.1 failed';
      if(p)p.textContent=err.message;
    }
  });
})();
