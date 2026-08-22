const CACHE_PREFIX='lane-warden-test8-0.7.1-';
const CACHE=CACHE_PREFIX+'v1';
const ASSETS=['./','./index.html','./main-loader.js','./test8.js','./manifest.webmanifest','./LW-T8-002-DECLARATION.md','../lane-warden-test8-v0.7.0/test8.js','../lane-warden-test6-v0.5.0/config.js','../lane-warden-r02-v0.4.3/main-loader.js','../lane-warden-r02-v0.4.2/main-loader.js','../lane-warden-r02-v0.4.0/main.js','../lane-warden-r02-v0.4.0/rules.js','../lane-warden-m0-v0.2.4/styles.css','../lane-warden-m0-v0.2.4/attention-signaling.css'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));});
