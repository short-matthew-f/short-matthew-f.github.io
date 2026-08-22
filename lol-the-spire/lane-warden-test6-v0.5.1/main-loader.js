(() => {
  'use strict';
  // Keep the frozen R02-D gameplay path identical to Test 6 v0.5.0.
  // Only the Test 6 presentation/readability layer changes in this build.
  document.querySelector('[data-deploy-preset="middleTemptation"]')?.classList.remove('active');
  document.querySelector('[data-deploy-preset="siegeDelay"]')?.classList.add('active');

  const runtime=document.createElement('script');
  runtime.src='../lane-warden-r02-v0.4.3/main-loader.js';
  runtime.onload=()=>{
    const test=document.createElement('script');
    test.src='./test6.js';
    test.onerror=()=>{
      const fatal=document.getElementById('fatal');
      if(fatal){fatal.hidden=false;const h=fatal.querySelector('h1'),p=fatal.querySelector('p');if(h)h.textContent='Test 6 v0.5.1 layer failed';if(p)p.textContent='Could not load test6.js';}
    };
    document.body.appendChild(test);
  };
  runtime.onerror=()=>{
    const fatal=document.getElementById('fatal');
    if(fatal){fatal.hidden=false;const h=fatal.querySelector('h1'),p=fatal.querySelector('p');if(h)h.textContent='Frozen gameplay base failed';if(p)p.textContent='Could not load R02-D runtime';}
  };
  document.body.appendChild(runtime);
})();
