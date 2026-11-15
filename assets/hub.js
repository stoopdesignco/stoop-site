/* Hero hub: one signal at a time. A card lights up, its signal travels into "Your site",
   the site ripples, and the signal drops into the dashboard, which counts it and grows the graph. */
(function () {
  var svg = document.getElementById('hub');
  if (!svg) return;
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // chart: 7 days across the dashboard
  // running revenue this week: Mon … Sat are done, today climbs with every sale
  var X0 = 30, X1 = 530, YT = 402, YB = 466, MAX = 2500, BASE = [190, 380, 520, 710, 880, 1040, 1180], pts = BASE.slice();
  function y(v) { return YB - (v / MAX) * (YB - YT); }
  function draw() {
    var step = (X1 - X0) / (pts.length - 1), d = '', i, x, px, py;
    for (i = 0; i < pts.length; i++) {
      x = X0 + step * i;
      if (!i) d = 'M' + x + ' ' + y(pts[i]);
      else { px = X0 + step * (i - 1); py = y(pts[i - 1]); d += ' C' + (px + step / 2) + ' ' + py + ' ' + (x - step / 2) + ' ' + y(pts[i]) + ' ' + x + ' ' + y(pts[i]); }
    }
    $('hLine').setAttribute('d', d);
    $('hAreaP').setAttribute('d', d + ' L' + X1 + ' ' + YB + ' L' + X0 + ' ' + YB + ' Z');
    $('hPt').setAttribute('cx', X1); $('hPt').setAttribute('cy', y(pts[pts.length - 1]));
  }
  draw();
  if (reduce) return;

  var LINES = [
    ['Fri 10:00 · paid', 'Sat 9:30 · paid', 'Tue 2:00 · paid', 'Thu 4:15 · paid'],
    ['Gift card · $50', 'Candle set · $48', 'Tote bag · $32', 'Gift card · $25'],
    ['Quote request', 'Chat message', 'Contact form', 'Quote request'],
    ['5-star review', '5-star on Google']
  ];
  var LATEST = ['New booking', 'New order', 'New lead', 'New review'];
  var VAL = [[95, 120, 95, 65], [50, 48, 32, 25], [0], [0]];
  var START = { n: [12, 4, 9, 6], rev: 1180 };
  var n = START.n.slice(), i = [0, 0, 0, 0], rev = START.rev, k = 3, playing = false, timer = 0;
  var GAP = 3600;

  function placeDot() { try { var b = $('hLatest').getBBox(); $('hLiveDot').setAttribute('cx', b.x - 8); } catch (e) {} }
  function money(v) { return '$' + Math.round(v).toLocaleString('en-US'); }
  function ease(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function flash(el, c, ms) { el.classList.remove(c); void el.getBBox(); el.classList.add(c); clearTimeout(el['_' + c]); el['_' + c] = setTimeout(function () { el.classList.remove(c); }, ms); }
  function travel(path, glow, ms, done) {
    var p = $(path), g = $(glow), L = p.getTotalLength(), dot = $('hDot'), s = performance.now();
    g.style.strokeDasharray = L; g.style.strokeDashoffset = L; g.style.opacity = 1;
    dot.setAttribute('opacity', 1);
    (function step(now) {
      var t = Math.min(1, (now - s) / ms), e = ease(t), pt = p.getPointAtLength(L * e);
      dot.setAttribute('transform', 'translate(' + pt.x + ' ' + pt.y + ')');
      g.style.strokeDashoffset = L * (1 - e);
      if (t < 1) requestAnimationFrame(step);
      else { dot.setAttribute('opacity', 0); g.style.transition = 'opacity .6s ease'; g.style.opacity = 0; setTimeout(function () { g.style.transition = ''; }, 650); done && done(); }
    })(s);
  }
  function tween(from, to, ms, fn) {
    var s = performance.now();
    (function t(now) { var p = Math.min(1, (now - s) / ms); fn(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(t); })(s);
  }
  function signal() {
    k = (k + 1) % 4;
    var me = k;
    i[me] = (i[me] + 1) % LINES[me].length;
    $('hs' + me).textContent = LINES[me][i[me]];
    flash($('hc' + me), 'hit', 900);
    travel('hp' + me, 'hg' + me, 700, function () {
      flash($('hTile'), 'hit', 600); flash($('hRip'), 'hit', 900);
      travel('hpd', 'hgd', 420, function () {
        n[me] += 1; $('hn' + me).textContent = n[me];
        flash($('hk' + (me + 1)), 'hit', 1400);
        var v = VAL[me][i[me] % VAL[me].length];
        $('hLatest').textContent = LATEST[me] + (v ? ' · +$' + v : ' · ' + LINES[me][i[me]]);
        placeDot(); flash($("hLatestG"), "hit", 1700);
        if (v) {
          var from = rev; rev += v; $('hRevPlus').textContent = '+$' + v; flash($('hk0'), 'hit', 1400);
          tween(from, rev, 800, function (x) { $('hRev').textContent = money(x); pts[6] = x; draw(); });
        }
        clearTimeout(signal._t); signal._t = setTimeout(function () { $('hLatest').textContent = 'Live · this week'; placeDot(); }, 1700);
        if (rev > 2350) setTimeout(resetAll, 1400);
      });
    });
  }
  function resetAll() {
    n = START.n.slice(); rev = START.rev;
    for (var j = 0; j < 4; j++) $('hn' + j).textContent = n[j];
    $('hRev').textContent = money(rev);
    var a = pts[6]; tween(a, BASE[6], 900, function (x) { pts[6] = x; draw(); });
    $('hRev').textContent = money(rev);
  }
  function start() { if (playing) return; playing = true; signal(); timer = setInterval(signal, GAP); }
  function stop() { playing = false; clearInterval(timer); }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }, { threshold: .2 }).observe(svg);
  else start();
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
})();
