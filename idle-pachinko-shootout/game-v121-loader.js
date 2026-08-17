(function(){
'use strict';
function sourceOf(fn,name){return fn.toString().replace(/^function\s+[^\(]+/, 'function '+name);}
function replaceRequired(src,needle,replacement,label){var out=typeof needle==='string'?src.replace(needle,replacement):src.replace(needle,replacement);if(out===src)throw new Error('v1.2.1 patch failed: '+label);return out;}
function doneWaveV121(){if(living().length||G.lastCompletedWave===G.wave)return;G.lastCompletedWave=G.wave;B=[];var w=G.wave;if(w%5===0)save.checkpoint=w+1;save.highest=Math.max(save.highest,w+1);var bonus=20+w*4;save.coins+=bonus;G.runCoins+=bonus;persist();if(w%10===0){G.state='loot';showLoot(w);return;}G.wave++;spawnWave();}
function frameV121(now){var dt=Math.min(.033,(now-last)/1000),ammo;last=now;if(G&&G.state!=='dead'){physics(dt);updateEnemyMotionV12(dt,now);if((G.state==='fire'||G.state==='reload')&&!living().length){if(!G.emptySince)G.emptySince=now;if(now-G.emptySince>700){G.emptySince=0;B=[];doneWave();}}else G.emptySince=0;if(G.state==='fire'&&now>=G.next&&G.launched<G.mag){ammo=save.cylinder[G.launched]||'standard';launch(null,ammo);G.launched++;G.next=now+650;queue();}if(G.state==='fire'&&G.launched>=G.mag&&G.resolved>=G.mag&&!B.length&&living().length){G.state='reload';G.rs=now;G.re=now+stats().reload;}if(G.state==='reload'&&now>=G.re)reloadDone();positionEnemiesV12();}draw();hud();requestAnimationFrame(frame);}
function showFailure(err){var box=document.getElementById('bootError');if(box){box.className='boot-error';box.textContent='Game v1.2.1 startup error: '+(err&&err.message?err.message:String(err));}}
fetch('game-v12-loader.js?v=20260817-2',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('Could not load v1.2 engine ('+r.status+')');return r.text();}).then(function(loader){
  loader=replaceRequired(loader,"'use strict';","'use strict';\n"+sourceOf(doneWaveV121,'doneWaveV121')+'\n'+sourceOf(frameV121,'frameV121'),'inject recovery functions');
  loader=replaceRequired(loader,'window.__ipsV12Patch=patchRuntimeV12;',"var __ipsBaseV12=patchRuntimeV12;window.__ipsV12Patch=function(src){src=__ipsBaseV12(src);src=replaceRequired(src,/function doneWave\\(\\)\\{[\\s\\S]*?\\}\\nfunction ensureMotionV12/,sourceOf(doneWaveV121,'doneWave')+'\\nfunction ensureMotionV12','guard wave completion');src=replaceRequired(src,/function frame\\(now\\)\\{[\\s\\S]*?\\}\\nfunction ballColor/,sourceOf(frameV121,'frame')+'\\nfunction ballColor','empty-wave watchdog');return src;};",'install recovery patch');
  (new Function(loader))();
}).catch(showFailure);
})();
