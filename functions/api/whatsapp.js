// Cloudflare Pages Function: VOLTHERM Assistent auf WhatsApp (WhatsApp Business Platform, Cloud API).
// Meta ruft diese Adresse für jede eingehende Nachricht auf (Webhook). Die Antwort schreibt Claude
// mit demselben Wissen und denselben Regeln wie der Chat auf der Website (keine Preise, Anfrage
// aufnehmen, per Telegram an Valentin). Den Verlauf hält Cloudflare KV höchstens 24 Stunden, so lange
// wie das Antwortfenster von WhatsApp.
// Webhook-Adresse bei Meta: https://voltherm.de/api/whatsapp
// Einstellungen (Pages → Settings → Variables and Secrets):
//   WA_TOKEN            Zugangstoken der Meta-App (System-User-Token, Secret)
//   WA_APP_SECRET       App-Geheimnis der Meta-App, prüft die Signatur jedes Aufrufs (Secret)
//   WA_VERIFY_TOKEN     frei gewähltes Wort, das auch bei Meta als "Verify token" eingetragen wird (Secret)
//   WA_PHONE_ID         "Phone number ID" der WhatsApp-Nummer bei Meta
//   WA_ERLAUBT          optional, Nummern mit Komma (z. B. 4915568656548): nur diese bekommen eine
//                       Antwort. Für die Testphase; leer = alle
//   WA_GRAPH_VERSION    optional, Standard siehe GRAPH
//   ANTHROPIC_API_KEY / CHAT_MODEL / TELEGRAM_TOKEN / TELEGRAM_CHAT  wie bei /api/chat
// Bindung (Pages → Settings → Bindings → KV namespace):
//   WA_CHAT             KV-Namespace für Verlauf und doppelte Zustellungen. Ohne ihn antwortet der
//                       Bot nur auf die einzelne Nachricht, ohne Gedächtnis.

import { WISSEN } from '../_lib/wissen.js';

const MODELL = 'claude-haiku-5-5';
const GRAPH = 'v23.0';
const MAX_NACHRICHTEN = 30;   // gespeicherter Verlauf, ältere fallen heraus
const MAX_ZEICHEN = 1200;     // pro Nachricht des Kunden
const MAX_PRO_TAG = 40;       // Antworten pro Nummer und Tag, schützt vor Kosten
const FENSTER = 24 * 3600;    // Sekunden, so lange gilt ein Gespräch

// Ergänzt WISSEN, das für die Website geschrieben ist.
const WHATSAPP = `# Kanal: WhatsApp
Du schreibst jetzt nicht auf der Website, sondern im WhatsApp-Chat von VOLTHERM. Dafür gilt zusätzlich und hat Vorrang:
- Kein Markdown. Für Hervorhebung höchstens *so* (WhatsApp-Fett), sparsam. Keine Links außer https://voltherm.de, wenn es passt.
- Es gibt hier kein Anfrageformular. Verweise nicht auf "unten auf der Seite".
- Die WhatsApp-Nummer des Kunden kennst du schon, sie wird mitgesendet. Frag also nicht nach Telefon oder E-Mail, sondern nur nach Name, PLZ und Ort und dem Vorhaben. Eine andere Rückrufnummer oder E-Mail nimmst du gern auf, wenn der Kunde sie nennt.
- Verweise nicht auf "WhatsApp an dieselbe Nummer", der Kunde ist schon hier. Anruf (+49 1556 8656548) oder E-Mail (office@voltherm.de) darfst du nennen.
- Sprach-, Bild- und Videonachrichten kannst du nicht öffnen. Bitte dann freundlich um eine kurze Textnachricht.`;

const BEGRUESSUNG = 'Hallo, hier ist der digitale Assistent von VOLTHERM (eine KI). Valentin liest mit und meldet sich persönlich, sobald es um Ihr Projekt geht. Hinweise zum Datenschutz: https://voltherm.de/datenschutz.html#chat';
const STOERUNG = 'Entschuldigung, gerade klappt es technisch nicht. Rufen Sie uns gern an (+49 1556 8656548) oder schreiben Sie an office@voltherm.de.';
const NUR_TEXT = 'Danke! Sprach-, Bild- und Videonachrichten kann ich leider noch nicht öffnen. Schreiben Sie mir Ihre Frage bitte kurz als Text.';
const GENUG = 'Für heute habe ich viele Nachrichten bekommen. Valentin meldet sich bei Ihnen, oder rufen Sie gern an: +49 1556 8656548.';
const ABGELEHNT = 'Dazu kann ich leider nichts sagen. Bei Fragen zu Photovoltaik, Speicher, Wallbox, Wärmepumpe, Klimaanlage, Smart Home oder Elektroinstallation helfe ich gern.';

