/* STOOP app data layer.
   Every function here maps to a future Supabase table or query. Swap the bodies for
   supabase-js calls later; the screens only talk to this API.
   Privacy rule (mirrors the database row-level security we'll write):
   - A client sees only rows with their client_id.
   - STOOP admins always see business/operational data, but customer data
     (leads, bookings, orders, chats) only while the client has an active access grant.
     Every admin read of customer data is written to the access log. */
(function () {
  var KEY = 'stoop-app-v1';
  var H = 3600e3, D = 24 * H;
  var now = Date.now();
  function ago(ms) { return new Date(now - ms).toISOString(); }
  function ahead(ms) { return new Date(now + ms).toISOString(); }
  function id(p) { return p + '_' + Math.random().toString(36).slice(2, 9); }

  function seed() {
    var C = [
      { id: 'c_bakery', name: 'Front Street Bakery', owner: 'Rosa Alvarez', email: 'rosa@frontstreetbakery.com', phone: '(555) 010-1001', plan: 'Growth', mrr: 349, status: 'active', started: ago(140 * D), termEnds: ahead(225 * D), tools: ['store', 'chat', 'reviews'], domain: 'frontstreetbakery.com' },
      { id: 'c_juniper', name: 'Juniper Massage', owner: 'Maya Chen', email: 'maya@junipermassage.com', phone: '(555) 010-1002', plan: 'Essentials', mrr: 199, status: 'active', started: ago(95 * D), termEnds: ahead(270 * D), tools: ['booking'], domain: 'junipermassage.com' },
      { id: 'c_bright', name: 'Brightside Cleaning', owner: 'Taylor Brooks', email: 'taylor@brightsideclean.com', phone: '(555) 010-1003', plan: 'Growth', mrr: 349, status: 'active', started: ago(60 * D), termEnds: ahead(305 * D), tools: ['quote', 'reviews', 'chat'], domain: 'brightsideclean.com' },
      { id: 'c_redrock', name: 'Red Rock Outfitters', owner: 'Sam Patel', email: 'sam@redrockoutfitters.com', phone: '(555) 010-1004', plan: 'Growth', mrr: 349, status: 'past_due', started: ago(320 * D), termEnds: ahead(45 * D), tools: ['booking', 'conditions', 'gift'], domain: 'redrockoutfitters.com' },
      { id: 'c_bloom', name: 'Desert Bloom Candles', owner: 'Dana Morales', email: 'dana@desertbloomcandles.com', phone: '(555) 010-1005', plan: 'Essentials', mrr: 199, status: 'building', started: ago(6 * D), termEnds: ahead(359 * D), tools: ['store'], domain: 'desertbloomcandles.com' }
    ];
    var sites = {
      c_bakery: { uptime: 100, speed: 98, ssl: 74, renew: 210, deploy: ago(2 * D) },
      c_juniper: { uptime: 99.98, speed: 96, ssl: 51, renew: 140, deploy: ago(9 * D) },
      c_bright: { uptime: 100, speed: 97, ssl: 12, renew: 300, deploy: ago(1 * D) },
      c_redrock: { uptime: 99.4, speed: 91, ssl: 88, renew: 18, deploy: ago(30 * D) },
      c_bloom: { uptime: null, speed: null, ssl: null, renew: 360, deploy: null }
    };
    var R = [
      { client_id: 'c_bakery', text: 'Saturday hours are now 8 to 2', source: 'text', status: 'received', created: ago(3 * H), due: ahead(45 * H) },
      { client_id: 'c_bright', text: 'Add move-out cleaning to the quote tool at $180 base', source: 'dashboard', status: 'progress', created: ago(26 * H), due: ahead(22 * H) },
      { client_id: 'c_redrock', text: 'Swap the homepage photo for the new canyon shot I emailed', source: 'email', status: 'received', created: ago(52 * H), due: ago(4 * H) },
      { client_id: 'c_juniper', text: 'New service: 30-min chair massage, $45', source: 'text', status: 'review', created: ago(30 * H), due: ahead(18 * H) },
      { client_id: 'c_bakery', text: 'Holiday pie pre-orders page', source: 'dashboard', status: 'progress', created: ago(20 * H), due: ahead(28 * H) },
      { client_id: 'c_bright', text: 'Fix typo on About page', source: 'text', status: 'live', created: ago(4 * D), due: ago(2 * D), done: ago(3 * D) },
      { client_id: 'c_juniper', text: 'Update gift policy wording', source: 'text', status: 'live', created: ago(6 * D), due: ago(4 * D), done: ago(5 * D) }
    ].map(function (r) { r.id = id('r'); r.notes = ''; return r; });
    var M = [
      ['c_bakery', 'client', 'Saturday hours are now 8 to 2', 3 * H], ['c_bakery', 'stoop', 'Got it, Rosa! Working on it now.', 2.9 * H],
      ['c_juniper', 'client', 'Can we add a 30-min chair massage for $45?', 30 * H], ['c_juniper', 'stoop', 'Yes! It’s ready for your review in the dashboard.', 6 * H],
      ['c_redrock', 'client', 'Just emailed a new canyon photo for the homepage', 52 * H],
      ['c_bright', 'client', 'Thanks for fixing the typo!', 3 * D], ['c_bright', 'stoop', 'Anytime, Taylor.', 3 * D - H],
      ['c_bloom', 'stoop', 'Your first draft is coming Thursday. Still need product photos when you can!', 1 * D]
    ].map(function (m) { return { id: id('m'), client_id: m[0], from: m[1], body: m[2], at: ago(m[3]) }; });
    var L = [
      ['c_bakery', 'Chris Nguyen', 'chris.n@email.com', '(555) 010-3301', 'Customer chat', '“Do you cater weddings?”', 1 * H, 'new'],
      ['c_bakery', 'Priya Shah', 'priya.s@email.com', '(555) 010-3302', 'Contact form', 'Office breakfast order for 20, Friday', 20 * H, 'contacted'],
      ['c_bright', 'Taylor Kim', 'tkim@email.com', '(555) 010-3345', 'Quote tool', 'Deep clean, 3 bed · est. $252', 8 * 60e3, 'new'],
      ['c_bright', 'Riley Adams', 'riley.a@email.com', '(555) 010-7782', 'Tap-to-call', '2 min call from Google Maps', 1 * D, 'won'],
      ['c_juniper', 'Morgan Lee', 'morgan@email.com', '(555) 010-1124', 'Contact form', 'Do you take HSA cards?', 2 * D, 'new'],
      ['c_redrock', 'Jordan Kim', 'jordan.k@email.com', '(555) 010-5530', 'Contact form', 'Private group of 8 in March?', 3 * D, 'contacted'],
      ['c_bloom', 'Alex Reed', 'alex.r@email.com', '(555) 010-9012', 'Contact form', 'Wholesale for our shop?', 5 * H, 'new']
    ].map(function (l) { return { id: id('l'), client_id: l[0], name: l[1], email: l[2], phone: l[3], source: l[4], detail: l[5], at: ago(l[6]), status: l[7] }; });
    var B = [
      ['c_juniper', 'Jamie Rivera', 'jamie.r@email.com', '(555) 010-2233', '90-min massage', 5 * H, 25, 'confirmed'],
      ['c_juniper', 'Sam Lopez', 'sam.l@email.com', '(555) 010-4471', '60-min massage', 26 * H, 25, 'confirmed'],
      ['c_juniper', 'Alex Chen', 'alex.c@email.com', '(555) 010-8890', 'Couples session', 50 * H, 50, 'reminder'],
      ['c_redrock', 'Lee Park', 'lee.p@email.com', '(555) 010-6610', 'Sunrise hike (2)', 20 * H, 40, 'confirmed'],
      ['c_redrock', 'Nora Diaz', 'nora.d@email.com', '(555) 010-6611', 'Full-day canyon tour (4)', 72 * H, 100, 'confirmed']
    ].map(function (b, i) { var w = new Date(now + b[5]); w.setHours([10, 14, 11, 7, 9][i] || 10, i % 2 ? 30 : 0, 0, 0); return { id: id('b'), client_id: b[0], customer: b[1], email: b[2], phone: b[3], service: b[4], when: w.toISOString(), deposit: b[6], status: b[7] }; });
    var O = [
      ['c_bakery', 'Dana Morales', 'dana.m@email.com', 'Sourdough loaf ×2, Croissant box', 38, 3 * H, 'paid'],
      ['c_bakery', 'Kim Tran', 'kim.t@email.com', 'Pumpkin loaf', 14, 1 * D, 'fulfilled'],
      ['c_redrock', 'Jordan Kim', 'jordan.k@email.com', '$100 gift card', 100, 1 * D, 'paid'],
      ['c_redrock', 'Pat Moore', 'pat.m@email.com', '$50 gift card', 50, 4 * D, 'fulfilled']
    ].map(function (o) { return { id: id('o'), client_id: o[0], customer: o[1], email: o[2], items: o[3], total: o[4], at: ago(o[5]), status: o[6] }; });
    var CH = [
      { client_id: 'c_bakery', customer: 'Chris Nguyen', open: true, msgs: [['customer', 'Do you cater weddings?', 62 * 60e3]] },
      { client_id: 'c_bakery', customer: 'Lena Ford', open: false, msgs: [['customer', 'Gluten-free options this Saturday?', 26 * H], ['business', 'Yes! Loaves and muffins. Want us to hold some?', 25 * H], ['customer', 'Yes please, 2 loaves!', 24 * H]] },
      { client_id: 'c_bright', customer: 'Ben Ortiz', open: true, msgs: [['customer', 'Do you bring your own supplies?', 3 * H]] }
    ].map(function (c) { c.id = id('ch'); c.msgs = c.msgs.map(function (m) { return { from: m[0], body: m[1], at: ago(m[2]) }; }); return c; });
    var P = [
      ['Copper Kettle Café', 'Ana Ruiz', 'ana@copperkettle.com', '(555) 010-4401', 'Restaurant or café', 'More orders', 'Growth', 'new', 5 * H],
      ['Summit Physical Therapy', 'Dr. Ken Ito', 'ken@summitpt.com', '(555) 010-4402', 'Health or wellness', 'More bookings', 'Not sure yet', 'new', 30 * H],
      ['High Desert Roofing', 'Mark Bell', 'mark@hdroofing.com', '(555) 010-4403', 'Home services', 'More calls', 'Essentials', 'mockup', 2 * D],
      ['Sage & Stone Yoga', 'Ivy Moss', 'ivy@sagestone.com', '(555) 010-4404', 'Health or wellness', 'More bookings', 'Growth', 'call', 4 * D],
      ['Mesa Bike Co.', 'Theo Grant', 'theo@mesabike.com', '(555) 010-4405', 'Retail shop', 'Sell online', 'Growth', 'contract', 6 * D],
      ['Pine & Pour', 'Jill Hart', 'jill@pinepour.com', '(555) 010-4406', 'Restaurant or café', 'More orders', 'Launch', 'lost', 12 * D]
    ].map(function (p) { return { id: id('p'), business: p[0], contact: p[1], email: p[2], phone: p[3], type: p[4], goal: p[5], plan: p[6], stage: p[7], created: ago(p[8]), mockupDue: new Date(now - p[8] + 72 * H).toISOString(), notes: '' }; });
    var BUILD = {
      c_bloom: { start: ago(6 * D), waiting: false, waitStarted: null, pausedMs: 0, steps: [['Kickoff call', 1, true], ['Content and photos received', 3, false], ['First draft', 7, false], ['Revisions', 10, false], ['Domain connected', 13, false], ['Live', 14, false]].map(function (s) { return { name: s[0], day: s[1], done: s[2] }; }) }
    };
    var G = [{ client_id: 'c_bakery', expires: ahead(46 * H), created: ago(26 * H) }];
    var LOG = [
      { client_id: 'c_bakery', who: 'Chase (STOOP)', area: 'Orders', at: ago(25 * H) },
      { client_id: 'c_juniper', who: 'Chase (STOOP)', area: 'Bookings', at: ago(40 * D) }
    ];
    var INV = [];
    C.forEach(function (c) { for (var i = 0; i < 3; i++) INV.push({ id: id('in'), client_id: c.id, amount: c.mrr, at: ago((i * 30 + 5) * D), status: (c.status === 'past_due' && i === 0) ? 'failed' : 'paid' }); });
    return { clients: C, sites: sites, requests: R, messages: M, leads: L, bookings: B, orders: O, chats: CH, pipeline: P, builds: BUILD, grants: G, accessLog: LOG, invoices: INV, v: 1 };
  }

  var db;
  function load() { try { var s = localStorage.getItem(KEY); if (s) db = JSON.parse(s); } catch (e) {} if (!db || db.v !== 1) db = seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  load();

  var user = null;
  try { user = JSON.parse(sessionStorage.getItem('stoop-user') || 'null'); } catch (e) {}
  function ok(v) { return Promise.resolve(JSON.parse(JSON.stringify(v))); }
  function isAdmin() { return user && user.role === 'admin'; }
  function mine(clientId) { return user && (isAdmin() || user.client_id === clientId); }
  function grantFor(clientId) {
    var g = db.grants.filter(function (x) { return x.client_id === clientId && new Date(x.expires) > new Date(); });
    return g.length ? g[g.length - 1] : null;
  }
  function canSeeCustomers(clientId) {
    if (!user) return false;
    if (user.role === 'client') return user.client_id === clientId;
    return !!grantFor(clientId);
  }
  /* customer tables: leads, bookings, orders, chats */
  function customerRows(table, clientId, area) {
    var rows = db[table].filter(function (r) { return r.client_id === clientId; });
    if (!canSeeCustomers(clientId)) return ok({ locked: true, count: rows.length });
    if (isAdmin()) { db.accessLog.unshift({ client_id: clientId, who: user.name + ' (STOOP)', area: area, at: new Date().toISOString() }); save(); }
    return ok({ locked: false, rows: rows });
  }

  var AUTOS = [
    { key: 'lead_reply', tool: null, name: 'Instant reply to new leads', when: 'Right away', icon: 'inbox', on: true, text: 'Thanks for reaching out to {business}! We got your message and will get back to you within the hour.' },
    { key: 'missed_call', tool: null, name: 'Missed-call text-back', when: 'When you miss a call', icon: 'phone', on: false, text: 'Sorry we missed your call! This is {business}. How can we help? You can also book online: {link}' },
    { key: 'review', tool: null, name: 'Review requests', when: '2 hours after a visit, order or job', icon: 'star', on: true, text: 'Thanks for choosing {business}! Would you leave us a quick review? It really helps: {link}' },
    { key: 'book_confirm', tool: 'booking', name: 'Booking confirmation', when: 'Right after someone books', icon: 'cal', on: true, text: 'You’re booked with {business} for {service} on {date}. See you then!' },
    { key: 'book_remind', tool: 'booking', name: 'Booking reminders', when: '24 hours and 2 hours before', icon: 'clock', on: true, text: 'Reminder: {service} with {business} {date}. Reply C to confirm or R to reschedule.' },
    { key: 'rebook', tool: 'booking', name: 'Rebook nudge', when: '4 weeks after a visit', icon: 'cal', on: false, text: 'It’s been a few weeks! Ready for your next visit at {business}? Book here: {link}' },
    { key: 'quote_follow', tool: 'quote', name: 'Quote follow-up', when: '2 days after a quote', icon: 'inbox', on: true, text: 'Hi! Still thinking about your quote from {business}? Tap to book it: {link}' },
    { key: 'order_ready', tool: 'store', name: 'Order ready', when: 'When you mark an order fulfilled', icon: 'bag', on: true, text: 'Good news: your {business} order is ready!' },
    { key: 'after_hours', tool: 'chat', name: 'After-hours chat reply', when: 'When you’re closed', icon: 'chat', on: true, text: 'Thanks for your message! We’re closed right now and will reply first thing when we open.' },
    { key: 'weekly', tool: null, name: 'Weekly summary text to you', when: 'Mondays at 8 AM', icon: 'grid', on: true, owner: true, text: '' }
  ];
  function autoState(cid) {
    db.autos = db.autos || {};
    if (db.autos[cid]) Object.keys(db.autos[cid]).forEach(function (k) { if (db.autos[cid][k].sent < 0) db.autos[cid][k].sent = Math.abs(db.autos[cid][k].sent); });
    if (!db.autos[cid]) {
      var h = 0; for (var i = 0; i < cid.length; i++) h = (h * 31 + cid.charCodeAt(i)) >>> 0;
      db.autos[cid] = {};
      AUTOS.forEach(function (a, k) { db.autos[cid][a.key] = { on: a.on, text: a.text, sent: a.on ? ((h >>> k) % 40) + 3 : 0 }; });
    }
    return db.autos[cid];
  }
  function client(cid) { return db.clients.find(function (c) { return c.id === cid; }); }
  function ownClient(cid) { return user && user.role === 'client' && user.client_id === cid; }
  var LIMITS = { Growth: 1000, Essentials: 500, Launch: 0 };

  window.API = {
    /* auth (Supabase Auth magic link later) */
    user: function () { return user; },
    signIn: function (u) { user = u; try { sessionStorage.setItem('stoop-user', JSON.stringify(u)); } catch (e) {} return ok(u); },
    signOut: function () { user = null; try { sessionStorage.removeItem('stoop-user'); } catch (e) {} return ok(true); },
    reset: function () { db = seed(); save(); return ok(true); },

    /* operational data: admins see all, clients see their own */
    clients: function () { return ok(db.clients.filter(function (c) { return mine(c.id); })); },
    client: function (cid) { return ok(mine(cid) ? db.clients.find(function (c) { return c.id === cid; }) : null); },
    site: function (cid) { return ok(mine(cid) ? db.sites[cid] : null); },
    sites: function () { return ok(isAdmin() ? db.sites : {}); },
    requests: function (cid) { return ok(db.requests.filter(function (r) { return mine(r.client_id) && (!cid || r.client_id === cid); })); },
    addRequest: function (cid, text, source) {
      if (!mine(cid)) return ok(null);
      var r = { id: id('r'), client_id: cid, text: text, source: source || 'dashboard', status: 'received', created: new Date().toISOString(), due: new Date(Date.now() + 48 * H).toISOString(), notes: '' };
      db.requests.unshift(r); save(); return ok(r);
    },
    updateRequest: function (rid, patch) {
      var r = db.requests.find(function (x) { return x.id === rid; }); if (!r || !isAdmin()) return ok(null);
      Object.assign(r, patch); if (patch.status === 'live') r.done = new Date().toISOString(); save(); return ok(r);
    },
    messages: function (cid) { return ok(db.messages.filter(function (m) { return mine(m.client_id) && (!cid || m.client_id === cid); })); },
    sendMessage: function (cid, body) {
      if (!mine(cid)) return ok(null);
      var m = { id: id('m'), client_id: cid, from: isAdmin() ? 'stoop' : 'client', body: body, at: new Date().toISOString() };
      db.messages.push(m); save(); return ok(m);
    },
    invoices: function (cid) { return ok(db.invoices.filter(function (i) { return mine(i.client_id) && (!cid || i.client_id === cid); })); },
    /* customer counts are business totals, safe for admins */
    counts: function (cid) {
      if (!mine(cid)) return ok(null);
      function n(t) { return db[t].filter(function (r) { return r.client_id === cid; }).length; }
      var dep = db.bookings.filter(function (b) { return b.client_id === cid; }).reduce(function (s, b) { return s + b.deposit; }, 0);
      var sales = db.orders.filter(function (o) { return o.client_id === cid; }).reduce(function (s, o) { return s + o.total; }, 0);
      return ok({ leads: n('leads'), bookings: n('bookings'), orders: n('orders'), chats: n('chats'), deposits: dep, sales: sales });
    },

    /* customer data: private unless granted */
    leads: function (cid) { return customerRows('leads', cid, 'Leads'); },
    bookings: function (cid) { return customerRows('bookings', cid, 'Bookings'); },
    orders: function (cid) { return customerRows('orders', cid, 'Orders'); },
    chats: function (cid) { return customerRows('chats', cid, 'Chat'); },
    updateLead: function (lid, status) { var l = db.leads.find(function (x) { return x.id === lid; }); if (!l || !canSeeCustomers(l.client_id)) return ok(null); l.status = status; save(); return ok(l); },
    updateBooking: function (bid, status) { var b = db.bookings.find(function (x) { return x.id === bid; }); if (!b || !canSeeCustomers(b.client_id)) return ok(null); b.status = status; save(); return ok(b); },
    updateOrder: function (oid, status) { var o = db.orders.find(function (x) { return x.id === oid; }); if (!o || !canSeeCustomers(o.client_id)) return ok(null); o.status = status; save(); return ok(o); },
    replyChat: function (chid, body) {
      var c = db.chats.find(function (x) { return x.id === chid; }); if (!c || !canSeeCustomers(c.client_id)) return ok(null);
      c.msgs.push({ from: 'business', body: body, at: new Date().toISOString() }); c.open = false; save(); return ok(c);
    },

    /* support access */
    grant: function (cid) { return ok(mine(cid) ? grantFor(cid) : null); },
    giveAccess: function (cid, hours) {
      if (!user || user.role !== 'client' || user.client_id !== cid) return ok(null);
      db.grants.push({ client_id: cid, expires: new Date(Date.now() + hours * H).toISOString(), created: new Date().toISOString() }); save(); return ok(grantFor(cid));
    },
    revokeAccess: function (cid) {
      if (!user || user.role !== 'client' || user.client_id !== cid) return ok(null);
      db.grants.forEach(function (g) { if (g.client_id === cid) g.expires = new Date(Date.now() - 1000).toISOString(); }); save(); return ok(true);
    },
    accessLog: function (cid) { return ok(db.accessLog.filter(function (l) { return mine(l.client_id) && (!cid || l.client_id === cid); })); },

    /* automations (customer texts) */
    automations: function (cid) {
      if (!mine(cid)) return ok([]);
      var c = client(cid), st = autoState(cid);
      return ok(AUTOS.filter(function (a) { return !a.tool || c.tools.indexOf(a.tool) > -1; }).map(function (a) { return Object.assign({ def: a.text }, a, st[a.key]); }));
    },
    setAutomation: function (cid, key, patch) {
      if (!ownClient(cid)) return ok(null);
      var st = autoState(cid); Object.assign(st[key], patch); save(); return ok(st[key]);
    },
    texts: function (cid) {
      if (!mine(cid)) return ok(null);
      var st = autoState(cid), used = 0; Object.keys(st).forEach(function (k) { used += st[k].sent || 0; });
      return ok({ used: used, limit: LIMITS[client(cid).plan] || 0 });
    },
    logText: function (cid, key) { if (!mine(cid)) return ok(null); var st = autoState(cid); if (st[key]) st[key].sent = (st[key].sent || 0) + 1; save(); return ok(true); },
    /* closed today */
    closed: function (cid) { db.closed = db.closed || {}; var x = db.closed[cid]; return ok(mine(cid) && x && new Date(x.until) > new Date() ? x : null); },
    setClosed: function (cid, reason) {
      if (!ownClient(cid)) return ok(null);
      db.closed = db.closed || {};
      if (!reason) { delete db.closed[cid]; save(); return ok(null); }
      var end = new Date(); end.setHours(23, 59, 0, 0);
      db.closed[cid] = { reason: reason, until: end.toISOString() }; save(); return ok(db.closed[cid]);
    },
    /* approve a change that's in client review */
    approveRequest: function (rid) {
      var r = db.requests.find(function (x) { return x.id === rid; });
      if (!r || !ownClient(r.client_id) || r.status !== 'review') return ok(null);
      r.approved = new Date().toISOString();
      db.messages.push({ id: id('m'), client_id: r.client_id, from: 'client', body: 'Approved ✓ “' + r.text + '”', at: r.approved });
      save(); return ok(r);
    },
    /* what the site brought in, last 30 days */
    roi: function (cid) {
      if (!mine(cid)) return ok(null);
      var since = Date.now() - 30 * D;
      function mineRows(t) { return db[t].filter(function (r) { return r.client_id === cid; }); }
      var orders = mineRows('orders').filter(function (o) { return new Date(o.at) > since; });
      var bookings = mineRows('bookings'), leads = mineRows('leads');
      var sales = orders.reduce(function (s, o) { return s + o.total; }, 0), deposits = bookings.reduce(function (s, b) { return s + b.deposit; }, 0);
      return ok({ total: sales + deposits, sales: sales, deposits: deposits, orders: orders.length, bookings: bookings.length, leads: leads.length });
    },

    /* STOOP-only */
    pipeline: function () { return ok(isAdmin() ? db.pipeline : []); },
    updateLeadStage: function (pid, patch) { var p = db.pipeline.find(function (x) { return x.id === pid; }); if (!p || !isAdmin()) return ok(null); Object.assign(p, patch); save(); return ok(p); },
    winLead: function (pid) {
      var p = db.pipeline.find(function (x) { return x.id === pid; }); if (!p || !isAdmin()) return ok(null);
      p.stage = 'won';
      var plan = p.plan === 'Growth' ? 'Growth' : p.plan === 'Launch' ? 'Launch' : 'Essentials';
      var c = { id: id('c'), name: p.business, owner: p.contact, email: p.email, phone: p.phone, plan: plan, mrr: plan === 'Growth' ? 349 : plan === 'Launch' ? 0 : 199, status: 'building', started: new Date().toISOString(), termEnds: new Date(Date.now() + 365 * D).toISOString(), tools: [], domain: '' };
      db.clients.push(c); db.sites[c.id] = { uptime: null, speed: null, ssl: null, renew: null, deploy: null };
      db.builds[c.id] = { start: new Date().toISOString(), waiting: false, waitStarted: null, pausedMs: 0, steps: [['Kickoff call', 1], ['Content and photos received', 3], ['First draft', 7], ['Revisions', 10], ['Domain connected', 13], ['Live', 14]].map(function (s) { return { name: s[0], day: s[1], done: false }; }) };
      save(); return ok(c);
    },
    builds: function () { return ok(isAdmin() ? db.builds : {}); },
    updateBuild: function (cid, patch) {
      var b = db.builds[cid]; if (!b || !isAdmin()) return ok(null);
      if ('waiting' in patch && patch.waiting !== b.waiting) {
        if (patch.waiting) b.waitStarted = new Date().toISOString();
        else { b.pausedMs += Date.now() - new Date(b.waitStarted).getTime(); b.waitStarted = null; }
        b.waiting = patch.waiting;
      }
      if (patch.step != null) b.steps[patch.step].done = !b.steps[patch.step].done;
      if (b.steps.every(function (s) { return s.done; })) { var c = db.clients.find(function (x) { return x.id === cid; }); if (c) c.status = 'active'; }
      save(); return ok(b);
    }
  };
})();
