(async()=>{
  try{
    const names=['onecut-core.js?v=5','onecut-sequence.js?v=5','onecut-ui.js?v=5'];
    const parts=await Promise.all(names.map(async name=>{
      const r=await fetch(name,{cache:'no-store'});
      if(!r.ok) throw new Error(`Could not load ${name}`);
      return r.text();
    }));
    new Function(parts.join('\n'))();
  }catch(err){
    console.error(err);
    const loading=document.getElementById('loading');
    const hint=document.getElementById('hint');
    if(loading)loading.classList.add('hidden');
    if(hint){hint.classList.remove('hidden');hint.textContent='The fold engine could not load. Refresh and try again.';}
  }
})();
