(function(){
'use strict';
var VERSION='1.12.1';
function fail(msg){var b=document.getElementById('bootError');if(b){b.className='boot-error';b.textContent='Game v'+VERSION+' startup error: '+msg;}throw new Error(msg);}
function repair(src){
  var marker="src=replaceFunction(src,'gearCard'",start=src.indexOf(marker),end,anchor,pegLoop,injected;
  if(start<0)fail('repair target missing: gearCard patch');
  end=src.indexOf('\n',start);
  if(end<0)end=src.length;
  src=src.slice(0,start)+src.slice(Math.min(src.length,end+1));
  pegLoop="for(i=0;i<P.length;i++){p=P[i];c=colors[p.t];X.beginPath();X.arc(p.x,p.y,p.t==='n'?5.3:(p.t==='pin'?8.3:7.2),0,Math.PI*2);X.fillStyle=c;X.shadowBlur=p.t==='n'?0:(p.t==='pin'?3:14);X.shadowColor=c;X.fill();X.shadowBlur=0;X.strokeStyle='#362116';X.lineWidth=1.5;X.stroke();if(p.t!=='n'){X.fillStyle='#20120d';X.font='bold 7px sans-serif';X.textAlign='center';X.textBaseline='middle';X.fillText(glyph[p.t],p.x,p.y+.5);}}";
  injected="  src=src.replace("+JSON.stringify(pegLoop)+",'');\n";
  anchor="  src=mustReplace(src,\"X.shadowBlur=p.t==='n'?0:14;\",\"X.shadowBlur=p.t==='n'?0:(p.t==='pin'?3:14);\",'firing pin glow');\n";
  if(src.indexOf(anchor)>=0)src=src.replace(anchor,anchor+injected);
  src=src.replace("var VERSION='1.11.7';","var VERSION='1.12.1';");
  src=src.replace(/engine-v117-bootstrap\.js/g,'engine-v121-bootstrap.js');
  return src;
}
fetch('engine-v117-loader.js?v=20260818-117')
 .then(function(r){if(!r.ok)throw new Error('v1.11.7 loader HTTP '+r.status);return r.text();})
 .then(function(src){
   var repaired=repair(src),fn;
   try{fn=new Function(repaired+'\n//# sourceURL=engine-v121-loader-runtime.js');}
   catch(err){fail('repaired loader compile failed: '+(err&&err.message?err.message:String(err)));return;}
   fn();
 })
 .catch(function(err){fail(err&&err.message?err.message:String(err));});
})();
