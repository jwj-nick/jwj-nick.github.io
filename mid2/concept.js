/* concept.js — 중2-1 개념 여정 공용 엔진 (v2)
 * 사이드바 네비 + 단원 시그니처색 + 그라데이션 히어로 + 예쁜 애니 그래프.
 * window.MJ 로 노출. 각 단원 페이지는 부품만 골라 쓴다. (API는 v1과 호환)
 */
(function(){
  'use strict';
  var MINUS='−';
  var sgn=function(n){return n<0?MINUS+Math.abs(n):''+n;};

  var UNITS=[
    {id:'u1',no:1,t:'유리수와 순환소수',u:'#d76a9c',u2:'#e88fb0'},
    {id:'u2',no:2,t:'식의 계산',u:'#e0973a',u2:'#f0b45f'},
    {id:'u3',no:3,t:'일차부등식',u:'#3fa89a',u2:'#63c6b1'},
    {id:'u4',no:4,t:'연립일차방정식',u:'#8f7bd4',u2:'#b19ce6'},
    {id:'u5',no:5,t:'일차함수와 그래프',u:'#4f92d6',u2:'#77b2ea'},
    {id:'u6',no:6,t:'일차함수와 일차방정식',u:'#e2698a',u2:'#f0929f'},
    {id:'u7',no:7,t:'삼각형의 성질',u:'#4a9a5f',u2:'#6fbf82',sem:2},
    {id:'u8',no:8,t:'사각형의 성질',u:'#c77d9e',u2:'#e0a0bd',sem:2},
    {id:'u9',no:9,t:'도형의 닮음',u:'#4f9bb5',u2:'#75bcd0',sem:2},
    {id:'u10',no:10,t:'피타고라스 정리',u:'#d68a4a',u2:'#eaad70',sem:2},
    {id:'u11',no:11,t:'확률',u:'#b06ad0',u2:'#c98fe0',sem:2}
  ];
  // 탐험(PhET/GeoGebra) 탭이 준비된 단원만 노출 → 미준비 단원에서 404 방지
  var EXPLORE_READY={1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1,9:1,10:1,11:1};
  var PLAY_READY={1:1,2:1,3:1,4:1,5:1};   // 놀이터(g*.html) 완성된 단원만. 6~11 완성 시 여기 추가
  // 파일명 → 단원 번호 + 종류 (u=개념 p=연습 d=심화탐구 dNp=심화문제 g=놀이터)
  function pageInfo(){
    var f=(location.pathname.split('/').pop()||'index.html').toLowerCase().replace(/\?.*$/,'').replace(/\.html$/,'');
    var m;
    if(m=f.match(/^u([1-9]|1[01])$/))  return {no:+m[1],kind:'concept'};
    if(m=f.match(/^p([1-9]|1[01])$/))  return {no:+m[1],kind:'practice'};
    if(m=f.match(/^d([1-9]|1[01])p$/)) return {no:+m[1],kind:'deepq'};
    if(m=f.match(/^d([1-9]|1[01])$/))  return {no:+m[1],kind:'deep'};
    if(m=f.match(/^x([1-9]|1[01])$/))  return {no:+m[1],kind:'explore'};
    if(m=f.match(/^g([1-9]|1[01])$/))  return {no:+m[1],kind:'play'};
    if(/drill/.test(f))          return {kind:'drill'};
    return {kind:'home'};
  }
  function hexA(hex,a){var n=parseInt(hex.slice(1),16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')';}

  /* ── 테마 ── */
  function initTheme(){
    var t; try{t=localStorage.getItem('m2theme');}catch(e){}
    if(t!=='dark'&&t!=='light')t='light';
    document.documentElement.setAttribute('data-theme',t);
  }
  function bindToggle(btn){
    if(!btn)return;
    var paint=function(){btn.textContent=document.documentElement.getAttribute('data-theme')==='dark'?'☀':'🌙';};
    paint();
    btn.onclick=function(){var c=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
      document.documentElement.setAttribute('data-theme',c);try{localStorage.setItem('m2theme',c);}catch(e){}paint();};
  }

  /* ── 진도/보상 ── */
  function store(){var s={};try{s=JSON.parse(localStorage.getItem('m2progress'))||{};}catch(e){}return s;}
  function saveStore(s){try{localStorage.setItem('m2progress',JSON.stringify(s));}catch(e){}}
  function completeUnit(id){var s=store();s[id]=true;saveStore(s);var n=document.getElementById('done-note');if(n)n.classList.add('show');
    var l=document.querySelector('.sb-link[data-id="'+id+'"]');if(l)l.classList.add('done');}
  function isDone(id){return !!store()[id];}
  function makeProgress(barId,total){var bar=document.getElementById(barId);if(!bar)return function(){};
    for(var i=0;i<total;i++)bar.appendChild(document.createElement('i'));var done=0;
    return function(){if(done<total){bar.children[done].classList.add('on');done++;}};}

  /* ── 사이드바 + 히어로 + 탭바 + 색 ── */
  function initChrome(){
    var info=pageInfo();
    var unit=info.no?UNITS[info.no-1]:null;
    var activeId=unit?unit.id:info.kind;               // 사이드바 활성: 단원 하위 페이지는 그 단원
    var root=document.documentElement.style;
    var uc=unit?unit.u:'#d76a9c', uc2=unit?unit.u2:'#e59a3c';
    root.setProperty('--u',uc); root.setProperty('--u-2',uc2); root.setProperty('--u-soft',hexA(uc,0.14));

    // 사이드바
    var s=store();
    var links='<div class="sb-brand">중2 수학<small>1·2학기</small></div>'+
      '<a class="sb-link'+(activeId==='home'?' active':'')+'" href="index.html"><span class="sb-no">🏠</span>홈</a>'+
      '<div class="sb-sep"></div>';
    UNITS.forEach(function(x,i){
      if(x.sem===2 && (i===0||UNITS[i-1].sem!==2)) links+='<div class="sb-sep"></div><div class="sb-group">2학기</div>';
      links+='<a class="sb-link'+(activeId===x.id?' active':'')+(s[x.id]?' done':'')+'" data-id="'+x.id+'" href="'+x.id+'.html">'+
        '<span class="sb-no">'+x.no+'</span>'+x.t+'<span class="sb-chk">✓</span></a>';
    });
    links+='<div class="sb-sep"></div>'+
      '<a class="sb-link tool'+(activeId==='drill'?' active':'')+'" href="drill.html"><span class="sb-no">✏️</span>계산 연습</a>';
    var sb=document.createElement('nav'); sb.className='sidebar'; sb.innerHTML=links;
    var scrim=document.createElement('div'); scrim.className='sb-scrim';
    var hamb=document.createElement('button'); hamb.className='hamb'; hamb.setAttribute('aria-label','메뉴'); hamb.textContent='☰';
    document.body.appendChild(sb); document.body.appendChild(scrim); document.body.appendChild(hamb);
    function close(){sb.classList.remove('open');scrim.classList.remove('open');}
    hamb.onclick=function(){sb.classList.toggle('open');scrim.classList.toggle('open');};
    scrim.onclick=close; sb.addEventListener('click',function(e){if(e.target.closest('a'))close();});

    // 테마 토글 (기존 버튼 있으면 bind)
    bindToggle(document.getElementById('ttoggle'));

    // 단원 페이지: h1 + .lede → 그라데이션 히어로로 감싸고, 바로 뒤에 단원 내 탭바 주입
    if(unit){
      var wrap=document.querySelector('.wrap'); var h1=wrap&&wrap.querySelector('h1');
      if(h1){
        var lede=h1.nextElementSibling&&h1.nextElementSibling.classList.contains('lede')?h1.nextElementSibling:null;
        var hero=document.createElement('div'); hero.className='hero';
        var no=document.createElement('div'); no.className='h-no'; no.textContent='단원 '+unit.no;
        h1.parentNode.insertBefore(hero,h1); hero.appendChild(no); hero.appendChild(h1); if(lede)hero.appendChild(lede);

        var tabs=[
          {k:'concept', href:'u'+unit.no+'.html',  i:'📖', t:'개념'},
          {k:'practice',href:'p'+unit.no+'.html',  i:'✏️', t:'연습'},
          {k:'deep',    href:'d'+unit.no+'.html',  i:'⚗️', t:'심화 탐구'},
          {k:'deepq',   href:'d'+unit.no+'p.html', i:'🎯', t:'심화 문제'}
        ];
        if(PLAY_READY[unit.no]) tabs.splice(1,0,{k:'play',href:'g'+unit.no+'.html',i:'🎨',t:'놀이터'});
        if(EXPLORE_READY[unit.no]) tabs.push({k:'explore',href:'x'+unit.no+'.html',i:'🧭',t:'탐험'});
        var nav=document.createElement('nav'); nav.className='utabs'; nav.setAttribute('aria-label','단원 내 이동');
        nav.innerHTML=tabs.map(function(tb){
          return '<a class="ut'+(info.kind===tb.k?' active':'')+'" href="'+tb.href+'"><span class="ut-i">'+tb.i+'</span>'+tb.t+'</a>';
        }).join('');
        hero.parentNode.insertBefore(nav,hero.nextSibling);
      }
    }
  }

  /* ── 스크롤 등장 ── */
  function initReveal(){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)e.target.classList.add('in');});},{threshold:.1});
    document.querySelectorAll('.reveal').forEach(function(s){io.observe(s);});}

  /* ── 식 포맷 ── */
  function fmtEq(a,b){var ax=a===0?'':a===1?'x':a===-1?(MINUS+'x'):(a+'x');
    var bp=b===0?'':(ax===''?sgn(b):(b>0?(' + '+b):(' '+MINUS+' '+Math.abs(b))));
    return 'y = '+((ax===''&&b===0)?'0':(ax+bp));}

  /* ── 좌표평면 (예쁜 버전) ── */
  function makePlane(svg,opt){
    opt=opt||{}; var W=340,H=300,cx=W/2,cy=H/2,U=opt.unit||24;
    var ns='http://www.w3.org/2000/svg';
    function X(x){return cx+x*U;} function Y(y){return cy-y*U;}
    function el(t,a){var e=document.createElementNS(ns,t);for(var k in a)e.setAttribute(k,a[k]);return e;}
    for(var i=-7;i<=7;i++){
      svg.appendChild(el('line',{x1:X(i),y1:0,x2:X(i),y2:H,stroke:'var(--grid)','stroke-width':i===0?0:1}));
      svg.appendChild(el('line',{x1:0,y1:Y(i),x2:W,y2:Y(i),stroke:'var(--grid)','stroke-width':i===0?0:1}));
    }
    svg.appendChild(el('line',{x1:0,y1:cy,x2:W,y2:cy,stroke:'var(--axis)','stroke-width':1.5}));
    svg.appendChild(el('line',{x1:cx,y1:0,x2:cx,y2:H,stroke:'var(--axis)','stroke-width':1.5}));
    var lx=el('text',{x:W-9,y:cy-8,'text-anchor':'end','font-size':12,'font-style':'italic',fill:'var(--muted)'});lx.textContent='x';svg.appendChild(lx);
    var ly=el('text',{x:cx+9,y:14,'font-size':12,'font-style':'italic',fill:'var(--muted)'});ly.textContent='y';svg.appendChild(ly);
    var dyn={};
    function line(id,a,b,color){color=color||'var(--line)';var x1=-7.3,x2=7.3,y1=a*x1+b,y2=a*x2+b;var g=dyn[id];
      if(!g){var glow=el('line',{'stroke-width':10,'stroke-linecap':'round',opacity:.16,stroke:color,'class':'fnglow'});
        var ln=el('line',{'stroke-width':3.5,'stroke-linecap':'round',stroke:color,'class':'fn'});
        svg.appendChild(glow);svg.appendChild(ln);g=dyn[id]={glow:glow,ln:ln};}
      [g.glow,g.ln].forEach(function(L){L.setAttribute('stroke',color);L.setAttribute('x1',X(x1));L.setAttribute('y1',Y(y1));L.setAttribute('x2',X(x2));L.setAttribute('y2',Y(y2));});}
    function dot(id,x,y,color){color=color||'var(--accent)';var d=dyn['d_'+id];
      if(!d){var ring=el('circle',{r:11,opacity:.22,fill:color});var c=el('circle',{r:6,fill:color,stroke:'var(--panel)','stroke-width':2});
        svg.appendChild(ring);svg.appendChild(c);d=dyn['d_'+id]={ring:ring,c:c};}
      [d.ring,d.c].forEach(function(o){o.setAttribute('fill',color);o.setAttribute('cx',X(x));o.setAttribute('cy',Y(y));});}
    return {line:line,dot:dot,X:X,Y:Y};
  }

  /* ── 기하 보드 (중2-2 도형용 · SVG) ── */
  function makeGeo(svg){
    var ns='http://www.w3.org/2000/svg';
    function el(t,a){var e=document.createElementNS(ns,t);for(var k in a)e.setAttribute(k,a[k]);svg.appendChild(e);return e;}
    function ang(c,p){return Math.atan2(p.y-c.y,p.x-c.x);} // 화면좌표(y아래)
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
      // 각 호: 꼭짓점 c에서 c→a, c→b 사이 (r 반경). marks=평행선 tick 수(같은 각 표시)
      angle:function(c,a,b,o){o=o||{};var r=o.r||18;var a0=ang(c,a),a1=ang(c,b);
        // 짧은 쪽 호 방향
        var d=a1-a0; while(d<=-Math.PI)d+=2*Math.PI; while(d>Math.PI)d-=2*Math.PI;
        var large=0, sweep=(d>0?1:0);
        var p0={x:c.x+r*Math.cos(a0),y:c.y+r*Math.sin(a0)}, p1={x:c.x+r*Math.cos(a1),y:c.y+r*Math.sin(a1)};
        el('path',{d:'M'+p0.x+','+p0.y+' A'+r+','+r+' 0 '+large+' '+sweep+' '+p1.x+','+p1.y,
          fill:'none',stroke:o.stroke||'var(--accent)','stroke-width':o.sw||2});
        if(o.marks){var mid=a0+d/2, mc={x:c.x+r*Math.cos(mid),y:c.y+r*Math.sin(mid)};
          for(var i=0;i<o.marks;i++){var off=(i-(o.marks-1)/2)*4, nrm=mid+Math.PI/2;
            el('line',{x1:mc.x+Math.cos(mid)*-3+Math.cos(nrm)*off,y1:mc.y+Math.sin(mid)*-3+Math.sin(nrm)*off,
              x2:mc.x+Math.cos(mid)*3+Math.cos(nrm)*off,y2:mc.y+Math.sin(mid)*3+Math.sin(nrm)*off,
              stroke:o.stroke||'var(--accent)','stroke-width':1.5});}}
      },
      // 변 눈금(같은 길이 표시): 선분 pq 중점에 n개 tick
      tick:function(p,q,n,o){o=o||{};n=n||1;var mx=(p.x+q.x)/2,my=(p.y+q.y)/2;
        var dx=q.x-p.x,dy=q.y-p.y,L=Math.hypot(dx,dy)||1;var ux=dx/L,uy=dy/L,nx=-uy,ny=ux;
        for(var i=0;i<n;i++){var off=(i-(n-1)/2)*4;
          el('line',{x1:mx+ux*off-nx*5,y1:my+uy*off-ny*5,x2:mx+ux*off+nx*5,y2:my+uy*off+ny*5,
            stroke:o.stroke||'var(--gold,#c9972b)','stroke-width':o.sw||2,'stroke-linecap':'round'});}
      },
      // 직각 표시: 꼭짓점 c, 두 방향 a,b
      right:function(c,a,b,o){o=o||{};var s=o.s||11;
        var ua=ang(c,a),ub=ang(c,b);var pa={x:c.x+s*Math.cos(ua),y:c.y+s*Math.sin(ua)},pb={x:c.x+s*Math.cos(ub),y:c.y+s*Math.sin(ub)};
        var pc={x:pa.x+pb.x-c.x,y:pa.y+pb.y-c.y};
        el('path',{d:'M'+pa.x+','+pa.y+' L'+pc.x+','+pc.y+' L'+pb.x+','+pb.y,fill:'none',stroke:o.stroke||'var(--muted)','stroke-width':1.4});}
    };
  }

  /* ── 수직선 ── */
  function makeNumberLine(svg){
    var W=430,H=70,pad=26,cy=40,U=(W-2*pad)/14;var ns='http://www.w3.org/2000/svg';
    function X(x){return pad+(x+7)*U;}
    function el(t,a){var e=document.createElementNS(ns,t);for(var k in a)e.setAttribute(k,a[k]);return e;}
    svg.appendChild(el('line',{x1:pad,y1:cy,x2:W-pad,y2:cy,stroke:'var(--axis)','stroke-width':1.6}));
    for(var i=-7;i<=7;i++){svg.appendChild(el('line',{x1:X(i),y1:cy-4,x2:X(i),y2:cy+4,stroke:'var(--axis)','stroke-width':1}));
      var tx=el('text',{x:X(i),y:cy+19,'text-anchor':'middle','font-size':10,fill:'var(--muted)'});tx.textContent=i;svg.appendChild(tx);}
    var glow=el('line',{'class':'ray',stroke:'var(--u)','stroke-width':11,opacity:.16,'stroke-linecap':'round'});
    var ray=el('line',{'class':'ray',stroke:'var(--u)','stroke-width':5,'stroke-linecap':'round'});
    var bd=el('circle',{r:7,'stroke-width':3,stroke:'var(--u)'});
    svg.appendChild(glow);svg.appendChild(ray);svg.appendChild(bd);
    return function(val,type){var right=(type==='gt'||type==='ge'),closed=(type==='le'||type==='ge');
      [ray,glow].forEach(function(L){L.setAttribute('x1',X(val));L.setAttribute('y1',cy);L.setAttribute('x2',right?X(7):X(-7));L.setAttribute('y2',cy);});
      bd.setAttribute('cx',X(val));bd.setAttribute('cy',cy);bd.setAttribute('fill',closed?'var(--u)':'var(--panel)');};
  }

  /* ── 지수 블록 ── */
  function renderBlocks(mount,m,n){mount.innerHTML='';
    function grp(k,cls){var g=document.createElement('div');g.className='bgrp'+(cls||'');for(var i=0;i<k;i++){var b=document.createElement('div');b.className='blk';g.appendChild(b);}return g;}
    mount.appendChild(grp(m));var op=document.createElement('div');op.className='op';op.textContent='×';mount.appendChild(op);mount.appendChild(grp(n,' g2'));}

  /* ── 소수 ── */
  function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var t=b;b=a%b;a=t;}return a;}
  function decimalOf(n,d){var i=Math.floor(n/d),rem=n%d,digits=[],seen={},rs=-1;
    while(rem!==0){if(seen[rem]!==undefined){rs=seen[rem];break;}seen[rem]=digits.length;rem*=10;digits.push(Math.floor(rem/d));rem=rem%d;}
    return {finite:rs===-1,intPart:i,digits:digits,repeatStart:rs};}
  function factorNote(d){var t=d;while(t%2===0)t/=2;while(t%5===0)t/=5;return {finite:t===1,left:t};}

  /* ── 확인 ── */
  function checkNum(inputId,correct,outId,onOk){var el=document.getElementById(inputId),out=document.getElementById(outId);
    var v=parseInt(el.value,10);
    if(isNaN(v)){out.innerHTML='숫자를 넣어 주세요.';return;}
    if(v===correct){out.innerHTML='<span class="good">정답이에요</span>';if(onOk)onOk();}
    else out.innerHTML='아니에요. 답은 <b class="gold">'+correct+'</b>이에요';}
  function reveal(btnId,boxId,onShow){var b=document.getElementById(btnId);if(!b)return;
    b.onclick=function(){document.getElementById(boxId).classList.add('show');b.style.display='none';if(onShow)onShow();};}

  /* ── 유연한 정답 확인: correct=숫자(허용오차) 또는 함수(값→bool) ── */
  function check(id,test,outId,opt){opt=opt||{};
    var el=document.getElementById(id),out=document.getElementById(outId);if(!el||!out)return;
    var raw=(el.value||'').trim().replace(/[−–—]/g,'-').replace(/\s+/g,'');
    if(raw===''){out.innerHTML='답을 넣어 주세요 🙂';return false;}
    var v=parseFloat(raw), ok;
    if(typeof test==='function') ok=!!test(isNaN(v)?raw:v, raw);
    else ok=(!isNaN(v)&&Math.abs(v-test)<1e-9);
    if(ok){out.innerHTML='<span class="good">'+(opt.okMsg||'정답이에요')+'</span>'+(opt.okMore?(' '+opt.okMore):'');
      if(opt.onOk)opt.onOk();return true;}
    out.innerHTML=(opt.retry||'아니에요')+(opt.correct!=null?('. 답은 <b class="gold">'+opt.correct+'</b>이에요'):'');
    return false;}

  /* ── 단계별 힌트: 버튼 누를 때마다 다음 힌트 박스 공개 ── */
  function hintSteps(btnId,boxIds){var b=document.getElementById(btnId);if(!b)return;var i=0;
    function paint(){b.textContent=(i>=boxIds.length)?'힌트 끝':'힌트 ('+i+'/'+boxIds.length+')';}
    paint();
    b.onclick=function(){ if(i<boxIds.length){var el=document.getElementById(boxIds[i]);if(el)el.classList.add('show');i++;}
      if(i>=boxIds.length){b.disabled=true;b.classList.add('ghost');b.style.opacity=.55;} paint(); };}

  /* ── 숫자 카운트업 애니메이션 ("와" 모먼트) ── */
  function animateCount(el,from,to,ms,fmt){if(!el)return;fmt=fmt||function(v){return Math.round(v).toLocaleString();};ms=ms||700;
    var t0=null;function step(ts){if(t0===null)t0=ts;var p=Math.min(1,(ts-t0)/ms),e=1-Math.pow(1-p,3);
      el.textContent=fmt(from+(to-from)*e);if(p<1)requestAnimationFrame(step);}
    requestAnimationFrame(step);}

  window.MJ={UNITS:UNITS,initTheme:initTheme,initReveal:initReveal,initChrome:initChrome,
    completeUnit:completeUnit,isDone:isDone,makeProgress:makeProgress,fmtEq:fmtEq,sgn:sgn,
    makePlane:makePlane,makeNumberLine:makeNumberLine,makeGeo:makeGeo,renderBlocks:renderBlocks,
    decimalOf:decimalOf,factorNote:factorNote,gcd:gcd,checkNum:checkNum,check:check,
    reveal:reveal,hintSteps:hintSteps,animateCount:animateCount,
    boot:function(){initTheme();initChrome();initReveal();}};
})();
