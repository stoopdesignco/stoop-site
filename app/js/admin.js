/* STOOP admin back office */
(function () {
  var U = UI, icon = U.icon, esc = U.esc, D = 864e5;
  function byId(list) { var m = {}; list.forEach(function (c) { m[c.id] = c; }); return m; }
  function lastMsgByClient(msgs) { var m = {}; msgs.forEach(function (x) { if (!m[x.client_id] || x.at > m[x.client_id].at) m[x.client_id] = x; }); return m; }
  function sum(a, k) { return a.reduce(function (s, x) { return s + (k ? x[k] : x); }, 0); }
  function money(n) { return U.money(n); }
  function kpi(label, val, sub) { return '<div class="card kpi"><span>' + label + '</span><strong>' + val + '</strong><small>' + sub + '</small></div>'; }
  function kpiLink(label, val, sub, href) { return '<a class="card kpi" href="' + href + '"><span>' + label + '</span><strong>' + val + '</strong><small>' + sub + '</small><span class="go">' + icon('arrow', 16) + '</span></a>'; }
  function kpiBtn(label, val, sub, key, on) { return '<button class="card kpi' + (on ? ' on' : '') + '" data-k="' + key + '"><span>' + label + '</span><strong>' + val + '</strong><small>' + sub + '</small></button>'; }
  function buildInfo(b) {
    var paused = b.pausedMs + (b.waiting && b.waitStarted ? Date.now() - new Date(b.waitStarted).getTime() : 0);
    var elapsed = (Date.now() - new Date(b.start).getTime() - paused) / D;
    var deadline = new Date(new Date(b.start).getTime() + 14 * D + paused);
    var done = b.steps.filter(function (s) { return s.done; }).length;
    return { day: Math.min(14, Math.max(1, Math.ceil(elapsed))), left: Math.ceil((deadline - Date.now()) / D), deadline: deadline.toISOString(), pct: Math.round(done / b.steps.length * 100), done: done };
  }
  var STAGES = [['new', 'New request'], ['mockup', 'Mockup sent'], ['call', 'Call booked'], ['contract', 'Contract sent'], ['won', 'Won'], ['lost', 'Lost']];
  var REQS = ['received', 'progress', 'review', 'live'];
  var MOCK_STEPS = ['Pull their logo, colors and photos', 'Pick the layout for their business type', 'Write the headline and top 3 services', 'Build the homepage mockup', 'Record a 60-second walkthrough'];
  var LAYOUTS = {
    'Restaurant or café': 'Menu first · big Order button · hours and map up top',
    'Health or wellness': 'Calm hero photo · Book now button · services with prices',
    'Home services': 'Tap-to-call header · instant quote · service area map',
    'Retail shop': 'Featured products · Shop online button · store hours',
    'Salon or spa': 'Gallery hero · Book now · gift cards',
    'Outdoor or tours': 'Big photo hero · live conditions · Book a trip'
  };

  function badges() {
    return Promise.all([API.requests(), API.pipeline(), API.builds(), API.messages()]).then(function (r) {
      var last = lastMsgByClient(r[3]);
      return {
        requests: r[0].filter(function (x) { return x.status !== 'live'; }).length,
        pipeline: r[1].filter(function (x) { return x.stage === 'new'; }).length,
        mockups: r[1].filter(function (x) { return x.stage === 'new'; }).length,
        builds: Object.keys(r[2]).filter(function (k) { return r[2][k].steps.some(function (s) { return !s.done; }); }).length,
        messages: Object.keys(last).filter(function (k) { return last[k].from === 'client'; }).length
      };
    });
  }

  /* ---------- Today ---------- */
  function today(el, ctx) {
    ctx.title('Today');
    Promise.all([API.clients(), API.requests(), API.pipeline(), API.builds(), API.sites(), API.messages(), API.buyouts()]).then(function (r) {
      var C = r[0], cm = byId(C), R = r[1], P = r[2], B = r[3], S = r[4], M = r[5], BO = r[6];
      var mrr = sum(C, 'mrr');
      var open = R.filter(function (x) { return x.status !== 'live'; });
      var overdue = open.filter(function (x) { return new Date(x.due) < new Date(); });
      var mockups = P.filter(function (p) { return p.stage === 'new'; });
      var items = [];
      Object.keys(BO).forEach(function (cid) { if (cm[cid]) items.push([0, 'green', 'money', 'Buyout requested: ' + cm[cid].name, 'Quoted ' + money(BO[cid].price) + ' · send the payment link', '#/clients/' + cid + '/billing']); });
      open.filter(function (x) { return x.status === 'review' && x.approved; }).forEach(function (x) { items.push([0, 'green', 'check', 'Approved, ready to go live: ' + x.text, cm[x.client_id].name + ' approved ' + U.rel(x.approved), '#/requests']); });
      overdue.forEach(function (x) { items.push([0, 'red', 'alert', 'Overdue: ' + x.text, cm[x.client_id].name + ' · was due ' + U.rel(x.due), '#/requests']); });
      open.filter(function (x) { var ms = new Date(x.due) - Date.now(); return ms > 0 && ms < D; }).forEach(function (x) { items.push([1, 'amber', 'clock', x.text, cm[x.client_id].name + ' · due ' + U.rel(x.due), '#/requests']); });
      mockups.forEach(function (p) { var late = new Date(p.mockupDue) < new Date(); items.push([late ? 0 : 2, late ? 'red' : '', 'funnel', 'Mockup for ' + p.business, (late ? 'Late · was due ' : 'Due ') + U.rel(p.mockupDue), '#/mockups']); });
      Object.keys(B).forEach(function (cid) { var b = B[cid], i = buildInfo(b); if (b.steps.some(function (s) { return !s.done; })) items.push([i.left <= 4 ? 1 : 3, i.left <= 4 ? 'amber' : '', 'build', cm[cid].name + ': day ' + i.day + ' of 14', (b.waiting ? 'Paused, waiting on client · ' : '') + i.left + ' days to the deadline', '#/builds']); });
      C.filter(function (c) { return c.status === 'past_due'; }).forEach(function (c) { items.push([0, 'red', 'card', 'Payment failed: ' + c.name, money(c.mrr) + '/mo · card needs updating', '#/money']); });
      Object.keys(S).forEach(function (cid) { var s = S[cid]; if (!cm[cid]) return; if (s.ssl != null && s.ssl <= 14) items.push([1, 'amber', 'shield', 'Security certificate renews in ' + s.ssl + ' days', cm[cid].name, '#/health']); if (s.renew != null && s.renew <= 30) items.push([1, 'amber', 'globe', 'Domain expires in ' + s.renew + ' days', cm[cid].name + ' · ' + cm[cid].domain, '#/health']); if (s.uptime != null && s.uptime < 99.5) items.push([2, 'amber', 'pulse', 'Uptime ' + s.uptime + '% this month', cm[cid].name, '#/health']); });
      items.sort(function (a, b) { return a[0] - b[0]; });
      var latest = M.filter(function (m) { return m.from === 'client'; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; }).slice(0, 4);
      var hr = new Date().getHours(), buildsN = Object.keys(B).filter(function (k) { return B[k].steps.some(function (s) { return !s.done; }); }).length;
      el.innerHTML =
        '<div><h2 style="font-size:26px">Good ' + (hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening') + ', Chase.</h2><p class="muted" style="margin:6px 0 0">' + items.length + ' things need you. Here’s the order I’d take them in.</p></div>' +
        '<div class="grid g4">' + kpiLink('Monthly revenue', money(mrr), C.length + ' clients', '#/money') + kpiLink('Open requests', open.length, overdue.length ? '<span class="down">' + overdue.length + ' overdue</span>' : 'All on time', '#/requests') + kpiLink('Mockups to make', mockups.length, 'from the free-mockup form', '#/mockups') + kpiLink('Builds in progress', buildsN, '14-day promise', '#/builds') + '</div>' +
        '<div class="grid g21"><div class="card"><div class="card-h"><h3>Needs you now</h3><span class="pill">' + items.length + '</span></div><div class="list">' +
        (items.length ? items.map(function (i) { return '<a class="row" href="' + i[5] + '"><span class="ic ' + i[1] + '">' + icon(i[2], 17) + '</span><span class="grow"><b>' + esc(i[3]) + '</b><small>' + esc(i[4]) + '</small></span>' + icon('arrow', 16) + '</a>'; }).join('') : '<div class="empty">All clear. Nice work.</div>') +
        '</div></div><div style="display:flex;flex-direction:column;gap:16px"><div class="card"><div class="card-h"><h3>Latest from clients</h3><a href="#/messages">Messages</a></div><div class="list">' +
        latest.map(function (m) { return '<a class="row" href="#/messages/' + m.client_id + '"><span class="av sm">' + U.initials(cm[m.client_id].name) + '</span><span class="grow"><b>' + esc(cm[m.client_id].name) + '</b><small>' + esc(m.body) + '</small></span><small>' + U.rel(m.at) + '</small></a>'; }).join('') +
        '</div></div><div class="card"><div class="card-h"><h3>Pipeline</h3><a href="#/pipeline">Open</a></div><div class="list">' +
        STAGES.slice(0, 5).map(function (s) { var n = P.filter(function (p) { return p.stage === s[0]; }).length; return '<a class="row" href="' + (s[0] === 'new' ? '#/mockups' : '#/pipeline/' + s[0]) + '" style="padding:10px 4px"><span class="grow" style="font-size:14px">' + s[1] + '</span><b style="width:auto">' + n + '</b>' + icon('arrow', 15) + '</a>'; }).join('') + '</div></div></div></div>';
    });
  }

  /* ---------- board helpers (kanban on desktop, stacked sections on phones) ---------- */
  function wireSections(el, focus) {
    U.on(el, '.col-h', 'click', function (e, h) { if (window.innerWidth <= 860) h.parentNode.classList.toggle('closed'); });
    if (focus) setTimeout(function () { var c = U.$('.col[data-s="' + focus + '"]', el); if (c) { c.classList.remove('closed'); c.classList.add('flash'); c.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' }); } }, 120);
  }

  /* ---------- Requests ---------- */
  function requests(el, ctx, rest) {
    ctx.title('Requests');
    ctx.actions('<button class="btn primary" id="newReq">' + icon('plus', 16) + '<span class="lbl">New request</span></button>');
    var filter = '';
    Promise.all([API.clients(), API.requests()]).then(function (r) {
      var C = r[0], cm = byId(C), R = r[1];
      function draw() {
        var list = R.filter(function (x) { return !filter || x.client_id === filter; });
        el.innerHTML = '<div class="filters"><select id="rf"><option value="">All clients</option>' + C.map(function (c) { return '<option value="' + c.id + '"' + (filter === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select><span class="muted hide-m" style="font-size:13px">Promise: live within 2 business days. Drag cards between columns.</span></div>' +
          '<div class="board">' + REQS.map(function (s) {
            var items = list.filter(function (x) { return x.status === s; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
            if (s === 'live') items = items.slice(0, 6);
            return '<div class="col' + (s === 'live' ? ' closed' : '') + '" data-s="' + s + '"><div class="col-h">' + U.reqPill(s) + '<span class="n">' + items.length + '</span><span class="chev">' + icon('arrow', 14) + '</span></div><div class="col-b">' +
              (items.length ? items.map(function (x) { return '<button class="tk" draggable="true" data-id="' + x.id + '"><span class="tk-meta"><span>' + esc(cm[x.client_id].name) + '</span><span>' + (x.buyout ? 'Buyout' : U.srcLabel(x.source)) + '</span></span><b>' + esc(x.text) + '</b><span class="tk-meta">' + (s === 'live' ? '<span class="pill green">Live ' + U.rel(x.done) + '</span>' : x.approved ? '<span class="pill green">' + icon('check', 12) + ' Client approved</span>' : U.due(x.due)) + '</span></button>'; }).join('') : '<div class="col-empty">Nothing here</div>') + '</div></div>';
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
        API.updateRequest(x.id, { status: 'live' }).then(function (n) { Object.assign(x, n); return API.sendMessage(x.client_id, 'Done! “' + x.text + '” is live on your site ✓'); })
          .then(function () { U.closeDrawer(); draw(); U.toast('Marked live and texted ' + cm[x.client_id].owner.split(' ')[0]); });
      }
      U.on(el, '.tk', 'click', function (e, t) {
        var x = R.find(function (q) { return q.id === t.dataset.id; }), c = cm[x.client_id];
        U.openDrawer('<div class="dr-h"><div style="flex:1"><span class="muted" style="font-size:13px">' + esc(c.name) + ' · ' + c.plan + '</span><h3>' + esc(x.text) + '</h3></div><button class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button></div>' +
          '<div class="dr-b"><div class="kv"><span>Came in by</span><b>' + U.srcLabel(x.source) + '</b><span>Received</span><b>' + U.date(x.created, true) + '</b><span>Due</span><b>' + (x.status === 'live' ? 'Done ' + U.rel(x.done) : U.date(x.due, true) + ' ' + U.due(x.due)) + '</b><span>Site</span><b>' + esc(c.domain || 'Not connected yet') + '</b>' + (x.approved ? '<span>Client</span><b><span class="pill green">Approved ' + U.rel(x.approved) + '</span></b>' : '') + '</div>' +
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
      draw(); wireSections(el, rest && rest[0]);
    });
  }

  /* ---------- Pipeline ---------- */
  function pipeline(el, ctx, rest) {
    ctx.title('Sales pipeline');
    API.pipeline().then(function (P) {
      function draw() {
        el.innerHTML = '<p class="muted" style="margin:0">Every free-mockup request lands in <b>New request</b>. Build mockups in <a href="#/mockups" class="link">Mockups</a>.</p><div class="board" style="--cols:6">' + STAGES.map(function (s) {
          var items = P.filter(function (p) { return p.stage === s[0]; });
          return '<div class="col' + (s[0] === 'lost' ? ' closed' : '') + '" data-s="' + s[0] + '"><div class="col-h"><span>' + s[1] + '</span><span class="n">' + items.length + '</span><span class="chev">' + icon('arrow', 14) + '</span></div><div class="col-b">' +
            (items.length ? items.map(function (p) { return '<button class="tk" data-id="' + p.id + '"><span class="tk-meta"><span>' + esc(p.type) + '</span><span>' + U.rel(p.created) + '</span></span><b>' + esc(p.business) + '</b><span class="tk-meta"><span>Wants: ' + esc(p.goal) + '</span>' + (p.stage === 'new' ? U.due(p.mockupDue) : '<span class="pill">' + esc(p.plan) + '</span>') + '</span></button>'; }).join('') : '<div class="col-empty">Nothing here</div>') + '</div></div>';
        }).join('') + '</div>';
      }
      U.on(el, '.tk', 'click', function (e, t) {
        var p = P.find(function (q) { return q.id === t.dataset.id; });
        U.openDrawer('<div class="dr-h"><div style="flex:1"><span class="muted" style="font-size:13px">' + esc(p.type) + '</span><h3>' + esc(p.business) + '</h3></div><button class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button></div>' +
          '<div class="dr-b"><div class="kv"><span>Contact</span><b>' + esc(p.contact) + '</b><span>Email</span><b>' + esc(p.email) + '</b><span>Phone</span><b>' + esc(p.phone) + '</b><span>Wants</span><b>' + esc(p.goal) + '</b><span>Plan interest</span><b>' + esc(p.plan) + '</b><span>Came in</span><b>' + U.date(p.created, true) + '</b>' + (p.stage === 'new' ? '<span>Mockup due</span><b>' + U.date(p.mockupDue, true) + '</b>' : '') + '</div>' +
          (p.stage === 'new' ? '<a class="btn" href="#/mockups/' + p.id + '">' + icon('build', 16) + ' Work on the mockup</a>' : '') +
          '<div style="display:flex;flex-direction:column;gap:8px"><span class="muted" style="font-size:13px;font-weight:500">Stage</span><div class="steps-sel" id="ps">' + STAGES.map(function (s) { return '<button data-s="' + s[0] + '"' + (p.stage === s[0] ? ' class="on"' : '') + '>' + s[1] + '</button>'; }).join('') + '</div></div>' +
          '<label class="field">Notes<textarea id="pn">' + esc(p.notes) + '</textarea></label></div>' +
          '<div class="dr-f">' + (p.stage !== 'won' ? '<button class="btn" id="pc">' + icon('send', 16) + ' Send contract + payment link</button><button class="btn primary" id="pw">' + icon('check', 16) + ' Won: create client</button>' : '<span class="muted">Already a client.</span>') + '</div>', function (d) {
          U.on(d, '#ps button', 'click', function (ev, b) { API.updateLeadStage(p.id, { stage: b.dataset.s }).then(function () { p.stage = b.dataset.s; draw(); U.$$('#ps button', d).forEach(function (q) { q.classList.toggle('on', q === b); }); }); });
          U.$('#pn', d).addEventListener('change', function (ev) { API.updateLeadStage(p.id, { notes: ev.target.value }).then(function () { p.notes = ev.target.value; U.toast('Notes saved'); }); });
          var c = U.$('#pc', d); if (c) c.addEventListener('click', function () { API.updateLeadStage(p.id, { stage: 'contract' }).then(function () { p.stage = 'contract'; draw(); U.closeDrawer(); U.toast('Contract and payment link sent to ' + p.contact.split(' ')[0] + ' (demo)'); }); });
          var w = U.$('#pw', d); if (w) w.addEventListener('click', function () { API.winLead(p.id).then(function (cl) { U.toast(cl.name + ' is a client. 14-day build started.'); ctx.go('#/clients/' + cl.id); }); });
        });
      });
      draw(); wireSections(el, rest && rest[0]);
    });
  }

  /* ---------- Mockups ---------- */
  function mockups(el, ctx, rest) {
    ctx.title('Mockups');
    API.pipeline().then(function (P) {
      var focus = rest && rest[0];
      function draw() {
        var todo = P.filter(function (p) { return p.stage === 'new'; }).sort(function (a, b) { return a.mockupDue < b.mockupDue ? -1 : 1; });
        var sent = P.filter(function (p) { return p.stage === 'mockup' || (p.mockSent && p.stage !== 'new'); });
        var all = P.filter(function (p) { return p.stage !== 'new'; }), toCall = all.filter(function (p) { return ['call', 'contract', 'won'].indexOf(p.stage) > -1; });
        var soon = todo.filter(function (p) { return new Date(p.mockupDue) - Date.now() < D; }).length;
        el.innerHTML = '<div class="grid g4">' + kpi('To make', todo.length, '72-hour promise') + kpi('Due within 24h', soon, soon ? '<span class="down">start these first</span>' : 'nothing urgent') + kpi('Sent, waiting to hear back', P.filter(function (p) { return p.stage === 'mockup'; }).length, 'follow up after 2 days') + kpi('Mockup → call rate', all.length ? Math.round(toCall.length / all.length * 100) + '%' : '—', toCall.length + ' of ' + all.length + ' booked a call') + '</div>' +
          '<div class="card-h" style="padding:0 2px"><h3>To make</h3></div>' +
          (todo.length ? '<div class="grid g2">' + todo.map(function (p) {
            var m = p.mock || { steps: [false, false, false, false, false], url: '' }, done = m.steps.filter(Boolean).length;
            var total = 72 * 3600e3, left = new Date(p.mockupDue) - Date.now(), used = Math.min(100, Math.max(0, Math.round((total - left) / total * 100)));
            return '<div class="card mock' + (focus === p.id ? ' focus' : '') + '" data-id="' + p.id + '"><div class="card-h"><div><h3>' + esc(p.business) + '</h3><span class="muted" style="font-size:13px">' + esc(p.type) + ' · wants ' + esc(p.goal.toLowerCase()) + ' · ' + esc(p.plan) + '</span></div>' + U.due(p.mockupDue) + '</div>' +
              '<div class="bar' + (left < D ? ' warn' : '') + '"><i style="width:' + used + '%"></i></div>' +
              '<div class="layout-tip">' + icon('grid', 15) + '<span><b>Suggested layout:</b> ' + esc(LAYOUTS[p.type] || 'Clear hero · main action button · services · reviews') + '</span></div>' +
              '<div>' + MOCK_STEPS.map(function (s, k) { return '<div class="check' + (m.steps[k] ? ' done' : '') + '" data-step="' + k + '"><span class="box">' + (m.steps[k] ? icon('check', 13) : '') + '</span><span>' + s + '</span></div>'; }).join('') + '</div>' +
              '<label class="field">Mockup link<input data-url placeholder="Paste the preview link" value="' + esc(m.url) + '"></label>' +
              '<div class="mock-f"><a class="btn sm" href="tel:' + esc(p.phone.replace(/[^0-9+]/g, '')) + '">' + icon('phone', 14) + ' Call</a><span class="muted" style="font-size:12.5px;flex:1">' + done + ' of 5 steps</span><button class="btn sm primary" data-send>' + icon('send', 14) + ' Text them the mockup</button></div></div>';
          }).join('') + '</div>' : '<div class="empty">No mockups to make. New free-mockup requests show up here.</div>') +
          '<div class="card"><div class="card-h"><h3>Sent</h3><span class="pill">' + sent.length + '</span></div><div class="list">' + (sent.length ? sent.map(function (p) { var st = STAGES.find(function (s) { return s[0] === p.stage; }); return '<div class="row"><span class="ic gray">' + icon('send', 16) + '</span><span class="grow"><b>' + esc(p.business) + '</b><small>' + (p.mockSent ? 'Sent ' + U.rel(p.mockSent) : 'Sent') + ' · ' + esc(st ? st[1] : p.stage) + '</small></span>' + (p.stage === 'mockup' ? '<button class="btn sm" data-call="' + p.id + '">Call booked</button>' : '<span class="pill">' + esc(st ? st[1] : '') + '</span>') + '</div>'; }).join('') : '<div class="empty">Nothing sent yet.</div>') + '</div></div>';
        if (focus) { var f = U.$('.mock.focus', el); if (f) f.scrollIntoView({ block: 'center' }); focus = null; }
      }
      U.on(el, '.mock .check', 'click', function (e, t) {
        var p = P.find(function (x) { return x.id === t.closest('.mock').dataset.id; }), m = p.mock || { steps: [false, false, false, false, false], url: '' };
        m.steps[+t.dataset.step] = !m.steps[+t.dataset.step];
        API.updateMockup(p.id, { steps: m.steps }).then(function (n) { p.mock = n.mock; draw(); });
      });
      el.addEventListener('change', function (e) { if (!e.target.matches('[data-url]')) return; var p = P.find(function (x) { return x.id === e.target.closest('.mock').dataset.id; }); API.updateMockup(p.id, { url: e.target.value }).then(function (n) { p.mock = n.mock; U.toast('Link saved'); }); });
      U.on(el, '[data-send]', 'click', function (e, b) {
        var card = b.closest('.mock'), p = P.find(function (x) { return x.id === card.dataset.id; }), url = U.$('[data-url]', card).value.trim();
        if (!url) { U.toast('Paste the mockup link first'); U.$('[data-url]', card).focus(); return; }
        API.updateMockup(p.id, { url: url }).then(function () { return API.sendMockup(p.id); }).then(function (n) { Object.assign(p, n); draw(); U.toast('Mockup texted to ' + p.contact + '. Moved to Mockup sent.'); });
      });
      U.on(el, '[data-call]', 'click', function (e, b) { API.updateLeadStage(b.dataset.call, { stage: 'call' }).then(function (n) { Object.assign(P.find(function (x) { return x.id === n.id; }), n); draw(); U.toast('Moved to Call booked'); }); });
      draw();
    });
  }

  /* ---------- Clients ---------- */
  function clients(el, ctx, rest) {
    if (rest[0]) return clientDetail(el, ctx, rest[0], rest[1]);
    ctx.title('Clients');
    Promise.all([API.clients(), API.sites(), API.mrrHistory()]).then(function (r) {
      var C = r[0], S = r[1], H = r[2];
      return Promise.all(C.map(function (c) { return API.grant(c.id); })).then(function (G) {
        var mrr = sum(C, 'mrr'), f = 'all', q = '', view = 'list';
        var gm = {}; C.forEach(function (c, i) { gm[c.id] = G[i]; });
        function draw() {
          var list = C.filter(function (c) { return (f === 'all' || (f === 'access' ? gm[c.id] : c.status === f)) && (!q || (c.name + ' ' + c.owner).toLowerCase().indexOf(q) > -1); });
          el.innerHTML = '<div class="grid g4">' + kpiBtn('Clients', C.length, C.filter(function (c) { return c.status === 'building'; }).length + ' building', 'all', f === 'all' && view === 'list') + kpiBtn('Monthly revenue', money(mrr), 'tap for the trend', 'rev', view === 'rev') + kpiBtn('Support access on', G.filter(Boolean).length, 'clients let you in', 'access', f === 'access') + kpiBtn('Payment issues', C.filter(function (c) { return c.status === 'past_due'; }).length, 'need a new card', 'past_due', f === 'past_due') + '</div>' +
            (view === 'rev' ? '<div class="card"><div class="card-h"><h3>Monthly revenue, last 12 months</h3><span class="sample">TAP A POINT</span></div>' + U.line(H.map(function (h) { var d = new Date(h.d); return { value: h.value, show: money(h.value) + '/mo', label: d.toLocaleDateString('en-US', { month: 'short' }), full: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }; }), { every: 2, zero: true }) + '</div>' : '') +
            '<div class="filters"><input id="cq" placeholder="Search clients" value="' + esc(q) + '" style="flex:1;min-width:180px"><div class="nowrap-row">' + [['all', 'All'], ['active', 'Active'], ['building', 'Building'], ['past_due', 'Payment issue'], ['access', 'Access on']].map(function (x) { return '<button class="btn sm' + (f === x[0] ? ' dark' : '') + '" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
            (list.length ? '<div class="cgrid">' + list.map(function (c) {
              var s = S[c.id] || {}, g = gm[c.id];
              return '<a class="card ccard" href="#/clients/' + c.id + '"><div class="cc-top"><span class="av" style="width:42px;height:42px;border-radius:12px">' + U.initials(c.name) + '</span><div class="grow"><b>' + esc(c.name) + '</b><small>' + esc(c.owner) + '</small></div>' + U.clientPill(c.status) + '</div>' +
                '<div class="cc-stats"><div><span>Plan</span><b>' + c.plan + '</b></div><div><span>Monthly</span><b>' + (c.mrr ? money(c.mrr) : 'One-time') + '</b></div><div><span>Site</span><b>' + (s.uptime != null ? s.uptime + '% up' : 'In build') + '</b></div></div>' +
                '<div class="cc-foot">' + (g ? '<span class="pill green">' + icon('unlock', 12) + ' Access until ' + U.date(g.expires) + '</span>' : '<span class="pill">' + icon('lock', 12) + ' Customer info private</span>') + '<span class="muted" style="font-size:12px">Term ends ' + U.date(c.termEnds) + '</span></div></a>';
            }).join('') + '</div>' : '<div class="empty">No clients match.</div>');
          var qi = U.$('#cq', el); qi.addEventListener('input', function () { q = qi.value.toLowerCase(); var pos = qi.selectionStart; draw(); var n = U.$('#cq', el); n.focus(); n.setSelectionRange(pos, pos); });
        }
        U.on(el, '[data-k]', 'click', function (e, b) { var k = b.dataset.k; if (k === 'rev') view = view === 'rev' ? 'list' : 'rev'; else { f = k; view = 'list'; } draw(); });
        U.on(el, '[data-f]', 'click', function (e, b) { f = b.dataset.f; draw(); });
        draw();
      });
    });
  }
  function clientDetail(el, ctx, cid, tab) {
    tab = tab || 'overview';
    Promise.all([API.client(cid), API.site(cid), API.grant(cid), API.counts(cid), API.texts(cid), API.closed(cid), API.automations(cid), API.buyout(cid)]).then(function (r) {
      var c = r[0], s = r[1] || {}, g = r[2], n = r[3], tx = r[4], closed = r[5], autos = r[6] || [], bo = r[7];
      if (!c) return ctx.go('#/clients');
      ctx.title(c.name);
      ctx.actions('<a class="btn" href="#/clients"><span class="lbl">All clients</span><span class="hide-d">←</span></a>' + (g ? '<a class="btn dark" href="#/as/' + cid + '/overview">' + icon('eye', 16) + '<span class="lbl">View as client</span></a>' : ''));
      var TABS = [['overview', 'Overview'], ['analytics', 'Analytics'], ['customers', 'Customer data'], ['requests', 'Requests'], ['messages', 'Messages'], ['billing', 'Billing'], ['access', 'Access log']];
      el.innerHTML = '<div class="card" style="flex-direction:row;align-items:center;flex-wrap:wrap;gap:16px"><span class="av" style="width:52px;height:52px;border-radius:14px;font-size:17px">' + U.initials(c.name) + '</span><div style="flex:1;min-width:200px"><h2 style="font-size:22px">' + esc(c.name) + '</h2><span class="muted" style="font-size:13.5px">' + esc(c.owner) + ' · ' + esc(c.email) + ' · ' + esc(c.phone) + '</span></div>' + U.clientPill(c.status) + (closed ? '<span class="pill amber">' + icon('moon', 12) + ' Closed today</span>' : '') + '<span class="pill dark">' + c.plan + (c.mrr ? ' · ' + money(c.mrr) + '/mo' : '') + '</span></div>' +
        (g ? '<div class="access">' + icon('unlock', 18) + '<span class="grow"><b>Support access is on</b> until ' + U.date(g.expires, true) + '. Every customer record you open is logged and visible to ' + esc(c.owner.split(' ')[0]) + '.</span></div>'
          : '<div class="access off">' + icon('lock', 18) + '<span class="grow">Customer info is <b>private</b>. You can see totals and everything about their site, but not their customers’ names or details.</span></div>') +
        '<div class="tabs" id="ct">' + TABS.map(function (t) { return '<button data-t="' + t[0] + '"' + (t[0] === tab ? ' class="on"' : '') + '>' + t[1] + '</button>'; }).join('') + '</div><div id="cb" style="display:flex;flex-direction:column;gap:16px"></div>';
      U.on(el, '#ct button', 'click', function (e, b) { ctx.go('#/clients/' + cid + '/' + b.dataset.t); });
      var on = U.$('#ct button.on', el); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
      var cb = U.$('#cb', el);
      if (tab === 'overview') {
        cb.innerHTML = '<div class="grid g4">' + kpi('Leads', n.leads, 'all time') + kpi('Bookings', n.bookings, money(n.deposits) + ' in deposits') + kpi('Orders', n.orders, money(n.sales) + ' in sales') + kpi('Chats', n.chats, 'conversations') + '</div>' +
          '<div class="grid g2"><div class="card"><div class="card-h"><h3>Site</h3>' + (c.domain ? '<span class="pill green">' + esc(c.domain) + '</span>' : '<span class="pill orange">Not live yet</span>') + '</div><div class="kv"><span>Uptime</span><b>' + (s.uptime != null ? s.uptime + '%' : '—') + '</b><span>Speed score</span><b>' + (s.speed || '—') + '</b><span>Certificate</span><b>' + (s.ssl != null ? 'Renews in ' + s.ssl + ' days' : '—') + '</b><span>Domain</span><b>' + (s.renew != null ? 'Renews in ' + s.renew + ' days' : '—') + '</b><span>Last update</span><b>' + U.rel(s.deploy) + '</b></div></div>' +
          '<div class="card"><div class="card-h"><h3>Plan and tools</h3></div><div class="kv"><span>Plan</span><b>' + c.plan + '</b><span>Started</span><b>' + U.date(c.started) + '</b><span>Term ends</span><b>' + U.date(c.termEnds) + '</b><span>Texts this month</span><b>' + (tx ? tx.used + (tx.limit ? ' of ' + tx.limit : '') : '—') + '</b><span>Automations on</span><b>' + autos.filter(function (a) { return a.on; }).length + ' of ' + autos.length + '</b><span>Tools</span><b>' + (c.tools.length ? c.tools.map(function (t) { return '<span class="pill" style="margin:0 4px 4px 0">' + t + '</span>'; }).join('') : 'None yet') + '</b></div></div></div>';
      } else if (tab === 'analytics') {
        CLIENT.views.analytics(cb, { title: function () {}, actions: function () {} }, c);
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
          cb.innerHTML = (bo && bo.eligible ? '<div class="card"><div class="card-h"><h3>Buyout</h3>' + (bo.requested ? '<span class="pill orange">Requested ' + U.rel(bo.requested.at) + '</span>' : '<span class="pill">Not requested</span>') + '</div><div class="kv"><span>Price today</span><b>' + money(bo.price) + '</b><span>How</span><b>' + bo.months + ' months × ' + money(bo.monthly) + '</b></div>' + (bo.requested ? '<button class="btn primary" id="boLink">' + icon('send', 16) + ' Send Stripe payment link</button>' : '') + '</div>' : '') +
            '<div class="tbl-wrap"><table><thead><tr><th>DATE</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>' + I.map(function (i) { return '<tr><td>' + U.date(i.at) + '</td><td>' + money(i.amount) + '</td><td>' + (i.status === 'paid' ? '<span class="pill green">Paid</span>' : '<span class="pill red">Failed</span>') + '</td></tr>'; }).join('') + '</tbody></table></div><p class="muted" style="font-size:13px;margin:0">Billing runs through Stripe. Card details never touch STOOP.</p>';
          var bl = U.$('#boLink', cb); if (bl) bl.addEventListener('click', function () { API.sendMessage(cid, 'Here’s your secure buyout payment link: ' + money(bo.price) + '. Once it’s paid, I’ll send everything over within 5 business days.').then(function () { U.toast('Payment link texted (demo)'); }); });
        });
      } else if (tab === 'access') {
        API.accessLog(cid).then(function (L) {
          cb.innerHTML = '<p class="muted" style="margin:0">The client sees this exact list in their Settings.</p>' + (L.length ? '<div class="tbl-wrap"><table><thead><tr><th>WHO</th><th>OPENED</th><th>WHEN</th></tr></thead><tbody>' + L.map(function (l) { return '<tr><td>' + esc(l.who) + '</td><td>' + esc(l.area) + '</td><td>' + U.date(l.at, true) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">STOOP has never opened this client’s customer data.</div>');
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
        cb.innerHTML = U.lockPanel(c.name, n.leads + n.bookings + n.orders + n.chats, 'customer records', true);
        U.$('[data-ask]', cb).addEventListener('click', function () { API.sendMessage(c.id, 'Hi ' + c.owner.split(' ')[0] + '! To help with this, could you turn on Support access in Settings? It turns itself off when the time is up, and you’ll see everything I open.').then(function () { U.toast('Access request texted to ' + c.owner.split(' ')[0]); }); });
      });
      return;
    }
    var cur = areas[0][0];
    function drawArea() {
      cb.innerHTML = '<div class="nowrap-row" id="ca">' + areas.map(function (a) { return '<button class="btn sm' + (a[0] === cur ? ' dark' : '') + '" data-a="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '<span class="sample" style="align-self:center">READ-ONLY · LOGGED</span></div><div id="cad"></div>';
      API[cur](c.id).then(function (res) { U.$('#cad', cb).innerHTML = customerTable(cur, res.rows || []); });
    }
    U.on(cb, '#ca button', 'click', function (e, b) { cur = b.dataset.a; drawArea(); });
    drawArea();
  }
  function customerTable(kind, rows) {
    if (!rows.length) return '<div class="empty">Nothing here yet.</div>';
    if (kind === 'leads') return '<div class="tbl-wrap"><table><thead><tr><th>FROM</th><th>CAME IN THROUGH</th><th>DETAILS</th><th>WHEN</th></tr></thead><tbody>' + rows.map(function (l) { return '<tr><td><b>' + esc(l.name) + '</b><small>' + esc(l.email) + ' · ' + esc(l.phone) + '</small></td><td><span class="pill">' + esc(l.source) + '</span></td><td>' + esc(l.detail) + '</td><td>' + U.rel(l.at) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    if (kind === 'bookings') return '<div class="tbl-wrap"><table><thead><tr><th>WHEN</th><th>CUSTOMER</th><th>SERVICE</th><th>DEPOSIT</th></tr></thead><tbody>' + rows.filter(function (b) { return new Date(b.when) > Date.now() - D; }).sort(function (a, b) { return a.when < b.when ? -1 : 1; }).slice(0, 25).map(function (b) { return '<tr><td><b>' + U.date(b.when, true) + '</b></td><td>' + esc(b.customer) + '<small>' + esc(b.email) + ' · ' + esc(b.phone) + '</small></td><td>' + esc(b.service) + '</td><td>' + money(b.deposit) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    if (kind === 'orders') return '<div class="tbl-wrap"><table><thead><tr><th>CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>STATUS</th></tr></thead><tbody>' + rows.map(function (o) { return '<tr><td><b>' + esc(o.customer) + '</b><small>' + esc(o.email) + '</small></td><td>' + esc(o.items) + '</td><td>' + money(o.total) + '</td><td><span class="pill">' + esc(o.status) + '</span></td></tr>'; }).join('') + '</tbody></table></div>';
    return '<div class="list card">' + rows.map(function (ch) { var last = ch.msgs[ch.msgs.length - 1]; return '<div class="row"><span class="av sm">' + U.initials(ch.customer) + '</span><span class="grow"><b>' + esc(ch.customer) + '</b><small>' + esc(last.body) + '</small></span><small>' + U.rel(last.at) + '</small></div>'; }).join('') + '</div>';
  }
  function thread(box, c, onBack) {
    API.messages(c.id).then(function (M) {
      M.sort(function (a, b) { return a.at < b.at ? -1 : 1; });
      box.innerHTML = '<div class="card" style="gap:12px"><div class="card-h">' + (onBack ? '<button class="btn sm ghost back-btn" id="bk">← All</button>' : '') + '<h3 style="flex:1">' + esc(c.name) + '</h3><span class="muted" style="font-size:12.5px">Designer line · ' + esc(c.phone) + '</span></div><div class="thread" id="th">' +
        (M.length ? M.map(function (m) { return '<div class="bub' + (m.from === 'stoop' ? ' me' : '') + '">' + esc(m.body) + '<time>' + U.date(m.at, true) + '</time></div>'; }).join('') : '<span class="muted" style="margin:auto">No messages yet.</span>') +
        '</div><div class="qr" id="qr"><button>Got it! Working on it now.</button><button>Done. It’s live on your site ✓</button><button>Could you email me that photo?</button><button>Want to hop on a quick call?</button></div><form class="compose" id="cf"><input id="ci" placeholder="Text ' + esc(c.owner.split(' ')[0]) + '…" autocomplete="off"><button class="btn primary">' + icon('send', 16) + '<span class="lbl">Send</span></button></form>' +
        '<button class="btn sm" id="toReq" style="align-self:flex-start">' + icon('plus', 14) + ' Turn last message into a request</button></div>';
      var th = U.$('#th', box); th.scrollTop = th.scrollHeight;
      var bk = U.$('#bk', box); if (bk) bk.addEventListener('click', onBack);
      function send(t) { if (!t) return; API.sendMessage(c.id, t).then(function () { thread(box, c, onBack); }); }
      U.$('#cf', box).addEventListener('submit', function (e) { e.preventDefault(); send(U.$('#ci', box).value.trim()); });
      U.$$('#qr button', box).forEach(function (b) { b.addEventListener('click', function () { U.$('#ci', box).value = b.textContent; U.$('#ci', box).focus(); }); });
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
          (keys.length ? keys.map(function (cid) {
            var b = B[cid], i = buildInfo(b), c = cm[cid], done = b.steps.every(function (s) { return s.done; }), next = b.steps.findIndex(function (s) { return !s.done; });
            var ring = 2 * Math.PI * 26, off = ring * (1 - i.pct / 100);
            return '<div class="card build"><div class="b-top"><svg class="ring" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" stroke="#F1ECE6" stroke-width="7" fill="none"/><circle cx="32" cy="32" r="26" stroke="#E8501A" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="' + ring.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle" font-size="14" font-weight="700" fill="#141210">' + i.pct + '%</text></svg>' +
              '<div class="grow"><h3>' + esc(c.name) + '</h3><span class="muted" style="font-size:13px">' + c.plan + ' · started ' + U.date(b.start) + '</span></div>' + (done ? '<span class="pill green">Live</span>' : b.waiting ? '<span class="pill amber">Paused</span>' : '<span class="pill orange">Day ' + i.day + ' of 14</span>') + '</div>' +
              '<div class="tl"><div class="tl-track"><i style="width:' + ((i.day - 0.5) / 14 * 100) + '%"></i></div>' + b.steps.map(function (s, k) { return '<button class="tl-dot' + (s.done ? ' done' : '') + (k === next ? ' next' : '') + '" style="left:' + ((s.day - 0.5) / 14 * 100) + '%" data-c="' + cid + '" data-k="' + k + '" title="Day ' + s.day + ': ' + esc(s.name) + '"></button>'; }).join('') +
              '<div class="tl-days"><span>Day 1</span><span>Day 7</span><span>Day 14</span></div></div>' +
              (done ? '<div class="access">' + icon('check', 18) + '<span class="grow">Launched. Nice work.</span></div>' :
                '<div class="next-step"><div class="grow"><span class="muted" style="font-size:12.5px">Next up · day ' + b.steps[next].day + '</span><b>' + esc(b.steps[next].name) + '</b></div><button class="btn sm primary" data-c="' + cid + '" data-k="' + next + '">' + icon('check', 14) + ' Mark done</button></div>' +
                '<div class="b-acts"><span class="toggle' + (b.waiting ? ' on' : '') + '" data-w="' + cid + '"><i></i>Waiting on client</span><button class="btn sm" data-nudge="' + cid + '">' + icon('send', 14) + ' Text for content</button><span class="muted" style="font-size:12.5px;margin-left:auto">Deadline ' + U.date(i.deadline) + ' · ' + i.left + ' days left</span></div>') +
              '<details><summary>All steps (' + i.done + ' of ' + b.steps.length + ')</summary>' + b.steps.map(function (s, k) { return '<div class="check' + (s.done ? ' done' : '') + '" data-c="' + cid + '" data-k="' + k + '"><span class="box">' + (s.done ? icon('check', 13) : '') + '</span><span>' + esc(s.name) + '</span><small>Day ' + s.day + '</small></div>'; }).join('') + '</details></div>';
          }).join('') : '<div class="empty">No builds right now. Win a lead in the pipeline to start one.</div>');
      }
      U.on(el, '[data-k]', 'click', function (e, t) { API.updateBuild(t.dataset.c, { step: +t.dataset.k }).then(function (b) { B[t.dataset.c] = b; draw(); }); });
      U.on(el, '[data-w]', 'click', function (e, t) { var cid = t.dataset.w; API.updateBuild(cid, { waiting: !B[cid].waiting }).then(function (b) { B[cid] = b; draw(); U.toast(b.waiting ? 'Clock paused' : 'Clock running again'); }); });
      U.on(el, '[data-nudge]', 'click', function (e, t) { var c = cm[t.dataset.nudge]; API.sendMessage(c.id, 'Hi ' + c.owner.split(' ')[0] + '! To keep your launch on track, could you send your photos and service list today?').then(function () { U.toast('Texted ' + c.owner.split(' ')[0]); }); });
      draw();
    });
  }

  /* ---------- Money ---------- */
  function moneyView(el, ctx) {
    ctx.title('Money');
    Promise.all([API.clients(), API.invoices(), API.mrrHistory()]).then(function (r) {
      var C = r[0], cm = byId(r[0]), I = r[1], H = r[2], show = 'mrr';
      var mrr = sum(C, 'mrr'), failed = C.filter(function (c) { return c.status === 'past_due'; }), ending = C.filter(function (c) { return new Date(c.termEnds) - Date.now() < 90 * D; });
      var plans = ['Growth', 'Essentials', 'Launch'], colors = ['#E8501A', '#F2A27E', '#DCD2C7'];
      var mix = plans.map(function (p) { return sum(C.filter(function (c) { return c.plan === p; }), 'mrr'); });
      function draw() {
        var chart = show === 'mrr' ? '<div class="card-h"><h3>Monthly revenue, last 12 months</h3><span class="sample">TAP A POINT</span></div>' + U.line(H.map(function (h) { var d = new Date(h.d); return { value: h.value, show: money(h.value) + '/mo', label: d.toLocaleDateString('en-US', { month: 'short' }), full: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }; }), { every: 2, zero: true })
          : show === 'year' ? '<div class="card-h"><h3>Yearly run rate by month</h3></div>' + U.bars(H.map(function (h) { var d = new Date(h.d); return { value: h.value * 12, show: money(h.value * 12) + ' a year', label: d.toLocaleDateString('en-US', { month: 'short' }).slice(0, 3), full: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }; }), { every: 2 })
            : show === 'avg' ? '<div class="card-h"><h3>Revenue per client</h3></div>' + U.bars(C.filter(function (c) { return c.mrr; }).map(function (c) { return { value: c.mrr, show: money(c.mrr) + '/mo', label: U.initials(c.name), full: c.name + ' · ' + c.plan }; }), {})
              : '<div class="card-h"><h3>Failed payments</h3></div>' + (failed.length ? '<div class="list">' + failed.map(function (c) { return '<a class="row" href="#/clients/' + c.id + '/billing"><span class="ic red">' + icon('card', 17) + '</span><span class="grow"><b>' + esc(c.name) + '</b><small>Stripe retries automatically · text them to update their card</small></span><b>' + money(c.mrr) + '</b></a>'; }).join('') + '</div>' : '<div class="empty">No failed payments.</div>');
        el.innerHTML = '<div class="grid g4">' + kpiBtn('Monthly revenue', money(mrr), '<span class="up">' + C.filter(function (c) { return c.mrr; }).length + ' subscriptions</span>', 'mrr', show === 'mrr') + kpiBtn('Yearly run rate', money(mrr * 12), 'if nothing changes', 'year', show === 'year') + kpiBtn('Average per client', money(Math.round(mrr / Math.max(1, C.length))), 'per month', 'avg', show === 'avg') + kpiBtn('Failed payments', failed.length, failed.length ? '<span class="down">' + money(sum(failed, 'mrr')) + ' at risk</span>' : 'None', 'failed', show === 'failed') + '</div>' +
          '<div class="card">' + chart + '</div>' +
          '<div class="card"><div class="card-h"><h3>Revenue by plan</h3></div><div class="mix">' + mix.map(function (m, i) { return m ? '<i style="flex:' + m + ';background:' + colors[i] + '"></i>' : ''; }).join('') + '</div><div class="legend">' + plans.map(function (p, i) { return '<span><i style="background:' + colors[i] + '"></i>' + p + ' · ' + money(mix[i]) + '/mo</span>'; }).join('') + '</div></div>' +
          '<div class="grid g2"><div class="card"><div class="card-h"><h3>Terms ending soon</h3></div><div class="list">' + (ending.length ? ending.map(function (c) { return '<a class="row" href="#/clients/' + c.id + '"><span class="ic amber">' + icon('clock', 17) + '</span><span class="grow"><b>' + esc(c.name) + '</b><small>12-month term ends ' + U.date(c.termEnds) + ' · time to check in</small></span>' + icon('arrow', 15) + '</a>'; }).join('') : '<div class="empty">No terms ending in the next 90 days.</div>') + '</div></div>' +
          '<div class="card"><div class="card-h"><h3>Recent invoices</h3><span class="sample">FROM STRIPE</span></div><div class="list">' + I.slice().sort(function (a, b) { return a.at < b.at ? 1 : -1; }).slice(0, 7).map(function (i) { return '<a class="row" href="#/clients/' + i.client_id + '/billing"><span class="grow"><b>' + esc(cm[i.client_id].name) + '</b><small>' + U.date(i.at) + '</small></span>' + (i.status === 'paid' ? '<span class="pill green">Paid</span>' : '<span class="pill red">Failed</span>') + '<b style="width:56px;text-align:right">' + money(i.amount) + '</b></a>'; }).join('') + '</div></div></div>';
      }
      U.on(el, '[data-k]', 'click', function (e, b) { show = b.dataset.k; draw(); });
      draw();
    });
  }

  /* ---------- Site health ---------- */
  function health(el, ctx) {
    ctx.title('Site health');
    API.clients().then(function (C) {
      return Promise.all([API.sites()].concat(C.map(function (c) { return API.analytics(c.id); }))).then(function (r) {
        var S = r[0], A = r.slice(1);
        var live = C.filter(function (c) { return S[c.id] && S[c.id].uptime != null; });
        var warn = C.filter(function (c) { var s = S[c.id] || {}; return (s.ssl != null && s.ssl <= 14) || (s.renew != null && s.renew <= 30) || (s.uptime != null && s.uptime < 99.5); });
        el.innerHTML = '<div class="grid g4">' + kpi('Sites live', live.length, C.length - live.length + ' in build') + kpi('Average uptime', live.length ? (sum(live.map(function (c) { return S[c.id].uptime; })) / live.length).toFixed(2) + '%' : '—', 'last 30 days') + kpi('Average speed', live.length ? Math.round(sum(live.map(function (c) { return S[c.id].speed; })) / live.length) : '—', 'out of 100') + kpi('Need a look', warn.length, warn.length ? '<span class="down">this week</span>' : 'all good') + '</div>' +
          '<div class="cgrid">' + C.map(function (c, i) {
            var s = S[c.id] || {}, ser = A[i] || [], bad = warn.indexOf(c) > -1;
            if (s.uptime == null) return '<a class="card hcard" href="#/clients/' + c.id + '"><div class="cc-top"><div class="grow"><b>' + esc(c.name) + '</b><small>In build</small></div><span class="pill orange">Not live</span></div><p class="muted" style="margin:0;font-size:13.5px">Checks start at launch.</p></a>';
            function meter(label, days, max) { var p = Math.max(4, Math.min(100, Math.round(days / max * 100))); return '<div class="meter"><span>' + label + '</span><span class="t"><i class="' + (days <= (max === 90 ? 14 : 30) ? 'warn' : '') + '" style="width:' + p + '%"></i></span><b>' + days + 'd</b></div>'; }
            return '<a class="card hcard" href="#/clients/' + c.id + '/analytics"><div class="cc-top"><div class="grow"><b>' + esc(c.name) + '</b><small>' + esc(c.domain) + '</small></div>' + (bad ? '<span class="pill amber">Needs a look</span>' : '<span class="pill green">Healthy</span>') + '</div>' +
              '<div class="mini"><span>Uptime</span><b>' + s.uptime + '%</b>' + U.spark(ser.map(function (x) { return x.uptime || 99; }), '#1F6B34') + '</div><div class="mini"><span>Speed</span><b>' + s.speed + '</b>' + U.spark(ser.map(function (x) { return x.speed || 90; })) + '</div>' +
              meter('Certificate', s.ssl, 90) + meter('Domain', s.renew, 365) + '<small class="muted">Updated ' + U.rel(s.deploy) + '</small></a>';
          }).join('') + '</div>';
      });
    });
  }

  /* ---------- Messages ---------- */
  function messages(el, ctx, rest) {
    ctx.title('Messages');
    Promise.all([API.clients(), API.messages()]).then(function (r) {
      var C = r[0], last = lastMsgByClient(r[1]);
      C.sort(function (a, b) { return ((last[b.id] || {}).at || '') > ((last[a.id] || {}).at || '') ? 1 : -1; });
      var cur = rest[0] || (window.innerWidth > 860 && C[0] ? C[0].id : null);
      el.innerHTML = '<div class="split' + (cur ? ' has-sel' : '') + '"><div class="inbox" id="ib">' + C.map(function (c) { var m = last[c.id]; return '<button data-id="' + c.id + '"' + (c.id === cur ? ' class="on"' : '') + '><span class="av sm">' + U.initials(c.name) + '</span><div><b>' + esc(c.name) + '</b><small>' + (m ? (m.from === 'stoop' ? 'You: ' : '') + esc(m.body) : 'No messages') + '</small></div>' + (m && m.from === 'client' ? '<span class="unread"></span>' : '') + '</button>'; }).join('') + '</div><div id="tb"></div></div>';
      U.on(el, '#ib button', 'click', function (e, b) { ctx.go('#/messages/' + b.dataset.id); });
      var c = C.find(function (x) { return x.id === cur; }); if (c) thread(U.$('#tb', el), c, function () { ctx.go('#/messages'); });
    });
  }

  window.ADMIN = { badges: badges, views: { today: today, requests: requests, pipeline: pipeline, mockups: mockups, clients: clients, builds: builds, money: moneyView, health: health, messages: messages } };
})();
