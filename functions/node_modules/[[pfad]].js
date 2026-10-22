// Quelltext und Pakete liegen im selben Ordner wie die Seite, sollen aber nicht abrufbar sein.
export const onRequest = () => new Response('Nicht gefunden', { status: 404 });
