/* STOOP admin back office */
(function () {
  var U = UI, icon = U.icon, esc = U.esc, D = 864e5;
  function byId(list) { var m = {}; list.forEach(function (c) { m[c.id] = c; }); return m; }
  function lastMsgByClient(msgs) { var m = {}; msgs.forEach(function (x) { if (!m[x.client_id] || x.at > m[x.client_id].at) m[x.client_id] = x; }); return m; }
  function buildInfo(b) {
    var paused = b.pausedMs + (b.waiting && b.waitStarted ? Date.now() - new Date(b.waitStarted).getTime() : 0);
    var elapsed = (Date.now() - new Date(b.start).getTime() - paused) / D;
    var deadline = new Date(new Date(b.start).getTime() + 14 * D + paused);
    var done = b.steps.filter(function (s) { return s.done; }).length;
    return { day: Math.min(14, Math.max(1, Math.ceil(elapsed))), left: Math.ceil((deadline - Date.now()) / D), deadline: deadline.toISOString(), pct: Math.round(done / b.steps.length * 100) };
  }
  var STAGES = [['new', 'New request'], ['mockup', 'Mockup sent'], ['call', 'Call booked'], ['contract', 'Contract sent'], ['won', 'Won'], ['lost', 'Lost']];
  var REQS = ['received', 'progress', 'review', 'live'];

  function badges() {
    return Promise.all([API.requests(), API.pipeline(), API.builds(), API.messages()]).then(function (r) {
      var last = lastMsgByClient(r[3]);
      return {
        requests: r[0].filter(function (x) { return x.status !== 'live'; }).length,
        pipeline: r[1].filter(function (x) { return x.stage === 'new'; }).length,
        builds: Object.keys(r[2]).filter(function (k) { return r[2][k].steps.some(function (s) { return !s.done; }); }).length,
        messages: Object.keys(last).filter(function (k) { return last[k].from === 'client'; }).length
      };
    });
  }

  /* ---------- Today ---------- */
  function today(el, ctx) {
    ctx.title('Today');
    Promise.all([API.clients(), API.requests(), API.pipeline(), API.builds(), API.sites(), API.messages()]).then(function (r) {
      var C = r[0], cm = byId(C), R = r[1], P = r[2], B = r[3], S = r[4], M = r[5];
      var mrr = C.reduce(function (s, c) { return s + c.mrr; }, 0);
      var open = R.filter(function (x) { return x.status !== 'live'; });
      var overdue = open.filter(function (x) { return new Date(x.due) < new Date(); });
      var mockups = P.filter(function (p) { return p.stage === 'new'; });
      var items = [];
      open.filter(function (x) { return x.status === 'review' && x.approved; }).forEach(function (x) { items.push([0, 'green', 'check', 'Approved, ready to go live: ' + x.text, cm[x.client_id].name + ' approved ' + U.rel(x.approved), '#/requests']); });
      overdue.forEach(function (x) { items.push([0, 'red', 'alert', 'Overdue: ' + x.text, cm[x.client_id].name + ' · was due ' + U.rel(x.due), '#/requests']); });
      open.filter(function (x) { var ms = new Date(x.due) - Date.now(); return ms > 0 && ms < D; }).forEach(function (x) { items.push([1, 'amber', 'clock', x.text, cm[x.client_id].name + ' · due ' + U.rel(x.due), '#/requests']); });
      mockups.forEach(function (p) { var late = new Date(p.mockupDue) < new Date(); items.push([late ? 0 : 2, late ? 'red' : '', 'funnel', 'Mockup for ' + p.business, (late ? 'Late · was due ' : 'Due ') + U.rel(p.mockupDue), '#/pipeline']); });
      Object.keys(B).forEach(function (cid) { var b = B[cid], i = buildInfo(b); if (b.steps.some(function (s) { return !s.done; })) items.push([i.left <= 4 ? 1 : 3, i.left <= 4 ? 'amber' : '', 'build', cm[cid].name + ': day ' + i.day + ' of 14', (b.waiting ? 'Paused, waiting on client · ' : '') + i.left + ' days to the deadline', '#/builds']); });
      C.filter(function (c) { return c.status === 'past_due'; }).forEach(function (c) { items.push([0, 'red', 'card', 'Payment failed: ' + c.name, money(c.mrr) + '/mo · card needs updating', '#/money']); });
      Object.keys(S).forEach(function (cid) { var s = S[cid]; if (!cm[cid]) return; if (s.ssl != null && s.ssl <= 14) items.push([1, 'amber', 'shield', 'Security certificate renews in ' + s.ssl + ' days', cm[cid].name, '#/health']); if (s.renew != null && s.renew <= 30) items.push([1, 'amber', 'globe', 'Domain expires in ' + s.renew + ' days', cm[cid].name + ' · ' + cm[cid].domain, '#/health']); if (s.uptime != null && s.uptime < 99.5) items.push([2, 'amber', 'pulse', 'Uptime ' + s.uptime + '% this month', cm[cid].name, '#/health']); });
      items.sort(function (a, b) { return a[0] - b[0]; });
      var latest = M.filter(function (m) { return m.from === 'client'; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; }).slice(0, 4);
      var hr = new Date().getHours();
      el.innerHTML =
        '<div><h2 style="font-size:26px">Good ' + (hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening') + ', Chase.</h2><p class="muted" style="margin:6px 0 0">' + items.length + ' things need you. Here’s the order I’d take them in.</p></div>' +
        '<div class="grid g4">' +
        kpi('Monthly revenue', money(mrr), C.length + ' clients') +
        kpi('Open requests', open.length, overdue.length ? '<span class="down">' + overdue.length + ' overdue</span>' : 'All on time') +
        kpi('Mockups to make', mockups.length, 'from the free-mockup form') +
        kpi('Builds in progress', Object.keys(B).filter(function (k) { return B[k].steps.some(function (s) { return !s.done; }); }).length, '14-day promise') + '</div>' +
        '<div class="grid g21"><div class="card"><div class="card-h"><h3>Needs you now</h3><span class="pill">' + items.length + '</span></div><div class="list">' +
        (items.length ? items.map(function (i) { return '<a class="row" href="' + i[5] + '"><span class="ic ' + i[1] + '">' + icon(i[2], 17) + '</span><span class="grow"><b>' + esc(i[3]) + '</b><small>' + esc(i[4]) + '</small></span>' + icon('arrow', 16) + '</a>'; }).join('') : '<div class="empty">All clear. Nice work.</div>') +
        '</div></div><div style="display:flex;flex-direction:column;gap:16px"><div class="card"><div class="card-h"><h3>Latest from clients</h3><a href="#/messages">Messages</a></div><div class="list">' +
        latest.map(function (m) { return '<a class="row" href="#/messages/' + m.client_id + '"><span class="av sm">' + U.initials(cm[m.client_id].name) + '</span><span class="grow"><b>' + esc(cm[m.client_id].name) + '</b><small>' + esc(m.body) + '</small></span><small>' + U.rel(m.at) + '</small></a>'; }).join('') +
        '</div></div><div class="card"><div class="card-h"><h3>Pipeline</h3><a href="#/pipeline">Open</a></div>' +
        STAGES.slice(0, 5).map(function (s) { var n = P.filter(function (p) { return p.stage === s[0]; }).length; return '<div style="display:flex;justify-content:space-between;font-size:14px"><span class="muted">' + s[1] + '</span><b>' + n + '</b></div>'; }).join('') + '</div></div></div>';
    });
  }
  function kpi(label, val, sub) { return '<div class="card kpi"><span>' + label + '</span><strong>' + val + '</strong><small>' + sub + '</small></div>'; }
  function money(n) { return U.money(n); }

  /* ---------- Requests ---------- */
  function requests(el, ctx) {
    ctx.title('Requests');
    ctx.actions('<button class="btn primary" id="newReq">' + icon('plus', 16) + '<span class="lbl">New request</span></button>');
    var filter = '';
    Promise.all([API.clients(), API.requests()]).then(function (r) {
      var C = r[0], cm = byId(C), R = r[1];
      function draw() {
        var list = R.filter(function (x) { return !filter || x.client_id === filter; });
        el.innerHTML = '<div class="filters"><select id="rf"><option value="">All clients</option>' + C.map(function (c) { return '<option value="' + c.id + '"' + (filter === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select><span class="muted" style="font-size:13px">Promise: live within 2 business days. Drag cards between columns.</span></div>' +
          '<div class="board">' + REQS.map(function (s) {
            var items = list.filter(function (x) { return x.status === s; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
            if (s === 'live') items = items.slice(0, 6);
            return '<div class="col" data-s="' + s + '"><div class="col-h">' + U.reqPill(s) + '<span class="n">' + items.length + '</span></div>' +
              items.map(function (x) { return '<button class="tk" draggable="true" data-id="' + x.id + '"><span class="tk-meta"><span>' + esc(cm[x.client_id].name) + '</span><span>' + U.srcLabel(x.source) + '</span></span><b>' + esc(x.text) + '</b><span class="tk-meta">' + (s === 'live' ? '<span class="pill green">Live ' + U.rel(x.done) + '</span>' : x.approved ? '<span class="pill green">' + icon('check', 12) + ' Client approved</span>' : U.due(x.due)) + '</span></button>'; }).join('') + '</div>';
          }).join('') + '</div>';
          U.$('#rf').addEventListener('change', function (e) { filter = e.target.value; draw(); });
        dnd();
      }
      function dnd() {
        var dragId = null;
        U.$$('.tk', el).forEach(function (t) {
          t.addEventListener('dragstart', function (e) { dragId = t.dataset.id; t.classList.add('dragging'); e.dataTransfer.setData('text/plain', dragId); });
          t.addEventListener('dragend', function () { t.classList.remove('dragging'); });
        });
        U.$$('.col', el).forEach(function (c) {
          c.addEventListener('dragover', function (e) { e.preventDefault(); c.classList.add('over'); });
          c.addEventListener('dragleave', function () { c.classList.remove('over'); });
          c.addEventListener('drop', function (e) { e.preventDefault(); c.classList.remove('over'); if (dragId) move(dragId, c.dataset.s); });
        });
      }
      function move(rid, status) {
        var x = R.find(function (q) { return q.id === rid; }); if (!x || x.status === status) return;
        if (status === 'live') return markLive(x);
        API.updateRequest(rid, { status: status }).then(function (n) { Object.assign(x, n); draw(); U.toast('Moved to ' + U.REQ[status][0]); });
      }
      function markLive(x) {
        API.updateRequest(x.id, { status: 'live' }).then(function (n) {
          Object.assign(x, n);
          return API.sendMessage(x.client_id, 'Done! “' + x.text + '” is live on your site ✓');
        }).then(function () { U.closeDrawer(); draw(); ctx.refreshBadges && ctx.refreshBadges(); U.toast('Marked live and texted ' + cm[x.client_id].owner.split(' ')[0]); });
      }
      U.on(el, '.tk', 'click', function (e, t) {
        var x = R.find(function (q) { return q.id === t.dataset.id; }), c = cm[x.client_id];
        U.openDrawer('<div class="dr-h"><div style="flex:1"><span class="muted" style="font-size:13px">' + esc(c.name) + ' · ' + c.plan + '</span><h3>' + esc(x.text) + '</h3></div><button class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button></div>' +
          '<div class="dr-b"><div class="kv"><span>Came in by</span><b>' + U.srcLabel(x.source) + '</b><span>Received</span><b>' + U.date(x.created, true) + '</b><span>Due</span><b>' + (x.status === 'live' ? 'Done ' + U.rel(x.done) : U.date(x.due, true) + ' ' + U.due(x.due)) + '</b><span>Site</span><b>' + esc(c.domain || 'Not connected yet') + '</b></div>' +
          '<div style="display:flex;flex-direction:column;gap:8px"><span class="muted" style="font-size:13px;font-weight:500">Status</span><div class="steps-sel" id="rs">' + REQS.map(function (s) { return '<button data-s="' + s + '"' + (x.status === s ? ' class="on"' : '') + '>' + U.REQ[s][0] + '</button>'; }).join('') + '</div></div>' +
          '<label class="field">Private notes<textarea id="rn" placeholder="Only STOOP sees these">' + esc(x.notes) + '</textarea></label></div>' +
          '<div class="dr-f"><a class="btn" href="#/messages/' + c.id + '">' + icon('chat', 16) + ' Open thread</a>' + (x.status !== 'live' ? '<button class="btn primary" id="rl">' + icon('check', 16) + ' Mark live + text client</button>' : '') + '</div>', function (d) {
          U.on(d, '#rs button', 'click', function (ev, b) { move(x.id, b.dataset.s); U.$$('#rs button', d).forEach(function (q) { q.classList.toggle('on', q === b); }); });
          U.$('#rn', d).addEventListener('change', function (ev) { API.updateRequest(x.id, { notes: ev.target.value }).then(function () { x.notes = ev.target.value; U.toast('Notes saved'); }); });
          var l = U.$('#rl', d); if (l) l.addEventListener('click', function () { markLive(x); });
        });
      });
      U.$('#newReq').addEventListener('click', function () {
        U.openDrawer('<div class="dr-h"><h3>New request</h3><button class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button></div><div class="dr-b"><label class="field">Client<select id="nc">' + C.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select></label><label class="field">What do they need?<textarea id="nt" placeholder="e.g. Update holiday hours"></textarea></label><label class="field">Came in by<select id="ns"><option value="text">Text</option><option value="email">Email</option><option value="dashboard">Dashboard</option></select></label><p class="muted" style="margin:0;font-size:13px">Due date is set to 2 business days from now.</p></div><div class="dr-f"><button class="btn primary" id="nsave">Add to queue</button></div>', function (d) {
          U.$('#nsave', d).addEventListener('click', function () {
            var t = U.$('#nt', d).value.trim(); if (!t) return U.$('#nt', d).focus();
            API.addRequest(U.$('#nc', d).value, t, U.$('#ns', d).value).then(function (n) { R.unshift(n); U.closeDrawer(); draw(); U.toast('Request added'); });
          });
        });
      });
      draw();
    });
  }

  /* ---------- Pipeline ---------- */
  function pipeline(el, ctx) {
    ctx.title('Sales pipeline');
    API.pipeline().then(function (P) {
      function draw() {
        el.innerHTML = '<p class="muted" style="margin:0">Every free-mockup request lands in <b>New request</b>. Mockups are promised within 72 hours.</p><div class="board" style="--cols:6">' + STAGES.map(function (s) {
          var items = P.filter(function (p) { return p.stage === s[0]; });
          return '<div class="col" data-s="' + s[0] + '"><div class="col-h"><span>' + s[1] + '</span><span class="n">' + items.length + '</span></div>' +
            items.map(function (p) { return '<button class="tk" data-id="' + p.id + '"><span class="tk-meta"><span>' + esc(p.type) + '</span><span>' + U.rel(p.created) + '</span></span><b>' + esc(p.business) + '</b><span class="tk-meta"><span>Wants: ' + esc(p.goal) + '</span>' + (p.stage === 'new' ? U.due(p.mockupDue) : '<span class="pill">' + esc(p.plan) + '</span>') + '</span></button>'; }).join('') + '</div>';
        }).join('') + '</div>';
      }
      U.on(el, '.tk', 'click', function (e, t) {
        var p = P.find(function (q) { return q.id === t.dataset.id; });
        U.openDrawer('<div class="dr-h"><div style="flex:1"><span class="muted" style="font-size:13px">' + esc(p.type) + '</span><h3>' + esc(p.business) + '</h3></div><button class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button></div>' +
          '<div class="dr-b"><div class="kv"><span>Contact</span><b>' + esc(p.contact) + '</b><span>Email</span><b>' + esc(p.email) + '</b><span>Phone</span><b>' + esc(p.phone) + '</b><span>Wants</span><b>' + esc(p.goal) + '</b><span>Plan interest</span><b>' + esc(p.plan) + '</b><span>Came in</span><b>' + U.date(p.created, true) + '</b>' + (p.stage === 'new' ? '<span>Mockup due</span><b>' + U.date(p.mockupDue, true) + '</b>' : '') + '</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px"><span class="muted" style="font-size:13px;font-weight:500">Stage</span><div class="steps-sel" id="ps">' + STAGES.map(function (s) { return '<button data-s="' + s[0] + '"' + (p.stage === s[0] ? ' class="on"' : '') + '>' + s[1] + '</button>'; }).join('') + '</div></div>' +
          '<label class="field">Notes<textarea id="pn">' + esc(p.notes) + '</textarea></label></div>' +
          '<div class="dr-f">' + (p.stage !== 'won' ? '<button class="btn" id="pc">' + icon('send', 16) + ' Send contract + payment link</button><button class="btn primary" id="pw">' + icon('check', 16) + ' Won: create client</button>' : '<span class="muted">Already a client.</span>') + '</div>', function (d) {
          U.on(d, '#ps button', 'click', function (ev, b) { API.updateLeadStage(p.id, { stage: b.dataset.s }).then(function () { p.stage = b.dataset.s; draw(); U.$$('#ps button', d).forEach(function (q) { q.classList.toggle('on', q === b); }); }); });
          U.$('#pn', d).addEventListener('change', function (ev) { API.updateLeadStage(p.id, { notes: ev.target.value }).then(function () { p.notes = ev.target.value; U.toast('Notes saved'); }); });
          var c = U.$('#pc', d); if (c) c.addEventListener('click', function () { API.updateLeadStage(p.id, { stage: 'contract' }).then(function () { p.stage = 'contract'; draw(); U.closeDrawer(); U.toast('Contract and payment link sent to ' + p.contact.split(' ')[0] + ' (demo)'); }); });
          var w = U.$('#pw', d); if (w) w.addEventListener('click', function () { API.winLead(p.id).then(function (cl) { U.toast(cl.name + ' is a client. 14-day build started.'); ctx.go('#/clients/' + cl.id); }); });
        });
      });
      draw();
    });
  }

  /* ---------- Clients ---------- */
  function clients(el, ctx, rest) {
    if (rest[0]) return clientDetail(el, ctx, rest[0], rest[1]);
    ctx.title('Clients');
    Promise.all([API.clients(), API.sites()].concat([])).then(function (r) {
      var C = r[0], S = r[1];
      return Promise.all(C.map(function (c) { return API.grant(c.id); })).then(function (G) {
        var mrr = C.reduce(function (s, c) { return s + c.mrr; }, 0);
        el.innerHTML = '<div class="grid g4">' + kpi('Clients', C.length, C.filter(function (c) { return c.status === 'building'; }).length + ' building') + kpi('Monthly revenue', money(mrr), money(mrr * 12) + ' a year') + kpi('Support access on', G.filter(Boolean).length, 'clients have let you in') + kpi('Payment issues', C.filter(function (c) { return c.status === 'past_due'; }).length, 'see Money') + '</div>' +
          '<div class="tbl-wrap"><table><thead><tr><th>CLIENT</th><th>PLAN</th><th>STATUS</th><th>TERM ENDS</th><th>CUSTOMER DATA</th><th>SITE</th></tr></thead><tbody>' +
          C.map(function (c, i) { var s = S[c.id] || {}, g = G[i]; return '<tr class="click" data-id="' + c.id + '"><td><b>' + esc(c.name) + '</b><small>' + esc(c.owner) + '</small></td><td>' + c.plan + '<small>' + (c.mrr ? money(c.mrr) + '/mo' : 'One-time') + '</small></td><td>' + U.clientPill(c.status) + '</td><td>' + U.date(c.termEnds) + '<small>' + U.rel(c.termEnds) + '</small></td><td>' + (g ? '<span class="pill green">' + icon('unlock', 13) + ' Open until ' + U.date(g.expires) + '</span>' : '<span class="pill">' + icon('lock', 13) + ' Private</span>') + '</td><td>' + (s.uptime != null ? '<span class="pill ' + (s.uptime < 99.5 ? 'amber' : 'green') + '">' + s.uptime + '% up</span>' : '<span class="pill orange">In build</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
        U.on(el, 'tr.click', 'click', function (e, t) { ctx.go('#/clients/' + t.dataset.id); });
      });
    });
  }
  function clientDetail(el, ctx, cid, tab) {
    tab = tab || 'overview';
    Promise.all([API.client(cid), API.site(cid), API.grant(cid), API.counts(cid), API.texts(cid), API.closed(cid), API.automations(cid)]).then(function (r) {
      var c = r[0], s = r[1] || {}, g = r[2], n = r[3], tx = r[4], closed = r[5], autos = r[6] || [];
      if (!c) return ctx.go('#/clients');
      ctx.title(c.name);
      ctx.actions('<a class="btn" href="#/clients">' + '<span class="lbl">All clients</span></a>' + (g ? '<a class="btn dark" href="#/as/' + cid + '/overview">' + icon('eye', 16) + '<span class="lbl">View as client</span></a>' : ''));
      var TABS = [['overview', 'Overview'], ['customers', 'Customer data'], ['requests', 'Requests'], ['messages', 'Messages'], ['billing', 'Billing'], ['access', 'Access log']];
      el.innerHTML = '<div class="card" style="flex-direction:row;align-items:center;flex-wrap:wrap;gap:16px"><span class="av" style="width:52px;height:52px;border-radius:14px;font-size:17px">' + U.initials(c.name) + '</span><div style="flex:1;min-width:200px"><h2 style="font-size:22px">' + esc(c.name) + '</h2><span class="muted" style="font-size:13.5px">' + esc(c.owner) + ' · ' + esc(c.email) + ' · ' + esc(c.phone) + '</span></div>' + U.clientPill(c.status) + (closed ? '<span class="pill amber">' + icon('moon', 12) + ' Closed today</span>' : '') + '<span class="pill dark">' + c.plan + (c.mrr ? ' · ' + money(c.mrr) + '/mo' : '') + '</span></div>' +
        (g ? '<div class="access">' + icon('unlock', 18) + '<span class="grow"><b>Support access is on</b> until ' + U.date(g.expires, true) + '. Every customer record you open is logged and visible to ' + esc(c.owner.split(' ')[0]) + '.</span></div>'
          : '<div class="access off">' + icon('lock', 18) + '<span class="grow">Customer info is <b>private</b>. You can see totals and everything about their site, but not their customers’ names or details.</span></div>') +
        '<div class="tabs" id="ct">' + TABS.map(function (t) { return '<button data-t="' + t[0] + '"' + (t[0] === tab ? ' class="on"' : '') + '>' + t[1] + '</button>'; }).join('') + '</div><div id="cb"></div>';
      U.on(el, '#ct button', 'click', function (e, b) { ctx.go('#/clients/' + cid + '/' + b.dataset.t); });
      var cb = U.$('#cb', el);
      if (tab === 'overview') {
        cb.innerHTML = '<div class="grid g4">' + kpi('Leads', n.leads, 'all time') + kpi('Bookings', n.bookings, money(n.deposits) + ' in deposits') + kpi('Orders', n.orders, money(n.sales) + ' in sales') + kpi('Chats', n.chats, 'conversations') + '</div>' +
          '<div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-h"><h3>Site</h3>' + (c.domain ? '<span class="pill green">' + esc(c.domain) + '</span>' : '<span class="pill orange">Not live yet</span>') + '</div><div class="kv"><span>Uptime</span><b>' + (s.uptime != null ? s.uptime + '%' : '—') + '</b><span>Speed score</span><b>' + (s.speed || '—') + '</b><span>Certificate</span><b>' + (s.ssl != null ? 'Renews in ' + s.ssl + ' days' : '—') + '</b><span>Domain</span><b>' + (s.renew != null ? 'Renews in ' + s.renew + ' days' : '—') + '</b><span>Last update</span><b>' + U.rel(s.deploy) + '</b></div></div>' +
          '<div class="card"><div class="card-h"><h3>Plan and tools</h3></div><div class="kv"><span>Plan</span><b>' + c.plan + '</b><span>Started</span><b>' + U.date(c.started) + '</b><span>Term ends</span><b>' + U.date(c.termEnds) + '</b><span>Texts this month</span><b>' + (tx ? tx.used + (tx.limit ? ' of ' + tx.limit : '') : '—') + '</b><span>Automations on</span><b>' + autos.filter(function (a) { return a.on; }).length + ' of ' + autos.length + '</b><span>Tools</span><b>' + (c.tools.length ? c.tools.map(function (t) { return '<span class="pill" style="margin:0 4px 4px 0">' + t + '</span>'; }).join('') : 'None yet') + '</b></div></div></div>';
      } else if (tab === 'customers') {
        customerData(cb, c, g);
      } else if (tab === 'requests') {
        API.requests(cid).then(function (R) {
          cb.innerHTML = R.length ? '<div class="tbl-wrap"><table><thead><tr><th>REQUEST</th><th>STATUS</th><th>RECEIVED</th><th>DUE</th></tr></thead><tbody>' + R.map(function (x) { return '<tr><td><b>' + esc(x.text) + '</b><small>' + U.srcLabel(x.source) + '</small></td><td>' + U.reqPill(x.status) + '</td><td>' + U.date(x.created, true) + '</td><td>' + (x.status === 'live' ? 'Done ' + U.rel(x.done) : U.due(x.due)) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">No requests yet.</div>';
        });
      } else if (tab === 'messages') {
        thread(cb, c);
      } else if (tab === 'billing') {
        API.invoices(cid).then(function (I) {
          cb.innerHTML = '<div class="tbl-wrap"><table><thead><tr><th>DATE</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>' + I.map(function (i) { return '<tr><td>' + U.date(i.at) + '</td><td>' + money(i.amount) + '</td><td>' + (i.status === 'paid' ? '<span class="pill green">Paid</span>' : '<span class="pill red">Failed</span>') + '</td></tr>'; }).join('') + '</tbody></table></div><p class="muted" style="font-size:13px">Billing runs through Stripe. Card details never touch STOOP.</p>';
        });
      } else if (tab === 'access') {
        API.accessLog(cid).then(function (L) {
          cb.innerHTML = '<p class="muted" style="margin:0 0 12px">The client sees this exact list in their Settings.</p>' + (L.length ? '<div class="tbl-wrap"><table><thead><tr><th>WHO</th><th>OPENED</th><th>WHEN</th></tr></thead><tbody>' + L.map(function (l) { return '<tr><td>' + esc(l.who) + '</td><td>' + esc(l.area) + '</td><td>' + U.date(l.at, true) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">STOOP has never opened this client’s customer data.</div>');
        });
      }
    });
  }
  function customerData(cb, c, g) {
    var areas = [['leads', 'Leads']];
    if (c.tools.indexOf('booking') > -1) areas.push(['bookings', 'Bookings']);
    if (c.tools.indexOf('store') > -1 || c.tools.indexOf('gift') > -1) areas.push(['orders', 'Orders']);
    if (c.tools.indexOf('chat') > -1) areas.push(['chats', 'Chat']);
    if (!g) {
      API.counts(c.id).then(function (n) {
        var total = n.leads + n.bookings + n.orders + n.chats;
        cb.innerHTML = U.lockPanel(c.name, total, 'customer records', true);
        U.$('[data-ask]', cb).addEventListener('click', function () {
          API.sendMessage(c.id, 'Hi ' + c.owner.split(' ')[0] + '! To help with this, could you turn on Support access in Settings? It turns itself off when the time is up, and you’ll see everything I open.').then(function () { U.toast('Access request texted to ' + c.owner.split(' ')[0]); });
        });
      });
      return;
    }
    var cur = areas[0][0];
    function drawArea() {
      cb.innerHTML = '<div class="filters" id="ca">' + areas.map(function (a) { return '<button class="btn sm' + (a[0] === cur ? ' dark' : '') + '" data-a="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '<span class="sample">READ-ONLY · LOGGED</span></div><div id="cad" style="margin-top:14px"></div>';
      U.on(cb, '#ca button', 'click', function (e, b) { cur = b.dataset.a; drawArea(); });
      API[cur](c.id).then(function (res) { U.$('#cad', cb).innerHTML = customerTable(cur, res.rows || []); });
    }
    drawArea();
  }
  function customerTable(kind, rows) {
    if (!rows.length) return '<div class="empty">Nothing here yet.</div>';
    if (kind === 'leads') return '<div class="tbl-wrap"><table><thead><tr><th>FROM</th><th>CAME IN THROUGH</th><th>DETAILS</th><th>WHEN</th></tr></thead><tbody>' + rows.map(function (l) { return '<tr><td><b>' + esc(l.name) + '</b><small>' + esc(l.email) + ' · ' + esc(l.phone) + '</small></td><td><span class="pill">' + esc(l.source) + '</span></td><td>' + esc(l.detail) + '</td><td>' + U.rel(l.at) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    if (kind === 'bookings') return '<div class="tbl-wrap"><table><thead><tr><th>WHEN</th><th>CUSTOMER</th><th>SERVICE</th><th>DEPOSIT</th></tr></thead><tbody>' + rows.map(function (b) { return '<tr><td><b>' + U.date(b.when, true) + '</b></td><td>' + esc(b.customer) + '<small>' + esc(b.email) + ' · ' + esc(b.phone) + '</small></td><td>' + esc(b.service) + '</td><td>' + money(b.deposit) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    if (kind === 'orders') return '<div class="tbl-wrap"><table><thead><tr><th>CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>STATUS</th></tr></thead><tbody>' + rows.map(function (o) { return '<tr><td><b>' + esc(o.customer) + '</b><small>' + esc(o.email) + '</small></td><td>' + esc(o.items) + '</td><td>' + money(o.total) + '</td><td><span class="pill">' + esc(o.status) + '</span></td></tr>'; }).join('') + '</tbody></table></div>';
    return '<div class="list card">' + rows.map(function (ch) { var last = ch.msgs[ch.msgs.length - 1]; return '<div class="row"><span class="av sm">' + U.initials(ch.customer) + '</span><span class="grow"><b>' + esc(ch.customer) + '</b><small>' + esc(last.body) + '</small></span><small>' + U.rel(last.at) + '</small></div>'; }).join('') + '</div>';
  }
  function thread(box, c) {
    API.messages(c.id).then(function (M) {
      M.sort(function (a, b) { return a.at < b.at ? -1 : 1; });
      box.innerHTML = '<div class="card" style="gap:12px"><div class="card-h"><h3>' + esc(c.name) + '</h3><span class="muted" style="font-size:12.5px">Designer line · ' + esc(c.phone) + '</span></div><div class="thread" id="th">' +
        (M.length ? M.map(function (m) { return '<div class="bub' + (m.from === 'stoop' ? ' me' : '') + '">' + esc(m.body) + '<time>' + U.date(m.at, true) + '</time></div>'; }).join('') : '<span class="muted" style="margin:auto">No messages yet.</span>') +
        '</div><div class="qr" id="qr"><button>Got it! Working on it now.</button><button>Done. It’s live on your site ✓</button><button>Could you email me that photo?</button><button>Want to hop on a quick call?</button></div><form class="compose" id="cf"><input id="ci" placeholder="Text ' + esc(c.owner.split(' ')[0]) + '…" autocomplete="off"><button class="btn primary">' + icon('send', 16) + '<span class="lbl">Send</span></button></form>' +
        '<button class="btn sm" id="toReq" style="align-self:flex-start">' + icon('plus', 14) + ' Turn last message into a request</button></div>';
      var th = U.$('#th', box); th.scrollTop = th.scrollHeight;
      function send(t) { if (!t) return; API.sendMessage(c.id, t).then(function () { thread(box, c); }); }
      U.$('#cf', box).addEventListener('submit', function (e) { e.preventDefault(); send(U.$('#ci', box).value.trim()); });
      U.on(box, '#qr button', 'click', function (e, b) { U.$('#ci', box).value = b.textContent; U.$('#ci', box).focus(); });
      U.$('#toReq', box).addEventListener('click', function () {
        var last = M.filter(function (m) { return m.from === 'client'; }).pop();
        if (!last) return U.toast('No client message to convert');
        API.addRequest(c.id, last.body, 'text').then(function () { U.toast('Added to the request queue'); });
      });
    });
  }

  /* ---------- Builds ---------- */
  function builds(el, ctx) {
    ctx.title('Builds');
    Promise.all([API.clients(), API.builds()]).then(function (r) {
      var cm = byId(r[0]), B = r[1], keys = Object.keys(B);
      function draw() {
        el.innerHTML = '<p class="muted" style="margin:0">The 14-day clock pauses while you’re waiting on the client, which protects the “live in 14 days or your first month is free” promise.</p>' +
          (keys.length ? '<div class="grid g2">' + keys.map(function (cid) {
            var b = B[cid], i = buildInfo(b), c = cm[cid], done = b.steps.every(function (s) { return s.done; });
            return '<div class="card"><div class="card-h"><div><h3>' + esc(c.name) + '</h3><span class="muted" style="font-size:13px">' + c.plan + ' · started ' + U.date(b.start) + '</span></div>' + (done ? '<span class="pill green">Live</span>' : b.waiting ? '<span class="pill amber">Paused</span>' : '<span class="pill orange">Day ' + i.day + ' of 14</span>') + '</div>' +
              '<div class="bar"><i style="width:' + i.pct + '%"></i></div><div style="display:flex;justify-content:space-between;font-size:13px" class="muted"><span>' + i.pct + '% done</span><span>' + (done ? 'Launched' : 'Deadline ' + U.date(i.deadline) + ' · ' + i.left + ' days left') + '</span></div>' +
              '<div>' + b.steps.map(function (s, k) { return '<div class="check' + (s.done ? ' done' : '') + '" data-c="' + cid + '" data-k="' + k + '"><span class="box">' + (s.done ? icon('check', 13) : '') + '</span><span>' + esc(s.name) + '</span><small>Day ' + s.day + '</small></div>'; }).join('') + '</div>' +
              (done ? '' : '<span class="toggle' + (b.waiting ? ' on' : '') + '" data-w="' + cid + '"><i></i>Waiting on client (pauses the clock)</span>') + '</div>';
          }).join('') + '</div>' : '<div class="empty">No builds right now. Win a lead in the pipeline to start one.</div>');
      }
      U.on(el, '.check', 'click', function (e, t) { API.updateBuild(t.dataset.c, { step: +t.dataset.k }).then(function (b) { B[t.dataset.c] = b; draw(); }); });
      U.on(el, '.toggle', 'click', function (e, t) { var cid = t.dataset.w; API.updateBuild(cid, { waiting: !B[cid].waiting }).then(function (b) { B[cid] = b; draw(); U.toast(b.waiting ? 'Clock paused' : 'Clock running again'); }); });
      draw();
    });
  }

  /* ---------- Money ---------- */
  function moneyView(el, ctx) {
    ctx.title('Money');
    Promise.all([API.clients(), API.invoices()]).then(function (r) {
      var C = r[0], cm = byId(C), I = r[1];
      var mrr = C.reduce(function (s, c) { return s + c.mrr; }, 0);
      var plans = ['Growth', 'Essentials', 'Launch'], colors = ['#E8501A', '#F2A27E', '#DCD2C7'];
      var mix = plans.map(function (p) { return C.filter(function (c) { return c.plan === p; }).reduce(function (s, c) { return s + c.mrr; }, 0); });
      var failed = C.filter(function (c) { return c.status === 'past_due'; });
      var ending = C.filter(function (c) { return new Date(c.termEnds) - Date.now() < 90 * D; });
      el.innerHTML = '<div class="grid g4">' + kpi('Monthly revenue', money(mrr), '<span class="up">from ' + C.filter(function (c) { return c.mrr; }).length + ' subscriptions</span>') + kpi('Yearly run rate', money(mrr * 12), 'if nothing changes') + kpi('Average per client', money(Math.round(mrr / Math.max(1, C.length))), 'per month') + kpi('Failed payments', failed.length, failed.length ? '<span class="down">' + money(failed.reduce(function (s, c) { return s + c.mrr; }, 0)) + ' at risk</span>' : 'None') + '</div>' +
        '<div class="card"><div class="card-h"><h3>Revenue by plan</h3></div><div class="mix">' + mix.map(function (m, i) { return m ? '<i style="flex:' + m + ';background:' + colors[i] + '"></i>' : ''; }).join('') + '</div><div class="legend">' + plans.map(function (p, i) { return '<span><i style="background:' + colors[i] + '"></i>' + p + ' · ' + money(mix[i]) + '/mo</span>'; }).join('') + '</div></div>' +
        '<div class="grid g2"><div class="card"><div class="card-h"><h3>Needs attention</h3></div><div class="list">' +
        (failed.map(function (c) { return '<div class="row"><span class="ic red">' + icon('card', 17) + '</span><span class="grow"><b>' + esc(c.name) + '</b><small>Payment failed · Stripe retries automatically</small></span><b>' + money(c.mrr) + '</b></div>'; }).join('') +
          ending.map(function (c) { return '<div class="row"><span class="ic amber">' + icon('clock', 17) + '</span><span class="grow"><b>' + esc(c.name) + '</b><small>12-month term ends ' + U.date(c.termEnds) + ' · time to check in</small></span></div>'; }).join('') || '<div class="empty">Nothing to chase.</div>') +
        '</div></div><div class="card"><div class="card-h"><h3>Recent invoices</h3><span class="sample">FROM STRIPE</span></div><div class="list">' +
        I.sort(function (a, b) { return a.at < b.at ? 1 : -1; }).slice(0, 7).map(function (i) { return '<div class="row"><span class="grow"><b>' + esc(cm[i.client_id].name) + '</b><small>' + U.date(i.at) + '</small></span>' + (i.status === 'paid' ? '<span class="pill green">Paid</span>' : '<span class="pill red">Failed</span>') + '<b style="width:56px;text-align:right">' + money(i.amount) + '</b></div>'; }).join('') + '</div></div></div>';
    });
  }

  /* ---------- Site health ---------- */
  function health(el, ctx) {
    ctx.title('Site health');
    Promise.all([API.clients(), API.sites()]).then(function (r) {
      var C = r[0], S = r[1];
      function cell(v, warn, unit, good) { if (v == null) return '<span class="muted">—</span>'; var bad = warn(v); return '<span class="pill ' + (bad ? 'amber' : 'green') + '">' + v + unit + '</span>'; }
      el.innerHTML = '<p class="muted" style="margin:0">Checked every 5 minutes. Amber means it needs a look this week.</p><div class="tbl-wrap"><table><thead><tr><th>SITE</th><th>UPTIME (30D)</th><th>SPEED</th><th>CERTIFICATE</th><th>DOMAIN RENEWAL</th><th>LAST UPDATE</th></tr></thead><tbody>' +
        C.map(function (c) { var s = S[c.id] || {}; return '<tr class="click" data-id="' + c.id + '"><td><b>' + esc(c.name) + '</b><small>' + esc(c.domain || 'In build') + '</small></td><td>' + cell(s.uptime, function (v) { return v < 99.5; }, '%') + '</td><td>' + cell(s.speed, function (v) { return v < 90; }, '') + '</td><td>' + cell(s.ssl, function (v) { return v <= 14; }, ' days') + '</td><td>' + cell(s.renew, function (v) { return v <= 30; }, ' days') + '</td><td>' + U.rel(s.deploy) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      U.on(el, 'tr.click', 'click', function (e, t) { ctx.go('#/clients/' + t.dataset.id); });
    });
  }

  /* ---------- Messages ---------- */
  function messages(el, ctx, rest) {
    ctx.title('Messages');
    Promise.all([API.clients(), API.messages()]).then(function (r) {
      var C = r[0], last = lastMsgByClient(r[1]);
      C.sort(function (a, b) { return ((last[b.id] || {}).at || '') > ((last[a.id] || {}).at || '') ? 1 : -1; });
      var cur = rest[0] || (C[0] && C[0].id);
      el.innerHTML = '<div class="split"><div class="inbox" id="ib">' + C.map(function (c) { var m = last[c.id]; return '<button data-id="' + c.id + '"' + (c.id === cur ? ' class="on"' : '') + '><span class="av sm">' + U.initials(c.name) + '</span><div><b>' + esc(c.name) + '</b><small>' + (m ? (m.from === 'stoop' ? 'You: ' : '') + esc(m.body) : 'No messages') + '</small></div>' + (m && m.from === 'client' ? '<span class="unread"></span>' : '') + '</button>'; }).join('') + '</div><div id="tb"></div></div>';
      U.on(el, '#ib button', 'click', function (e, b) { ctx.go('#/messages/' + b.dataset.id); });
      var c = C.find(function (x) { return x.id === cur; }); if (c) thread(U.$('#tb', el), c);
    });
  }

  window.ADMIN = { badges: badges, views: { today: today, requests: requests, pipeline: pipeline, clients: clients, builds: builds, money: moneyView, health: health, messages: messages } };
})();
