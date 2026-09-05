/* drills.js — 스피드 드릴 문제 은행 (중1 앱 특별 챕터)
 * 목적: (a) 등식의 성질로 식을 정리하는 절차의 자동화(구몬형 반복) (b) 문장 → 식 세우기 인식 훈련.
 * 챕터 2개 × 기초(중1 수준)/도전(중2 수준). 각 생성기는 랜덤 인스턴스를 만든다(새로고침/새 문제 → 새 세트).
 * 반환: {q: 문제 HTML, type:'num'|'pick', ans: 숫자 또는 정답 문자열, choices?: [..], exp: 설명 HTML}
 * window.DRILL 로 노출. math2/app2/drills.js 와 같은 패턴(챕터·기초/도전·gen 함수).
 */
(function(){
  'use strict';
  function ri(a,b){return a+Math.floor(Math.random()*(b-a+1));}
  function nz(a,b){var v=0;while(v===0)v=ri(a,b);return v;}
  function pick(a){return a[Math.floor(Math.random()*a.length)];}
  function sg(n){return n<0?('−'+Math.abs(n)):(''+n);}
  function ax(a){return a===0?'':a===1?'x':a===-1?'−x':(sg(a)+'x');}       // ax 항
  function plusb(b){return b===0?'':(b>0?(' + '+b):(' − '+Math.abs(b)));} // + b / − |b|
  var eq=function(s){return '<span class="eq">'+s+'</span>';};
  function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}

  /* ── 챕터 1: 방정식 정리 — 등식의 성질로 x = ? 까지 (숫자 입력) ── */
  var EQ={
    기초:function(){
      var t=ri(1,3);
      if(t===1){ // ax + b = c
        var a=ri(2,9), x0=ri(-8,8), b=ri(-9,9), c=a*x0+b;
        return {q:eq(ax(a)+plusb(b)+' = '+sg(c))+'<br>x = ?', type:'num', ans:x0,
          exp:'이항하면 '+eq(ax(a)+' = '+sg(c-b))+'예요. 양변을 '+a+'로 나누면 x = '+sg(x0)+'예요.'};
      }
      if(t===2){ // ax + b = dx + e (양변에 x)
        var a2=ri(2,6), d2=ri(2,6); while(d2===a2)d2=ri(2,6);
        var x02=ri(-6,6), b2=ri(-9,9), e2=b2+(a2-d2)*x02, diff2=a2-d2;
        return {q:eq(ax(a2)+plusb(b2)+' = '+ax(d2)+plusb(e2))+'<br>x = ?', type:'num', ans:x02,
          exp:'x항은 왼쪽, 숫자는 오른쪽으로 모으면 '+eq(ax(diff2)+' = '+sg(e2-b2))+'예요. 양변을 '+sg(diff2)+'로 나누면 x = '+sg(x02)+'예요.'};
      }
      // k(x + b) = c
      var k3=ri(2,6), x03=ri(-6,6), b3=ri(-6,6), c3=k3*(x03+b3);
      return {q:eq(k3+'(x'+plusb(b3)+') = '+sg(c3))+'<br>x = ?', type:'num', ans:x03,
        exp:'괄호를 풀면(분배법칙) '+eq(ax(k3)+plusb(k3*b3)+' = '+sg(c3))+'예요. 이항하고 '+k3+'로 나누면 x = '+sg(x03)+'예요.'};
    },
    도전:function(){
      var t=ri(1,3);
      if(t===1){ // k(x+b) = dx + e (분배 + 양변 혼합)
        var k=ri(2,5), d=ri(2,5); while(d===k)d=ri(2,5);
        var x0=ri(-6,6), b=ri(-6,6), e=k*(x0+b)-d*x0;
        return {q:eq(k+'(x'+plusb(b)+') = '+ax(d)+plusb(e))+'<br>x = ?', type:'num', ans:x0,
          exp:'왼쪽 괄호를 풀면 '+eq(ax(k)+plusb(k*b)+' = '+ax(d)+plusb(e))+'예요. x항을 모으고 정리하면 x = '+sg(x0)+'예요.'};
      }
      if(t===2){ // (x + b) / k = c (분수 계수)
        var k2=ri(2,5), c2=ri(-6,6), b2=ri(-8,8), x02=k2*c2-b2;
        return {q:eq('(x'+plusb(b2)+') / '+k2+' = '+sg(c2))+'<br>x = ?', type:'num', ans:x02,
          exp:'양변에 '+k2+'를 곱하면 '+eq('x'+plusb(b2)+' = '+sg(k2*c2))+'예요. 이항하면 x = '+sg(x02)+'예요.'};
      }
      // 일차부등식 — 등식과 같은 절차(양변에 연산)로 경계값 구하기
      var a3=nz(-6,6); if(a3>-2&&a3<2)a3=pick([-5,-4,-3,-2,2,3,4,5]);
      var x03=ri(-6,6), b3=ri(-8,8), op=pick(['<','>','≤','≥']), c3=a3*x03+b3;
      return {q:eq(ax(a3)+plusb(b3)+' '+op+' '+sg(c3))+'<br>부등호를 등호로 바꿨을 때 x = ?', type:'num', ans:x03,
        exp:'부등호를 등호로 바꿔서 '+eq(ax(a3)+plusb(b3)+' = '+sg(c3))+'을 풀면 x = '+sg(x03)+'예요. (부등호의 방향은 지금은 신경 쓰지 않아도 돼요 — 경계값만 구하면 돼요.)'};
    }
  };

  /* ── 챕터 2: 식 세우기 — 문장을 보고 알맞은 식 고르기(4지선다, 계산은 안 함) ── */
  var TR={
    기초:function(){
      var t=ri(1,4);
      if(t===1){ // 곱하고 더하기
        var k=ri(2,6), b=ri(1,9); while(b===k)b=ri(1,9); var c=ri(10,60);
        var correct=k+'x + '+b+' = '+c;
        var choices=[correct, k+'x − '+b+' = '+c, b+'x + '+k+' = '+c, k+'(x + '+b+') = '+c];
        return {q:'어떤 수 x의 '+k+'배에 '+b+'을 더하면 '+c+'이다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct, choices:shuffle(choices),
          exp:"'"+k+"배'는 × "+k+", '더하면'은 + "+b+"로 바꾸면 "+eq(correct)+"가 돼요."};
      }
      if(t===2){ // ~보다 크다
        var b2=ri(2,15), c2=ri(1,40); while(c2===b2)c2=ri(1,40);
        var correct2='x + '+b2+' = '+c2;
        var choices2=[correct2, 'x − '+b2+' = '+c2, b2+' − x = '+c2, 'x = '+b2+' − '+c2];
        return {q:'어떤 수 x보다 '+b2+'만큼 큰 수는 '+c2+'이다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct2, choices:shuffle(choices2),
          exp:"'~보다 크다'는 원래 값 x에 더하는 관계예요 → "+eq(correct2)};
      }
      if(t===3){ // ~보다 작다
        var b3=ri(2,15), c3=ri(1,40); while(c3===0||c3===b3)c3=ri(1,40);
        var correct3='x − '+b3+' = '+c3;
        var choices3=[correct3, 'x + '+b3+' = '+c3, b3+' − x = '+c3, 'x = '+b3+' − '+c3];
        return {q:'어떤 수 x보다 '+b3+'만큼 작은 수는 '+c3+'이다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct3, choices:shuffle(choices3),
          exp:"'~보다 작다'는 원래 값 x에서 빼는 관계예요 → "+eq(correct3)};
      }
      // 연속하는 두 자연수의 합
      var c4=ri(5,41);
      var correct4='x + (x + 1) = '+c4;
      var choices4=[correct4, 'x + (x − 1) = '+c4, 'x × (x + 1) = '+c4, 'x + (x + 2) = '+c4];
      return {q:'연속하는 두 자연수의 합이 '+c4+'이다. 작은 수를 x라 하면?<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct4, choices:shuffle(choices4),
        exp:'다음 자연수는 x보다 1 큰 (x + 1)이에요. 둘을 더하면 '+eq(correct4)};
    },
    도전:function(){
      var t=ri(1,4);
      if(t===1){ // 두 미지수 — 나이 차
        var k=ri(2,10);
        var correct='x − y = '+k;
        var choices=[correct, 'y − x = '+k, 'x + y = '+k, 'x = y − '+k];
        return {q:'형의 나이를 x살, 동생의 나이를 y살이라 하면, 형이 동생보다 '+k+'살 많다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct, choices:shuffle(choices),
          exp:"'많다'는 큰 쪽(x)에서 작은 쪽(y)을 빼는 관계예요 → "+eq(correct)};
      }
      if(t===2){ // 백분율
        var k2=pick([5,10,15,20,25,30,40,50,60,75]), c2=ri(3,50);
        var correct2='x × '+k2+'/100 = '+c2;
        var choices2=[correct2, 'x × '+k2+' = '+c2, 'x + '+k2+'/100 = '+c2, '100/'+k2+' × x = '+c2];
        return {q:'어떤 수 x의 '+k2+'%는 '+c2+'이다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct2, choices:shuffle(choices2),
          exp:"'%'는 100으로 나눈 분수를 곱하는 거예요 → "+eq(correct2)};
      }
      if(t===3){ // 두 미지수 — 합
        var c3=ri(6,50);
        var correct3='x + y = '+c3;
        var choices3=[correct3, 'x − y = '+c3, 'x × y = '+c3, 'x = y + '+c3];
        return {q:'사과 x개와 배 y개를 합쳐서 모두 '+c3+'개를 샀다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct3, choices:shuffle(choices3),
          exp:"'합쳐서'는 두 수를 더하는 관계예요 → "+eq(correct3)};
      }
      // 부등식 서술
      var k4=ri(2,6), b4=ri(1,9), c4=ri(1,30);
      var correct4=k4+'x − '+b4+' > '+c4;
      var choices4=[correct4, k4+'x − '+b4+' < '+c4, k4+'x + '+b4+' > '+c4, k4+'(x − '+b4+') > '+c4];
      return {q:'어떤 수 x의 '+k4+'배에서 '+b4+'를 빼면 '+c4+'보다 크다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct4, choices:shuffle(choices4),
        exp:"'배'는 × "+k4+", '빼면'은 − "+b4+", '크다'는 부등호 > 로 그대로 옮기면 "+eq(correct4)+"가 돼요. 부등호 방향에 주의해요."};
    }
  };

  /* ── 분수 도우미 (챕터 3·4용) ── */
  function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var t=a%b;a=b;b=t;}return a||1;}
  function lcm(a,b){return Math.abs(a*b)/gcd(a,b);}
  function R(n,d){if(d<0){n=-n;d=-d;}var g=gcd(n,d);return {n:n/g,d:d/g};}
  function fT(x){return x.d===1?sg(x.n):((x.n<0?'−':'')+Math.abs(x.n)+'/'+x.d);}   // 답 표기: −3/4, 5
  function fP(x){var t=fT(x);return x.n<0?'('+t+')':t;}                            // 식 안 표기: 음수는 괄호
  function fS(n,d){return (n<0?'−':'')+Math.abs(n)+'/'+d;}                          // 약분 전 표기
  function pn(n){return n<0?('(−'+Math.abs(n)+')'):String(n);}                       // 정수: 음수는 괄호
  function redNote(n,d){var g=gcd(n,d);return g>1?(' → '+g+'로 약분하면 '+fT(R(n,d))):'';}

  /* ── 챕터 3: 분수 계산 — 통분·약분·곱셈·나눗셈 (답은 3/4 꼴로 입력) ── */
  var FR={
    기초:function(){
      var t=ri(1,3);
      if(t===1){ // 같은 분모 덧뺄셈
        var n=ri(3,10), a=ri(1,n-1), b=ri(1,n-1), plus=Math.random()<0.6;
        if(a===b) plus=true; if(!plus&&a<b){var tmp=a;a=b;b=tmp;}
        var raw=plus?a+b:a-b, ans=R(raw,n);
        return {q:eq(a+'/'+n+(plus?' + ':' − ')+b+'/'+n)+'<br>= ?', type:'frac', ans:fT(ans),
          exp:'분모가 같으니 분자만 '+(plus?'더해요':'빼요')+': '+(plus?a+' + '+b:a+' − '+b)+' = '+raw+' → '+fS(raw,n)+redNote(raw,n)+'예요.'};
      }
      if(t===2){ // 통분 덧뺄셈
        var pr=pick([[2,4],[3,6],[2,6],[4,8],[5,10],[2,3],[3,4],[2,5],[4,6],[6,9],[3,5],[4,10]]);
        var b2=pr[0], d2=pr[1], a2=ri(1,b2-1), c2=ri(1,d2-1), L=lcm(b2,d2), n1=a2*L/b2, n2=c2*L/d2;
        var plus2=Math.random()<0.6; if(n1===n2) plus2=true;
        if(!plus2&&n1<n2){ var ta=a2,tb=b2; a2=c2;b2=d2;c2=ta;d2=tb; n1=a2*L/b2; n2=c2*L/d2; }
        var raw2=plus2?n1+n2:n1-n2, ans2=R(raw2,L);
        return {q:eq(a2+'/'+b2+(plus2?' + ':' − ')+c2+'/'+d2)+'<br>= ?', type:'frac', ans:fT(ans2),
          exp:'분모 '+b2+'과 '+d2+'의 최소공배수 '+L+'로 통분해요: '+a2+'/'+b2+' = '+n1+'/'+L+', '+c2+'/'+d2+' = '+n2+'/'+L+'. 분자만 계산하면 '+(plus2?n1+' + '+n2:n1+' − '+n2)+' = '+raw2+' → '+fS(raw2,L)+redNote(raw2,L)+'예요.'};
      }
      // 곱셈
      if(Math.random()<0.5){ var b3=ri(2,9), a3=ri(1,b3-1), k=ri(2,6), ans3=R(a3*k,b3);
        return {q:eq(a3+'/'+b3+' × '+k)+'<br>= ?', type:'frac', ans:fT(ans3),
          exp:'정수는 분자에만 곱해요: '+a3+' × '+k+' = '+(a3*k)+' → '+fS(a3*k,b3)+redNote(a3*k,b3)+'예요.'}; }
      var b4=ri(2,6), a4=ri(1,b4-1), d4=ri(2,6), c4=ri(1,d4-1), ans4=R(a4*c4,b4*d4);
      return {q:eq(a4+'/'+b4+' × '+c4+'/'+d4)+'<br>= ?', type:'frac', ans:fT(ans4),
        exp:'분자끼리 '+a4+' × '+c4+' = '+(a4*c4)+', 분모끼리 '+b4+' × '+d4+' = '+(b4*d4)+' → '+fS(a4*c4,b4*d4)+redNote(a4*c4,b4*d4)+'예요.'};
    },
    도전:function(){
      var t=ri(1,3);
      if(t===1){ // 음수 분수 덧뺄셈
        var b=pick([2,3,4,5,6,8]), d=pick([2,3,4,5,6,8]), a=ri(1,b-1)*pick([1,-1]), c=ri(1,d-1)*pick([1,-1]), plus=Math.random()<0.5;
        var x=R(a,b), y=R(c,d), L=lcm(x.d,y.d), n1=x.n*L/x.d, n2=(plus?y.n:-y.n)*L/y.d, raw=n1+n2, ans=R(raw,L);
        return {q:eq(fP(x)+(plus?' + ':' − ')+fP(y))+'<br>= ?', type:'frac', ans:fT(ans),
          exp:(plus?'':'뺄셈은 덧셈으로 바꿔요: '+fP(x)+' + '+fP({n:-y.n,d:y.d})+'. ')+'분모를 '+L+'로 통분하면 분자는 '+pn(n1)+' + '+pn(n2)+' = '+sg(raw)+' → '+fS(raw,L)+redNote(raw,L)+'예요.'};
      }
      if(t===2){ // 분수 나눗셈
        var b2=ri(2,8), a2=ri(1,b2-1)*pick([1,-1]), d2=ri(2,8), c2=ri(1,d2-1)*pick([1,-1]);
        var x2=R(a2,b2), y2=R(c2,d2), ans2=R(x2.n*y2.d, x2.d*y2.n), same=(x2.n<0)===(y2.n<0);
        return {q:eq(fP(x2)+' ÷ '+fP(y2))+'<br>= ?', type:'frac', ans:fT(ans2),
          exp:'부호 먼저: '+(same?'같은 부호 → +':'다른 부호 → −')+'. 뒤의 분수를 뒤집어 곱해요: '+Math.abs(x2.n)+'/'+x2.d+' × '+y2.d+'/'+Math.abs(y2.n)+' = '+(Math.abs(x2.n)*y2.d)+'/'+(x2.d*Math.abs(y2.n))+redNote(Math.abs(x2.n)*y2.d,x2.d*Math.abs(y2.n))+' → '+fT(ans2)+'예요.'};
      }
      // 혼합: a/b × c/d − e/f (곱셈 먼저)
      var b3=pick([2,3,4]), a3=ri(1,b3-1), d3=pick([2,3,5]), c3=ri(1,d3-1), f3=pick([2,3,4,6]), e3=ri(1,f3-1);
      var P=R(a3*c3,b3*d3), E=R(e3,f3), L3=lcm(P.d,E.d), m1=P.n*L3/P.d, m2=E.n*L3/E.d, raw3=m1-m2, ans3=R(raw3,L3);
      return {q:eq(a3+'/'+b3+' × '+c3+'/'+d3+' − '+e3+'/'+f3)+'<br>= ?', type:'frac', ans:fT(ans3),
        exp:'곱셈 먼저: '+a3+'/'+b3+' × '+c3+'/'+d3+' = '+fT(P)+'. 그다음 '+fT(P)+' − '+e3+'/'+f3+'를 분모 '+L3+'로 통분하면 '+m1+' − '+m2+' = '+sg(raw3)+' → '+fS(raw3,L3)+redNote(raw3,L3)+'예요.'};
    }
  };

  /* ── 챕터 4: 음수 계산 — 부호 먼저, 크기는 나중에 ── */
  var NG={
    기초:function(){
      var t=ri(1,3);
      if(t===1){ var a=nz(-12,12), b=nz(-12,12), s=a+b, same=(a<0)===(b<0);
        return {q:eq(sg(a)+' + '+pn(b))+'<br>= ?', type:'num', ans:s,
          exp:(same?'같은 부호니까 절댓값을 더하고 그 부호를 붙여요: '+Math.abs(a)+' + '+Math.abs(b)+' = '+Math.abs(s)+' → '+sg(s):(s===0?'절댓값이 같은 다른 부호는 0이에요.':'다른 부호니까 절댓값을 빼고 큰 쪽 부호를 붙여요: '+Math.max(Math.abs(a),Math.abs(b))+' − '+Math.min(Math.abs(a),Math.abs(b))+' = '+Math.abs(s)+' → '+sg(s)))+'예요.'}; }
      if(t===2){ var a2=nz(-12,12), b2=nz(-12,12), s2=a2-b2;
        return {q:eq(sg(a2)+' − '+pn(b2))+'<br>= ?', type:'num', ans:s2,
          exp:'빼기는 부호를 바꿔 더해요: '+sg(a2)+' + '+pn(-b2)+' = '+sg(s2)+'예요.'+(b2<0?' ("빼기 음수"는 "더하기 양수"예요.)':'')}; }
      if(Math.random()<0.5){ var a3=nz(-9,9), b3=nz(-9,9), m=a3*b3, same3=(a3<0)===(b3<0);
        return {q:eq(pn(a3)+' × '+pn(b3))+'<br>= ?', type:'num', ans:m,
          exp:'부호 먼저: '+(same3?'같은 부호 → +':'다른 부호 → −')+'. 크기: '+Math.abs(a3)+' × '+Math.abs(b3)+' = '+Math.abs(m)+' → '+sg(m)+'예요.'}; }
      var b4=nz(-9,9), q4=nz(-9,9), a4=b4*q4, same4=(a4<0)===(b4<0);
      return {q:eq(pn(a4)+' ÷ '+pn(b4))+'<br>= ?', type:'num', ans:q4,
        exp:'부호 먼저: '+(same4?'같은 부호 → +':'다른 부호 → −')+'. 크기: '+Math.abs(a4)+' ÷ '+Math.abs(b4)+' = '+Math.abs(q4)+' → '+sg(q4)+'예요.'};
    },
    도전:function(){
      var t=ri(1,3);
      if(t===1){ // 세 항
        var a=nz(-9,9), b=nz(-9,9), c=nz(-9,9), o1=pick(['+','-']), o2=pick(['+','-']);
        var b1=o1==='+'?b:-b, c1=o2==='+'?c:-c, s1=a+b1, s=s1+c1;
        return {q:eq(sg(a)+' '+(o1==='+'?'+':'−')+' '+pn(b)+' '+(o2==='+'?'+':'−')+' '+pn(c))+'<br>= ?', type:'num', ans:s,
          exp:'뺄셈은 덧셈으로 바꿔요: '+sg(a)+' + '+pn(b1)+' + '+pn(c1)+'. 왼쪽부터: '+sg(a)+' + '+pn(b1)+' = '+sg(s1)+', '+sg(s1)+' + '+pn(c1)+' = '+sg(s)+'예요.'};
      }
      if(t===2){ // 거듭제곱 부호
        var base=ri(2,5), n=pick([2,3]), form=ri(1,3);
        if(form===1){ var v1=Math.pow(-base,n); return {q:eq('(−'+base+')<sup>'+n+'</sup>')+'<br>= ?', type:'num', ans:v1,
          exp:'괄호가 있으니 부호까지 '+n+'번 곱해요. 음수 '+n+'개 → '+(n%2===0?'짝수라 +':'홀수라 −')+', 크기 '+base+'<sup>'+n+'</sup> = '+Math.pow(base,n)+' → '+sg(v1)+'예요.'}; }
        if(form===2){ var v2=-Math.pow(base,n); return {q:eq('−'+base+'<sup>'+n+'</sup>')+'<br>= ?', type:'num', ans:v2,
          exp:'괄호가 없으니 '+base+'만 '+n+'번 곱하고 앞에 −를 붙여요: −('+Math.pow(base,n)+') = '+sg(v2)+'예요. (−'+base+')<sup>'+n+'</sup>과 달라요.'}; }
        var k=nz(-4,4), v3=Math.pow(-1,n)*k*base; // (−1)^n × k × base … 간단 혼합
        return {q:eq('(−1)<sup>'+n+'</sup> × '+pn(k)+' × '+base)+'<br>= ?', type:'num', ans:v3,
          exp:'(−1)<sup>'+n+'</sup> = '+sg(Math.pow(-1,n))+'. 음수의 개수를 세면 '+((n%2)+(k<0?1:0))+'개 → '+((((n%2)+(k<0?1:0))%2===0)?'+':'−')+', 크기 1 × '+Math.abs(k)+' × '+base+' = '+Math.abs(v3)+' → '+sg(v3)+'예요.'};
      }
      // 혼합계산 순서
      var f=ri(1,3);
      if(f===1){ var a5=nz(-9,9), b5=nz(-6,6), c5=nz(-6,6), m5=b5*c5, v5=a5-m5;
        return {q:eq(sg(a5)+' − '+pn(b5)+' × '+pn(c5))+'<br>= ?', type:'num', ans:v5,
          exp:'곱셈 먼저: '+pn(b5)+' × '+pn(c5)+' = '+sg(m5)+'. 그다음 '+sg(a5)+' − '+pn(m5)+' = '+sg(v5)+'예요.'}; }
      if(f===2){ var d6=nz(-6,6), q6=nz(-6,6), a6=d6*q6, c6=nz(-9,9), v6=q6+c6;
        return {q:eq(pn(a6)+' ÷ '+pn(d6)+' + '+pn(c6))+'<br>= ?', type:'num', ans:v6,
          exp:'나눗셈 먼저: '+pn(a6)+' ÷ '+pn(d6)+' = '+sg(q6)+'. 그다음 '+sg(q6)+' + '+pn(c6)+' = '+sg(v6)+'예요.'}; }
      var a7=nz(-4,4), b7=nz(-5,5), c7=nz(-9,9), sq7=a7*a7, m7=sq7*b7, v7=m7-c7;
      return {q:eq(pn(a7)+'<sup>2</sup> × '+pn(b7)+' − '+pn(c7))+'<br>= ?', type:'num', ans:v7,
        exp:'거듭제곱 먼저: '+pn(a7)+'<sup>2</sup> = '+sq7+'. 곱셈: '+sq7+' × '+pn(b7)+' = '+sg(m7)+'. 마지막으로 '+sg(m7)+' − '+pn(c7)+' = '+sg(v7)+'예요.'};
    }
  };

  /* ── 챕터 5: 단위 환산 — 속력·농도 문제에서 늘 발목을 잡는 곳 (숫자 입력) ── */
  var UT={
    기초:function(){
      var t=ri(1,5);
      if(t===1){ // 길이 큰 단위 → 작은 단위
        var pr=pick([['km','m',1000],['m','cm',100],['cm','mm',10]]);
        var a=ri(2,9)*(pr[2]===1000?1:1)+(Math.random()<0.4?0.5:0);
        if(a%1!==0&&pr[2]===10)a=Math.round(a);        // mm 는 소수 없이
        var v=a*pr[2];
        return {q:eq(a+' '+pr[0]+' = ? '+pr[1]), type:'num', ans:v,
          exp:'1 '+pr[0]+' = '+pr[2]+' '+pr[1]+'예요. 작은 단위로 갈 때는 <b>곱해요</b>: '+a+' × '+pr[2]+' = '+v+' '+pr[1]+'예요.'};
      }
      if(t===2){ // 길이 작은 단위 → 큰 단위 (딱 떨어지게)
        var pr2=pick([['m','km',1000],['cm','m',100],['mm','cm',10]]);
        var k2=ri(2,9), v2=k2*pr2[2];
        return {q:eq(v2+' '+pr2[0]+' = ? '+pr2[1]), type:'num', ans:k2,
          exp:'1 '+pr2[1]+' = '+pr2[2]+' '+pr2[0]+'이니까 큰 단위로 갈 때는 <b>나눠요</b>: '+v2+' ÷ '+pr2[2]+' = '+k2+' '+pr2[1]+'예요.'};
      }
      if(t===3){ // 시간
        var kind=ri(1,4);
        if(kind===1){ var h=ri(2,6); return {q:eq(h+'시간 = ? 분'), type:'num', ans:h*60,
          exp:'1시간 = 60분이에요. '+h+' × 60 = '+(h*60)+'분이에요.'}; }
        if(kind===2){ var m=pick([15,30,45,60,90,120,150,180]); return {q:eq(m+'분 = ? 시간'), type:'num', ans:m/60,
          exp:'60분이 1시간이에요. '+m+' ÷ 60 = '+(m/60)+'시간이에요. (0.5시간 = 30분)'}; }
        if(kind===3){ var mm=ri(2,9); return {q:eq(mm+'분 = ? 초'), type:'num', ans:mm*60,
          exp:'1분 = 60초예요. '+mm+' × 60 = '+(mm*60)+'초예요.'}; }
        var h4=ri(1,3), m4=pick([15,20,30,40,45]);
        return {q:eq(h4+'시간 '+m4+'분 = ? 분'), type:'num', ans:h4*60+m4,
          exp:h4+'시간은 '+(h4*60)+'분이에요. 여기에 '+m4+'분을 더하면 '+(h4*60+m4)+'분이에요.'};
      }
      if(t===4){ // 무게·부피
        var pr4=pick([['kg','g',1000],['L','mL',1000],['t','kg',1000]]);
        var up=Math.random()<0.5, k4=ri(2,9);
        if(up) return {q:eq(k4+' '+pr4[0]+' = ? '+pr4[1]), type:'num', ans:k4*1000,
          exp:'1 '+pr4[0]+' = 1000 '+pr4[1]+'이에요. '+k4+' × 1000 = '+(k4*1000)+' '+pr4[1]+'이에요.'};
        return {q:eq((k4*1000)+' '+pr4[1]+' = ? '+pr4[0]), type:'num', ans:k4,
          exp:'1000 '+pr4[1]+'이 1 '+pr4[0]+'이에요. '+(k4*1000)+' ÷ 1000 = '+k4+' '+pr4[0]+'이에요.'};
      }
      // t===5 : 분수 시간 감각
      var pr5=pick([[30,0.5],[15,0.25],[45,0.75],[12,0.2],[6,0.1],[90,1.5],[24,0.4],[36,0.6]]);
      return {q:eq(pr5[0]+'분은 몇 시간인가요? (소수로)'), type:'num', ans:pr5[1],
        exp:pr5[0]+' ÷ 60 = '+pr5[1]+'시간이에요. 속력 문제에서 시속을 쓸 때는 시간을 <b>시간 단위</b>로 바꿔야 해요.'};
    },
    도전:function(){
      var t=ri(1,5);
      if(t===1){ // 넓이
        var pr=pick([['m<sup>2</sup>','cm<sup>2</sup>',10000],['cm<sup>2</sup>','mm<sup>2</sup>',100]]);
        var a=ri(2,9);
        return {q:eq(a+' '+pr[0]+' = ? '+pr[1]), type:'num', ans:a*pr[2],
          exp:'길이가 '+(pr[2]===10000?100:10)+'배면 넓이는 그 <b>제곱</b>인 '+pr[2]+'배예요. '+a+' × '+pr[2]+' = '+(a*pr[2])+'이에요.'};
      }
      if(t===2){ // 넓이 역방향
        var pr2=pick([['cm<sup>2</sup>','m<sup>2</sup>',10000],['mm<sup>2</sup>','cm<sup>2</sup>',100]]);
        var k2=ri(2,9), v2=k2*pr2[2];
        return {q:eq(v2+' '+pr2[0]+' = ? '+pr2[1]), type:'num', ans:k2,
          exp:'1 '+pr2[1]+' = '+pr2[2]+' '+pr2[0]+'이니까 '+v2+' ÷ '+pr2[2]+' = '+k2+'예요.'};
      }
      if(t===3){ // 부피
        var kind=ri(1,3);
        if(kind===1){ var a3=ri(2,9); return {q:eq(a3+' L = ? cm<sup>3</sup>'), type:'num', ans:a3*1000,
          exp:'1 L = 1000 cm<sup>3</sup>예요(= 1000 mL). '+a3+' × 1000 = '+(a3*1000)+'이에요.'}; }
        if(kind===2){ var k3=ri(2,9); return {q:eq((k3*1000)+' cm<sup>3</sup> = ? L'), type:'num', ans:k3,
          exp:'1000 cm<sup>3</sup>가 1 L예요. '+(k3*1000)+' ÷ 1000 = '+k3+' L예요.'}; }
        var a5=ri(2,9); return {q:eq(a5+' m<sup>3</sup> = ? L'), type:'num', ans:a5*1000,
          exp:'1 m<sup>3</sup> = 1000 L예요(한 변이 1 m인 통에 물 1000 L). '+a5+' × 1000 = '+(a5*1000)+' L예요.'};
      }
      if(t===4){ // 시속 → 분속·초속
        var km=pick([18,36,54,72,90,108]);
        if(Math.random()<0.5){ return {q:eq('시속 '+km+' km = 초속 ? m'), type:'num', ans:km/3.6,
          exp:'시속 '+km+' km는 1시간(3600초)에 '+(km*1000)+' m 가는 거예요. '+(km*1000)+' ÷ 3600 = '+(km/3.6)+' m/초예요.'}; }
        return {q:eq('시속 '+km+' km = 분속 ? m'), type:'num', ans:km*1000/60,
          exp:'1시간은 60분이니까 '+(km*1000)+' m ÷ 60 = '+(km*1000/60)+' m/분이에요.'};
      }
      // t===5 : 초속 → 시속
      var ms=pick([5,10,15,20,25,30]);
      return {q:eq('초속 '+ms+' m = 시속 ? km'), type:'num', ans:ms*3.6,
        exp:'1초에 '+ms+' m니까 1시간(3600초)에는 '+(ms*3600)+' m = '+(ms*3.6)+' km예요. (초속 → 시속은 3.6을 곱해요)'};
    }
  };

  window.DRILL={ chapters:[
    {key:'eq', name:'① 방정식 정리', desc:'등식의 성질로 x = ? 까지 빠르게', gen:EQ,
     card:'<b>방법 카드</b> — ① 괄호는 분배법칙으로 먼저 풀어요 → ② 분수·소수는 양변에 같은 수를 곱해 정수로 바꿔요 → '+
          '③ x항은 왼쪽, 숫자는 오른쪽으로 이항해요(부호가 바뀌는 것 주의!) → ④ ax = b 꼴로 정리 → ⑤ 양변을 x의 계수로 나눠요 → ⑥ 원래 식에 넣어 검산.<br>'+
          '<span class="muted">예시: 3(x + 2) = 2x + 11 → 3x + 6 = 2x + 11 → 3x − 2x = 11 − 6 → x = 5</span>'},
    {key:'tr', name:'② 식 세우기', desc:'문장을 보고 알맞은 식 고르기(계산은 안 해요)', gen:TR,
     card:'<b>표현 → 기호 대응표</b> — "~보다 ○ 크다"→ +○ · "~보다 ○ 작다"→ −○ · "~의 ○배"→ ×○ · "합이 ~이다"→ …+…=~ · "~%는"→ ×(○/100).<br>'+
          '<span class="muted">문장을 조각내서 대응표에 맞춰 기호로 바꾼 다음 등호로 연결해요. 계산은 안 해도 돼요 — 식만 정확히 세우면 성공!</span>'},
    {key:'fr', name:'③ 분수 계산', desc:'통분·약분·곱셈·나눗셈을 손에 익히기 (답은 3/4 꼴)', gen:FR,
     card:'<b>분수 3단계</b> — ① 덧셈·뺄셈은 <b>통분</b>(최소공배수로 분모 맞추기) → ② 분자만 계산 → ③ <b>약분</b>(기약분수로). '+
          '곱셈은 분자끼리·분모끼리, 나눗셈은 뒤의 분수를 <b>뒤집어 곱하기</b>예요. 음수가 있으면 부호부터 정해요.<br>'+
          '<span class="muted">답은 3/4처럼 써요(정수면 그냥 숫자). 왜 그런지 헷갈리면 🍕 <a href="calc-reset.html">분수·음수 계산 리셋 특강</a>을 먼저 봐요.</span>'},
    {key:'ng', name:'④ 음수 계산', desc:'부호 먼저, 크기는 나중에', gen:NG,
     card:'<b>음수 2단계</b> — ① <b>부호 먼저</b>: 덧셈은 같은 부호면 더하고 그 부호, 다른 부호면 빼고 큰 쪽 부호 · 곱셈·나눗셈은 음수 개수가 짝수면 +, 홀수면 − → ② 크기(절댓값)만 계산. '+
          '"빼기 음수"는 "더하기 양수"로 바꿔 써요. (−3)² = 9, −3² = −9 조심!<br>'+
          '<span class="muted">섞인 계산은 괄호 → 거듭제곱 → ×÷ → +− 순서예요. 왜 그런지는 🍕 <a href="calc-reset.html">계산 리셋 특강</a>에 있어요.</span>'}
,
    {key:'ut', name:'⑤ 단위 환산', desc:'km↔m · 시↔분 · cm²↔m² — 속력 문제의 숨은 함정', gen:UT,
     card:'<b>단위 사다리</b> — 길이 km <span class="muted">×1000</span> m <span class="muted">×100</span> cm <span class="muted">×10</span> mm · '+
          '시간 시 <span class="muted">×60</span> 분 <span class="muted">×60</span> 초 · 무게 kg <span class="muted">×1000</span> g · 부피 L <span class="muted">×1000</span> mL(= cm<sup>3</sup>).<br>'+
          '<b>작은 단위로 내려갈 땐 곱하고, 큰 단위로 올라갈 땐 나눠요.</b> 넓이는 길이 배율의 <b>제곱</b>(m<sup>2</sup> → cm<sup>2</sup>는 ×10000), 부피는 <b>세제곱</b>이에요.<br>'+
          '<span class="muted">시속 ↔ 초속은 3.6으로 나누고 곱해요(시속 72 km = 초속 20 m). 속력 문제는 🚗 <a href="speed-mastery.html">속력 특강</a>에 있어요.</span>'}
  ]};
})();
