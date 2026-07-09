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

  window.DRILL={ chapters:[
    {key:'c1',name:'순환소수',    gen:C1},
    {key:'c2',name:'식의 계산',   gen:C2},
    {key:'c3',name:'부등식',      gen:C3},
    {key:'c4',name:'연립방정식',  gen:C4},
    {key:'c5',name:'일차함수',    gen:C5},
    {key:'c6',name:'함수와 방정식',gen:C6}
  ]};
})();
