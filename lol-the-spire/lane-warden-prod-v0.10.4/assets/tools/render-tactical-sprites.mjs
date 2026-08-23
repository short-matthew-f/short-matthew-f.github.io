#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),sharp=require('sharp'),{Matrix4,Quaternion,Vector3}=require('three');
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..');
const SOURCE='assets/models/source/quaternius';
const OUTPUT=path.join(ROOT,'assets/models/processed/sprites');
const CELL=128;

const roster=[
  {id:'tactical_warden',model:`${SOURCE}/rpg-character-pack/Warrior.gltf`,clips:{idle:['Idle_Weapon',.28],march:['Run_Weapon',.22],engaged:['Sword_Attack',.48],fallen:['Death',.86]},scale:1.30,color:'#53c8bc'},
  {id:'tactical_ironjack',model:`${SOURCE}/ultimate-animated-character-pack/Knight_Golden_Male.gltf`,clips:{idle:['Idle',.25],march:['Walk',.36],engaged:['SwordSlash',.48],fallen:['Death',.86]},scale:1.08,color:'#d9bd62'},
  {id:'tactical_slingline',model:`${SOURCE}/rpg-character-pack/Ranger.gltf`,clips:{idle:['Idle_Weapon',.25],march:['Run_Holding',.22],engaged:['Bow_Shoot',.50],fallen:['Death',.86]},scale:1.00,color:'#78cbb9'},
  {id:'tactical_enemy_line',model:`${SOURCE}/ultimate-animated-character-pack/Soldier_Male.gltf`,clips:{idle:['Idle',.25],march:['Walk',.36],engaged:['SwordSlash',.48],fallen:['Death',.86]},scale:1.00,color:'#bd5b52'},
  {id:'tactical_enemy_raider',model:`${SOURCE}/ultimate-animated-character-pack/Goblin_Male.gltf`,clips:{idle:['Idle',.25],march:['Run',.24],engaged:['SwordSlash',.48],fallen:['Death',.86]},scale:.92,color:'#db8655'},
  {id:'tactical_enemy_brute',model:`${SOURCE}/ultimate-monsters/Orc.gltf`,clips:{idle:['Idle',.25],march:['Run',.24],engaged:['Weapon',.50],fallen:['Death',.84]},scale:1.62,color:'#983e43'},
  {id:'tactical_bastion',model:`${SOURCE}/ultimate-fantasy-rts/Barracks_FirstAge_Level1.gltf`,clips:{idle:[null,0]},scale:1.25,color:'#477b72'},
  {id:'tactical_guard',model:`${SOURCE}/ultimate-fantasy-rts/WallTowers_FirstAge.gltf`,clips:{idle:[null,0]},scale:1.05,color:'#8e5452'},
  {id:'tactical_gate',model:`${SOURCE}/ultimate-fantasy-rts/WallTowers_DoorClosed_FirstAge.gltf`,clips:{idle:[null,0]},scale:1.28,color:'#a47b3e'},
  {id:'tactical_tower_chassis',model:`${SOURCE}/ultimate-fantasy-rts/WatchTower_FirstAge_Level1.gltf`,clips:{idle:[null,0]},scale:1.10,color:'#5c8e96'}
];

