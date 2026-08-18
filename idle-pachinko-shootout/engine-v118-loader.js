(function(){
'use strict';
var VERSION='1.11.8';
function fail(msg){var b=document.getElementById('bootError');if(b){b.className='boot-error';b.textContent='Game v'+VERSION+' startup error: '+msg;}throw new Error(msg);}
fetch('engine-v117-loader.js?v=20260818-117')
  .then(function(r){if(!r.ok)throw new Error('v1.11.7 loader HTTP '+r.status);return r.text();})
  .then(function(src){
    src=src.replace("var VERSION='1.11.7';","var VERSION='1.11.8';");
    /* The v1.11.7 Gear-tab replacement was nested inside two generated source layers.
       Safari correctly rejected the resulting source when one quoting layer collapsed.
       Item levels remain visible in the loot modal; the Gear-tab label can be added later
       from ordinary DOM code instead of generated JavaScript. */
    var before=src;
    src=src.replace(/^\s*src=replaceFunction\(src,'gearCard',[^\n]*\);\s*$/m,'');
    if(src===before)fail('repair target missing: generated gearCard replacement');
    src=src.replace(/engine-v117-bootstrap\.js/g,'engine-v118-bootstrap.js');
    (new Function(src+'\n//# sourceURL=engine-v118-loader-runtime.js'))();
  })
  .catch(function(err){fail(err&&err.message?err.message:String(err));});
})();
