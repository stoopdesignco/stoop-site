(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  /* header */
  var header = $('.site-header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var menuBtn = $('#menuBtn');
  menuBtn.addEventListener('click', function () {
    var open = header.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  $$('.main-nav a, .hdr-cta a').forEach(function (a) { a.addEventListener('click', function () { header.classList.remove('open'); }); });

  /* reveal + in-view */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in-view');
      io.unobserve(e.target);
    });
  }, { threshold: 0.15 }) : null;
  $$('.reveal').forEach(function (el) { io ? io.observe(el) : el.classList.add('in-view'); });

  /* carousel: progress bar + drag to scroll */
  var car = $('#carTrack'), bar = $('#carBar');
  function prog() {
    var max = car.scrollWidth - car.clientWidth, vis = car.clientWidth / car.scrollWidth;
    bar.style.width = (vis * 100) + '%';
    bar.style.transform = 'translateX(' + (max > 0 ? (car.scrollLeft / max) * ((1 - vis) / vis) * 100 : 0) + '%)';
    car.classList.toggle('at-end', car.scrollLeft >= max - 4);
  }
  car.addEventListener('scroll', prog, { passive: true }); window.addEventListener('resize', prog); prog();
  var hint = $('.car-hint');
  if (hint) hint.addEventListener('click', function () { car.scrollBy({ left: car.querySelector('.tool-card').offsetWidth + 20, behavior: reduce ? 'auto' : 'smooth' }); });
  var drag = null, moved = false;
  car.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    drag = { x: e.clientX, left: car.scrollLeft }; moved = false;
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (Math.abs(dx) > 5) { moved = true; car.classList.add('dragging'); }
    if (moved) car.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', function () {
    if (!drag) return; drag = null;
    setTimeout(function () { car.classList.remove('dragging'); }, 0);
  });
  car.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

  /* tool pop-ups (demos live in tools.js) */
  var ST = window.STOOPTools;
  var dlg = $('#toolDialog');
  $$('.tool-card').forEach(function (card) {
    card.addEventListener('click', function () {
      var t = ST && ST.TOOLS[card.dataset.tool]; if (!t) return;
      $('#dlgBody').innerHTML = '<div class="dlg-demo" id="dlgDemo"></div><div class="dlg-info">' + ST.info(t) + '<a class="lib-link" href="tools.html#' + card.dataset.tool + '">See the full breakdown in the tool library ' + ST.ARW + '</a></div>';
      ST.mount($('#dlgDemo'), card.dataset.tool);
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      $('#dlgBody').scrollTop = 0;
    });
  });
  function closeDlg() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  $('#dlgClose').addEventListener('click', closeDlg);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDlg(); });
  dlg.addEventListener('close', function () { if (!dlg.open) $('#dlgBody').innerHTML = ''; });

  /* dashboard: the real app, loaded when the section comes near */
  var demo = $('#dashDemo');
  if (demo) {
    var fitDemo = function () {
      var scr = demo.parentNode, lw = matchMedia('(min-width: 901px)').matches ? 1200 : 390, s = scr.clientWidth / lw;
      demo.style.width = lw + 'px';
      demo.style.transform = 'scale(' + s + ')';
      demo.style.height = (scr.clientHeight / s) + 'px';
    };
    fitDemo(); window.addEventListener('resize', fitDemo);
    var loadDemo = function () { if (demo.src) return; demo.src = demo.dataset.src; demo.addEventListener('load', function () { $('#dashLoad').classList.add('gone'); }); };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { loadDemo(); o.disconnect(); } }, { rootMargin: '400px 0px' }).observe(demo);
    else loadDemo();
  }

  /* to your doorstep: each card plays its moment, then the link to the next card fills */
  var jr = $('#journey');
  if (jr) {
    var tiles = [].slice.call(jr.querySelectorAll('.jr')), links = [].slice.call(jr.querySelectorAll('.jr-link'));
    var typeEl = jr.querySelector('.sf-type'), word = typeEl.dataset.text, timers = [], running = false;
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
    var reset = function () {
      tiles.forEach(function (t) { t.classList.remove('lit', 'play', 'done'); });
      links.forEach(function (l) { l.classList.add('snap'); l.classList.remove('go'); void l.offsetWidth; l.classList.remove('snap'); });
      typeEl.textContent = '';
    };
    var arrive = function (i) {
      tiles.forEach(function (t, j) { t.classList.toggle('lit', j === i); if (j < i) t.classList.add('done'); });
      tiles[i].classList.add('play');
      if (i === 0) for (var c = 1; c <= word.length; c++) (function (n) { later(function () { typeEl.textContent = word.slice(0, n); }, 150 + n * 55); })(c);
    };
    var STEP = 2300;
    var run = function () {
      if (!running) return; reset();
      later(function () { arrive(0); }, 250);
      [1, 2, 3].forEach(function (i) {
        later(function () { links[i - 1].classList.add('go'); }, 250 + i * STEP - 750);
        later(function () { arrive(i); }, 250 + i * STEP);
      });
      later(function () { tiles[3].classList.add('done'); tiles[3].classList.remove('lit'); }, 250 + 3 * STEP + 2400);
      later(run, 250 + 3 * STEP + 3600);
    };
    var stop = function () { running = false; timers.forEach(clearTimeout); timers = []; };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      jr.classList.add('static'); typeEl.textContent = word; tiles.forEach(function (t) { t.classList.add('play'); }); links.forEach(function (l) { l.classList.add('go'); });
    } else new IntersectionObserver(function (es) { if (es[0].isIntersecting) { if (!running) { running = true; run(); } } else stop(); }, { threshold: .3 }).observe(jr);
  }

  /* compare: a story that builds once when it comes into view */
  var story = $('#story');
  if (story) {
    var steps = story.querySelectorAll('.st-steps li'), segs = ['.sg1', '.sg2', '.sg3', '.sgS'];
    var tot = function (el, to, ms) {
      var s0 = performance.now(), from = +(el.dataset.v || 0); el.dataset.v = to;
      (function t(n) { var p = Math.min(1, (n - s0) / ms); el.textContent = money(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(t); })(s0);
    };
    var play = function () {
      if (story.classList.contains('played')) return; story.classList.add('played');
      var A = [6500, 7700, 9836], T = 1250;
      [0, 1, 2, 3].forEach(function (i) {
        setTimeout(function () {
          steps.forEach(function (li, j) { li.classList.toggle('now', j === i); if (j <= i) li.classList.add('on'); });
          story.querySelector(segs[i]).classList.add('on');
          if (i < 3) tot($('#stA'), A[i], 900); else tot($('#stS'), 2388, 900);
        }, 300 + i * T);
      });
      setTimeout(function () {
        steps.forEach(function (li) { li.classList.remove('now'); });
        story.querySelector('.sgK').classList.add('on'); $('#stSave').classList.add('on'); tot($('#stK'), 7448, 1100);
      }, 300 + 4 * T);
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { story.classList.add('instant'); play(); }
    else new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { play(); o.disconnect(); } }, { threshold: .35 }).observe(story);
  }

  var bf = $('#buyFaq');
  if (bf) bf.addEventListener('click', function () { var i = $$('.faq-q').findIndex(function (q) { return /buy out/i.test(q.textContent); }); if (i > -1) setTimeout(function () { $$('.faq-q')[i].click(); }, 400); });

  /* plans switcher (mobile) */
  var pt = $('#plansTrack'), psw = $$('.plan-switch button');
  if (pt && psw.length) {
    var cards = $$('.plan', pt);
    psw.forEach(function (b, i) { b.addEventListener('click', function () { pt.scrollTo({ left: cards[i].offsetLeft - pt.offsetLeft - 20, behavior: reduce ? 'auto' : 'smooth' }); }); });
    pt.addEventListener('scroll', function () {
      var mid = pt.scrollLeft + pt.clientWidth / 2, best = 0;
      cards.forEach(function (c, i) { if (c.offsetLeft - pt.offsetLeft <= mid) best = i; });
      psw.forEach(function (b, i) { b.classList.toggle('on', i === best); });
    }, { passive: true });
  }

  /* faq */
  var qs = $$('.faq-q'), fill = $('#faqFill');
  function pick(i) {
    qs.forEach(function (q, j) { q.classList.toggle('on', j === i); q.setAttribute('aria-expanded', j === i ? 'true' : 'false'); });
    var q = qs[i], list = $('#faqList');
    fill.style.height = Math.max(0, q.offsetTop + q.offsetHeight / 2 - 22) + 'px';
    var sw = $('#faqSwap'); sw.classList.remove('swap'); void sw.offsetWidth; sw.classList.add('swap');
    $('#faqNum').textContent = String(i + 1).padStart(2, '0'); $('#faqQ').textContent = q.textContent; $('#faqA').textContent = q.nextElementSibling.textContent;
  }
  qs.forEach(function (q, i) { q.addEventListener('click', function () { pick(i); }); });
  window.addEventListener('resize', function () { var on = qs.findIndex ? qs.findIndex(function (q) { return q.classList.contains('on'); }) : 0; pick(on < 0 ? 0 : on); });
  pick(0);
})();