const components={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rgb(hex){const n=parseInt(hex.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255]}
function shade(hex,k){const c=rgb(hex).map(v=>Math.round(clamp(v*k,0,255)));return`rgb(${c.join(',')})`}
function dataBuffer(uri){const comma=uri.indexOf(',');return Buffer.from(uri.slice(comma+1),'base64')}
function reader(gltf){
  const buffers=gltf.buffers.map(b=>dataBuffer(b.uri));
  return index=>{
    const a=gltf.accessors[index],view=gltf.bufferViews[a.bufferView],Ctor=components[a.componentType],width=widths[a.type],size=Ctor.BYTES_PER_ELEMENT,stride=view.byteStride||width*size,offset=(view.byteOffset||0)+(a.byteOffset||0),buffer=buffers[view.buffer];
    const out=new Array(a.count);for(let i=0;i<a.count;i++){const row=[];for(let j=0;j<width;j++)row.push(new Ctor(buffer.buffer,buffer.byteOffset+offset+i*stride+j*size,1)[0]);out[i]=width===1?row[0]:row}return out;
  };
}
function sampleTrack(times,values,time,pathName,interpolation='LINEAR'){
  let hi=times.findIndex(t=>t>=time);if(hi<0)hi=times.length-1;const lo=Math.max(0,hi-1),span=Math.max(.00001,times[hi]-times[lo]),t=hi===lo?0:clamp((time-times[lo])/span,0,1);
  const cubic=interpolation==='CUBICSPLINE',pick=i=>values[cubic?i*3+1:i];const a=pick(lo),b=pick(hi);if(!Array.isArray(a))return a+(b-a)*t;
  if(pathName==='rotation')return new Quaternion(...a).slerp(new Quaternion(...b),t).toArray();return a.map((v,j)=>v+(b[j]-v)*t);
}
function geometryAt(gltf,read,clipName,phase){
  const nodes=(gltf.nodes||[]).map(n=>({...n,_t:[...(n.translation||[0,0,0])],_r:[...(n.rotation||[0,0,0,1])],_s:[...(n.scale||[1,1,1])]}));
  const clip=(gltf.animations||[]).find(a=>a.name===clipName);if(clip){const duration=Math.max(...clip.samplers.flatMap(s=>read(s.input))),time=duration*phase;for(const ch of clip.channels){const s=clip.samplers[ch.sampler],times=read(s.input),values=read(s.output),value=sampleTrack(times,values,time,ch.target.path,s.interpolation);const n=nodes[ch.target.node];if(ch.target.path==='translation')n._t=value;if(ch.target.path==='rotation')n._r=value;if(ch.target.path==='scale')n._s=value}}
  const parents=new Array(nodes.length).fill(-1);nodes.forEach((n,i)=>(n.children||[]).forEach(c=>parents[c]=i));const worlds=new Array(nodes.length);
  function world(i){if(worlds[i])return worlds[i];const n=nodes[i],local=n.matrix&&!clip?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...n._t),new Quaternion(...n._r),new Vector3(...n._s));worlds[i]=parents[i]<0?local:world(parents[i]).clone().multiply(local);return worlds[i]}
  nodes.forEach((_,i)=>world(i));const triangles=[];
  nodes.forEach((node,nodeIndex)=>{if(node.mesh==null)return;const mesh=gltf.meshes[node.mesh],meshWorld=worlds[nodeIndex],skin=node.skin==null?null:gltf.skins[node.skin],jointMats=[];
    if(skin){const inverse=read(skin.inverseBindMatrices),invMesh=meshWorld.clone().invert();for(let j=0;j<skin.joints.length;j++)jointMats[j]=invMesh.clone().multiply(worlds[skin.joints[j]]).multiply(new Matrix4().fromArray(inverse[j]))}
    for(const primitive of mesh.primitives){const pos=read(primitive.attributes.POSITION),joints=primitive.attributes.JOINTS_0!=null?read(primitive.attributes.JOINTS_0):null,weights=primitive.attributes.WEIGHTS_0!=null?read(primitive.attributes.WEIGHTS_0):null,indices=primitive.indices!=null?read(primitive.indices):pos.map((_,i)=>i),verts=pos.map((p,i)=>{
      const v=new Vector3(...p);if(skin&&joints&&weights){const sum=new Vector3();for(let k=0;k<4;k++){if(!weights[i][k])continue;sum.add(v.clone().applyMatrix4(jointMats[joints[i][k]]).multiplyScalar(weights[i][k]))}return sum.applyMatrix4(meshWorld)}return v.applyMatrix4(meshWorld)});
      for(let i=0;i+2<indices.length;i+=3)triangles.push([verts[indices[i]],verts[indices[i+1]],verts[indices[i+2]]]);
    }
  });return triangles;
}
async function loadItem(item){const gltf=JSON.parse(await fs.readFile(path.join(ROOT,item.model),'utf8')),read=reader(gltf),states=[];for(const [state,[clip,phase]] of Object.entries(item.clips))states.push({state,triangles:geometryAt(gltf,read,clip,phase)});return states}
function spriteSvg(item,triangles,extent){
  const all=triangles.flat(),minY=Math.min(...all.map(v=>v.y)),maxY=Math.max(...all.map(v=>v.y)),center=all.reduce((s,v)=>s.add(v),new Vector3()).multiplyScalar(1/all.length);center.y=(minY+maxY)/2;
  const eye=new Vector3(4.4,4.8,7.4),forward=center.clone().sub(eye).normalize(),right=forward.clone().cross(new Vector3(0,1,0)).normalize(),up=right.clone().cross(forward).normalize(),light=new Vector3(-.4,.8,.55).normalize(),scale=112/(extent/item.scale),project=v=>({x:128+v.clone().sub(center).dot(right)*scale,y:128-v.clone().sub(center).dot(up)*scale,z:v.clone().sub(center).dot(forward)});
  const faces=triangles.map(t=>{const p=t.map(project),normal=t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0])).normalize(),lit=.64+.52*Math.abs(normal.dot(light));return{p,z:p.reduce((s,v)=>s+v.z,0)/3,fill:shade(item.color,lit)}}).sort((a,b)=>b.z-a.z);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><g stroke="#0b1519" stroke-opacity=".32" stroke-width=".55" stroke-linejoin="round">${faces.map(f=>`<polygon fill="${f.fill}" points="${f.p.map(p=>`${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}"/>`).join('')}</g></svg>`;
}

await fs.mkdir(OUTPUT,{recursive:true});const frames=[];
for(const item of roster){const states=await loadItem(item),all=states.flatMap(s=>s.triangles).flat(),min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);all.forEach(v=>{min.min(v);max.max(v)});const extent=Math.max(max.x-min.x,max.y-min.y,max.z-min.z)*.62;
  for(const entry of states){const png=await sharp(Buffer.from(spriteSvg(item,entry.triangles,extent))).resize(CELL,CELL).png({palette:true,quality:94}).toBuffer();frames.push({input:png,id:item.id,state:entry.state})}
}
const cols=4,rows=Math.ceil(frames.length/cols),composites=frames.map((f,i)=>({input:f.input,left:(i%cols)*CELL,top:Math.floor(i/cols)*CELL}));await sharp({create:{width:cols*CELL,height:rows*CELL,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composites).png({palette:true,quality:94}).toFile(path.join(OUTPUT,'tactical-models-atlas.png'));
const atlas={cell:CELL,columns:cols,rows,sprites:Object.fromEntries(frames.map((x,i)=>[`${x.id}:${x.state}`,{x:(i%cols)*CELL,y:Math.floor(i/cols)*CELL,w:CELL,h:CELL}]))};await fs.writeFile(path.join(OUTPUT,'tactical-models-atlas.json'),JSON.stringify(atlas,null,2)+'\n');console.log(`Rendered ${frames.length} deterministic model sprites.`);
