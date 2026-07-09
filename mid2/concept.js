/* concept.js — 중2-1 개념 여정 공용 엔진 + 인터랙티브 부품
 * window.MJ 네임스페이스로 노출. 각 단원 페이지가 필요한 부품만 골라 쓴다.
 */
(function(){
  'use strict';
  var MINUS='−';
  var sgn=function(n){return n<0?MINUS+Math.abs(n):''+n;};
  var $=function(id){return document.getElementById(id);};

  /* ── 테마: 라이트 기본, 토글 선택, 저장 ── */
  function initTheme(){
    var t;
    try{ t=localStorage.getItem('m2theme'); }catch(e){}
    if(t!=='dark'&&t!=='light') t='light';           // 기본 라이트 (OS 무관)
    document.documentElement.setAttribute('data-theme',t);
    var btn=document.getElementById('ttoggle');
    if(btn){
      var paint=function(){btn.textContent=document.documentElement.getAttribute('data-theme')==='dark'?'☀':'🌙';};
      paint();
      btn.onclick=function(){
        var cur=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
        document.documentElement.setAttribute('data-theme',cur);
        try{localStorage.setItem('m2theme',cur);}catch(e){}
        paint();
      };
    }
  }

  /* ── 스크롤 등장 ── */
  function initReveal(){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)e.target.classList.add('in');});},{threshold:.1});
    document.querySelectorAll('.reveal').forEach(function(s){io.observe(s);});
  }

  /* ── 진도/보상 (가벼움) ── */
  function store(){var s={};try{s=JSON.parse(localStorage.getItem('m2progress'))||{};}catch(e){}return s;}
  function saveStore(s){try{localStorage.setItem('m2progress',JSON.stringify(s));}catch(e){}}
  function completeUnit(unitId){var s=store();s[unitId]=true;saveStore(s);var n=document.getElementById('done-note');if(n)n.classList.add('show');}
  function isDone(unitId){return !!store()[unitId];}
  // 진행 도트: 활동(teach-back·문제만들기 등) 하나 끝날 때 하나씩 켬
  function makeProgress(barId,total){
    var bar=document.getElementById(barId); if(!bar)return function(){};
    for(var i=0;i<total;i++){var e=document.createElement('i');bar.appendChild(e);}
    var done=0;
    return function step(){ if(done<total){bar.children[done].classList.add('on');done++;} };
  }

  /* ── 식 포맷 ── */
  function fmtEq(a,b){
    var ax=a===0?'':a===1?'x':a===-1?(MINUS+'x'):(a+'x');
    var bp=b===0?'':(ax===''?sgn(b):(b>0?(' + '+b):(' '+MINUS+' '+Math.abs(b))));
    return 'y = '+((ax===''&&b===0)?'0':(ax+bp));
  }

  /* ── 좌표평면 ── */
  function makePlane(svg,opt){
    opt=opt||{}; var W=340,H=300,cx=W/2,cy=H/2,U=opt.unit||24;
    var ns='http://www.w3.org/2000/svg';
    function X(x){return cx+x*U;} function Y(y){return cy-y*U;}
    function el(t,a){var e=document.createElementNS(ns,t);for(var k in a)e.setAttribute(k,a[k]);return e;}
    for(var i=-7;i<=7;i++){
      svg.appendChild(el('line',{x1:X(i),y1:0,x2:X(i),y2:H,stroke:'var(--grid)','stroke-width':1}));
      svg.appendChild(el('line',{x1:0,y1:Y(i),x2:W,y2:Y(i),stroke:'var(--grid)','stroke-width':1}));
    }
    svg.appendChild(el('line',{x1:0,y1:cy,x2:W,y2:cy,stroke:'var(--axis)','stroke-width':1.4}));
    svg.appendChild(el('line',{x1:cx,y1:0,x2:cx,y2:H,stroke:'var(--axis)','stroke-width':1.4}));
    var dyn={};
    function line(id,a,b,color){
      color=color||'var(--line)'; var x1=-7,x2=7,y1=a*x1+b,y2=a*x2+b;
      var g=dyn[id];
      if(!g){var glow=el('line',{opacity:.18,'stroke-width':9,'stroke-linecap':'round',stroke:color});
        var ln=el('line',{'stroke-width':3,'stroke-linecap':'round',stroke:color});
        svg.appendChild(glow);svg.appendChild(ln);g=dyn[id]={glow:glow,ln:ln};}
      [g.glow,g.ln].forEach(function(L){L.setAttribute('stroke',color);L.setAttribute('x1',X(x1));L.setAttribute('y1',Y(y1));L.setAttribute('x2',X(x2));L.setAttribute('y2',Y(y2));});
    }
    function dot(id,x,y,color){
      color=color||'var(--accent)'; var d=dyn['dot_'+id];
      if(!d){var gl=el('circle',{r:11,opacity:.28,fill:color});var c=el('circle',{r:5.5,fill:color});
        svg.appendChild(gl);svg.appendChild(c);d=dyn['dot_'+id]={gl:gl,c:c};}
      [d.gl,d.c].forEach(function(o){o.setAttribute('fill',color);o.setAttribute('cx',X(x));o.setAttribute('cy',Y(y));});
    }
    return {line:line,dot:dot,X:X,Y:Y};
  }

  /* ── 수직선 (부등식) ── */
  function makeNumberLine(svg){
    var W=420,H=70,pad=24,cy=40,U=(W-2*pad)/14; // -7..7
    var ns='http://www.w3.org/2000/svg';
    function X(x){return pad+(x+7)*U;}
    function el(t,a){var e=document.createElementNS(ns,t);for(var k in a)e.setAttribute(k,a[k]);return e;}
    svg.appendChild(el('line',{x1:pad,y1:cy,x2:W-pad,y2:cy,stroke:'var(--axis)','stroke-width':1.6}));
    for(var i=-7;i<=7;i++){svg.appendChild(el('line',{x1:X(i),y1:cy-4,x2:X(i),y2:cy+4,stroke:'var(--axis)','stroke-width':1}));
      var tx=el('text',{x:X(i),y:cy+18,'text-anchor':'middle','font-size':10,fill:'var(--muted)'});tx.textContent=i;svg.appendChild(tx);}
    var ray=el('line',{stroke:'var(--line)','stroke-width':5,'stroke-linecap':'round'});
    var bd=el('circle',{r:6,'stroke-width':2.5,stroke:'var(--line)'});
    svg.appendChild(ray);svg.appendChild(bd);
    return function update(val,type){ // type: lt le gt ge
      var right=(type==='gt'||type==='ge'), closed=(type==='le'||type==='ge');
      ray.setAttribute('x1',X(val));ray.setAttribute('y1',cy);
      ray.setAttribute('x2', right?X(7):X(-7));ray.setAttribute('y2',cy);
      bd.setAttribute('cx',X(val));bd.setAttribute('cy',cy);
      bd.setAttribute('fill',closed?'var(--line)':'var(--panel)');
    };
  }

  /* ── 지수 블록 ── */
  function renderBlocks(mount,m,n){
    mount.innerHTML='';
    function grp(k,cls){var g=document.createElement('div');g.className='bgrp'+(cls||'');for(var i=0;i<k;i++){var b=document.createElement('div');b.className='blk';g.appendChild(b);}return g;}
    mount.appendChild(grp(m));
    var op=document.createElement('div');op.className='op';op.textContent='×';mount.appendChild(op);
    mount.appendChild(grp(n,' g2'));
  }

  /* ── 순환/유한 소수 ── */
  function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var t=b;b=a%b;a=t;}return a;}
  function decimalOf(n,d){
    var intPart=Math.floor(n/d),rem=n%d,digits=[],seen={},repeatStart=-1;
    while(rem!==0){
      if(seen[rem]!==undefined){repeatStart=seen[rem];break;}
      seen[rem]=digits.length; rem*=10; digits.push(Math.floor(rem/d)); rem=rem%d;
    }
    return {finite:repeatStart===-1,intPart:intPart,digits:digits,repeatStart:repeatStart};
  }
  function factorNote(d){ // 기약분모 d의 2,5 제거 후 남는 것
    var t=d; while(t%2===0)t/=2; while(t%5===0)t/=5; return {finite:t===1,left:t};
  }

  /* ── 간단 확인 ── */
  function checkNum(inputId,correct,outId,onOk){
    var el=document.getElementById(inputId),out=document.getElementById(outId);
    var v=parseInt(el.value,10);
    if(isNaN(v)){out.innerHTML='숫자를 넣어봐.';return;}
    if(v===correct){out.innerHTML='<span class="good">맞아! ✓</span>';if(onOk)onOk();}
    else out.innerHTML='다시 볼까? 정답은 <b class="gold">'+correct+'</b>.';
  }
  function reveal(btnId,boxId,onShow){var b=document.getElementById(btnId);if(!b)return;b.onclick=function(){document.getElementById(boxId).classList.add('show');b.style.display='none';if(onShow)onShow();};}

  window.MJ={initTheme:initTheme,initReveal:initReveal,completeUnit:completeUnit,isDone:isDone,
    makeProgress:makeProgress,fmtEq:fmtEq,sgn:sgn,makePlane:makePlane,makeNumberLine:makeNumberLine,
    renderBlocks:renderBlocks,decimalOf:decimalOf,factorNote:factorNote,gcd:gcd,checkNum:checkNum,reveal:reveal,
    boot:function(){initTheme();initReveal();}};
})();
