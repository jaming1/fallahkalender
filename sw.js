// Fallahkalender – Service Worker: macht die App offline nutzbar.
// Alles wird beim Installieren in den Speicher gelegt. Danach kommt jede Datei sofort aus dem Speicher
// und wird im Hintergrund neu geholt, damit Änderungen beim nächsten Öffnen da sind.
const VERSION = 'fk-5.3.0';
const DATEIEN = [
  './', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest',
  'datum.js', 'diagnose.js', 'engine.js', 'fellah.js', 'i18n.js', 'ki.js', 'plan.js', 'vorlesen.js', 'wetter.js',
  'assets/icon.svg', 'assets/zeichen.svg', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png', 'assets/apple-touch-icon.png',
  'daten/anbau.json', 'daten/bilder.json', 'daten/fellah.json', 'daten/hilfe.json', 'daten/krankheiten.json', 'daten/kulturen.json', 'daten/massnahmen.json', 'daten/zonen.json',
  'sprachen/ar.json', 'sprachen/dar.json', 'sprachen/fr.json', 'sprachen/zgh.json'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSION).then(async (c) => {
    await c.addAll(DATEIEN);
    // Fotos auch offline: einzeln laden, ein fehlendes Foto stoppt die Installation nicht
    try {
      const bilder = await (await c.match('daten/bilder.json')).json();
      const dateien = [...new Set(Object.values(bilder).map((b) => b.datei))];
      await Promise.all(dateien.map((d) => c.add(d).catch(() => null)));
    } catch { /* ohne Fotos weiter */ }
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((namen) => Promise.all(namen.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (ev) => {
  const anfrage = ev.request;
  const adresse = new URL(anfrage.url);
  // Die eigene KI (api/…) läuft immer frisch über das Netz
  if (anfrage.method !== 'GET' || adresse.origin !== self.location.origin || adresse.pathname.includes('/api/')) return;
  ev.respondWith(caches.open(VERSION).then(async (speicher) => {
    const alt = await speicher.match(anfrage, { ignoreSearch: true });
    const neu = fetch(anfrage).then((antwort) => {
      if (antwort.ok) speicher.put(anfrage, antwort.clone());
      return antwort;
    }).catch(() => null);
    if (alt) { ev.waitUntil(neu); return alt; }
    const antwort = await neu;
    if (antwort) return antwort;
    if (anfrage.mode === 'navigate') return speicher.match('index.html');
    return Response.error();
  }));
});
