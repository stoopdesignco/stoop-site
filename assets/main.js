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
      if (e.target.id === 'dash') startDash();
      io.unobserve(e.target);
    });
  }, { threshold: 0.15 }) : null;
  $$('.reveal').forEach(function (el) { io ? io.observe(el) : el.classList.add('in-view'); });
  if (!io) startDash();

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

  /* dashboard */
  $$('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      $$('.tab').forEach(function (t) { t.classList.remove('on'); t.setAttribute('aria-selected', 'false'); });
      $$('.panel').forEach(function (p) { p.classList.remove('on'); });
      tab.classList.add('on'); tab.setAttribute('aria-selected', 'true');
      $('#p-' + tab.dataset.panel).classList.add('on');
    });
  });
  var dashStarted = false;
  function startDash() {
    if (dashStarted) return; dashStarted = true;
    $$('[data-count]').forEach(function (el) {
      var end = +el.dataset.count, t0 = null, dur = reduce ? 0 : 1400;
      function f(ts) { if (!t0) t0 = ts; var p = dur ? Math.min((ts - t0) / dur, 1) : 1; el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString('en-US'); if (p < 1) requestAnimationFrame(f); }
      requestAnimationFrame(f);
    });
    var EV = [
      ['cal', 'New booking', 'Sat 10:00 AM'], ['phone', 'New call', 'from Google Maps'], ['star', '5-star review', 'from Dana M.'],
      ['doc', 'Quote request', 'Custom cake'], ['cal', 'New booking', 'Fri 2:30 PM'], ['gift', 'Gift card sold', '$50'], ['bag', 'Online order', '$54 · paid'], ['chat', 'New chat', '“Do you deliver?”'], ['phone', 'Tap-to-call', 'from homepage']
    ];
    var IC = {
      cal: '<path d="M7 3v3M17 3v3M4 8h16M5 5h14v15H5z"/>', phone: '<path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2"/>',
      star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>', doc: '<path d="M6 3h9l4 4v14H6zM9 12h7M9 16h7"/>', bag: '<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>', gift: '<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7s-2-4-4-3 0 3 4 3c4 0 6-2 4-3s-4 3-4 3"/>'
    };
    var feed = $('#feed'), k = 0, mins = [1, 3, 6, 9, 14];
    function add(fresh) {
      var e = EV[k % EV.length]; k++;
      var li2 = document.createElement('li');
      li2.innerHTML = '<span class="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C83D0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[e[0]] + '</svg></span><span><b>' + e[1] + '</b> · ' + e[2] + '</span><small>' + (fresh ? 'just now' : mins[Math.min(feed.children.length, 4)] + ' min ago') + '</small>';
      if (fresh) { $$('small', feed).forEach(function (s, i) { s.textContent = mins[Math.min(i, 4)] + ' min ago'; }); feed.insertBefore(li2, feed.firstChild); }
      else feed.appendChild(li2);
      while (feed.children.length > 5) feed.removeChild(feed.lastChild);
    }
    for (var i = 0; i < 4; i++) add(false);
    if (!reduce) setInterval(function () { add(true); }, 3600);
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
    $('#faqNum').textContent = '// 0' + (i + 1); $('#faqQ').textContent = q.textContent; $('#faqA').textContent = q.nextElementSibling.textContent;
  }
  qs.forEach(function (q, i) { q.addEventListener('click', function () { pick(i); }); });
  window.addEventListener('resize', function () { var on = qs.findIndex ? qs.findIndex(function (q) { return q.classList.contains('on'); }) : 0; pick(on < 0 ? 0 : on); });
  pick(0);
})();
