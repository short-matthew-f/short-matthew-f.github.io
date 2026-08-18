(function(){
'use strict';
if(window.__ipsDustwaterAudio1140)return;
window.__ipsDustwaterAudio1140=true;

var ctx=null,out=null,noiseBuf=null,armed=false,currentWave=1,boss=false,ambienceTimer=null,voices=0,MAX_VOICES=10,last={peg:0,shot:0,death:0};
function readAudio(){try{return Object.assign({master:.75,sfx:.72,ambience:.12,muted:false},JSON.parse(localStorage.getItem('ips-audio-v1')||'{}'));}catch(e){return{master:.75,sfx:.72,ambience:.12,muted:false};}}
function regionForWave(w){return Math.floor((Math.max(1,Number(w)||1)-1)/10)+1;}
function active(){var a=readAudio();return regionForWave(currentWave)===1&&!a.muted&&Number(a.master||0)>0;}
function sfxGain(mult){var a=readAudio();return Math.max(.0001,Number(a.sfx||.72)*Number(mult||1));}
function ambienceGain(mult){var a=readAudio();return Math.max(.0001,Number(a.ambience||.12)*Number(mult||1));}
function ensure(){
  if(ctx){if(ctx.state==='suspended')ctx.resume();return true;}
  var core=window.__ipsAudioCore,AC;
  if(core&&core.ensure&&core.getContext&&core.getMaster){core.ensure();ctx=core.getContext();if(ctx){out=ctx.createGain();out.gain.value=1;out.connect(core.getMaster());buildNoise();startAmbience();return true;}}
  AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;try{ctx=new AC({latencyHint:'interactive'});}catch(e){ctx=new AC();}out=ctx.createGain();out.gain.value=readAudio().master;out.connect(ctx.destination);buildNoise();startAmbience();return true;
}
function buildNoise(){if(!ctx||noiseBuf)return;var len=Math.floor(ctx.sampleRate*1.7),d,i;noiseBuf=ctx.createBuffer(1,len,ctx.sampleRate);d=noiseBuf.getChannelData(0);for(i=0;i<len;i++)d[i]=Math.random()*2-1;}
function voice(node){if(voices>=MAX_VOICES)return false;voices++;node.onended=function(){voices=Math.max(0,voices-1);};return true;}
function tone(freq,dur,vol,type,slide,delay,pan){if(!ctx||!active()||voices>=MAX_VOICES)return;var o=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner?ctx.createStereoPanner():null,t=ctx.currentTime+Number(delay||0);if(!voice(o))return;o.type=type||'sine';o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(24,slide),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol*sfxGain(1)),t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);if(p){p.pan.value=Math.max(-1,Math.min(1,Number(pan||0)));g.connect(p);p.connect(out);}else g.connect(out);o.start(t);o.stop(t+dur+.03);}
function noise(dur,vol,filterType,freq,delay,amb){if(!ctx||!active()||voices>=MAX_VOICES)return;buildNoise();if(!noiseBuf)return;var s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime+Number(delay||0),scale=amb?ambienceGain(1):sfxGain(1);if(!voice(s))return;s.buffer=noiseBuf;f.type=filterType||'bandpass';f.frequency.value=freq||700;f.Q.value=.8;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol*scale),t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(out);s.start(t,Math.random()*Math.max(.01,noiseBuf.duration-dur-.02),Math.min(dur,noiseBuf.duration-.02));}
function chord(freqs,dur,vol,delay){freqs.forEach(function(f,i){tone(f,dur,vol*(i?0.65:1),i?'sine':'triangle',null,Number(delay||0)+i*.018,(i-1)*.18);});}

