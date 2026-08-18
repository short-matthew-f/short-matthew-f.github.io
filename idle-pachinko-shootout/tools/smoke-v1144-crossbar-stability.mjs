import fs from 'node:fs';
import path from 'node:path';

const GAME=path.resolve('idle-pachinko-shootout');
const html=fs.readFileSync(path.join(GAME,'index.html'),'utf8');
const css=fs.readFileSync(path.join(GAME,'launcher-stability-v1144.css'),'utf8');
function assert(ok,message){if(!ok)throw new Error(message);}

assert(/launcher-stability-v1144\.css\?v=20260818-1145/.test(html),'launcher stability cache key was not bumped for the anchor fix');

// Permanent centering must no longer live in transform. Older launch/reload
// effects are allowed to neutralize transform without changing the launcher
// anchor, because centering now lives in the independent translate property.
assert(/\.launcher-cap\{[\s\S]*left:50%!important;[\s\S]*translate:-50% 0!important;[\s\S]*transform:none!important;/.test(css),'launcher must use an independent translate anchor');
assert(/\.launcher-cap\.feel-launch\{[\s\S]*animation:none!important;[\s\S]*transform:none!important;/.test(css),'launcher kick must remain visually neutralized');
assert(/\.bullet-queue\.feel-queue-kick,[\s\S]*\.launcher-cap\.dw-cylinder-turn \.bullet-queue,[\s\S]*\.launcher-cap\.bm-cycle \.bullet-queue\{[\s\S]*animation:none!important;[\s\S]*transform:none!important;/.test(css),'all automatic cylinder transform paths must remain neutralized');
assert(/\.feel-launch-ring\{display:none!important\}/.test(css),'automatic launch ring must not flash over the crossbar');
assert(/prefers-reduced-motion:reduce/.test(css),'reduced-motion coverage missing');
assert(!/\.launcher-cap\.feel-launch\{[^}]*transform:none!important;[^}]*\}/.test(css) || /translate:-50% 0!important/.test(css),'transform neutralization must never remove launcher centering');

console.log('v1.14.5 launcher anchor stability smoke PASS');
