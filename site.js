// VOLTHERM Firmenseite: Menü, Einblenden, Anfrage über WhatsApp oder E-Mail (nichts wird an einen Server gesendet).
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

  // Anfrage: Text zusammenstellen und WhatsApp oder E-Mail öffnen
  var form = document.getElementById('anfrage');
  if (!form) return;
  var gewaehlt = 'wa';
  form.querySelectorAll('button[type=submit]').forEach(function (b) {
    b.addEventListener('click', function () { gewaehlt = b.value; });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fehler = form.querySelector('.err');
    var name = form.elements['name'].value.trim();
    if (!name) { fehler.hidden = false; form.elements['name'].focus(); return; }
    fehler.hidden = true;
    var interessen = Array.prototype.map.call(form.querySelectorAll('input[name=i]:checked'), function (c) { return c.value; });
    var zeilen = ['Hallo VOLTHERM,', ''];
    zeilen.push(interessen.length ? 'ich interessiere mich für: ' + interessen.join(', ') + '.' : 'ich habe eine Anfrage.');
    var text = form.elements['text'].value.trim();
    if (text) zeilen.push('', text);
    zeilen.push('', 'Name: ' + name);
    var ort = form.elements['ort'].value.trim();
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
