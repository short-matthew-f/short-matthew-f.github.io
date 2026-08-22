(() => {
  'use strict';
  const D=window.__LW_DETERMINISM__;
  if(!D)return;
  const NativeBlob=window.Blob;
  window.Blob=function(parts=[],opts={}){
    let next=parts;
    if(opts&&opts.type==='application/json'&&typeof parts[0]==='string'){
      try{
        const doc=JSON.parse(parts[0]);
        if(doc&&doc.build==='M0-0.3.0'&&Array.isArray(doc.runs)){
          doc.schema=4;
          doc.tuningStatus='deterministic-core / Test 0b entry; R01-C gameplay tuning frozen';
          doc.determinism=D.snapshot();
          doc.instrumentation={...(doc.instrumentation||{}),determinism:'DET-001'};
          next=[JSON.stringify(doc,null,2)];
        }
      }catch(_){}
    }
    return new NativeBlob(next,opts);
  };
  window.Blob.prototype=NativeBlob.prototype;
})();
