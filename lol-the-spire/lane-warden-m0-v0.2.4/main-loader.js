(() => {
  'use strict';
  const SOURCE='./main.js';
  const CAMERA_SENTINEL="const camera={x:-30,y:0,zoom:1,tilt:.38};";
  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error(`Failed to load ${src}`));document.body.appendChild(s);});}
  async function boot(){
    const res=await fetch(SOURCE);
    if(!res.ok)throw new Error(`Could not load ${SOURCE}: ${res.status}`);
    const source=await res.text();
    if(!source.includes(CAMERA_SENTINEL))throw new Error('ATT-001 runtime sentinel mismatch; refusing to patch unknown gameplay source.');
    const exposure=`${CAMERA_SENTINEL}\n  window.__LW_ATT_CAMERA__=camera; window.__LW_ATT_FOCUS__=(x,y)=>{camera.x=x;camera.y=y;clampCamera();updateUI();};`;
    const patched=source.replace(CAMERA_SENTINEL,exposure);
    const url=URL.createObjectURL(new Blob([patched],{type:'text/javascript'}));
    try{
      await loadScript(url);
    }finally{
      URL.revokeObjectURL(url);
    }
    await loadScript('./decision-legibility.js');
    await loadScript('./attention-signaling.js');
  }
  boot().catch(err=>{
    console.error(err);
    const fatal=document.getElementById('fatal');
    if(fatal){fatal.hidden=false;const p=fatal.querySelector('p');if(p)p.textContent=`ATT-001 boot failed: ${err.message}`;}
  });
})();
