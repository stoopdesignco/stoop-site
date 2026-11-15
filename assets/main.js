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
      var scr = demo.parentNode, s = scr.clientWidth / 390;
      demo.style.transform = 'scale(' + s + ')';
      demo.style.height = (scr.clientHeight / s) + 'px';
    };
    fitDemo(); window.addEventListener('resize', fitDemo);
    var loadDemo = function () { if (demo.src) return; demo.src = demo.dataset.src; demo.addEventListener('load', function () { $('#dashLoad').classList.add('gone'); }); };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { loadDemo(); o.disconnect(); } }, { rootMargin: '400px 0px' }).observe(demo);
    else loadDemo();
  }

  /* compare */
  var years = $('#years');
  function cmp() {
    var y = +years.value;
    var h = +$('#hrs').value, rate = 89;
    var a = 6500 + (100 + h * rate) * 12 * y, s = 199 * 12 * y, max = 6500 + (100 + 6 * rate) * 12 * 5;
    $('#yearsOut').textContent = y + (y === 1 ? ' year' : ' years');
    $('#hrsOut').textContent = h + (h === 1 ? ' hr/month' : ' hrs/month');
    $('#vAgency').textContent = money(a); $('#vStoop').textContent = money(s);
    $('#bAgency').style.width = (a / max * 100) + '%'; $('#bStoop').style.width = Math.max(s / max * 100, 2) + '%';
    var d = a - s;
    $('#vSave').textContent = money(Math.abs(d));
    $('#save').classList.toggle('neg', d < 0);
    $('#save').firstElementChild.textContent = d >= 0 ? 'You keep' : 'Agency is cheaper by';
    $('#saveNote').textContent = d >= 0 ? 'with STOOP over ' + $('#yearsOut').textContent + ', plus a dashboard and tools' : 'at this setting';
  }
  years.addEventListener('input', cmp); $('#hrs').addEventListener('input', cmp); cmp();
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
