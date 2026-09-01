/* concept.js — 중1 개념 여정 공용 엔진 (math2 app2 concept.js 포크, 2026-08-19)
 * 사이드바 네비 + 단원 시그니처색 + 그라데이션 히어로 + 예쁜 애니 그래프.
 * window.MJ1 로 노출(math2의 MJ와 이름 충돌 방지). API는 MJ와 동일 — 헬퍼 로직은 그대로 포크.
 */
(function(){
  'use strict';
  var MINUS='−';
  var sgn=function(n){return n<0?MINUS+Math.abs(n):''+n;};

  var UNITS=[
    {id:'u1',no:1,t:'소인수분해',u:'#d68a4a',u2:'#eaad70'},
    {id:'u2',no:2,t:'정수와 유리수',u:'#4f92d6',u2:'#77b2ea'},
    {id:'u3',no:3,t:'문자와 식',u:'#8f7bd4',u2:'#b19ce6'},
    {id:'u4',no:4,t:'일차방정식',u:'#d76a9c',u2:'#e88fb0'},
    {id:'u5',no:5,t:'좌표와 그래프',u:'#3fa89a',u2:'#63c6b1'},
    {id:'u6',no:6,t:'정비례와 반비례',u:'#e0973a',u2:'#f0b45f'},
    {id:'u7',no:7,t:'기본도형',u:'#4a9a5f',u2:'#6fbf82',sem:2},
    {id:'u8',no:8,t:'작도와 합동',u:'#c77d9e',u2:'#e0a0bd',sem:2},
    {id:'u9',no:9,t:'다각형',u:'#4f9bb5',u2:'#75bcd0',sem:2},
    {id:'u10',no:10,t:'원과 부채꼴',u:'#d6a23a',u2:'#eac066',sem:2},
    {id:'u11',no:11,t:'다면체와 회전체',u:'#6a7fd8',u2:'#8fa0e8',sem:2},
    {id:'u12',no:12,t:'입체도형의 겉넓이와 부피',u:'#d9705a',u2:'#ea9580',sem:2},
    {id:'u13',no:13,t:'자료의 정리와 해석',u:'#7a8a9a',u2:'#9aabb8',sem:2}
  ];
  // 탐험(PhET) 탭은 math1에 아직 자산 없음 — 전부 미노출
  var EXPLORE_READY={};
  var PLAY_READY={1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1,9:1,10:1,11:1,12:1,13:1};   // 놀이터(g*.html) 완성된 단원만. 전 단원 완성!
  // 현재 페이지 상태(initChrome이 채움) — 이어하기(B6)·완주 도장(A1)이 참조
  var curInfo={kind:'home'}, curUnit=null, restoredN=0;
  function reducedMotion(){try{return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);}catch(e){return false;}}
  // 파일명 → 단원 번호 + 종류 (u=개념 p=연습 d=심화탐구 dNp=심화문제 g=놀이터)
  function pageInfo(){
    var f=(location.pathname.split('/').pop()||'index.html').toLowerCase().replace(/\?.*$/,'').replace(/\.html$/,'');
    var m;
    if(m=f.match(/^u([1-9]|1[0-3])$/))  return {no:+m[1],kind:'concept'};
    if(m=f.match(/^p([1-9]|1[0-3])$/))  return {no:+m[1],kind:'practice'};
    if(m=f.match(/^d([1-9]|1[0-3])p$/)) return {no:+m[1],kind:'deepq'};
    if(m=f.match(/^d([1-9]|1[0-3])$/))  return {no:+m[1],kind:'deep'};
    if(m=f.match(/^x([1-9]|1[0-3])$/))  return {no:+m[1],kind:'explore'};
    if(m=f.match(/^g([1-9]|1[0-3])$/))  return {no:+m[1],kind:'play'};
    if(/drill/.test(f))          return {kind:'drill'};
    if(/speed-mastery/.test(f))  return {kind:'speed-mastery'};
    return {kind:'home'};
  }
  function hexA(hex,a){var n=parseInt(hex.slice(1),16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')';}

  /* ── 테마 ── */
  function initTheme(){
    var t; try{t=localStorage.getItem('m1theme');}catch(e){}
    if(t!=='dark'&&t!=='light')t='light';
    document.documentElement.setAttribute('data-theme',t);
  }
  function bindToggle(btn){
    if(!btn)return;
    var paint=function(){btn.textContent=document.documentElement.getAttribute('data-theme')==='dark'?'☀':'🌙';};
    paint();
    btn.onclick=function(){var c=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
      document.documentElement.setAttribute('data-theme',c);try{localStorage.setItem('m1theme',c);}catch(e){}paint();};
  }

  /* ── 진도/보상 ── */
  function store(){var s={};try{s=JSON.parse(localStorage.getItem('m1progress'))||{};}catch(e){}return s;}
  function saveStore(s){try{localStorage.setItem('m1progress',JSON.stringify(s));}catch(e){}}
  function isDone(id){return !!store()[id];}
  /* 이어하기(B6): localStorage m1checks = {u6:{c1:{c:1,v:'15'}, showex:{c:1}}}
   *   c = 그 항목이 진행바에 셈해졌는지(onOk 유무) 1/0 · v = 맞힌 입력값(복원 시 다시 보여 줌). 개념(u) 페이지에서만 기록. */
  function marks(){var m={};try{m=JSON.parse(localStorage.getItem('m1checks'))||{};}catch(e){}return m;}
  function saveMarks(m){try{localStorage.setItem('m1checks',JSON.stringify(m));}catch(e){}}
  function mark(id,counted,val){if(curInfo.kind!=='concept'||!curUnit)return;var m=marks();var u=m[curUnit.id]||(m[curUnit.id]={});
    if(!u[id]){u[id]={c:counted?1:0};if(val!=null&&String(val)!=='')u[id].v=String(val).slice(0,40);saveMarks(m);}}
  function markOf(id){if(curInfo.kind!=='concept'||!curUnit)return null;var u=marks()[curUnit.id];return (u&&u[id])||null;}

  /* 완주(A1): 처음 완료될 때만 도장 애니 + 꽃가루. 재방문(이미 완료)은 조용히 도장만. */
  function completeUnit(id){var s=store(),first=!s[id];s[id]=true;saveStore(s);
    var l=document.querySelector('.sb-link[data-id="'+id+'"]');if(l)l.classList.add('done');
    showStamp(id,first);}
  function showStamp(id,celebrate){var n=document.getElementById('done-note');if(!n)return;
    var u=UNITS[parseInt(id.slice(1),10)-1];
    if(u&&!n.classList.contains('stamp')){n.classList.add('stamp');
      n.innerHTML='<div class="seal">🌸</div><div class="seal-t">단원 '+u.no+' 완주!</div><div class="seal-d">'+u.t+' — 끝까지 해냈어요.</div>';}
    if(!celebrate&&!n.classList.contains('show'))n.classList.add('still');
    n.classList.add('show');
    if(celebrate){confetti();setTimeout(function(){try{n.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'center'});}catch(e){}},200);}}
  /* 꽃가루 — g*.html 인라인 confetti()를 엔진으로 포팅. host 없으면 body에 만들고 2.4초 뒤 제거. 색 = 단원 시그니처 2색 + 민트 2색. */
  function confetti(host,colors){if(reducedMotion())return;
    var own=!host;if(own){host=document.createElement('div');host.className='pg-confetti';document.body.appendChild(host);}
    host.innerHTML='';
    colors=colors||[curUnit?curUnit.u:'#4fa892',curUnit?curUnit.u2:'#63c6b1','#4fa892','#63c6b1'];
    for(var i=0;i<46;i++){var p=document.createElement('i');
      p.style.left=(Math.random()*100)+'vw';p.style.background=colors[i%colors.length];
      p.style.animationDelay=(Math.random()*0.4)+'s';p.style.animationDuration=(1.1+Math.random()*0.9)+'s';
      p.style.transform='rotate('+(Math.random()*360)+'deg)';host.appendChild(p);}
    host.classList.add('on');
    setTimeout(function(){host.classList.remove('on');if(own&&host.parentNode)host.parentNode.removeChild(host);},2400);}

  /* 진행바. 개념 페이지면 복원된 칸을 미리 채우고(B6), 완료 단원은 가득 채운 채 도장만 보여 준다. */
  function makeProgress(barId,total){var bar=document.getElementById(barId);if(!bar)return function(){};
    for(var i=0;i<total;i++)bar.appendChild(document.createElement('i'));var done=0;
    var uid=(curUnit&&curInfo.kind==='concept')?curUnit.id:null;
    if(uid){
      var pre=isDone(uid)?total:Math.min(restoredN,total);
      for(var k=0;k<pre;k++){bar.children[k].classList.add('on');bar.children[k].classList.add('pre');}
      done=pre;
      if(isDone(uid))showStamp(uid,false);
      else if(restoredN>0){
        setTimeout(function(){resumeBanner(bar,total);},0);   // 페이지 스크립트가 끝난 뒤 실제 칸 수로 배너 문구
        if(done>=total)setTimeout(function(){completeUnit(uid);},400);
      }
    }
    return function(){if(done<total){var c=bar.children[done];c.classList.add('on');c.classList.remove('pre');
      c.classList.remove('bump');void c.offsetWidth;c.classList.add('bump');done++;
      if(uid&&done>=total&&!isDone(uid))completeUnit(uid);}};}
  /* 이어하기 배너: 진행바 바로 위. 클릭하면 아직 안 푼 첫 확인 문제로 부드럽게 스크롤. */
  function resumeBanner(bar,total){var n=bar.querySelectorAll('i.on').length;if(!n||document.querySelector('.resume'))return;
    var b=document.createElement('div');b.className='resume';
    b.innerHTML='<span class="rs-i">🔖</span><span>지난번에 <b>'+Math.min(n,total)+'/'+total+'</b>까지 했어요.</span><a href="#" class="rs-go">이어서 볼까요? →</a>';
    bar.parentNode.insertBefore(b,bar);
    b.querySelector('.rs-go').onclick=function(e){e.preventDefault();
      var target=null,cs=document.querySelectorAll('.check');
      for(var i=0;i<cs.length;i++){var inp=cs[i].querySelector('input,textarea');if(inp&&!inp.disabled){target=cs[i];break;}}
      if(!target)target=cs[cs.length-1]||bar;
      try{target.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'center'});}catch(e2){}
      var f=target.querySelector('input:not([disabled]),textarea:not([disabled])');
      if(f)setTimeout(function(){try{f.focus({preventScroll:true});}catch(e3){}},650);};}

  /* ── 사이드바 + 히어로 + 탭바 + 색 ── */
  function initChrome(){
    var info=pageInfo();
    var unit=info.no?UNITS[info.no-1]:null;
    curInfo=info; curUnit=unit;
    var activeId=unit?unit.id:info.kind;
    var root=document.documentElement.style;
    var uc=unit?unit.u:'#d68a4a', uc2=unit?unit.u2:'#eaad70';
    root.setProperty('--u',uc); root.setProperty('--u-2',uc2); root.setProperty('--u-soft',hexA(uc,0.14));

    // 사이드바
    var s=store();
    var links='<div class="sb-brand">중1 수학<small>1·2학기</small></div>'+
      '<a class="sb-link'+(activeId==='home'?' active':'')+'" href="index.html"><span class="sb-no">🏠</span>홈</a>'+
      '<div class="sb-sep"></div>'+
      '<a class="sb-link tool'+(activeId==='drill'?' active':'')+'" href="drill.html"><span class="sb-no">⚡</span>스피드 드릴</a>'+
      '<a class="sb-link tool'+(activeId==='speed-mastery'?' active':'')+'" href="speed-mastery.html"><span class="sb-no">🚗</span>속력·거리·시간 특강</a>'+
      '<a class="sb-link tool" href="../print/index.html"><span class="sb-no">🖨️</span>중1 프린트</a>'+
      '<a class="sb-link tool" href="../../story/index.html"><span class="sb-no">🎬</span>인물 이야기</a>'+
      '<a class="sb-link tool" href="../../map/index.html"><span class="sb-no">🗺️</span>수학 지도</a>'+
      '<div class="sb-sep"></div>'+
      '<details class="sb-sem" open><summary class="sb-group">1학기</summary>';
    UNITS.forEach(function(x,i){
      if(x.sem===2 && (i===0||UNITS[i-1].sem!==2)) links+='</details><div class="sb-sep"></div><details class="sb-sem" open><summary class="sb-group">2학기</summary>';
      links+='<a class="sb-link'+(activeId===x.id?' active':'')+(s[x.id]?' done':'')+'" data-id="'+x.id+'" href="'+x.id+'.html">'+
        '<span class="sb-no">'+x.no+'</span>'+x.t+'<span class="sb-chk">✓</span></a>';
    });
    links+='</details>';
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
          {k:'deep',    href:'d'+unit.no+'.html',  i:'⚗️', t:'심화 탐구'}
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

    // 이어하기(B6): 미완료 개념 페이지면 지난번에 맞힌 문항을 복원(입력·버튼 잠금 + ✓ 표시). 완료 단원은 복원 없이 자유롭게 다시 풀 수 있게 둔다.
    restoredN=0;
    if(unit&&info.kind==='concept'&&!s[unit.id]){
      var m=marks()[unit.id]||{};
      Object.keys(m).forEach(function(k){var el=document.getElementById(k),rec=m[k]||{};
        if(!el)return;
        if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'){
          el.disabled=true;el.classList.add('ok');el.classList.add('pre');if(rec.v!=null)el.value=rec.v;
          var b=document.getElementById(k+'b');if(b)b.disabled=true;
          var o=document.getElementById(k+'o');if(o)o.innerHTML='<span class="good"><i class="tick pre">✓</i>지난번에 맞혔어요</span>';
          if(rec.c)restoredN++;
        } else if(el.tagName==='BUTTON'){ if(rec.c)restoredN++; }   // reveal 버튼 — 화면 복원은 reveal() 호출 때
      });
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

  /* ── 기하 보드 (도형 단원용 · SVG) — geo.js(MG)와 동일 API ── */
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

  /* ── 확인 피드백 (B1 정답 마이크로 애니 · B2 오답 1회째는 힌트만) ──
   * 정답: 입력 테두리가 민트로 한 번 부드럽게 빛나고(okpulse) ✓가 톡 떠오른다. 오답: 흔들림·빨강 없이 연노랑 테두리로 "아직이에요".
   * 같은 입력에서 오답 1회째는 정답을 숨기고 한 번 더 생각하게, 2회째부터 정답 공개. 정답 맞히면 시도 횟수 초기화. */
  var tries={};
  function bindClear(el){if(el.getAttribute('data-mj'))return;el.setAttribute('data-mj','1');
    el.addEventListener('input',function(){el.classList.remove('ok');el.classList.remove('retry');});}
  function feedbackOk(el,out,msg,more){el.classList.remove('retry');el.classList.remove('ok');void el.offsetWidth;el.classList.add('ok');
    out.innerHTML='<span class="good"><i class="tick">✓</i>'+msg+'</span>'+(more?(' '+more):'');}
  function feedbackNo(el,out,id,answerHtml,retryMsg,hint){var t=tries[id]=(tries[id]||0)+1;
    el.classList.remove('ok');el.classList.remove('retry');void el.offsetWidth;el.classList.add('retry');
    if(t===1)out.innerHTML='<span class="soft">아직이에요 — 한 번 더 생각해 봐요 🙂</span>'+(hint?('<span class="hintline">💡 '+hint+'</span>'):'');
    else out.innerHTML=(retryMsg||'아니에요')+(answerHtml!=null?('. 답은 <b class="gold">'+answerHtml+'</b>이에요'):'');}
  /* 이어하기 기록은 표준 규약(입력 id + 'b' 버튼)을 따르는 확인 문제만 — 동적 문제(math2 u2 pans2/psolve 같은 것)는 값이 매번 달라 복원하지 않는다 */
  function markInput(id,counted,val){if(document.getElementById(id+'b'))mark(id,counted,val);}

  function checkNum(inputId,correct,outId,onOk){var el=document.getElementById(inputId),out=document.getElementById(outId);if(!el||!out)return;
    bindClear(el);
    var v=parseInt(el.value,10);
    if(isNaN(v)){out.innerHTML='숫자를 넣어 주세요.';return;}
    if(v===correct){tries[inputId]=0;feedbackOk(el,out,'정답이에요');markInput(inputId,!!onOk,el.value);if(onOk)onOk();}
    else feedbackNo(el,out,inputId,correct);}
  /* 다른 설명 보기: 개념 페이지에서 지난번에 열었으면(B6) 열린 채로 복원 */
  function reveal(btnId,boxId,onShow){var b=document.getElementById(btnId);if(!b)return;
    var box=document.getElementById(boxId);
    if(box&&markOf(btnId)&&!isDone(curUnit.id)){box.classList.add('show');box.classList.add('pre');b.style.display='none';return;}
    b.onclick=function(){if(box)box.classList.add('show');b.style.display='none';mark(btnId,!!onShow);if(onShow)onShow();};}

  /* ── 유연한 정답 확인: correct=숫자(허용오차) 또는 함수(값→bool). opt: correct·okMsg·okMore·retry·hint·onOk ── */
  function check(id,test,outId,opt){opt=opt||{};
    var el=document.getElementById(id),out=document.getElementById(outId);if(!el||!out)return;
    bindClear(el);
    var raw=(el.value||'').trim().replace(/[−–—]/g,'-').replace(/\s+/g,'');
    if(raw===''){out.innerHTML='답을 넣어 주세요 🙂';return false;}
    var v=parseFloat(raw), ok;
    if(typeof test==='function') ok=!!test(isNaN(v)?raw:v, raw);
    else ok=(!isNaN(v)&&Math.abs(v-test)<1e-9);
    if(ok){tries[id]=0;feedbackOk(el,out,opt.okMsg||'정답이에요',opt.okMore);markInput(id,!!opt.onOk,el.value);
      if(opt.onOk)opt.onOk();return true;}
    feedbackNo(el,out,id,opt.correct!=null?opt.correct:null,opt.retry,opt.hint);
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

  window.MJ1={UNITS:UNITS,initTheme:initTheme,initReveal:initReveal,initChrome:initChrome,
    completeUnit:completeUnit,isDone:isDone,makeProgress:makeProgress,fmtEq:fmtEq,sgn:sgn,
    makePlane:makePlane,makeNumberLine:makeNumberLine,makeGeo:makeGeo,renderBlocks:renderBlocks,
    decimalOf:decimalOf,factorNote:factorNote,gcd:gcd,checkNum:checkNum,check:check,
    reveal:reveal,hintSteps:hintSteps,animateCount:animateCount,confetti:confetti,
    boot:function(){initTheme();initChrome();initReveal();}};
})();