function sauber(t, max) {
  return String(t || '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const ANFRAGE_TOOL = {
  name: 'anfrage_senden',
  description:
    'Schickt die Anfrage des Kunden an VOLTHERM (Valentin bekommt sie sofort aufs Telefon). Die WhatsApp-Nummer wird automatisch mitgeschickt. ' +
    'Nur aufrufen, wenn der Kunde seinen Namen genannt und ausdrücklich zugestimmt hat, dass die Anfrage gesendet wird.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string', description: 'Name des Kunden' },
      kontakt: { type: 'string', description: 'Andere Rückrufnummer oder E-Mail, nur wenn der Kunde sie genannt hat, sonst leer' },
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

// ---------- Signatur von Meta prüfen (X-Hub-Signature-256 = HMAC-SHA256 mit dem App-Geheimnis) ----------

async function signaturOk(geheim, rohtext, kopf) {
  if (!kopf || !kopf.startsWith('sha256=')) return false;
  const schluessel = await crypto.subtle.importKey('raw', new TextEncoder().encode(geheim.trim()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', schluessel, new TextEncoder().encode(rohtext)));
  const soll = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
  const ist = kopf.slice(7).toLowerCase();
  if (ist.length !== soll.length) return false;
  let diff = 0;
  for (let i = 0; i < soll.length; i++) diff |= soll.charCodeAt(i) ^ ist.charCodeAt(i);
  return diff === 0;
}

// ---------- Gedächtnis in KV ----------

async function lesen(env, key) {
  if (!env.WA_CHAT) return null;
  try {
    return await env.WA_CHAT.get(key, 'json');
  } catch {
    return null;
  }
}

async function schreiben(env, key, wert, ttl) {
  if (!env.WA_CHAT) return;
  try {
    await env.WA_CHAT.put(key, JSON.stringify(wert), { expirationTtl: ttl });
  } catch {}
}

// Meta stellt einen Aufruf erneut zu, wenn die Antwort ausbleibt; jede Nachricht nur einmal bearbeiten.
async function schonBearbeitet(env, id) {
  if (!env.WA_CHAT || !id) return false;
  const key = 'id:' + id;
  if (await lesen(env, key)) return true;
  await schreiben(env, key, 1, 3 * 24 * 3600);
  return false;
}

// Verlauf kürzen: höchstens MAX_NACHRICHTEN, beginnt immer mit einer Kundennachricht.
function kuerzen(verlauf) {
  let v = verlauf.slice(-MAX_NACHRICHTEN);
  while (v.length && v[0].role !== 'user') v = v.slice(1);
  return v;
}

// ---------- Dienste ----------

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

async function anfrageSenden(env, e, kunde) {
  if (!env.TELEGRAM_TOKEN || !env.TELEGRAM_CHAT) return false;
  const name = sauber(e.name, 80) || kunde.profil;
  if (!name) return false;
  const zeilen = ['Neue Anfrage über WhatsApp: ' + name, ''];
  const interesse = sauber(e.interesse, 300), ort = sauber(e.ort, 80), kontakt = sauber(e.kontakt, 120);
  if (interesse) zeilen.push('Interesse: ' + interesse);
  zeilen.push('Name: ' + name, 'WhatsApp: +' + kunde.nummer);
  if (kunde.profil && kunde.profil !== name) zeilen.push('WhatsApp-Profil: ' + kunde.profil);
  if (kontakt) zeilen.push('Kontakt: ' + kontakt);
  if (ort) zeilen.push('Ort: ' + ort);
  zeilen.push('', sauber(e.zusammenfassung, 2000));
  return telegram(env, zeilen.join('\n'), [{ text: 'WhatsApp-Chat öffnen', url: 'https://wa.me/' + kunde.nummer }]);
}

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

async function graph(env, body) {
  const version = (env.WA_GRAPH_VERSION || GRAPH).trim();
  const url = 'https://graph.facebook.com/' + version + '/' + String(env.WA_PHONE_ID).trim() + '/messages';
  for (let versuch = 0; versuch < 2; versuch++) {
    if (versuch) await new Promise((w) => setTimeout(w, 800));
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.WA_TOKEN.trim() },
        body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return { ok: true };
      const text = (await res.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 300);
      if (res.status < 500 && res.status !== 429) return { ok: false, grund: 'Meta ' + res.status + ' ' + text };
    } catch {}
  }
  return { ok: false, grund: 'Meta nicht erreichbar' };
}

// WhatsApp erlaubt 4096 Zeichen pro Nachricht; längere Antworten an Absätzen teilen.
function teilen(text) {
  const teile = [];
  let rest = text;
  while (rest.length > 4000) {
    let schnitt = rest.lastIndexOf('\n', 4000);
    if (schnitt < 2000) schnitt = rest.lastIndexOf(' ', 4000);
    if (schnitt < 1) schnitt = 4000;
    teile.push(rest.slice(0, schnitt).trim());
    rest = rest.slice(schnitt).trim();
  }
  if (rest) teile.push(rest);
  return teile;
}

async function senden(env, nummer, text) {
  for (const teil of teilen(text)) {
    const r = await graph(env, { recipient_type: 'individual', to: nummer, type: 'text', text: { body: teil, preview_url: false } });
    if (!r.ok) return r;
  }
  return { ok: true };
}

// ---------- Eine Nachricht beantworten ----------

async function stoerungMelden(env, text) {
  if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT) await telegram(env, 'WhatsApp-Bot gestört: ' + text.slice(0, 700), []).catch(() => false);
}

