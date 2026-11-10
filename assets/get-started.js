(function () {
  var form = document.getElementById('mockupForm');
  var steps = Array.prototype.slice.call(form.querySelectorAll('.step'));
  var nextBtn = document.getElementById('nextBtn');
  var backBtn = document.getElementById('backBtn');
  var label = document.getElementById('stepLabel');
  var stairs = document.querySelectorAll('.stairs span');
  var errBox = document.getElementById('formError');
  var labels = ['YOUR BUSINESS', 'YOUR GOAL', 'YOUR PLAN', 'YOUR DETAILS', 'DONE'];
  var radioNames = ['business_type', 'goal', 'plan'];
  var current = 0;

  function value(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function setStairs(i) {
    for (var s = 0; s < stairs.length; s++) stairs[s].classList.toggle('on', s <= i);
    label.textContent = 'STEP ' + (i + 1) + ' / 5 · ' + labels[i];
  }

  function render() {
    steps.forEach(function (st, i) { st.classList.toggle('active', i === current); });
    backBtn.style.visibility = current === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = current === 3 ? 'Request my free mockup' : 'Continue';
    nextBtn.disabled = current < 3 && !value(radioNames[current]);
    setStairs(current);
    errBox.textContent = '';
  }

  form.addEventListener('change', function () {
    if (current < 3) nextBtn.disabled = !value(radioNames[current]);
  });
  form.addEventListener('input', function () { errBox.textContent = ''; });

  backBtn.addEventListener('click', function () {
    if (current > 0) { current--; render(); }
  });

  nextBtn.addEventListener('click', function () {
    if (current < 3) {
      if (!value(radioNames[current])) return;
      current++; render();
      return;
    }
    var missing = Array.prototype.slice.call(steps[3].querySelectorAll('input[required]'))
      .filter(function (el) { return !el.value.trim() || !el.checkValidity(); });
    if (missing.length) {
      errBox.textContent = 'Please fill in your business name, name, mobile number and a valid email.';
      missing[0].focus();
      return;
    }
    nextBtn.disabled = true;
    nextBtn.textContent = 'Sending…';
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (res) {
      if (!res.ok) throw new Error('bad status');
      showDone();
    }).catch(function () {
      nextBtn.disabled = false;
      nextBtn.textContent = 'Request my free mockup';
      errBox.textContent = 'Something went wrong sending your request. Please try again.';
    });
  });

  function showDone() {
    form.classList.add('hidden');
    var done = document.getElementById('doneStep');
    var biz = (value('business_type') || 'your business').toLowerCase();
    var goal = (value('goal') || 'customers').toLowerCase();
    document.getElementById('summary').textContent =
      'We’ll design a homepage for your ' + biz + ' built to bring in more ' + goal + '. Here’s what happens next.';
    done.classList.add('active');
    setStairs(4);
  }

  render();
})();
