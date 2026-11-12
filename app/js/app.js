/* router, shell, sign-in */
(function () {
  var U = UI, icon = U.icon, esc = U.esc;
  var root = document.getElementById('app');
  var shellRole = null;

  var ADMIN_NAV = [
    ['today', 'Today', 'today'], ['requests', 'Requests', 'queue'], ['pipeline', 'Sales pipeline', 'funnel'], ['clients', 'Clients', 'users'],
    ['builds', 'Builds', 'build'], ['messages', 'Messages', 'chat'], ['money', 'Money', 'money'], ['health', 'Site health', 'pulse']
  ];
  function clientNav(c) {
    var t = c.tools || [], n = [['overview', 'Overview', 'grid'], ['leads', 'Leads', 'inbox']];
    if (t.indexOf('booking') > -1) n.push(['bookings', 'Bookings', 'cal']);
    if (t.indexOf('store') > -1 || t.indexOf('gift') > -1) n.push(['orders', 'Orders', 'bag']);
    if (t.indexOf('chat') > -1) n.push(['chat', 'Customer chat', 'chat']);
    n.push(['automations', 'Automations', 'zap'], ['designer', 'Your designer', 'phone'], ['billing', 'Billing', 'card'], ['settings', 'Settings', 'gear']);
    return n;
  }

  /* ---------- sign in ---------- */
  function signIn() {
    shellRole = null;
    U.closeDrawer(); document.getElementById('scrim').classList.remove('on');
    API.signOut().then(function () {
      return API.signIn({ role: 'admin', name: 'Chase', email: 'admin' });
    }).then(function () { return API.clients(); }).then(function (clients) {
      API.signOut();
      root.innerHTML =
        '<div class="signin"><div class="si-art"><div class="logo"><span class="logo-tile" style="background:#fff"><svg width="20" height="20" fill="#E8501A"><use href="#stair"/></svg></span><span class="logo-words"><span class="logo-stoop">STOOP</span><span class="logo-co" style="color:#C9C0B6">DESIGN CO.</span></span></div>' +
        '<div><h1>Your website, your leads, your designer. One place.</h1><p style="margin-top:16px">Check bookings and orders, answer customers, and send changes to your designer.</p></div>' +
        '<span class="mono" style="font-size:12px;color:#8F857B">app.stoopdesign.com</span><svg class="big-stair" width="420" height="420" fill="#fff"><use href="#stair"/></svg></div>' +
        '<div class="si-main"><div class="si-card"><div class="logo" style="margin-bottom:8px"><span class="logo-tile"><svg width="20" height="20" fill="#fff"><use href="#stair"/></svg></span><span class="logo-words"><span class="logo-stoop">STOOP</span><span class="logo-co">DESIGN CO.</span></span></div>' +
        '<h2>Sign in</h2><p class="muted" style="margin:-8px 0 0">We’ll email you a sign-in link. No password to remember.</p>' +
        '<form id="siForm" style="display:flex;flex-direction:column;gap:12px"><label class="field">Email<input type="email" required placeholder="you@yourbusiness.com" id="siEmail"></label><button class="btn primary" style="height:46px">Email me a sign-in link</button></form><div id="siSent"></div>' +
        '<div class="demo"><span class="mono" style="font-size:11px;color:var(--muted);letter-spacing:.06em">DEMO · PICK AN ACCOUNT</span>' +
        '<button class="demo-row" data-admin><span class="av dark">CF</span><span><b>STOOP admin</b><small>Chase · back office</small></span></button>' +
        clients.map(function (c) { return '<button class="demo-row" data-client="' + c.id + '" data-name="' + esc(c.owner) + '"><span class="av">' + U.initials(c.name) + '</span><span><b>' + esc(c.name) + '</b><small>' + esc(c.owner) + ' · ' + c.plan + '</small></span></button>'; }).join('') +
        '</div></div></div></div>';
      U.$('#siForm').addEventListener('submit', function (e) {
        e.preventDefault();
        U.$('#siSent').innerHTML = '<div class="sent">Check <b>' + esc(U.$('#siEmail').value) + '</b> for your sign-in link. It works for 1 hour.<br><span style="font-size:12.5px;opacity:.8">Demo: pick an account below.</span></div>';
      });
      U.on(root, '.demo-row', 'click', function (e, b) {
        var u = b.hasAttribute('data-admin') ? { role: 'admin', name: 'Chase', email: 'chase@stoopdesign.com' } : { role: 'client', client_id: b.dataset.client, name: b.dataset.name };
        API.signIn(u).then(function () { location.hash = u.role === 'admin' ? '#/today' : '#/overview'; route(); });
      });
    });
  }

  /* ---------- shell ---------- */
  function shell(navItems, base, who, sub, banner) {
    root.innerHTML = (banner || '') + '<div class="shell"><aside class="side" id="side"><a class="logo" href="' + base + navItems[0][0] + '"><span class="logo-tile"><svg width="20" height="20" fill="#fff"><use href="#stair"/></svg></span><span class="logo-words"><span class="logo-stoop">STOOP</span><span class="logo-co">DESIGN CO.</span></span></a>' +
      '<nav class="nav" id="nav">' + navItems.map(function (n) { return '<a href="' + base + n[0] + '" data-p="' + n[0] + '">' + icon(n[2]) + '<span>' + n[1] + '</span><span class="badge" data-b="' + n[0] + '" hidden></span></a>'; }).join('') + '</nav>' +
      '<div class="side-foot"><span class="av ' + (API.user().role === 'admin' ? 'dark' : '') + '">' + U.initials(who) + '</span><div><b>' + esc(who) + '</b><small>' + esc(sub) + '</small></div><button class="icon-btn" id="signOut" title="Sign out" aria-label="Sign out" style="width:34px;height:34px">' + icon('out', 16) + '</button></div></aside>' +
      '<main class="main"><header class="top"><button class="icon-btn menu" id="menuBtn" aria-label="Menu">' + icon('menu') + '</button><h1 id="title"></h1><div id="actions" style="display:flex;gap:8px"></div></header><div class="page" id="page"></div></main></div>';
    U.$('#signOut').addEventListener('click', function () { API.signOut().then(function () { location.hash = '#/signin'; route(); }); });
    U.$('#menuBtn').addEventListener('click', function () { U.$('#side').classList.add('on'); document.getElementById('scrim').classList.add('on'); });
    U.$('#nav').addEventListener('click', function () { U.$('#side').classList.remove('on'); document.getElementById('scrim').classList.remove('on'); });
  }
  function setBadges(map) { U.$$('[data-b]').forEach(function (b) { var v = map[b.dataset.b]; if (v) { b.textContent = v; b.hidden = false; } else b.hidden = true; }); }

  var ctx = {
    title: function (t) { U.$('#title').textContent = t; document.title = t + ' · STOOP'; },
    actions: function (html) { U.$('#actions').innerHTML = html || ''; },
    go: function (h) { location.hash = h; },
    refresh: function () { route(); }
  };

  /* ---------- router ---------- */
  function route() {
    var u = API.user(), h = location.hash.replace(/^#\/?/, '') || '', parts = h.split('/');
    if (!u || parts[0] === 'signin') return signIn();
    U.closeDrawer();
    if (u.role === 'admin') {
      if (parts[0] === 'as') return asClient(parts[1], parts[2] || 'overview');
      var page = parts[0] || 'today';
      if (!ADMIN.views[page]) page = 'today';
      if (shellRole !== 'admin') { shell(ADMIN_NAV, '#/', u.name, 'STOOP admin'); shellRole = 'admin'; }
      mark(page);
      ADMIN.badges().then(setBadges);
      ctx.actions('');
      ADMIN.views[page](freshPage(), ctx, parts.slice(1));
    } else {
      API.client(u.client_id).then(function (c) { clientPage(c, parts[0] || 'overview', '#/', null, parts.slice(1)); });
    }
  }
  function label(el) { U.$$('table', el).forEach(function (t) { if (t.dataset.lb) return; var hs = U.$$('thead th', t).map(function (h) { return h.textContent; }); U.$$('tbody tr', t).forEach(function (tr) { U.$$('td', tr).forEach(function (td, i) { if (hs[i]) td.setAttribute('data-label', hs[i]); }); }); t.dataset.lb = '1'; }); }
  function freshPage() {
    var old = U.$('#page'), el = old.cloneNode(false); old.parentNode.replaceChild(el, old); window.scrollTo(0, 0);
    if (window.MutationObserver) new MutationObserver(function () { label(el); }).observe(el, { childList: true, subtree: true });
    return el;
  }
  function mark(page) { U.$$('#nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.p === page); }); }
  function clientPage(c, page, base, banner, rest) {
    var nav = clientNav(c), allowed = nav.map(function (n) { return n[0]; });
    if (allowed.indexOf(page) < 0) page = 'overview';
    var key = 'client:' + c.id + ':' + (banner ? 'as' : 'own');
    if (shellRole !== key) { shell(nav, base, banner ? 'Viewing as ' + c.owner : c.owner, c.name, banner); shellRole = key; }
    mark(page);
    CLIENT.badges(c).then(setBadges);
    ctx.actions('');
    CLIENT.views[page](freshPage(), ctx, c, base, rest || []);
  }
  function asClient(cid, page) {
    Promise.all([API.client(cid), API.grant(cid)]).then(function (r) {
      var c = r[0], g = r[1];
      if (!c) { location.hash = '#/clients'; return; }
      if (!g) { U.toast(c.name + ' hasn’t given support access.'); location.hash = '#/clients/' + cid; return; }
      var banner = '<div class="banner">' + icon('eye', 16) + '<span>Viewing as <b>' + esc(c.name) + '</b> with support access until ' + U.date(g.expires, true) + '. Everything you open is logged.</span><a class="btn" href="#/clients/' + cid + '">Exit</a></div>';
      clientPage(c, page, '#/as/' + cid + '/', banner, []);
    });
  }
  window.addEventListener('hashchange', route);
  route();
})();
