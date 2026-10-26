// Cloudflare Pages Function: VOLTHERM Chat-Assistent auf voltherm.de.
// Beantwortet Fragen von Besuchern mit Claude (Anthropic) und schickt eine Anfrage, sobald der
// Besucher zustimmt, wie das Anfrageformular per Telegram aufs Telefon. Nichts wird gespeichert;
// den Verlauf hält der Browser und schickt ihn bei jeder Nachricht mit.
// Einstellungen (Pages → Settings → Variables and Secrets):
//   ANTHROPIC_API_KEY  API-Schlüssel aus console.anthropic.com (Secret)
//   CHAT_MODEL         optional, Standard siehe MODELL
//   TELEGRAM_TOKEN / TELEGRAM_CHAT  wie bei /api/anfrage

import { WISSEN } from '../_lib/wissen.js';

const MODELL = 'claude-haiku-5-5';   // auf Sonnet umstellen: CHAT_MODEL = claude-sonnet-5-5
const MAX_NACHRICHTEN = 30;   // Verlauf insgesamt, danach bitte Formular oder Telefon
const MAX_ZEICHEN = 1200;     // pro Nachricht des Besuchers
const MAX_VERLAUF = 24000;    // Zeichen im ganzen Verlauf

function antwort(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function sauber(t, max) {
  return String(t || '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);
}

const ANFRAGE_TOOL = {
  name: 'anfrage_senden',
  description:
    'Schickt die Anfrage des Besuchers an VOLTHERM (Valentin bekommt sie sofort aufs Telefon). ' +
    'Nur aufrufen, wenn der Besucher Name und Telefon oder E-Mail genannt und ausdrücklich zugestimmt hat, dass die Anfrage gesendet wird.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string', description: 'Name des Besuchers' },
      kontakt: { type: 'string', description: 'Telefonnummer oder E-Mail-Adresse' },
      ort: { type: 'string', description: 'PLZ und Ort, leer wenn nicht genannt' },
      interesse: { type: 'string', description: 'Leistungen, z. B. "Photovoltaik, Speicher"' },
      zusammenfassung: {
        type: 'string',
        description: 'Kurze Zusammenfassung für Valentin auf Deutsch: Haus, vorhandene Anlagen, Wünsche, Fragen, gewünschter Rückruf. 2 bis 6 Sätze.',
      },
    },
    required: ['name', 'kontakt', 'ort', 'interesse', 'zusammenfassung'],
  },
};

// Telegram wie in anfrage.js: bis zu drei Versuche, höchstens 6 Sekunden pro Versuch.
async function telegram(env, text, knoepfe) {
  const nachricht = { chat_id: String(env.TELEGRAM_CHAT).trim(), text, disable_web_page_preview: true };
  if (knoepfe.length) nachricht.reply_markup = { inline_keyboard: [knoepfe] };
  for (let versuch = 0; versuch < 3; versuch++) {
    if (versuch) await new Promise((w) => setTimeout(w, versuch * 800));
    try {
      const res = await fetch('https://api.telegram.org/bot' + env.TELEGRAM_TOKEN.trim() + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nachricht),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) return true;
      if (res.status === 401 || res.status === 403) return false;
    } catch {}
  }
  return false;
}

async function anfrageSenden(env, e) {
  if (!env.TELEGRAM_TOKEN || !env.TELEGRAM_CHAT) return false;
  const name = sauber(e.name, 80), kontakt = sauber(e.kontakt, 120);
  if (!name || !kontakt) return false;
  const zeilen = ['Neue Anfrage aus dem Chat: ' + name, ''];
  const interesse = sauber(e.interesse, 300), ort = sauber(e.ort, 80);
  if (interesse) zeilen.push('Interesse: ' + interesse);
  zeilen.push('Name: ' + name, 'Kontakt: ' + kontakt);
  if (ort) zeilen.push('Ort: ' + ort);
  zeilen.push('', sauber(e.zusammenfassung, 2000));
  const nummer = kontakt.replace(/[^\d+]/g, '');
  const knoepfe = [];
  if (!kontakt.includes('@') && nummer.replace('+', '').length >= 6) {
    const intl = nummer.startsWith('+') ? nummer.slice(1) : nummer.startsWith('00') ? nummer.slice(2) : '49' + nummer.replace(/^0/, '');
    knoepfe.push({ text: 'WhatsApp', url: 'https://wa.me/' + intl });
  }
  return telegram(env, zeilen.join('\n'), knoepfe);
}

