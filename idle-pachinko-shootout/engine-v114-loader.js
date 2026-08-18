(function(){
'use strict';
var VERSION='1.11.4';
function fail(msg){
  var b=document.getElementById('bootError');
  if(b){b.className='boot-error';b.textContent='Game v'+VERSION+' startup error: '+msg;}
  throw new Error(msg);
}
function mustReplace(src,oldText,newText,label){
  if(src.indexOf(oldText)<0)fail('hotfix target missing: '+label);
  return src.replace(oldText,newText);
}
fetch('engine-v113-loader.js?v=20260818-113')
  .then(function(r){if(!r.ok)throw new Error('v1.11.3 loader HTTP '+r.status);return r.text();})
  .then(function(src){
    src=mustReplace(src,"var VERSION='1.11.3';","var VERSION='1.11.4';",'loader version');
    src=mustReplace(src,
      "function pegMetaEntry(type,index,seedCost){ensurePegStores();var key=String(index),m=save.pegMeta[type][key],arr=save.placements[type]||[],",
      "function pegMetaEntry(type,index,seedCost){ensurePegStores();if(!save.pegMeta[type]||typeof save.pegMeta[type]!=='object')save.pegMeta[type]={};var key=String(index),m=save.pegMeta[type][key],arr=(save.placements&&save.placements[type])||[],",
      'peg metadata guard');
    src=mustReplace(src,
      "function pegLevel(type,index){return Math.max(0,Math.min(3,Number(pegMetaEntry(type,index).level||0)));}",
      "function pegLevel(type,index){if(type==='n'||['fire','split','pierce','boom','chain'].indexOf(type)<0)return 0;return Math.max(0,Math.min(3,Number(pegMetaEntry(type,index).level||0)));}",
      'normal peg level guard');
    src=mustReplace(src,
      "function pegEffect(b,p,index){var c,q,level=pegLevel(p.t,index),copies,factor,baseMult;if(p.t==='n'){emit('peg',{type:'normal'});return;}",
      "function pegEffect(b,p,index){var c,q,level=0,copies,factor,baseMult;if(p.t==='n'){emit('peg',{type:'normal'});return;}level=pegLevel(p.t,index);",
      'normal peg early return');
    src=src.replace("version:'1.11.3'","version:'1.11.4'");
    (new Function(src+'\n//# sourceURL=engine-v114-bootstrap.js'))();
  })
  .catch(function(err){fail(err&&err.message?err.message:String(err));});
})();
