(() => {
'use strict';
const BUILD='P2-0.16.1',MANIFEST='./assets/manifests/tactical-models.json?v=0.16.1';
const api={build:BUILD,ready:false,error:null,manifest:null,atlas:null,frames:null};
api.load=async()=>{if(api.promise)return api.promise;api.promise=(async()=>{const manifest=await fetch(MANIFEST),m=await manifest.json(),framesRes=await fetch(`${m.runtime.frames}?v=0.16.1`),frames=await framesRes.json(),img=new Image();img.decoding='async';img.src=`${m.runtime.atlas}?v=0.16.1`;await img.decode();api.manifest=m;api.frames=frames;api.atlas=img;api.ready=true;return api})().catch(e=>{api.error=String(e);return api});return api.promise};
api.map=id=>api.manifest?.simulationMappings?.[id]||id;
api.frame=(archetype,state='idle')=>api.frames?.sprites?.[`${archetype}:${state}`]||api.frames?.sprites?.[`${archetype}:idle`]||null;
api.draw=(ctx,archetype,state,x,y,size,flip=false,alpha=1)=>{const f=api.frame(archetype,state);if(!f||!api.atlas)return false;ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(api.atlas,f.x,f.y,f.w,f.h,-size/2,-size*.66,size,size);ctx.restore();return true};
window.LW_TACTICAL_MODELS=api;api.load();
})();
