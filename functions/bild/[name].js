// Cloudflare Pages Function: liefert die Fotos der Leistungskarten über voltherm.de aus.
// Die Bilder kommen von Unsplash (frei nutzbare Lizenz), werden aber hier auf dem Server geholt
// und zwischengespeichert. So lädt der Browser der Besucher nichts von fremden Servern (DSGVO).
const BILDER = {
  elektro: '1758101755915-462eddc23f57',
  photovoltaik: '1780445392694-c95056ed12e2',
  speicher: '1780445392417-68b9dccc45f2',
  wallbox: '1766507680004-1c71007aefe5',
  waermepumpe: '1776860150272-653efc74193c',
  klima: '1762341123870-d706f257a12e',
  smarthome: '1773098587088-f0a3aaab48a8',
};

export async function onRequest({ params, request }) {
  const id = BILDER[String(params.name).replace(/\.\w+$/, '')];
  if (!id) return new Response('Nicht gefunden', { status: 404 });
  const breit = new URL(request.url).searchParams.get('w') === '1400' ? 1400 : 800;
  const quelle = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${breit}&q=70&fm=webp`;
  const antwort = await fetch(quelle, { cf: { cacheEverything: true, cacheTtl: 2592000 } });
  if (!antwort.ok) return new Response('Bild nicht verfügbar', { status: 502 });
  return new Response(antwort.body, {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=2592000, immutable' },
  });
}
