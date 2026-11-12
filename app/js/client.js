/* client dashboard template: one template, modules switch on by tools */
(function () {
  var U = UI, icon = U.icon, esc = U.esc, D = 864e5;
  function ro() { return API.user().role === 'admin'; }
  function kpi(label, val, sub) { return '<div class="card kpi"><span>' + label + '</span><strong>' + val + '</strong><small>' + sub + '</small></div>'; }
  function has(c, t) { return c.tools.indexOf(t) > -1; }
  function seedNum(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function visitors(c) { var h = seedNum(c.id), out = []; for (var i = 6; i >= 0; i--) { h = (h * 1103515245 + 12345) >>> 0; out.push({ d: new Date(Date.now() - i * D), v: 40 + (h % 90) }); } return out; }
  function sel(id, val, opts, dis) { return '<select data-id="' + id + '"' + (dis ? ' disabled' : '') + '>' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; }
  function acts(phone, email, extra) {
    var p = String(phone || '').replace(/[^0-9+]/g, '');
    return '<div class="acts"><a class="act" href="tel:' + p + '" title="Call" aria-label="Call">' + icon('phone', 16) + '</a><a class="act" href="sms:' + p + '" title="Text" aria-label="Text">' + icon('chat', 16) + '</a><a class="act" href="mailto:' + esc(email) + '" title="Email" aria-label="Email">' + icon('mail', 16) + '</a>' + (extra || '') + '</div>';
  }
  function wireActs(el, c) {
    U.on(el, '[data-rev]', 'click', function (e, b) { API.logText(c.id, 'review').then(function () { U.toast('Review request texted to ' + b.dataset.rev.split(' ')[0]); }); });
    U.on(el, '[data-rebook]', 'click', function (e, b) { API.logText(c.id, 'rebook').then(function () { U.toast('Rebook link texted to ' + b.dataset.rebook.split(' ')[0]); }); });
  }
  function roNote() { return ro() ? '<span class="sample">READ-ONLY SUPPORT VIEW</span>' : ''; }

  function badges(c) {
    var jobs = [API.leads(c.id)];
    if (has(c, 'chat')) jobs.push(API.chats(c.id)); else jobs.push(Promise.resolve({ rows: [] }));
    return Promise.all(jobs).then(function (r) {
      return { leads: (r[0].rows || []).filter(function (l) { return l.status === 'new'; }).length, chat: (r[1].rows || []).filter(function (x) { return x.open; }).length };
    });
  }

  /* ---------- Overview ---------- */
  function overview(el, ctx, c, base) {
    ctx.title('Overview');
    Promise.all([API.roi(c.id), API.closed(c.id)]).then(function (x) { overviewRender(el, ctx, c, base, x[0], x[1]); });
  }
  function overviewRender(el, ctx, c, base, roi, closed) {
    if (!ro()) ctx.actions(closed ? '<button class="btn" id="reopen">' + icon('moon', 16) + '<span class="lbl">Reopen</span></button>' : '<button class="btn" id="closeBtn">' + icon('moon', 16) + '<span class="lbl">Closed today</span></button>');
    var cb = document.getElementById('closeBtn'); if (cb) cb.addEventListener('click', function () { closedDrawer(c, ctx); });
    var rb = document.getElementById('reopen'); if (rb) rb.addEventListener('click', function () { API.setClosed(c.id, null).then(function () { U.toast('You’re open again. Booking and chat are back to normal.'); ctx.refresh(); }); });
    Promise.all([API.leads(c.id), has(c, 'booking') ? API.bookings(c.id) : Promise.resolve({ rows: [] }), (has(c, 'store') || has(c, 'gift')) ? API.orders(c.id) : Promise.resolve({ rows: [] }), API.requests(c.id), API.site(c.id)]).then(function (r) {
      var L = r[0].rows || [], B = r[1].rows || [], O = r[2].rows || [], R = r[3], s = r[4] || {};
      var V = visitors(c), vt = V.reduce(function (a, x) { return a + x.v; }, 0), max = Math.max.apply(null, V.map(function (x) { return x.v; }));
      var openReq = R.filter(function (x) { return x.status !== 'live'; });
      var k = [kpi('Visitors this week', vt, '<span class="up">▲ ' + (8 + seedNum(c.id) % 15) + '% vs last week</span>'), kpi('New leads', L.filter(function (l) { return l.status === 'new'; }).length, L.length + ' total')];
      if (has(c, 'booking')) k.push(kpi('Upcoming bookings', B.length, U.money(B.reduce(function (a, b) { return a + b.deposit; }, 0)) + ' in deposits'));
      if (has(c, 'store') || has(c, 'gift')) k.push(kpi('Sales', U.money(O.reduce(function (a, o) { return a + o.total; }, 0)), O.length + ' orders'));
      if (k.length < 4) k.push(kpi('Requests with your designer', openReq.length, openReq.length ? 'in progress' : 'all done'));
      var act = [];
      L.forEach(function (l) { act.push([l.at, 'inbox', 'New lead: ' + l.name, l.source + ' · ' + l.detail]); });
      O.forEach(function (o) { act.push([o.at, 'bag', 'Order: ' + U.money(o.total), o.customer + ' · ' + o.items]); });
      B.forEach(function (b) { act.push([new Date(new Date(b.when).getTime() - 3 * D).toISOString(), 'cal', 'Booked: ' + b.service, b.customer + ' · ' + U.date(b.when, true)]); });
      R.forEach(function (x) { if (x.status === 'live') act.push([x.done, 'check', 'Live on your site', x.text]); });
      act.sort(function (a, b) { return a[0] < b[0] ? 1 : -1; });
      var weekly = esc(c.name) + ' this week: ' + vt + ' visitors · ' + L.length + ' lead' + (L.length === 1 ? '' : 's') + (has(c, 'booking') ? ' · ' + B.length + ' bookings' : '') + ((has(c, 'store') || has(c, 'gift')) ? ' · ' + U.money(roi.sales) + ' in sales' : '') + '. Reply with any changes for your designer.';
      el.innerHTML = (closed ? '<div class="access warn">' + icon('moon', 18) + '<span class="grow"><b>Closed today' + (closed.reason ? ' · ' + esc(closed.reason) : '') + '.</b> Your site shows a closed banner, booking is paused and chat replies with your hours. Reopens on its own tomorrow.</span></div>' : '') +
        (c.status !== 'building' ? '<div class="grid g21"><div class="card roi"><span class="roi-l">Your site brought in</span><strong>' + U.money(roi.total) + '</strong><span class="roi-s">last 30 days' + (roi.sales ? ' · ' + U.money(roi.sales) + ' in sales' : '') + (roi.deposits ? ' · ' + U.money(roi.deposits) + ' in deposits' : '') + ' · ' + roi.leads + ' leads' + (has(c, 'booking') ? ' · ' + roi.bookings + ' bookings' : '') + '</span></div>' +
        '<div class="card"><div class="card-h"><h3>Your Monday text</h3><span class="sample">WEEKLY SUMMARY</span></div><div class="bub" style="max-width:100%">' + weekly + '</div></div></div>' : '') +
        (c.status === 'building' ? '<div class="access" style="background:var(--soft);color:var(--deep)">' + icon('build', 18) + '<span class="grow"><b>Your site is being built.</b> Your designer will text you when the first draft is ready. Numbers start once it’s live.</span></div>' : '') +
        '<div class="grid g4">' + k.slice(0, 4).join('') + '</div>' +
        '<div class="grid g21"><div class="card"><div class="card-h"><h3>Visitors, last 7 days</h3><span class="sample">' + vt + ' TOTAL</span></div><div class="chart">' + V.map(function (x, i) { return '<div><i style="height:' + Math.round(x.v / max * 100) + '%;animation-delay:' + i * 50 + 'ms"></i><span>' + x.d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2) + '</span></div>'; }).join('') + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Site health</h3>' + (s.uptime != null ? '<span class="pill green">All good</span>' : '<span class="pill orange">In build</span>') + '</div><div class="kv"><span>Uptime</span><b>' + (s.uptime != null ? s.uptime + '%' : '—') + '</b><span>Speed</span><b>' + (s.speed || '—') + '</b><span>Security</span><b>' + (s.ssl != null ? 'Active' : '—') + '</b><span>Last update</span><b>' + U.rel(s.deploy) + '</b></div></div></div>' +
        '<div class="grid g21"><div class="card"><div class="card-h"><h3>Live activity</h3></div><div class="list">' + (act.length ? act.slice(0, 6).map(function (a) { return '<div class="row"><span class="ic">' + icon(a[1], 16) + '</span><span class="grow"><b>' + esc(a[2]) + '</b><small>' + esc(a[3]) + '</small></span><small>' + U.rel(a[0]) + '</small></div>'; }).join('') : '<div class="empty">Activity shows up here once your site is live.</div>') + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Your designer</h3><a href="' + base + 'designer">Open</a></div>' + (openReq.length ? openReq.slice(0, 3).map(function (x) { return '<div style="display:flex;flex-direction:column;gap:6px;padding-bottom:10px;border-bottom:1px solid #F3EFEA"><b style="font-size:14px">' + esc(x.text) + '</b>' + approveBits(x) + '</div>'; }).join('') : '<p class="muted" style="margin:0">No open requests. Need a change? Text your designer.</p>') + '<a class="btn" href="' + base + 'designer">' + icon('phone', 16) + ' Send a change</a></div></div>';
      wireApprove(el, ctx);
    });
  }
  function approveBits(x) {
    if (x.status === 'review' && x.approved) return '<span class="pill green">' + icon('check', 13) + ' Approved · going live soon</span>';
    if (x.status === 'review' && !ro()) return '<div class="appr"><span class="pill orange">Ready for your OK</span><button class="btn sm" data-prev>' + icon('eye', 14) + ' Preview</button><button class="btn sm primary" data-appr="' + x.id + '">' + icon('check', 14) + ' Approve</button></div>';
    return U.reqPill(x.status);
  }
  function wireApprove(el, ctx) {
    U.on(el, '[data-appr]', 'click', function (e, b) { API.approveRequest(b.dataset.appr).then(function (r) { if (r) { U.toast('Approved. Your designer will put it live.'); ctx.refresh(); } }); });
    U.on(el, '[data-prev]', 'click', function () { U.toast('Opens a private preview of your site with this change'); });
  }
  function closedDrawer(c, ctx) {
    var reasons = ['Holiday', 'Weather', 'Sick day', 'Private event', 'Other'], pick = reasons[0];
    U.openDrawer('<div class="dr-h"><h3>Close for today?</h3><button class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button></div><div class="dr-b">' +
      '<div style="display:flex;flex-direction:column;gap:8px"><span class="muted" style="font-size:13px;font-weight:500">Reason (shown on your site)</span><div class="steps-sel" id="cr">' + reasons.map(function (r, i) { return '<button' + (i === 0 ? ' class="on"' : '') + '>' + r + '</button>'; }).join('') + '</div></div>' +
      '<div class="card" style="gap:10px;background:#FAF8F5"><b>What changes right away</b>' + ['A “Closed today” banner on your site', 'Today’s booking slots are paused' + (has(c, 'booking') ? '' : ' (when you add booking)'), 'Chat and missed calls get an auto-reply with your hours', 'Everything reopens on its own tomorrow'].map(function (t) { return '<div style="display:flex;gap:10px;font-size:14px"><span style="color:var(--green)">' + icon('check', 16) + '</span>' + t + '</div>'; }).join('') + '</div></div>' +
      '<div class="dr-f"><button class="btn" data-close>Cancel</button><button class="btn primary" id="cgo">' + icon('moon', 16) + ' Close for today</button></div>', function (d) {
      U.$$('[data-close]', d).forEach(function (x) { x.addEventListener('click', U.closeDrawer); });
      U.on(d, '#cr button', 'click', function (e, b) { pick = b.textContent; U.$$('#cr button', d).forEach(function (q) { q.classList.toggle('on', q === b); }); });
      U.$('#cgo', d).addEventListener('click', function () { API.setClosed(c.id, pick).then(function () { U.closeDrawer(); U.toast('Closed for today. Your site is updated.'); ctx.refresh(); }); });
    });
  }

  /* ---------- Leads ---------- */
  function leads(el, ctx, c) {
    ctx.title('Leads');
    var f = 'all';
    API.leads(c.id).then(function (res) {
      var L = res.rows || [];
      function draw() {
        var list = L.filter(function (l) { return f === 'all' || l.status === f; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
        el.innerHTML = '<div class="filters" id="lf">' + [['all', 'All'], ['new', 'New'], ['contacted', 'Contacted'], ['won', 'Won'], ['lost', 'Lost']].map(function (x) { var n = x[0] === 'all' ? L.length : L.filter(function (l) { return l.status === x[0]; }).length; return '<button class="btn sm' + (f === x[0] ? ' dark' : '') + '" data-f="' + x[0] + '">' + x[1] + ' · ' + n + '</button>'; }).join('') + roNote() + '</div>' +
          (list.length ? '<div class="tbl-wrap"><table><thead><tr><th>FROM</th><th>CAME IN THROUGH</th><th>DETAILS</th><th>WHEN</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>' + list.map(function (l) { return '<tr><td><b>' + esc(l.name) + '</b><small><a href="tel:' + esc(l.phone) + '">' + esc(l.phone) + '</a> · <a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a></small></td><td><span class="pill">' + esc(l.source) + '</span></td><td>' + esc(l.detail) + '</td><td>' + U.rel(l.at) + '</td><td>' + sel(l.id, l.status, [['new', 'New'], ['contacted', 'Contacted'], ['won', 'Won'], ['lost', 'Lost']], ro()) + '</td><td>' + acts(l.phone, l.email, l.status === 'won' && !ro() ? '<button class="act" data-rev="' + esc(l.name) + '" title="Ask for a review" aria-label="Ask for a review">' + icon('star', 16) + '</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">No leads here.</div>');
      }
      U.on(el, '#lf button', 'click', function (e, b) { f = b.dataset.f; draw(); });
      wireActs(el, c);
      el.addEventListener('change', function (e) { var s = e.target.closest('select[data-id]'); if (!s) return; API.updateLead(s.dataset.id, s.value).then(function (l) { if (l) { L.find(function (x) { return x.id === l.id; }).status = l.status; U.toast('Lead marked ' + l.status); draw(); } }); });
      draw();
    });
  }

  /* ---------- Bookings ---------- */
  function bookings(el, ctx, c) {
    ctx.title('Bookings');
    API.bookings(c.id).then(function (res) {
      var B = (res.rows || []).sort(function (a, b) { return a.when < b.when ? -1 : 1; });
      var todayN = B.filter(function (b) { return new Date(b.when).toDateString() === new Date().toDateString(); }).length;
      el.innerHTML = '<div class="grid g3">' + kpi('Today', todayN, 'appointments') + kpi('Upcoming', B.length, 'next 7 days') + kpi('Deposits collected', U.money(B.reduce(function (a, b) { return a + b.deposit; }, 0)), 'through Stripe') + '</div>' +
        '<div class="filters"><span class="muted" style="font-size:13px">Customers get a reminder text the day before.</span>' + roNote() + '</div>' +
        (B.length ? '<div class="tbl-wrap"><table><thead><tr><th>WHEN</th><th>CUSTOMER</th><th>SERVICE</th><th>DEPOSIT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>' + B.map(function (b) { return '<tr><td><b>' + U.date(b.when, true) + '</b><small>' + U.rel(b.when) + '</small></td><td>' + esc(b.customer) + '<small>' + esc(b.email) + ' · ' + esc(b.phone) + '</small></td><td>' + esc(b.service) + '</td><td>' + U.money(b.deposit) + '</td><td>' + sel(b.id, b.status, [['confirmed', 'Confirmed'], ['reminder', 'Reminder sent'], ['completed', 'Completed'], ['noshow', 'No-show'], ['cancelled', 'Cancelled']], ro()) + '</td><td>' + acts(b.phone, b.email, ro() ? '' : '<button class="act" data-rebook="' + esc(b.customer) + '" title="Text a rebook link" aria-label="Text a rebook link">' + icon('cal', 16) + '</button><button class="act" data-rev="' + esc(b.customer) + '" title="Ask for a review" aria-label="Ask for a review">' + icon('star', 16) + '</button>') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">No upcoming bookings.</div>');
      el.addEventListener('change', function (e) { var s = e.target.closest('select[data-id]'); if (!s) return; API.updateBooking(s.dataset.id, s.value).then(function () { U.toast(s.value === 'completed' ? 'Marked completed. A review request goes out in 2 hours.' : 'Booking updated'); }); });
      wireActs(el, c);
    });
  }

  /* ---------- Orders ---------- */
  function orders(el, ctx, c) {
    ctx.title('Orders');
    API.orders(c.id).then(function (res) {
      var O = (res.rows || []).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
      el.innerHTML = '<div class="grid g3">' + kpi('Sales', U.money(O.reduce(function (a, o) { return a + o.total; }, 0)), 'last 30 days') + kpi('Orders', O.length, O.filter(function (o) { return o.status === 'paid'; }).length + ' to fulfill') + kpi('Payouts', 'Automatic', 'Stripe pays your bank') + '</div>' +
        '<div class="filters">' + roNote() + '</div>' +
        (O.length ? '<div class="tbl-wrap"><table><thead><tr><th>CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>WHEN</th><th>STATUS</th></tr></thead><tbody>' + O.map(function (o) { return '<tr><td><b>' + esc(o.customer) + '</b><small>' + esc(o.email) + '</small></td><td>' + esc(o.items) + '</td><td>' + U.money(o.total) + '</td><td>' + U.rel(o.at) + '</td><td>' + sel(o.id, o.status, [['paid', 'Paid · to fulfill'], ['fulfilled', 'Fulfilled'], ['refunded', 'Refunded']], ro()) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">No orders yet.</div>');
      el.addEventListener('change', function (e) { var s = e.target.closest('select[data-id]'); if (!s) return; API.updateOrder(s.dataset.id, s.value).then(function () { if (s.value === 'fulfilled') { API.logText(c.id, 'order_ready'); U.toast('Marked fulfilled. “Your order is ready” text sent.'); } else U.toast('Order updated'); }); });
    });
  }

  /* ---------- Customer chat ---------- */
  function chat(el, ctx, c, base, rest) {
    ctx.title('Customer chat');
    API.chats(c.id).then(function (res) {
      var CH = (res.rows || []).sort(function (a, b) { return a.msgs[a.msgs.length - 1].at < b.msgs[b.msgs.length - 1].at ? 1 : -1; });
      var cur = CH[0] && CH[0].id;
      function draw() {
        var ch = CH.find(function (x) { return x.id === cur; });
        el.innerHTML = '<p class="muted" style="margin:0">Customers message you from the chat bubble on your site. You also get a text, so you can reply from your phone. ' + roNote() + '</p>' +
          (CH.length ? '<div class="split"><div class="inbox" id="ci">' + CH.map(function (x) { var m = x.msgs[x.msgs.length - 1]; return '<button data-id="' + x.id + '"' + (x.id === cur ? ' class="on"' : '') + '><span class="av sm">' + U.initials(x.customer) + '</span><div><b>' + esc(x.customer) + '</b><small>' + (m.from === 'business' ? 'You: ' : '') + esc(m.body) + '</small></div>' + (x.open ? '<span class="unread"></span>' : '') + '</button>'; }).join('') + '</div>' +
            '<div class="card" style="gap:12px"><div class="card-h"><h3>' + esc(ch.customer) + '</h3><span class="muted" style="font-size:12.5px">Website chat</span></div><div class="thread" id="th">' + ch.msgs.map(function (m) { return '<div class="bub' + (m.from === 'business' ? ' me' : '') + '">' + esc(m.body) + '<time>' + U.date(m.at, true) + '</time></div>'; }).join('') + '</div>' +
            (ro() ? '<p class="muted" style="margin:0;font-size:13px">Replies are turned off in the support view.</p>' : '<div class="qr" id="qr"><button>Thanks for reaching out!</button><button>Yes, we can do that.</button><button>What day works best for you?</button></div><form class="compose" id="cf"><input id="cm" placeholder="Reply to ' + esc(ch.customer.split(' ')[0]) + '…" autocomplete="off"><button class="btn primary">' + icon('send', 16) + '<span class="lbl">Send</span></button></form>') + '</div></div>' : '<div class="empty">No conversations yet.</div>');
        var th = U.$('#th', el); if (th) th.scrollTop = th.scrollHeight;
        var f = U.$('#cf', el); if (f) f.addEventListener('submit', function (e) { e.preventDefault(); var v = U.$('#cm', el).value.trim(); if (!v) return; API.replyChat(cur, v).then(function (n) { Object.assign(ch, n); draw(); U.toast('Sent to ' + ch.customer.split(' ')[0]); }); });
      }
      U.on(el, '#ci button', 'click', function (e, b) { cur = b.dataset.id; draw(); });
      U.on(el, '#qr button', 'click', function (e, b) { U.$('#cm', el).value = b.textContent; U.$('#cm', el).focus(); });
      draw();
    });
  }

  /* ---------- Your designer ---------- */
  function designer(el, ctx, c) {
    ctx.title('Your designer');
    Promise.all([API.requests(c.id), API.messages(c.id)]).then(function (r) {
      var R = r[0].sort(function (a, b) { return a.created < b.created ? 1 : -1; }), M = r[1].sort(function (a, b) { return a.at < b.at ? -1 : 1; });
      el.innerHTML = '<div class="access off">' + icon('shield', 18) + '<span class="grow">This is your private line to your designer, the same real person every time. Customers never see it. You can also just text <b>(555) 010-7867</b>.</span></div>' +
        '<div class="grid g2"><div style="display:flex;flex-direction:column;gap:16px"><div class="card"><div class="card-h"><h3>Send a change</h3></div>' +
        (ro() ? '<p class="muted" style="margin:0">Hidden in the support view.</p>' : '<form id="rq" style="display:flex;flex-direction:column;gap:10px"><label class="field">What should we change?<textarea id="rt" placeholder="e.g. Update our holiday hours to 9 to 1 on Dec 24"></textarea></label><button class="btn primary">' + icon('send', 16) + ' Send to your designer</button><small class="muted">Small edits go live within 2 business days.</small></form>') + '</div>' +
        '<div class="card"><div class="card-h"><h3>Your requests</h3></div><div class="list">' + (R.length ? R.map(function (x) { var st = ['received', 'progress', 'review', 'live'].indexOf(x.status); return '<div class="row" style="flex-direction:column;align-items:stretch;gap:8px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b style="white-space:normal">' + esc(x.text) + '</b>' + approveBits(x) + '</div><div class="bar" style="height:5px"><i style="width:' + ((st + 1) * 25) + '%"></i></div><small>' + (x.status === 'live' ? 'Live ' + U.rel(x.done) : 'Sent ' + U.rel(x.created) + ' · expected by ' + U.date(x.due)) + '</small></div>'; }).join('') : '<div class="empty">No requests yet.</div>') + '</div></div></div>' +
        '<div class="card" style="gap:12px"><div class="card-h"><h3>Messages</h3><span class="muted" style="font-size:12.5px">Private</span></div><div class="thread" id="th">' + (M.length ? M.map(function (m) { return '<div class="bub' + (m.from === 'client' ? ' me' : '') + '">' + esc(m.body) + '<time>' + (m.from === 'stoop' ? 'Your designer · ' : '') + U.date(m.at, true) + '</time></div>'; }).join('') : '<span class="muted" style="margin:auto">Say hi to your designer.</span>') + '</div>' +
        (ro() ? '' : '<form class="compose" id="mf"><input id="mi" placeholder="Message your designer…" autocomplete="off"><button class="btn primary">' + icon('send', 16) + '<span class="lbl">Send</span></button></form>') + '</div></div>';
      var th = U.$('#th', el); th.scrollTop = th.scrollHeight;
      wireApprove(el, ctx);
      var rq = U.$('#rq', el); if (rq) rq.addEventListener('submit', function (e) { e.preventDefault(); var t = U.$('#rt', el).value.trim(); if (!t) return; API.addRequest(c.id, t, 'dashboard').then(function () { return API.sendMessage(c.id, t); }).then(function () { U.toast('Sent. Your designer has it.'); ctx.refresh(); }); });
      var mf = U.$('#mf', el); if (mf) mf.addEventListener('submit', function (e) { e.preventDefault(); var t = U.$('#mi', el).value.trim(); if (!t) return; API.sendMessage(c.id, t).then(function () { ctx.refresh(); }); });
    });
  }

  /* ---------- Billing ---------- */
  function billing(el, ctx, c) {
    ctx.title('Billing');
    API.invoices(c.id).then(function (I) {
      I.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
      var next = new Date((I[0] ? new Date(I[0].at).getTime() : Date.now()) + 30 * D);
      el.innerHTML = (c.status === 'past_due' ? '<div class="access" style="background:var(--rsoft);color:var(--red)">' + icon('alert', 18) + '<span class="grow"><b>Your last payment didn’t go through.</b> Update your card to keep everything running.</span><button class="btn sm" id="fix">Update card</button></div>' : '') +
        '<div class="grid g3">' + kpi('Your plan', c.plan, c.mrr ? U.money(c.mrr) + ' a month' : 'One-time build') + kpi('Next payment', c.mrr ? U.date(next.toISOString()) : '—', c.mrr ? U.money(c.mrr) : '') + kpi('Term', U.date(c.termEnds), 'then month to month') + '</div>' +
        '<div class="card"><div class="card-h"><h3>Invoices</h3><button class="btn sm" id="portal">' + icon('card', 15) + ' Manage billing</button></div><div class="list">' + I.map(function (i) { return '<div class="row"><span class="grow"><b>' + U.date(i.at) + '</b><small>' + c.plan + ' plan</small></span>' + (i.status === 'paid' ? '<span class="pill green">Paid</span>' : '<span class="pill red">Failed</span>') + '<b style="width:60px;text-align:right">' + U.money(i.amount) + '</b></div>'; }).join('') + '</div><small class="muted">Payments run through Stripe. STOOP never sees your card number.</small></div>' +
        '<div class="card"><div class="card-h"><h3>Own it outright</h3></div><p class="muted" style="margin:0;line-height:1.6">You can buy out your site at any time. Ask your designer for your buyout price and we’ll hand over everything.</p></div>';
      ['#portal', '#fix'].forEach(function (s) { var b = U.$(s, el); if (b) b.addEventListener('click', function () { U.toast('Opens Stripe’s secure billing page once Stripe is connected'); }); });
    });
  }

  /* ---------- Settings ---------- */
  function settings(el, ctx, c) {
    ctx.title('Settings');
    Promise.all([API.grant(c.id), API.accessLog(c.id)]).then(function (r) {
      var g = r[0], L = r[1];
      el.innerHTML = '<div class="card"><div class="card-h"><h3>Support access</h3>' + (g ? '<span class="pill green">' + icon('unlock', 13) + ' On</span>' : '<span class="pill">' + icon('lock', 13) + ' Off</span>') + '</div>' +
        '<p class="muted" style="margin:0;line-height:1.6">Your customers’ names, bookings, orders and chats are private. STOOP only sees totals. If you want your designer to look into something, turn on access for a set time. It turns off on its own, and every look is listed below.</p>' +
        (g ? '<div class="access">' + icon('unlock', 18) + '<span class="grow">STOOP can see your customer info until <b>' + U.date(g.expires, true) + '</b>.</span>' + (ro() ? '' : '<button class="btn sm" id="revoke">Turn off now</button>') + '</div>'
          : (ro() ? '' : '<div class="filters"><span style="font-weight:600;font-size:14px">Give STOOP access for</span><button class="btn sm" data-h="24">24 hours</button><button class="btn sm" data-h="72">3 days</button><button class="btn sm" data-h="168">7 days</button></div>')) + '</div>' +
        '<div class="card"><div class="card-h"><h3>Who looked at your customer info</h3></div>' + (L.length ? '<div class="tbl-wrap"><table><thead><tr><th>WHO</th><th>OPENED</th><th>WHEN</th></tr></thead><tbody>' + L.slice(0, 15).map(function (l) { return '<tr><td>' + esc(l.who) + '</td><td>' + esc(l.area) + '</td><td>' + U.date(l.at, true) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">No one from STOOP has opened your customer info.</div>') + '</div>' +
        '<div class="grid g2"><div class="card"><div class="card-h"><h3>Business</h3></div><div class="kv"><span>Name</span><b>' + esc(c.name) + '</b><span>Owner</span><b>' + esc(c.owner) + '</b><span>Email</span><b>' + esc(c.email) + '</b><span>Phone</span><b>' + esc(c.phone) + '</b><span>Website</span><b>' + esc(c.domain || 'In build') + '</b></div><small class="muted">Need to change something here? Text your designer.</small></div>' +
        '<div class="card"><div class="card-h"><h3>Team</h3>' + (ro() ? '' : '<button class="btn sm" id="invite">' + icon('plus', 14) + ' Invite</button>') + '</div><div class="list"><div class="row"><span class="av sm">' + U.initials(c.owner) + '</span><span class="grow"><b>' + esc(c.owner) + '</b><small>Owner · everything</small></span></div></div><small class="muted">Staff can see leads, bookings and chat, but not billing.</small></div></div>' +
        (ro() ? '' : '<div class="card"><div class="card-h"><h3>Alerts</h3></div><span class="toggle on" data-t>' + '<i></i>Text me new leads and chats</span><span class="toggle on" data-t><i></i>Email me a weekly summary</span><span class="toggle" data-t><i></i>Text me every new order</span></div>');
      U.on(el, '[data-h]', 'click', function (e, b) { API.giveAccess(c.id, +b.dataset.h).then(function () { U.toast('STOOP can see your customer info for ' + b.textContent); ctx.refresh(); }); });
      var rv = U.$('#revoke', el); if (rv) rv.addEventListener('click', function () { API.revokeAccess(c.id).then(function () { U.toast('Support access turned off'); ctx.refresh(); }); });
      var inv = U.$('#invite', el); if (inv) inv.addEventListener('click', function () { U.toast('Staff invites arrive with the live version'); });
      U.on(el, '[data-t]', 'click', function (e, t) { t.classList.toggle('on'); });
    });
  }

  function automations(el, ctx, c) {
    ctx.title('Automations');
    Promise.all([API.automations(c.id), API.texts(c.id)]).then(function (r) {
      var A = r[0], T = r[1], pct = T.limit ? Math.min(100, Math.round(T.used / T.limit * 100)) : 0;
      var vars = ['{business}', '{service}', '{date}', '{link}'];
      function preview(t) { return esc(t).replace(/\{business\}/g, esc(c.name)).replace(/\{service\}/g, '90-min massage').replace(/\{date\}/g, 'Fri at 10:00 AM').replace(/\{link\}/g, (c.domain || 'yoursite.com') + '/book'); }
      el.innerHTML = '<div class="grid g21"><div class="card" style="gap:10px"><h3>Texts that send themselves</h3><p class="muted" style="margin:0;line-height:1.6">Turn on what you want, tweak the wording, and your customers hear from you at the right moment. Customers have to opt in, and replying STOP always works.</p>' + roNote() + '</div>' +
        '<div class="card kpi"><span>Texts this month</span><strong>' + T.used + (T.limit ? '<span class="muted" style="font-size:16px;font-weight:500"> / ' + T.limit + '</span>' : '') + '</strong><div class="bar"><i style="width:' + pct + '%"></i></div><small>' + (T.limit ? 'Included with ' + c.plan + '. Resets on the 1st.' : 'Texting comes with monthly plans.') + '</small></div></div>' +
        '<div class="autos">' + A.map(function (a) {
          return '<div class="auto' + (a.on ? ' on' : '') + '" data-k="' + a.key + '"><div class="auto-h"><span class="ic' + (a.on ? '' : ' gray') + '">' + icon(a.icon, 17) + '</span><div class="grow"><b>' + a.name + '</b><small>' + a.when + (a.on && a.sent ? ' · sent ' + a.sent + ' this month' : '') + '</small></div>' +
            '<span class="toggle' + (a.on ? ' on' : '') + (ro() ? ' dis' : '') + '" data-tg role="switch" aria-checked="' + a.on + '" aria-label="' + a.name + '"><i></i></span></div>' +
            (a.owner ? '<div class="auto-b"><div class="bub" style="max-width:100%">' + esc(c.name) + ' this week: 602 visitors · 9 leads · 12 bookings. Reply with any changes for your designer.</div><small class="muted">Sent to you at ' + esc(c.phone) + '.</small></div>'
              : '<div class="auto-b"><div class="bub" style="max-width:100%">' + preview(a.text) + '</div>' + (ro() ? '' : '<button class="link" data-ed>Edit message</button><div class="auto-ed" hidden><textarea>' + esc(a.text) + '</textarea><div class="qr">' + vars.map(function (v) { return '<button data-v="' + v + '">' + v + '</button>'; }).join('') + '</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm primary" data-save>Save</button><button class="btn sm" data-test>Send me a test</button><button class="btn sm ghost" data-reset>Reset</button></div></div>') + '</div>') + '</div>';
        }).join('') + '</div>';
      if (ro()) return;
      U.on(el, '[data-tg]', 'click', function (e, t) {
        var card = t.closest('.auto'), k = card.dataset.k, on = !card.classList.contains('on');
        API.setAutomation(c.id, k, { on: on }).then(function () { U.toast((on ? 'On: ' : 'Off: ') + card.querySelector('b').textContent); ctx.refresh(); });
      });
      ['keyup', 'click', 'blur', 'select'].forEach(function (ev) { el.addEventListener(ev, function (e) { if (e.target.matches && e.target.matches('.auto-ed textarea')) e.target.dataset.pos = e.target.selectionStart; }, true); });
      U.on(el, '[data-ed]', 'click', function (e, b) { var ed = b.nextElementSibling; ed.hidden = !ed.hidden; b.textContent = ed.hidden ? 'Edit message' : 'Close editor'; });
      U.on(el, '[data-v]', 'click', function (e, b) { var ta = b.closest('.auto-ed').querySelector('textarea'); var p = ta.dataset.pos != null && ta.dataset.pos !== '' ? +ta.dataset.pos : ta.value.length, pre = ta.value.slice(0, p), ins = (pre && !/\s$/.test(pre) ? ' ' : '') + b.dataset.v; ta.value = pre + ins + ta.value.slice(p); ta.setSelectionRange(p + ins.length, p + ins.length); ta.dataset.pos = p + ins.length; ta.focus(); });
      U.on(el, '[data-save]', 'click', function (e, b) { var card = b.closest('.auto'); API.setAutomation(c.id, card.dataset.k, { text: card.querySelector('textarea').value }).then(function () { U.toast('Message saved'); ctx.refresh(); }); });
      U.on(el, '[data-test]', 'click', function () { U.toast('Test text sent to ' + c.phone); });
      U.on(el, '[data-reset]', 'click', function (e, b) { var card = b.closest('.auto'), def = A.find(function (a) { return a.key === card.dataset.k; }); card.querySelector('textarea').value = def ? def.def : ''; });
    });
  }

  window.CLIENT = { badges: badges, views: { overview: overview, leads: leads, bookings: bookings, orders: orders, chat: chat, designer: designer, billing: billing, settings: settings, automations: automations } };
})();
