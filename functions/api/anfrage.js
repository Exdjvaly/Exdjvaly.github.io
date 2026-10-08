// Cloudflare Pages Function: nimmt eine Anfrage vom Formular an und schickt sie sofort als
// Push-Nachricht aufs Telefon, über Telegram und/oder ntfy. Nichts wird gespeichert.
// Einstellungen (Pages → Settings → Variables and Secrets):
//   TELEGRAM_TOKEN  Token des eigenen Bots von @BotFather
//   TELEGRAM_CHAT   Chat-ID, an die der Bot schreibt (zeigt der Testlink an)
//   NTFY_TOPIC      geheimer ntfy-Kanalname; dient auch als Schlüssel für den Testlink
//   NTFY_SERVER     optional, Standard https://ntfy.sh
//   NTFY_TOKEN      optional, Zugangstoken für einen geschützten Kanal

const MAX = { name: 80, kontakt: 120, ort: 80, text: 2000, interesse: 300 };

function feld(daten, key) {
  const wert = typeof daten[key] === 'string' ? daten[key] : '';
  return wert.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, MAX[key]);
}

function antwort(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// Höchstens 6 Sekunden pro Versuch. Ohne Grenze wartet Cloudflare zu lange und
// liefert dann selbst einen 502 ohne Begründung.
async function post(dienst, url, kopf, body) {
  try {
    const res = await fetch(url, { method: 'POST', headers: kopf, body, signal: AbortSignal.timeout(6000) });
    if (res.ok) return { ok: true, status: res.status };
    const text = (await res.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 160);
    return { ok: false, status: res.status, grund: dienst + ' antwortet ' + res.status + (text ? ' ' + text : '') };
  } catch (e) {
    const zeit = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return { ok: false, status: 0, grund: dienst + (zeit ? ' antwortet nicht (Zeitüberschreitung)' : ' nicht erreichbar') };
  }
}

// Bis zu drei Versuche, damit keine Anfrage verloren geht; 401/403 lohnt keinen weiteren Versuch.
async function mitVersuchen(senden) {
  let r;
  for (let versuch = 0; versuch < 3; versuch++) {
    if (versuch) await new Promise((w) => setTimeout(w, versuch * 800));
    r = await senden();
    if (r.ok || r.status === 401 || r.status === 403) break;
  }
  return r;
}

function telegramBereit(env) {
  return Boolean(env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT);
}

function telegram(env, titel, text, knoepfe) {
  const nachricht = { chat_id: String(env.TELEGRAM_CHAT).trim(), text: titel + '\n\n' + text, disable_web_page_preview: true };
  if (knoepfe && knoepfe.length) nachricht.reply_markup = { inline_keyboard: [knoepfe] };
  return post('Telegram', 'https://api.telegram.org/bot' + env.TELEGRAM_TOKEN.trim() + '/sendMessage',
    { 'Content-Type': 'application/json' }, JSON.stringify(nachricht));
}

function ntfy(env, nachricht) {
  const server = (env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, '');
  const kopf = { 'Content-Type': 'application/json' };
  if (env.NTFY_TOKEN) kopf.Authorization = 'Bearer ' + env.NTFY_TOKEN.trim();
  return post('ntfy', server + '/', kopf, JSON.stringify({ topic: env.NTFY_TOPIC, ...nachricht }));
}

// Schickt über alle eingerichteten Wege gleichzeitig; Erfolg, sobald einer ankommt.
// Die übrigen laufen über waitUntil im Hintergrund zu Ende.
async function zustellen(env, warten, wege) {
  if (!wege.length) return { ok: false, grund: 'nicht eingerichtet' };
  const laeufe = wege.map((weg) => mitVersuchen(weg));
  const erster = Promise.any(laeufe.map((l) => l.then((r) => (r.ok ? r : Promise.reject(r)))));
  try {
    await erster;
    if (warten) warten(Promise.allSettled(laeufe));
    return { ok: true };
  } catch {
    const alle = await Promise.all(laeufe);
    return { ok: false, grund: alle.map((r) => r.grund).join('; ') };
  }
}

// Selbsttest im Browser: https://voltherm.de/api/anfrage zeigt, was eingerichtet ist.
// Mit ?test=<ntfy-Kanalname> geht eine Probe-Nachricht über jeden Weg raus. Ist nur der
// Telegram-Token gesetzt, zeigt der Test die Chat-IDs, die dem Bot geschrieben haben.
export async function onRequestGet({ request, env }) {
  const info = {
    eingerichtet: Boolean(env.NTFY_TOPIC) || telegramBereit(env),
    telegram: telegramBereit(env) ? 'bereit' : env.TELEGRAM_TOKEN ? 'TELEGRAM_CHAT fehlt' : 'aus',
    ntfy: env.NTFY_TOPIC ? 'bereit' : 'aus',
    tokenGesetzt: Boolean(env.NTFY_TOKEN),
  };
  const test = new URL(request.url).searchParams.get('test');
  if (!env.NTFY_TOPIC || !test || test !== env.NTFY_TOPIC) return antwort(200, info);

  if (env.TELEGRAM_TOKEN && !env.TELEGRAM_CHAT) {
    try {
      const res = await fetch('https://api.telegram.org/bot' + env.TELEGRAM_TOKEN.trim() + '/getUpdates', { signal: AbortSignal.timeout(6000) });
      const d = await res.json();
      const chats = {};
      for (const u of d.result || []) {
        const c = (u.message || u.my_chat_member || {}).chat;
        if (c) chats[c.id] = [c.first_name, c.last_name, c.title].filter(Boolean).join(' ');
      }
      return antwort(200, { ...info, telegramAntwort: d.ok ? 'ok' : d.description, chats });
    } catch {
      return antwort(200, { ...info, telegramAntwort: 'Telegram nicht erreichbar' });
    }
  }

  const ergebnis = {};
  if (telegramBereit(env)) {
    const t0 = Date.now();
    const r = await telegram(env, 'Test VOLTHERM', 'Probe von voltherm.de');
    ergebnis.telegramTest = (r.ok ? 'ok' : r.grund) + ' (' + (Date.now() - t0) + ' ms)';
  }
  const t0 = Date.now();
  const r = await ntfy(env, { title: 'Test VOLTHERM', message: 'Probe von voltherm.de', priority: 3 });
  ergebnis.ntfyTest = (r.ok ? 'ok' : r.grund) + ' (' + (Date.now() - t0) + ' ms)';
  return antwort(200, { ...info, ...ergebnis });
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.NTFY_TOPIC && !telegramBereit(env)) return antwort(503, { ok: false, grund: 'nicht eingerichtet' });

  const herkunft = request.headers.get('Origin');
  if (herkunft && new URL(herkunft).host !== new URL(request.url).host) {
    return antwort(403, { ok: false });
  }

  let daten;
  try {
    daten = await request.json();
  } catch {
    return antwort(400, { ok: false });
  }
  if (!daten || typeof daten !== 'object') return antwort(400, { ok: false });

  // Falle für Bots: dieses Feld ist für Menschen unsichtbar.
  if (daten.website) return antwort(200, { ok: true });

  const name = feld(daten, 'name');
  const kontakt = feld(daten, 'kontakt');
  if (!name || !kontakt) return antwort(400, { ok: false, grund: 'Name und Kontakt fehlen' });
  const ort = feld(daten, 'ort');
  const text = feld(daten, 'text');
  const interesse = feld(daten, 'interesse');

  const zeilen = [];
  if (interesse) zeilen.push('Interesse: ' + interesse);
  zeilen.push('Name: ' + name, 'Kontakt: ' + kontakt);
  if (ort) zeilen.push('Ort: ' + ort);
  if (text) zeilen.push('', text);

  const titel = 'Neue Anfrage: ' + name;
  const inhalt = zeilen.join('\n');

  // Knöpfe in der Benachrichtigung: direkt anrufen, WhatsApp oder E-Mail.
  // Telegram erlaubt nur https-Links; Telefonnummern im Text sind dort ohnehin antippbar.
  const nummer = kontakt.replace(/[^\d+]/g, '');
  const aktionen = [];
  const knoepfe = [];
  if (kontakt.includes('@')) {
    aktionen.push({ action: 'view', label: 'E-Mail', url: 'mailto:' + kontakt });
  } else if (nummer.replace('+', '').length >= 6) {
    const intl = nummer.startsWith('+') ? nummer.slice(1) : nummer.startsWith('00') ? nummer.slice(2) : '49' + nummer.replace(/^0/, '');
    aktionen.push({ action: 'view', label: 'Anrufen', url: 'tel:+' + intl });
    aktionen.push({ action: 'view', label: 'WhatsApp', url: 'https://wa.me/' + intl });
    knoepfe.push({ text: 'WhatsApp', url: 'https://wa.me/' + intl });
  }

  const wege = [];
  if (telegramBereit(env)) wege.push(() => telegram(env, titel, inhalt, knoepfe));
  if (env.NTFY_TOPIC) {
    const nachricht = { title: titel, message: inhalt, tags: ['incoming_envelope'], priority: 4 };
    if (aktionen.length) nachricht.actions = aktionen;
    wege.push(() => ntfy(env, nachricht));
  }

  const r = await zustellen(env, waitUntil, wege);
  return r.ok ? antwort(200, { ok: true }) : antwort(502, { ok: false, grund: r.grund });
}
