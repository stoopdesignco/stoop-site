/* STOOP tool library page */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* header */
  var header = $('.site-header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var menuBtn = $('#menuBtn');
  menuBtn.addEventListener('click', function () { var o = header.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', o ? 'true' : 'false'); });
  $$('.main-nav a, .hdr-cta a').forEach(function (a) { a.addEventListener('click', function () { header.classList.remove('open'); }); });

  var ST = window.STOOPTools, T = ST.TOOLS;
  var I = function (d) { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var LIB = {
    booking: { cat: 'book', short: 'Bookings and deposits on your site', icon: I('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
      best: ['Salons and spas', 'Massage and wellness', 'Guides and tours', 'Consultants'],
      flow: [['Pick', 'Customer picks a service, day and time'], ['Pay', 'They pay a deposit through Stripe'], ['Show up', 'Confirmation now, reminder text the day before']] },
    quote: { cat: 'book', short: 'Customers price the job themselves', icon: I('<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h2M13.5 12h2M8.5 16h2M13.5 16h2"/>'),
      best: ['Cleaning', 'Landscaping', 'Painting', 'Moving and hauling'],
      flow: [['Build', 'Customer sets size, extras and how often'], ['Price', 'They see an instant estimate'], ['Request', 'It lands in your dashboard as a lead']] },
    store: { cat: 'sell', short: 'Sell products with Stripe checkout', icon: I('<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
      best: ['Makers and crafters', 'Bakeries', 'Boutiques', 'Local brands'],
      flow: [['Shop', 'Customer adds products to the cart'], ['Pay', 'Checks out by card through Stripe'], ['Get paid', 'You get the order, Stripe pays your bank']] },
    gift: { cat: 'sell', short: 'Digital gift cards, sent by email', icon: I('<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8c-1.5-3-5-3-5-1s3 1 5 1zM12 8c1.5-3 5-3 5-1s-3 1-5 1z"/>'),
      best: ['Salons and spas', 'Restaurants', 'Studios and classes', 'Experiences'],
      flow: [['Choose', 'Buyer picks an amount and writes a note'], ['Pay', 'They pay through Stripe'], ['Send', 'The card arrives by email, balance tracked']] },
    chat: { cat: 'talk', short: 'Customers message you, you reply by phone', icon: I('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>'),
      best: ['Restaurants and cafés', 'Retail shops', 'Home services', 'Any business that gets questions'],
      flow: [['Ask', 'Customer asks a question on your site'], ['Alert', 'You get a text right away'], ['Reply', 'Answer from your phone, it shows on your site']] },
    text: { cat: 'talk', short: 'Your private line to your designer', icon: I('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>'),
      best: ['Every monthly client'],
      flow: [['Text', 'You text your designer a change'], ['Track', 'Watch it go from received to live'], ['Done', 'Small edits live within 2 business days']] },
    reviews: { cat: 'trust', short: 'Your best Google reviews, always fresh', icon: I('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
      best: ['Every local business'],
      flow: [['Pull', 'Your newest Google reviews come in on their own'], ['Show', 'Rating and reviews where trust matters'], ['Grow', 'Happy customers get a link to leave one']] },
    conditions: { cat: 'trust', short: 'Live weather, water or trail status', icon: I('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
      best: ['Outdoor tours', 'Fishing and rafting', 'Bike and ski shops', 'Golf courses'],
      flow: [['Pull', 'Live weather or conditions update on their own'], ['Nudge', 'A “great day to go” note when it is'], ['Book', 'Right next to your booking button']] }
  };
  var CATS = [['all', 'All tools'], ['book', 'Get booked'], ['sell', 'Sell online'], ['talk', 'Talk'], ['trust', 'Build trust']];
  var CATNAME = { book: 'Get booked', sell: 'Sell online', talk: 'Talk', trust: 'Build trust' };
  var ORDER = ['booking', 'quote', 'store', 'gift', 'chat', 'text', 'reviews', 'conditions'];
  var cat = 'all', cur = null;

  $('#libFilter').innerHTML = '<i class="lib-pill" aria-hidden="true"></i>' + CATS.map(function (c, i) { return '<button role="tab" data-c="' + c[0] + '"' + (i === 0 ? ' class="on" aria-selected="true"' : ' aria-selected="false"') + '>' + c[1] + '</button>'; }).join('');
  function slide(box, el, pill) {
    if (!el || !pill) return;
    pill.style.width = el.offsetWidth + 'px'; pill.style.height = el.offsetHeight + 'px';
    pill.style.transform = 'translate(' + el.offsetLeft + 'px,' + el.offsetTop + 'px)';
  }
  function slideAll() { slide($('#libFilter'), $('#libFilter button.on'), $('.lib-pill')); slide($('#libList'), $('.lib-item.on'), $('.lib-hl')); }
  window.addEventListener('resize', slideAll);
  function list() {
    $('#libList').innerHTML = '<i class="lib-hl" aria-hidden="true"></i>' + ORDER.filter(function (k) { return cat === 'all' || LIB[k].cat === cat; }).map(function (k, n) {
      return '<a href="#' + k + '" data-k="' + k + '" style="animation-delay:' + (n * 40) + 'ms" class="lib-item' + (k === cur ? ' on' : '') + '"><span class="lib-ic">' + LIB[k].icon + '</span><span><b>' + T[k].title + '</b><small>' + LIB[k].short + '</small></span></a>';
    }).join('');
  }
  function planLine(k) { return k === 'text' ? 'Included with every monthly plan.' : 'Add it as your tool on Essentials, or choose up to 3 on Growth.'; }
  var swapT;
  function show(k, scroll) {
    if (!T[k]) k = ORDER[0];
    var det = $('#libDetail');
    $$('.lib-item').forEach(function (a) { a.classList.toggle('on', a.dataset.k === k); });
    slideAll();
    if (cur && cur !== k && !reduce) {
      det.classList.add('leaving'); clearTimeout(swapT);
      swapT = setTimeout(function () { render(k, scroll); det.classList.remove('leaving'); det.classList.remove('entering'); void det.offsetWidth; det.classList.add('entering'); }, 170);
    } else render(k, scroll);
  }
  function render(k, scroll) {
    cur = k; var t = T[k], L = LIB[k], i = ORDER.indexOf(k);
    var prev = ORDER[(i + ORDER.length - 1) % ORDER.length], next = ORDER[(i + 1) % ORDER.length];
    $('#libDetail').innerHTML =
      '<div class="ld-head"><span class="lib-ic big">' + L.icon + '</span><div><span class="ld-cat">' + CATNAME[L.cat] + '</span><h2>' + t.title + '</h2></div><span class="ld-n mono">' + String(i + 1).padStart(2, '0') + ' / 0' + ORDER.length + '</span></div>' +
      '<div class="ld-grid"><div class="ld-demo"><span class="ld-label">TRY IT LIVE · SAMPLE CLIENT SITE</span><div id="libDemo" class="ld-demo-in"></div></div>' +
      '<div class="ld-info dlg-info">' + ST.info(t, { noTitle: true, chips: true }) + '</div></div>' +
      '<div class="ld-flow"><span class="dlg-sub">HOW IT WORKS FOR YOUR CUSTOMERS</span><ol>' + L.flow.map(function (f, j) { return '<li><span class="ld-step">' + (j + 1) + '</span><b>' + f[0] + '</b><span>' + f[1] + '</span></li>'; }).join('') + '</ol></div>' +
      '<div class="ld-row"><div class="ld-card"><span class="dlg-sub">GREAT FOR</span><div class="apps-line">' + L.best.map(function (b) { return '<span>' + b + '</span>'; }).join('') + '</div></div>' +
      '<div class="ld-card ld-plan"><span class="dlg-sub">ON YOUR PLAN</span><p>' + planLine(k) + '</p><a href="index.html#plans">Compare plans ' + ST.ARW + '</a></div></div>' +
      '<div class="ld-nav"><button class="ld-pn" data-k="' + prev + '">← ' + T[prev].title + '</button><a href="get-started.html" class="btn btn-primary">' + t.cta + ' ' + ST.ARW + '</a><button class="ld-pn" data-k="' + next + '">' + T[next].title + ' →</button></div>';
    ST.mount($('#libDemo'), k, { cta: false });
    $$('.lib-item').forEach(function (a) { a.classList.toggle('on', a.dataset.k === k); });
    var on = $('.lib-item.on'), ll = $('#libList');
    if (on && window.innerWidth <= 900) ll.scrollTo({ left: on.offsetLeft - (ll.clientWidth - on.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', '#' + k);
    if (scroll) { var y = $('#libDetail').getBoundingClientRect().top + window.scrollY - (window.innerWidth <= 900 ? 150 : 100); if (window.scrollY > y || window.innerWidth <= 900) window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); }
  }
  $('#libFilter').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    cat = b.dataset.c;
    $$('#libFilter button').forEach(function (x) { var o = x === b; x.classList.toggle('on', o); x.setAttribute('aria-selected', o ? 'true' : 'false'); });
    var fb = $('#libFilter');
    if (window.innerWidth <= 900) fb.scrollTo({ left: b.offsetLeft - (fb.clientWidth - b.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    list(); slideAll();
    var first = $('.lib-item'); if (first && (cat !== 'all' && LIB[cur].cat !== cat)) show(first.dataset.k, false);
  });
  $('#libList').addEventListener('click', function (e) { var a = e.target.closest('.lib-item'); if (!a) return; e.preventDefault(); show(a.dataset.k, true); });
  $('#libDetail').addEventListener('click', function (e) { var b = e.target.closest('.ld-pn'); if (!b) return; show(b.dataset.k, true); });
  window.addEventListener('hashchange', function () { var k = location.hash.slice(1); if (T[k] && k !== cur) show(k, true); });
  list();
  show(location.hash.slice(1) || ORDER[0], false);
  slideAll(); setTimeout(slideAll, 300);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(slideAll);
})();
