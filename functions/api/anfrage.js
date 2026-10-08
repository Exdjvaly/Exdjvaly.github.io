// Cloudflare Pages Function: nimmt eine Anfrage vom Formular an und schickt sie sofort als
// Push-Nachricht über ntfy aufs Telefon. Nichts wird gespeichert.
// Einstellungen (Pages → Settings → Variables and Secrets):
//   NTFY_TOPIC  geheimer Kanalname, nur Valentin kennt ihn (Pflicht)
//   NTFY_SERVER optional, Standard https://ntfy.sh
//   NTFY_TOKEN  optional, Zugangstoken für einen geschützten Kanal

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

// Ein Versuch bei ntfy, höchstens 6 Sekunden. Ohne Grenze wartet Cloudflare zu lange und
// liefert dann selbst einen 502 ohne Begründung.
async function sende(server, kopf, body) {
  try {
    const res = await fetch(server + '/', { method: 'POST', headers: kopf, body, signal: AbortSignal.timeout(6000) });
    if (res.ok) return { ok: true, status: res.status };
    const text = (await res.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 160);
    return { ok: false, status: res.status, grund: 'ntfy antwortet ' + res.status + (text ? ' ' + text : '') };
  } catch (e) {
    const zeit = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return { ok: false, status: 0, grund: zeit ? 'ntfy antwortet nicht (Zeitüberschreitung)' : 'ntfy nicht erreichbar' };
  }
}

function zugang(env) {
  const server = (env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, '');
  const kopf = { 'Content-Type': 'application/json' };
  if (env.NTFY_TOKEN) kopf.Authorization = 'Bearer ' + env.NTFY_TOKEN.trim();
  return { server, kopf };
}

// Selbsttest im Browser: https://voltherm.de/api/anfrage zeigt, ob der Kanal eingerichtet ist.
// Mit ?test=<Kanalname> wird zusätzlich eine Probe-Nachricht geschickt und die Antwort von ntfy gezeigt.
export async function onRequestGet({ request, env }) {
  const info = { eingerichtet: Boolean(env.NTFY_TOPIC), tokenGesetzt: Boolean(env.NTFY_TOKEN) };
  const test = new URL(request.url).searchParams.get('test');
  if (!env.NTFY_TOPIC || !test || test !== env.NTFY_TOPIC) return antwort(200, info);
  const { server, kopf } = zugang(env);
  const start = Date.now();
  const r = await sende(server, kopf, JSON.stringify({ topic: env.NTFY_TOPIC, title: 'Test VOLTHERM', message: 'Probe von voltherm.de', priority: 3 }));
  return antwort(200, { ...info, ntfy: r.ok ? 'ok ' + r.status : r.grund, dauerMs: Date.now() - start });
}

export async function onRequestPost({ request, env }) {
  if (!env.NTFY_TOPIC) return antwort(503, { ok: false, grund: 'nicht eingerichtet' });

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

  const nachricht = {
    topic: env.NTFY_TOPIC,
    title: 'Neue Anfrage: ' + name,
    message: zeilen.join('\n'),
    tags: ['incoming_envelope'],
    priority: 4,
  };

  // Knöpfe in der Benachrichtigung: direkt anrufen, WhatsApp oder E-Mail.
  const nummer = kontakt.replace(/[^\d+]/g, '');
  const aktionen = [];
  if (kontakt.includes('@')) {
    aktionen.push({ action: 'view', label: 'E-Mail', url: 'mailto:' + kontakt });
  } else if (nummer.replace('+', '').length >= 6) {
    const intl = nummer.startsWith('+') ? nummer.slice(1) : nummer.startsWith('00') ? nummer.slice(2) : '49' + nummer.replace(/^0/, '');
    aktionen.push({ action: 'view', label: 'Anrufen', url: 'tel:+' + intl });
    aktionen.push({ action: 'view', label: 'WhatsApp', url: 'https://wa.me/' + intl });
  }
  if (aktionen.length) nachricht.actions = aktionen;

  const { server, kopf } = zugang(env);

  // ntfy lehnt gelegentlich ab (Last, Limits); bis zu drei Versuche, damit keine Anfrage verloren geht.
  const body = JSON.stringify(nachricht);
  let grund = '';
  for (let versuch = 0; versuch < 3; versuch++) {
    if (versuch) await new Promise((r) => setTimeout(r, versuch * 800));
    const r = await sende(server, kopf, body);
    if (r.ok) return antwort(200, { ok: true });
    grund = r.grund;
    if (r.status === 401 || r.status === 403) break;
  }
  return antwort(502, { ok: false, grund });
}