async function antworten(env, kunde, eingang) {
  const heute = new Date().toISOString().slice(0, 10);
  const key = 'chat:' + kunde.nummer;
  const stand = (await lesen(env, key)) || { verlauf: [], gesendet: false, tag: heute, zaehler: 0 };
  if (stand.tag !== heute) Object.assign(stand, { tag: heute, zaehler: 0 });
  const neu = !stand.verlauf.length;

  // Lesebestätigung (blaue Haken), Fehler hier sind egal.
  if (eingang.id) await graph(env, { status: 'read', message_id: eingang.id }).catch(() => null);

  if (stand.zaehler >= MAX_PRO_TAG) {
    if (stand.zaehler === MAX_PRO_TAG) {
      stand.zaehler++;
      await senden(env, kunde.nummer, GENUG);
      await schreiben(env, key, stand, FENSTER);
    }
    return;
  }
  stand.zaehler++;

  if (!eingang.text) {
    await senden(env, kunde.nummer, (neu ? BEGRUESSUNG + '\n\n' : '') + NUR_TEXT);
    if (neu) stand.verlauf.push({ role: 'user', content: '[Sprach-, Bild- oder Videonachricht]' }, { role: 'assistant', content: NUR_TEXT });
    await schreiben(env, key, stand, FENSTER);
    return;
  }

  // Zwei Kundennachrichten hintereinander (z. B. vorherige Antwort fehlgeschlagen) zusammenfassen,
  // die API verlangt abwechselnd Kunde und Assistent.
  const letzte = stand.verlauf[stand.verlauf.length - 1];
  if (letzte && letzte.role === 'user') letzte.content = sauber(letzte.content + '\n' + eingang.text, MAX_ZEICHEN * 2);
  else stand.verlauf.push({ role: 'user', content: eingang.text });
  stand.verlauf = kuerzen(stand.verlauf);
  await schreiben(env, key, stand, FENSTER);

  const kundeInfo = 'WhatsApp-Nummer des Kunden: +' + kunde.nummer + (kunde.profil ? ', Profilname: ' + kunde.profil : '') +
    (stand.gesendet ? '. Seine Anfrage wurde in diesem Gespräch schon an VOLTHERM gesendet; nicht noch einmal senden.' : '.');
  const modell = (env.CHAT_MODEL || MODELL).trim();
  const anfrage = {
    model: modell,
    max_tokens: 2000,
    output_config: { effort: 'low' },
    system: [
      { type: 'text', text: WISSEN + '\n\n' + WHATSAPP, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: kundeInfo },
    ],
    tools: stand.gesendet ? [] : [ANFRAGE_TOOL],
    messages: stand.verlauf,
  };
  if (!modell.includes('haiku')) {
    anfrage.betas = ['server-side-fallback-2026-07-01'];
    anfrage.fallbacks = 'default';
  }

  let text;
  try {
    let r = await claude(env, anfrage);
    const aufruf = r.stop_reason === 'tool_use' && r.content.find((b) => b.type === 'tool_use' && b.name === 'anfrage_senden');
    if (aufruf) {
      const ok = await anfrageSenden(env, aufruf.input || {}, kunde);
      if (ok) stand.gesendet = true;
      const ergebnis = ok
        ? 'Gesendet. Valentin meldet sich zeitnah. Bestätige das dem Kunden kurz.'
        : 'Senden fehlgeschlagen. Bitte den Kunden, anzurufen (+49 1556 8656548) oder an office@voltherm.de zu schreiben.';
      r = await claude(env, {
        ...anfrage,
        tools: [ANFRAGE_TOOL],
        tool_choice: { type: 'none' },
        messages: [
          ...stand.verlauf,
          { role: 'assistant', content: r.content },
          { role: 'user', content: [{ type: 'tool_result', tool_use_id: aufruf.id, content: ergebnis, is_error: !ok }] },
        ],
      });
    }
    text = r.stop_reason === 'refusal' ? ABGELEHNT : texte(r.content);
  } catch (e) {
    await stoerungMelden(env, 'Anthropic ' + ((e && e.status) || 'nicht erreichbar') + '\n' + String(e && e.message ? e.message : e));
    await senden(env, kunde.nummer, STOERUNG);
    return;
  }
  if (!text) text = STOERUNG;

  // Im Verlauf steht nur die Antwort selbst; die Begrüßung kommt einmal davor.
  const r = await senden(env, kunde.nummer, neu ? BEGRUESSUNG + '\n\n' + text : text);
  if (!r.ok) {
    await stoerungMelden(env, 'Antwort an +' + kunde.nummer + ' nicht zugestellt: ' + r.grund);
    await schreiben(env, key, stand, FENSTER);
    return;
  }
  stand.verlauf = kuerzen([...stand.verlauf, { role: 'assistant', content: text }]);
  await schreiben(env, key, stand, FENSTER);
}

