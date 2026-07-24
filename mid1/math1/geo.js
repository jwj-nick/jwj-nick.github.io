/* geo.js — mid1 기하 탐험 공용 SVG 툴킷 (mid2 makeGeo 이식, 자체완결)
 * window.MG.makeGeo(svg) → {el,clear,poly,seg,dot,label,angle,tick,right}
 * 색은 explore.html 의 :root CSS 변수(--u/--accent/--sage/--ink/--muted/--panel/--border 등) 사용.
 */
(function(){
  'use strict';
  function P(x,y){ return {x:x,y:y}; }
  function makeGeo(svg){
    var ns='http://www.w3.org/2000/svg';
    function el(t,a){var e=document.createElementNS(ns,t);for(var k in a)e.setAttribute(k,a[k]);svg.appendChild(e);return e;}
    function ang(c,p){return Math.atan2(p.y-c.y,p.x-c.x);}
    return {
      el:el,
      clear:function(){while(svg.firstChild)svg.removeChild(svg.firstChild);},
      poly:function(pts,o){o=o||{};return el('polygon',{points:pts.map(function(p){return p.x+','+p.y;}).join(' '),
        fill:o.fill||'var(--u-soft)',stroke:o.stroke||'var(--u)','stroke-width':o.sw||2,'stroke-linejoin':'round'});},
      seg:function(p,q,o){o=o||{};return el('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:o.stroke||'var(--u)',
        'stroke-width':o.sw||2,'stroke-linecap':'round','stroke-dasharray':o.dash||'none'});},
      dot:function(p,o){o=o||{};return el('circle',{cx:p.x,cy:p.y,r:o.r||4.5,fill:o.fill||'var(--accent)',stroke:o.stroke||'var(--panel)','stroke-width':o.sw||2});},
      label:function(p,txt,o){o=o||{};var t=el('text',{x:p.x+(o.dx||0),y:p.y+(o.dy||0),'text-anchor':o.anchor||'middle',
        'font-size':o.size||13,'font-weight':o.weight||'700',fill:o.fill||'var(--ink)'});t.textContent=txt;return t;},
      angle:function(c,a,b,o){o=o||{};var r=o.r||18;var a0=ang(c,a),a1=ang(c,b);
        var d=a1-a0; while(d<=-Math.PI)d+=2*Math.PI; while(d>Math.PI)d-=2*Math.PI;
        var sweep=(d>0?1:0);
        var p0={x:c.x+r*Math.cos(a0),y:c.y+r*Math.sin(a0)}, p1={x:c.x+r*Math.cos(a1),y:c.y+r*Math.sin(a1)};
        el('path',{d:'M'+p0.x+','+p0.y+' A'+r+','+r+' 0 0 '+sweep+' '+p1.x+','+p1.y,
          fill:'none',stroke:o.stroke||'var(--accent)','stroke-width':o.sw||2});
        if(o.marks){var mid=a0+d/2, mc={x:c.x+r*Math.cos(mid),y:c.y+r*Math.sin(mid)};
          for(var i=0;i<o.marks;i++){var off=(i-(o.marks-1)/2)*4, nrm=mid+Math.PI/2;
            el('line',{x1:mc.x+Math.cos(mid)*-3+Math.cos(nrm)*off,y1:mc.y+Math.sin(mid)*-3+Math.sin(nrm)*off,
              x2:mc.x+Math.cos(mid)*3+Math.cos(nrm)*off,y2:mc.y+Math.sin(mid)*3+Math.sin(nrm)*off,
              stroke:o.stroke||'var(--accent)','stroke-width':1.5});}}
      },
      tick:function(p,q,n,o){o=o||{};n=n||1;var mx=(p.x+q.x)/2,my=(p.y+q.y)/2;
        var dx=q.x-p.x,dy=q.y-p.y,L=Math.hypot(dx,dy)||1;var ux=dx/L,uy=dy/L,nx=-uy,ny=ux;
        for(var i=0;i<n;i++){var off=(i-(n-1)/2)*4;
          el('line',{x1:mx+ux*off-nx*5,y1:my+uy*off-ny*5,x2:mx+ux*off+nx*5,y2:my+uy*off+ny*5,
            stroke:o.stroke||'var(--gold,#c9972b)','stroke-width':o.sw||2,'stroke-linecap':'round'});}
      },
      right:function(c,a,b,o){o=o||{};var s=o.s||11;
        var ua=ang(c,a),ub=ang(c,b);var pa={x:c.x+s*Math.cos(ua),y:c.y+s*Math.sin(ua)},pb={x:c.x+s*Math.cos(ub),y:c.y+s*Math.sin(ub)};
        var pc={x:pa.x+pb.x-c.x,y:pa.y+pb.y-c.y};
        el('path',{d:'M'+pa.x+','+pa.y+' L'+pc.x+','+pc.y+' L'+pb.x+','+pb.y,fill:'none',stroke:o.stroke||'var(--muted)','stroke-width':1.4});}
    };
  }
  window.MG={ P:P, makeGeo:makeGeo };
})();
