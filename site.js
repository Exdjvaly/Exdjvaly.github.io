// VOLTHERM Firmenseite: Menü, Einblenden, Anfrage direkt (Push über /api/anfrage) oder über WhatsApp bzw. E-Mail.
(function () {
  document.documentElement.classList.add('js');
  var jahr = document.getElementById('jahr');
  if (jahr) jahr.textContent = new Date().getFullYear();

  // Menü auf dem Telefon
  var btn = document.querySelector('.menu-btn'), nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var auf = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', auf ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Abschnitte sanft einblenden
  var ziele = document.querySelectorAll('.sec h2, .card, .steps li, .why div, .phone, .band-art, .anfrage');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    ziele.forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }

  // Knöpfe wie „Klimaanlage anfragen“ wählen das Interesse im Formular vor
  document.querySelectorAll('[data-interesse]').forEach(function (a) {
    a.addEventListener('click', function () {
      var box = document.querySelector('.pick input[value="' + a.getAttribute('data-interesse') + '"]');
      if (box) box.checked = true;
    });
  });

  // Anfrage: direkt senden (Push an VOLTHERM) oder Text für WhatsApp bzw. E-Mail vorbereiten
  var form = document.getElementById('anfrage');
  if (!form) return;
  var gewaehlt = 'direkt';
  form.querySelectorAll('button[type=submit]').forEach(function (b) {
    b.addEventListener('click', function () { gewaehlt = b.value; });
  });
  var fehler = form.querySelector('.err'), okText = form.querySelector('.ok');
  function zeigeFehler(text, feld) {
    fehler.textContent = text; fehler.hidden = false; okText.hidden = true;
    if (feld) feld.focus();
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements['name'].value.trim();
    if (!name) { zeigeFehler('Bitte geben Sie Ihren Namen an.', form.elements['name']); return; }
    var kontakt = form.elements['kontakt'].value.trim();
    var interessen = Array.prototype.map.call(form.querySelectorAll('input[name=i]:checked'), function (c) { return c.value; });
    var text = form.elements['text'].value.trim();
    var ort = form.elements['ort'].value.trim();
    fehler.hidden = true;

    if (gewaehlt === 'direkt') {
      if (!kontakt) { zeigeFehler('Bitte geben Sie Telefon oder E-Mail an, damit wir Sie erreichen.', form.elements['kontakt']); return; }
      var knopf = form.querySelector('button[value=direkt]');
      knopf.disabled = true;
      fetch('/api/anfrage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, kontakt: kontakt, ort: ort, text: text, interesse: interessen.join(', '), website: form.elements['website'].value })
      }).then(function (r) {
        if (!r.ok) return r.json().catch(function () { return {}; }).then(function (d) { throw new Error(r.status + (d.grund ? ' ' + d.grund : '')); });
        form.reset(); okText.hidden = false;
      }).catch(function (err) {
        zeigeFehler('Das Senden hat leider nicht geklappt. Bitte nutzen Sie WhatsApp, E-Mail oder rufen Sie uns an: 01556 8656548. (Fehler ' + err.message + ')');
      }).then(function () { knopf.disabled = false; });
      return;
    }

    var zeilen = ['Hallo VOLTHERM,', ''];
    zeilen.push(interessen.length ? 'ich interessiere mich für: ' + interessen.join(', ') + '.' : 'ich habe eine Anfrage.');
    if (text) zeilen.push('', text);
    zeilen.push('', 'Name: ' + name);
    if (kontakt) zeilen.push('Kontakt: ' + kontakt);
    if (ort) zeilen.push('Ort: ' + ort);
    var nachricht = zeilen.join('\n');
    if (gewaehlt === 'mail') {
      var betreff = 'Anfrage' + (interessen.length ? ': ' + interessen.join(', ') : '');
      location.href = 'mailto:office@voltherm.de?subject=' + encodeURIComponent(betreff) + '&body=' + encodeURIComponent(nachricht);
    } else {
      window.open('https://wa.me/4915568656548?text=' + encodeURIComponent(nachricht), '_blank', 'noopener');
    }
  });
})();
