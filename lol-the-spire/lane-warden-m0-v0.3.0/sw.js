const CACHE='lane-warden-m0-0.3.0';
const ASSETS=[
  './','./index.html','./config.js','./deterministic-loader.js','./determinism-telemetry.js','./manifest.webmanifest',
  '../lane-warden-m0-v0.2.4/styles.css','../lane-warden-m0-v0.2.4/decision-legibility.css','../lane-warden-m0-v0.2.4/attention-signaling.css',
  '../lane-warden-m0-v0.2.4/rules.js','../lane-warden-m0-v0.2.4/r01c-runtime-adapter.js','../lane-warden-m0-v0.2.4/main.js',
  '../lane-warden-m0-v0.2.4/decision-legibility.js','../lane-warden-m0-v0.2.4/attention-signaling.js'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lane-warden-m0-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));});