// Verlauf aus dem Browser prüfen: nur Text, abwechselnd Besucher und Assistent, Besucher zuletzt.
function verlaufPruefen(liste) {
  if (!Array.isArray(liste) || !liste.length || liste.length > MAX_NACHRICHTEN) return null;
  const nachrichten = [];
  let summe = 0;
  for (let i = 0; i < liste.length; i++) {
    const n = liste[i];
    const rolle = i % 2 === 0 ? 'user' : 'assistant';
    if (!n || n.role !== rolle || typeof n.content !== 'string') return null;
    const text = sauber(n.content, rolle === 'user' ? MAX_ZEICHEN : 4000);
    if (!text) return null;
    summe += text.length;
    nachrichten.push({ role: rolle, content: text });
  }
  if (nachrichten[nachrichten.length - 1].role !== 'user' || summe > MAX_VERLAUF) return null;
  return nachrichten;
}

// Claude über die Messages-API. Ohne SDK, weil die Seite keinen Build-Schritt hat (Cloudflare lädt
// nur die Dateien aus dem Repository); gleicher Stil wie der Telegram-Aufruf in anfrage.js.
async function claude(env, body) {
  const kopf = {
    'Content-Type': 'application/json',
    'x-api-key': env.ANTHROPIC_API_KEY.trim(),
    'anthropic-version': '2026-10-21',
  };
  if (body.betas) {
    kopf['anthropic-beta'] = body.betas.join(',');
    body = { ...body };
    delete body.betas;
  }
  let res;
  for (let versuch = 0; versuch < 2; versuch++) {
    if (versuch) await new Promise((w) => setTimeout(w, 1000));
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: kopf, body: JSON.stringify(body), signal: AbortSignal.timeout(25000),
      });
    } catch {
      res = null;
      continue;
    }
    // 429 und 5xx (auch 529 überlastet) einmal wiederholen, alles andere gleich melden
    if (res.ok || (res.status !== 429 && res.status < 500)) break;
  }
  if (!res) throw Object.assign(new Error('nicht erreichbar'), { status: 0 });
  if (!res.ok) {
    const text = (await res.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 200);
    throw Object.assign(new Error(text || 'Fehler'), { status: res.status });
  }
  return res.json();
}

