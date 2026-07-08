/* drills.js — 중2-1 여름 연습: 단원 14·15 + 풀이(방정식·대입법)
 *
 * 문제 = { context(문제, 계속 보임), parts[](단계), solution?(마무리) }
 *   part(number) = { mode:'number', ask, ansLabel, answerNum, steps[] }   // ansLabel='' 이면 context 뒤 '='에 이어 입력
 *   part(choice) = { mode:'choice', ask, choices:[{html,correct}], steps[] }
 *
 * 새 스킬은 SKILLS 에 push + topic 지정하면 홈에 자동 그룹.
 */
(function () {
  'use strict';

  const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const nz = (a, b) => { let v = 0; while (v === 0) v = ri(a, b); return v; };
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };

  const MINUS = '−';
  const sgn = (n) => (n < 0 ? MINUS + Math.abs(n) : String(n));
  const pm = (n) => (n < 0 ? MINUS + ' ' : '+ ') + Math.abs(n);
  const mono = (c, v) => { const m = Math.abs(c); return ((v && m === 1) ? '' : m) + v; };
  const head = (c, v) => (c < 0 ? MINUS : '') + mono(c, v);
  const tail = (c, v) => (c < 0 ? MINUS + ' ' : '+ ') + mono(c, v);
  const pw = (base, e) => (e === 0 ? '1' : e === 1 ? base : `${base}<sup>${e}</sup>`);

  function choices(correct, distractors) {
    const seen = new Set([correct]);
    const out = [{ html: correct, correct: true }];
    for (const d of distractors) { if (out.length >= 4) break; if (!seen.has(d)) { seen.add(d); out.push({ html: d, correct: false }); } }
    return shuffle(out);
  }

  const TOPICS = [
    { id: '14', title: '단원 14 · 순환소수', emoji: '🔁', intro: '분수를 소수로 바꾸면 딱 떨어지기도(<b>유한소수</b>) 하고, 어떤 숫자가 끝없이 반복되기도 해(<b>순환소수</b>). 반복되는 부분이 <b>순환마디</b>. 기약분수의 분모가 <b>2와 5로만</b> 이루어지면 유한소수, 아니면 순환소수야.' },
    { id: '15', title: '단원 15 · 식의 계산', emoji: '✖️', intro: '문자가 든 식도 숫자처럼 계산해. 같은 문자끼리 모으고(<b>동류항</b>), 괄호는 <b>분배법칙</b>으로 풀고, 같은 수를 거듭 곱한 <b>지수</b>엔 규칙이 있어. 천천히, 정확하게!' },
    { id: 'solve', title: '풀이 연습 · 방정식과 대입법', emoji: '⚖️', intro: '방정식은 <b>좌변 = 우변</b>. 양쪽에 똑같이 더하고 빼고 나눠서 복잡한 식을 <b>x = ?</b> 하나로 단순하게 만들어 가는 거야. 미지수가 둘이면 한 식을 다른 식에 <b>대입</b>해 하나로 줄여.' }
  ];

  const SKILLS = [
    // ═══════════ 단원 14 · 순환소수 ═══════════
    {
      id: 'repeat', topic: '14', name: '순환마디 찾기', short: '0.272727…', emoji: '🔁',
      why: '반복되는 덩어리를 찾기.',
      gen() {
        const len = pick([2, 2, 3]);
        let block = ''; for (let i = 0; i < len; i++) block += (i === 0 ? ri(1, 9) : ri(0, 9));
        const rev = block.split('').reverse().join('');
        const shown = `0.${block}${block}${block}…`;
        return {
          context: shown,
          parts: [{
            mode: 'choice', ask: '<b>순환마디</b>는?',
            choices: choices(block, [block[0], rev !== block ? rev : block + block[0], block + block]),
            steps: [`반복되는 가장 짧은 덩어리 = <b>${block}</b>`]
          }]
        };
      }
    },
    {
      id: 'finite', topic: '14', name: '유한? 무한?', short: '3/8 은?', emoji: '🔍',
      why: '분모의 소인수로 판별.',
      gen() {
        let n, d;
        do { d = ri(2, 24); n = ri(1, d - 1); } while (gcd(n, d) !== 1);
        let t = d; while (t % 2 === 0) t /= 2; while (t % 5 === 0) t /= 5;
        const finite = (t === 1);
        return {
          context: `<span class="frac" data-f="${n}/${d}"><span>${n}</span><span>${d}</span></span>`,
          parts: [{
            mode: 'choice', ask: '이 기약분수는?',
            choices: shuffle([{ html: '유한소수', correct: finite }, { html: '무한소수 (순환소수)', correct: !finite }]),
            steps: [`분모 ${d}의 소인수를 2와 5로 나눠 보면 ${finite ? '1만 남아 → 유한소수' : `${t}가 남아 → 무한소수`}`]
          }]
        };
      }
    },

    // ═══════════ 단원 15 · 식의 계산 ═══════════
    {
      id: 'int', topic: '15', name: '정수 계산', short: '−3 + 7', emoji: '➕', why: '음수 섞인 사칙연산 암산.',
      gen(level) {
        if (level === 0) { const a = nz(-9, 9), b = nz(1, 9), op = pick(['+', MINUS]); const ans = op === '+' ? a + b : a - b; return { context: `${sgn(a)} ${op} ${b} =`, parts: [{ mode: 'number', ask: '', ansLabel: '', answerNum: ans, steps: [`${sgn(a)} ${op} ${b} = ${sgn(ans)}`] }] }; }
        if (level === 1) {
          if (Math.random() < 0.5) { const a = nz(-9, 9), b = nz(-9, 9); return { context: `${sgn(a)} × ${sgn(b)} =`, parts: [{ mode: 'number', ask: '', ansLabel: '', answerNum: a * b, steps: [`부호 ${(a < 0) === (b < 0) ? '(+)' : '(−)'}, ${Math.abs(a)}×${Math.abs(b)}=${Math.abs(a * b)}`] }] }; }
          const q = nz(-9, 9), dv = ri(2, 9); return { context: `${sgn(q * dv)} ÷ ${dv} =`, parts: [{ mode: 'number', ask: '', ansLabel: '', answerNum: q, steps: [`${Math.abs(q * dv)}÷${dv}=${Math.abs(q)}, 부호 ${sgn(q)}`] }] };
        }
        const a = nz(-9, 9), b = ri(2, 6), c = ri(2, 6), op = pick(['+', MINUS]); const prod = b * c, ans = op === '+' ? a + prod : a - prod;
        return { context: `${sgn(a)} ${op} ${b} × ${c} =`, parts: [{ mode: 'number', ask: '', ansLabel: '', answerNum: ans, steps: [`곱셈 먼저 ${b}×${c}=${prod}`, `${sgn(a)} ${op} ${prod} = ${sgn(ans)}`] }] };
      }
    },
    {
      id: 'subst1', topic: '15', name: '문자 대입', short: 'x=−2, 3x+1', emoji: '🔤', why: '문자에 수 넣어 값 구하기.',
      gen(level) {
        if (level === 0) { const a = ri(2, 5), x = ri(1, 9); return { context: `x = ${x} 일 때<br>${a}x =`, parts: [{ mode: 'number', ask: '', ansLabel: '', answerNum: a * x, steps: [`${a}×${x}=${a * x}`] }] }; }
        if (level === 1) { const a = ri(2, 5), b = nz(-9, 9), x = nz(-5, 5); return { context: `x = ${sgn(x)} 일 때<br>${head(a, 'x')} ${pm(b)} =`, parts: [{ mode: 'number', ask: '', ansLabel: '', answerNum: a * x + b, steps: [`${a}×(${sgn(x)})=${sgn(a * x)}`, `${sgn(a * x)} ${pm(b)} = ${sgn(a * x + b)}`] }] }; }
        const a = ri(2, 4), b = ri(2, 4), x = nz(-4, 4), y = nz(-4, 4); return { context: `x = ${sgn(x)}, y = ${sgn(y)} 일 때<br>${head(a, 'x')} ${tail(b, 'y')} =`, parts: [{ mode: 'number', ask: '', ansLabel: '', answerNum: a * x + b * y, steps: [`${sgn(a * x)} ${pm(b * y)} = ${sgn(a * x + b * y)}`] }] };
      }
    },
    {
      id: 'like', topic: '15', name: '동류항 정리', short: '2x + 3x', emoji: '🧩', why: '같은 문자끼리 계수 더하기.',
      gen(level) {
        if (level === 0) { const a = ri(2, 6), sub = Math.random() < 0.4, b = ri(1, sub ? a : 6), bb = sub ? -b : b, ans = a + bb; const correct = fmt1(ans); return { context: `${head(a, 'x')} ${tail(bb, 'x')}`, parts: [{ mode: 'choice', ask: '<b>정리하면?</b>', choices: choices(correct, [sgn(ans), fmt1(a * b), fmt1(a - bb)]), steps: [`${a} ${pm(bb)} = ${sgn(ans)} → ${correct}`] }] }; }
        if (level === 1) { const a = ri(1, 5), b = ri(1, 5), c = nz(-6, 6), d = nz(-6, 6), correct = fmtL(a + b, c + d); return { context: `${head(a, 'x')} ${tail(c, '')} ${tail(b, 'x')} ${tail(d, '')}`, parts: [{ mode: 'choice', ask: '<b>정리하면?</b>', choices: choices(correct, [fmt1(a + b + c + d), fmt1(a + b), fmtL(a + b, c - d)]), steps: [`x끼리 ${a}+${b}=${a + b}, 수끼리 ${sgn(c)} ${pm(d)} = ${sgn(c + d)} → ${correct}`] }] }; }
        const a = ri(1, 5), b = ri(1, 5), d = ri(1, 5); let c = ri(1, 5); while (c === a) c = ri(1, 5);
        const correct = fmtXY(a - c, b + d); return { context: `${head(a, 'x')} ${tail(b, 'y')} ${tail(-c, 'x')} ${tail(d, 'y')}`, parts: [{ mode: 'choice', ask: '<b>정리하면?</b>', choices: choices(correct, [fmt1((a - c) + (b + d)), fmtXY(a + c, b + d), fmtXY(a - c, b - d)]), steps: [`x끼리 ${sgn(a - c)}, y끼리 ${b + d} → ${correct}`] }] };
      }
    },
    {
      id: 'dist', topic: '15', name: '괄호 풀기', short: '2(x + 3)', emoji: '📦', why: '분배법칙으로 괄호 풀기.',
      gen(level) {
        if (level === 0) { const a = ri(2, 5), b = nz(-6, 6), correct = fmtL(a, a * b); return { context: `${a}(x ${pm(b)})`, parts: [{ mode: 'choice', ask: '<b>괄호를 풀면?</b>', choices: choices(correct, [fmtL(a, b), fmtL(1, a * b), fmtL(a, -a * b)]), steps: [`${a}·x=${a}x, ${a}·(${sgn(b)})=${sgn(a * b)} → ${correct}`] }] }; }
        if (level === 1) { const a = ri(2, 4), b = ri(2, 4), c = nz(-5, 5), d = nz(-9, 9), correct = fmtL(a * b, a * c + d); return { context: `${a}(${b}x ${pm(c)}) ${pm(d)}`, parts: [{ mode: 'choice', ask: '<b>괄호를 풀면?</b>', choices: choices(correct, [fmtL(a * b, c + d), fmtL(a * b, a * c), fmtL(b, a * c + d)]), steps: [`${a}·${b}x=${a * b}x, ${a}·(${sgn(c)})=${sgn(a * c)}, ${sgn(a * c)} ${pm(d)} = ${sgn(a * c + d)} → ${correct}`] }] }; }
        const a = ri(2, 4), b = nz(-5, 5), d = nz(-5, 5); let c = ri(2, 4); while (c === a) c = ri(2, 4);
        const correct = fmtL(a - c, a * b - c * d); return { context: `${a}(x ${pm(b)}) ${MINUS} ${c}(x ${pm(d)})`, parts: [{ mode: 'choice', ask: '<b>괄호를 풀면?</b>', choices: choices(correct, [fmtL(a - c, a * b + c * d), fmtL(a + c, a * b - c * d), fmtL(a - c, b - c * d)]), steps: [`앞 ${a}x ${pm(a * b)}, 뒤 ${MINUS}${c}x ${pm(-c * d)} → ${correct}`] }] };
      }
    },
    {
      id: 'expo', topic: '15', name: '지수법칙', short: 'a² · a³', emoji: '⏫', why: '거듭제곱의 규칙.',
      gen(level) {
        if (level === 0) { const m = ri(2, 5), n = ri(2, 5), correct = pw('a', m + n); return { context: `${pw('a', m)} × ${pw('a', n)}`, parts: [{ mode: 'choice', ask: '<b>계산하면?</b>', choices: choices(correct, [pw('a', m * n), pw('a', Math.max(2, Math.abs(m - n))), '2' + pw('a', m + n)]), steps: [`곱하면 지수끼리 <b>더한다</b>: ${m}+${n}=${m + n} → ${correct}`] }] }; }
        if (level === 1) { const m = ri(2, 4), n = ri(2, 4), correct = pw('a', m * n); return { context: `(${pw('a', m)})<sup>${n}</sup>`, parts: [{ mode: 'choice', ask: '<b>계산하면?</b>', choices: choices(correct, [pw('a', m + n), pw('a', Math.pow(m, n)), pw('a', m)]), steps: [`거듭제곱의 거듭제곱은 지수끼리 <b>곱한다</b>: ${m}×${n}=${m * n} → ${correct}`] }] }; }
        const p = ri(2, 4), qc = ri(2, 4), m = ri(2, 3), n = ri(2, 3), correct = `${p * qc}${pw('a', m + n)}`; return { context: `${p}${pw('a', m)} × ${qc}${pw('a', n)}`, parts: [{ mode: 'choice', ask: '<b>계산하면?</b>', choices: choices(correct, [`${p + qc}${pw('a', m + n)}`, `${p * qc}${pw('a', m * n)}`, `${p * qc}${pw('a', Math.max(2, Math.abs(m - n)))}`]), steps: [`계수는 곱 ${p}×${qc}=${p * qc}, 지수는 합 ${m}+${n}=${m + n} → ${correct}`] }] };
      }
    },

    // ═══════════ 풀이 연습 ═══════════
    {
      id: 'solve', topic: 'solve', name: '식 정리해 풀기', short: '3x+2 = x+8', emoji: '⚖️', why: '좌변·우변 정리해 x 구하기.',
      gen(level) {
        if (level === 0) { const a = ri(2, 5), x0 = nz(-6, 6), b = nz(-9, 9), c = a * x0 + b; return { context: `${head(a, 'x')} ${pm(b)} = ${sgn(c)}`, parts: [{ mode: 'number', ask: 'x를 구해 볼까?', ansLabel: 'x', answerNum: x0, steps: [`양변 ${b < 0 ? '+' : MINUS} ${Math.abs(b)}: ${head(a, 'x')} = ${sgn(a * x0)}`, `÷ ${a}: x = ${sgn(x0)}`] }] }; }
        if (level === 1) { const a = ri(2, 6); let c = ri(1, 5); while (c === a) c = ri(1, 5); const x0 = nz(-6, 6), b = nz(-9, 9), d = b + (a - c) * x0, simp = `${head(a - c, 'x')} = ${sgn(d - b)}`; return { context: `${head(a, 'x')} ${pm(b)} = ${head(c, 'x')} ${pm(d)}`, parts: [{ mode: 'choice', ask: 'x는 한쪽, 수는 반대쪽으로 <b>모으면?</b>', choices: choices(simp, [`${head(a + c, 'x')} = ${sgn(d - b)}`, `${head(a - c, 'x')} = ${sgn(b - d)}`, `${head(a + c, 'x')} = ${sgn(b - d)}`]), steps: [`x끼리 ${a}${MINUS}${c}=${sgn(a - c)}, 수끼리 ${sgn(d)}${MINUS}(${sgn(b)})=${sgn(d - b)} → ${simp}`] }, { mode: 'number', ask: `정리한 식 <b>${simp}</b> · x = ?`, ansLabel: 'x', answerNum: x0, steps: [`÷ ${sgn(a - c)}: x = ${sgn(x0)}`] }] }; }
        const p = ri(2, 4); let r = ri(1, 4); while (r === p) r = ri(1, 4); const x0 = nz(-5, 5), q = nz(-5, 5), s = (p - r) * x0 + p * q, expanded = `${head(p, 'x')} ${pm(p * q)} = ${head(r, 'x')} ${pm(s)}`;
        return { context: `${p}(x ${pm(q)}) = ${head(r, 'x')} ${pm(s)}`, parts: [{ mode: 'choice', ask: '<b>괄호를 풀면?</b>', choices: choices(expanded, [`${head(p, 'x')} ${pm(q)} = ${head(r, 'x')} ${pm(s)}`, `${head(1, 'x')} ${pm(p * q)} = ${head(r, 'x')} ${pm(s)}`, `${head(p, 'x')} ${pm(-p * q)} = ${head(r, 'x')} ${pm(s)}`]), steps: [`${p}·x=${p}x, ${p}·(${sgn(q)})=${sgn(p * q)} → ${expanded}`] }, { mode: 'number', ask: `괄호 푼 식 <b>${expanded}</b> · x = ?`, ansLabel: 'x', answerNum: x0, steps: [`x끼리 모으면 ${head(p - r, 'x')} = ${sgn(s - p * q)}`, `x = ${sgn(x0)}`] }] };
      }
    },
    {
      id: 'subst', topic: 'solve', name: '대입법', short: 'y=2x+4 대입', emoji: '🔗', why: '한 식을 다른 식에 대입해 풀기.',
      gen(level) {
        const rng = level === 0 ? 4 : 5, x0 = nz(-rng, rng), m = pick(level === 0 ? [2, 3, -1, -2] : [2, 3, -2, -3, 4]), k = nz(-6, 6), y0 = m * x0 + k, a = level === 0 ? 1 : ri(1, 3);
        let b; do { b = nz(-3, 3); } while (a + b * m === 0);
        const c = a * x0 + b * y0, inner = `${head(m, 'x')} ${pm(k)}`, bAbs = Math.abs(b) === 1 ? '' : Math.abs(b), subEq = `${head(a, 'x')} ${b < 0 ? MINUS : '+'} ${bAbs}(${inner}) = ${sgn(c)}`, eq1 = `y = ${inner}`, eq2 = `${head(a, 'x')} ${tail(b, 'y')} = ${sgn(c)}`, coef = a + b * m;
        return {
          context: `①  ${eq1}<br>②  ${eq2}`,
          parts: [
            { mode: 'choice', ask: '②에 <b>y를 대입하면?</b>', choices: choices(subEq, [`${head(a, 'x')} ${pm(b * m)}x ${pm(k)} = ${sgn(c)}`, `${head(a, 'x')} + (${inner}) = ${sgn(c)}`, `${head(a, 'x')} ${b < 0 ? MINUS : '+'} ${bAbs}(${head(m, 'x')} ${pm(-k)}) = ${sgn(c)}`]), steps: [`y 자리에 (${inner}) 를 통째로 — 괄호 꼭! → ${subEq}`] },
            { mode: 'number', ask: `대입한 식 <b>${subEq}</b> · x = ?`, ansLabel: 'x', answerNum: x0, steps: [`정리: ${head(coef, 'x')} ${pm(b * k)} = ${sgn(c)}`, `${head(coef, 'x')} = ${sgn(c - b * k)}`, `x = ${sgn(x0)}`] }
          ],
          solution: `x = ${sgn(x0)} → y = ${inner.replace('x', '(' + sgn(x0) + ')')} = ${sgn(y0)}`
        };
      }
    }
  ];

  // 식 표시 헬퍼 (choices 안에서 쓰이므로 위에서 정의)
  function fmtPoly(terms) {
    const t = terms.filter((tm) => tm.c !== 0);
    if (t.length === 0) return '0';
    return t.map((tm, i) => { const m = Math.abs(tm.c); const coef = (tm.v && m === 1) ? '' : String(m); const body = coef + tm.v; return i === 0 ? (tm.c < 0 ? MINUS : '') + body : (tm.c < 0 ? ' ' + MINUS + ' ' : ' + ') + body; }).join('');
  }
  function fmt1(c) { return fmtPoly([{ c, v: 'x' }]); }
  function fmtL(a, b) { return fmtPoly([{ c: a, v: 'x' }, { c: b, v: '' }]); }
  function fmtXY(a, b) { return fmtPoly([{ c: a, v: 'x' }, { c: b, v: 'y' }]); }

  const byId = {};
  SKILLS.forEach((s) => { byId[s.id] = s; });
  function generate(skillId, level) { const s = byId[skillId]; const p = s.gen(level); p._skill = s.id; p._name = s.name; return p; }

  const DrillKit = { TOPICS, SKILLS, byId, generate, MINUS };
  const target = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  target.DrillKit = DrillKit;
  if (typeof module !== 'undefined' && module.exports) module.exports = DrillKit;
})();
