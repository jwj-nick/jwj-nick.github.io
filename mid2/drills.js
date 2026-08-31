/* drills.js — 계산 연습 문제 은행 (중2-1)
 * 챕터 6개 × 기초/도전. 각 생성기는 랜덤 인스턴스를 만든다(새로고침/새 문제 → 새 세트).
 * 반환: {q: 문제 HTML, type:'num'|'pick', ans: 정수 또는 라벨, choices?: [..]}
 * window.DRILL 로 노출.
 */
(function(){
  'use strict';
  function ri(a,b){return a+Math.floor(Math.random()*(b-a+1));}
  function pick(a){return a[Math.floor(Math.random()*a.length)];}
  function nz(a,b){var v=0;while(v===0)v=ri(a,b);return v;}
  function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var t=b;b=a%b;a=t;}return a;}
  function sg(n){return n<0?('−'+Math.abs(n)):(''+n);}
  function ax(a){return a===0?'':a===1?'x':a===-1?'−x':(sg(a)+'x');}      // ax 항
  function plusb(b){return b===0?'':(b>0?(' + '+b):(' − '+Math.abs(b)));}  // + b / − |b|
  var eq=function(s){return '<span class="eq">'+s+'</span>';};
  function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}

  var C1={
    기초:function(){
      var ds=[3,4,5,6,7,8,9,11,12,14,15,16,20,22,24,25];
      var d=pick(ds), n=ri(1,d-1), g=gcd(n,d), rd=d/g, t=rd;
      while(t%2===0)t/=2; while(t%5===0)t/=5;
      return {q:eq(n+'/'+d)+' 는?', type:'pick', choices:['유한소수','무한소수'], ans:(t===1?'유한소수':'무한소수')};
    },
    도전:function(){
      var pool=[['1/7','142857'],['1/3','3'],['1/9','1'],['4/9','4'],['2/11','18'],['5/11','45'],['1/13','076923']];
      var p=pick(pool), rep=p[1], k=ri(1,24);
      return {q:eq(p[0]+' = 0.'+rep+rep.charAt(0)+'…')+'<br>소수점 아래 '+k+'번째 자리 숫자?', type:'num', ans:+rep.charAt((k-1)%rep.length)};
    }
  };

  var C2={
    기초:function(){
      var t=ri(1,4);
      if(t===1){var a=ri(3,9),b=ri(1,a-1); return {q:eq(a+'x − '+b+'x')+' 를 정리하면 ?x', type:'num', ans:a-b};}
      if(t===2){var a=ri(2,6),b=ri(1,6),k=ri(2,5); return {q:eq(k+'('+a+'x + '+b+')')+' 의 x의 계수?', type:'num', ans:k*a};}
      if(t===3){var mm=ri(2,5),n=ri(2,5); return {q:eq('a<sup>'+mm+'</sup> × a<sup>'+n+'</sup> = a<sup>?</sup>'), type:'num', ans:mm+n};}
      var mm=ri(4,8),n=ri(1,3); return {q:eq('a<sup>'+mm+'</sup> ÷ a<sup>'+n+'</sup> = a<sup>?</sup>'), type:'num', ans:mm-n};
    },
    도전:function(){
      var t=ri(1,4);
      if(t===1){var mm=ri(2,4),n=ri(2,3); return {q:eq('(a<sup>'+mm+'</sup>)<sup>'+n+'</sup> = a<sup>?</sup>'), type:'num', ans:mm*n};}
      if(t===2){var k=ri(2,3),n=ri(2,3); return {q:eq('('+k+'a)<sup>'+n+'</sup>')+' 의 계수?', type:'num', ans:Math.pow(k,n)};}
      if(t===3){var q=ri(2,4),f=ri(2,5),p=q*f,mm=ri(3,6),n=ri(1,2); return {q:eq(p+'a<sup>'+mm+'</sup> ÷ '+q+'a<sup>'+n+'</sup>')+' 의 계수?', type:'num', ans:f};}
      var k=ri(2,4),a=ri(2,4),b=ri(1,5),c=ri(1,6); return {q:eq(k+'('+a+'x + '+b+') + '+c+'x')+' 의 x의 계수?', type:'num', ans:k*a+c};
    }
  };

  var C3={
    기초:function(){
      var a=ri(2,5), x0=ri(-4,6), b=ri(-5,5), c=a*x0+b, op=pick(['≤','<']);
      return {q:eq(a+'x'+plusb(b)+' '+op+' '+sg(c))+'<br>x '+op+' ? 의 경계값?', type:'num', ans:x0};
    },
    도전:function(){
      var a=ri(2,4), x0=ri(-4,5), b=ri(-4,4), c=b-a*x0, op=pick(['<','>']);
      return {q:eq('−'+a+'x'+plusb(b)+' '+op+' '+sg(c))+'<br>x의 경계값? <span class="muted">(음수로 나눔)</span>', type:'num', ans:x0};
    }
  };

  var C4={
    기초:function(){
      var x0=ri(-3,5), mm=ri(1,3), k=ri(-4,4), y0=mm*x0+k, p=ri(1,4), r=p*x0+y0;
      return {q:eq('y = '+ax(mm)+plusb(k))+', '+eq(p+'x + y = '+sg(r))+'<br>x = ?', type:'num', ans:x0};
    },
    도전:function(){
      var y0=ri(-3,4), d=pick([-1,1,2]), e=ri(-3,3), x0=d*y0+e, a=ri(1,3), b=ri(1,3), c=a*x0+b*y0;
      var xExpr=(d===1?'y':d===-1?'−y':d+'y')+plusb(e);
      return {q:eq(a+'x + '+b+'y = '+sg(c))+', '+eq('x = '+xExpr)+'<br>y = ?', type:'num', ans:y0};
    }
  };

  var C5={
    기초:function(){
      var t=ri(1,3);
      if(t===1){var a=nz(-4,4),b=ri(-5,5),k=ri(-3,4); return {q:eq('f(x) = '+ax(a)+plusb(b))+' 일 때 '+eq('f('+sg(k)+') = ?'), type:'num', ans:a*k+b};}
      if(t===2){var a=nz(-4,4),b=ri(-6,6); return {q:eq('y = '+ax(a)+plusb(b))+' 의 y절편?', type:'num', ans:b};}
      var a=nz(-4,4),b=ri(-6,6); return {q:eq('y = '+ax(a)+plusb(b))+' 의 기울기?', type:'num', ans:a};
    },
    도전:function(){
      var t=ri(1,2);
      if(t===1){var x1=ri(-4,1),dx=ri(1,4),x2=x1+dx,s=nz(-3,3),y1=ri(-4,4),y2=y1+s*dx;
        return {q:'두 점 '+eq('('+x1+', '+y1+')')+', '+eq('('+x2+', '+y2+')')+' 를 지나는 직선의 기울기?', type:'num', ans:s};}
      var a=nz(-4,4), root=ri(-4,4), b=-a*root;
      return {q:eq('y = '+ax(a)+plusb(b))+' 의 x절편?', type:'num', ans:root};
    }
  };

  var C6={
    기초:function(){
      var a=nz(-4,4), root=ri(-5,5), b=-a*root;
      return {q:eq(ax(a)+plusb(b)+' = 0')+' 의 해 x = ?', type:'num', ans:root};
    },
    도전:function(){
      var x0=ri(-3,4), a1=nz(-3,3), a2=nz(-3,3); while(a2===a1)a2=nz(-3,3);
      var b1=ri(-4,4), y0=a1*x0+b1, b2=y0-a2*x0;
      return {q:'두 직선 '+eq('y = '+ax(a1)+plusb(b1))+', '+eq('y = '+ax(a2)+plusb(b2))+'<br>의 교점의 x좌표?', type:'num', ans:x0};
    }
  };

  /* ── 챕터 7: 방정식 정리 — 등식의 성질로 x = ? 까지 (숫자 입력) ──
   * math1/app1 drills.js 와 같은 생성기(80,000샘플 검증됨) — 기초=중1 복습, 도전=중2 수준. */
  var C7={
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
      var a3=nz(-6,6); if(a3>-2&&a3<2)a3=pick([-5,-4,-3,-2,2,3,4,5]);
      var x03=ri(-6,6), b3=ri(-8,8), op=pick(['<','>','≤','≥']), c3=a3*x03+b3;
      return {q:eq(ax(a3)+plusb(b3)+' '+op+' '+sg(c3))+'<br>부등호를 등호로 바꿨을 때 x = ?', type:'num', ans:x03,
        exp:'부등호를 등호로 바꿔서 '+eq(ax(a3)+plusb(b3)+' = '+sg(c3))+'을 풀면 x = '+sg(x03)+'예요. (부등호의 방향은 지금은 신경 쓰지 않아도 돼요 — 경계값만 구하면 돼요.)'};
    }
  };

  /* ── 챕터 8: 식 세우기 — 문장을 보고 알맞은 식 고르기(4지선다, 계산은 안 함) ── */
  var C8={
    기초:function(){
      var t=ri(1,4);
      if(t===1){
        var k=ri(2,6), b=ri(1,9); while(b===k)b=ri(1,9); var c=ri(10,60);
        var correct=k+'x + '+b+' = '+c;
        var choices=[correct, k+'x − '+b+' = '+c, b+'x + '+k+' = '+c, k+'(x + '+b+') = '+c];
        return {q:'어떤 수 x의 '+k+'배에 '+b+'을 더하면 '+c+'이다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct, choices:shuffle(choices),
          exp:"'"+k+"배'는 × "+k+", '더하면'은 + "+b+"로 바꾸면 "+eq(correct)+"가 돼요."};
      }
      if(t===2){
        var b2=ri(2,15), c2=ri(1,40); while(c2===b2)c2=ri(1,40);
        var correct2='x + '+b2+' = '+c2;
        var choices2=[correct2, 'x − '+b2+' = '+c2, b2+' − x = '+c2, 'x = '+b2+' − '+c2];
        return {q:'어떤 수 x보다 '+b2+'만큼 큰 수는 '+c2+'이다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct2, choices:shuffle(choices2),
          exp:"'~보다 크다'는 원래 값 x에 더하는 관계예요 → "+eq(correct2)};
      }
      if(t===3){
        var b3=ri(2,15), c3=ri(1,40); while(c3===0||c3===b3)c3=ri(1,40);
        var correct3='x − '+b3+' = '+c3;
        var choices3=[correct3, 'x + '+b3+' = '+c3, b3+' − x = '+c3, 'x = '+b3+' − '+c3];
        return {q:'어떤 수 x보다 '+b3+'만큼 작은 수는 '+c3+'이다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct3, choices:shuffle(choices3),
          exp:"'~보다 작다'는 원래 값 x에서 빼는 관계예요 → "+eq(correct3)};
      }
      var c4=ri(5,41);
      var correct4='x + (x + 1) = '+c4;
      var choices4=[correct4, 'x + (x − 1) = '+c4, 'x × (x + 1) = '+c4, 'x + (x + 2) = '+c4];
      return {q:'연속하는 두 자연수의 합이 '+c4+'이다. 작은 수를 x라 하면?<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct4, choices:shuffle(choices4),
        exp:'다음 자연수는 x보다 1 큰 (x + 1)이에요. 둘을 더하면 '+eq(correct4)};
    },
    도전:function(){
      var t=ri(1,4);
      if(t===1){
        var k=ri(2,10);
        var correct='x − y = '+k;
        var choices=[correct, 'y − x = '+k, 'x + y = '+k, 'x = y − '+k];
        return {q:'형의 나이를 x살, 동생의 나이를 y살이라 하면, 형이 동생보다 '+k+'살 많다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct, choices:shuffle(choices),
          exp:"'많다'는 큰 쪽(x)에서 작은 쪽(y)을 빼는 관계예요 → "+eq(correct)};
      }
      if(t===2){
        var k2=pick([5,10,15,20,25,30,40,50,60,75]), c2=ri(3,50);
        var correct2='x × '+k2+'/100 = '+c2;
        var choices2=[correct2, 'x × '+k2+' = '+c2, 'x + '+k2+'/100 = '+c2, '100/'+k2+' × x = '+c2];
        return {q:'어떤 수 x의 '+k2+'%는 '+c2+'이다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct2, choices:shuffle(choices2),
          exp:"'%'는 100으로 나눈 분수를 곱하는 거예요 → "+eq(correct2)};
      }
      if(t===3){
        var c3=ri(6,50);
        var correct3='x + y = '+c3;
        var choices3=[correct3, 'x − y = '+c3, 'x × y = '+c3, 'x = y + '+c3];
        return {q:'사과 x개와 배 y개를 합쳐서 모두 '+c3+'개를 샀다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct3, choices:shuffle(choices3),
          exp:"'합쳐서'는 두 수를 더하는 관계예요 → "+eq(correct3)};
      }
      var k4=ri(2,6), b4=ri(1,9), c4=ri(1,30);
      var correct4=k4+'x − '+b4+' > '+c4;
      var choices4=[correct4, k4+'x − '+b4+' < '+c4, k4+'x + '+b4+' > '+c4, k4+'(x − '+b4+') > '+c4];
      return {q:'어떤 수 x의 '+k4+'배에서 '+b4+'를 빼면 '+c4+'보다 크다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct4, choices:shuffle(choices4),
        exp:"'배'는 × "+k4+", '빼면'은 − "+b4+", '크다'는 부등호 > 로 그대로 옮기면 "+eq(correct4)+"가 돼요. 부등호 방향에 주의해요."};
    }
  };

  window.DRILL={ chapters:[
    {key:'c1',name:'순환소수',    gen:C1},
    {key:'c2',name:'식의 계산',   gen:C2},
    {key:'c3',name:'부등식',      gen:C3},
    {key:'c4',name:'연립방정식',  gen:C4},
    {key:'c5',name:'일차함수',    gen:C5},
    {key:'c6',name:'함수와 방정식',gen:C6},
    {key:'c7',name:'⚡ 방정식 정리',gen:C7,
     card:'<b>방법 카드</b> — ① 괄호는 분배법칙으로 먼저 풀어요 → ② 분수·소수는 양변에 같은 수를 곱해 정수로 바꿔요 → '+
          '③ x항은 왼쪽, 숫자는 오른쪽으로 이항해요(부호가 바뀌는 것 주의!) → ④ ax = b 꼴로 정리 → ⑤ 양변을 x의 계수로 나눠요 → ⑥ 원래 식에 넣어 검산.<br>'+
          '<span class="muted">예시: 3(x + 2) = 2x + 11 → 3x + 6 = 2x + 11 → 3x − 2x = 11 − 6 → x = 5</span>'},
    {key:'c8',name:'⚡ 식 세우기',gen:C8,
     card:'<b>표현 → 기호 대응표</b> — "~보다 ○ 크다"→ +○ · "~보다 ○ 작다"→ −○ · "~의 ○배"→ ×○ · "합이 ~이다"→ …+…=~ · "~%는"→ ×(○/100).<br>'+
          '<span class="muted">문장을 조각내서 대응표에 맞춰 기호로 바꾼 다음 등호로 연결해요. 계산은 안 해도 돼요 — 식만 정확히 세우면 성공!</span>'}
  ]};
})();