/* Dustwater's sonic signature: dry revolver mechanics, wood/iron board, haunted wind. */
function shot(d){if(!active())return;var now=performance.now();if(now-last.shot<38)return;last.shot=now;if(d.crit){noise(.055,.055,'highpass',1850,0);tone(1240,.055,.035,'triangle',630,.012,.4);tone(1810,.075,.022,'sine',920,.035,-.35);}else if(d.kind==='normal'){noise(.032,.018,'highpass',2300,0);tone(125,.045,.018,'triangle',74,.008);}else if(d.kind==='fire'){tone(185,.09,.024,'sawtooth',92,0);noise(.06,.015,'highpass',1400,.012);}else if(d.kind==='boom'){tone(58,.18,.055,'sine',31,0);noise(.12,.035,'lowpass',420,0);}else if(d.kind==='chain'){tone(1680,.07,.026,'square',260,0);tone(980,.05,.018,'square',170,.035);}else if(d.kind==='pierce'){tone(1960,.07,.023,'triangle',560,0,.35);} }
function peg(d){if(!active()||d.type==='normal')return;var now=performance.now();if(now-last.peg<55)return;last.peg=now;if(d.type==='pin'){tone(510,.035,.015,'triangle',380,0);tone(190,.028,.009,'square',130,.018);}else if(d.type==='fire'){tone(92,.085,.024,'sine',54,0);noise(.045,.012,'bandpass',370,0);}else if(d.type==='split'){tone(690,.035,.014,'triangle',980,0,-.45);tone(910,.035,.012,'triangle',1220,.026,.45);}else if(d.type==='pierce')tone(1540,.052,.016,'triangle',530,0,.25);else if(d.type==='boom'){tone(74,.11,.033,'sine',38,0);noise(.08,.02,'lowpass',520,0);}else if(d.type==='chain'){tone(1320,.052,.018,'square',230,0);tone(1810,.04,.011,'square',420,.024);}}
function enemyDeath(d){if(!active())return;var now=performance.now();if(now-last.death<70&&!d.boss)return;last.death=now;if(d.boss){undertakerFall();return;}if(d.kind==='ghost'){tone(740,.22,.018,'sine',190,0);tone(1060,.18,.009,'sine',260,.04);}else if(d.kind==='troll'){tone(66,.16,.026,'sawtooth',37,0);noise(.12,.018,'lowpass',300,0);}else if(d.kind==='ghoul'){tone(360,.08,.018,'sawtooth',96,0);noise(.06,.012,'bandpass',870,0);}else{tone(118,.09,.015,'triangle',62,0);noise(.055,.009,'bandpass',480,0);}}
function cylinder(){if(!active())return;tone(370,.025,.01,'square',280,0,-.45);tone(520,.024,.009,'triangle',410,.06,-.15);tone(660,.024,.008,'triangle',520,.12,.15);tone(460,.035,.011,'square',330,.18,.38);}
function wallet(d){if(!active())return;var positive=Number(d&&d.positive||0)>=0;tone(positive?860:410,.05,.012,'triangle',positive?1160:290,0);if(positive)tone(1210,.05,.008,'sine',1540,.045);}
function upgrade(){if(!active())return;chord([293.66,440,587.33],.16,.016,0);tone(880,.09,.011,'triangle',1320,.11);}
function loot(d){if(!active())return;if(d.source==='boss'){chord([220,329.63,440],.42,.018,0);tone(659.25,.22,.012,'sine',987,.18);}else chord([293.66,440],.19,.011,0);}
function heroDeath(){if(!active())return;tone(146.83,.62,.026,'sawtooth',49,0);tone(73.42,.8,.018,'sine',36,.16);noise(.3,.012,'lowpass',250,.05);}
function bossArrival(){if(!active())return;bell(0);bell(.46);bell(.92);setTimeout(function(){if(active())chord([73.42,110,146.83],1.15,.014,0);},1200);}
function bell(delay){tone(220,.8,.024,'sine',205,delay);tone(440,.62,.012,'sine',398,delay+.006);tone(660,.4,.006,'sine',603,delay+.012);}
function undertakerFall(){tone(82.41,.75,.036,'sawtooth',31,0);noise(.4,.028,'lowpass',250,.02);bell(.12);tone(164.81,.8,.015,'sine',55,.35);}
function blueprint(){if(!active())return;chord([293.66,369.99,440],.24,.014,0);tone(739.99,.15,.01,'triangle',1108,.17);}

function ambienceEvent(){if(!ctx||!active()||document.hidden)return;var r=Math.random();if(boss){if(r<.45){tone(55,.32,.004,'sine',48,0);tone(55,.32,.0035,'sine',48,.42);}else noise(.65,.004,'bandpass',330,0,true);return;}if(r<.36){noise(1.05,.006,'bandpass',260,0,true);tone(215,.5,.003,'sine',175,.22,Math.random()-.5);}else if(r<.62){/* saloon sign / windmill creak */tone(172,.22,.004,'sawtooth',145,0,Math.random()>.5?.65:-.65);tone(126,.28,.003,'triangle',108,.19);}else if(r<.82){/* distant church wire */tone(392,.55,.0035,'sine',376,0,.7);tone(587,.42,.0018,'sine',560,.02,.7);}else{/* far-off night call */tone(520,.34,.0026,'sine',690,0,-.7);tone(610,.26,.002,'sine',470,.29,-.7);}}
function startAmbience(){if(ambienceTimer)return;ambienceTimer=setInterval(ambienceEvent,3100);}
function setWave(d){currentWave=Number(d.wave||currentWave||1);boss=!!d.boss;if(active()&&boss)bossArrival();}
function arm(){if(armed)return;armed=true;ensure();}
function bind(){
  document.addEventListener('ips:waveStart',function(e){setWave(e.detail||{});});
  document.addEventListener('ips:shot',function(e){if(ensure())shot(e.detail||{});});
  document.addEventListener('ips:peg',function(e){if(ensure())peg(e.detail||{});});
  document.addEventListener('ips:enemyDeath',function(e){if(ensure())enemyDeath(e.detail||{});});
  document.addEventListener('ips:reloadStart',function(){if(ensure())cylinder();});
  document.addEventListener('ips:upgrade',function(){if(ensure())upgrade();});
  document.addEventListener('ips:pegUpgrade',function(){if(ensure())upgrade();});
  document.addEventListener('ips:loot',function(e){if(ensure())loot(e.detail||{});});
  document.addEventListener('ips:lootChoice',function(e){if(ensure())wallet({positive:(e.detail||{}).equip?0:1});});
  document.addEventListener('ips:contractClaim',function(){if(ensure())wallet({positive:1});});
  document.addEventListener('ips:heroDeath',function(){if(ensure())heroDeath();});
  document.addEventListener('ips:blueprintResearch',function(){if(ensure())blueprint();});
  document.addEventListener('pointerdown',arm,{once:true,capture:true});document.addEventListener('touchstart',arm,{once:true,capture:true,passive:true});
}
function parseWave(){var el=document.getElementById('waveBadge'),m=((el&&el.textContent)||'').match(/(\d+)/);currentWave=m?Number(m[1]):1;boss=currentWave%10===0;}
parseWave();bind();window.__ipsDustwaterAudio={version:'1.14.0',active:active};
})();
