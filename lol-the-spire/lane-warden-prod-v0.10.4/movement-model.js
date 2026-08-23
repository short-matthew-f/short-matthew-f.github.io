(() => {
'use strict';
const E=window.LW_ENGINE,L=window.LW_LIVING,D=window.LW_DATA;
if(!E||!L||!D)return;
const BUILD='P2-0.17.1',VERTICAL_EQUIV=.24,EPS=.0001;
const CROSSINGS=Object.freeze([
  Object.freeze({id:'old-gate-steps',x:.265,bend:.018,label:'OLD GATE STEPS',kind:'steps'}),
  Object.freeze({id:'dry-creek-ford',x:.505,bend:-.024,label:'DRY CREEK FORD',kind:'ford'}),
  Object.freeze({id:'ridge-cut',x:.735,bend:.021,label:'RIDGE CUT',kind:'trail'})
]);
const baseSetLane=E.setCommanderLane.bind(E);
const baseStep=E.stepBattle.bind(E);
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function laneY(lane){return lane==='south'?1:0}
function yLane(y){return y>=.5?'south':'north'}
function samePoint(a,b){return Math.abs(a.x-b.x)<EPS&&Math.abs(a.y-b.y)<EPS}
function segLen(a,b){return Math.hypot(b.x-a.x,(b.y-a.y)*VERTICAL_EQUIV)}
function routeLen(points){let n=0;for(let i=1;i<points.length;i++)n+=segLen(points[i-1],points[i]);return n}
function clean(points){const out=[];for(const p of points){const q={x:clamp(p.x,.12,.86),y:clamp(p.y,0,1)};if(!out.length||!samePoint(out[out.length-1],q))out.push(q)}return out}
function crossingPoint(c,y){const t=clamp(y,0,1),s=Math.sin(Math.PI*t),meander=Math.sin(Math.PI*t*2)*c.bend*.34;return{x:c.x+c.bend*s+meander,y:t}}
function chooseCrossing(start,targetPos){return CROSSINGS.slice().sort((a,b)=>{
  const sa=Math.abs(start.x-crossingPoint(a,start.y<.5?0:1).x)+Math.abs(targetPos-a.x);
  const sb=Math.abs(start.x-crossingPoint(b,start.y<.5?0:1).x)+Math.abs(targetPos-b.x);
  return sa-sb;
})[0]}
function crossingById(id){return CROSSINGS.find(c=>c.id===id)||null}
function crossingSection(c,fromY,toY){const out=[],steps=Math.max(2,Math.ceil(Math.abs(toY-fromY)*4));for(let i=0;i<=steps;i++)out.push(crossingPoint(c,fromY+(toY-fromY)*(i/steps)));return out}
function durationMultiplier(b,fromLane,toLane,crossing=null){let m=1;const effects=b.runEffects||{};if(effects.relics?.includes('relic-junction-spurs'))m*=.8;const dep=b.deployment||{};if((dep[fromLane]?.units?.wardrunner||0)>0||(dep[toLane]?.units?.wardrunner||0)>0)m*=.85;if(dep[fromLane]?.tower==='beacon'||dep[toLane]?.tower==='beacon')m*=.85;if(crossing)m*=window.LW_FIELDWORKS?.relayMultiplier?.(b,crossing,fromLane,toLane)??1;return m}
function routePoint(t){const route=t?.route;if(!route?.length)return{x:t?.fromPos??.3,y:laneY(t?.from||'north')};if(route.length===1)return{...route[0]};const total=t.routeLength||routeLen(route),elapsed=Math.max(0,total*(1-clamp((t.remaining||0)/Math.max(.0001,t.total||1),0,1)));let left=elapsed;for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],len=segLen(a,b);if(left<=len+EPS){const q=len<=EPS?1:clamp(left/len,0,1);return{x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q}}left-=len}return{...route[route.length-1]}}
function buildRoute(start,targetLane,targetPos,preferredCrossing){
  const targetY=laneY(targetLane),points=[start];
  if(Math.abs(start.y-targetY)<EPS){points.push({x:targetPos,y:targetY});return{points:clean(points),crossing:null}}
  const midField=start.y>EPS&&start.y<1-EPS,c=midField&&crossingById(preferredCrossing)||chooseCrossing(start,targetPos);
  if(!midField)points.push(crossingPoint(c,start.y<.5?0:1));
  points.push(...crossingSection(c,start.y,targetY).slice(1));
  points.push({x:targetPos,y:targetY});
  return{points:clean(points),crossing:c.id};
}
function installTravel(b,start,targetLane,targetPos,template){targetPos=clamp(targetPos,.12,.86);const built=buildRoute(start,targetLane,targetPos,template?.crossing),route=built.points,length=Math.max(.001,routeLen(route)),fromLane=yLane(start.y),mult=durationMultiplier(b,fromLane,targetLane,built.crossing),speed=L.cfg.commanderSpeed/Math.max(.001,mult),duration=Math.max(.18,length/speed);b.commander.move=null;b.commander.travel={...(template||{}),from:fromLane,to:targetLane,fromPos:start.x,targetPos,route,routeLength:length,total:duration,remaining:duration,speed,movementMultiplier:mult,crossing:built.crossing};b.events.push({t:b.elapsed,type:'commander-route',from:fromLane,to:targetLane,targetPos,length,duration,multiplier:mult,crossing:built.crossing});return true}
function settledPoint(c){return{x:clamp(c.pos??.3,.12,.86),y:laneY(c.lane||'north')}}
function targetForLane(b,lane){return clamp(L.frontlinePos?.(b,lane)??b.lanes?.[lane]?.front??.3,.12,.86)}
E.setCommanderPosition=(b,lane,pos)=>{L.ensureLiving?.(b);const c=b?.commander;if(!c||c.incapacitated||!b.lanes?.[lane])return false;pos=clamp(pos,.12,.86);if(c.travel){const start=routePoint(c.travel);return installTravel(b,start,lane,pos,c.travel)}if(c.lane===lane){const from=clamp(c.pos??.3,.12,.86),dist=Math.abs(pos-from);if(dist<.01){c.pos=pos;c.move=null;return true}const mult=durationMultiplier(b,lane,lane),speed=L.cfg.commanderSpeed/Math.max(.001,mult),duration=Math.max(.18,dist/speed);c.move={from,to:pos,total:duration,remaining:duration,speed,movementMultiplier:mult};b.events.push({t:b.elapsed,type:'commander-position-move',lane,from,to:pos,duration,multiplier:mult});return true}const start=settledPoint(c),ok=baseSetLane(b,lane);if(!ok)return false;return installTravel(b,start,lane,pos,c.travel)};
E.setCommanderLane=(b,lane)=>{L.ensureLiving?.(b);const c=b?.commander;if(!c||c.incapacitated||!b.lanes?.[lane])return false;const pos=targetForLane(b,lane);if(c.travel)return E.setCommanderPosition(b,lane,pos);if(c.lane===lane)return E.setCommanderPosition(b,lane,pos);const start=settledPoint(c),ok=baseSetLane(b,lane);if(!ok)return false;return installTravel(b,start,lane,pos,c.travel)};
E.stepBattle=(b,dt)=>baseStep(b,dt);
function display(c){if(!c)return{lane:'north',pos:.3,y:0,moving:false};if(c.travel?.route){const p=routePoint(c.travel);return{lane:yLane(p.y),pos:p.x,y:p.y,moving:true,crossing:c.travel.crossing||null}}if(c.move){return{lane:c.lane||'north',pos:c.pos??.3,y:laneY(c.lane||'north'),moving:true,crossing:null}}return{lane:c.lane||'north',pos:c.pos??.3,y:laneY(c.lane||'north'),moving:false,crossing:null}}
const priorSelf=E.selfTest?.bind(E);E.selfTest=()=>{const base=priorSelf?priorSelf():{pass:true,checks:{}},run=E.newRun('movement-consistency'),b=E.createBattle(run,E.defaultDeployment());const p0=b.commander.pos??.3;E.setCommanderPosition(b,'north',p0+.18);const sameDuration=b.commander.move?.total||0;const expectedSame=.18/(L.cfg.commanderSpeed/(durationMultiplier(b,'north','north')));const sameConstant=Math.abs(sameDuration-expectedSame)<.02;while(b.commander.move)E.stepBattle(b,.05);b.commander.pos=.18;E.setCommanderPosition(b,'south',.22);const west=b.commander.travel,westRoute=west?.crossing;const routeConstant=!!west?.route&&Math.abs(west.total-(west.routeLength/west.speed))<.02;const before=routePoint(west);E.stepBattle(b,.5);const after=routePoint(b.commander.travel),advanced=segLen(before,after)>0;const b2=E.createBattle(E.newRun('movement-east'),E.defaultDeployment());b2.commander.pos=.78;E.setCommanderPosition(b2,'south',.72);const eastRoute=b2.commander.travel?.crossing;const checks={movementSameLaneConstant:sameConstant,movementRouteConstant:routeConstant,movementRouteAdvances:advanced,movementMultipleCrossings:westRoute==='old-gate-steps'&&eastRoute==='ridge-cut',movementCrossLaneWeight:west.total>2.5};return{pass:base.pass&&Object.values(checks).every(Boolean),checks:{...base.checks,...checks}}};
window.LW_MOVEMENT={build:BUILD,junction:CROSSINGS[1].x,verticalEquivalent:VERTICAL_EQUIV,crossings:CROSSINGS,crossingPoint,display,routePoint,durationMultiplier};
})();
