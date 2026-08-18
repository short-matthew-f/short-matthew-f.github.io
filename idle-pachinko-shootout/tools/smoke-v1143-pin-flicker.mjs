import fs from 'node:fs';
import path from 'node:path';

const GAME=path.resolve('idle-pachinko-shootout');
const feel=fs.readFileSync(path.join(GAME,'feel-v133.js'),'utf8');
const html=fs.readFileSync(path.join(GAME,'index.html'),'utf8');
function assert(ok,message){if(!ok)throw new Error(message);}

assert(/function onPeg\(d\)\{[\s\S]*if\(type==='normal'\|\|type==='pin'\)return;/.test(feel),'Firing Pin must bypass the large specialty-peg feel burst');
assert(!/if\(type==='pin'\)idx=4/.test(feel),'legacy Firing Pin specialty-callout path is still active');
assert(/feel-v133\.js\?v=20260818-1143/.test(html),'feel script cache key was not bumped for the phone hotfix');
assert(/v1\.14\.3/.test(html),'shell version was not bumped to v1.14.3');
console.log('v1.14.3 Firing Pin flicker smoke PASS');
