(function () {
  var PREFIX = 'roadmap:';
  var CHAPTERS = ['os', 'network', 'database', 'dsa', 'distributed', 'design'/* ext-keys:start */, 'security', 'jvm', 'performance'/* ext-keys:end */];

  // Section counts per chapter, so the index page can show totals without the
  // chapter pages having been opened first. `senior` lists the ids of
  // senior-level sections; every other section is junior-level.
  // Keep in sync with data-level in the chapter HTML (chapter pages warn in
  // the console when this drifts).
  var CHAPTER_META = {
    os: { total: 25, senior: ['ch15', 'ch20', 'ch29', 'ch36', 'ch40'] },
    network: { total: 19, senior: ['s3', 's4', 'a-http2'] },
    database: { total: 20, senior: ['ch05-2', 'ch09-3', 'ch13', 'ch16-2'] },
    dsa: { total: 11, senior: ['d04', 'd10'] },
    distributed: { total: 16, senior: ['c03', 'c06', 'c08', 'c09', 'c10', 'c12'] },
    design: { total: 13, senior: ['o12', 'o14', 'ca02', 'ca03'] },
    /* ext-meta:start */
    security: { total: 10, senior: ['sec08', 'sec09'] },
    jvm: { total: 10, senior: ['jvm02', 'jvm05'] },
    performance: { total: 10, senior: ['pf07', 'pf08'] }
    /* ext-meta:end */
  };

  function load(key) {
    try { return JSON.parse(localStorage.getItem(PREFIX + key)) || {}; } catch (e) { return {}; }
  }
  function save(key, obj) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(obj)); } catch (e) {}
  }

  var chapter = document.body.dataset.chapter;
  var root = document.documentElement;

  /* ================= theme toggle (all pages) ================= */
  var THEME_KEY = 'roadmap:theme';
  var THEMES = ['system', 'light', 'dark'];
  var THEME_LABEL = { system: '테마: 시스템', light: '테마: 라이트', dark: '테마: 다크' };
  function getTheme() {
    try { var t = localStorage.getItem(THEME_KEY); return THEMES.indexOf(t) >= 0 ? t : 'system'; } catch (e) { return 'system'; }
  }
  function applyTheme(t) {
    if (t === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', t);
    document.querySelectorAll('.theme-btn').forEach(function (b) { b.textContent = THEME_LABEL[t]; });
  }
  document.querySelectorAll('.theme-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length];
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next);
    });
  });
  applyTheme(getTheme());

  /* ================= level toggle (all pages) =================
     junior: core sections only, senior deep-dive blocks hidden.
     senior: every section plus the deep-dive blocks. */
  var LEVEL_KEY = 'roadmap:level';
  var LEVEL_LABEL = { junior: '레벨: 주니어', senior: '레벨: 시니어' };
  var level = 'junior';
  try { if (localStorage.getItem(LEVEL_KEY) === 'senior') level = 'senior'; } catch (e) {}
  var onLevelChange = function () {};

  function applyLevel() {
    root.setAttribute('data-view', level);
    document.querySelectorAll('.level-btn').forEach(function (b) {
      b.textContent = LEVEL_LABEL[level];
      b.setAttribute('aria-pressed', level === 'senior' ? 'true' : 'false');
    });
  }
  document.querySelectorAll('.tools').forEach(function (tools) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'level-btn';
    btn.title = '주니어: 핵심 장만 / 시니어: 전체 장 + 시니어 심화';
    btn.addEventListener('click', function () {
      level = level === 'junior' ? 'senior' : 'junior';
      try { localStorage.setItem(LEVEL_KEY, level); } catch (e) {}
      applyLevel();
      onLevelChange();
    });
    tools.insertBefore(btn, tools.firstChild);
  });
  applyLevel();

  /* ================= index page ================= */
  if (chapter === 'index') {
    var renderIndex = function () {
      var totalDone = 0, totalAll = 0;
      CHAPTERS.forEach(function (key) {
        var card = document.querySelector('.card[data-ch="' + key + '"]');
        var meta = CHAPTER_META[key];
        if (!card || !meta) return;
        var items = load(key).items || {};
        var total = level === 'senior' ? meta.total : meta.total - meta.senior.length;
        var done = 0;
        Object.keys(items).forEach(function (id) {
          if (!items[id]) return;
          if (level === 'junior' && meta.senior.indexOf(id) >= 0) return;
          done++;
        });
        if (done > total) done = total;
        totalDone += done; totalAll += total;
        var pct = Math.round(done / total * 100);
        var pctEl = card.querySelector('.pct');
        pctEl.textContent = '';
        var left = document.createElement('span');
        left.textContent = done ? done + ' / ' + total + ' 장 완료' : '아직 시작하지 않음 · ' + total + '장';
        var right = document.createElement('span');
        right.textContent = pct + '%';
        pctEl.appendChild(left); pctEl.appendChild(right);
        card.querySelector('.bar > span').style.width = pct + '%';
        card.classList.toggle('complete', pct === 100);
      });
      var tp = document.getElementById('totalPct');
      if (tp) {
        var p = totalAll ? Math.round(totalDone / totalAll * 100) : 0;
        tp.textContent = p + '%';
        document.getElementById('totalBar').style.width = p + '%';
        document.getElementById('totalDetail').textContent =
          '(' + totalDone + ' / ' + totalAll + ' 장 · ' + (level === 'senior' ? '시니어: 전체 장' : '주니어: 핵심 장') + ')';
      }
    };
    onLevelChange = renderIndex;
    renderIndex();

    var resetAll = document.getElementById('resetAll');
    if (resetAll) resetAll.addEventListener('click', function () {
      if (!confirm('모든 챕터의 진행 상황을 초기화할까요?')) return;
      CHAPTERS.forEach(function (k) { try { localStorage.removeItem(PREFIX + k); } catch (e) {} });
      location.reload();
    });
    return;
  }

  /* ================= chapter page ================= */
  var state = load(chapter);
  state.items = state.items || {};

  var sections = Array.prototype.slice.call(document.querySelectorAll('section[data-sec]'));
  var toc = document.getElementById('toc');
  var links = {};
  var groups = []; // { title, label, sections } per part, to hide empty parts

  function isSenior(sec) { return sec.dataset.level === 'senior'; }
  function inView(sec) { return level === 'senior' || !isSenior(sec); }

  // build TOC: walk main's children in order
  var main = document.querySelector('main');
  var group = null;
  Array.prototype.forEach.call(main.children, function (el) {
    if (el.classList.contains('part-title')) {
      var lab = document.createElement('li');
      lab.className = 'part-label';
      lab.textContent = el.textContent;
      toc.appendChild(lab);
      group = { title: el, label: lab, sections: [] };
      groups.push(group);
    } else if (el.matches('section[data-sec]')) {
      var li = document.createElement('li');
      if (isSenior(el)) li.setAttribute('data-level', 'senior');
      var a = document.createElement('a');
      a.href = '#' + el.id;
      var dot = document.createElement('span');
      dot.className = 'dot';
      var name = document.createElement('span');
      name.className = 'name';
      name.textContent = el.querySelector('h2').textContent;
      a.appendChild(dot); a.appendChild(name);
      if (isSenior(el)) {
        var lv = document.createElement('span');
        lv.className = 'lv';
        lv.textContent = '시니어';
        a.appendChild(lv);
      }
      li.appendChild(a);
      toc.appendChild(li);
      links[el.id] = a;
      if (group) group.sections.push(el);
    }
  });

  // warn when CHAPTER_META (used by the index page) drifts from the HTML
  var meta = CHAPTER_META[chapter];
  if (meta && window.console) {
    var seniorIds = sections.filter(isSenior).map(function (s) { return s.id; });
    if (meta.total !== sections.length || meta.senior.slice().sort().join() !== seniorIds.slice().sort().join()) {
      console.warn('CHAPTER_META.' + chapter + ' is out of sync with this page', { total: sections.length, senior: seniorIds });
    }
  }

  function render() {
    var done = 0, total = 0;
    sections.forEach(function (sec) {
      var ok = !!state.items[sec.id];
      if (inView(sec)) { total++; if (ok) done++; }
      sec.classList.toggle('done', ok);
      var box = sec.querySelector('label.done input');
      if (box) box.checked = ok;
      if (links[sec.id]) links[sec.id].classList.toggle('done', ok);
    });
    // a part whose sections are all senior-level disappears in the junior view
    groups.forEach(function (g) {
      var empty = !g.sections.some(inView);
      g.title.hidden = empty;
      g.label.hidden = empty;
    });
    save(chapter, { items: state.items });
    var pct = total ? Math.round(done / total * 100) : 0;
    document.getElementById('pct').textContent = pct + '% (' + done + '/' + total + '장)';
    document.getElementById('bar').style.width = pct + '%';
  }
  onLevelChange = render;

  sections.forEach(function (sec) {
    var box = sec.querySelector('label.done input');
    if (!box) return;
    box.addEventListener('change', function () {
      state.items[sec.id] = box.checked;
      render();
    });
  });

  // active TOC item on scroll
  if ('IntersectionObserver' in window) {
    var current = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          if (current && links[current]) links[current].classList.remove('active');
          current = en.target.id;
          if (links[current]) links[current].classList.add('active');
        }
      });
    }, { rootMargin: '-10% 0px -80% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  // tools
  document.querySelectorAll('[data-act]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var act = btn.dataset.act;
      if (act === 'open') document.querySelectorAll('details.answer').forEach(function (d) { d.open = true; });
      if (act === 'close') document.querySelectorAll('details.answer').forEach(function (d) { d.open = false; });
      if (act === 'reset') {
        if (!confirm('이 챕터의 진행 상황을 초기화할까요?')) return;
        state.items = {};
        render();
      }
    });
  });

  // a link straight to a senior-level section should not land on a hidden one
  var target = location.hash && document.getElementById(location.hash.slice(1));
  if (target && target.matches('section[data-sec]') && !inView(target)) {
    level = 'senior';
    try { localStorage.setItem(LEVEL_KEY, level); } catch (e) {}
    applyLevel();
  }

  render();
  if (target && target.matches('section[data-sec]')) target.scrollIntoView();
})();
