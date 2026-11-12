/* shared UI helpers */
(function () {
  var P = {
    today: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    queue: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
    funnel: '<path d="M3 4h18l-7 9v6l-4 2v-8z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
    build: '<path d="M3 21h18M5 21V10l7-6 7 6v11"/><path d="M9 21v-6h6v6"/>',
    money: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
    pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.8-1.2"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    alert: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
    send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
    star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
    zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'
  };
  function icon(n, s) { return '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n, cents) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }); }
  function rel(iso) {
    if (!iso) return '—';
    var d = new Date(iso).getTime() - Date.now(), a = Math.abs(d), fut = d > 0;
    var m = Math.round(a / 60e3), h = Math.round(a / 3600e3), dd = Math.round(a / 86400e3);
    var t = m < 1 ? 'now' : m < 60 ? m + 'm' : h < 24 ? h + 'h' : dd + 'd';
    if (t === 'now') return 'just now';
    return fut ? 'in ' + t : t + ' ago';
  }
  function date(iso, withTime) {
    if (!iso) return '—';
    var d = new Date(iso);
    var s = d.toLocaleDateString('en-US', { weekday: withTime ? 'short' : undefined, month: 'short', day: 'numeric' });
    return withTime ? s + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : s;
  }
  function initials(n) { return String(n || '?').split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase(); }
  function due(iso) {
    var ms = new Date(iso).getTime() - Date.now();
    if (ms < 0) return '<span class="pill red"><span class="dot"></span>Overdue ' + rel(iso).replace(' ago', '') + '</span>';
    if (ms < 12 * 3600e3) return '<span class="pill amber"><span class="dot"></span>Due ' + rel(iso) + '</span>';
    return '<span class="pill">Due ' + rel(iso) + '</span>';
  }
  var REQ = { received: ['Received', ''], progress: ['In progress', 'amber'], review: ['Client review', 'orange'], live: ['Live', 'green'] };
  function reqPill(s) { var r = REQ[s] || [s, '']; return '<span class="pill ' + r[1] + '">' + r[0] + '</span>'; }
  var CST = { active: ['Active', 'green'], building: ['Building', 'orange'], past_due: ['Payment failed', 'red'] };
  function clientPill(s) { var r = CST[s] || [s, '']; return '<span class="pill ' + r[1] + '"><span class="dot"></span>' + r[0] + '</span>'; }
  function srcLabel(s) { return { text: 'Text', email: 'Email', dashboard: 'Dashboard' }[s] || s; }

  var dr = document.getElementById('drawer'), scrim = document.getElementById('scrim');
  function openDrawer(html, onMount) {
    dr.innerHTML = html; dr.classList.add('on'); scrim.classList.add('on'); dr.setAttribute('aria-hidden', 'false');
    var x = dr.querySelector('[data-close]'); if (x) x.addEventListener('click', closeDrawer);
    if (onMount) onMount(dr);
  }
  function closeDrawer() { dr.classList.remove('on'); scrim.classList.remove('on'); dr.setAttribute('aria-hidden', 'true'); document.querySelector('.side') && document.querySelector('.side').classList.remove('on'); }
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  var tt;
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); }, 2600); }
  function lockPanel(clientName, count, what, onRequest) {
    return '<div class="lock"><span class="ic gray">' + icon('lock', 24) + '</span><b>' + count + ' ' + what + ' · private</b><p>' + esc(clientName) +
      ' hasn’t given STOOP access to their customer info. You can see totals, not names or details. Ask them to turn on Support access in their Settings.</p>' +
      (onRequest ? '<button class="btn sm" data-ask>' + icon('send', 15) + ' Text a request for access</button>' : '') + '</div>';
  }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function on(root, sel, ev, fn) { root.addEventListener(ev, function (e) { var t = e.target.closest(sel); if (t && root.contains(t)) fn(e, t); }); }

  window.UI = { icon: icon, esc: esc, money: money, rel: rel, date: date, initials: initials, due: due, reqPill: reqPill, clientPill: clientPill, srcLabel: srcLabel, openDrawer: openDrawer, closeDrawer: closeDrawer, toast: toast, lockPanel: lockPanel, $: $, $$: $$, on: on, REQ: REQ };
})();
