/* client dashboard template: one template, modules switch on by tools */
(function () {
  var U = UI, icon = U.icon, esc = U.esc, D = 864e5;
  var DESIGNER_SMS = '+15550107867', DESIGNER_SHOW = '(555) 010-7867';
  function ro() { return API.user().role === 'admin'; }
  function kpi(label, val, sub) { return '<div class="card kpi"><span>' + label + '</span><strong>' + val + '</strong><small>' + sub + '</small></div>'; }
  function kpiLink(label, val, sub, href) { return '<a class="card kpi" href="' + href + '"><span>' + label + '</span><strong>' + val + '</strong><small>' + sub + '</small><span class="go">' + icon('arrow', 16) + '</span></a>'; }
  function has(c, t) { return c.tools.indexOf(t) > -1; }
  function sells(c) { return has(c, 'store') || has(c, 'gift'); }
  function sel(id, val, opts, dis) { return '<select data-id="' + id + '"' + (dis ? ' disabled' : '') + '>' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; }
  function roNote() { return ro() ? '<span class="sample">READ-ONLY SUPPORT VIEW</span>' : ''; }
  function sum(a, k) { return a.reduce(function (s, x) { return s + (k ? x[k] : x); }, 0); }
  function smsHref(body) { return 'sms:' + DESIGNER_SMS + (body ? '?&body=' + encodeURIComponent(body) : ''); }
  function textBtn(full) { return '<a class="btn primary' + (full ? ' block' : '') + '" href="' + smsHref('') + '">' + icon('chat', 16) + ' Text your designer</a>'; }
  function acts(phone, email, extra) {
    var p = String(phone || '').replace(/[^0-9+]/g, '');
    return '<div class="acts">' + (p ? '<a class="act" href="tel:' + p + '" title="Call" aria-label="Call">' + icon('phone', 16) + '</a><a class="act" href="sms:' + p + '" title="Text" aria-label="Text">' + icon('chat', 16) + '</a>' : '') + '<a class="act" href="mailto:' + esc(email) + '" title="Email" aria-label="Email">' + icon('mail', 16) + '</a>' + (extra || '') + '</div>';
  }
  function wireActs(el, c) {
    U.on(el, '[data-rev]', 'click', function (e, b) { API.logText(c.id, 'review').then(function () { U.toast('Review request texted to ' + b.dataset.rev.split(' ')[0]); }); });
    U.on(el, '[data-rebook]', 'click', function (e, b) { API.logText(c.id, 'rebook').then(function () { U.toast('Rebook link texted to ' + b.dataset.rebook.split(' ')[0]); }); });
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
  function dayPts(S, key, fmt) { key = key || 'visitors'; return S.map(function (s) { return { value: s[key] || 0, show: fmt ? fmt(s[key] || 0) : String(s[key] || 0), label: U.dayLabel(s.d), full: U.dayFull(s.d) }; }); }

  function badges(c) {
    return Promise.all([API.leads(c.id), has(c, 'chat') ? API.chats(c.id) : Promise.resolve({ rows: [] }), has(c, 'booking') ? API.bookings(c.id) : Promise.resolve({ rows: [] })]).then(function (r) {
      var td = new Date().toDateString();
      return { leads: (r[0].rows || []).filter(function (l) { return l.status === 'new'; }).length, chat: (r[1].rows || []).filter(function (x) { return x.open; }).length, bookings: (r[2].rows || []).filter(function (b) { return b.status !== 'cancelled' && new Date(b.when).toDateString() === td; }).length };
    });
  }

  /* ---------- Overview ---------- */
  function overview(el, ctx, c, base) {
    ctx.title('Overview');
    Promise.all([API.roi(c.id), API.closed(c.id), API.leads(c.id), has(c, 'booking') ? API.bookings(c.id) : Promise.resolve({ rows: [] }), sells(c) ? API.orders(c.id) : Promise.resolve({ rows: [] }), API.requests(c.id), API.site(c.id), API.analytics(c.id)]).then(function (r) {
      var roi = r[0], closed = r[1], L = r[2].rows || [], B = r[3].rows || [], O = r[4].rows || [], R = r[5], s = r[6] || {}, S = r[7];
      if (!ro()) ctx.actions(closed ? '<button class="btn" id="reopen">' + icon('moon', 16) + '<span class="lbl">Reopen</span></button>' : '<button class="btn" id="closeBtn">' + icon('moon', 16) + '<span class="lbl">Closed today</span></button>');
      var cb = document.getElementById('closeBtn'); if (cb) cb.addEventListener('click', function () { closedDrawer(c, ctx); });
      var rb = document.getElementById('reopen'); if (rb) rb.addEventListener('click', function () { API.setClosed(c.id, null).then(function () { U.toast('You’re open again.'); ctx.refresh(); }); });
      var S7 = S.slice(-7), v7 = sum(S7, 'visitors'), v30 = sum(S, 'visitors'), prev7 = sum(S.slice(-14, -7), 'visitors');
      var trend = prev7 ? Math.round((v7 - prev7) / prev7 * 100) : 0;
      var openReq = R.filter(function (x) { return x.status !== 'live'; });
      var k = [kpiLink('Visitors this week', v7, trend >= 0 ? '<span class="up">▲ ' + trend + '% vs last week</span>' : '<span class="down">▼ ' + Math.abs(trend) + '% vs last week</span>', base + 'analytics'),
        kpiLink('New leads', L.filter(function (l) { return l.status === 'new'; }).length, L.length + ' total', base + 'leads')];
      if (sells(c)) k.push(kpiLink('Sales', U.money(roi.sales), O.length + ' orders, last 30 days', base + 'orders'));
      else if (has(c, 'booking')) { var upB = B.filter(function (b) { return b.status !== 'cancelled' && new Date(b.when) > Date.now() && new Date(b.when) - Date.now() < 7 * D; }); k.push(kpiLink('Bookings, next 7 days', upB.length, U.money(sum(upB, 'deposit')) + ' in deposits', base + 'bookings')); }
      else k.push(kpiLink('Leads, 30 days', sum(S, 'leads'), 'from your site', base + 'analytics'));
      k.push(kpiLink('Requests with your designer', openReq.length, openReq.length ? openReq.filter(function (x) { return x.status === 'review' && !x.approved; }).length + ' need your OK' : 'all done', base + 'designer'));
      var act = [];
      L.forEach(function (l) { act.push([l.at, 'inbox', 'New lead: ' + l.name, l.source + ' · ' + l.detail, 'leads']); });
      O.forEach(function (o) { act.push([o.at, 'bag', 'Order: ' + U.money(o.total), o.customer + ' · ' + o.items, 'orders']); });
      B.filter(function (b) { var t = new Date(b.when) - Date.now(); return t > 0 && t < 4 * D && b.status !== 'cancelled'; }).slice(0, 6).forEach(function (b, i) { act.push([new Date(Date.now() - (i + 1) * 5 * 3600e3).toISOString(), 'cal', 'Booked: ' + b.service, b.customer + ' · ' + U.date(b.when, true), 'bookings']); });
      R.forEach(function (x) { act.push([x.status === 'live' ? x.done : x.created, x.status === 'live' ? 'check' : 'phone', x.status === 'live' ? 'Live on your site' : 'Sent to your designer', x.text, 'designer']); });
      act.sort(function (a, b) { return a[0] < b[0] ? 1 : -1; });
      var weekly = esc(c.name) + ' this week: ' + v7 + ' visitors · ' + sum(S7, 'leads') + ' leads' + (has(c, 'booking') ? ' · ' + sum(S7, 'bookings') + ' bookings' : '') + (sells(c) ? ' · ' + U.money(sum(S7, 'sales')) + ' in sales' : '') + '. Reply with any changes for your designer.';
      el.innerHTML = (closed ? '<div class="access warn">' + icon('moon', 18) + '<span class="grow"><b>Closed today' + (closed.reason ? ' · ' + esc(closed.reason) : '') + '.</b> Your site shows a closed banner, booking is paused and chat replies with your hours. Reopens on its own tomorrow.</span></div>' : '') +
        (c.status === 'building' ? '<div class="access" style="background:var(--soft);color:var(--deep)">' + icon('build', 18) + '<span class="grow"><b>Your site is being built.</b> Your designer will text you when the first draft is ready. Numbers start once it’s live.</span></div>'
          : '<div class="grid g21"><a class="card roi" href="' + base + (sells(c) ? 'orders' : has(c, 'booking') ? 'bookings' : 'analytics') + '"><span class="roi-l">Your site brought in</span><strong>' + U.money(roi.total) + '</strong><span class="roi-s">last 30 days' + (roi.sales ? ' · ' + U.money(roi.sales) + ' in sales' : '') + (roi.deposits ? ' · ' + U.money(roi.deposits) + ' in deposits' : '') + ' · ' + roi.leads + ' leads' + (has(c, 'booking') ? ' · ' + roi.bookings + ' bookings' : '') + '</span></a>' +
            '<div class="card"><div class="card-h"><h3>Your Monday text</h3><span class="sample">WEEKLY SUMMARY</span></div><div class="bub" style="max-width:100%">' + weekly + '</div></div></div>') +
        '<div class="grid g4">' + k.join('') + '</div>' +
        '<div class="grid g21"><div class="card"><div class="card-h"><h3>Visitors</h3><div class="seg2" id="vr"><button data-r="7" class="on">7 days · ' + v7 + '</button><button data-r="30">30 days · ' + v30 + '</button></div></div><div id="vchart">' + U.bars(dayPts(S7)) + '</div><small class="muted">Tap a day to see its number.</small></div>' +
        '<a class="card" href="' + base + 'analytics#health"><div class="card-h"><h3>Site health</h3>' + (s.uptime != null ? '<span class="pill green">All good</span>' : '<span class="pill orange">In build</span>') + '</div>' +
        (s.uptime != null ? '<div class="mini"><span>Uptime</span><b>' + s.uptime + '%</b>' + U.spark(S.map(function (x) { return x.uptime || 99; }), '#1F6B34') + '</div><div class="mini"><span>Speed</span><b>' + s.speed + '</b>' + U.spark(S.map(function (x) { return x.speed || 90; })) + '</div><div class="kv"><span>Security</span><b>Active</b><span>Last update</span><b>' + U.rel(s.deploy) + '</b></div>' : '<p class="muted" style="margin:0">Health checks start when your site goes live.</p>') + '</a></div>' +
        '<div class="grid g21"><div class="card"><div class="card-h"><h3>Live activity</h3><span class="muted" style="font-size:12.5px">' + act.length + ' updates</span></div><div class="list scroll-list">' + (act.length ? act.map(function (a) { return '<a class="row" href="' + base + a[4] + '"><span class="ic">' + icon(a[1], 16) + '</span><span class="grow"><b>' + esc(a[2]) + '</b><small>' + esc(a[3]) + '</small></span><small>' + U.rel(a[0]) + '</small></a>'; }).join('') : '<div class="empty">Activity shows up here once your site is live.</div>') + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Your designer</h3><a href="' + base + 'designer">All requests</a></div>' + (openReq.length ? openReq.slice(0, 3).map(function (x) { return '<div style="display:flex;flex-direction:column;gap:6px;padding-bottom:10px;border-bottom:1px solid #F3EFEA"><b style="font-size:14px">' + esc(x.text) + '</b>' + approveBits(x) + '</div>'; }).join('') : '<p class="muted" style="margin:0">No open requests.</p>') + (ro() ? '' : textBtn(true)) + '</div></div>';
      U.on(el, '#vr button', 'click', function (e, b) { U.$$('#vr button', el).forEach(function (x) { x.classList.toggle('on', x === b); }); var pts = dayPts(b.dataset.r === '7' ? S7 : S); U.$('#vchart', el).innerHTML = U.bars(pts, { every: b.dataset.r === '7' ? 1 : 5 }); });
      wireApprove(el, ctx);
    });
  }
  function closedDrawer(c, ctx) {
    var reasons = ['Holiday', 'Weather', 'Sick day', 'Private event', 'Other'], pick = reasons[0];
    U.openDrawer('<div class="dr-h"><h3>Close for today?</h3><button class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button></div><div class="dr-b">' +
      '<div style="display:flex;flex-direction:column;gap:8px"><span class="muted" style="font-size:13px;font-weight:500">Reason (shown on your site)</span><div class="steps-sel" id="cr">' + reasons.map(function (r, i) { return '<button' + (i === 0 ? ' class="on"' : '') + '>' + r + '</button>'; }).join('') + '</div></div>' +
      '<div class="card" style="gap:10px;background:#FAF8F5"><b>What changes right away</b>' + ['A “Closed today” banner on your site', 'Today’s booking slots are paused', 'Chat and missed calls get an auto-reply with your hours', 'Everything reopens on its own tomorrow'].map(function (t) { return '<div style="display:flex;gap:10px;font-size:14px"><span style="color:var(--green)">' + icon('check', 16) + '</span>' + t + '</div>'; }).join('') + '</div></div>' +
      '<div class="dr-f"><button class="btn" data-close>Cancel</button><button class="btn primary" id="cgo">' + icon('moon', 16) + ' Close for today</button></div>', function (d) {
      U.$$('[data-close]', d).forEach(function (x) { x.addEventListener('click', U.closeDrawer); });
      U.on(d, '#cr button', 'click', function (e, b) { pick = b.textContent; U.$$('#cr button', d).forEach(function (q) { q.classList.toggle('on', q === b); }); });
      U.$('#cgo', d).addEventListener('click', function () { API.setClosed(c.id, pick).then(function () { U.closeDrawer(); U.toast('Closed for today. Your site is updated.'); ctx.refresh(); }); });
    });
  }

  /* ---------- Analytics ---------- */
  function analytics(el, ctx, c) {
    ctx.title('Analytics');
    Promise.all([API.analytics(c.id), API.pages(c.id), API.site(c.id)]).then(function (r) {
      var S = r[0], P = r[1], site = r[2] || {}, range = 30, metric = 'visitors';
      var M = [['visitors', 'Visitors', null], ['leads', 'Leads', null]];
      if (has(c, 'booking')) M.push(['bookings', 'Bookings', null]);
      if (sells(c)) M.push(['sales', 'Sales', function (v) { return U.money(v); }]);
      function draw() {
        var R = S.slice(-range), prev = S.slice(-range * 2, -range), m = M.find(function (x) { return x[0] === metric; });
        var tv = sum(R, 'visitors'), tl = sum(R, 'leads'), conv = tv ? (tl / tv * 100).toFixed(1) : '0.0';
        var src = { google: 0, maps: 0, social: 0, direct: 0 }; R.forEach(function (x) { Object.keys(src).forEach(function (k) { src[k] += x.src[k]; }); });
        var stot = sum(Object.keys(src).map(function (k) { return src[k]; })) || 1;
        var up = R.filter(function (x) { return x.uptime != null; }), avgUp = up.length ? (sum(up, 'uptime') / up.length).toFixed(2) : null;
        el.innerHTML = '<div class="filters"><div class="seg2" id="rg"><button data-r="7"' + (range === 7 ? ' class="on"' : '') + '>7 days</button><button data-r="30"' + (range === 30 ? ' class="on"' : '') + '>30 days</button></div><span class="muted" style="font-size:13px">Tap a card to chart it. Tap a bar to read it.</span></div>' +
          '<div class="grid g4">' + M.map(function (x) { var v = sum(R, x[0]), pv = sum(prev, x[0]), ch = pv ? Math.round((v - pv) / pv * 100) : 0; return '<button class="card kpi' + (x[0] === metric ? ' on' : '') + '" data-m="' + x[0] + '"><span>' + x[1] + '</span><strong>' + (x[2] ? x[2](v) : v) + '</strong><small class="' + (ch >= 0 ? 'up' : 'down') + '">' + (prev.length ? (ch >= 0 ? '▲ ' : '▼ ') + Math.abs(ch) + '% vs previous ' + range + ' days' : 'last ' + range + ' days') + '</small></button>'; }).join('') +
          (M.length < 4 ? '<div class="card kpi"><span>Visitor to lead rate</span><strong>' + conv + '%</strong><small>' + tl + ' leads from ' + tv + ' visitors</small></div>' : '') + '</div>' +
          '<div class="card"><div class="card-h"><h3>' + m[1] + ' by day</h3><span class="sample">' + range + ' DAYS · ' + (m[2] ? m[2](sum(R, metric)) : sum(R, metric)) + ' TOTAL</span></div>' + U.bars(dayPts(R, metric, m[2]), { every: range > 7 ? 5 : 1, h: 170 }) + '</div>' +
          '<div class="grid g2"><div class="card"><div class="card-h"><h3>Where visitors come from</h3></div><div class="hbars">' + [['google', 'Google search'], ['maps', 'Google Maps'], ['social', 'Social media'], ['direct', 'Direct']].map(function (x) { var p = Math.round(src[x[0]] / stot * 100); return '<div class="hbar"><span>' + x[1] + '</span><span class="t"><i style="width:' + p + '%"></i></span><b>' + p + '%</b></div>'; }).join('') + '</div></div>' +
          '<div class="card"><div class="card-h"><h3>Top pages</h3></div><div class="hbars">' + P.map(function (p) { return '<div class="hbar"><span>' + esc(p.name) + '</span><span class="t"><i style="width:' + p.share + '%"></i></span><b>' + p.share + '%</b></div>'; }).join('') + '</div></div></div>' +
          '<div class="card" id="health"><div class="card-h"><h3>Site health</h3>' + (avgUp ? '<span class="pill green">All good</span>' : '<span class="pill orange">In build</span>') + '</div>' +
          (avgUp ? '<div class="grid g4" style="gap:12px"><div class="mini-k"><span>Uptime</span><b>' + avgUp + '%</b></div><div class="mini-k"><span>Speed score</span><b>' + site.speed + '</b></div><div class="mini-k"><span>Security</span><b>Active</b></div><div class="mini-k"><span>Last update</span><b>' + U.rel(site.deploy) + '</b></div></div>' +
            '<div class="grid g2"><div><span class="muted" style="font-size:13px;font-weight:500">Uptime by day</span>' + U.bars(R.map(function (x) { return { value: (x.uptime || 99) - 98, show: (x.uptime || 0) + '%', label: U.dayLabel(x.d), full: U.dayFull(x.d) }; }), { every: range > 7 ? 5 : 1, h: 110 }) + '</div>' +
            '<div><span class="muted" style="font-size:13px;font-weight:500">Speed score</span>' + U.line(R.map(function (x) { return { value: x.speed || 0, show: String(x.speed), label: U.dayLabel(x.d), full: U.dayFull(x.d) }; }), { every: range > 7 ? 5 : 1, h: 110 }) + '</div></div>' : '<p class="muted" style="margin:0">Health checks start when your site goes live.</p>') + '</div>';
      }
      U.on(el, '#rg button', 'click', function (e, b) { range = +b.dataset.r; draw(); });
      U.on(el, '[data-m]', 'click', function (e, b) { metric = b.dataset.m; draw(); });
      draw();
      if (location.hash.indexOf('#health') > -1) setTimeout(function () { var h = U.$('#health', el); if (h) h.scrollIntoView({ behavior: 'smooth' }); }, 200);
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
        el.innerHTML = '<div class="nowrap-row" id="lf">' + [['all', 'All'], ['new', 'New'], ['contacted', 'Contacted'], ['won', 'Won'], ['lost', 'Lost']].map(function (x) { var n = x[0] === 'all' ? L.length : L.filter(function (l) { return l.status === x[0]; }).length; return '<button class="btn sm' + (f === x[0] ? ' dark' : '') + '" data-f="' + x[0] + '">' + x[1] + ' <span class="cnt">' + n + '</span></button>'; }).join('') + roNote() + '</div>' +
          (list.length ? '<div class="tbl-wrap"><table><thead><tr><th>FROM</th><th>CAME IN THROUGH</th><th>DETAILS</th><th>WHEN</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>' + list.map(function (l) { return '<tr><td><b>' + esc(l.name) + '</b><small>' + esc(l.phone) + ' · ' + esc(l.email) + '</small></td><td><span class="pill">' + esc(l.source) + '</span></td><td>' + esc(l.detail) + '</td><td>' + U.rel(l.at) + '</td><td>' + sel(l.id, l.status, [['new', 'New'], ['contacted', 'Contacted'], ['won', 'Won'], ['lost', 'Lost']], ro()) + '</td><td>' + acts(l.phone, l.email, l.status === 'won' && !ro() ? '<button class="act" data-rev="' + esc(l.name) + '" title="Ask for a review" aria-label="Ask for a review">' + icon('star', 16) + '</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">No leads here.</div>');
      }
      U.on(el, '#lf button', 'click', function (e, b) { f = b.dataset.f; draw(); });
      wireActs(el, c);
      el.addEventListener('change', function (e) { var s = e.target.closest('select[data-id]'); if (!s) return; API.updateLead(s.dataset.id, s.value).then(function (l) { if (l) { L.find(function (x) { return x.id === l.id; }).status = l.status; U.toast('Lead marked ' + l.status); draw(); } }); });
      draw();
    });
  }

  /* ---------- Bookings: calendar, day agenda, today/upcoming/past ---------- */
  var BST = { confirmed: ['Confirmed', 'green'], reminder: ['Reminder sent', ''], completed: ['Completed', 'dark'], noshow: ['No-show', 'red'], cancelled: ['Cancelled', 'amber'] };
  function bpill(s) { var x = BST[s] || [s, '']; return '<span class="pill ' + x[1] + '">' + x[0] + '</span>'; }
  function dkey(d) { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fromKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function tm(iso) { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  var OPEN_H = 9, CLOSE_H = 18;
  function openSlots(B, day, mins, blocked, skipId) {
    var d = fromKey(day), out = [];
    if (d.getDay() === 0 || blocked.indexOf(day) > -1) return out;
    var taken = B.filter(function (b) { return dkey(b.when) === day && b.status !== 'cancelled' && b.id !== skipId; }).map(function (b) { var s = new Date(b.when).getTime(); return [s, s + (b.mins || 60) * 60e3]; });
    for (var h = OPEN_H; h + mins / 60 <= CLOSE_H; h += 0.5) {
      var s = new Date(d); s.setHours(Math.floor(h), h % 1 ? 30 : 0, 0, 0); var st = s.getTime(), en = st + mins * 60e3;
      if (st < Date.now()) continue;
      if (taken.some(function (t) { return st < t[1] && en > t[0]; })) continue;
      out.push(s.toISOString());
    }
    return out;
  }
  function bookings(el, ctx, c, base, rest) {
    ctx.title('Bookings');
    Promise.all([API.bookings(c.id), API.services(c.id), API.blocks(c.id)]).then(function (r) {
      var B = r[0].rows || [], SV = r[1], BL = r[2].slice(), today = dkey(new Date());
      var view = 'cal', sel = today, month = new Date(); month.setDate(1);
      if (!ro()) ctx.actions('<button class="btn" id="blkBtn">' + icon('moon', 16) + '<span class="lbl">Block time</span></button><button class="btn primary" id="newBk">' + icon('plus', 16) + '<span class="lbl">New booking</span></button>');
      function live(b) { return b.status !== 'cancelled'; }
      function on(day) { return B.filter(function (b) { return dkey(b.when) === day; }).sort(function (a, b2) { return a.when < b2.when ? -1 : 1; }); }
      function card(b, compact) {
        var past = new Date(b.when) < new Date(), end = new Date(new Date(b.when).getTime() + (b.mins || 60) * 60e3);
        return '<button class="bk' + (b.status === 'cancelled' ? ' off' : '') + (compact ? ' sm' : '') + '" data-b="' + b.id + '"><span class="bk-t"><b>' + tm(b.when) + '</b><small>' + tm(end.toISOString()) + '</small></span><span class="bk-m"><b>' + esc(b.customer) + '</b><small>' + esc(b.service) + (b.deposit ? ' · ' + U.money(b.deposit) + ' deposit' : '') + '</small></span>' + bpill(b.status) + '</button>';
      }
      function kpis() {
        var now = Date.now(), tdy = on(today).filter(live), next = B.filter(function (b) { return live(b) && new Date(b.when) > now; }).sort(function (a, b2) { return a.when < b2.when ? -1 : 1; })[0];
        var wk = B.filter(function (b) { var t = new Date(b.when) - now; return live(b) && t > 0 && t < 7 * D; });
        var up = B.filter(function (b) { var t = new Date(b.when) - now; return live(b) && t > 0 && t < 30 * D; });
        var past30 = B.filter(function (b) { var t = now - new Date(b.when); return t > 0 && t < 30 * D; }), ns = past30.filter(function (b) { return b.status === 'noshow'; }).length;
        return '<div class="grid g4">' +
          '<button class="card kpi' + (view === 'today' ? ' on' : '') + '" data-view="today"><span>Today</span><strong>' + tdy.length + '</strong><small>' + (next ? 'Next: ' + (dkey(next.when) === today ? '' : U.date(next.when) + ' ') + tm(next.when) + ' · ' + esc(next.customer.split(' ')[0]) : 'Nothing booked') + '</small></button>' +
          '<button class="card kpi' + (view === 'upcoming' ? ' on' : '') + '" data-view="upcoming"><span>Next 7 days</span><strong>' + wk.length + '</strong><small>' + U.money(sum(wk, 'deposit')) + ' in deposits</small></button>' +
          '<button class="card kpi' + (view === 'cal' ? ' on' : '') + '" data-view="cal"><span>Booked, next 30 days</span><strong>' + up.length + '</strong><small>' + U.money(sum(up, 'price')) + ' expected</small></button>' +
          '<button class="card kpi' + (view === 'past' ? ' on' : '') + '" data-view="past"><span>No-show rate</span><strong>' + (past30.length ? Math.round(ns / past30.length * 100) : 0) + '%</strong><small>' + ns + ' of ' + past30.length + ' in 30 days · reminders on</small></button></div>';
      }
      function calendar() {
        var y = month.getFullYear(), m = month.getMonth(), first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay()), cells = '';
        for (var i = 0; i < 42; i++) {
          var d = new Date(start); d.setDate(start.getDate() + i); var k = dkey(d), n = on(k).filter(live).length, blk = BL.indexOf(k) > -1, closed = d.getDay() === 0;
          var lvl = n === 0 ? '' : n <= 1 ? ' l1' : n <= 3 ? ' l2' : ' l3';
          cells += '<button class="cd' + (d.getMonth() !== m ? ' out' : '') + (k === today ? ' tdy' : '') + (k === sel ? ' sel' : '') + (blk ? ' blk' : '') + (closed ? ' cls' : '') + lvl + '" data-day="' + k + '" aria-label="' + d.toDateString() + ', ' + n + ' bookings"><span class="cd-n">' + d.getDate() + '</span>' + (n ? '<span class="cd-c">' + n + '</span>' : blk ? '<span class="cd-x">Blocked</span>' : '') + '</button>';
        }
        return '<div class="card cal-card"><div class="cal-h"><button class="icon-btn" data-mo="-1" aria-label="Previous month">' + icon('arrow', 16).replace('<svg', '<svg style="transform:rotate(180deg)"') + '</button><h3>' + first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '</h3><button class="icon-btn" data-mo="1" aria-label="Next month">' + icon('arrow', 16) + '</button><button class="btn sm" data-mo="0">Today</button></div>' +
          '<div class="cal-g">' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (w) { return '<span class="cal-w">' + w.slice(0, window.innerWidth < 560 ? 1 : 3) + '</span>'; }).join('') + cells + '</div>' +
          '<div class="legend"><span><i class="lg l1"></i>1</span><span><i class="lg l2"></i>2–3</span><span><i class="lg l3"></i>4+</span><span><i class="lg blk"></i>Blocked</span><span><i class="lg cls"></i>Closed</span></div></div>';
      }
      function agenda(day) {
        var d = fromKey(day), list = on(day), blk = BL.indexOf(day) > -1, slots = openSlots(B, day, 60, BL), lv = list.filter(live);
        return '<div class="card agenda" id="agenda"><div class="card-h"><div><h3>' + (day === today ? 'Today · ' : '') + d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) + '</h3><span class="muted" style="font-size:13px">' + lv.length + ' booking' + (lv.length === 1 ? '' : 's') + (lv.length ? ' · ' + U.money(sum(lv, 'deposit')) + ' deposits · ' + U.money(sum(lv, 'price')) + ' expected' : '') + '</span></div>' +
          (ro() || d.getDay() === 0 ? '' : '<button class="btn sm" data-blk="' + day + '">' + (blk ? 'Unblock day' : 'Block day') + '</button>') + '</div>' +
          (d.getDay() === 0 ? '<div class="empty">Closed Sundays.</div>' : blk ? '<div class="access warn">' + icon('moon', 18) + '<span class="grow">This day is blocked. Customers can’t book it online.</span></div>' : '') +
          '<div class="ag-list">' + (list.length ? list.map(function (b) { return card(b); }).join('') : (d.getDay() !== 0 && !blk ? '<div class="empty">No bookings yet.</div>' : '')) + '</div>' +
          (slots.length && !ro() ? '<div><span class="muted" style="font-size:12.5px;font-weight:600">OPEN TIMES · TAP TO BOOK</span><div class="slot-row">' + slots.filter(function (s, i) { return new Date(s).getMinutes() === 0; }).map(function (s) { return '<button class="slot-b" data-slot="' + s + '">' + tm(s) + '</button>'; }).join('') + '</div></div>' : '') + '</div>';
      }
      function listView(items, emptyMsg, group) {
        if (!items.length) return '<div class="empty">' + emptyMsg + '</div>';
        var html = '', last = '';
        items.forEach(function (b) { var k = dkey(b.when); if (group && k !== last) { last = k; html += '<div class="ag-day">' + (k === today ? 'Today' : fromKey(k).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })) + '</div>'; } html += card(b); });
        return '<div class="card"><div class="ag-list">' + html + '</div></div>';
      }
      function render() {
        var now = Date.now(), body;
        if (view === 'cal') body = '<div class="bk-grid">' + calendar() + agenda(sel) + '</div>';
        else if (view === 'today') {
          var tl = on(today), nx = tl.filter(function (b) { return live(b) && new Date(b.when).getTime() + (b.mins || 60) * 60e3 > now; })[0];
          body = (nx ? '<div class="card next-up"><span class="muted" style="font-size:12.5px;font-weight:600">' + (new Date(nx.when) <= now ? 'HAPPENING NOW' : 'NEXT UP · ' + U.rel(nx.when).toUpperCase()) + '</span>' + card(nx) + (ro() ? '' : '<div class="nu-acts">' + acts(nx.phone, nx.email) + '<button class="btn sm" data-remind="' + nx.id + '">' + icon('send', 14) + ' Send reminder</button></div>') + '</div>' : '') + agenda(today);
        } else if (view === 'upcoming') body = listView(B.filter(function (b) { return new Date(b.when) > now && new Date(b.when) - now < 14 * D; }).sort(function (a, b2) { return a.when < b2.when ? -1 : 1; }), 'Nothing booked in the next 14 days.', true);
        else body = listView(B.filter(function (b) { return new Date(b.when) < now && now - new Date(b.when) < 14 * D; }).sort(function (a, b2) { return a.when < b2.when ? 1 : -1; }), 'No past bookings.', true);
        el.innerHTML = kpis() + '<div class="filters"><div class="seg2" id="bv">' + [['cal', 'Calendar'], ['today', 'Today'], ['upcoming', 'Upcoming'], ['past', 'Past']].map(function (v) { return '<button data-view="' + v[0] + '"' + (view === v[0] ? ' class="on"' : '') + '>' + v[1] + '</button>'; }).join('') + '</div>' + roNote() + '</div>' + body;
      }
      function slotPicker(day, mins, skipId, chosen) {
        var s = openSlots(B, day, mins, BL, skipId);
        return s.length ? '<div class="slot-row">' + s.map(function (x) { return '<button type="button" class="slot-b' + (x === chosen ? ' on' : '') + '" data-pick="' + x + '">' + tm(x) + '</button>'; }).join('') + '</div>' : '<p class="muted" style="margin:0;font-size:13.5px">No open times that day.</p>';
      }
      function openBooking(b) {
        var end = new Date(new Date(b.when).getTime() + (b.mins || 60) * 60e3), past = new Date(b.when) < new Date();
        U.openDrawer('<div class="dr-h"><div style="flex:1"><span class="muted" style="font-size:13px">' + U.date(b.when, true) + ' – ' + tm(end.toISOString()) + '</span><h3>' + esc(b.customer) + '</h3></div><button class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button></div>' +
          '<div class="dr-b"><div class="kv"><span>Service</span><b>' + esc(b.service) + ' · ' + (b.mins || 60) + ' min</b><span>Price</span><b>' + U.money(b.price || 0) + '</b><span>Deposit</span><b>' + (b.deposit ? U.money(b.deposit) + ' paid' : 'None') + '</b><span>Phone</span><b>' + esc(b.phone) + '</b><span>Email</span><b>' + esc(b.email) + '</b></div>' +
          (ro() ? '' : acts(b.phone, b.email) +
            '<div style="display:flex;flex-direction:column;gap:8px"><span class="muted" style="font-size:13px;font-weight:500">Status</span><div class="steps-sel" id="bs">' + Object.keys(BST).map(function (k) { return '<button data-s="' + k + '"' + (b.status === k ? ' class="on"' : '') + '>' + BST[k][0] + '</button>'; }).join('') + '</div></div>' +
            (!past && b.status !== 'cancelled' ? '<details id="rsch"><summary>Reschedule</summary><div style="display:flex;flex-direction:column;gap:10px;padding-top:8px"><label class="field">Day<input type="date" id="rd" value="' + dkey(b.when) + '" min="' + today + '"></label><div id="rslots">' + slotPicker(dkey(b.when), b.mins || 60, b.id) + '</div></div></details>' : '') +
            '<label class="field">Notes<textarea id="bn" placeholder="Only you see these">' + esc(b.notes || '') + '</textarea></label>') + '</div>' +
          (ro() ? '' : '<div class="dr-f">' + (past ? '<button class="btn" id="bRev">' + icon('star', 16) + ' Ask for a review</button><button class="btn" id="bRb">' + icon('cal', 16) + ' Text rebook link</button>' : '<button class="btn" id="bRem">' + icon('send', 16) + ' Send reminder</button>' + (b.status !== 'cancelled' ? '<button class="btn" id="bCan">Cancel booking</button>' : '')) + '</div>'), function (d) {
          if (ro()) return;
          U.on(d, '#bs button', 'click', function (e, x) { API.updateBooking(b.id, { status: x.dataset.s }).then(function () { b.status = x.dataset.s; U.$$('#bs button', d).forEach(function (q) { q.classList.toggle('on', q === x); }); render(); U.toast(x.dataset.s === 'completed' ? 'Completed. A review request goes out in 2 hours.' : 'Marked ' + BST[x.dataset.s][0].toLowerCase()); }); });
          var rd = U.$('#rd', d); if (rd) rd.addEventListener('change', function () { U.$('#rslots', d).innerHTML = slotPicker(rd.value, b.mins || 60, b.id); });
          U.on(d, '[data-pick]', 'click', function (e, x) { API.updateBooking(b.id, { when: x.dataset.pick, status: 'confirmed' }).then(function () { b.when = x.dataset.pick; b.status = 'confirmed'; sel = dkey(b.when); month = fromKey(sel); month.setDate(1); U.closeDrawer(); render(); U.toast('Rescheduled to ' + U.date(b.when, true) + '. ' + b.customer.split(' ')[0] + ' got a text.'); }); });
          var bn = U.$('#bn', d); if (bn) bn.addEventListener('change', function () { API.updateBooking(b.id, { notes: bn.value }).then(function () { b.notes = bn.value; U.toast('Notes saved'); }); });
          var x1 = U.$('#bRem', d); if (x1) x1.addEventListener('click', function () { API.logText(c.id, 'book_remind').then(function () { U.toast('Reminder texted to ' + b.customer.split(' ')[0]); }); });
          var x2 = U.$('#bCan', d); if (x2) x2.addEventListener('click', function () { API.updateBooking(b.id, { status: 'cancelled' }).then(function () { b.status = 'cancelled'; U.closeDrawer(); render(); U.toast('Cancelled. ' + b.customer.split(' ')[0] + ' got a text' + (b.deposit ? ' and the deposit refund started' : '') + '.'); }); });
          var x3 = U.$('#bRev', d); if (x3) x3.addEventListener('click', function () { API.logText(c.id, 'review').then(function () { U.toast('Review request texted to ' + b.customer.split(' ')[0]); }); });
          var x4 = U.$('#bRb', d); if (x4) x4.addEventListener('click', function () { API.logText(c.id, 'rebook').then(function () { U.toast('Rebook link texted to ' + b.customer.split(' ')[0]); }); });
        });
      }
      function newBooking(day, slot) {
        var svc = SV[0], pick = slot || null; day = day || sel;
        U.openDrawer('<div class="dr-h"><h3>New booking</h3><button class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button></div><div class="dr-b">' +
          '<div class="fgrid2"><label class="field full">Customer name<input id="nN" placeholder="Full name"></label><label class="field">Phone<input id="nP" type="tel" placeholder="(555) 555-5555"></label><label class="field">Email<input id="nE" type="email" placeholder="Optional"></label></div>' +
          '<div style="display:flex;flex-direction:column;gap:8px"><span class="muted" style="font-size:13px;font-weight:500">Service</span><div class="svc-list" id="nS">' + SV.map(function (s, i) { return '<button type="button" data-i="' + i + '"' + (i === 0 ? ' class="on"' : '') + '><b>' + esc(s.name) + '</b><small>' + s.mins + ' min · ' + U.money(s.price) + '</small></button>'; }).join('') + '</div></div>' +
          '<label class="field">Day<input type="date" id="nD" value="' + day + '" min="' + today + '"></label><div id="nSl"></div>' +
          '<span class="toggle on" id="nDep"><i></i>Collect deposit by text link</span><p class="muted" style="margin:0;font-size:13px">They get a confirmation text right away and a reminder the day before.</p></div>' +
          '<div class="dr-f"><button class="btn primary" id="nGo">Book it</button></div>', function (d) {
          function slots() { U.$('#nSl', d).innerHTML = slotPicker(U.$('#nD', d).value, svc.mins, null, pick); }
          slots();
          U.on(d, '#nS button', 'click', function (e, x) { svc = SV[+x.dataset.i]; U.$$('#nS button', d).forEach(function (q) { q.classList.toggle('on', q === x); }); pick = null; slots(); });
          U.$('#nD', d).addEventListener('change', function () { pick = null; slots(); });
          U.on(d, '[data-pick]', 'click', function (e, x) { pick = x.dataset.pick; U.$$('[data-pick]', d).forEach(function (q) { q.classList.toggle('on', q === x); }); });
          U.$('#nDep', d).addEventListener('click', function () { this.classList.toggle('on'); });
          U.$('#nGo', d).addEventListener('click', function () {
            var n = U.$('#nN', d).value.trim(); if (!n) { U.$('#nN', d).focus(); return U.toast('Add the customer’s name'); }
            if (!pick) return U.toast('Pick a time');
            API.addBooking(c.id, { customer: n, phone: U.$('#nP', d).value.trim(), email: U.$('#nE', d).value.trim(), service: svc.name, when: pick, deposit: U.$('#nDep', d).classList.contains('on') }).then(function (nb) { if (!nb) return; B.push(nb); sel = dkey(nb.when); month = fromKey(sel); month.setDate(1); view = 'cal'; U.closeDrawer(); render(); U.toast('Booked ' + n.split(' ')[0] + ' for ' + U.date(nb.when, true) + '. Confirmation sent.'); });
          });
        });
      }
      U.on(el, '[data-view]', 'click', function (e, b) { view = b.dataset.view; render(); });
      U.on(el, '[data-mo]', 'click', function (e, b) { var v = +b.dataset.mo; if (!v) { month = new Date(); month.setDate(1); sel = today; } else month = new Date(month.getFullYear(), month.getMonth() + v, 1); render(); });
      U.on(el, '[data-day]', 'click', function (e, b) { sel = b.dataset.day; var d = fromKey(sel); if (d.getMonth() !== month.getMonth()) { month = new Date(d.getFullYear(), d.getMonth(), 1); } render(); if (window.innerWidth <= 860) { var a = U.$('#agenda', el); if (a) a.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
      U.on(el, '[data-b]', 'click', function (e, b) { var bk = B.find(function (x) { return x.id === b.dataset.b; }); if (bk) openBooking(bk); });
      U.on(el, '[data-slot]', 'click', function (e, b) { newBooking(dkey(b.dataset.slot), b.dataset.slot); });
      U.on(el, '[data-blk]', 'click', function (e, b) { API.toggleBlock(c.id, b.dataset.blk).then(function (l) { BL = l.slice(); render(); U.toast(BL.indexOf(b.dataset.blk) > -1 ? 'Day blocked. Online booking is off for it.' : 'Day open for booking again.'); }); });
      U.on(el, '[data-remind]', 'click', function (e, b) { var bk = B.find(function (x) { return x.id === b.dataset.remind; }); API.logText(c.id, 'book_remind').then(function () { U.toast('Reminder texted to ' + bk.customer.split(' ')[0]); }); });
      var nb = document.getElementById('newBk'); if (nb) nb.addEventListener('click', function () { newBooking(sel >= today ? sel : today); });
      var bb = document.getElementById('blkBtn'); if (bb) bb.addEventListener('click', function () { var k = sel >= today ? sel : today; API.toggleBlock(c.id, k).then(function (l) { BL = l.slice(); view = 'cal'; render(); U.toast((BL.indexOf(k) > -1 ? 'Blocked ' : 'Unblocked ') + fromKey(k).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })); }); });
      render();
    });
  }

  /* ---------- Orders ---------- */
  function orders(el, ctx, c) {
    ctx.title('Orders');
    API.orders(c.id).then(function (res) {
      var O = (res.rows || []).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
      var total = sum(O, 'total'), toFill = O.filter(function (o) { return o.status === 'paid'; }), recent = O.filter(function (o) { return Date.now() - new Date(o.at) < 2 * D && o.status !== 'refunded'; });
      el.innerHTML = '<div class="grid g4">' + kpi('Sales', U.money(total), 'last 30 days') + kpi('Orders', O.length, toFill.length + ' to fulfill') + kpi('Average order', U.money(O.length ? Math.round(total / O.length) : 0), 'per order') + kpi('Next payout', U.money(sum(recent, 'total')), 'to your bank in 2 business days') + '</div>' +
        '<div class="filters"><span class="muted" style="font-size:13px">Marking an order fulfilled texts the customer that it’s ready.</span>' + roNote() + '</div>' +
        (O.length ? '<div class="tbl-wrap"><table><thead><tr><th>CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>WHEN</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>' + O.map(function (o) { return '<tr><td><b>' + esc(o.customer) + '</b><small>' + esc(o.email) + '</small></td><td>' + esc(o.items) + '</td><td>' + U.money(o.total) + '</td><td>' + U.rel(o.at) + '</td><td>' + sel(o.id, o.status, [['paid', 'Paid · to fulfill'], ['fulfilled', 'Fulfilled'], ['refunded', 'Refunded']], ro()) + '</td><td>' + acts('', o.email) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">No orders yet.</div>');
      el.addEventListener('change', function (e) { var s = e.target.closest('select[data-id]'); if (!s) return; API.updateOrder(s.dataset.id, s.value).then(function () { if (s.value === 'fulfilled') { API.logText(c.id, 'order_ready'); U.toast('Marked fulfilled. “Your order is ready” text sent.'); } else U.toast('Order updated'); }); });
    });
  }

  /* ---------- Customer chat ---------- */
  function chat(el, ctx, c) {
    ctx.title('Customer chat');
    API.chats(c.id).then(function (res) {
      var CH = (res.rows || []).sort(function (a, b) { return a.msgs[a.msgs.length - 1].at < b.msgs[b.msgs.length - 1].at ? 1 : -1; });
      var cur = window.innerWidth > 860 && CH[0] ? CH[0].id : null;
      function draw() {
        var ch = CH.find(function (x) { return x.id === cur; });
        el.innerHTML = '<p class="muted" style="margin:0">Customers message you from the chat bubble on your site. You also get a text, so you can reply from your phone. ' + roNote() + '</p>' +
          (CH.length ? '<div class="split' + (ch ? ' has-sel' : '') + '"><div class="inbox" id="ci">' + CH.map(function (x) { var m = x.msgs[x.msgs.length - 1]; return '<button data-id="' + x.id + '"' + (x.id === cur ? ' class="on"' : '') + '><span class="av sm">' + U.initials(x.customer) + '</span><div><b>' + esc(x.customer) + '</b><small>' + (m.from === 'business' ? 'You: ' : '') + esc(m.body) + '</small></div>' + (x.open ? '<span class="unread"></span>' : '') + '</button>'; }).join('') + '</div>' +
            (ch ? '<div class="card" style="gap:12px"><div class="card-h"><button class="btn sm ghost back-btn" id="bk">← All</button><h3 style="flex:1">' + esc(ch.customer) + '</h3><span class="muted" style="font-size:12.5px">Website chat</span></div><div class="thread" id="th">' + ch.msgs.map(function (m) { return '<div class="bub' + (m.from === 'business' ? ' me' : '') + '">' + esc(m.body) + '<time>' + U.date(m.at, true) + '</time></div>'; }).join('') + '</div>' +
              (ro() ? '<p class="muted" style="margin:0;font-size:13px">Replies are turned off in the support view.</p>' : '<div class="qr" id="qr"><button>Thanks for reaching out!</button><button>Yes, we can do that.</button><button>What day works best for you?</button></div><form class="compose" id="cf"><input id="cm" placeholder="Reply to ' + esc(ch.customer.split(' ')[0]) + '…" autocomplete="off"><button class="btn primary">' + icon('send', 16) + '<span class="lbl">Send</span></button></form>') + '</div>' : '') + '</div>' : '<div class="empty">No conversations yet.</div>');
        var th = U.$('#th', el); if (th) th.scrollTop = th.scrollHeight;
        var bk = U.$('#bk', el); if (bk) bk.addEventListener('click', function () { cur = null; draw(); });
        var f = U.$('#cf', el); if (f) f.addEventListener('submit', function (e) { e.preventDefault(); var v = U.$('#cm', el).value.trim(); if (!v) return; API.replyChat(cur, v).then(function (n) { Object.assign(ch, n); draw(); U.toast('Sent to ' + ch.customer.split(' ')[0]); }); });
      }
      U.on(el, '#ci button', 'click', function (e, b) { cur = b.dataset.id; draw(); });
      U.on(el, '#qr button', 'click', function (e, b) { U.$('#cm', el).value = b.textContent; U.$('#cm', el).focus(); });
      draw();
    });
  }

  /* ---------- Automations ---------- */
  function automations(el, ctx, c) {
    ctx.title('Automations');
    Promise.all([API.automations(c.id), API.texts(c.id)]).then(function (r) {
      var A = r[0], T = r[1], pct = T.limit ? Math.min(100, Math.round(T.used / T.limit * 100)) : 0, onN = A.filter(function (a) { return a.on; }).length;
      function fill(t) { return esc(t).replace(/\{business\}/g, esc(c.name)).replace(/\{service\}/g, '90-min massage').replace(/\{date\}/g, 'Fri at 10:00 AM').replace(/\{link\}/g, (c.domain || 'yoursite.com') + '/book'); }
      function weeklyText() { return esc(c.name) + ' this week: 602 visitors · 9 leads · 12 bookings. Reply with any changes for your designer.'; }
      el.innerHTML = '<div class="grid g3"><div class="card kpi"><span>Automations on</span><strong>' + onN + '<span class="muted" style="font-size:16px;font-weight:500"> of ' + A.length + '</span></strong><small>Texts that send themselves</small></div>' +
        '<div class="card kpi"><span>Texts this month</span><strong>' + T.used + (T.limit ? '<span class="muted" style="font-size:16px;font-weight:500"> / ' + T.limit + '</span>' : '') + '</strong><div class="bar"><i style="width:' + pct + '%"></i></div><small>' + (T.limit ? 'Included with ' + c.plan + '. Resets on the 1st.' : 'Texting comes with monthly plans.') + '</small></div>' +
        '<div class="card kpi"><span>Customer consent</span><strong style="font-size:20px">Handled</strong><small>Customers opt in. Replying STOP always works.</small></div></div>' +
        '<div class="swipe-wrap"><div class="autos" id="au">' + A.map(function (a) {
          return '<div class="auto' + (a.on ? ' on' : '') + '" data-k="' + a.key + '"><div class="auto-h"><span class="ic big' + (a.on ? '' : ' gray') + '">' + icon(a.icon, 20) + '</span><span class="toggle' + (a.on ? ' on' : '') + (ro() ? ' dis' : '') + '" data-tg role="switch" aria-checked="' + a.on + '" aria-label="' + a.name + '"><i></i></span></div>' +
            '<div><b class="auto-t">' + a.name + '</b><span class="auto-w">' + icon('clock', 13) + ' ' + a.when + '</span></div>' +
            '<div class="bub auto-p">' + (a.owner ? weeklyText() : fill(a.text)) + '</div>' +
            '<div class="auto-f"><span>' + (a.on ? (a.sent || 0) + ' sent this month' : 'Off') + '</span>' + (a.owner || ro() ? '' : '<button class="btn sm" data-ed>' + icon('chat', 14) + ' Edit message</button>') + '</div></div>';
        }).join('') + '</div><div class="dots" id="dots">' + A.map(function (a, i) { return '<i' + (i === 0 ? ' class="on"' : '') + '></i>'; }).join('') + '</div></div>';
      var au = U.$('#au', el), dots = U.$$('#dots i', el);
      au.addEventListener('scroll', function () { var w = au.firstElementChild.offsetWidth + 12, i = Math.round(au.scrollLeft / w); dots.forEach(function (d, k) { d.classList.toggle('on', k === i); }); }, { passive: true });
      if (ro()) return;
      U.on(el, '[data-tg]', 'click', function (e, t) {
        var card = t.closest('.auto'), k = card.dataset.k, on = !card.classList.contains('on');
        API.setAutomation(c.id, k, { on: on }).then(function () {
          card.classList.toggle('on', on); t.classList.toggle('on', on); t.setAttribute('aria-checked', on); card.querySelector('.ic').classList.toggle('gray', !on);
          var a = A.find(function (x) { return x.key === k; }); a.on = on; card.querySelector('.auto-f span').textContent = on ? (a.sent || 0) + ' sent this month' : 'Off';
          U.toast((on ? 'On: ' : 'Off: ') + a.name);
        });
      });
      U.on(el, '[data-ed]', 'click', function (e, b) {
        var k = b.closest('.auto').dataset.k, a = A.find(function (x) { return x.key === k; });
        U.openDrawer('<div class="dr-h"><div style="flex:1"><span class="muted" style="font-size:13px">' + a.when + '</span><h3>' + a.name + '</h3></div><button class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button></div>' +
          '<div class="dr-b"><label class="field">Message<textarea id="at">' + esc(a.text) + '</textarea></label><div class="qr" id="av">' + ['{business}', '{service}', '{date}', '{link}'].map(function (v) { return '<button data-v="' + v + '">' + v + '</button>'; }).join('') + '</div>' +
          '<div style="display:flex;flex-direction:column;gap:6px"><span class="muted" style="font-size:13px;font-weight:500">What customers see</span><div class="bub" id="ap" style="max-width:100%">' + fill(a.text) + '</div></div></div>' +
          '<div class="dr-f"><button class="btn ghost" id="ar">Reset</button><button class="btn" id="ats">Send me a test</button><button class="btn primary" id="as">Save</button></div>', function (d) {
          var ta = U.$('#at', d), pos = ta.value.length;
          function upd() { U.$('#ap', d).innerHTML = fill(ta.value); }
          ['keyup', 'click', 'select'].forEach(function (ev) { ta.addEventListener(ev, function () { pos = ta.selectionStart; }); });
          ta.addEventListener('input', function () { pos = ta.selectionStart; upd(); });
          U.on(d, '#av button', 'click', function (ev, v) { var pre = ta.value.slice(0, pos), ins = (pre && !/\s$/.test(pre) ? ' ' : '') + v.dataset.v; ta.value = pre + ins + ta.value.slice(pos); pos += ins.length; ta.focus(); ta.setSelectionRange(pos, pos); upd(); });
          U.$('#ar', d).addEventListener('click', function () { ta.value = a.def; pos = ta.value.length; upd(); });
          U.$('#ats', d).addEventListener('click', function () { U.toast('Test text sent to ' + c.phone); });
          U.$('#as', d).addEventListener('click', function () { API.setAutomation(c.id, k, { text: ta.value }).then(function () { a.text = ta.value; b.closest('.auto').querySelector('.auto-p').innerHTML = fill(ta.value); U.closeDrawer(); U.toast('Message saved'); }); });
        });
      });
    });
  }

  /* ---------- Your designer ---------- */
  function designer(el, ctx, c) {
    ctx.title('Your designer');
    API.requests(c.id).then(function (R) {
      R.sort(function (a, b) { return a.created < b.created ? 1 : -1; });
      var open = R.filter(function (x) { return x.status !== 'live'; }), done = R.filter(function (x) { return x.status === 'live'; });
      function row(x) { var st = ['received', 'progress', 'review', 'live'].indexOf(x.status); return '<div class="row" style="flex-direction:column;align-items:stretch;gap:8px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b style="white-space:normal">' + esc(x.text) + '</b>' + approveBits(x) + '</div><div class="steps4">' + ['Received', 'In progress', 'Your OK', 'Live'].map(function (s, i) { return '<span class="' + (i <= st ? 'on' : '') + '">' + s + '</span>'; }).join('') + '</div><small>' + (x.status === 'live' ? 'Live ' + U.rel(x.done) : 'Sent ' + U.rel(x.created) + ' · expected by ' + U.date(x.due)) + '</small></div>'; }
      el.innerHTML = '<div class="card designer-cta"><div class="dc-top"><span class="av dark" style="width:46px;height:46px;border-radius:14px">' + icon('phone', 20) + '</span><div><h3>Need a change?</h3><p class="muted" style="margin:4px 0 0;line-height:1.5">Text your designer, the same real person every time. Small edits go live within 2 business days. This line is private; customers never see it.</p></div></div>' +
        (ro() ? '<p class="muted" style="margin:0">Hidden in the support view.</p>' : textBtn(true) + '<div class="dc-alt"><span>' + DESIGNER_SHOW + '</span><a href="mailto:hello@stoopdesign.com">Prefer email?</a></div>') + '</div>' +
        '<div class="card"><div class="card-h"><h3>In progress</h3><span class="pill">' + open.length + '</span></div><div class="list">' + (open.length ? open.map(row).join('') : '<div class="empty">Nothing in progress. Text a change any time.</div>') + '</div></div>' +
        (done.length ? '<div class="card"><div class="card-h"><h3>Done</h3><span class="pill green">' + done.length + '</span></div><div class="list">' + done.slice(0, 8).map(row).join('') + '</div></div>' : '');
      wireApprove(el, ctx);
    });
  }

  /* ---------- Billing ---------- */
  function billing(el, ctx, c) {
    ctx.title('Billing');
    Promise.all([API.invoices(c.id), API.buyout(c.id)]).then(function (r) {
      var I = r[0].sort(function (a, b) { return a.at < b.at ? 1 : -1; }), bo = r[1];
      var next = new Date((I[0] ? new Date(I[0].at).getTime() : Date.now()) + 30 * D), paid = sum(I.filter(function (i) { return i.status === 'paid'; }), 'amount');
      el.innerHTML = (c.status === 'past_due' ? '<div class="access" style="background:var(--rsoft);color:var(--red)">' + icon('alert', 18) + '<span class="grow"><b>Your last payment didn’t go through.</b> Update your card to keep everything running.</span><button class="btn sm" data-portal>Update card</button></div>' : '') +
        '<div class="grid g4">' + kpi('Your plan', c.plan, c.mrr ? U.money(c.mrr) + ' a month' : 'One-time build') + kpi('Next payment', c.mrr ? U.date(next.toISOString()) : '—', c.mrr ? U.money(c.mrr) + ' · automatic' : '') + kpi('Paid so far', U.money(paid), I.length + ' invoices') + kpi('Term ends', U.date(c.termEnds), 'then month to month') + '</div>' +
        '<div class="grid g21"><div class="card"><div class="card-h"><h3>Invoices</h3><button class="btn sm" data-portal>' + icon('card', 15) + ' Manage billing</button></div><div class="list">' + I.map(function (i) { return '<div class="row"><span class="grow"><b>' + U.date(i.at) + '</b><small>' + c.plan + ' plan</small></span>' + (i.status === 'paid' ? '<span class="pill green">Paid</span>' : '<span class="pill red">Failed</span>') + '<b style="width:60px;text-align:right">' + U.money(i.amount) + '</b></div>'; }).join('') + '</div><small class="muted">Payments run through Stripe. STOOP never sees your card number.</small></div>' +
        buyoutCard(c, bo) + '</div>';
      U.on(el, '[data-portal]', 'click', function () { U.toast('Opens Stripe’s secure billing page once Stripe is connected'); });
      U.on(el, '#boBtn', 'click', function () { buyoutDrawer(c, bo, ctx); });
    });
  }
  function buyoutCard(c, bo) {
    if (!bo || !bo.eligible) return '<div class="card"><div class="card-h"><h3>Own it outright</h3><span class="pill green">Yours</span></div><p class="muted" style="margin:0;line-height:1.6">Your site was a one-time build, so it’s already yours.</p></div>';
    return '<div class="card buyout"><div class="card-h"><h3>Own it outright</h3>' + (bo.requested ? '<span class="pill orange">Requested</span>' : '') + '</div>' +
      '<div><span class="muted" style="font-size:13px">Your buyout price today</span><div class="bo-price">' + U.money(bo.price) + '</div><small class="muted">' + bo.months + ' months × ' + U.money(bo.monthly) + (bo.monthsLeft < bo.months ? ' (minimum 6 months)' : ' (what’s left of your 12-month term)') + '</small></div>' +
      '<ol class="bo-steps"><li><b>Request it here</b><span>Your price is locked for 7 days.</span></li><li><b>Pay once, securely</b><span>We send a Stripe payment link.</span></li><li><b>Everything is yours</b><span>Full site files, help moving hosting and domain, within 5 business days.</span></li><li><b>Monthly plan ends</b><span>No more monthly charges.</span></li></ol>' +
      (bo.requested ? '<div class="access">' + icon('check', 18) + '<span class="grow">Requested ' + U.rel(bo.requested.at) + '. Your designer will confirm and send your payment link.</span></div>' : (ro() ? '' : '<button class="btn primary block" id="boBtn">Request buyout · ' + U.money(bo.price) + '</button>')) + '</div>';
  }
  function buyoutDrawer(c, bo, ctx) {
    U.openDrawer('<div class="dr-h"><h3>Buy out your site</h3><button class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button></div><div class="dr-b">' +
      '<div class="card" style="background:#FAF8F5;gap:8px"><span class="muted" style="font-size:13px">One-time price</span><div class="bo-price">' + U.money(bo.price) + '</div><small class="muted">' + bo.months + ' months × ' + U.money(bo.monthly) + '</small></div>' +
      '<b>You get</b>' + ['All your site files and content', 'Help moving hosting and your domain', 'Your tools’ data exported (leads, bookings, orders)', 'No more monthly charges'].map(function (t) { return '<div style="display:flex;gap:10px;font-size:14px"><span style="color:var(--green)">' + icon('check', 16) + '</span>' + t + '</div>'; }).join('') +
      '<p class="muted" style="margin:0;font-size:13px;line-height:1.6">Nothing is charged yet. Your designer confirms the price and sends a secure payment link. Your domain and content are always yours either way.</p></div>' +
      '<div class="dr-f"><button class="btn" data-close>Not now</button><button class="btn primary" id="boGo">Request buyout</button></div>', function (d) {
      U.$$('[data-close]', d).forEach(function (x) { x.addEventListener('click', U.closeDrawer); });
      U.$('#boGo', d).addEventListener('click', function () { API.requestBuyout(c.id).then(function () { U.closeDrawer(); U.toast('Buyout requested. Your designer will be in touch.'); ctx.refresh(); }); });
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
        (ro() ? '' : '<div class="card"><div class="card-h"><h3>Alerts</h3></div><span class="toggle on" data-t><i></i>Text me new leads and chats</span><span class="toggle on" data-t><i></i>Email me a weekly summary</span><span class="toggle" data-t><i></i>Text me every new order</span></div>' +
          '<button class="btn block" id="so2">' + icon('out', 16) + ' Sign out</button>');
      U.on(el, '[data-h]', 'click', function (e, b) { API.giveAccess(c.id, +b.dataset.h).then(function () { U.toast('STOOP can see your customer info for ' + b.textContent); ctx.refresh(); }); });
      var rv = U.$('#revoke', el); if (rv) rv.addEventListener('click', function () { API.revokeAccess(c.id).then(function () { U.toast('Support access turned off'); ctx.refresh(); }); });
      var inv = U.$('#invite', el); if (inv) inv.addEventListener('click', function () { U.toast('Staff invites arrive with the live version'); });
      var so = U.$('#so2', el); if (so) so.addEventListener('click', function () { API.signOut().then(function () { location.hash = '#/signin'; }); });
      U.on(el, '[data-t]', 'click', function (e, t) { t.classList.toggle('on'); });
    });
  }

  window.CLIENT = { badges: badges, views: { overview: overview, analytics: analytics, leads: leads, bookings: bookings, orders: orders, chat: chat, automations: automations, designer: designer, billing: billing, settings: settings } };
})();
