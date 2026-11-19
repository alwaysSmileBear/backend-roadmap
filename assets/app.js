(function () {
  var PREFIX = 'roadmap:';
  var CHAPTERS = ['os', 'network', 'database', 'dsa', 'distributed', 'design'];

  function load(key) {
    try { return JSON.parse(localStorage.getItem(PREFIX + key)) || {}; } catch (e) { return {}; }
  }
  function save(key, obj) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(obj)); } catch (e) {}
  }

  var chapter = document.body.dataset.chapter;

  /* ================= theme toggle (all pages) ================= */
  var THEME_KEY = 'roadmap:theme';
  var THEMES = ['system', 'light', 'dark'];
  var THEME_LABEL = { system: '테마: 시스템', light: '테마: 라이트', dark: '테마: 다크' };
  function getTheme() {
    try { var t = localStorage.getItem(THEME_KEY); return THEMES.indexOf(t) >= 0 ? t : 'system'; } catch (e) { return 'system'; }
  }
  function applyTheme(t) {
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
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

  /* ================= index page ================= */
  if (chapter === 'index') {
    var totalDone = 0, totalAll = 0;
    CHAPTERS.forEach(function (key) {
      var card = document.querySelector('.card[data-ch="' + key + '"]');
      if (!card) return;
      var st = load(key);
      var done = st.done || 0, total = st.total || 0;
      totalDone += done; totalAll += total;
      var pctEl = card.querySelector('.pct');
      var bar = card.querySelector('.bar > span');
      if (!total) {
        pctEl.innerHTML = '<span>아직 시작하지 않음</span><span>0%</span>';
        bar.style.width = '0';
      } else {
        var pct = Math.round(done / total * 100);
        pctEl.innerHTML = '<span>' + done + ' / ' + total + ' 장 완료</span><span>' + pct + '%</span>';
        bar.style.width = pct + '%';
        card.classList.toggle('complete', pct === 100);
      }
    });
    var tp = document.getElementById('totalPct');
    if (tp) {
      var p = totalAll ? Math.round(totalDone / totalAll * 100) : 0;
      tp.textContent = p + '%';
      document.getElementById('totalBar').style.width = p + '%';
      document.getElementById('totalDetail').textContent =
        totalAll ? '(' + totalDone + ' / ' + totalAll + ' 장)' : '(챕터 페이지를 한 번씩 열면 전체 장 수가 집계돼요)';
    }
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

  // build TOC: walk main's children in order
  var main = document.querySelector('main');
  Array.prototype.forEach.call(main.children, function (el) {
    if (el.classList.contains('part-title')) {
      var lab = document.createElement('li');
      lab.className = 'part-label';
      lab.textContent = el.textContent;
      toc.appendChild(lab);
    } else if (el.matches('section[data-sec]')) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + el.id;
      a.innerHTML = '<span class="dot"></span><span>' + el.querySelector('h2').textContent + '</span>';
      li.appendChild(a);
      toc.appendChild(li);
      links[el.id] = a;
    }
  });

  function render() {
    var done = 0;
    sections.forEach(function (sec) {
      var ok = !!state.items[sec.id];
      if (ok) done++;
      sec.classList.toggle('done', ok);
      var box = sec.querySelector('label.done input');
      if (box) box.checked = ok;
      if (links[sec.id]) links[sec.id].classList.toggle('done', ok);
    });
    state.done = done;
    state.total = sections.length;
    save(chapter, state);
    var pct = sections.length ? Math.round(done / sections.length * 100) : 0;
    document.getElementById('pct').textContent = pct + '% (' + done + '/' + sections.length + '장)';
    document.getElementById('bar').style.width = pct + '%';
  }

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

  render();
})();
