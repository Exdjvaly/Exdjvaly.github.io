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

  // Startbild: Geräte kreisen langsam auf einer geneigten Bahn um das Haus. Was vorne ist, wird
  // größer und liegt vor dem Haus, was hinten ist, kleiner und dahinter. Die Punkte auf den
  // Linien zeigen den Energiefluss: zum Haus (Netz, Speicher) oder vom Haus weg (Verbraucher).
  (function () {
  var szene = document.querySelector('.szene');
  if (!szene) return;
    var NS = 'http://www.w3.org/2000/svg', linien = szene.querySelector('.linien');
    var FARBE = { netz: '#3ddc97', bat: '#5b8cff', wb: '#19C3E6', wp: '#b07cff', kl: '#2ee6c8', ww: '#FF6B2C' };
    var REIN = { netz: 1, bat: 1 };
    var CX = 500, CY = 515, RX = 400, RY = 165, ZIEL = [500, 448];
    var knoten = Array.prototype.map.call(szene.querySelectorAll('.hx'), function (el, i, alle) {
      var k = el.getAttribute('data-k');
      var schiene = document.createElementNS(NS, 'path'), lauf = document.createElementNS(NS, 'path');
      schiene.setAttribute('class', 'schiene');
      lauf.setAttribute('class', 'lauf' + (REIN[k] ? '' : ' raus'));
      lauf.style.stroke = FARBE[k];
      lauf.style.filter = 'drop-shadow(0 0 5px ' + FARBE[k] + ')';
      lauf.style.animationDelay = (-i * 0.17) + 's';
      linien.appendChild(schiene); linien.appendChild(lauf);
      return { el: el, schiene: schiene, lauf: lauf, start: i / alle.length * Math.PI * 2 };
    });
    var ruhig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var neig = 0, neigZiel = 0, sichtbar = true, t0 = performance.now();
    var platziere = function (zeit) {
      var w = ruhig ? 0 : (zeit - t0) / 70000 * Math.PI * 2;
      neig += (neigZiel - neig) * 0.06;
      var ry = RY * (1 + neig * 0.35);
      knoten.forEach(function (n) {
        var a = n.start + w, tiefe = Math.cos(a);
        var x = CX + RX * Math.sin(a), y = CY + ry * tiefe;
        var vorn = (tiefe + 1) / 2, gross = 0.58 + 0.36 * vorn;
        n.el.style.left = x / 10 + '%';
        n.el.style.top = (y - 60 * gross) / 8 + '%';
        n.el.style.transform = 'scale(' + gross.toFixed(3) + ')';
        n.el.style.zIndex = tiefe > -0.15 ? 7 : 4;
        n.el.style.opacity = (0.5 + 0.5 * vorn).toFixed(2);
        n.el.style.setProperty('--vorn', vorn.toFixed(2));
        var mx = (x + ZIEL[0]) / 2, my = Math.max(y, ZIEL[1]) + 30 * (tiefe + 1);
        var d = 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + ZIEL[0] + ' ' + ZIEL[1];
        n.schiene.setAttribute('d', d); n.lauf.setAttribute('d', d);
      });
      szene.style.setProperty('--tx', (neig * -6).toFixed(2) + 'deg');
    };
    var schritt = function (zeit) { if (sichtbar) platziere(zeit); requestAnimationFrame(schritt); };
    platziere(t0);
    if (!ruhig) {
      requestAnimationFrame(schritt);
      if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { sichtbar = e[0].isIntersecting; }).observe(szene);
      // Maus oder Finger neigt die Bahn ein wenig, das gibt Tiefe
      szene.addEventListener('pointermove', function (e) {
        var r = szene.getBoundingClientRect();
        neigZiel = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
        szene.style.setProperty('--ty', (((e.clientX - r.left) / r.width - 0.5) * 10).toFixed(2) + 'deg');
      });
      szene.addEventListener('pointerleave', function () { neigZiel = 0; szene.style.setProperty('--ty', '0deg'); });
    }
  })();

  // Leistungen: das Gerät auf der Karte neigt sich zur Maus
  document.querySelectorAll('.card').forEach(function (karte) {
    var b = karte.querySelector('.buehne');
    if (!b) return;
    karte.addEventListener('pointermove', function (e) {
      var r = karte.getBoundingClientRect();
      b.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 24).toFixed(1) + 'deg');
      b.style.setProperty('--rx', (((e.clientY - r.top) / r.height - 0.5) * -14).toFixed(1) + 'deg');
    });
    karte.addEventListener('pointerleave', function () { b.style.setProperty('--rx', '0deg'); b.style.setProperty('--ry', '0deg'); });
  });

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

  // Anfrage: Beispiele tippen sich im grauen Platzhaltertext, bis jemand ein Feld antippt
  var af = document.getElementById('anfrage');
  if (af && !ruhig && 'IntersectionObserver' in window) {
    var felder = ['name', 'kontakt', 'ort', 'text'].map(function (n) { return af.elements[n]; });
    var original = felder.map(function (f) { return f.getAttribute('placeholder') || ''; });
    var BEISPIELE = [
      ['Anna Bauer', '0171 1234567', '95514 Neustadt am Kulm', 'Einfamilienhaus, Süddach. Wir möchten Photovoltaik mit Speicher.'],
      ['Thomas Weber', 'name@beispiel.de', '92637 Weiden', 'Solaranlage ist schon da, jetzt Wallbox und eine Klimaanlage fürs Schlafzimmer.'],
      ['Familie Schmidt', '0160 7654321', '95478 Kemnath', 'Neubau, Wärmepumpe geplant. Alles soll mit Smart Home zusammenarbeiten.']
    ];
    var tLauf = 0, tUhr = null, satz = 0, aus = false;
    var tWarte = function (fn, ms) { clearTimeout(tUhr); tUhr = setTimeout(fn, ms); };
    var setze = function (f, t) { f.setAttribute('placeholder', t); };
    var tippen = function (n, i, z) {
      if (n !== tLauf) return;
      if (i >= felder.length) return tWarte(function () { loeschen(n, felder.length - 1); }, 2600);
      var f = felder[i], ziel = BEISPIELE[satz][i];
      if (f.value) return tippen(n, i + 1, 0);
      setze(f, ziel.slice(0, z) + (z < ziel.length ? '|' : ''));
      if (z < ziel.length) return tWarte(function () { tippen(n, i, z + 1); }, 38 + Math.random() * 60);
      tWarte(function () { tippen(n, i + 1, 0); }, 450);
    };
    var loeschen = function (n, i) {
      if (n !== tLauf) return;
      if (i < 0) { satz = (satz + 1) % BEISPIELE.length; return tWarte(function () { tippen(n, 0, 0); }, 500); }
      var f = felder[i], t = f.getAttribute('placeholder');
      if (f.value || !t) { setze(f, ''); return loeschen(n, i - 1); }
      setze(f, t.slice(0, Math.max(0, t.length - 4)));
      tWarte(function () { loeschen(n, i); }, 14);
    };
    var halt = function () { clearTimeout(tUhr); tLauf++; };
    var zurueck = function () { felder.forEach(function (f, i) { setze(f, original[i]); }); };
    // Sobald jemand ins Formular geht: Animation endet für immer, die normalen Hinweise kommen zurück
    af.addEventListener('focusin', function () { if (aus) return; aus = true; halt(); zurueck(); });
    new IntersectionObserver(function (e) {
      if (aus) return;
      halt();
      if (e[0].isIntersecting) { felder.forEach(function (f) { setze(f, ''); }); tWarte(function () { tippen(tLauf, 0, 0); }, 600); }
      else zurueck();
    }, { threshold: .4 }).observe(af);
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

/* Hub zum Ausprobieren: Drehknopf mit rundem Display (Hub Core) und Sprache am 7-Zoll-Display (Hub Pro). Beispielwerte. */
(function () {
  var ruhig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var zahl = function (x, d) { return x.toFixed(d || 0).replace('.', ','); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var rk = document.getElementById('rk');
  if (rk) {
    var scr = rk.querySelector('.rk-scr'), ansage = document.getElementById('rk-ansage');
    var schritte = document.querySelectorAll('.hd-steps li');
    var nachtKnopf = document.querySelector('.hd-nacht');
    var BOGEN = 'M37.8 162.2A88 88 0 1 1 162.2 162.2';
    var uhrzeit = function (m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); };
    var wert = function (e) { return e.zeit ? uhrzeit(e.w) : e.opt ? e.w : zahl(e.w, e.d) + (e.e ? ' ' + e.e : ''); };
    var SEITEN = [
      { t: 'Energie', c: '#FFC531', v: 6.8, d: 1, e: 'kW', max: 10, l: 'Sonne vom Dach', s: function () { return ['Haus 5,5 kW', 'Einspeisung 0,9 kW']; } },
      { t: 'Speicher', c: '#4D8DFF', v: 71, e: '%', max: 100, l: 'lädt mit 0,4 kW',
        set: [{ k: 'Reserve für Stromausfall', w: 10, e: '%', min: 5, max: 50, st: 5 }],
        s: function (p) { return ['Reserve ' + wert(p.set[0])]; } },
      { t: 'Wallbox', c: '#19C3E6', v: 62, e: '%', max: 100, l: 'Auto lädt mit Sonne',
        set: [{ k: 'Laden', w: 'Nur Sonne', opt: ['Aus', 'Nur Sonne', 'Automatisch', 'Sofort'] }, { k: 'Ladeziel', w: 80, e: '%', min: 20, max: 100, st: 5 }, { k: 'Fertig bis', w: 420, zeit: true, min: 0, max: 1410, st: 30 }],
        s: function (p) { return [p.set[0].w + ' · Ziel ' + wert(p.set[1]) + ' bis ' + wert(p.set[2])]; } },
      { t: 'Warmwasser', c: '#FF6B2C', v: 52.5, d: 1, e: '°C', max: 80, l: 'heizt mit Sonne',
        set: [{ k: 'Jetzt 1 Stunde heizen', akt: true }, { k: 'Mit Sonnenstrom bis', w: 62, e: '°C', min: 50, max: 80, st: 1 }, { k: 'Mindesttemperatur', w: 45, e: '°C', min: 35, max: 60, st: 1 }],
        s: function (p) { return [p.boost ? 'heizt jetzt 1 Stunde' : 'mit Sonne bis ' + wert(p.set[1])]; } },
      { t: 'Wohnzimmer', c: '#2FD0C2', v: 21.8, d: 1, e: '°C', min: 10, max: 30, l: 'jetzt im Raum',
        set: [{ k: 'Wunschtemperatur', w: 21.5, d: 1, e: '°C', min: 16, max: 30, st: 0.5 }, { k: 'Modus', w: 'Auto', opt: ['Auto', 'Komfort', 'Selbst'] }],
        s: function (p) { return ['Wunsch ' + wert(p.set[0]) + ' · ' + p.set[1].w]; } },
      { t: 'Schlafzimmer', c: '#2FD0C2', v: 19.4, d: 1, e: '°C', min: 10, max: 30, l: 'jetzt im Raum',
        set: [{ k: 'Wunschtemperatur', w: 19, d: 1, e: '°C', min: 16, max: 30, st: 0.5 }, { k: 'Modus', w: 'Auto', opt: ['Auto', 'Komfort', 'Selbst'] }],
        s: function (p) { return ['Wunsch ' + wert(p.set[0]) + ' · ' + p.set[1].w]; } },
      { t: 'Bilanz', c: '#3DDC97', v: 4.2, d: 2, e: '€', l: 'heute gespart', bruch: 0.82, s: function () { return ['Sonne 31,2 kWh', 'Autarkie 82 %']; } }
    ];
    var z = { mod: 'seite', i: 0, sel: 0, tmp: null, rot: 0, nacht: false };
    var ruheUhr = null, okUhr = null, toastUhr = null, uhrTakt = null;

    var bogen = function (bruch, farbe) {
      bruch = Math.max(0, Math.min(1, bruch));
      return '<svg class="rk-g" viewBox="0 0 200 200"><path class="bg" d="' + BOGEN + '" pathLength="100"/><path d="' + BOGEN + '" pathLength="100" stroke="' + farbe + '" stroke-dasharray="' + (bruch * 100).toFixed(1) + ' 100"/></svg>';
    };
    var punkte = function () {
      var h = '<span class="rk-dots">';
      for (var j = 0; j < SEITEN.length; j++) h += '<i' + (j === z.i ? ' class="on"' : '') + '></i>';
      return h + '</span>';
    };
    var uhr = function () {
      var jetzt = new Date(), h = jetzt.getHours() % 12, m = jetzt.getMinutes(), g = '';
      for (var j = 0; j < 60; j++) {
        var a = j * Math.PI / 30, gross = j % 5 === 0, r0 = gross ? 74 : 81, r1 = 86;
        g += '<line x1="' + (100 + r0 * Math.sin(a)).toFixed(1) + '" y1="' + (100 - r0 * Math.cos(a)).toFixed(1) + '" x2="' + (100 + r1 * Math.sin(a)).toFixed(1) + '" y2="' + (100 - r1 * Math.cos(a)).toFixed(1) +
          '" stroke="#8FA3C8" stroke-opacity="' + (gross ? '.75' : '.3') + '" stroke-width="' + (gross ? 2.6 : 1) + '" stroke-linecap="round"/>';
      }
      var zeiger = function (grad, l, w) { var a = grad * Math.PI / 180; return '<line x1="100" y1="100" x2="' + (100 + l * Math.sin(a)).toFixed(1) + '" y2="' + (100 - l * Math.cos(a)).toFixed(1) + '" stroke="#19C3E6" stroke-opacity=".85" stroke-width="' + w + '" stroke-linecap="round"/>'; };
      return '<svg class="rk-uhr" viewBox="0 0 200 200">' + g +
        '<text x="100" y="148" text-anchor="middle" fill="#19C3E6" font-size="11" font-weight="800" letter-spacing="3" font-family="system-ui, sans-serif">VOLTHERM</text>' +
        zeiger((h + m / 60) * 30, 44, 5) + zeiger(m * 6, 66, 3) + '<circle cx="100" cy="100" r="4" fill="#19C3E6"/></svg>';
    };

    var zeichne = function () {
      var p = SEITEN[z.i], h = '', txt = '';
      rk.style.setProperty('--rot', z.rot + 'deg');
      scr.classList.toggle('nacht', z.mod === 'uhr');
      scr.style.setProperty('--c', p.c);
      if (z.mod === 'uhr') {
        h = uhr(); txt = 'Nachtansicht: Uhr';
      } else if (z.mod === 'seite') {
        var bruch = p.bruch != null ? p.bruch : (p.v - (p.min || 0)) / (p.max - (p.min || 0));
        var zeilen = p.s(p);
        h = bogen(bruch, p.c) + '<span class="rk-t">' + esc(p.t) + '</span><b class="rk-v">' + zahl(p.v, p.d) + '<small>' + esc(p.e) + '</small></b><span class="rk-l">' + esc(p.l) + '</span>';
        zeilen.forEach(function (s) { h += '<span class="rk-s">' + esc(s) + '</span>'; });
        h += punkte();
        txt = p.t + ': ' + zahl(p.v, p.d) + ' ' + p.e + ', ' + p.l + '. ' + zeilen.join('. ');
      } else if (z.mod === 'liste') {
        h = '<span class="rk-t">' + esc(p.t) + '</span><div class="rk-list">';
        p.set.forEach(function (e, j) { h += '<span class="rk-i' + (j === z.sel ? ' on' : '') + '">' + esc(e.k) + (e.akt ? '' : '<b>' + esc(wert(e)) + '</b>') + '</span>'; });
        h += '<span class="rk-i zur' + (z.sel === p.set.length ? ' on' : '') + '">Zurück</span></div>';
        txt = z.sel === p.set.length ? 'Zurück' : p.set[z.sel].k;
      } else if (z.mod === 'wert') {
        var e = p.set[z.sel], anz = { w: z.tmp, e: e.e, d: e.d, zeit: e.zeit, opt: e.opt }, b2;
        b2 = e.opt ? (e.opt.indexOf(z.tmp) + 1) / e.opt.length : (z.tmp - e.min) / (e.max - e.min);
        var gross = e.opt ? esc(z.tmp) : esc(e.zeit ? uhrzeit(z.tmp) : zahl(z.tmp, e.d)) + (e.e ? '<small>' + esc(e.e) + '</small>' : '');
        h = bogen(b2, p.c) + '<span class="rk-t">' + esc(p.t) + '</span><span class="rk-l">' + esc(e.k) + '</span><b class="rk-v acc"' + (e.opt ? ' style="font-size:2.1em"' : '') + '>' + gross + '</b><span class="rk-s">Drücken zum Speichern</span>';
        txt = e.k + ' ' + wert(anz);
      } else if (z.mod === 'ok') {
        h = '<span class="rk-ok"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><b class="rk-v" style="font-size:1.5em">' + esc(z.okText || 'Gespeichert') + '</b>';
        txt = z.okText || 'Gespeichert';
      }
      if (z.toast) h += '<span class="rk-toast">' + esc(z.toast) + '</span>';
      scr.innerHTML = h;
      ansage.textContent = txt;
      var aktiv = { seite: 0, liste: 1, wert: 2, ok: 3 }[z.mod];
      Array.prototype.forEach.call(schritte, function (li, j) { li.classList.toggle('on', j === aktiv); });
    };

    var weckeRuhe = function () {
      clearTimeout(ruheUhr);
      if (z.mod === 'liste' || z.mod === 'wert') ruheUhr = setTimeout(function () { z.mod = 'seite'; zeichne(); weckeRuhe(); }, 10000);
      else if (z.mod === 'seite' && z.nacht) ruheUhr = setTimeout(function () { z.mod = 'uhr'; zeichne(); }, 8000);
    };
    var zeigeToast = function (t) { z.toast = t; clearTimeout(toastUhr); toastUhr = setTimeout(function () { z.toast = null; zeichne(); }, 1400); };

    var drehe = function (r, sichtbar) {
      if (sichtbar !== false) z.rot += r * 12;
      var p = SEITEN[z.i];
      if (z.mod === 'uhr') { z.mod = 'seite'; z.i = 0; }
      else if (z.mod === 'seite') z.i = (z.i + r + SEITEN.length) % SEITEN.length;
      else if (z.mod === 'liste') z.sel = Math.max(0, Math.min(p.set.length, z.sel + r));
      else if (z.mod === 'wert') {
        var e = p.set[z.sel];
        if (e.opt) z.tmp = e.opt[Math.max(0, Math.min(e.opt.length - 1, e.opt.indexOf(z.tmp) + r))];
        else z.tmp = Math.max(e.min, Math.min(e.max, Math.round((z.tmp + r * e.st) * 10) / 10));
      }
      zeichne(); weckeRuhe();
    };
    var druecke = function () {
      var p = SEITEN[z.i];
      if (z.mod === 'uhr') { z.mod = 'seite'; z.i = 0; }
      else if (z.mod === 'seite') { if (p.set) { z.mod = 'liste'; z.sel = 0; } else zeigeToast('Diese Seite zeigt nur an'); }
      else if (z.mod === 'liste') {
        if (z.sel === p.set.length) z.mod = 'seite';
        else if (p.set[z.sel].akt) { p.boost = true; z.mod = 'ok'; z.okText = 'Heizt 1 Stunde'; }
        else { z.mod = 'wert'; z.tmp = p.set[z.sel].w; }
      } else if (z.mod === 'wert') { p.set[z.sel].w = z.tmp; z.mod = 'ok'; z.okText = 'Gespeichert'; }
      if (z.mod === 'ok') { clearTimeout(okUhr); okUhr = setTimeout(function () { z.mod = 'seite'; zeichne(); weckeRuhe(); }, 1500); }
      zeichne(); weckeRuhe();
    };

    // Rundgang, bis jemand selbst dreht oder drückt
    var tour = null, tourAus = false;
    var TOUR = [1, 1, 1, 1, 'd', 'd', 1, 1, 'd', 'w', 1, 1, 'w', 1];
    var stoppeTour = function () { tourAus = true; clearTimeout(tour); };
    var tourSchritt = function (n) {
      if (tourAus) return;
      if (n >= TOUR.length) { tour = setTimeout(function () { tourSchritt(0); }, 4000); return; }
      if (n === 0) SEITEN[4].set[0].w = 21.5;
      var a = TOUR[n];
      if (a === 'd') druecke(); else if (a !== 'w') drehe(a);
      tour = setTimeout(function () { tourSchritt(n + 1); }, a === 'w' ? 2200 : 1300);
    };
    var nutzer = function () { if (!tourAus) stoppeTour(); if (navigator.vibrate) try { navigator.vibrate(6); } catch (err) {} };

    document.querySelectorAll('[data-rk]').forEach(function (b) {
      b.addEventListener('click', function () { nutzer(); var r = +b.getAttribute('data-rk'); if (r) drehe(r); else druecke(); });
    });
    nachtKnopf.addEventListener('click', function () {
      stoppeTour();
      z.nacht = !z.nacht; nachtKnopf.setAttribute('aria-pressed', String(z.nacht));
      z.mod = z.nacht ? 'uhr' : 'seite'; zeichne(); weckeRuhe();
      clearInterval(uhrTakt);
      if (z.nacht) uhrTakt = setInterval(function () { if (z.mod === 'uhr') zeichne(); }, 20000);
    });
    rk.addEventListener('keydown', function (e) {
      var r = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (r) { e.preventDefault(); nutzer(); drehe(r); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nutzer(); druecke(); }
    });
    var rad = 0;
    rk.addEventListener('wheel', function (e) {
      e.preventDefault(); nutzer();
      rad += e.deltaY;
      while (Math.abs(rad) >= 60) { drehe(rad > 0 ? 1 : -1); rad -= (rad > 0 ? 60 : -60); }
    }, { passive: false });
    // Ziehen am Ring: alle 15 Grad eine Rastung; kurzes Tippen = Drücken
    var zug = null;
    var winkel = function (e) { var b = rk.getBoundingClientRect(); return Math.atan2(e.clientY - b.top - b.height / 2, e.clientX - b.left - b.width / 2) * 180 / Math.PI; };
    rk.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      nutzer();
      zug = { w: winkel(e), x: e.clientX, y: e.clientY, summe: 0, rest: 0, gedreht: false };
      try { rk.setPointerCapture(e.pointerId); } catch (err) {}
    });
    rk.addEventListener('pointermove', function (e) {
      if (!zug) return;
      var w = winkel(e), dw = w - zug.w;
      if (dw > 180) dw -= 360; else if (dw < -180) dw += 360;
      zug.w = w; zug.summe += Math.abs(dw); zug.rest += dw;
      if (zug.summe > 6) zug.gedreht = true;
      z.rot += dw; rk.style.setProperty('--rot', z.rot + 'deg');
      while (Math.abs(zug.rest) >= 15) { var r = zug.rest > 0 ? 1 : -1; zug.rest -= r * 15; drehe(r, false); if (navigator.vibrate) try { navigator.vibrate(6); } catch (err) {} }
    });
    var ende = function (e) {
      if (!zug) return;
      var weit = Math.abs(e.clientX - zug.x) + Math.abs(e.clientY - zug.y);
      if (!zug.gedreht && weit < 10 && e.type === 'pointerup') druecke();
      zug = null;
    };
    rk.addEventListener('pointerup', ende);
    rk.addEventListener('pointercancel', ende);

    // Werte leben leicht mit
    setInterval(function () {
      if (z.mod !== 'seite' || document.hidden) return;
      var e = SEITEN[0]; e.v = Math.max(6.2, Math.min(7.4, e.v + (Math.random() - .5) * .3));
      var s = SEITEN[1]; if (s.v < 99) s.v += Math.random() < .25 ? 1 : 0;
      zeichne();
    }, 2600);

    zeichne();
    if (!ruhig && 'IntersectionObserver' in window) {
      var gestartet = false;
      new IntersectionObserver(function (ein) {
        if (ein[0].isIntersecting && !gestartet && !tourAus) { gestartet = true; tour = setTimeout(function () { tourSchritt(0); }, 900); }
        else if (!ein[0].isIntersecting && gestartet && !tourAus) { clearTimeout(tour); gestartet = false; }
      }, { threshold: 0.6 }).observe(rk);
    }
  }

  // Hub Pro: echtes VOLTHERM Home im 7-Zoll-Rahmen, dazu Beispielfragen per Sprache
  var pf = document.getElementById('pf-scr');
  if (pf) {
    var passe = function () { pf.style.setProperty('--s', (pf.clientWidth / 1280).toFixed(4)); };
    passe();
    if ('ResizeObserver' in window) new ResizeObserver(passe).observe(pf); else window.addEventListener('resize', passe);

    var stimme = document.getElementById('pf-voice'), unten = document.querySelector('.pf-unten'), chips = document.querySelectorAll('[data-frage]'), uhren = [];
    var FRAGEN = [
      { f: 'Lohnt sich jetzt die Waschmaschine?', a: 'Ja, jetzt passt es gut. Die Sonne liefert mehr, als das Haus gerade braucht, und der Speicher ist zu 71 % voll.' },
      { f: 'Wann ist das Auto voll?', a: 'Das Auto hat 62 %. Es lädt mit Sonnenstrom und ist bis 07:00 Uhr auf 80 %.' },
      { f: 'Mach bitte warmes Wasser.', a: 'Gern. Der Speicher hat 52 °C. Ich heize eine Stunde mit Sonnenstrom, das kostet nichts. Soll ich starten?',
        ja: 'Erledigt. Ich sage Bescheid, wenn das Wasser warm ist.', nein: 'In Ordnung, ich lasse alles, wie es ist.' }
    ];
    var MIC = '<span class="pv-mic"><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg></span>';
    var spaeter = function (fn, ms) { uhren.push(setTimeout(fn, ruhig ? 0 : ms)); };
    var stopp = function () { uhren.forEach(clearTimeout); uhren = []; };
    var tippe = function (el, text, ms, fertig) {
      if (ruhig) { el.textContent = text; fertig(); return; }
      var n = 0, weiter = function () { n++; el.textContent = text.slice(0, n); if (n < text.length) spaeter(weiter, ms); else fertig(); };
      weiter();
    };
    var antworte = function (q, text) {
      var a = stimme.querySelector('.pv-a');
      if (!a) { a = document.createElement('div'); a.className = 'pv-a'; stimme.appendChild(a); }
      a.innerHTML = '<b>VOLTHERM</b><span></span>';
      tippe(a.querySelector('span'), text, 22, function () {
        if (q && q.ja) {
          var act = document.createElement('div'); act.className = 'pv-act';
          act.innerHTML = '<button type="button">Ja, starten</button><button type="button">Nein</button>';
          act.children[0].addEventListener('click', function () { act.remove(); antworte(null, q.ja); });
          act.children[1].addEventListener('click', function () { act.remove(); antworte(null, q.nein); });
          a.appendChild(act);
        } else spaeter(function () { stimme.classList.remove('on'); chips.forEach(function (c) { c.classList.remove('on'); }); }, 7000);
      });
    };
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        stopp();
        var q = FRAGEN[+chip.getAttribute('data-frage')];
        // Auf schmalen Bildschirmen ist das Display zu klein: die Antwort erscheint unter dem Gerät
        (pf.clientWidth < 440 ? unten : pf).appendChild(stimme);
        chips.forEach(function (c) { c.classList.toggle('on', c === chip); });
        stimme.innerHTML = '<div class="pv-f">' + MIC + '<span>„<span class="pv-t"></span>“</span></div>';
        stimme.classList.add('on', 'hoert');
        spaeter(function () {
          tippe(stimme.querySelector('.pv-t'), q.f, 45, function () {
            stimme.classList.remove('hoert');
            spaeter(function () { antworte(q, q.a); }, 500);
          });
        }, 400);
      });
    });
  }
})();
