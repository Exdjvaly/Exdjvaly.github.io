// VOLTHERM Chat-Assistent: Knopf unten rechts, Gespräch über /api/chat (Claude).
// Der Verlauf bleibt nur in diesem Browser-Tab (sessionStorage), auf dem Server wird nichts gespeichert.
(function () {
  var SPEICHER = 'voltherm-chat';
  var BEGRUESSUNG = 'Hallo! Ich bin der digitale Assistent von VOLTHERM. Fragen Sie mich gern zu Photovoltaik, Speicher, Wallbox, Wärmepumpe, Klimaanlage, Smart Home oder Elektroinstallation. Wenn Sie möchten, nehme ich auch gleich Ihre Anfrage auf.';
  var VORSCHLAEGE = ['Lohnt sich ein Speicher für mich?', 'Was kostet eine PV-Anlage?', 'Klimaanlage fürs Schlafzimmer', 'Wie funktioniert VOLTHERM?'];

  var zustand = { verlauf: [], gesendet: false };
  try { var alt = JSON.parse(sessionStorage.getItem(SPEICHER) || 'null'); if (alt && Array.isArray(alt.verlauf)) zustand = alt; } catch (e) {}
  var merken = function () { try { sessionStorage.setItem(SPEICHER, JSON.stringify(zustand)); } catch (e) {} };

  var el = function (tag, klasse, text) { var e = document.createElement(tag); if (klasse) e.className = klasse; if (text) e.textContent = text; return e; };

  var knopf = el('button', 'vc-knopf');
  knopf.type = 'button';
  knopf.setAttribute('aria-expanded', 'false');
  knopf.setAttribute('aria-controls', 'vc-fenster');
  knopf.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4Z M8 9.5h8 M8 12.5h5"/></svg><span>Fragen? Chat</span>';

  var fenster = el('section', 'vc-fenster');
  fenster.id = 'vc-fenster';
  fenster.hidden = true;
  fenster.setAttribute('aria-label', 'Chat mit dem VOLTHERM Assistenten');
  fenster.innerHTML =
    '<header class="vc-kopf"><svg viewBox="0 0 300 300" aria-hidden="true"><use href="#logo"/></svg>' +
    '<div><b>VOLTHERM Assistent</b><small>KI-Assistent · antwortet sofort</small></div>' +
    '<button type="button" class="vc-zu" aria-label="Chat schließen">✕</button></header>' +
    '<div class="vc-liste" role="log" aria-live="polite"></div>' +
    '<div class="vc-chips"></div>' +
    '<form class="vc-eingabe"><label class="sr" for="vc-text">Ihre Nachricht</label>' +
    '<textarea id="vc-text" rows="1" maxlength="1200" placeholder="Ihre Frage …" autocomplete="off"></textarea>' +
    '<button type="submit" aria-label="Senden"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-send"/></svg></button></form>' +
    '<p class="vc-hinweis">KI-Antworten können Fehler enthalten und sind unverbindlich. Ihre Nachrichten werden zur Beantwortung an Anthropic (USA) übermittelt, bitte keine sensiblen Daten. <a href="datenschutz.html#chat">Datenschutz</a></p>';

  document.body.appendChild(fenster);
  document.body.appendChild(knopf);

  var liste = fenster.querySelector('.vc-liste'), chips = fenster.querySelector('.vc-chips');
  var form = fenster.querySelector('form'), feld = fenster.querySelector('textarea'), senden = form.querySelector('button');
  var laeuft = false;

  var blase = function (rolle, text) {
    var b = el('div', 'vc-msg ' + (rolle === 'user' ? 'vc-ich' : 'vc-bot'), text);
    liste.appendChild(b);
    liste.scrollTop = liste.scrollHeight;
    return b;
  };
  var aufbauen = function () {
    liste.textContent = '';
    blase('assistant', BEGRUESSUNG);
    zustand.verlauf.forEach(function (n) { blase(n.role, n.content); });
    chips.textContent = '';
    chips.hidden = zustand.verlauf.length > 0;
    VORSCHLAEGE.forEach(function (v) {
      var c = el('button', 'vc-chip', v); c.type = 'button';
      c.addEventListener('click', function () { feld.value = v; fragen(); });
      chips.appendChild(c);
    });
  };

  var oeffnen = function (auf) {
    fenster.hidden = !auf;
    knopf.setAttribute('aria-expanded', auf ? 'true' : 'false');
    document.documentElement.classList.toggle('vc-offen', auf);
    if (auf) { liste.scrollTop = liste.scrollHeight; feld.focus(); }
  };
  knopf.addEventListener('click', function () { oeffnen(fenster.hidden); });
  fenster.querySelector('.vc-zu').addEventListener('click', function () { oeffnen(false); knopf.focus(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !fenster.hidden) { oeffnen(false); knopf.focus(); } });
  // Links wie <a href="#chat"> öffnen den Chat
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#chat"]');
    if (a) { e.preventDefault(); oeffnen(true); }
  });

  feld.addEventListener('input', function () { feld.style.height = 'auto'; feld.style.height = Math.min(feld.scrollHeight, 120) + 'px'; });
  feld.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fragen(); } });
  form.addEventListener('submit', function (e) { e.preventDefault(); fragen(); });

  function fragen() {
    var text = feld.value.trim();
    if (!text || laeuft) return;
    laeuft = true; senden.disabled = true; chips.hidden = true;
    feld.value = ''; feld.style.height = '';
    zustand.verlauf.push({ role: 'user', content: text });
    blase('user', text);
    var tippt = blase('assistant', '');
    tippt.classList.add('vc-tippt');
    tippt.innerHTML = '<i></i><i></i><i></i><span class="sr">Assistent schreibt …</span>';
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: zustand.verlauf, gesendet: zustand.gesendet })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok && d.ok, d: d }; });
    }).catch(function () { return { ok: false, d: {} }; }).then(function (x) {
      tippt.remove();
      var antwort = x.d.text || 'Entschuldigung, gerade klappt es technisch nicht. Rufen Sie uns gern an: +49 1556 8656548.';
      if (x.ok) {
        zustand.verlauf.push({ role: 'assistant', content: antwort });
        if (x.d.gesendet) zustand.gesendet = true;
      } else {
        zustand.verlauf.pop(); // Frage nicht im Verlauf lassen, damit sie erneut gestellt werden kann
      }
      var b = blase('assistant', antwort);
      if (!x.ok) b.classList.add('vc-fehler');
      merken();
    }).then(function () { laeuft = false; senden.disabled = false; feld.focus(); });
  }

  aufbauen();
})();
