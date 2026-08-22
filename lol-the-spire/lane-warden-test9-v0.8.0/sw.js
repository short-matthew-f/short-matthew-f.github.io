const CACHE_PREFIX='lane-warden-test9-0.8.0-';
const CACHE=CACHE_PREFIX+'v1';
const ASSETS=['./','./index.html','./runtime-loader.js','./test9.js','./manifest.webmanifest','./LW-T9-001-DECLARATION.md','./README.md','./VERSION','../lane-warden-m0-v0.1.1/main.js','../lane-warden-m0-v0.1.1/styles.css'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));});
