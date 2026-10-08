// VOLTHERM – pagina de prezentare. Fără biblioteci, fără trackere.

// ================= DATE DE CONTACT (de completat!) =================
// Datele firmei nu sunt încă finale: înlocuiți valorile de mai jos, restul paginii se adaptează singur.
const KONTAKT = {
  FIRMA: "VOLTHERM Integrated Solutions",
  TEL: "+49 1556 8656548",          // format internațional, cu spații permise
  WHATSAPP: "4915568656548",        // doar cifre, fără + și fără 0 la început (pentru wa.me)
  EMAIL: "office@voltherm.de",
};
// ====================================================================

(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const de = (n, d = 0) => n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });

  // ---------- Iconițe desenate (linii, 48×48) ----------
  const ICONS = {
    sun: "M24 16a8 8 0 1 0 0.01 0Z M24 4v6 M24 38v6 M4 24h6 M38 24h6 M10 10l4 4 M34 34l4 4 M38 10l-4 4 M10 38l4-4",
    panel: "M6 34 L14 16 H42 L34 34 Z M10 25 H38 M21 16 L16 34 M31 16 L26 34 M24 34 V42 M16 43 H32",
    house: "M7 23 L24 8 L41 23 M12 19 V40 H36 V19 M20 40 V29 H28 V40",
    pylon: "M24 4 L13 44 M24 4 L35 44 M11 14 H37 M15 25 H33 M15 14 L33 25 M33 14 L15 25 M17 35 H31",
    meter: "M14 5 H34 Q38 5 38 9 V39 Q38 43 34 43 H14 Q10 43 10 39 V9 Q10 5 14 5 Z M15 11 H33 V21 H15 Z M19 16 h2 M24 16 h2 M29 16 h0.5 M20 32 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M24 30 l2 -2",
    battery: "M8 13 H37 V37 H8 Z M37 20 H41 V30 H37 M24 17 L18 26 H26 L21 34",
    cockpit: "M6 30 a18 18 0 0 1 36 0 M24 30 L32 18 M10 30 H14 M34 30 H38 M24 12 V16 M13 18 l3 3 M35 18 l-3 3 M6 38 H42",
    car: "M5 32 V25 L11 17 H32 L39 25 H43 V32 H38 M18 32 H29 M10 32 H5 M10 32 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M29 32 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M14 17 L12 25 H38",
    clock: "M24 6a18 18 0 1 0 0.01 0Z M24 13 V24 L31 29",
    drop: "M24 5 C24 5 11 21 11 30 A13 13 0 0 0 37 30 C37 21 24 5 24 5 Z M18 31 a6 6 0 0 0 6 6",
    phone: "M15 4 H33 Q36 4 36 7 V41 Q36 44 33 44 H15 Q12 44 12 41 V7 Q12 4 15 4 Z M21 39 h6 M17 12 H31 M17 18 H27 M17 24 H31",
    voice: "M7 19 H14 L23 11 V37 L14 29 H7 Z M29 18 Q33 24 29 30 M34 13 Q42 24 34 35",
    shield: "M24 5 L40 11 V22 C40 32 33 40 24 43 C15 40 8 32 8 22 V11 Z M17 24 L22 29 L31 19",
    plug: "M13 6 H29 V40 H13 Z M17 12 H25 V18 H17 Z M18 28 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M29 30 C37 30 40 35 40 44",
    heatpump: "M6 12 H42 V38 H6 Z M12 25 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M20 17 V33 M12 25 H28 M34 18 V32 M38 18 V32",
    call: "M14 6 L20 6 L23 15 L18 18 C20 24 24 28 30 30 L33 25 L42 28 L42 34 C42 38 38 42 34 42 C18 41 7 30 6 14 C6 10 10 6 14 6 Z",
    chat: "M24 6 C13 6 6 13 6 22 C6 27 8 31 12 34 L10 42 L19 38 C21 38.6 22.5 39 24 39 C35 39 42 31 42 22 C42 13 35 6 24 6 Z M17 22 h0.5 M24 22 h0.5 M31 22 h0.5",
    mail: "M6 12 H42 V37 H6 Z M6 13 L24 27 L42 13",
  };
  for (const svg of $$("svg[data-i]")) {
    const d = ICONS[svg.dataset.i];
    if (!d) continue;
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = `<path d="${d}" pathLength="1"/>`;
  }

  // ---------- Apariție la derulare ----------
  const sichtbar = (el) => el.classList.add("sicht");
  const zuBeobachten = $$(".reveal, mark.hl, .price-fig, .donut-fig");
  if (ruhig || !("IntersectionObserver" in window)) zuBeobachten.forEach(sichtbar);
  else {
    const io = new IntersectionObserver((ein) => {
      for (const e of ein) if (e.isIntersecting) { sichtbar(e.target); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    zuBeobachten.forEach((el) => io.observe(el));
  }

  // ---------- Capitolul 1: curba prețului (exemplu, simplificat) ----------
  // Puncte (oră, ct/kWh). Minimul 15 ct la 12:45 și vârful 103 ct la 19:45 sunt din exemplul real; restul e formă.
  const PREISE = [[0, 32], [2, 29], [4, 29], [6, 36], [7.5, 46], [9, 36], [10.5, 23], [12, 16.5], [12.75, 15], [14, 17], [15.5, 24], [17, 40],
    [18.3, 70], [19.2, 95], [19.75, 103], [20.4, 88], [21.3, 58], [22.5, 40], [24, 33]];
  const X0 = 30, X1 = 346, Y0 = 196, Y1 = 22, PMAX = 110;
  const px = (h) => X0 + (h / 24) * (X1 - X0);
  const py = (p) => Y0 - (p / PMAX) * (Y0 - Y1);
  const pts = PREISE.map(([h, p]) => [px(h), py(p)]);
  // Catmull-Rom → Bézier, ca linia să pară trasă cu mâna.
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1.map((v) => v.toFixed(1)).join(" ")} ${c2.map((v) => v.toFixed(1)).join(" ")} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  $("#kurve").setAttribute("d", d);
  $("#kurve-flaeche").setAttribute("d", `${d} L${X1} ${Y0} L${X0} ${Y0} Z`);
  const ticks = $(".ticks");
  let t = "";
  for (const h of [0, 6, 12, 18, 24]) t += `<text x="${px(h)}" y="${Y0 + 16}" text-anchor="middle">${String(h).padStart(2, "0")}:00</text>`;
  for (const p of [25, 50, 75, 100]) t += `<path d="M${X0} ${py(p)} H${X1}"/><text x="${X0 - 5}" y="${py(p) + 3.5}" text-anchor="end">${p}</text>`;
  t += `<text x="${X0 + 6}" y="${Y1 - 4}" text-anchor="start">ct/kWh</text>`;
  ticks.innerHTML = t;
  $(".pin-low").setAttribute("transform", `translate(${px(12.75)} ${py(15)})`);
  $(".pin-high").setAttribute("transform", `translate(${px(19.75)} ${py(103)})`);
  // Surferul alunecă pe valul prețului cât timp graficul e pe ecran.
  const kurve = $("#kurve"), surfer = $("#surfer");
  const lang = kurve.getTotalLength();
  const surfAn = (f) => {
    const a = kurve.getPointAtLength(f * lang), b = kurve.getPointAtLength(Math.min(lang, f * lang + 2));
    const w = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    surfer.setAttribute("transform", `translate(${a.x.toFixed(1)} ${(a.y - 2).toFixed(1)}) rotate(${w.toFixed(1)})`);
  };
  surfAn(0.47);
  if (!ruhig) {
    let laeuft = false, start = 0;
    const schritt = (zeit) => {
      if (!laeuft) return;
      if (!start) start = zeit;
      surfAn((((zeit - start) / 14000) + 0.47) % 1);
      requestAnimationFrame(schritt);
    };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !laeuft) { laeuft = true; start = 0; setTimeout(() => requestAnimationFrame(schritt), 2600); }
      else if (!e.isIntersecting) laeuft = false;
    }).observe($("#preiskurve"));
  }

  // ---------- Capitolul 2: cockpit cu valori de exemplu care „respiră” ----------
  if (!ruhig) {
    const zahlen = $$("#cockpit b");
    setInterval(() => {
      const pv = 6.4 + (Math.random() - 0.5) * 0.6, haus = 5.0 + (Math.random() - 0.5) * 0.4;
      const werte = [pv, haus, Math.max(0, pv - haus)];
      zahlen.forEach((b, i) => { b.textContent = de(werte[i], 1); });
    }, 2200);
  }

  // ---------- Capitolul 3: o zi cu VOLTHERM ----------
  const PHASEN = {
    morgen: { zeit: "07:00", preis: "Preis: mittel", sprech: "" },
    mittag: { zeit: "12:45", preis: "Preis: niedrig", sprech: "„Das Auto lädt mit Sonne.“" },
    nachmittag: { zeit: "15:30", preis: "Preis: niedrig", sprech: "„Warmwasser ist fertig.“" },
    abend: { zeit: "19:45", preis: "Preis: sehr hoch", sprech: "" },
    nacht: { zeit: "02:00", preis: "Preis: am günstigsten", sprech: "Laden: günstigste Stunden" },
  };
  const szene = $(".scene");
  const setzePhase = (ph) => {
    if (!PHASEN[ph] || szene.dataset.phase === ph && szene.dataset.init) return;
    szene.dataset.phase = ph;
    szene.dataset.init = "1";
    $(".hud-zeit").textContent = PHASEN[ph].zeit;
    $(".hud-preis").textContent = PHASEN[ph].preis;
    $(".bubble-t").textContent = PHASEN[ph].sprech;
    $$(".step").forEach((s) => s.classList.toggle("aktiv", s.dataset.phase === ph));
  };
  setzePhase("morgen");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((ein) => {
      for (const e of ein) if (e.isIntersecting) setzePhase(e.target.dataset.phase);
    }, { rootMargin: "-42% 0px -42% 0px" });
    $$(".step").forEach((s) => io.observe(s));
  }

  // ---------- Ein System statt fünf Apps ----------
  const buehne = $("#apps-stage");
  const zielSetzen = () => {
    const r = buehne.getBoundingClientRect();
    for (const k of $$(".tile", buehne)) {
      const q = k.getBoundingClientRect();
      const tx = r.left + r.width / 2 - (q.left + q.width / 2), ty = r.top + r.height / 2 - (q.top + q.height / 2);
      k.style.setProperty("--tx", `${Math.round(tx)}px`);
      k.style.setProperty("--ty", `${Math.round(ty)}px`);
    }
  };
  if (ruhig) { zielSetzen(); buehne.classList.add("sammeln"); }
  else {
    let uhr = 0;
    new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= 0.6 && !buehne.classList.contains("sammeln")) {
        zielSetzen();
        clearTimeout(uhr);
        uhr = setTimeout(() => buehne.classList.add("sammeln"), 700);
      } else if (!e.isIntersecting) { clearTimeout(uhr); buehne.classList.remove("sammeln"); }
    }, { threshold: [0, 0.6] }).observe(buehne);
  }

  // ---------- Demo: iframe încărcat abia când se apropie ----------
  const rahmen = $("#demo-frame");
  // Aplicația e gândită pentru telefoane de ~390 px (sub 385 px antetul ei iese cu 2 px); în rama mai mică o desenăm la 390 px și o micșorăm.
  const skalieren = () => {
    const ecran = rahmen.parentElement, w = ecran.clientWidth, h = ecran.clientHeight - 30;
    const f = Math.min(1, w / 390);
    rahmen.style.width = `${w / f}px`;
    rahmen.style.height = `${h / f}px`;
    rahmen.style.transform = f < 1 ? `scale(${f})` : "";
  };
  skalieren();
  window.addEventListener("resize", skalieren);
  const laden = () => {
    if (rahmen.src) return;
    rahmen.addEventListener("load", () => setTimeout(() => $("#phone-load").classList.add("weg"), 250), { once: true });
    rahmen.src = rahmen.dataset.src;
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { laden(); io.disconnect(); } }, { rootMargin: "800px 0px" });
    io.observe(rahmen);
  } else laden();

  // ---------- Calculator: estimare grosieră, transparentă ----------
  // Ipotezele sunt aceleași ca în <details class="annahmen"> din pagină; dacă se schimbă aici, se schimbă și acolo.
  const A = {
    ertragKwp: 950, kwhPro100km: 18, direkt: 0.30, zyklen: 250, batEta: 0.9, batNacht: 0.8,
    evSonneOhne: 0.25, evSonneMit: 0.60, ueberschussFuerAuto: 0.5, flexAnteil: 0.10, flexPlus: 0.40, nachtVorteilCt: 5,
  };
  // Profilul lunar al producției PV în Germania (aprox., procente din an).
  const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const PV_PROFIL = [3, 5, 8, 11, 13, 13, 13, 11, 9, 6, 4, 3];

  function rechnen(e) {
    const verbrauch = Math.max(0, e.verbrauch), erzeugt = Math.max(0, e.kwp) * A.ertragKwp;
    const auto = (Math.max(0, e.km) * A.kwhPro100km) / 100;
    const preis = Math.max(0, e.preis) / 100, verg = Math.max(0, e.verg) / 100;
    const bedarf = verbrauch + auto;

    const direkt = Math.min(verbrauch * A.direkt, erzeugt);
    const batAus = Math.min(Math.max(0, e.bat) * A.zyklen * A.batEta, (verbrauch - direkt) * A.batNacht, (erzeugt - direkt) * A.batEta);
    const batEin = batAus / A.batEta;
    const rest = Math.max(0, erzeugt - direkt - batEin);  // surplus după casă și baterie

    const evOhne = Math.min(auto * A.evSonneOhne, rest * A.ueberschussFuerAuto);
    const evMit = Math.min(auto * A.evSonneMit, rest * A.ueberschussFuerAuto);
    const flexMit = Math.min(verbrauch * A.flexAnteil * A.flexPlus, Math.max(0, rest - evMit));

    const szenario = (evSonne, flex, nachtVorteil) => {
      const eigen = direkt + batAus + evSonne + flex;
      const bezug = Math.max(0, bedarf - eigen);
      const einspeisung = Math.max(0, erzeugt - direkt - batEin - evSonne - flex);
      const kosten = bezug * preis - einspeisung * verg - (nachtVorteil ? (auto - evSonne) * (A.nachtVorteilCt / 100) : 0);
      return {
        kosten,
        eigenverbrauch: erzeugt > 0 ? (erzeugt - einspeisung) / erzeugt : 0,
        autarkie: bedarf > 0 ? eigen / bedarf : 0,
      };
    };
    const ohne = szenario(evOhne, 0, false), mit = szenario(evMit, flexMit, true);
    return { ohnePv: bedarf * preis, ohne, mit, spar: Math.max(0, ohne.kosten - mit.kosten), erzeugt };
  }

  const form = $("#calc-form");
  const mbars = $("#mbars");
  mbars.innerHTML = MONATE.map(() => "<div><span></span><i></i></div>").join("");
  mbars.insertAdjacentHTML("afterend", `<div class="mlabels">${MONATE.map((m) => `<span>${m}</span>`).join("")}</div>`);
  const euro = (v) => `${v < 0 ? "−" : ""}${de(Math.abs(Math.round(v / 10) * 10))} €`;
  const pct = (v) => `${Math.round(v * 100)} %`;

  function zeigen() {
    const f = new FormData(form);
    const zahl = (k) => { const v = parseFloat(String(f.get(k)).replace(",", ".")); return Number.isFinite(v) ? v : 0; };
    const r = rechnen({ verbrauch: zahl("verbrauch"), kwp: zahl("kwp"), bat: zahl("bat"), km: zahl("km"), preis: zahl("preis"), verg: zahl("verg") });
    $("#r-spar").textContent = `ca. ${de(Math.round(r.spar / 10) * 10)} €`;
    $("#r-ev").textContent = `${pct(r.ohne.eigenverbrauch)} → ${pct(r.mit.eigenverbrauch)}`;
    $("#r-au").textContent = `${pct(r.ohne.autarkie)} → ${pct(r.mit.autarkie)}`;
    $("#b-ev-ohne").style.width = pct(r.ohne.eigenverbrauch).replace(" ", "");
    $("#b-ev-mit").style.width = pct(r.mit.eigenverbrauch).replace(" ", "");
    $("#b-au-ohne").style.width = pct(r.ohne.autarkie).replace(" ", "");
    $("#b-au-mit").style.width = pct(r.mit.autarkie).replace(" ", "");
    $("#r-k0").textContent = euro(r.ohnePv);
    $("#r-k1").textContent = euro(r.ohne.kosten);
    $("#r-k2").textContent = euro(r.mit.kosten);
    // Prognoza lunară: economia anuală împărțită după profilul soarelui (ilustrativ).
    const summe = PV_PROFIL.reduce((a, b) => a + b, 0);
    const proMonat = PV_PROFIL.map((p) => (r.spar * p) / summe);
    const max = Math.max(1, ...proMonat);
    $$("div", mbars).forEach((el, i) => {
      $("i", el).style.height = `${Math.round((proMonat[i] / max) * 92)}px`;
      $("span", el).textContent = `${Math.round(proMonat[i])}`;
    });
    $("#mbars").setAttribute("aria-label", `Geschätzte Mehr-Ersparnis pro Monat in Euro: ${MONATE.map((m, i) => `${m} ${Math.round(proMonat[i])}`).join(", ")}`);
  }
  form.addEventListener("input", zeigen);
  zeigen();

  // ---------- Narațiune audio (germană), opțională ----------
  // Fișierele sunt docs/audio/<id>.mp3, generate din docs/audio/sprechtext.md cu app/scripts/sprache-bauen.py.
  // „Mit Ton erleben” pornește modul automat: se aude clipul secțiunii (sau al fazei zilei) din mijlocul ecranului.
  // Butoanele „Anhören” redau doar partea lor. Nimic nu se descarcă înainte de primul clic (preload=none, un clip o dată).
  (() => {
    const schalter = $("#ton-an"), dock = $("#ton-dock"), knoepfe = $$(".hoer[data-clip]");
    if (!schalter || !dock || typeof Audio === "undefined") return;
    // Un singur element audio, refolosit: după primul clic (gestul utilizatorului) browserele îl lasă să pornească și singur.
    const audio = new Audio();
    audio.preload = "none";
    let an = false;            // modul automat pornit?
    let clip = null;           // id-ul clipului încărcat acum
    let aktiv = "frage";       // secțiunea din mijlocul ecranului
    let warte = 0, raf = 0, weiterNachSichtbar = false;
    const gehoert = new Set(); // clipuri ascultate până la capăt (nu le repornim automat)
    const stelle = new Map();  // unde a fost întrerupt un clip, ca să continue de acolo

    [schalter.closest(".ton-box"), dock, ...knoepfe].forEach((el) => el && el.removeAttribute("hidden"));

    const fortschritt = () => {
      const p = clip && audio.duration ? Math.min(1, audio.currentTime / audio.duration) : 0;
      for (const k of knoepfe) k.style.setProperty("--p", k.dataset.clip === clip ? p.toFixed(4) : "0");
      dock.style.setProperty("--p", p.toFixed(4));
      raf = audio.paused ? 0 : requestAnimationFrame(fortschritt);
    };
    const zeigen = () => {
      const laeuft = !audio.paused && !audio.ended;
      for (const k of knoepfe) {
        const dieser = laeuft && k.dataset.clip === clip;
        k.classList.toggle("spielt", dieser);
        $(".hoer-t", k).textContent = dieser ? "Stopp" : "Anhören";
        k.setAttribute("aria-label", dieser ? "Wiedergabe stoppen" : "Diesen Abschnitt anhören");
      }
      for (const b of [schalter, dock]) b.setAttribute("aria-pressed", String(an));
      if (!raf) fortschritt();
    };
    const fehler = (err) => {
      if (err && err.name === "AbortError") return;   // alt clip l-a înlocuit între timp: normal
      // Browserul a blocat redarea (fără gest) sau fișierul lipsește: oprim modul automat, fără erori pe ecran.
      if (err && err.name === "NotAllowedError") an = false;
      zeigen();
    };
    const spiele = (id, vonVorn = false) => {
      clearTimeout(warte);
      if (clip !== id) {
        if (clip && !audio.ended && audio.currentTime > 0) stelle.set(clip, audio.currentTime);
        clip = id;
        audio.src = `audio/${id}.mp3`;
        audio.currentTime = vonVorn ? 0 : Math.max(0, (stelle.get(id) || 0) - 1);
      } else if (vonVorn || audio.ended) audio.currentTime = 0;
      stelle.delete(id);
      const p = audio.play();
      if (p && p.catch) p.catch(fehler);
      zeigen();
    };
    const anhalten = () => { clearTimeout(warte); if (!audio.paused) audio.pause(); };

    // Schimbarea secțiunii: așteptăm puțin, ca la derulare rapidă să nu pornească zece clipuri unul după altul.
    const wechsel = (id) => {
      aktiv = id;
      if (!an || document.hidden) return;
      clearTimeout(warte);
      if (id === clip && !audio.paused) return;          // același clip rulează deja
      warte = setTimeout(() => {
        if (!an || aktiv !== id) return;
        if (gehoert.has(id)) { anhalten(); return; }     // deja ascultat: doar oprim clipul vechi
        spiele(id);
      }, 450);
    };

    audio.addEventListener("play", () => { zeigen(); if (!raf) raf = requestAnimationFrame(fortschritt); });
    audio.addEventListener("pause", zeigen);
    audio.addEventListener("ended", () => { gehoert.add(clip); stelle.delete(clip); zeigen(); });
    audio.addEventListener("error", () => { if (clip) gehoert.add(clip); zeigen(); });

    const umschalten = () => {
      an = !an;
      if (an) { gehoert.clear(); spiele(aktiv); }        // clicul e gestul care deblochează sunetul
      else anhalten();
      zeigen();
    };
    schalter.addEventListener("click", umschalten);
    dock.addEventListener("click", umschalten);
    for (const k of knoepfe) {
      k.addEventListener("click", () => {
        const id = k.dataset.clip;
        if (clip === id && !audio.paused) anhalten();
        else spiele(id, true);
      });
    }

    // Tab ascuns → pauză; la revenire continuă doar dacă rula înainte.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { weiterNachSichtbar = !audio.paused; anhalten(); }
      else if (weiterNachSichtbar) {
        weiterNachSichtbar = false;
        const p = audio.play();
        if (p && p.catch) p.catch(fehler);
      }
    });

    // Ce element „vorbește” pentru ce clip. În capitolul 3 introducerea și fiecare fază a zilei au clipul lor.
    const ziele = [[$(".hero"), "frage"], [$("#frage"), "frage"], [$("#kapitel-1"), "kapitel-1"], [$("#kapitel-2"), "kapitel-2"],
      [$("#kapitel-3 > .wrap"), "kapitel-3"], ...$$(".step").map((s) => [s, s.dataset.phase]),
      [$("#kapitel-4"), "kapitel-4"], [$("#demo"), "demo"], [$("#apps"), "apps"], [$("#vorteile"), "vorteile"], [$("#ki"), "ki"], [$("#kontakt"), "kontakt"]]
      .filter(([el]) => el);
    const zielId = new Map(ziele);
    if ("IntersectionObserver" in window) {
      // Banda din mijlocul ecranului (aceeași ca pentru fazele zilei): ce intră în ea devine secțiunea principală.
      const io = new IntersectionObserver((ein) => {
        for (const e of ein) if (e.isIntersecting) wechsel(zielId.get(e.target));
      }, { rootMargin: "-42% 0px -42% 0px" });
      ziele.forEach(([el]) => io.observe(el));
      // Comutatorul mic din colț apare când cel din antet a ieșit din ecran.
      new IntersectionObserver(([e]) => dock.classList.toggle("zeigen", !e.isIntersecting)).observe(schalter);
    } else dock.classList.add("zeigen");
    zeigen();
  })();

  // ---------- Contact ----------
  const tel = KONTAKT.TEL.replace(/[^\d+]/g, "");
  $("#c-tel").href = `tel:${tel}`;
  $("#c-wa").href = `https://wa.me/${KONTAKT.WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent("Hallo, ich interessiere mich für VOLTHERM.")}`;
  $("#c-mail").href = `mailto:${KONTAKT.EMAIL}?subject=${encodeURIComponent("Anfrage VOLTHERM")}`;
  // Eingebettet (Präsentation in der VOLTHERM-App / im Home-Bildschirm): Anruf und E-Mail im obersten Fenster öffnen,
  // denn ein mailto:/tel: im iframe bleibt dort hängen und es passiert nichts. Dazu der QR-Code zum Weitergeben.
  let eingebettet = true;
  try { eingebettet = window.top !== window.self; } catch (_) {}
  if (eingebettet) {
    $("#c-tel").target = "_top";
    $("#c-mail").target = "_top";
    $("#c-qr").hidden = false;
  }
  $("#c-firma").textContent = `${KONTAKT.FIRMA} · ${KONTAKT.TEL} · ${KONTAKT.EMAIL}`;
})();
