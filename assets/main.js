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

  /* ---------- tool demos (each one runs inside a sample client site) ---------- */
  var ARW = '<svg width="16" height="16" aria-hidden="true"><use href="#arrow"/></svg>';
  var CHK = '<svg width="26" height="26" aria-hidden="true"><use href="#check"/></svg>';
  var DASH = function (t) { return '<span class="to-dash">● ' + t + '</span>'; };
  function site(name, url, nav, color) {
    return '<div class="site" id="site" style="--b:' + color + '"><div class="site-bar"><i></i><i></i><i></i><span>' + url + '</span></div>' +
      '<div class="site-nav"><b>' + name + '</b><nav>' + nav.map(function (n) { return '<span>' + n + '</span>'; }).join('') + '</nav></div>' +
      '<div class="site-body" id="sb"></div></div>';
  }
  function pickOne(box, sel, cls) { $$(sel, box).forEach(function (x) { x.classList.remove(cls || 'sel'); }); }
  function wait(btn, label, ms, cb) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> ' + label; setTimeout(cb, reduce ? 0 : ms); }

  var TOOLS = {
    text: {
      title: 'Text your designer', cta: 'Get a designer on call', color: '#B5452A', custom: false,
      site: ['Rosa’s Bakery', 'rosasbakery.com', ['Menu', 'Order', 'Visit']],
      lede: 'Need a change? Text your STOOP designer. A real person makes it, and you track it in your dashboard. These texts are just between you and us. Customers never see them.',
      does: ['Text, email or use your dashboard to reach your designer', 'Track every request from received to live', 'Small edits live within 2 business days', 'Photos, hours, menus, prices, even new pages'],
      replaces: ['logging into a site builder', 'paying per change', 'waiting on support tickets'],
      apps: ['Wix', 'Squarespace', 'WordPress', 'Agency tickets'],
      demo: function (sb, ext) {
        sb.style.minHeight = '0';
        sb.innerHTML = '<div class="fgrid"><div class="sum" id="tHours"><b style="font-family:var(--hf)">Hours</b><div><span>Mon–Fri</span>7 AM–3 PM</div><div><span>Saturday</span><b id="tSat">8 AM–1 PM</b></div></div>' +
          '<div class="sum" id="tSpec"><b style="font-family:var(--hf)">Today’s special</b><div style="display:block" id="tSpecTxt">Cinnamon twists</div><span class="hint">Fresh at 7 AM</span></div></div>' +
          '<span class="hint">Your live site. Watch it update when your designer finishes.</span>';
        ext.innerHTML = '<div class="phone"><div class="phone-top"><span class="av">S</span><div><b>Your STOOP designer</b><small>Private · just you and us</small></div><span class="status st-new" id="tSt">Waiting</span></div>' +
          '<div class="thread" id="tThread"><span class="hint" style="margin:auto">Pick a text below to send, as the owner</span></div>' +
          '<div class="qpick" id="tPick"><button data-k="sat">“Saturday hours are now 8 to 2”</button><button data-k="spec">“New special: pumpkin loaf”</button></div></div>';
        var MSG = { sat: ['Saturday hours are now 8 to 2', function () { $('#tSat').textContent = '8 AM–2 PM'; return '#tHours'; }],
          spec: ['New special: pumpkin loaf', function () { $('#tSpecTxt').textContent = 'Pumpkin loaf'; return '#tSpec'; }] };
        $('#tPick').addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b || b.disabled) return;
          $$('#tPick button').forEach(function (x) { x.disabled = true; });
          var m = MSG[b.dataset.k], th = $('#tThread'), st = $('#tSt');
          if (th.querySelector('.hint')) th.innerHTML = '';
          th.insertAdjacentHTML('beforeend', '<div class="bubble b-me">' + m[0] + '</div>');
          var steps = [[700, function () { th.insertAdjacentHTML('beforeend', '<div class="bubble b-us">Got it, Rosa! Working on it now.</div>'); st.className = 'status st-new'; st.textContent = 'Received'; }],
            [1700, function () { st.className = 'status st-prog'; st.textContent = 'In progress'; }],
            [2900, function () { var el = $(m[1]()); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); st.className = 'status st-live'; st.textContent = 'Live'; th.insertAdjacentHTML('beforeend', '<div class="bubble b-us">Done. It’s live on your site ✓</div>'); }],
            [3300, function () { $$('#tPick button').forEach(function (x) { x.disabled = false; }); }]];
          steps.forEach(function (s) { setTimeout(function () { if (document.getElementById('tThread')) s[1](); }, reduce ? 0 : s[0]); });
        });
      }
    },

    store: {
      title: 'Online store', cta: 'Start selling online', color: '#B06A2C',
      site: ['Desert Bloom Candles', 'desertbloomcandles.com', ['Shop', 'About', 'Cart']],
      lede: 'Sell your products right from your site. Customers check out in seconds, and Stripe sends the money to your bank.',
      does: ['Products, photos, prices and stock you can change by text', 'Secure checkout and card payments through Stripe', 'Order alerts and receipts sent on their own', 'Every order and payout tracked in your dashboard'],
      replaces: ['monthly store-builder plans', 'selling only through marketplaces', 'Venmo requests and invoices by hand'],
      apps: ['Shopify', 'Square Online', 'Etsy', 'WooCommerce'],
      demo: function (sb) {
        var FL = '<path d="M12 2.5c1.4 1.9 1.4 3.3 0 4.3-1.4-1-1.4-2.4 0-4.3z"/>';
        var P = [['Juniper & Sage', 18, 'Pillar candle', FL + '<path d="M12 7v2"/><rect x="8" y="9" width="8" height="12.5" rx="1.5"/>'],
          ['Desert Rain', 22, '8 oz jar', FL + '<path d="M12 7v2.5"/><path d="M6.5 11h11v8.5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z"/><path d="M7.5 11V9.5h9V11"/>'],
          ['Canyon Ember', 24, 'Travel tin', FL + '<path d="M12 7v3"/><ellipse cx="12" cy="13" rx="7.5" ry="2.2"/><path d="M4.5 13v4.5c0 1.2 3.4 2.2 7.5 2.2s7.5-1 7.5-2.2V13"/>'],
          ['Prickly Pear', 18, 'Votive trio', '<path d="M5.5 8.5c.9 1.2.9 2 0 2.6-.9-.6-.9-1.4 0-2.6zM12 5.5c.9 1.2.9 2 0 2.6-.9-.6-.9-1.4 0-2.6zM18.5 8.5c.9 1.2.9 2 0 2.6-.9-.6-.9-1.4 0-2.6z"/><rect x="3" y="12.5" width="5" height="8.5" rx="1"/><rect x="9.5" y="9.5" width="5" height="11.5" rx="1"/><rect x="16" y="12.5" width="5" height="8.5" rx="1"/>']];
        var cart = {};
        function count() { var n = 0; for (var k in cart) n += cart[k]; return n; }
        function total() { var t = 0; for (var k in cart) t += cart[k] * P[k][1]; return t; }
        function shop() {
          var n = count();
          sb.innerHTML = '<div class="view"><div class="bk-head"><h5>Hand-poured in Arizona</h5><button class="sbtn ghost" id="sCart" style="height:36px;padding:0 12px">🛒 Cart · ' + n + '</button></div>' +
            '<div class="prods">' + P.map(function (p, i) { return '<div class="prod"><div class="pimg"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p[3] + '</svg></div><b>' + p[0] + '</b><span class="hint">' + p[2] + ' · $' + p[1] + '</span><button class="sbtn" data-p="' + i + '" style="height:34px;font-size:13px">' + (cart[i] ? 'Added ×' + cart[i] : 'Add to cart') + '</button></div>'; }).join('') + '</div>' +
            '<button class="sbtn" id="sCheck"' + (n ? '' : ' disabled') + '>Check out' + (n ? ' · $' + total() : '') + ' ' + ARW + '</button></div>';
        }
        function checkout() {
          var rows = ''; for (var k in cart) rows += '<div><span>' + P[k][0] + ' ×' + cart[k] + '</span>$' + (cart[k] * P[k][1]) + '</div>';
          sb.innerHTML = '<div class="view"><div class="bk-head"><h5>Checkout</h5><button class="bk-back" id="sBack">← Keep shopping</button></div><div class="sum">' + rows + '<div><span>Shipping</span>$6</div><div style="border-top:1px solid #ECE7E1;padding-top:7px"><span>Total</span><b>$' + (total() + 6) + '</b></div></div>' +
            '<div class="fgrid"><label class="fld">Name<input value="Dana Morales"></label><label class="fld">Email<input value="dana.m@email.com"></label><label class="fld full">Ship to<input value="214 Juniper Ln, Flagstaff, AZ"></label></div>' +
            '<div class="paybox"><span>💳 •••• 4242 &nbsp;12/28</span><small>Secured by Stripe</small></div><button class="sbtn" id="sPay">Pay $' + (total() + 6) + '</button></div>';
        }
        sb.addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b || b.disabled) return;
          if (b.dataset.p) { cart[b.dataset.p] = (cart[b.dataset.p] || 0) + 1; return shop(); }
          if (b.id === 'sCheck' || b.id === 'sCart') { if (count()) checkout(); return; }
          if (b.id === 'sBack') return shop();
          if (b.id === 'sPay') { var t = total() + 6; return wait(b, 'Processing…', 1100, function () { if (!document.getElementById('sb')) return; sb.innerHTML = '<div class="done"><span class="done-ic">' + CHK + '</span><h5>Order #2081 confirmed</h5><span class="hint">Thanks, Dana! Your receipt was sent to dana.m@email.com</span><div class="sum" style="width:100%;text-align:left"><div><span>Paid with Stripe</span><b>$' + t + '</b></div><div><span>Payout to Desert Bloom’s bank</span>2 business days</div></div>' + DASH('New order in Desert Bloom’s dashboard') + '<button class="sbtn ghost" id="sAgain">Shop again</button></div>'; }); }
          if (b.id === 'sAgain') { cart = {}; shop(); }
        });
        shop();
      }
    },

    chat: {
      title: 'Customer chat', cta: 'Start chatting with customers', color: '#2F6B4F',
      site: ['Front Street Bakery', 'frontstreetbakery.com', ['Menu', 'Order', 'Visit']],
      lede: 'A chat bubble on your site so customers can ask questions any time. You get a text and reply from your phone or dashboard.',
      does: ['Customers message you right from your site', 'Instant alert by text, reply from your phone', 'Every conversation saved in your dashboard', 'Auto-reply with your hours when you’re closed'],
      replaces: ['missed calls with no follow-up', 'contact forms that go nowhere', 'paid chat widget subscriptions'],
      apps: ['Tidio', 'Intercom', 'LiveChat', 'Messenger'],
      demo: function (sb, ext) {
        var Q = [['Do you have gluten-free options?', 'Yes! Gluten-free loaves and muffins every Saturday. Want us to hold some for you?'], ['Can I order a cake for this Saturday?', 'We can! Tell us the size and flavor, and we’ll have it ready by 10 AM.']];
        sb.innerHTML = '<div class="view"><h5>Fresh bread, every morning</h5><span class="hint">Open 6 AM–2 PM · 412 Front St.</span>' +
          '<div class="chatw"><div class="chatw-top"><span class="av">FS</span><div><b>Front Street Bakery</b><small>Usually replies in minutes</small></div></div><div class="thread" id="cThread"><div class="bubble b-us">Hi! How can we help? 👋</div></div>' +
          '<div class="qpick" id="cPick">' + Q.map(function (q, i) { return '<button data-i="' + i + '">' + q[0] + '</button>'; }).join('') + '</div></div></div>';
        ext.innerHTML = '<div class="phone"><div class="phone-top"><span class="av">📱</span><div><b>Owner’s phone</b><small>Alerts from your site’s chat</small></div><span class="status st-new" id="oSt">No new messages</span></div><div id="oBox"><span class="hint">When a customer writes in, it shows up here.</span></div></div>';
        $('#cPick').addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b || b.disabled) return;
          $$('#cPick button').forEach(function (x) { x.disabled = true; });
          var q = Q[+b.dataset.i], th = $('#cThread');
          th.insertAdjacentHTML('beforeend', '<div class="bubble b-me">' + q[0] + '</div>');
          setTimeout(function () {
            if (!document.getElementById('oBox')) return;
            $('#oSt').className = 'status st-prog'; $('#oSt').textContent = 'New message';
            $('#oBox').innerHTML = '<div class="view"><div class="sum"><div><span>Website chat · just now</span></div><b style="font-weight:500">“' + q[0] + '”</b></div><label class="fld">Your reply<textarea id="oTxt">' + q[1] + '</textarea></label><button class="sbtn" id="oSend">Send reply</button></div>';
            $('#oSend').addEventListener('click', function () {
              var txt = $('#oTxt').value.trim() || q[1];
              th.insertAdjacentHTML('beforeend', '<div class="bubble b-us">' + txt.replace(/</g, '&lt;') + '</div>');
              $('#oSt').className = 'status st-live'; $('#oSt').textContent = 'Replied';
              $('#oBox').innerHTML = DASH('Conversation saved in your dashboard');
              $$('#cPick button').forEach(function (x) { x.disabled = false; });
            });
          }, reduce ? 0 : 700);
        });
      }
    },

    booking: {
      title: 'Your own booking', cta: 'Start taking your own bookings', color: '#2F6B4F',
      site: ['Juniper Massage', 'junipermassage.com', ['Services', 'Book', 'Gift cards']],
      lede: 'Customers pick a service, a day and a time, pay a deposit if you want, and get reminders. No booking app to rent.',
      does: ['Live availability, right on your site', 'Deposits and payments through Stripe', 'Text and email reminders that cut no-shows', 'Syncs with your Google or Apple calendar'],
      replaces: ['monthly scheduling subscriptions', 'phone tag to set appointments', 'booking pages with someone else’s logo'],
      apps: ['Calendly', 'Acuity', 'Square Appointments', 'Setmore'],
      demo: function (sb) {
        var SV = [['60-min massage', '60 min', 95], ['90-min massage', '90 min', 135], ['Couples session', '75 min', 210]];
        var DW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        var S = { step: 0, svc: null, day: null, time: null };
        var who = { n: 'Jamie Rivera', e: 'jamie.r@email.com', p: '(555) 010-2233' };
        function head(title) {
          return '<div class="bk-head"><h5>' + title + '</h5>' + (S.step > 0 && S.step < 4 ? '<button class="bk-back" id="bkBack">← Back</button>' : '') + '</div>' +
            '<div class="bk-steps">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i <= S.step ? 'on' : '') + '"></i>'; }).join('') + '</div>';
        }
        function dayLabel(d) { return DW[(d - 1) % 7] + ', Nov ' + (15 + d); }
        function render() {
          var h = '';
          if (S.step === 0) {
            h = head('Choose a service') + SV.map(function (s, i) { return '<button class="opt-row' + (S.svc === i ? ' sel' : '') + '" data-s="' + i + '"><span><b>' + s[0] + '</b><small>' + s[1] + '</small></span><em>$' + s[2] + '</em></button>'; }).join('');
          } else if (S.step === 1) {
            var cal = DW.map(function (d) { return '<span style="font-size:11px;color:#57504A">' + d.charAt(0) + '</span>'; }).join('');
            for (var d = 1; d <= 14; d++) cal += '<button data-d="' + d + '"' + (d % 7 === 0 ? ' disabled' : '') + (S.day === d ? ' class="sel"' : '') + '>' + (15 + d) + '</button>';
            h = head('Pick a day and time') + '<span class="hint">November 2026 · ' + SV[S.svc][0] + '</span><div class="cal" id="bkCal">' + cal + '</div><div class="slots" id="bkSlots">' +
              (S.day ? ['9:00 AM', '10:30 AM', '12:00 PM', '2:30 PM', '4:00 PM'].map(function (t, i) { var off = (S.day + i) % 4 === 0; return '<button class="slot' + (S.time === t ? ' sel' : '') + '"' + (off ? ' disabled' : '') + '>' + t + '</button>'; }).join('') : '<span class="hint">Pick a day to see open times</span>') +
              '</div><button class="sbtn" id="bkNext"' + (S.time ? '' : ' disabled') + '>Continue ' + ARW + '</button>';
          } else if (S.step === 2) {
            h = head('Your details') + '<div class="fgrid"><label class="fld full">Full name<input id="bN" value="' + who.n + '"></label><label class="fld">Email<input id="bE" type="email" value="' + who.e + '"></label><label class="fld">Phone<input id="bP" value="' + who.p + '"></label><label class="fld full">Anything we should know? (optional)<textarea id="bNote">Extra focus on shoulders, please.</textarea></label></div><button class="sbtn" id="bkNext">Review booking ' + ARW + '</button>';
          } else if (S.step === 3) {
            var sv = SV[S.svc];
            h = head('Review and pay deposit') + '<div class="sum"><div><span>Service</span><b>' + sv[0] + '</b></div><div><span>When</span><b>' + dayLabel(S.day) + ' · ' + S.time + '</b></div><div><span>Name</span>' + who.n + '</div><div><span>Total</span>$' + sv[2] + '</div><div style="border-top:1px solid #ECE7E1;padding-top:7px"><span>Due today (deposit)</span><b>$25</b></div></div>' +
              '<div class="paybox"><span>💳 •••• 4242 &nbsp;12/28</span><small>Secured by Stripe</small></div><button class="sbtn" id="bkPay">Pay $25 and book</button>';
          } else {
            h = '<div class="done"><span class="done-ic">' + CHK + '</span><h5>You’re booked, ' + who.n.split(' ')[0] + '!</h5><span class="hint">' + SV[S.svc][0] + ' · ' + dayLabel(S.day) + ' at ' + S.time + '</span>' +
              '<div class="sum" style="width:100%;text-align:left"><div><span>Deposit paid</span><b>$25</b></div><div><span>Confirmation sent to</span>' + who.e + '</div><div><span>Reminder text</span>The day before</div></div>' +
              DASH('Added to Juniper’s dashboard') + '<button class="sbtn ghost" id="bkAgain" style="margin-top:4px">Book another</button></div>';
          }
          sb.innerHTML = '<div class="view">' + h + '</div>';
        }
        sb.addEventListener('click', function (e) {
          var t = e.target.closest('button'); if (!t || t.disabled) return;
          if (t.id === 'bkBack') { S.step--; return render(); }
          if (S.step === 0 && t.dataset.s) { S.svc = +t.dataset.s; pickOne(sb, '.opt-row'); t.classList.add('sel'); setTimeout(function () { S.step = 1; render(); }, reduce ? 0 : 220); return; }
          if (S.step === 1 && t.dataset.d) { S.day = +t.dataset.d; S.time = null; return render(); }
          if (S.step === 1 && t.classList.contains('slot')) { S.time = t.textContent; return render(); }
          if (t.id === 'bkNext') {
            if (S.step === 2) { who.n = $('#bN').value.trim() || who.n; who.e = $('#bE').value.trim() || who.e; who.p = $('#bP').value.trim() || who.p; }
            S.step++; return render();
          }
          if (t.id === 'bkPay') return wait(t, 'Processing…', 1100, function () { if (!document.getElementById('sb')) return; S.step = 4; render(); });
          if (t.id === 'bkAgain') { S = { step: 0, svc: null, day: null, time: null }; render(); }
        });
        render();
      }
    },

    quote: {
      title: 'Instant quotes', cta: 'Start sending instant quotes', color: '#2D5FA8',
      site: ['Brightside Cleaning', 'brightsideclean.com', ['Services', 'Quote', 'Reviews']],
      lede: 'Customers price the job themselves, any time of day, and send you a ready-to-book request.',
      does: ['Pricing built on your own rates', 'Customers adjust size, extras and frequency', 'Every quote lands in your dashboard as a lead', 'Works for cleaning, landscaping, painting, moving and more'],
      replaces: ['calls just to give a price', 'generic contact forms', 'separate quote and form apps'],
      apps: ['Jobber', 'Typeform', 'Jotform', 'Housecall Pro'],
      demo: function (sb) {
        var Q = { bed: 3, bath: 2, ex: {}, freq: 1, fl: 'One-time' }, EX = [['fridge', 'Inside fridge', 25], ['oven', 'Inside oven', 25], ['win', 'Windows', 40]];
        function price() { var p = 60 + Q.bed * 30 + Q.bath * 20; EX.forEach(function (x) { if (Q.ex[x[0]]) p += x[2]; }); return Math.round(p * Q.freq); }
        function form() {
          sb.innerHTML = '<div class="view"><h5>Get your price in 30 seconds</h5>' +
            '<label class="fld"><span>Bedrooms: <b id="qBedV" style="color:var(--ink)">' + Q.bed + '</b></span><input type="range" class="range" id="qBed" min="1" max="6" value="' + Q.bed + '" style="height:auto;border:0;padding:0"></label>' +
            '<div class="fld">Bathrooms<div class="seg" id="qBath">' + [1, 2, 3].map(function (n) { return '<button data-n="' + n + '"' + (Q.bath === n ? ' class="on"' : '') + '>' + (n === 3 ? '3+' : n) + '</button>'; }).join('') + '</div></div>' +
            '<div class="fld">Extras<div class="qpick" id="qEx">' + EX.map(function (x) { return '<button data-x="' + x[0] + '"' + (Q.ex[x[0]] ? ' style="border-color:var(--b);color:var(--b);background:var(--bs)"' : '') + '>' + x[1] + ' +$' + x[2] + '</button>'; }).join('') + '</div></div>' +
            '<div class="fld">How often?<div class="seg" id="qFreq">' + [['One-time', 1], ['Monthly −10%', .9], ['Weekly −20%', .8]].map(function (f) { return '<button data-m="' + f[1] + '" data-l="' + f[0] + '"' + (Q.freq === f[1] ? ' class="on"' : '') + '>' + f[0] + '</button>'; }).join('') + '</div></div>' +
            '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding-top:10px;border-top:1px solid #F3EFEA"><div><span class="hint">Your estimate</span><div class="big-num" id="qOut" style="color:var(--b)">$' + price() + '</div></div><button class="sbtn" id="qGo">Request this quote ' + ARW + '</button></div></div>';
        }
        sb.addEventListener('input', function (e) { if (e.target.id === 'qBed') { Q.bed = +e.target.value; $('#qBedV').textContent = Q.bed; $('#qOut').textContent = '$' + price(); } });
        sb.addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b || b.disabled) return;
          if (b.dataset.n) { Q.bath = +b.dataset.n; return form(); }
          if (b.dataset.x) { Q.ex[b.dataset.x] = !Q.ex[b.dataset.x]; return form(); }
          if (b.dataset.m) { Q.freq = +b.dataset.m; Q.fl = b.dataset.l; return form(); }
          if (b.id === 'qGo') {
            sb.innerHTML = '<div class="view"><div class="bk-head"><h5>Where should we send it?</h5><button class="bk-back" id="qBack">← Back</button></div><div class="sum"><div><span>' + Q.bed + ' bed · ' + (Q.bath === 3 ? '3+' : Q.bath) + ' bath · ' + Q.fl + '</span><b>$' + price() + '</b></div></div>' +
              '<div class="fgrid"><label class="fld full">Name<input id="qN" value="Taylor Brooks"></label><label class="fld">Phone<input value="(555) 010-3345"></label><label class="fld">Email<input value="taylor.b@email.com"></label><label class="fld full">Preferred day<input value="Next Tuesday morning"></label></div><button class="sbtn" id="qSend">Send my request</button></div>';
            return;
          }
          if (b.id === 'qBack') return form();
          if (b.id === 'qSend') {
            var n = ($('#qN').value.trim() || 'Taylor').split(' ')[0];
            return wait(b, 'Sending…', 900, function () { if (!document.getElementById('sb')) return; sb.innerHTML = '<div class="done"><span class="done-ic">' + CHK + '</span><h5>Thanks, ' + n + '!</h5><span class="hint">Quote #1042 · $' + price() + ' · We’ll confirm within 2 hours.</span>' + DASH('New lead in Brightside’s dashboard') + '<button class="sbtn ghost" id="qAgain">Start a new quote</button></div>'; });
          }
          if (b.id === 'qAgain') { Q = { bed: 3, bath: 2, ex: {}, freq: 1, fl: 'One-time' }; form(); }
        });
        form();
      }
    },

    conditions: {
      title: 'Live conditions', cta: 'Show your live conditions', color: '#B8562B',
      site: ['Red Rock Outfitters', 'redrockoutfitters.com', ['Tours', 'Conditions', 'Book']],
      lede: 'Show today’s weather, water or trail conditions right where customers decide whether to book.',
      does: ['Live weather and forecasts', 'Water levels or trail status for outdoor businesses', 'A “great day to go” nudge by your booking button', 'Updates on its own, no work from you'],
      replaces: ['customers leaving to check other sites', 'weather widgets full of ads', 'posting daily updates by hand'],
      apps: ['Elfsight Weather', 'WeatherWidget.io', 'Social posts'],
      demo: function (sb) {
        var D = { today: ['☀️', 72, 'Sunny', '6 mph', 'Open · dry', '5:21 PM', 1, 'Great day to go'], tom: ['⛅', 66, 'Partly cloudy', '12 mph', 'Open · dry', '5:20 PM', 1, 'Good day to go'], sat: ['🌧️', 58, 'Rain after 2 PM', '18 mph', 'Muddy after 2', '5:20 PM', 0, 'Heads up: book a morning tour'] };
        sb.innerHTML = '<div class="view"><h5>Guided hikes in Sedona</h5><span class="hint">Small groups, local guides, every day of the week.</span>' +
          '<div class="cond"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span class="mono" style="font-size:11px;color:var(--muted)">LIVE · SEDONA, AZ</span><div class="seg" id="cSeg"><button class="on" data-k="today">Today</button><button data-k="tom">Tomorrow</button><button data-k="sat">Saturday</button></div></div><div id="cBox"></div></div>' +
          '<button class="sbtn" id="cBook">Book a hike ' + ARW + '</button><span class="hint" id="cMsg" style="text-align:center"></span></div>';
        function show(k) {
          var d = D[k];
          $('#cBox').innerHTML = '<div class="view"><div class="cond-top"><span style="font-size:40px">' + d[0] + '</span><span class="big-num">' + d[1] + '°</span><span style="color:var(--muted)">' + d[2] + '</span></div>' +
            '<div class="cond-grid"><div>Wind<b>' + d[3] + '</b></div><div>Trails<b>' + d[4] + '</b></div><div>Sunset<b>' + d[5] + '</b></div></div><div class="nudge' + (d[6] ? '' : ' warn') + '"><i></i>' + d[7] + '</div></div>';
        }
        $('#cSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; pickOne($('#cSeg'), 'button', 'on'); b.classList.add('on'); show(b.dataset.k); });
        $('#cBook').addEventListener('click', function () { $('#cMsg').textContent = 'This opens Red Rock’s own booking tool, right on the page.'; });
        show('today');
      }
    },

    gift: {
      title: 'Gift cards', cta: 'Start selling gift cards', color: '#8A3F6E',
      site: ['Golden Hour Salon', 'goldenhoursalon.com', ['Services', 'Book', 'Gift cards']],
      lede: 'Sell digital gift cards from your own site, delivered by email, with no gift card platform in the middle.',
      does: ['Buyers choose an amount and add a note', 'Delivered instantly by email', 'Payments through Stripe', 'Balances tracked in your dashboard'],
      replaces: ['gift card platform fees', 'paper certificates', 'sending buyers to someone else’s site'],
      apps: ['Square Gift Cards', 'GiftUp!', 'Toast'],
      demo: function (sb) {
        var G = { amt: 50, to: 'Jamie Rivera', em: 'jamie.r@email.com', from: 'Alex', note: 'Happy birthday! Treat yourself.' };
        function form() {
          sb.innerHTML = '<div class="view"><h5>Give the gift of Golden Hour</h5>' +
            '<div class="giftc"><span class="mono" style="font-size:11px;opacity:.85">GOLDEN HOUR SALON · GIFT CARD</span><b id="gAmt">$' + G.amt + '</b><span id="gTo" style="font-size:13px">For ' + G.to + '</span><span id="gNote" style="font-size:13px;opacity:.9;font-style:italic">“' + G.note + '”</span></div>' +
            '<div class="slots" id="gChips">' + [25, 50, 100, 150].map(function (a) { return '<button class="slot' + (G.amt === a ? ' sel' : '') + '" data-a="' + a + '">$' + a + '</button>'; }).join('') + '</div>' +
            '<div class="fgrid"><label class="fld">Recipient name<input id="gToI" value="' + G.to + '"></label><label class="fld">Recipient email<input id="gEm" value="' + G.em + '"></label><label class="fld full">Message<input id="gNoteI" value="' + G.note + '"></label></div>' +
            '<button class="sbtn" id="gBuy">Buy $' + G.amt + ' gift card</button></div>';
        }
        sb.addEventListener('input', function (e) {
          if (e.target.id === 'gToI') { G.to = e.target.value; $('#gTo').textContent = 'For ' + G.to; }
          if (e.target.id === 'gNoteI') { G.note = e.target.value; $('#gNote').textContent = '“' + G.note + '”'; }
          if (e.target.id === 'gEm') G.em = e.target.value;
        });
        sb.addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b || b.disabled) return;
          if (b.dataset.a) { G.amt = +b.dataset.a; pickOne(sb, '#gChips .slot'); b.classList.add('sel'); $('#gAmt').textContent = '$' + G.amt; $('#gBuy').textContent = 'Buy $' + G.amt + ' gift card'; return; }
          if (b.id === 'gBuy') return wait(b, 'Processing…', 1000, function () { if (!document.getElementById('sb')) return; sb.innerHTML = '<div class="done"><span class="done-ic">' + CHK + '</span><h5>Gift card sent!</h5><span class="hint">$' + G.amt + ' for ' + G.to + ' was emailed to ' + G.em + '</span><div class="sum" style="width:100%;text-align:left"><div><span>Card code</span><b class="mono">GH-7K2P-X9</b></div><div><span>Balance</span>$' + G.amt + '.00</div></div>' + DASH('Balance tracked in Golden Hour’s dashboard') + '<button class="sbtn ghost" id="gAgain">Send another</button></div>'; });
          if (b.id === 'gAgain') form();
        });
        form();
      }
    },

    reviews: {
      title: 'Reviews wall', cta: 'Start showing off your reviews', color: '#2D5FA8',
      site: ['Brightside Cleaning', 'brightsideclean.com', ['Services', 'Quote', 'Reviews']],
      lede: 'Your best Google reviews on your site, updated on their own, right where trust matters most.',
      does: ['Pulls in your newest Google reviews', 'Shows your star rating and review count', 'Rotates on your homepage and booking page', 'Review request links to grow your count'],
      replaces: ['copy-pasting reviews by hand', 'paid review widget subscriptions', 'testimonials that never change'],
      apps: ['Elfsight', 'Trustindex', 'EmbedSocial', 'Birdeye'],
      demo: function (sb) {
        var R = [['Easiest booking we’ve ever done. The team was so friendly.', 'Dana M.', '2 days ago'], ['They answered in minutes and came out the same week.', 'Luis R.', '1 week ago'], ['Our house has never looked this good. Worth every penny.', 'Kim T.', '2 weeks ago']];
        var mode = 'rotate', i = 0, timer;
        function render() {
          clearInterval(timer);
          var box = $('#rvBox');
          if (mode === 'grid') { box.innerHTML = '<div class="rv-grid">' + R.map(function (r) { return '<div class="rv"><span class="stars">★★★★★</span><span style="font-size:13.5px;line-height:1.5">“' + r[0] + '”</span><b style="font-size:12.5px">' + r[1] + '</b></div>'; }).join('') + '</div>'; return; }
          function one() { var r = R[i]; box.innerHTML = '<div class="rv"><span class="stars">★★★★★</span><span style="font-size:16px;line-height:1.5">“' + r[0] + '”</span><span style="font-size:13px"><b>' + r[1] + '</b> <span class="hint">· Google · ' + r[2] + '</span></span></div>'; }
          one(); if (!reduce) timer = setInterval(function () { if (!document.getElementById('rvBox')) return clearInterval(timer); i = (i + 1) % R.length; one(); }, 3200);
        }
        sb.innerHTML = '<div class="view"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><h5>Loved by your neighbors</h5><span style="display:flex;align-items:center;gap:8px;margin-top:4px"><b class="big-num" style="font-size:28px">4.9</b><span class="stars">★★★★★</span><span class="hint">127 Google reviews</span></span></div>' +
          '<div class="seg" id="rvMode"><button class="on" data-m="rotate">Rotate</button><button data-m="grid">Grid</button></div></div><div id="rvBox"></div>' +
          '<div class="sum" style="align-items:center;text-align:center;margin-top:4px"><span class="hint">Had a great clean? Tap a star:</span><div class="starpick" id="rvStars">' + [1, 2, 3, 4, 5].map(function (n) { return '<button data-n="' + n + '" aria-label="' + n + ' stars">★</button>'; }).join('') + '</div><span class="hint" id="rvMsg"></span></div></div>';
        $('#rvMode').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; pickOne($('#rvMode'), 'button', 'on'); b.classList.add('on'); mode = b.dataset.m; render(); });
        $('#rvStars').addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b) return; var n = +b.dataset.n;
          $$('#rvStars button').forEach(function (x, k) { x.classList.toggle('on', k < n); });
          $('#rvMsg').textContent = n >= 4 ? 'Thank you! This opens your Google review page.' : 'Sorry to hear it. This sends private feedback to the owner.';
        });
        render();
      }
    }
  };

  var SW = ['#E8501A', '#2F6B4F', '#2D5FA8', '#8A3F6E', '#141210'];
  var dlg = $('#toolDialog');
  $$('.tool-card').forEach(function (card) {
    card.addEventListener('click', function () {
      var t = TOOLS[card.dataset.tool]; if (!t) return;
      var sw = [t.color].concat(SW.filter(function (c) { return c !== t.color; })).slice(0, 5);
      $('#dlgBody').innerHTML =
        '<div class="dlg-demo">' + site(t.site[0], t.site[1], t.site[2], t.color) + '<div id="ext"></div>' +
        (t.custom === false ? '' : '<div class="custom"><span class="lbl">MAKE IT YOURS · TRY IT</span><div class="sw" id="dSw">' + sw.map(function (c, i) { return '<button style="background:' + c + '" data-c="' + c + '" aria-label="Brand color ' + (i + 1) + '"' + (i === 0 ? ' class="on"' : '') + '></button>'; }).join('') + '</div>' +
        '<div class="seg" id="dFont"><button class="on" data-f="modern">Modern</button><button data-f="classic">Classic</button></div></div>') +
        '<div class="dlg-cta"><a href="get-started.html" class="btn btn-primary">' + t.cta + ' ' + ARW + '</a><small>' + (t.custom === false ? 'Included with every monthly plan.' : 'Your colors, fonts and wording. Built to match your site.') + '</small></div></div>' +
        '<div class="dlg-info"><div class="dlg-sec"><span class="eyebrow">// STOOP TOOL</span><h2 id="dlgTitle">' + t.title + '</h2><p class="lede" style="font-size:16px;margin:0">' + t.lede + '</p></div>' +
        '<div class="dlg-sec"><span class="dlg-sub">WHAT IT DOES</span><ul class="dlg-list">' + t.does.map(function (x) { return '<li><span class="ck"><svg width="11" height="11" aria-hidden="true"><use href="#check"/></svg></span>' + x + '</li>'; }).join('') + '</ul></div>' +
        '<div class="dlg-gone"><span class="dlg-sub">NO MORE</span><p>' + t.replaces.map(function (x) { return '<s>' + x + '</s>'; }).join(', ') + '.</p></div>' +
        '<div class="dlg-sec"><span class="dlg-sub">APPS PEOPLE PAY FOR</span><div class="apps-line">' + t.apps.map(function (a) { return '<span>' + a + '</span>'; }).join('') + '</div></div></div>';
      t.demo($('#sb'), $('#ext'));
      var st = $('#site');
      if ($('#dSw')) $('#dSw').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; pickOne($('#dSw'), 'button', 'on'); b.classList.add('on'); st.style.setProperty('--b', b.dataset.c); });
      if ($('#dFont')) $('#dFont').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; pickOne($('#dFont'), 'button', 'on'); b.classList.add('on'); st.classList.toggle('classic', b.dataset.f === 'classic'); });
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
    var a = 6500 + 100 * 12 * y, s = 199 * 12 * y, max = 6500 + 100 * 12 * 5;
    $('#yearsOut').textContent = y + (y === 1 ? ' year' : ' years');
    $('#vAgency').textContent = money(a); $('#vStoop').textContent = money(s);
    $('#bAgency').style.width = (a / max * 100) + '%'; $('#bStoop').style.width = (s / max * 100) + '%';
  }
  years.addEventListener('input', cmp); cmp();

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
