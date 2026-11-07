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
      buehne.querySelectorAll('.fx-chip').forEach(function (el, i) {
        var m = mitte(el), quelle = el.dataset.knoten === 'quelle';
        var a = quelle ? m : kern, e = quelle ? kern : m;
        // weiche S-Kurve: erst senkrecht, dann waagerecht in den Kern
        var p1 = quelle ? { x: a.x, y: a.y + (e.y - a.y) * .75 } : { x: a.x + (e.x - a.x) * .7, y: a.y };
        var p2 = quelle ? { x: e.x + (a.x - e.x) * .45, y: e.y } : { x: e.x, y: e.y + (a.y - e.y) * .55 };
        var staerke = el.textContent.indexOf('0,2 kW') > -1 ? .15 : 1;
        bahnen.push({ p0: a, p1: p1, p2: p2, p3: e, farbe: el.dataset.farbe || '#5FD4F0', staerke: staerke, el: el });
      });
      teile = [];
      bahnen.forEach(function (b, bi) {
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
        ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1.2; ctx.stroke();
      });
      // Partikel mit Schweif, additiv
      ctx.globalCompositeOperation = 'lighter';
      teile.forEach(function (p) {
        var b = bahnen[p.b]; if (!b) return;
        p.t += p.v * dt; if (p.t > 1) p.t -= 1;
        var sp = sprite(b.farbe);
        for (var s = 0; s < 6; s++) {
          var tt = p.t - s * .012; if (tt < 0) break;
          var q = punkt(b, tt), gr = p.g * (1 - s * .14), al = (1 - s / 6) * (b.staerke < 1 ? .5 : 1);
          ctx.globalAlpha = al;
          ctx.drawImage(sp, q.x - gr * 2, q.y - gr * 2, gr * 4, gr * 4);
        }
      });
      ctx.globalAlpha = 1;
      if (!ruhig && sichtbar) requestAnimationFrame(zeichnen);
    }
    function start() { aufbauen(); letzte = performance.now(); requestAnimationFrame(zeichnen); }
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