function texte(inhalt) {
  return inhalt.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

const STOERUNG = 'Entschuldigung, gerade klappt es technisch nicht. Rufen Sie uns gern an (+49 1556 8656548), schreiben Sie per WhatsApp oder nutzen Sie das Anfrageformular unten auf der Seite.';

export async function onRequestPost(kontext) {
  try {
    return await chat(kontext);
  } catch (e) {
    return antwort(500, { ok: false, text: STOERUNG, grund: 'Fehler in der Funktion: ' + (e && e.message ? e.message : String(e)) });
  }
}

async function chat({ request, env, waitUntil }) {
  const herkunft = request.headers.get('Origin');
  if (herkunft && new URL(herkunft).host !== new URL(request.url).host) return antwort(403, { ok: false, text: STOERUNG, grund: 'Herkunft ' + herkunft });
  if (!env.ANTHROPIC_API_KEY) return antwort(503, { ok: false, text: STOERUNG, grund: 'nicht eingerichtet' });

  let daten;
  try {
    daten = await request.json();
  } catch {
    return antwort(400, { ok: false });
  }
  const nachrichten = verlaufPruefen(daten && daten.messages);
  if (!nachrichten) {
    return antwort(400, { ok: false, text: 'Dieses Gespräch ist sehr lang geworden. Bitte rufen Sie uns an (+49 1556 8656548) oder nutzen Sie das Anfrageformular, dann geht es dort direkt weiter.' });
  }
  const schonGesendet = Boolean(daten.gesendet);

  const modell = (env.CHAT_MODEL || MODELL).trim();
  const anfrage = {
    model: modell,
    max_tokens: 2000,
    output_config: { effort: 'low' },
    system: [{ type: 'text', text: WISSEN, cache_control: { type: 'ephemeral' } }],
    tools: schonGesendet ? [] : [ANFRAGE_TOOL],
    messages: nachrichten,
  };
  // Lehnt ein Sicherheitsfilter ab, versucht Anthropic es selbst mit einem passenden anderen Modell.
  // Für Haiku gibt es das nicht.
  if (!modell.includes('haiku')) {
    anfrage.betas = ['server-side-fallback-2026-07-01'];
    anfrage.fallbacks = 'default';
  }

  let gesendet = false;
  try {
    let r = await claude(env, anfrage);
    // Höchstens ein Werkzeugaufruf pro Nachricht: Anfrage senden, dann Bestätigung formulieren.
    const aufruf = r.stop_reason === 'tool_use' && r.content.find((b) => b.type === 'tool_use' && b.name === 'anfrage_senden');
    if (aufruf) {
      gesendet = await anfrageSenden(env, aufruf.input || {});
      const ergebnis = gesendet
        ? 'Gesendet. Valentin meldet sich zeitnah. Bestätige das dem Besucher kurz.'
        : 'Senden fehlgeschlagen. Bitte den Besucher, anzurufen (+49 1556 8656548), per WhatsApp zu schreiben oder das Formular zu nutzen.';
      r = await claude(env, {
        ...anfrage,
        tools: [ANFRAGE_TOOL],
        tool_choice: { type: 'none' },
        messages: [
          ...nachrichten,
          { role: 'assistant', content: r.content },
          { role: 'user', content: [{ type: 'tool_result', tool_use_id: aufruf.id, content: ergebnis, is_error: !gesendet }] },
        ],
      });
    }
    if (r.stop_reason === 'refusal') {
      return antwort(200, { ok: true, text: 'Dazu kann ich leider nichts sagen. Bei Fragen zu Photovoltaik, Speicher, Wallbox, Wärmepumpe, Klimaanlage, Smart Home oder Elektroinstallation helfe ich gern.', gesendet });
    }
    const text = texte(r.content);
    return antwort(200, { ok: true, text: text || STOERUNG, gesendet });
  } catch (e) {
    const status = e && e.status ? e.status : 0;
    // Den technischen Grund bekommt nur Valentin per Telegram, Besucher sehen STOERUNG.
    const meldung = 'Chat auf voltherm.de gestört: Anthropic ' + (status || 'nicht erreichbar') + '\n' + String(e && e.message ? e.message : '').slice(0, 600);
    if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT) waitUntil(telegram(env, meldung, []).catch(() => false));
    // Status 200 mit ok:false: eine 502 der Funktion kam im Browser ohne unseren Text an.
    return antwort(200, { ok: false, text: STOERUNG, grund: 'Anthropic ' + (status || 'nicht erreichbar') + ' ' + (e && e.message ? e.message : ''), gesendet });
  }
}

// Selbsttest im Browser: https://voltherm.de/api/chat zeigt, ob alles eingerichtet ist.
// Mit ?test=1 stellt die Funktion selbst eine Probefrage an Claude und zeigt das Ergebnis.
export async function onRequestGet({ request, env }) {
  const info = {
    schluessel: Boolean(env.ANTHROPIC_API_KEY),
    modell: (env.CHAT_MODEL || MODELL).trim(),
    telegram: Boolean(env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT),
  };
  if (!info.schluessel || new URL(request.url).searchParams.get('test') !== '1') return antwort(200, info);
  const t0 = Date.now();
  try {
    const r = await claude(env, {
      model: info.modell,
      max_tokens: 300,
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: WISSEN, cache_control: { type: 'ephemeral' } }],
      tools: [ANFRAGE_TOOL],
      messages: [{ role: 'user', content: 'Was ist HEMS? Ein Satz.' }],
    });
    return antwort(200, { ...info, test: 'ok', stop: r.stop_reason, text: texte(r.content).slice(0, 300), ms: Date.now() - t0 });
  } catch (e) {
    return antwort(200, { ...info, test: 'Fehler ' + (e && e.status) + ' ' + (e && e.message ? e.message : String(e)), ms: Date.now() - t0 });
  }
}
