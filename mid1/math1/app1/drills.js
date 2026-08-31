/* drills.js — 스피드 드릴 문제 은행 (중1 앱 특별 챕터)
 * 목적: (a) 등식의 성질로 식을 정리하는 절차의 자동화(구몬형 반복) (b) 문장 → 식 세우기 인식 훈련.
 * 챕터 2개 × 기초(중1 수준)/도전(중2 수준). 각 생성기는 랜덤 인스턴스를 만든다(새로고침/새 문제 → 새 세트).
 * 반환: {q: 문제 HTML, type:'num'|'pick', ans: 숫자 또는 정답 문자열, choices?: [..]}
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
        return {q:eq(ax(a)+plusb(b)+' = '+sg(c))+'<br>x = ?', type:'num', ans:x0};
      }
      if(t===2){ // ax + b = dx + e (양변에 x)
        var a2=ri(2,6), d2=ri(2,6); while(d2===a2)d2=ri(2,6);
        var x02=ri(-6,6), b2=ri(-9,9), e2=b2+(a2-d2)*x02;
        return {q:eq(ax(a2)+plusb(b2)+' = '+ax(d2)+plusb(e2))+'<br>x = ?', type:'num', ans:x02};
      }
      // k(x + b) = c
      var k3=ri(2,6), x03=ri(-6,6), b3=ri(-6,6), c3=k3*(x03+b3);
      return {q:eq(k3+'(x'+plusb(b3)+') = '+sg(c3))+'<br>x = ?', type:'num', ans:x03};
    },
    도전:function(){
      var t=ri(1,3);
      if(t===1){ // k(x+b) = dx + e (분배 + 양변 혼합)
        var k=ri(2,5), d=ri(2,5); while(d===k)d=ri(2,5);
        var x0=ri(-6,6), b=ri(-6,6), e=k*(x0+b)-d*x0;
        return {q:eq(k+'(x'+plusb(b)+') = '+ax(d)+plusb(e))+'<br>x = ?', type:'num', ans:x0};
      }
      if(t===2){ // (x + b) / k = c (분수 계수)
        var k2=ri(2,5), c2=ri(-6,6), b2=ri(-8,8), x02=k2*c2-b2;
        return {q:eq('(x'+plusb(b2)+') / '+k2+' = '+sg(c2))+'<br>x = ?', type:'num', ans:x02};
      }
      // 일차부등식 — 등식과 같은 절차(양변에 연산)로 경계값 구하기
      var a3=nz(-6,6); if(a3>-2&&a3<2)a3=pick([-5,-4,-3,-2,2,3,4,5]);
      var x03=ri(-6,6), b3=ri(-8,8), op=pick(['<','>','≤','≥']), c3=a3*x03+b3;
      return {q:eq(ax(a3)+plusb(b3)+' '+op+' '+sg(c3))+'<br>부등호를 등호로 바꿨을 때 x = ?', type:'num', ans:x03};
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
        return {q:'어떤 수 x의 '+k+'배에 '+b+'을 더하면 '+c+'이다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct, choices:shuffle(choices)};
      }
      if(t===2){ // ~보다 크다
        var b2=ri(2,15), c2=ri(1,40); while(c2===b2)c2=ri(1,40);
        var correct2='x + '+b2+' = '+c2;
        var choices2=[correct2, 'x − '+b2+' = '+c2, b2+' − x = '+c2, 'x = '+b2+' − '+c2];
        return {q:'어떤 수 x보다 '+b2+'만큼 큰 수는 '+c2+'이다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct2, choices:shuffle(choices2)};
      }
      if(t===3){ // ~보다 작다
        var b3=ri(2,15), c3=ri(1,40); while(c3===0||c3===b3)c3=ri(1,40);
        var correct3='x − '+b3+' = '+c3;
        var choices3=[correct3, 'x + '+b3+' = '+c3, b3+' − x = '+c3, 'x = '+b3+' − '+c3];
        return {q:'어떤 수 x보다 '+b3+'만큼 작은 수는 '+c3+'이다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct3, choices:shuffle(choices3)};
      }
      // 연속하는 두 자연수의 합
      var c4=ri(5,41);
      var correct4='x + (x + 1) = '+c4;
      var choices4=[correct4, 'x + (x − 1) = '+c4, 'x × (x + 1) = '+c4, 'x + (x + 2) = '+c4];
      return {q:'연속하는 두 자연수의 합이 '+c4+'이다. 작은 수를 x라 하면?<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct4, choices:shuffle(choices4)};
    },
    도전:function(){
      var t=ri(1,4);
      if(t===1){ // 두 미지수 — 나이 차
        var k=ri(2,10);
        var correct='x − y = '+k;
        var choices=[correct, 'y − x = '+k, 'x + y = '+k, 'x = y − '+k];
        return {q:'형의 나이를 x살, 동생의 나이를 y살이라 하면, 형이 동생보다 '+k+'살 많다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct, choices:shuffle(choices)};
      }
      if(t===2){ // 백분율
        var k2=pick([5,10,15,20,25,30,40,50,60,75]), c2=ri(3,50);
        var correct2='x × '+k2+'/100 = '+c2;
        var choices2=[correct2, 'x × '+k2+' = '+c2, 'x + '+k2+'/100 = '+c2, '100/'+k2+' × x = '+c2];
        return {q:'어떤 수 x의 '+k2+'%는 '+c2+'이다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct2, choices:shuffle(choices2)};
      }
      if(t===3){ // 두 미지수 — 합
        var c3=ri(6,50);
        var correct3='x + y = '+c3;
        var choices3=[correct3, 'x − y = '+c3, 'x × y = '+c3, 'x = y + '+c3];
        return {q:'사과 x개와 배 y개를 합쳐서 모두 '+c3+'개를 샀다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct3, choices:shuffle(choices3)};
      }
      // 부등식 서술
      var k4=ri(2,6), b4=ri(1,9), c4=ri(1,30);
      var correct4=k4+'x − '+b4+' > '+c4;
      var choices4=[correct4, k4+'x − '+b4+' < '+c4, k4+'x + '+b4+' > '+c4, k4+'(x − '+b4+') > '+c4];
      return {q:'어떤 수 x의 '+k4+'배에서 '+b4+'를 빼면 '+c4+'보다 크다.<br>이 상황을 식으로 나타내면?', type:'pick', ans:correct4, choices:shuffle(choices4)};
    }
  };

  window.DRILL={ chapters:[
    {key:'eq', name:'① 방정식 정리', desc:'등식의 성질로 x = ? 까지 빠르게', gen:EQ,
     card:'<b>방법 카드</b> — ① 괄호는 분배법칙으로 먼저 풀어요 → ② 분수·소수는 양변에 같은 수를 곱해 정수로 바꿔요 → '+
          '③ x항은 왼쪽, 숫자는 오른쪽으로 이항해요(부호가 바뀌는 것 주의!) → ④ ax = b 꼴로 정리 → ⑤ 양변을 x의 계수로 나눠요 → ⑥ 원래 식에 넣어 검산.<br>'+
          '<span class="muted">예시: 3(x + 2) = 2x + 11 → 3x + 6 = 2x + 11 → 3x − 2x = 11 − 6 → x = 5</span>'},
    {key:'tr', name:'② 식 세우기', desc:'문장을 보고 알맞은 식 고르기(계산은 안 해요)', gen:TR,
     card:'<b>표현 → 기호 대응표</b> — "~보다 ○ 크다"→ +○ · "~보다 ○ 작다"→ −○ · "~의 ○배"→ ×○ · "합이 ~이다"→ …+…=~ · "~%는"→ ×(○/100).<br>'+
          '<span class="muted">문장을 조각내서 대응표에 맞춰 기호로 바꾼 다음 등호로 연결해요. 계산은 안 해도 돼요 — 식만 정확히 세우면 성공!</span>'}
  ]};
})();
