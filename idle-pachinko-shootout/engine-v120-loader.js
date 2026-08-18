(function(){
'use strict';
var VERSION='1.12';
function fail(msg){var b=document.getElementById('bootError');if(b){b.className='boot-error';b.textContent='Game v'+VERSION+' startup error: '+msg;}throw new Error(msg);}
function repair(src){
  var marker="src=replaceFunction(src,'gearCard'",start=src.indexOf(marker),end;
  if(start<0)fail('repair target missing: gearCard patch');
  end=src.indexOf('\n',start);
  if(end<0)end=src.length;
  src=src.slice(0,start)+src.slice(Math.min(src.length,end+1));
  src=src.replace("var VERSION='1.11.7';","var VERSION='1.12';");
  src=src.replace(/engine-v117-bootstrap\.js/g,'engine-v120-bootstrap.js');
  return src;
}
fetch('engine-v117-loader.js?v=20260818-117')
 .then(function(r){if(!r.ok)throw new Error('v1.11.7 loader HTTP '+r.status);return r.text();})
 .then(function(src){
   var repaired=repair(src),fn;
   try{fn=new Function(repaired+'\n//# sourceURL=engine-v120-loader-runtime.js');}
   catch(err){fail('repaired loader compile failed: '+(err&&err.message?err.message:String(err)));return;}
   fn();
 })
 .catch(function(err){fail(err&&err.message?err.message:String(err));});
})();
