import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const GAME=path.resolve('idle-pachinko-shootout');
const BUILD='20260818-1147';
const read=name=>fs.readFileSync(path.join(GAME,name),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const html=read('index.html');
const engine=read('engine-v130.js');
const runtime=read('runtime-v130.js');
const guard=read('core-coherency-v1147.js');
const settings=read('settings-v130.js');

assert(/Idle Pachinko Shootout — v1\.14\.7/.test(html),'shell title is not v1.14.7');
assert(/<small> v1\.14\.7<\/small>/.test(html),'visible shell version is not v1.14.7');
const shellVersion=(html.match(/<title>Idle Pachinko Shootout — v([^<]+)<\/title>/)||[])[1];
const settingsVersion=(settings.match(/var VERSION='([^']+)'/)||[])[1];
assert(shellVersion&&settingsVersion&&settingsVersion===shellVersion,`settings VERSION ${settingsVersion||'missing'} does not match shell ${shellVersion||'missing'}`);
assert(html.includes(`settings-v130.js?v=${BUILD}`),'settings script does not use v1.14.7 cache key');
assert(!html.includes('settings-v130.js?v=20260818-1144'),'stale settings cache key is still active');
assert(html.includes('http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"'),'document cache-control guard missing');
assert(html.includes(`engine-v130.js?v=${BUILD}`),'engine does not use v1.14.7 core cache key');
assert(html.includes(`runtime-v130.js?v=${BUILD}`),'runtime does not use v1.14.7 core cache key');
assert(html.includes(`core-coherency-v1147.js?v=${BUILD}`),'core coherency guard is not wired');
assert(!html.includes('engine-v130.js?v=20260818-130'),'stale engine cache key is still active');
assert(!html.includes('runtime-v130.js?v=20260818-130'),'stale runtime cache key is still active');
assert(html.indexOf(`engine-v130.js?v=${BUILD}`)<html.indexOf(`runtime-v130.js?v=${BUILD}`),'engine must load before runtime');
assert(html.indexOf(`runtime-v130.js?v=${BUILD}`)<html.indexOf(`core-coherency-v1147.js?v=${BUILD}`),'coherency guard must load after runtime');

const sixRowEngine="for(r=0;r<6;r++){n=r%2?8:9;g=(C.width-56)/8;for(c=0;c<n;c++)P.push({x:28+c*g+(r%2?g/2:0),y:158+r*44,r:6,t:'n'});}";
const sixRowRuntime="for(r=0;r<6;r++){n=r%2?8:9;for(c=0;c<n;c++)out.push({x:28+c*g+(r%2?g/2:0),y:158+r*44});}";
assert(engine.includes(sixRowEngine),'engine is not using six-row physics geometry');
assert(runtime.includes(sixRowRuntime),'DOM peg hardware is not using six-row geometry');
assert(!engine.includes("X.arc(p.x,p.y,p.t==='n'?5.3"),'legacy canvas peg bodies are still rendered by the current engine');
assert(!engine.includes('colors[p.t]'),'legacy canvas peg color loop is still rendered by the current engine');
assert(guard.includes('boardLayout'),'coherency guard does not verify board layout generation');

function runGuard(boardLayout){
  let replaced=null,htmlBuild=null;
  const store=new Map();
  const sessionStorage={
    getItem(k){return store.has(k)?store.get(k):null;},
    setItem(k,v){store.set(k,String(v));},
    removeItem(k){store.delete(k);}
  };
  const document={
    documentElement:{setAttribute(k,v){if(k==='data-ips-core-build')htmlBuild=v;}},
    getElementById(){return null;},
    querySelector(){return {classList:{add(){}}};}
  };
  const window={
    __ipsAPI:{snapshot(){return {boardLayout};}},
    location:{href:'https://ips.test/idle-pachinko-shootout/',replace(v){replaced=v;}},
    sessionStorage
  };
  const context=vm.createContext({window,document,sessionStorage,URL,setInterval(){return 1;},clearInterval(){}});
  new vm.Script(guard,{filename:'core-coherency-v1147.js'}).runInContext(context);
  return {replaced,htmlBuild};
}

const stale=runGuard(0);
assert(stale.replaced&&stale.replaced.includes(`core=${BUILD}`),'stale core pair does not force one fresh document request');
const current=runGuard(2);
assert(current.replaced===null,'current six-row core should not reload');
assert(current.htmlBuild===BUILD,'current six-row core is not marked coherent');

console.log('v1.14.7 board core coherency smoke PASS');
console.log(`matched core cache key: ${BUILD}`);
