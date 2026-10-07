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

// Kurzer Selbsttest im Browser: https://voltherm.de/api/anfrage zeigt, ob der Kanal eingerichtet ist.
export function onRequestGet({ env }) {
  return antwort(200, { eingerichtet: Boolean(env.NTFY_TOPIC) });
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

  const server = (env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, '');
  const kopf = { 'Content-Type': 'application/json' };
  if (env.NTFY_TOKEN) kopf.Authorization = 'Bearer ' + env.NTFY_TOKEN;

  let res;
  try {
    res = await fetch(server + '/', { method: 'POST', headers: kopf, body: JSON.stringify(nachricht) });
  } catch {
    return antwort(502, { ok: false, grund: 'ntfy nicht erreichbar' });
  }
  if (!res.ok) return antwort(502, { ok: false, grund: 'ntfy antwortet ' + res.status });
  return antwort(200, { ok: true });
}
