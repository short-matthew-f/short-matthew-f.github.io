import fs from 'node:fs';
import path from 'node:path';

const GAME=path.resolve('idle-pachinko-shootout');
const html=fs.readFileSync(path.join(GAME,'index.html'),'utf8');
const css=fs.readFileSync(path.join(GAME,'launcher-stability-v1144.css'),'utf8');
function assert(ok,message){if(!ok)throw new Error(message);}

assert(/launcher-stability-v1144\.css\?v=20260818-1144/.test(html),'v1.14.4 launcher stability stylesheet not loaded with fresh cache key');
assert(/v1\.14\.4/.test(html),'shell version was not bumped to v1.14.4');

// The screen-recording regression: automatic-fire classes may still be added by
// older presentation modules, but none of them may transform or re-light the
// whole cylinder crossbar in Dustwater.
assert(/\.launcher-cap\.feel-launch\{[\s\S]*animation:none!important;[\s\S]*transform:none!important;/.test(css),'launcher kick must be visually neutralized');
assert(/\.bullet-queue\.feel-queue-kick,[\s\S]*\.launcher-cap\.dw-cylinder-turn \.bullet-queue,[\s\S]*\.launcher-cap\.bm-cycle \.bullet-queue\{[\s\S]*animation:none!important;[\s\S]*transform:none!important;/.test(css),'all automatic cylinder transform paths must be neutralized');
assert(/\.feel-launch-ring\{display:none!important\}/.test(css),'automatic launch ring must not flash over the crossbar');
assert(/box-shadow:inset 0 1px rgba\(243,203,128,\.12\)/.test(css),'launcher must retain the stable Dustwater machine shadow while launch class is present');
assert(/prefers-reduced-motion:reduce/.test(css),'reduced-motion coverage missing');

console.log('v1.14.4 cylinder crossbar stability smoke PASS');
