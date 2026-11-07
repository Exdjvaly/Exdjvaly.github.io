/* VOLTHERM Flagship (2026-11-07): Energie-Partikel auf Bézier-Kurven im Startbild, Zähler im Abschnitt Erfahrung. */
(function () {
  'use strict';
  var ruhig = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Energiefluss: Partikel auf kubischen Bézier-Kurven ---------- */
  var buehne = document.getElementById('fx-buehne');
  var cv = document.getElementById('fx-flow');
  if (buehne && cv && cv.getContext) {
    var ctx = cv.getContext('2d');
    var dpr = 1, W = 0, H = 0, bahnen = [], teile = [], sichtbar = true, letzte = 0;

    // vorgerenderter Leuchtpunkt pro Farbe
    var sprites = {};
    // Ein Tag mit VOLTHERM: [Anzeige, Stärke 0..1, rückwärts, andere Beschriftung]
    var SZ = {
      zwielicht: { zeit: '06:15 · Morgengrauen',
        sonne: ['0,1 kW', .1], netz: ['0,0 kW', 0], ww: ['49 °C', 0], speicher: ['−1,2 kW', 1, 1], wp: ['0,5 kW', .5], wallbox: ['Auto steht', 0], klima: ['Standby', 0], haushalt: ['0,8 kW', .6], epex: ['28 ct/kWh', 1],
        text: 'Der Wechselrichter liefert noch kaum Strom. Kaffee, Licht und die Wärmepumpe laufen mit dem Sonnenstrom von gestern aus dem Speicher.',
        macht: 'VOLTHERM hält den Netzbezug bei null, solange der Speicher reicht.' },
      morgen: { zeit: '08:30 · Morgen',
        sonne: ['3,2 kW', .5], netz: ['0,0 kW', 0], ww: ['49 °C', 0], speicher: ['+1,8 kW', .6], wp: ['0,8 kW', .5], wallbox: ['Wartet', 0], klima: ['Standby', 0], haushalt: ['0,6 kW', .5], epex: ['25 ct/kWh', 1],
        text: 'Die Sonne steigt. Zuerst versorgt sie das Haus, der Rest fließt in den Speicher.',
        macht: 'VOLTHERM lädt den Speicher zuerst bis 50 %, damit der Abend gesichert ist. Erst danach bekommt das Auto Strom.' },
      sonne: { zeit: '12:30 · Volle Sonne',
        sonne: ['10,0 kW', 1], netz: ['0,3 kW', .25, 1, 'Einspeisung'], ww: ['60 °C', .8, 0, 'Heizstab 1,0 kW'], speicher: ['+2,0 kW', .8], wp: ['1,4 kW', .7], wallbox: ['4,2 kW', 1], klima: ['0,6 kW', .5], haushalt: ['0,5 kW', .4], epex: ['12 ct/kWh', 1],
        text: 'Volle Sonne. Das E-Auto lädt, der Speicher füllt sich, das Warmwasser heizt auf 60 °C und die Klimaanlage kühlt.',
        macht: 'VOLTHERM verteilt den Überschuss der Reihe nach: Speicher, Auto, Klima, Wärmepumpe, Heizstab. Ins Netz geht nur der kleine Rest.' },
      wolken: { zeit: '15:00 · Wolken',
        sonne: ['2,4 kW', .4], netz: ['0,0 kW', 0], ww: ['60 °C', 0], speicher: ['0,0 kW', 0], wp: ['0,4 kW', .3], wallbox: ['1,4 kW', .5], klima: ['Pause', 0], haushalt: ['0,5 kW', .4], epex: ['22 ct/kWh', 1],
        text: 'Wolken ziehen auf. Die Leistung vom Dach fällt in wenigen Sekunden auf ein Viertel.',
        macht: 'VOLTHERM reagiert sofort: Das Auto lädt mit kleinster Leistung weiter, Klima und Heizstab pausieren. Der Speicher wird nicht für das Auto geleert.' },
      abend: { zeit: '19:00 · Abend',
        sonne: ['0,0 kW', 0], netz: ['0,0 kW', 0], ww: ['57 °C', 0], speicher: ['−1,2 kW', 1, 1], wp: ['Pause', 0], wallbox: ['−0,7 kW', .6, 1, 'Auto → Haus'], klima: ['Standby', 0], haushalt: ['1,9 kW', 1], epex: ['36 ct/kWh', 1, 0, 'EPEX · teuer'],
        text: 'Kochen, Licht, Fernsehen: Der Abend läuft mit Sonnenstrom vom Mittag, aus dem Speicher und bidirektional aus dem Auto.',
        macht: 'Der Strom ist jetzt teuer. VOLTHERM holt Strom aus dem Auto ins Haus (V2H) und pausiert die Wärmepumpe kurz, das Haus heizt mit der Wärme vom Mittag.' },
      nacht: { zeit: '02:00 · Nacht',
        sonne: ['0,0 kW', 0], netz: ['13,7 kW', 1], ww: ['54 °C', 0], speicher: ['+2,0 kW', .6], wp: ['0,3 kW', .25], wallbox: ['11 kW', 1], klima: ['Standby', 0], haushalt: ['0,4 kW', .3], epex: ['18 ct/kWh', 1, 0, 'EPEX · günstig'],
        text: 'Nachts ist der Börsenstrom am günstigsten. Das Auto lädt, bis es morgens 80 % hat.',
        macht: 'Mit dynamischem Tarif lädt VOLTHERM Auto und Speicher in den billigsten Stunden. Am Morgen beginnt der Tag wieder mit eigenem Strom.' }
    };
    var FOLGE = ['zwielicht', 'morgen', 'sonne', 'wolken', 'abend', 'nacht'], DAUER = 7000;
    var szene = 'zwielicht', held = document.getElementById('start'), takt = null, angehalten = false;
    var einsicht = document.getElementById('fx-einsicht'), fxZeit = document.getElementById('fx-zeit'), fxMacht = document.getElementById('fx-macht');
    function setzeSzene(n) {
      szene = n; var d = SZ[n];
      if (held) held.dataset.phase = n;
      buehne.querySelectorAll('.fx-chip').forEach(function (el) {
        var z = d[el.dataset.id]; if (!z) return;
        el.querySelector('b').textContent = z[0];
        var kl = el.querySelector('small'); if (!kl.dataset.name) kl.dataset.name = kl.textContent;
        kl.textContent = z[3] || kl.dataset.name;
        el.classList.toggle('aus', !(z[1] > 0));
      });
      if (einsicht) einsicht.textContent = d.text;
      if (fxZeit) fxZeit.textContent = d.zeit;
      if (fxMacht) fxMacht.textContent = d.macht;
      document.querySelectorAll('.fx-tag button').forEach(function (b) {
        var an = b.dataset.szene === n; b.setAttribute('aria-selected', String(an));
        b.classList.remove('lauf'); if (an && !angehalten && !ruhig) { void b.offsetWidth; b.classList.add('lauf'); }
      });
      if (W) aufbauen();
      if (ruhig) zeichnen(performance.now());
    }
    function weiter() { setzeSzene(FOLGE[(FOLGE.indexOf(szene) + 1) % FOLGE.length]); }
    function abspielen() { clearInterval(takt); if (!angehalten && !ruhig) takt = setInterval(function () { if (sichtbar && !document.hidden) weiter(); }, DAUER); }
    document.querySelectorAll('.fx-tag button').forEach(function (b) { b.addEventListener('click', function () {
      // Klick hält den Tag an; ein zweiter Klick auf dieselbe Zeit spielt weiter
      angehalten = !(angehalten && b.dataset.szene === szene);
      setzeSzene(b.dataset.szene); abspielen();
    }); });
    function sprite(farbe) {
      if (sprites[farbe]) return sprites[farbe];
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, '#ffffff'); r.addColorStop(.18, farbe); r.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = r; g.fillRect(0, 0, 64, 64);
      return (sprites[farbe] = c);
    }
    function mitte(el) {
      var a = el.getBoundingClientRect(), b = buehne.getBoundingClientRect();
      return { x: (a.left + a.width / 2 - b.left), y: (a.top + a.height / 2 - b.top) };
    }
    function punkt(b, t) {
      var u = 1 - t;
      return {
        x: u*u*u*b.p0.x + 3*u*u*t*b.p1.x + 3*u*t*t*b.p2.x + t*t*t*b.p3.x,
        y: u*u*u*b.p0.y + 3*u*u*t*b.p1.y + 3*u*t*t*b.p2.y + t*t*t*b.p3.y
      };
    }
    function aufbauen() {
      var r = buehne.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var kern = mitte(buehne.querySelector('[data-knoten="kern"]'));
      bahnen = [];
      buehne.querySelectorAll('.fx-chip:not([data-knoten="info"])').forEach(function (el, i) {
        var m = mitte(el), quelle = el.dataset.knoten === 'quelle';
        var a = quelle ? m : kern, e = quelle ? kern : m;
        // weiche S-Kurve: erst senkrecht, dann waagerecht in den Kern
        var p1 = quelle ? { x: a.x, y: a.y + (e.y - a.y) * .75 } : { x: a.x + (e.x - a.x) * .7, y: a.y };
        var p2 = quelle ? { x: e.x + (a.x - e.x) * .45, y: e.y } : { x: e.x, y: e.y + (a.y - e.y) * .55 };
        var z = (SZ[szene] || {})[el.dataset.id] || [null, 1, 0];
        bahnen.push({ p0: a, p1: p1, p2: p2, p3: e, farbe: el.dataset.farbe || '#5FD4F0', staerke: z[1], rueck: !!z[2], el: el });
      });
      teile = [];
      bahnen.forEach(function (b, bi) {
        if (b.staerke <= 0) return;
        var n = Math.round(14 * b.staerke) + 2;
        for (var k = 0; k < n; k++) teile.push({ b: bi, t: Math.random(), v: .12 + Math.random() * .1, g: (3 + Math.random() * 5) * Math.max(.45, Math.min(1, W / 950)) });
      });
    }
    function zeichnen(zeit) {
      var dt = Math.min(.05, (zeit - letzte) / 1000 || 0); letzte = zeit;
      ctx.clearRect(0, 0, W, H);
      // Leitungen
      ctx.globalCompositeOperation = 'source-over';
      bahnen.forEach(function (b) {
        ctx.beginPath(); ctx.moveTo(b.p0.x, b.p0.y);
        ctx.bezierCurveTo(b.p1.x, b.p1.y, b.p2.x, b.p2.y, b.p3.x, b.p3.y);
        ctx.strokeStyle = b.staerke > 0 ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.035)'; ctx.lineWidth = 1.2; ctx.stroke();
      });
      // Partikel mit Schweif, additiv
      ctx.globalCompositeOperation = 'lighter';
      teile.forEach(function (p) {
        var b = bahnen[p.b]; if (!b) return;
        p.t += p.v * dt; if (p.t > 1) p.t -= 1;
        var sp = sprite(b.farbe);
        for (var s = 0; s < 6; s++) {
          var tt = p.t - s * .012; if (tt < 0) break;
          var q = punkt(b, b.rueck ? 1 - tt : tt), gr = p.g * (1 - s * .14), al = (1 - s / 6) * (b.staerke < 1 ? .5 : 1);
          ctx.globalAlpha = al;
          ctx.drawImage(sp, q.x - gr * 2, q.y - gr * 2, gr * 4, gr * 4);
        }
      });
      ctx.globalAlpha = 1;
      if (!ruhig && sichtbar) requestAnimationFrame(zeichnen);
    }
    function start() { setzeSzene(szene); aufbauen(); abspielen(); letzte = performance.now(); requestAnimationFrame(zeichnen); }
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(aufbauen, 150); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
      var war = sichtbar; sichtbar = e[0].isIntersecting;
      if (sichtbar && !war && !ruhig) { letzte = performance.now(); requestAnimationFrame(zeichnen); }
    }).observe(buehne);
  }

  /* ---------- Zähler im Abschnitt Erfahrung ---------- */
  var zahlen = document.querySelectorAll('[data-zaehl]');
  if (zahlen.length && !ruhig && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (e) {
      e.forEach(function (x) {
        if (!x.isIntersecting) return; io.unobserve(x.target);
        var el = x.target, ziel = +el.dataset.zaehl, t0 = performance.now();
        (function lauf(t) {
          var k = Math.min(1, (t - t0) / 1400), w = 1 - Math.pow(1 - k, 3);
          el.textContent = Math.round(ziel * w).toString();
          if (k < 1) requestAnimationFrame(lauf);
        })(t0);
      });
    }, { threshold: .6 });
    zahlen.forEach(function (z) { z.textContent = '0'; io.observe(z); });
  }
})();

