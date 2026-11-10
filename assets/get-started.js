(function () {
  var form = document.getElementById('mockupForm');
  var steps = Array.prototype.slice.call(form.querySelectorAll('.step'));
  var nextBtn = document.getElementById('nextBtn');
  var nextLabel = document.getElementById('nextLabel');
  var backBtn = document.getElementById('backBtn');
  var side = Array.prototype.slice.call(document.querySelectorAll('#sideSteps li'));
  var prog = document.getElementById('prog');
  var errBox = document.getElementById('formError');
  var radioNames = ['business_type', 'goal'];
  var current = 0;

  function value(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function setSide(i) {
    side.forEach(function (li, k) {
      li.classList.toggle('on', k === i);
      li.classList.toggle('done', k < i);
      if (k === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    prog.style.width = ((i + 1) / 4 * 100) + '%';
  }

  function render() {
    steps.forEach(function (st, i) {
      var on = i === current;
      st.classList.toggle('active', on);
      if (on) Array.prototype.forEach.call(st.querySelectorAll('.opt'), function (o) { o.style.animation = 'none'; void o.offsetWidth; o.style.animation = ''; });
    });
    backBtn.style.visibility = current === 0 ? 'hidden' : 'visible';
    var nav = document.getElementById('formNav');
    if (nav) { nav.classList.toggle('auto', current < 2); nav.classList.toggle('first', current === 0); }
    nextLabel.textContent = current === 2 ? 'Request my free mockup' : 'Continue';
    nextBtn.disabled = current < 2 && !value(radioNames[current]);
    setSide(current);
    errBox.textContent = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  form.addEventListener('change', function (e) {
    if (current < 2) {
      nextBtn.disabled = !value(radioNames[current]);
      if (e.target.type === 'radio' && e.target.name === radioNames[current]) {
        advanceSoon();
      }
    }
  });
  form.addEventListener('input', function () { errBox.textContent = ''; });
  form.addEventListener('click', function (e) {
    var r = e.target.closest && e.target.closest('.opt');
    if (!r || current >= 2) return;
    var inp = r.querySelector('input[type=radio]') || (r.htmlFor && document.getElementById(r.htmlFor));
    if (inp && inp.checked && inp.name === radioNames[current]) advanceSoon();
  });
  var pending = false;
  function advanceSoon() {
    if (pending) return; pending = true;
    setTimeout(function () { pending = false; if (current < 2 && value(radioNames[current])) { current++; render(); } }, 380);
  }

  backBtn.addEventListener('click', function () { if (current > 0) { current--; render(); } });

  nextBtn.addEventListener('click', function () {
    if (current < 2) {
      if (!value(radioNames[current])) return;
      current++; render(); return;
    }
    var missing = Array.prototype.slice.call(steps[2].querySelectorAll('input[required]'))
      .filter(function (el) { return !el.value.trim() || !el.checkValidity(); });
    if (missing.length) {
      errBox.textContent = 'Please add your business name, your name, a mobile number and a valid email.';
      missing[0].focus();
      return;
    }
    nextBtn.disabled = true;
    nextLabel.textContent = 'Sending…';
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (res) {
      if (!res.ok) throw new Error('bad status');
      showDone();
    }).catch(function () {
      nextBtn.disabled = false;
      nextLabel.textContent = 'Request my free mockup';
      errBox.textContent = 'Something went wrong sending your request. Please try again.';
    });
  });

  function showDone() {
    form.classList.add('hidden');
    var biz = value('business_type');
    var goal = (value('goal') || 'customers').toLowerCase();
    var who = biz && biz !== 'Something else' ? 'your ' + biz.toLowerCase() : 'your business';
    document.getElementById('summary').textContent =
      'We’ll design a homepage for ' + who + ', built to bring in more ' + goal + '. Here’s what happens next.';
    document.getElementById('doneStep').classList.add('active');
    setSide(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  render();
})();
