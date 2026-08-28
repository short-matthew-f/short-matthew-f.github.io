(async()=>{
  try{
    const names=['onecut-core.js?v=2','onecut-sequence.js?v=2','onecut-ui.js?v=2','onecut-hotfix.js?v=2','onecut-targetfix.js?v=2','onecut-payoff.js?v=2','onecut-tuning.js?v=2','onecut-staging.js?v=2','onecut-coordinate.js?v=2','onecut-v2-simple.js?v=2'];
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
    if(hint){hint.classList.remove('hidden');hint.textContent='The V2 fold engine could not load. Refresh and try again.';}
  }
})();