// Aus dem Webhook von Meta alle eingehenden Nachrichten herausziehen (Statusmeldungen ignorieren).
export function nachrichtenAus(daten) {
  const liste = [];
  for (const eintrag of (daten && daten.entry) || []) {
    for (const aenderung of eintrag.changes || []) {
      const wert = aenderung.value || {};
      if (aenderung.field !== 'messages' || !Array.isArray(wert.messages)) continue;
      const profile = {};
      for (const k of wert.contacts || []) profile[k.wa_id] = k.profile && k.profile.name;
      for (const m of wert.messages) {
        const nummer = String(m.from || '').replace(/\D/g, '');
        if (!nummer) continue;
        let text = '';
        if (m.type === 'text') text = m.text && m.text.body;
        else if (m.type === 'button') text = m.button && m.button.text;
        else if (m.type === 'interactive') {
          const i = m.interactive || {};
          text = (i.button_reply && i.button_reply.title) || (i.list_reply && i.list_reply.title);
        }
        liste.push({ id: m.id, nummer, profil: sauber(profile[m.from], 80), text: sauber(text, MAX_ZEICHEN) });
      }
    }
  }
  return liste;
}

function erlaubt(env, nummer) {
  const liste = String(env.WA_ERLAUBT || '').split(',').map((n) => n.replace(/\D/g, '')).filter(Boolean);
  return !liste.length || liste.includes(nummer);
}

async function bearbeiten(env, daten) {
  for (const n of nachrichtenAus(daten)) {
    if (!erlaubt(env, n.nummer) || (await schonBearbeitet(env, n.id))) continue;
    try {
      await antworten(env, { nummer: n.nummer, profil: n.profil }, n);
    } catch (e) {
      await stoerungMelden(env, 'Fehler in der Funktion: ' + String(e && e.message ? e.message : e));
    }
  }
}

function eingerichtet(env) {
  return Boolean(env.WA_TOKEN && env.WA_APP_SECRET && env.WA_PHONE_ID && env.ANTHROPIC_API_KEY);
}

// Meta schickt Nachrichten per POST. Sofort 200 antworten, die Antwort an den Kunden läuft danach weiter,
// sonst stellt Meta denselben Aufruf erneut zu.
export async function onRequestPost({ request, env, waitUntil }) {
  if (!eingerichtet(env)) return json(503, { ok: false, grund: 'nicht eingerichtet' });
  const rohtext = await request.text();
  if (!(await signaturOk(env.WA_APP_SECRET, rohtext, request.headers.get('X-Hub-Signature-256')))) {
    return json(401, { ok: false, grund: 'Signatur' });
  }
  let daten;
  try {
    daten = JSON.parse(rohtext);
  } catch {
    return json(400, { ok: false });
  }
  waitUntil(bearbeiten(env, daten));
  return json(200, { ok: true });
}

// GET: Meta prüft beim Eintragen des Webhooks das Verify token und erwartet hub.challenge zurück.
// Ohne diese Parameter zeigt die Adresse, ob alles eingerichtet ist (ohne Geheimnisse).
export async function onRequestGet({ request, env }) {
  const p = new URL(request.url).searchParams;
  if (p.get('hub.mode') === 'subscribe') {
    const ok = env.WA_VERIFY_TOKEN && p.get('hub.verify_token') === String(env.WA_VERIFY_TOKEN).trim();
    return new Response(ok ? p.get('hub.challenge') || '' : 'falsches Verify token', {
      status: ok ? 200 : 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  return json(200, {
    eingerichtet: eingerichtet(env),
    verify_token: Boolean(env.WA_VERIFY_TOKEN),
    gedaechtnis: Boolean(env.WA_CHAT),
    telegram: Boolean(env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT),
    nur_testnummern: Boolean(String(env.WA_ERLAUBT || '').trim()),
    modell: (env.CHAT_MODEL || MODELL).trim(),
  });
}
