(() => {
  'use strict';

  const BUILD = 'M0-0.1.1';
  const canvas = document.getElementById('battlefield');
  const fatal = document.getElementById('fatal');
  const rotateInterstitial = document.getElementById('rotateInterstitial');
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: true,
    depth: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false
  });

  if (!gl) {
    fatal.hidden = false;
    return;
  }

  window.__LW_BUILD__ = BUILD;
  window.__LW_READY__ = false;

  const vs = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPosition;
    layout(location=1) in vec3 aNormal;
    uniform vec3 uPos;
    uniform vec3 uSize;
    uniform vec2 uCamera;
    uniform vec2 uHalfView;
    uniform vec3 uColor;
    uniform float uTilt;
    out vec3 vColor;
    out float vLight;
    void main() {
      vec3 world = aPosition * uSize + uPos;
      vec3 p = world - vec3(uCamera, 0.0);
      float c = cos(uTilt);
      float s = sin(uTilt);
      float sy = p.y * c + p.z * s;
      float depth = p.y * s - p.z * c;
      gl_Position = vec4(p.x / uHalfView.x, sy / uHalfView.y, depth / 120.0, 1.0);
      vec3 lightDir = normalize(vec3(-0.45, -0.35, 1.0));
      vLight = 0.62 + 0.38 * max(dot(normalize(aNormal), lightDir), 0.0);
      vColor = uColor;
    }`;
  const fs = `#version 300 es
    precision highp float;
    in vec3 vColor;
    in float vLight;
    out vec4 outColor;
    void main() { outColor = vec4(vColor * vLight, 1.0); }`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  // 36 vertices. One shared cube; scale/position/color are uniforms.
  const P = [];
  const N = [];
  const faces = [
    [[0,0,1], [-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],
    [[0,0,-1], [-.5,.5,-.5],[.5,.5,-.5],[.5,-.5,-.5],[-.5,-.5,-.5]],
    [[0,1,0], [-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],
    [[0,-1,0], [-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]],
    [[1,0,0], [.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],
    [[-1,0,0], [-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]
  ];
  for (const [normal,a,b,c,d] of faces) {
    for (const v of [a,b,c,a,c,d]) { P.push(...v); N.push(...normal); }
  }
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const pbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  const nbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(N), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

  const U = {
    pos: gl.getUniformLocation(program, 'uPos'),
    size: gl.getUniformLocation(program, 'uSize'),
    camera: gl.getUniformLocation(program, 'uCamera'),
    halfView: gl.getUniformLocation(program, 'uHalfView'),
    color: gl.getUniformLocation(program, 'uColor'),
    tilt: gl.getUniformLocation(program, 'uTilt')
  };

  const colors = {
    ground:[0.19,0.23,0.22], lane:[0.27,0.30,0.27], shoulder:[0.18,0.22,0.20],
    friend:[0.35,0.65,0.48], enemy:[0.72,0.30,0.27], commander:[0.95,0.74,0.28],
    rival:[0.92,0.47,0.42], bastion:[0.32,0.54,0.50], guard:[0.60,0.25,0.24],
    gate:[0.55,0.42,0.26], core:[0.39,0.54,0.60], tower:[0.40,0.43,0.47],
    projectile:[0.95,0.82,0.48], ghost:[0.78,0.72,0.46]
  };

  const world = {
    width: 180,
    height: 64,
    lanes: [-20, 0, 20],
    actors: [],
    projectiles: [],
    time: 0,
    paused: false,
    projectilesOn: true,
    preset: 'target',
    commander: { x:-42, y:0, z:1.5, dest:null },
    rival: { x:26, y:20, z:1.5 },
    spawnClock: 0
  };

  const camera = { x:-34, y:0, zoom:1.0, tilt:0.39 };
  const pointers = new Map();
  let gesture = null;
  const DRAG_THRESHOLD = 9;

  function makeEvidence() {
    return {
      schema: 1,
      build: BUILD,
      designBaseline: '1.7',
      test: '0a-exploratory',
      startedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform || null,
      standalone: !!(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone),
      initial: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        screenWidth: screen.width,
        screenHeight: screen.height,
        dpr: window.devicePixelRatio || 1,
        orientation: screen.orientation?.type || (innerWidth >= innerHeight ? 'landscape' : 'portrait'),
        webglRenderer: null,
        webglVendor: null
      },
      counters: { commanderOrders:0, pans:0, pinches:0, laneJumps:0, recenters:0, pointerCancels:0, contextLosses:0 },
      audio: { attempts:0, unlocked:false, state:null, atMs:null },
      frame: { samples:0, sumMs:0, maxMs:0, over33ms:0, over50ms:0, secondBuckets:[] },
      lifecycle: [],
      memory: [],
      configurations: [],
      endedAt: null,
      elapsedMs: 0
    };
  }

  let evidence = makeEvidence();
  let evidenceStart = performance.now();
  let bucketStart = evidenceStart, bucketFrames = 0, bucketSum = 0, bucketMax = 0;

  function eventEvidence(type, detail={}) {
    if (evidence.lifecycle.length >= 240) evidence.lifecycle.shift();
    evidence.lifecycle.push({ tMs:Math.round(performance.now()-evidenceStart), type, ...detail });
  }

  function resetEvidenceLog() {
    evidence = makeEvidence();
    evidenceStart = performance.now();
    bucketStart = evidenceStart; bucketFrames = 0; bucketSum = 0; bucketMax = 0;
    eventEvidence('evidence-reset');
    captureWebGLIdentity();
  }

  function captureWebGLIdentity() {
    try {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        evidence.initial.webglRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
        evidence.initial.webglVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
      }
    } catch (_) {}
  }

  function captureConfig(reason) {
    evidence.configurations.push({
      tMs:Math.round(performance.now()-evidenceStart), reason,
      preset:world.preset, projectiles:world.projectilesOn,
      viewport:[window.innerWidth,window.innerHeight], dpr:window.devicePixelRatio || 1
    });
  }

  function exportEvidence() {
    evidence.endedAt = new Date().toISOString();
    evidence.elapsedMs = Math.round(performance.now()-evidenceStart);
    const payload = JSON.stringify(evidence, null, 2);
    const blob = new Blob([payload], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g,'-');
    a.href = url; a.download = `lane-warden-${BUILD}-evidence-${stamp}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
  }

  function actorShape(type) {
    if (type === 'siege') return { sx:2.2, sy:2.2, sz:2.1, speed:2.2 };
    if (type === 'ranged') return { sx:1.35, sy:1.35, sz:2.0, speed:3.2 };
    return { sx:1.5, sy:1.5, sz:1.7, speed:3.8 };
  }

  function seeded01(i) {
    const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function resetActors(preset = world.preset) {
    world.preset = preset;
    const targetVisible = { sparse:18, target:42, stress:90 }[preset];
    const total = targetVisible * 2;
    world.actors = [];
    for (let i=0; i<total; i++) {
      const lane = i % 3;
      const team = i % 2 === 0 ? 1 : -1;
      const role = i % 9 === 0 ? 'siege' : i % 4 === 0 ? 'ranged' : 'melee';
      const s = actorShape(role);
      const jitter = (seeded01(i+9)-.5) * 5.2;
      const progression = seeded01(i+31);
      // Focus density near center fronts while retaining meaningful offscreen population.
      const center = lane === 0 ? 18 : lane === 1 ? 0 : -14;
      const spread = preset === 'stress' ? 105 : 125;
      let x = center + (progression-.5) * spread;
      if (team === 1) x -= 3.5; else x += 3.5;
      world.actors.push({
        x, y:world.lanes[lane] + jitter, z:s.sz/2,
        team, lane, role, ...s,
        phase:seeded01(i+71)*6.28,
        hp:1
      });
    }
    updatePresetButtons();
  }

  function updatePresetButtons() {
    document.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('active', b.dataset.preset === world.preset));
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0,0,w,h);
    rotateInterstitial.hidden = window.innerWidth >= window.innerHeight;
  }

  function viewHalf() {
    const halfW = 36 / camera.zoom;
    const aspect = Math.max(1, canvas.clientWidth / Math.max(1, canvas.clientHeight));
    return { x:halfW, y:halfW/aspect };
  }

  function clampCamera() {
    const half = viewHalf();
    const xPad = Math.min(half.x, world.width/2);
    const yPad = Math.min(half.y / Math.cos(camera.tilt), world.height/2);
    camera.x = Math.max(-world.width/2 + xPad, Math.min(world.width/2 - xPad, camera.x));
    camera.y = Math.max(-world.height/2 + yPad, Math.min(world.height/2 - yPad, camera.y));
  }

  function drawBox(x,y,z,sx,sy,sz,color) {
    gl.uniform3f(U.pos,x,y,z);
    gl.uniform3f(U.size,sx,sy,sz);
    gl.uniform3fv(U.color,color);
    gl.drawArrays(gl.TRIANGLES,0,36);
  }

  function render() {
    resize();
    const half = viewHalf();
    gl.clearColor(0.055,0.075,0.09,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.uniform2f(U.camera,camera.x,camera.y);
    gl.uniform2f(U.halfView,half.x,half.y);
    gl.uniform1f(U.tilt,camera.tilt);

    // Battlefield foundation and authored lanes.
    drawBox(0,0,-1.0,world.width,world.height,1.4,colors.ground);
    world.lanes.forEach((ly, idx) => {
      drawBox(0,ly,-0.15,world.width-8,9.2,.55,colors.lane);
      drawBox(-4,ly+6.5,-0.18,world.width-22,2.2,.42,colors.shoulder);
      drawBox(-4,ly-6.5,-0.18,world.width-22,2.2,.42,colors.shoulder);
      // Bastion and Guard endpoint landmarks.
      drawBox(-78,ly,2.1,4.8,8.0,4.2,colors.bastion);
      drawBox(68,ly,1.8,4.0,7.2,3.6,colors.guard);
      drawBox(-35 + idx*22,ly+6.7,1.3,3.2,3.2,2.6,colors.tower);
      drawBox(4 + idx*20,ly-6.7,1.3,3.2,3.2,2.6,colors.tower);
    });
    drawBox(-87,0,2.8,5.2,55,5.6,colors.core);
    drawBox(82,0,3.6,6.0,55,7.2,colors.gate);

    // Junction plazas — visible geometry, not decorative art.
    drawBox(-24,0,.02,12,35,.6,[0.30,0.30,0.25]);
    drawBox(28,0,.02,12,35,.6,[0.30,0.30,0.25]);

    for (const a of world.actors) {
      const bob = Math.sin(world.time*3.0 + a.phase)*0.08;
      const col = a.team === 1 ? colors.friend : colors.enemy;
      drawBox(a.x,a.y,a.z+bob,a.sx,a.sy,a.sz,col);
      if (a.role === 'ranged') drawBox(a.x,a.y,a.z+a.sz*.58,a.sx*.44,a.sy*.44,.7,[col[0]*1.18,col[1]*1.18,col[2]*1.18]);
      if (a.role === 'siege') drawBox(a.x,a.y,a.z+a.sz*.55,a.sx*.9,a.sy*.35,.6,[.28,.25,.21]);
    }
    for (const p of world.projectiles) drawBox(p.x,p.y,.9,.34,.34,.34,colors.projectile);

    // Rival and Commander use exaggerated silhouettes, independent of Presence rings.
    drawBox(world.rival.x,world.rival.y,1.8,2.3,2.3,3.6,colors.rival);
    drawBox(world.rival.x,world.rival.y,4.1,1.1,1.1,1.2,[.95,.68,.62]);
    drawBox(world.commander.x,world.commander.y,2.0,2.6,2.6,4.0,colors.commander);
    drawBox(world.commander.x,world.commander.y,4.5,1.25,1.25,1.35,[1.0,.89,.53]);
    if (world.commander.dest) drawBox(world.commander.dest.x,world.commander.dest.y,.25,1.4,1.4,.5,colors.ghost);
  }

  function step(dt) {
    if (world.paused) return;
    world.time += dt;
    const laneFront = [18,0,-14];
    for (let i=0;i<world.actors.length;i++) {
      const a = world.actors[i];
      const desired = laneFront[a.lane] + (a.team === 1 ? -2.5 : 2.5);
      const dx = desired - a.x;
      if (Math.abs(dx) > 4.0) a.x += Math.sign(dx) * a.speed * dt;
      else a.x += Math.sin(world.time*.7+a.phase)*.08*dt;
      // Gentle lateral resolution so lanes do not collapse into single-file rails.
      a.y += Math.sin(world.time*.55 + a.phase) * .05 * dt;
      const laneY = world.lanes[a.lane];
      a.y += (laneY - a.y) * .14 * dt;
      if (world.projectilesOn && a.role === 'ranged' && seeded01(i + Math.floor(world.time*2)) > .989) {
        world.projectiles.push({x:a.x,y:a.y,vx:a.team*18,life:2.0});
      }
    }
    for (const p of world.projectiles) { p.x += p.vx*dt; p.life -= dt; }
    world.projectiles = world.projectiles.filter(p => p.life > 0 && Math.abs(p.x) < 92);

    if (world.commander.dest) {
      const dx = world.commander.dest.x - world.commander.x;
      const dy = world.commander.dest.y - world.commander.y;
      const d = Math.hypot(dx,dy);
      if (d < .4) world.commander.dest = null;
      else {
        const speed = 9.0;
        world.commander.x += dx/d * speed * dt;
        world.commander.y += dy/d * speed * dt;
      }
    }
  }

  function screenToWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const nx = ((clientX-r.left)/r.width)*2 - 1;
    const ny = 1 - ((clientY-r.top)/r.height)*2;
    const half = viewHalf();
    return {
      x: camera.x + nx*half.x,
      y: camera.y + (ny*half.y)/Math.cos(camera.tilt)
    };
  }

  function worldToScreen(x,y,z=0) {
    const r = canvas.getBoundingClientRect();
    const half = viewHalf();
    const sy = (y-camera.y)*Math.cos(camera.tilt) + z*Math.sin(camera.tilt);
    const nx = (x-camera.x)/half.x;
    const ny = sy/half.y;
    return { x:r.left + (nx+1)*.5*r.width, y:r.top + (1-ny)*.5*r.height };
  }

  function panBy(dxPx,dyPx) {
    const half = viewHalf();
    const r = canvas.getBoundingClientRect();
    camera.x -= (dxPx/r.width) * half.x*2;
    camera.y += (dyPx/r.height) * half.y*2/Math.cos(camera.tilt);
    clampCamera();
  }

  function pointerDown(e) {
    if (e.target !== canvas) return;
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,startX:e.clientX,startY:e.clientY});
    if (pointers.size === 1) {
      gesture = { type:'pending', id:e.pointerId, dragged:false };
    } else if (pointers.size === 2) {
      evidence.counters.pinches++;
      const pts=[...pointers.values()];
      gesture = { type:'pinch', startDist:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y), startZoom:camera.zoom };
    }
  }

  function pointerMove(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx=e.clientX-p.lastX, dy=e.clientY-p.lastY;
    p.x=e.clientX; p.y=e.clientY;
    if (pointers.size >= 2) {
      const pts=[...pointers.values()];
      const dist=Math.max(10,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y));
      if (!gesture || gesture.type!=='pinch') gesture={type:'pinch',startDist:dist,startZoom:camera.zoom};
      camera.zoom=Math.max(.72,Math.min(1.65,gesture.startZoom*(dist/gesture.startDist)));
      clampCamera();
    } else if (gesture && gesture.id===e.pointerId) {
      const traveled=Math.hypot(e.clientX-p.startX,e.clientY-p.startY);
      if (traveled>DRAG_THRESHOLD && gesture.type!=='pan') { gesture.type='pan'; gesture.dragged=true; evidence.counters.pans++; }
      if (gesture.type==='pan') panBy(dx,dy);
    }
    p.lastX=e.clientX; p.lastY=e.clientY;
  }

  function pointerUp(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const wasSingle = pointers.size===1;
    const isTap = wasSingle && gesture && gesture.id===e.pointerId && !gesture.dragged && Math.hypot(e.clientX-p.startX,e.clientY-p.startY)<=DRAG_THRESHOLD;
    pointers.delete(e.pointerId);
    if (isTap) {
      const w=screenToWorld(e.clientX,e.clientY);
      if (Math.abs(w.y)<=30 && w.x>-84 && w.x<78) {
        world.commander.dest={x:w.x,y:w.y};
        evidence.counters.commanderOrders++;
        showTapGhost(e.clientX,e.clientY);
      }
    }
    if (pointers.size===0) gesture=null;
    else if (pointers.size===1) {
      const [id,only]=[...pointers.entries()][0];
      only.startX=only.x; only.startY=only.y; only.lastX=only.x; only.lastY=only.y;
      gesture={type:'pending',id,dragged:true};
    }
  }

  function showTapGhost(x,y) {
    const ghost=document.getElementById('tapGhost');
    ghost.style.left=`${x}px`; ghost.style.top=`${y}px`;
    ghost.classList.remove('show'); void ghost.offsetWidth; ghost.classList.add('show');
  }

  canvas.addEventListener('pointerdown',pointerDown);
  canvas.addEventListener('pointermove',pointerMove);
  canvas.addEventListener('pointerup',pointerUp);
  canvas.addEventListener('pointercancel',e=>{ evidence.counters.pointerCancels++; pointerUp(e); });

  document.getElementById('recenterButton').addEventListener('click',()=>{
    evidence.counters.recenters++;
    camera.x=world.commander.x; camera.y=world.commander.y; clampCamera();
  });
  document.querySelectorAll('.lane').forEach(btn=>btn.addEventListener('click',()=>{
    const idx=Number(btn.dataset.lane);
    evidence.counters.laneJumps++;
    camera.y=world.lanes[idx];
    camera.x=[18,0,-14][idx];
    clampCamera();
  }));
  document.querySelectorAll('[data-preset]').forEach(btn=>btn.addEventListener('click',()=>{ resetActors(btn.dataset.preset); captureConfig('preset'); }));
  document.getElementById('pauseToggle').addEventListener('change',e=>world.paused=e.target.checked);
  document.getElementById('projectileToggle').addEventListener('change',e=>{ world.projectilesOn=e.target.checked; captureConfig('projectiles'); });
  document.getElementById('resetEvidence').addEventListener('click',resetEvidenceLog);
  document.getElementById('exportEvidence').addEventListener('click',exportEvidence);

  let audioCtx=null;
  document.getElementById('audioButton').addEventListener('click',async()=>{
    evidence.audio.attempts++;
    if (!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    await audioCtx.resume();
    const osc=audioCtx.createOscillator(); const gain=audioCtx.createGain();
    gain.gain.setValueAtTime(.035,audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.12);
    osc.frequency.value=520; osc.connect(gain).connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime+.13);
    const b=document.getElementById('audioButton'); b.textContent='Sound ready'; b.classList.add('ready');
    window.__LW_AUDIO_UNLOCKED__=audioCtx.state==='running';
    evidence.audio.unlocked=window.__LW_AUDIO_UNLOCKED__; evidence.audio.state=audioCtx.state; evidence.audio.atMs=Math.round(performance.now()-evidenceStart);
    eventEvidence('audio-unlock',{success:evidence.audio.unlocked,state:audioCtx.state});
  });

  window.addEventListener('resize',()=>{ resize(); eventEvidence('resize',{w:innerWidth,h:innerHeight,dpr:devicePixelRatio||1}); });
  window.addEventListener('orientationchange',()=>{ eventEvidence('orientationchange',{orientation:screen.orientation?.type||null}); setTimeout(resize,50); });
  document.addEventListener('visibilitychange',()=>{ window.__LW_LAST_VISIBILITY__={state:document.visibilityState,time:performance.now()}; eventEvidence('visibilitychange',{state:document.visibilityState}); });
  window.addEventListener('pagehide',e=>eventEvidence('pagehide',{persisted:e.persisted}));
  window.addEventListener('pageshow',e=>eventEvidence('pageshow',{persisted:e.persisted}));
  canvas.addEventListener('webglcontextlost',e=>{ evidence.counters.contextLosses++; eventEvidence('webglcontextlost'); e.preventDefault(); });
  canvas.addEventListener('webglcontextrestored',()=>eventEvidence('webglcontextrestored'));
  window.addEventListener('beforeunload',()=>{ evidence.endedAt=new Date().toISOString(); evidence.elapsedMs=Math.round(performance.now()-evidenceStart); });

  const fpsEl=document.getElementById('fps');
  const visibleEl=document.getElementById('visibleActors');
  const totalEl=document.getElementById('totalActors');
  const memoryEl=document.getElementById('memory');
  let last=performance.now(), frames=0, fpsLast=last, fpsValue=0;
  function updateDiagnostics(now) {
    frames++;
    if (now-fpsLast>500) { fpsValue=Math.round(frames*1000/(now-fpsLast)); frames=0; fpsLast=now; }
    const half=viewHalf();
    const yHalf=half.y/Math.cos(camera.tilt)+5;
    let visible=0;
    for (const a of world.actors) if (Math.abs(a.x-camera.x)<half.x+3 && Math.abs(a.y-camera.y)<yHalf) visible++;
    fpsEl.textContent=`${fpsValue} fps`;
    visibleEl.textContent=`${visible} visible`;
    totalEl.textContent=`${world.actors.length} total`;
    const mem=performance.memory;
    memoryEl.textContent=mem?`${Math.round(mem.usedJSHeapSize/1048576)} MB JS`:'memory n/a';
    if (mem && (evidence.memory.length===0 || now-evidenceStart-evidence.memory[evidence.memory.length-1].tMs>=5000)) {
      evidence.memory.push({tMs:Math.round(now-evidenceStart), usedJSHeapMB:Math.round(mem.usedJSHeapSize/104857.6)/10, totalJSHeapMB:Math.round(mem.totalJSHeapSize/104857.6)/10});
    }
    window.__LW_DIAGNOSTICS__={fps:fpsValue,visibleActors:visible,totalActors:world.actors.length,preset:world.preset,zoom:camera.zoom,camera:{x:camera.x,y:camera.y}};
    window.__LW_EVIDENCE__=evidence;
  }

  function frame(now) {
    const rawMs=Math.max(0,now-last); const dt=Math.min(.05,rawMs/1000); last=now;
    evidence.frame.samples++; evidence.frame.sumMs+=rawMs; evidence.frame.maxMs=Math.max(evidence.frame.maxMs,rawMs);
    if(rawMs>33.34) evidence.frame.over33ms++; if(rawMs>50) evidence.frame.over50ms++;
    bucketFrames++; bucketSum+=rawMs; bucketMax=Math.max(bucketMax,rawMs);
    if(now-bucketStart>=1000) {
      evidence.frame.secondBuckets.push({tMs:Math.round(now-evidenceStart), frames:bucketFrames, avgMs:Math.round((bucketSum/Math.max(1,bucketFrames))*100)/100, maxMs:Math.round(bucketMax*100)/100});
      if(evidence.frame.secondBuckets.length>7200) evidence.frame.secondBuckets.shift();
      bucketStart=now; bucketFrames=0; bucketSum=0; bucketMax=0;
    }
    step(dt); render(); updateDiagnostics(now);
    requestAnimationFrame(frame);
  }

  resetActors('target');
  resize();
  captureWebGLIdentity();
  eventEvidence('session-start');
  captureConfig('initial');
  window.__LW_READY__=true;
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
})();
