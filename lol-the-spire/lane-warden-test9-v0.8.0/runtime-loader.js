(() => {
  'use strict';
  fetch('../lane-warden-m0-v0.1.1/main.js',{cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text();})
    .then(src=>{
      src=src.replace("const BUILD = 'M0-0.1.1';","const BUILD = 'T9-0.8.0';");

      // Test 9 must distinguish visible draw pressure from offscreen simulation.
      // The exploratory channel spike submitted every actor to WebGL even when clipped,
      // so add explicit camera culling before the actor draw loop for this test only.
      const actorSentinel='    for (const a of world.actors) {';
      const actorReplacement=`    const t9Half=viewHalf();\n    const t9YHalf=t9Half.y/Math.cos(camera.tilt)+5;\n    for (const a of world.actors) {\n      if (Math.abs(a.x-camera.x)>=t9Half.x+3 || Math.abs(a.y-camera.y)>=t9YHalf) continue;`;
      if(!src.includes(actorSentinel))throw new Error('T9 actor-render sentinel missing');
      src=src.replace(actorSentinel,actorReplacement);

      const renderSentinel='    // Rival and Commander use exaggerated silhouettes, independent of Presence rings.';
      const renderInject=`    // Test 9 isolated stress proxies.\n    for (const s of (world.t9Structures||[])) drawBox(s.x,s.y,s.z,s.sx,s.sy,s.sz,s.color||[.36,.44,.46]);\n    for (const p of (world.t9Particles||[])) {\n      const wobble=Math.sin(world.time*5+p.phase)*.28;\n      drawBox(p.x+wobble,p.y,p.z,.16,.16,.16,p.color||[.92,.72,.32]);\n    }\n\n`;
      if(!src.includes(renderSentinel))throw new Error('T9 render sentinel missing');
      src=src.replace(renderSentinel,renderInject+renderSentinel);

      const readySentinel='  window.__LW_READY__=true;';
      const expose=`  window.__LW_T9_BASE__={world,camera,resetActors,viewHalf,drawBox,gl,colors};\n`;
      if(!src.includes(readySentinel))throw new Error('T9 ready sentinel missing');
      src=src.replace(readySentinel,expose+readySentinel);
      (0,eval)(src);
      const t=document.createElement('script');t.src='./test9.js';document.body.appendChild(t);
    })
    .catch(err=>{
      const fatal=document.getElementById('fatal');
      if(fatal){fatal.hidden=false;fatal.querySelector('h1').textContent='Test 9 runtime failed';fatal.querySelector('p').textContent=String(err?.message||err);}
    });
})();
