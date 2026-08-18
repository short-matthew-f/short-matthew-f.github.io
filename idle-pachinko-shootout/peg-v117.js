(function(){
'use strict';
var board=document.getElementById('board'),wrap=board&&board.closest('.board-wrap'),PIN=4,menu=null;
function positions(){var out=[],r,c,n,g=(393-56)/8;for(r=0;r<8;r++){n=r%2?8:9;for(c=0;c<n;c++)out.push({x:28+c*g+(r%2?g/2:0),y:70+r*44});}return out;}
var POS=positions();
function point(ev){var r=board.getBoundingClientRect();return{x:(ev.clientX-r.left)*(board.width/r.width),y:(ev.clientY-r.top)*(board.height/r.height)};}
function nearest(pt,max){var p=POS[PIN],dx=p.x-pt.x,dy=p.y-pt.y;return dx*dx+dy*dy<=max*max?PIN:-1;}
function remove(){if(menu&&menu.parentNode)menu.parentNode.removeChild(menu);menu=null;}
function show(clientX,clientY){remove();menu=document.createElement('div');menu.className='peg-context firing-pin-context';menu.innerHTML='<div class="peg-context-head"><div><small>BOARD HARDWARE</small><b>Firing Pin</b></div><span>ANCHOR</span></div><div class="peg-effect">Every ball passes through this launch point. It is permanent board hardware and has no upgrade, move, or sell controls.</div>';wrap.appendChild(menu);var wr=wrap.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(wr.width-218,clientX-wr.left+8))+'px';menu.style.top=Math.max(8,clientY-wr.top+8)+'px';}
if(board&&wrap){board.addEventListener('pointerup',function(ev){var pt=point(ev);if(nearest(pt,22)!==PIN)return;ev.preventDefault();show(ev.clientX,ev.clientY);},true);document.addEventListener('pointerdown',function(ev){if(menu&&!menu.contains(ev.target)&&ev.target!==board)remove();},true);window.addEventListener('resize',remove);}
})();
