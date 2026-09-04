/* drills.js — 스피드 드릴 문제 은행 (중3 앱 특별 챕터: 전개 · 인수분해)
 * 목적: 곱셈공식 전개와 인수분해를 "생각 없이" 처리할 만큼 자동화(구몬형 반복). 중3의 관문이자 고등 수학 기초 체력.
 * 챕터 2개 × 기초/도전. 각 생성기는 랜덤 인스턴스를 만든다(새로고침/새 문제 → 새 세트).
 * 반환: {q: 문제 HTML, type:'num'|'pick', ans: 숫자 또는 정답 문자열, choices?: [..], exp: 설명 HTML, _chk: 검증용 구조 데이터}
 * window.DRILL 로 노출. math1/app1/drills.js 와 같은 패턴(챕터·기초/도전·gen 함수). 특강 = factor-mastery.html
 */
(function(){
  'use strict';
  function ri(a,b){return a+Math.floor(Math.random()*(b-a+1));}
  function nz(a,b){var v=0;while(v===0)v=ri(a,b);return v;}
  function pick(a){return a[Math.floor(Math.random()*a.length)];}
  function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var t=a%b;a=b;b=t;}return a;}
  function sg(n){return n<0?('−'+Math.abs(n)):String(n);}
  function coef(c,v){ if(c===0) return ''; if(!v) return sg(c); if(c===1) return v; if(c===-1) return '−'+v; return sg(c)+v; }
  function polyv(terms){
    var s='', first=true;
    terms.forEach(function(t){
      if(!t.c) return;
      var mag=Math.abs(t.c), body=t.v?(mag===1?t.v:mag+t.v):String(mag);
      if(first){ s+=(t.c<0?'−':'')+body; first=false; } else s+=(t.c<0?' − ':' + ')+body;
    });
    return s||'0';
  }
  function poly(A,B,C){ return polyv([{c:A,v:'x²'},{c:B,v:'x'},{c:C,v:''}]); }
  function bin(a,b){ return polyv([{c:a,v:'x'},{c:b,v:''}]); }
  function fac(a,b){ return '('+bin(a,b)+')'; }
  function sqf(a,b){ return '('+bin(a,b)+')²'; }
  function mul(p,q){ return [p[0]*q[0], p[0]*q[1]+p[1]*q[0], p[1]*q[1]]; }
  function sameP(u,v){ return u[0]===v[0]&&u[1]===v[1]&&u[2]===v[2]; }
  var eq=function(s){return '<span class="eq">'+s+'</span>';};
  /* 보기 4개: 정답 + 후보(중복·정답·정답과 같은 전개 제외) 3개, 섞어서 */
  function choices4(ansS, ansP, cands){
    var out=[ansS], seen={}; seen[ansS]=1;
    for(var i=0;i<cands.length&&out.length<4;i++){
      var c=cands[i]; if(!c||!c.s||seen[c.s]) continue;
      if(ansP&&c.p&&sameP(ansP,c.p)) continue;
      seen[c.s]=1; out.push(c.s);
    }
    return shuffle(out);
  }

  /* ── 챕터 1: 전개 ── */
  var EX={
    기초:function(){
      var t=ri(1,4);
      if(t===1){ // (x+a)(x+b) 전개 — 4지선다
        var a=nz(-6,6), b=nz(-6,6), P=mul([1,a],[1,b]), ans=poly(P[0],P[1],P[2]);
        var cands=[{s:poly(1,a*b,a+b)},{s:poly(1,-(a+b),a*b)},{s:poly(1,a+b,-a*b)},{s:poly(1,a+b+1,a*b)},{s:poly(1,a+b,a*b+1)}];
        return {q:eq(fac(1,a)+fac(1,b))+'<br>전개하면?', type:'pick', ans:ans, choices:choices4(ans,null,cands), _chk:{k:'ex1',f:[[1,a],[1,b]]},
          exp:'가운데는 합('+sg(a)+' + '+sg(b)+' = '+sg(a+b)+'), 끝은 곱('+sg(a)+' × '+sg(b)+' = '+sg(a*b)+')이에요 → '+eq(ans)};
      }
      if(t===2){ // (x+a)² 의 x 계수
        var a2=nz(-7,7);
        return {q:eq(sqf(1,a2))+'<br>전개했을 때 x의 계수는?', type:'num', ans:2*a2, _chk:{k:'ex2',a:a2},
          exp:'(x + a)² = x² + 2ax + a²이니까 x의 계수는 2 × '+sg(a2)+' = '+sg(2*a2)+'이에요. 2ab를 빼먹지 않아요.'};
      }
      if(t===3){ // (x+a)(x−a) 상수항
        var a3=ri(2,9);
        return {q:eq(fac(1,a3)+fac(1,-a3))+'<br>전개했을 때 상수항은?', type:'num', ans:-a3*a3, _chk:{k:'ex3',a:a3},
          exp:'합과 차의 곱은 x² − a²이에요. 가운데 항이 사라지고 상수항은 −'+a3+'² = '+sg(-a3*a3)+'이에요.'};
      }
      var a4=nz(-6,6), b4=nz(-6,6); // (x+a)(x+b) 상수항
      return {q:eq(fac(1,a4)+fac(1,b4))+'<br>전개했을 때 상수항은?', type:'num', ans:a4*b4, _chk:{k:'ex4',a:a4,b:b4},
        exp:'상수항은 두 상수의 곱이에요: '+sg(a4)+' × '+sg(b4)+' = '+sg(a4*b4)+'. 부호를 먼저 정하고 크기를 곱해요.'};
    },
    도전:function(){
      var t=ri(1,4);
      if(t===1){ // (ax+b)(cx+d)
        var a=ri(2,3), c=ri(1,3), b=nz(-4,4), d=nz(-4,4), P=mul([a,b],[c,d]), ans=poly(P[0],P[1],P[2]);
        var cands=[{s:poly(a*c, a*b+c*d, b*d)},{s:poly(a*c, -(a*d+b*c), b*d)},{s:poly(a*c, a*d+b*c, -b*d)},{s:poly(a*c, a*d-b*c, b*d)},{s:poly(a+c, a*d+b*c, b*d)},{s:poly(a*c, P[1]+1, P[2])},{s:poly(a*c, P[1], P[2]+1)}];
        return {q:eq(fac(a,b)+fac(c,d))+'<br>전개하면?', type:'pick', ans:ans, choices:choices4(ans,null,cands), _chk:{k:'exg',f:[[a,b],[c,d]]},
          exp:'바깥끼리 '+coef(a,'x')+' × '+coef(c,'x')+' = '+coef(a*c,'x²')+', 안쪽끼리 '+sg(b)+' × '+sg(d)+' = '+sg(b*d)+'. x 항은 '+coef(a,'x')+' × '+sg(d)+'와 '+sg(b)+' × '+coef(c,'x')+'를 더해 '+coef(P[1],'x')+' → '+eq(ans)};
      }
      if(t===2){ // (ax+b)²
        var a2=ri(2,4), b2=nz(-5,5), P2=mul([a2,b2],[a2,b2]), ans2=poly(P2[0],P2[1],P2[2]);
        var cands2=[{s:poly(a2*a2,0,b2*b2)},{s:poly(a2*a2,a2*b2,b2*b2)},{s:poly(a2*a2,-2*a2*b2,b2*b2)},{s:poly(a2,2*a2*b2,b2*b2)}];
        return {q:eq(sqf(a2,b2))+'<br>전개하면?', type:'pick', ans:ans2, choices:choices4(ans2,null,cands2), _chk:{k:'exsq',f:[[a2,b2],[a2,b2]]},
          exp:'(A + B)² = A² + 2AB + B²에 A = '+coef(a2,'x')+', B = '+sg(b2)+'를 넣어요. 2AB = 2 × '+coef(a2,'x')+' × '+sg(b2)+' = '+coef(2*a2*b2,'x')+' → '+eq(ans2)};
      }
      if(t===3){ // 수 계산 — 합차
        var s=pick([[101,99],[102,98],[103,97],[53,47],[205,195],[1001,999],[52,48],[61,59]]), m=(s[0]+s[1])/2, dd=(s[0]-s[1])/2;
        return {q:'곱셈공식으로 계산하면?<br>'+eq(s[0]+' × '+s[1]), type:'num', ans:s[0]*s[1], _chk:{k:'exnum',a:s[0],b:s[1]},
          exp:s[0]+' × '+s[1]+' = ('+m+' + '+dd+')('+m+' − '+dd+') = '+m+'² − '+dd+'² = '+(m*m)+' − '+(dd*dd)+' = '+(s[0]*s[1])+'이에요.'};
      }
      var n=pick([51,49,102,98,201,199,31,29,52,48]), base=Math.round(n/50)*50, off=n-base; // 수 제곱
      if(Math.abs(n-100)<10) base=100; if(Math.abs(n-200)<10) base=200; off=n-base;
      return {q:'곱셈공식으로 계산하면?<br>'+eq(n+'²'), type:'num', ans:n*n, _chk:{k:'exsqn',n:n},
        exp:n+'² = ('+base+' '+(off<0?'− '+(-off):'+ '+off)+')² = '+base+'² '+(off<0?'− ':'+ ')+'2 × '+base+' × '+Math.abs(off)+' + '+(off*off)+' = '+(base*base)+' '+(off<0?'− ':'+ ')+(2*base*Math.abs(off))+' + '+(off*off)+' = '+(n*n)+'이에요.'};
    }
  };

  /* ── 챕터 2: 인수분해 ── */
  var FA={
    기초:function(){
      var t=ri(1,4);
      if(t===1){ // 공통인수 kx(ax+b)
        var K=ri(2,6), a=ri(1,4), b=nz(-5,5); while(gcd(a,b)!==1||b===a){ b=nz(-5,5); }
        var ans=coef(K,'x')+fac(a,b);
        var cands=[{s:K+'('+poly(a,b,0)+')'},{s:coef(K,'x')+fac(a,-b)},{s:coef(K,'x')+fac(b,a)},{s:'x('+bin(K*a,K*b)+')'}];
        return {q:eq(poly(K*a,K*b,0))+'<br>인수분해하면?', type:'pick', ans:ans, choices:choices4(ans,null,cands), _chk:{k:'fa1',K:K,a:a,b:b},
          exp:'두 항의 공통인수는 숫자 '+K+'와 문자 x예요. '+coef(K,'x')+'로 묶으면 '+eq(ans)+'. 괄호 안에 더 묶을 게 없는지 확인해요.'};
      }
      if(t===2){ // x²+bx+c (양수 짝)
        var p=ri(1,5), q=ri(p,6), P=mul([1,p],[1,q]), ans2=fac(1,p)+fac(1,q);
        var cands2=[{s:fac(1,-p)+fac(1,-q),p:mul([1,-p],[1,-q])},{s:fac(1,p)+fac(1,-q),p:mul([1,p],[1,-q])},{s:fac(1,-p)+fac(1,q),p:mul([1,-p],[1,q])},{s:fac(1,p*q)+fac(1,1),p:mul([1,p*q],[1,1])},{s:fac(1,p+q)+'x',p:[1,p+q,0]}];
        return {q:eq(poly(P[0],P[1],P[2]))+'<br>인수분해하면?', type:'pick', ans:ans2, choices:choices4(ans2,P,cands2), _chk:{k:'fa2',f:[[1,p],[1,q]]},
          exp:'곱해서 '+(p*q)+', 더해서 '+(p+q)+'인 두 수는 '+p+'과 '+q+'예요 → '+eq(ans2)+'. 전개해서 검산해요.'};
      }
      if(t===3){ // 완전제곱식 빈칸
        var a3=ri(2,8), form=ri(0,1);
        if(form===0) return {q:eq(poly(1,2*a3,0)+' + □')+'<br>완전제곱식이 되도록 □에 알맞은 수는?', type:'num', ans:a3*a3, _chk:{k:'fa3c',a:a3},
          exp:'가운데 계수 '+(2*a3)+'의 절반 '+a3+'을 제곱한 '+(a3*a3)+'이에요. 그러면 '+sqf(1,a3)+'이 돼요.'};
        return {q:eq('x² + □x + '+(a3*a3))+'<br>완전제곱식이 되도록 □에 알맞은 양수는?', type:'num', ans:2*a3, _chk:{k:'fa3b',a:a3},
          exp:(a3*a3)+' = '+a3+'²이니까 가운데는 그 두 배인 2 × '+a3+' = '+(2*a3)+'이에요. 그러면 '+sqf(1,a3)+'이 돼요.'};
      }
      var a4=ri(2,9), ans4=fac(1,a4)+fac(1,-a4); // x² − a²
      var cands4=[{s:sqf(1,-a4)},{s:sqf(1,a4)},{s:fac(1,2*a4)+fac(1,-a4)},{s:fac(1,a4*a4)+fac(1,-1)}];
      return {q:eq(poly(1,0,-a4*a4))+'<br>인수분해하면?', type:'pick', ans:ans4, choices:choices4(ans4,null,cands4), _chk:{k:'fa4',a:a4},
        exp:'제곱 빼기 제곱은 (합)(차)예요: '+(a4*a4)+' = '+a4+'²이니까 '+eq(ans4)+'.'};
    },
    도전:function(){
      var t=ri(1,4);
      if(t===1){ // x²+bx+c 음수 포함
        var p=nz(-6,6), q=nz(-6,6); while(p>0&&q>0){ p=nz(-6,6); q=nz(-6,6); }
        var P=mul([1,p],[1,q]), ans=fac(1,p)+fac(1,q);
        var cands=[{s:fac(1,-p)+fac(1,-q),p:mul([1,-p],[1,-q])},{s:fac(1,p)+fac(1,-q),p:mul([1,p],[1,-q])},{s:fac(1,-p)+fac(1,q),p:mul([1,-p],[1,q])},{s:fac(1,p*q)+fac(1,1),p:mul([1,p*q],[1,1])},{s:fac(1,p+q)+'x',p:[1,p+q,0]},{s:fac(1,p*q)+fac(1,-1),p:mul([1,p*q],[1,-1])}];
        return {q:eq(poly(P[0],P[1],P[2]))+'<br>인수분해하면?', type:'pick', ans:ans, choices:choices4(ans,P,cands), _chk:{k:'fad1',f:[[1,p],[1,q]]},
          exp:'곱해서 '+sg(p*q)+', 더해서 '+sg(p+q)+'인 두 수는 '+sg(p)+'과 '+sg(q)+'예요('+(p*q<0?'곱이 음수라 부호가 달라요':'곱이 양수라 부호가 같아요')+') → '+eq(ans)};
      }
      if(t===2){ // acx²+bx+d
        var a=ri(2,3), c=ri(1,3), b=nz(-4,4), d=nz(-4,4);
        while(gcd(a,b)!==1||gcd(c,d)!==1){ b=nz(-4,4); d=nz(-4,4); }
        var P2=mul([a,b],[c,d]), ans2=fac(a,b)+fac(c,d);
        var cands2=[{s:fac(a,d)+fac(c,b),p:mul([a,d],[c,b])},{s:fac(a,-b)+fac(c,-d),p:mul([a,-b],[c,-d])},{s:fac(a,b)+fac(c,-d),p:mul([a,b],[c,-d])},{s:fac(a,-b)+fac(c,d),p:mul([a,-b],[c,d])},{s:fac(a*c,b)+fac(1,d),p:mul([a*c,b],[1,d])},{s:fac(a,b)+fac(c,d+1),p:mul([a,b],[c,d+1])}];
        return {q:eq(poly(P2[0],P2[1],P2[2]))+'<br>인수분해하면?', type:'pick', ans:ans2, choices:choices4(ans2,P2,cands2), _chk:{k:'fad2',f:[[a,b],[c,d]]},
          exp:'x² 계수 '+P2[0]+' = '+a+' × '+c+', 상수항 '+sg(P2[2])+' = '+sg(b)+' × '+sg(d)+'. 대각선 곱 '+sg(a*d)+' + '+sg(b*c)+' = '+sg(P2[1])+'가 가운데 계수와 맞아요 → '+eq(ans2)+'. 전개해서 검산!'};
      }
      if(t===3){ // 공통인수 먼저 → 완전제곱식: k(x+a)²
        var k=ri(2,4), a3=nz(-5,5), ans3=k+sqf(1,a3);
        var cands3=[{s:'('+bin(k,k*a3)+')²'},{s:k+fac(1,a3)+fac(1,-a3)},{s:k+sqf(1,-a3)},{s:sqf(1,a3)}];
        return {q:eq(poly(k,2*k*a3,k*a3*a3))+'<br>인수분해하면?', type:'pick', ans:ans3, choices:choices4(ans3,null,cands3), _chk:{k:'fad3',K:k,a:a3},
          exp:'먼저 공통인수 '+k+'로 묶으면 '+k+'('+poly(1,2*a3,a3*a3)+'). 괄호 안이 완전제곱식이에요 → '+eq(ans3)+'. 공통인수를 안 묶고 시작하면 어려워져요.'};
      }
      var s=ri(2,9), pr=ri(1,8), form=ri(0,1); // 활용: x+y, xy → x²+y² 또는 (x−y)² (실수 x, y가 존재하도록 s² − 4p ≥ 0)
      while(s*s-4*pr<0){ s=ri(2,9); pr=ri(1,8); }
      if(form===0) return {q:'x + y = '+s+', xy = '+pr+'일 때<br>'+eq('x² + y²')+'의 값은?', type:'num', ans:s*s-2*pr, _chk:{k:'fad4a',s:s,p:pr},
        exp:'(x + y)² = x² + 2xy + y²를 옮기면 x² + y² = (x + y)² − 2xy = '+s+'² − 2 × '+pr+' = '+(s*s)+' − '+(2*pr)+' = '+(s*s-2*pr)+'이에요.'};
      return {q:'x + y = '+s+', xy = '+pr+'일 때<br>'+eq('(x − y)²')+'의 값은?', type:'num', ans:s*s-4*pr, _chk:{k:'fad4b',s:s,p:pr},
        exp:'(x − y)² = (x + y)² − 4xy = '+s+'² − 4 × '+pr+' = '+(s*s)+' − '+(4*pr)+' = '+(s*s-4*pr)+'이에요.'};
    }
  };

  window.DRILL={ chapters:[
    {key:'ex', name:'① 전개', desc:'곱셈공식으로 괄호 펼치기', gen:EX,
     card:'<b>방법 카드</b> — ① 바깥끼리 곱해 x² 항 → ② 바깥×안쪽 두 개를 더해 x 항 → ③ 안쪽끼리 곱해 상수항 → ④ 제곱은 <b>2ab</b>를 빼먹지 않기 → ⑤ 합차 (a + b)(a − b)는 가운데 항이 사라져요.<br>'+
          '<span class="muted">예시: (x + 2)(x − 5) → x² + (2 − 5)x + (2)(−5) = x² − 3x − 10 · 101 × 99 = (100 + 1)(100 − 1) = 9999</span>'},
    {key:'fa', name:'② 인수분해', desc:'펼친 것을 다시 곱으로 묶기', gen:FA,
     card:'<b>순서 카드</b> — ① <b>공통인수</b>부터 묶어요 → ② 끝 항이 제곱수이고 가운데가 그 두 배면 <b>완전제곱식</b> → ③ 항 두 개·빼기·둘 다 제곱수면 <b>(합)(차)</b> → ④ 아니면 <b>곱해서 c, 더해서 b</b>인 두 수 찾기(x² 계수가 1이 아니면 대각선) → ⑤ 답을 <b>전개해서 검산</b>.<br>'+
          '<span class="muted">예시: 2x² + 12x + 18 → 2(x² + 6x + 9) → 2(x + 3)² · x² − x − 6 → 곱 −6, 합 −1 → (x − 3)(x + 2)</span>'}
  ]};
})();
