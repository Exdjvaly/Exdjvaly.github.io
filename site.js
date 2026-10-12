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
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; el.classList.add('in'); io.unobserve(el);
        setTimeout(function () { el.style.transitionDelay = ''; }, 1500);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    ziele.forEach(function (el) {
      el.classList.add('reveal');
      // Karten im Raster nacheinander einblenden
      var nr = Array.prototype.indexOf.call(el.parentNode.children, el);
      if (el.parentNode.children.length > 2 && nr > 0) el.style.transitionDelay = Math.min(nr, 6) * 90 + 'ms';
      io.observe(el);
    });
  }

  // Knöpfe wie „Klimaanlage anfragen“ wählen das Interesse im Formular vor
  document.querySelectorAll('[data-interesse]').forEach(function (a) {
    a.addEventListener('click', function () {
      var box = document.querySelector('.pick input[value="' + a.getAttribute('data-interesse') + '"]');
      if (box) box.checked = true;
    });
  });

  // Galerie: Klick auf eine Leistung zeigt Fotos aus echten Projekten (Daten im Block #galerie-daten)
  var gDaten = {};
  try { gDaten = JSON.parse(document.getElementById('galerie-daten').textContent || '{}'); } catch (e) { gDaten = {}; }
  var dlg = document.getElementById('galerie');
  if (dlg && dlg.showModal) {
    var gImg = dlg.querySelector('.g-bild img'), gText = dlg.querySelector('.g-bild figcaption');
    var gTitel = dlg.querySelector('.g-titel'), gZahl = dlg.querySelector('.g-zahl'), gLeiste = dlg.querySelector('.g-leiste');
    var gListe = [], gNr = 0, gX = null;
    var zeige = function (i) {
      gNr = (i + gListe.length) % gListe.length;
      var bild = gListe[gNr];
      gImg.classList.remove('neu'); void gImg.offsetWidth; gImg.classList.add('neu');
      gImg.src = bild.src; gImg.alt = bild.text || gTitel.textContent;
      gText.textContent = bild.text || '';
      gZahl.textContent = (gNr + 1) + ' / ' + gListe.length;
      Array.prototype.forEach.call(gLeiste.children, function (t, j) {
        t.classList.toggle('akt', j === gNr);
        if (j === gNr && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center' });
      });
    };
    var oeffne = function (key, titel) {
      gListe = gDaten[key]; gTitel.textContent = titel; gLeiste.innerHTML = '';
      gListe.forEach(function (bild, j) {
        var t = document.createElement('button');
        t.type = 'button'; t.setAttribute('aria-label', 'Foto ' + (j + 1));
        var im = document.createElement('img'); im.src = bild.t || bild.src; im.alt = ''; im.loading = 'lazy';
        t.appendChild(im); t.addEventListener('click', function () { zeige(j); });
        gLeiste.appendChild(t);
      });
      dlg.showModal(); zeige(0);
    };
    document.querySelectorAll('[data-galerie]').forEach(function (karte) {
      var key = karte.getAttribute('data-galerie'), liste = gDaten[key];
      if (!liste || !liste.length) return;
      var titel = karte.querySelector('h3').textContent;
      karte.classList.add('hat-galerie'); karte.tabIndex = 0; karte.setAttribute('role', 'button');
      karte.setAttribute('aria-label', titel + ': ' + liste.length + ' Fotos aus unseren Projekten ansehen');
      var mehr = document.createElement('span'); mehr.className = 'g-mehr';
      mehr.textContent = liste.length === 1 ? '1 Foto ansehen' : liste.length + ' Fotos ansehen';
      (karte.querySelector('div') || karte).appendChild(mehr);
      karte.addEventListener('click', function () { oeffne(key, titel); });
      karte.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); oeffne(key, titel); }
      });
    });
    dlg.querySelector('.g-vor').addEventListener('click', function () { zeige(gNr - 1); });
    dlg.querySelector('.g-nach').addEventListener('click', function () { zeige(gNr + 1); });
    dlg.querySelector('.g-zu').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.classList.contains('g-buehne')) dlg.close(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') zeige(gNr - 1);
      if (e.key === 'ArrowRight') zeige(gNr + 1);
    });
    // Wischen auf dem Telefon
    gImg.addEventListener('pointerdown', function (e) { gX = e.clientX; });
    gImg.addEventListener('pointerup', function (e) {
      if (gX === null) return;
      var d = e.clientX - gX; gX = null;
      if (Math.abs(d) > 40) zeige(gNr + (d < 0 ? 1 : -1));
    });
  }

  // VOLTHERM KI: Gespräch am Wandtablet abspielen, solange es sichtbar ist
  var kt = document.getElementById('ki-demo');
  var ruhig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (kt && !ruhig && 'IntersectionObserver' in window) {
    var k = function (n) { return kt.querySelector('[data-k="' + n + '"]'); };
    var msgs = kt.querySelector('.kt-msgs'), listen = kt.querySelector('.kt-listen');
    var said = k('said'), hint = k('hint');
    var lauf = 0, uhren = [], werte;
    var GESPRAECH = [
      ['hoeren', 'Wie war der Tag bisher?'],
      ['antwort', 'Sehr gut. 82 % Ihres Stroms kam heute von der Sonne, das Auto lädt gerade mit Überschuss.'],
      ['hoeren', 'Mach bitte warmes Wasser.'],
      ['antwort', 'Gern. Der Speicher hat 42 °C. Ich heize mit Sonne vom Dach auf 60 °C, das kostet nichts. Soll ich starten?', true],
      ['hoeren', 'Ja, bitte.', 'tippen'],
      ['antwort', 'Gestartet. Das Warmwasser heizt jetzt mit Sonne. Ich sage Bescheid, wenn es 60 °C hat.', 'heizen']
    ];
    var spaeter = function (fn, ms) { var id = setTimeout(fn, ms); uhren.push(id); return id; };
    var alleStopp = function () { uhren.forEach(clearTimeout); uhren = []; };
    var komma = function (x) { return x.toFixed(1).replace('.', ','); };
    var ruhe = function () { listen.classList.remove('on'); said.textContent = 'VOLTHERM fragen'; hint.textContent = 'Antippen und sprechen'; };
    var blase = function (art) {
      var b = document.createElement('div'); b.className = 'm ' + art + ' neu'; msgs.appendChild(b); return b;
    };
    var kacheln = function () {
      k('pv').textContent = komma(werte.pv); k('bat').textContent = Math.round(werte.bat);
      k('batbar').style.width = Math.round(werte.bat) + '%'; k('car').textContent = Math.round(werte.car);
      k('ww').textContent = Math.round(werte.ww);
    };
    var takt = function (n) {
      if (n !== lauf) return;
      werte.pv = Math.min(7.2, Math.max(6.4, werte.pv + (Math.random() - .5) * .3));
      werte.bat = Math.min(84, werte.bat + .25); werte.car = Math.min(80, werte.car + .2);
      if (werte.heizt) werte.ww = Math.min(60, werte.ww + .6);
      kacheln(); spaeter(function () { takt(n); }, 1800);
    };
    var schritt = function (n, i) {
      if (n !== lauf) return;
      if (i >= GESPRAECH.length) {
        spaeter(function () { msgs.classList.add('weg'); }, 7000);
        spaeter(function () { start(n); }, 7800);
        return;
      }
      var s = GESPRAECH[i], weiter = function (ms) { spaeter(function () { schritt(n, i + 1); }, ms); };
      if (s[0] === 'hoeren') {
        listen.classList.add('on'); hint.textContent = 'Ich höre zu'; said.textContent = '„';
        var z = 0, tippe = function () {
          if (n !== lauf) return;
          z++; said.textContent = '„' + s[1].slice(0, z) + (z < s[1].length ? ' …' : '“');
          if (z < s[1].length) return spaeter(tippe, 55);
          spaeter(function () {
            ruhe();
            if (s[2] === 'tippen') {
              var ja = msgs.querySelector('.act:last-of-type .kb');
              if (ja) { ja.classList.add('hit'); ja.parentNode.classList.add('done'); }
            }
            blase('u').textContent = s[1];
            weiter(700);
          }, 500);
        };
        spaeter(tippe, 450);
      } else {
        var b = blase('b');
        b.innerHTML = '<span class="kt-dots"><i></i><i></i><i></i></span>';
        spaeter(function () {
          if (n !== lauf) return;
          b.textContent = '';
          var woerter = s[1].split(' '), w = 0;
          var wort = function () {
            if (n !== lauf) return;
            var sp = document.createElement('span'); sp.className = 'w';
            sp.textContent = (w ? ' ' : '') + woerter[w]; b.appendChild(sp); w++;
            if (w < woerter.length) return spaeter(wort, 70);
            if (s[2] === true) {
              var a = document.createElement('span'); a.className = 'act';
              a.innerHTML = '<span class="kb">Ja, starten</span><span class="kb g">Nein</span>'; b.appendChild(a);
            }
            if (s[2] === 'heizen') { werte.heizt = true; k('wwt').classList.add('heat'); }
            weiter(1200 + woerter.length * 230);
          };
          wort();
        }, 1300);
      }
    };
    var start = function (n) {
      if (n !== lauf) return;
      msgs.classList.remove('weg'); msgs.innerHTML = '';
      werte = { pv: 6.8, bat: 78, car: 64, ww: 42, heizt: false };
      k('wwt').classList.remove('heat'); kacheln(); ruhe();
      spaeter(function () { schritt(n, 0); }, 300);
    };
    new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) {
        if (!kt.classList.contains('live')) kt.classList.add('live');
        alleStopp(); lauf++; start(lauf); takt(lauf);
      } else { alleStopp(); lauf++; }
    }, { threshold: .35 }).observe(kt);
  }

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
        if (!r.ok) return r.text().catch(function () { return ''; }).then(function (t) {
          var d = {}; try { d = JSON.parse(t); } catch (e) { d = { grund: 'Server ' + (t.match(/<title>([^<]*)/i) || [, t.slice(0, 60)])[1] }; }
          throw new Error(r.status + (d.grund ? ' ' + d.grund : ''));
        });
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
