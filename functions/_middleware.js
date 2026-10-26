// Cloudflare Pages Function: leitet www.voltherm.de dauerhaft (301) auf voltherm.de um,
// mit gleichem Pfad und gleicher Abfrage. Die _redirects-Datei kann keine Weiterleitung
// nach Domain, darum hier. Alle anderen Hosts (voltherm.de, *.pages.dev) gehen unverändert weiter,
// also keine Schleife.
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === 'www.voltherm.de') {
    url.hostname = 'voltherm.de';
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
