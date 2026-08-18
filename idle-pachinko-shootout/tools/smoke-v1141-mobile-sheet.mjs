import fs from 'node:fs';
import path from 'node:path';

const GAME=path.resolve('idle-pachinko-shootout');
const css=fs.readFileSync(path.join(GAME,'mobile-sheet-v1141.css'),'utf8');
const html=fs.readFileSync(path.join(GAME,'index.html'),'utf8');
function assert(ok,message){if(!ok)throw new Error(message);}

assert(/\.sheet\s*\{[\s\S]*position:fixed!important/.test(css),'upgrade sheet must be viewport-fixed');
assert(/left:50%!important/.test(css)&&/width:min\(100vw,460px\)!important/.test(css),'sheet must remain centered and capped on desktop');
assert(/transform:translate\(-50%,102%\)!important/.test(css),'closed sheet must preserve centered slide-down transform');
assert(/\.sheet\.open\{transform:translate\(-50%,0\)!important\}/.test(css),'open sheet must resolve to viewport bottom');
assert(/100dvh/.test(css),'sheet must use dynamic viewport height when supported');
assert(/safe-area-inset-bottom/.test(css),'sheet must respect iPhone bottom safe area');
assert(/-webkit-overflow-scrolling:touch/.test(css),'sheet content must retain momentum scrolling on iOS');
assert(/prefers-reduced-motion:reduce/.test(css),'sheet must respect reduced motion');
assert(/mobile-sheet-v1141\.css\?v=20260818-1141/.test(html),'hotfix stylesheet must be loaded after presentation layers');
console.log('v1.14.1 mobile sheet smoke PASS');
