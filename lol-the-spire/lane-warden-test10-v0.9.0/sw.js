const CACHE='lane-warden-test10-0.9.0-v1';
const ASSETS=['./','./index.html','./test10.js','./manifest.webmanifest','./LW-T10-001-DECLARATION.md','./README.md','./VERSION'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lane-warden-test10-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));});
