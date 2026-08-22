(() => {
  'use strict';
  document.querySelector('[data-deploy-preset="middleTemptation"]')?.classList.remove('active');
  document.querySelector('[data-deploy-preset="siegeDelay"]')?.classList.add('active');
  const runtime=document.createElement('script');
  runtime.src='../lane-warden-r02-v0.4.3/main-loader.js';
  runtime.onload=()=>{const test=document.createElement('script');test.src='./test8.js';document.body.appendChild(test);};
  runtime.onerror=()=>{const fatal=document.getElementById('fatal');if(fatal){fatal.hidden=false;fatal.querySelector('h1').textContent='Frozen gameplay base failed';fatal.querySelector('p').textContent='Could not load R02-D runtime';}};
  document.body.appendChild(runtime);
})();
