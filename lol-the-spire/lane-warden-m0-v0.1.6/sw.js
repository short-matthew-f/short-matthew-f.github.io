const CACHE='lane-warden-m0-016';
const FILES=['./','./index.html','./cancel-remediation.js','./regression.js','./manifest.webmanifest','../lane-warden-m0-v0.1.1/main.js','../lane-warden-m0-v0.1.1/icon.svg','../lane-warden-m0-v0.1.2/styles.css'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lane-warden-m0-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;})));});