/* ---------- Faltbares Handy: klappt auf, sobald es sichtbar ist; App läuft live im iframe ---------- */
(function () {
  var f = document.getElementById('fold'); if (!f) return;
  var innen = f.querySelector('.fold-innen'), knopf = document.getElementById('fold-knopf'), uhr = f.querySelector('.fold-uhr');
  function mass() {
    var w = innen.clientWidth, h = innen.clientHeight; if (!w) return;
    var s = w / 760; innen.style.setProperty('--s', s); innen.style.setProperty('--ih', Math.ceil(h / s + 40) + 'px');
  }
  function setze(auf) { f.classList.toggle('auf', auf); f.classList.toggle('zu', !auf); if (knopf) knopf.textContent = auf ? 'Zuklappen' : 'Aufklappen'; }
  function zeit() { var d = new Date(); if (uhr) uhr.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  zeit(); setInterval(zeit, 15000);
  mass(); addEventListener('resize', mass); addEventListener('load', mass);
  if (knopf) knopf.addEventListener('click', function () { setze(!f.classList.contains('auf')); });
  f.querySelector('.fold-klappe').addEventListener('click', function () { setze(true); });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { setze(true); return; }
  var io = new IntersectionObserver(function (e) {
    if (e[0].isIntersecting) { io.disconnect(); setTimeout(function () { setze(true); }, 500); }
  }, { threshold: .55 });
  io.observe(f);
})();

/* ---------- Handy-iframe skalieren + VOLTHERM Zifferblatt mit echter Zeit ---------- */
(function () {
  var scr = document.querySelector('.uw-scr');
  function mass() { if (!scr || !scr.clientWidth) return; var s = scr.clientWidth / 420; scr.style.setProperty('--s', s); scr.style.setProperty('--ih', Math.ceil(scr.clientHeight / s + 40) + 'px'); }
  mass(); addEventListener('resize', mass); addEventListener('load', mass);

  var uhr = document.getElementById('uhr'); if (!uhr) return;
  var $ = function (id) { return document.getElementById(id); };
  var std = $('uhr-std'), min = $('uhr-min'), sek = $('uhr-sek'), zeit = $('uhr-zeit'), datum = $('uhr-datum');
  var TAGE = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'], MON = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'];
  var striche = uhr.querySelectorAll('#uhr-striche .q'), ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Quelle je nach Tageszeit: Sonne gelb, Speicher grün, Netz rot (wie auf der Uhr)
  function quelle(h) { return h >= 8 && h < 17 ? '#FFC24D' : (h >= 17 && h < 23 ? '#3DDC84' : '#FF5A4E'); }
  function tick() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes(), s = d.getSeconds() + d.getMilliseconds() / 1000;
    sek.style.transform = 'rotate(' + (s * 6) + 'deg)';
    min.style.transform = 'rotate(' + (m * 6 + s / 10) + 'deg)';
    std.style.transform = 'rotate(' + ((h % 12) * 30 + m / 2) + 'deg)';
    zeit.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    datum.textContent = TAGE[d.getDay()] + ', ' + d.getDate() + '. ' + MON[d.getMonth()];
    // Werte passend zur Tageszeit, leicht schwankend
    var t = d.getTime() / 1000, sonnenhoehe = Math.max(0, Math.sin((h + m / 60 - 7) / 11 * Math.PI));
    var kw = sonnenhoehe * 7.4 + (sonnenhoehe > 0 ? Math.sin(t / 9) * .25 : 0);
    $('uhr-sonne').textContent = kw.toFixed(1).replace('.', ',');
    $('uhr-sonne-ring').setAttribute('stroke-dasharray', (kw / 10 * 146).toFixed(1) + ' 195');
    var sp = Math.round(Math.min(98, 40 + sonnenhoehe * 50 + Math.sin(t / 60) * 2));
    $('uhr-sp').textContent = sp; $('uhr-sp-ring').setAttribute('stroke-dasharray', (sp / 100 * 146).toFixed(1) + ' 195');
    var netz = kw > 1.6 ? 'Netz ↑ ' + (kw - 1.4).toFixed(1).replace('.', ',') + ' kW' : 'Netz ↓ 0,' + (2 + (d.getSeconds() % 5)) + ' kW';
    $('uhr-netz').textContent = netz; $('uhr-netz').setAttribute('fill', kw > 1.6 ? '#3DDC84' : '#FF8A7A');
    var farbe = quelle(h); striche.forEach(function (l, i) { l.style.stroke = farbe; });
    if (!ruhig) requestAnimationFrame(tick);
  }
  if (ruhig) { tick(); setInterval(tick, 1000); } else requestAnimationFrame(tick);
})();

