(() => {
  'use strict';
  async function boot(){
    const res=await fetch('./main.js',{cache:'no-store'});
    if(!res.ok)throw new Error('Could not load R-02 runtime: '+res.status);
    let source=await res.text();
    // Patch the single source-token typo in the initial structural-spike commit without
    // mutating the archived source file. Remove this loader once the spike graduates.
    const bad="const speed=a.speed*(world.time<(a.slowUntil||0)?.0.55:1);";
    const good="const speed=a.speed*(world.time<(a.slowUntil||0)?0.55:1);";
    if(source.includes(bad)) source=source.replace(bad,good);
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(new Error('R-02 runtime parse/boot failure'));document.body.appendChild(s);});
    URL.revokeObjectURL(url);
  }
  boot().catch(err=>{console.error(err);const fatal=document.getElementById('fatal');if(fatal){fatal.hidden=false;const h=fatal.querySelector('h1'),p=fatal.querySelector('p');if(h)h.textContent='R-02 spike boot failed';if(p)p.textContent=err.message;}});
})();
