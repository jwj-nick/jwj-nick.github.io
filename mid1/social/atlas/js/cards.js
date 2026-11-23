/* Data cards: one data set + a three-step question ladder (find, explain, judge). */
(function () {
  const A = window.Atlas;
  A.topbar('cards.html', { en: 'Data cards · World Atlas Lab', ko: '자료 카드 · 세계지리 실험실' });

  const UNITS = [
    ['all', { en: 'All', ko: '전체' }],
    ['I', { en: 'I · Geography in a connected world', ko: 'I · 세계화 시대, 지리의 힘' }],
    ['II', { en: 'II · Asia', ko: 'II · 아시아' }],
    ['III', { en: 'III · Europe', ko: 'III · 유럽' }],
    ['V', { en: 'V · The Americas', ko: 'V · 아메리카' }],
    ['more', { en: 'More regions (beyond the Korean exam range)', ko: '더 보기(시험 범위 밖)' }],
  ];
  const LEVELS = {
    1: { en: 'Find it in the data', ko: '자료에서 찾기' },
    2: { en: 'Explain with the data', ko: '자료로 설명하기' },
    3: { en: 'Judge a claim, then take a side', ko: '주장을 따지고 입장 밝히기' },
  };
  const DK = 'atlas.cards.';
  const load = k => { try { return localStorage.getItem(DK + k) || ''; } catch (e) { return ''; } };
  const save = (k, v) => { try { localStorage.setItem(DK + k, v); } catch (e) {} };

  let cards = [], ctx = null, unit = 'all', cur = null;
  const $list = document.getElementById('cardList'), $card = document.getElementById('card');

  function themeName(id) { const t = (window.CATALOG && CATALOG.themes || []).find(x => x.id === id); return t ? t.name : { en: id }; }
  function hashSeed(s) { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 2147483646; return h + 1; }

  function chips() {
    const box = document.getElementById('unitChips');
    box.innerHTML = UNITS.map(([u, l]) => '<button type="button" class="chip" data-u="' + u + '" aria-pressed="' + (u === unit) + '">' + A.esc(A.t(l)) + '</button>').join('');
    box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { unit = b.dataset.u; chips(); list(); }));
  }
  function visible() { return cards.filter(c => unit === 'all' || c.unit === unit); }
  function list() {
    const vs = visible();
    $list.innerHTML = vs.map(c => '<button type="button" data-id="' + c.id + '" aria-current="' + (cur && c.id === cur.id) + '"><span>' + A.esc(A.t(c.title)) +
      '</span><small>' + A.esc(c.unit) + ' · ' + A.esc(A.t(themeName(c.theme))) + '</small></button>').join('');
    $list.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { location.hash = b.dataset.id; }));
    if (!cur || !vs.includes(cur)) { if (vs[0]) show(vs[0].id, true); }
  }

  function show(id, quiet) {
    const c = cards.find(x => x.id === id) || cards[0];
    if (!c) return;
    cur = c;
    $list.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', String(b.dataset.id === c.id)));
    const cb = $list.querySelector('button[aria-current="true"]');
    if (cb && $list.scrollWidth > $list.clientWidth) $list.scrollLeft = cb.offsetLeft - $list.offsetLeft - 8;
    $card.innerHTML = '<p class="small muted">' + A.esc(A.t(UNITS.find(u => u[0] === c.unit)[1])) + '</p><h2>' + A.esc(A.t(c.title)) + '</h2>' +
      '<p class="bigq">' + A.esc(A.t(c.question)) + '</p><div class="sources"></div>';
    const sb = $card.querySelector('.sources');
    c.sources.forEach(s => { const box = A.el('div', { class: 'src-box' }); sb.appendChild(box); A.Sources.render(box, s, ctx); });
    c.ladder.forEach(r => $card.appendChild(rung(c, r)));
    if (!quiet) $card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function rungHead(r) {
    return '<header><span class="lvl">' + A.esc(A.t({ en: 'Step ', ko: '' })) + r.level + A.esc(A.t({ en: '', ko: '층' })) + '</span><span class="lvl-name">' +
      A.esc(A.t(LEVELS[r.level])) + '</span></header><p><strong>' + A.esc(A.t(r.prompt)) + '</strong></p>';
  }
  function ta(key, ph) {
    const t = A.el('textarea', { rows: 4, style: 'width:100%;font:inherit;padding:.5rem;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink)', placeholder: A.t(ph) });
    t.value = load(key);
    t.addEventListener('input', () => save(key, t.value));
    return t;
  }
  function ul(items) { return '<ul>' + items.map(i => '<li>' + A.esc(A.t(i)) + '</li>').join('') + '</ul>'; }

  function rung(c, r) {
    const box = A.el('section', { class: 'rung' }, rungHead(r));
    const key = c.id + '.' + r.level;
    if (r.kind === 'mcq') {
      const opts = A.shuffle(r.options.map((o, i) => Object.assign({ i }, o)), hashSeed(c.id));
      const form = A.el('div', { role: 'radiogroup', style: 'display:grid;gap:.4rem' });
      opts.forEach((o, k) => {
        const lab = A.el('label', { class: 'opt' }, '<input type="radio" name="q-' + c.id + '" value="' + o.i + '"><span>' + '①②③④⑤'[k] + ' ' + A.esc(A.t(o.text)) + '</span><span class="why" hidden></span>');
        form.appendChild(lab);
      });
      const saved = load(key);
      if (saved) { const inp = form.querySelector('input[value="' + saved + '"]'); if (inp) inp.checked = true; }
      const btn = A.el('button', { type: 'button', class: 'btn' }, A.esc(A.t({ en: 'Check', ko: '확인' })));
      const msg = A.el('p', { class: 'small', 'aria-live': 'polite' });
      btn.addEventListener('click', () => {
        const sel = form.querySelector('input:checked');
        if (!sel) { msg.textContent = A.t({ en: 'Pick one first.', ko: '먼저 하나를 고르세요.' }); return; }
        save(key, sel.value);
        const right = r.options[+sel.value].correct;
        msg.innerHTML = right ? '<strong style="color:var(--good)">' + A.esc(A.t({ en: 'Correct.', ko: '맞았습니다.' })) + '</strong> ' + A.esc(A.t({ en: 'Read why the other choices are tempting but wrong.', ko: '다른 선택지가 왜 그럴듯하지만 틀렸는지도 읽어 보세요.' }))
          : '<strong style="color:var(--temp)">' + A.esc(A.t({ en: 'Not quite.', ko: '아닙니다.' })) + '</strong> ' + A.esc(A.t({ en: 'The note under your choice says what thinking leads there.', ko: '고른 선택지 아래에 어떤 생각이 그 답으로 이끄는지 적혀 있습니다.' }));
        form.querySelectorAll('.opt').forEach(lab => {
          const o = r.options[+lab.querySelector('input').value];
          const w = lab.querySelector('.why');
          w.hidden = false;
          w.innerHTML = (o.correct ? '✓ ' : '✗ ') + A.esc(A.t(o.why));
          w.style.color = o.correct ? 'var(--ink)' : 'var(--muted)';
          lab.style.borderColor = o.correct ? 'var(--ocean)' : (lab.querySelector('input').checked ? 'var(--temp)' : '');
        });
      });
      box.append(form, A.el('div', { class: 'row' }), msg);
      box.querySelector('.row').appendChild(btn);
    } else if (r.kind === 'explain') {
      box.appendChild(ta(key, { en: 'Write 2-3 sentences. Use at least one number or example from the sources.', ko: '두세 문장으로 쓰세요. 자료의 수치나 사례를 하나 이상 넣으세요.' }));
      const rev = A.el('div', { class: 'reveal', hidden: '' },
        '<p><strong>' + A.esc(A.t({ en: 'A good answer includes', ko: '좋은 답에 들어갈 요소' })) + '</strong></p>' + ul(r.points) +
        '<p><strong>' + A.esc(A.t({ en: 'Model answer', ko: '모범 답안' })) + '</strong></p><p class="note">' + A.esc(A.t(r.model)) + '</p>');
      const btn = A.el('button', { type: 'button', class: 'btn' }, A.esc(A.t({ en: 'Compare with scoring points', ko: '채점 요소와 비교하기' })));
      btn.addEventListener('click', () => { rev.hidden = !rev.hidden; });
      box.append(btn, rev);
    } else if (r.kind === 'judge') {
      box.appendChild(ta(key, { en: 'Give reasons on both sides, use numbers from the sources, then decide.', ko: '양쪽 근거를 쓰고 자료의 수치를 넣은 뒤 판단하세요.' }));
      const rev = A.el('div', { class: 'reveal', hidden: '' },
        '<div class="two"><div><p><strong>' + A.esc(A.t({ en: 'Evidence for', ko: '찬성 쪽 근거' })) + '</strong></p>' + ul(r.for) +
        '</div><div><p><strong>' + A.esc(A.t({ en: 'Evidence against', ko: '반대 쪽 근거' })) + '</strong></p>' + ul(r.against) + '</div></div>' +
        '<p><strong>' + A.esc(A.t({ en: 'Which level is your answer?', ko: '내 답은 몇 수준인가?' })) + '</strong></p>' + ul(r.levels));
      const btn = A.el('button', { type: 'button', class: 'btn' }, A.esc(A.t({ en: 'Show both sides and levels', ko: '양쪽 근거와 수준표 보기' })));
      const own = A.el('div', { style: 'display:grid;gap:.4rem;margin-top:.4rem' }, '<p><strong>' + A.esc(A.t(r.own_view)) + '</strong></p>');
      own.appendChild(ta(key + '.own', { en: 'My view: what matters more to me, and why.', ko: '내 입장: 나는 무엇을 더 중요하게 보는가, 그 까닭은?' }));
      btn.addEventListener('click', () => { rev.hidden = !rev.hidden; });
      box.append(btn, rev, own);
    }
    return box;
  }

  function render() { chips(); list(); if (cur) show(cur.id, true); }

  Promise.all([A.json('data/cards.json'), A.json('data/cities.json'), A.world('110m'), A.loadCountries()])
    .then(([cj, cities, world]) => {
      cards = cj.cards || cj;
      ctx = { cities: Object.fromEntries(cities.cities.map(c => [c.id, c])), world };
      const h = decodeURIComponent(location.hash.slice(1));
      chips(); list();
      if (h) show(h, true);
      document.getElementById('foot').innerHTML = '<p class="src">' + A.esc(A.t({
        en: A.LICENCE.en + ' "Made-up example" texts are invented for practice and name no real company.',
        ko: A.LICENCE.ko + ' "가상의 예" 글은 연습용으로 지어낸 것이며 실제 기업 이름을 쓰지 않습니다.' })) + '</p>';
    })
    .catch(e => { $card.innerHTML = '<p class="note">' + A.esc(String(e)) + '</p>'; });

  window.addEventListener('hashchange', () => { const h = decodeURIComponent(location.hash.slice(1)); if (h) show(h); });
  A.onLang(render);
})();