/* Echte Gerätefotos: der laufende Bildschirm wird per Perspektive genau auf das Display im Foto gelegt */
(function () {
  var boxen = document.querySelectorAll('.ft');
  if (!boxen.length) return;
  // Rechteck (0,0)-(w,h) auf Viereck p0 (oben links), p1 (oben rechts), p2 (unten links), p3 (unten rechts)
  function matrix(w, h, p) {
    var x0 = p[0][0], y0 = p[0][1], x1 = p[1][0], y1 = p[1][1], x2 = p[2][0], y2 = p[2][1], x3 = p[3][0], y3 = p[3][1];
    var dx1 = x1 - x3, dy1 = y1 - y3, dx2 = x2 - x3, dy2 = y2 - y3, sx = x0 - x1 + x3 - x2, sy = y0 - y1 + y3 - y2;
    var det = dx1 * dy2 - dx2 * dy1;
    var g = (sx * dy2 - dx2 * sy) / det, hh = (dx1 * sy - sx * dy1) / det;
    var a = x1 - x0 + g * x1, b = x2 - x0 + hh * x2, c = x0;
    var d = y1 - y0 + g * y1, e = y2 - y0 + hh * y2, f = y0;
    a /= w; d /= w; g /= w; b /= h; e /= h; hh /= h;
    return 'matrix3d(' + [a, d, 0, g, b, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1].map(function (v) { return +v.toFixed(8); }).join(',') + ')';
  }
  function setze(box) {
    var scr = box.querySelector('.ft-scr'), img = box.querySelector('img');
    var bild = box.dataset.bild.split('x').map(Number), w = +box.dataset.w, h = +box.dataset.h;
    var k = img.clientWidth / bild[0];
    if (!k) return;
    var p = box.dataset.quad.split(' ').map(function (q) { return q.split(',').map(function (v) { return +v * k; }); });
    scr.style.width = w + 'px'; scr.style.height = h + 'px';
    scr.style.transform = matrix(w, h, p);
  }
  function alle() { boxen.forEach(setze); }
  alle();
  window.addEventListener('load', alle);
  if ('ResizeObserver' in window) { var ro = new ResizeObserver(alle); boxen.forEach(function (b) { ro.observe(b); }); }
  else window.addEventListener('resize', alle);
})();

