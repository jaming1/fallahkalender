// Verbindung zur eigenen KI (code/server/server.py). Fehlt der Server (z. B. reines Hosting oder offline),
// meldet kiStatus() „nichts da“ und die App arbeitet wie bisher ohne KI.
let status = null;

async function mitZeit(url, optionen = {}, ms = 2000) {
  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), ms);
  try {
    return await fetch(url, { ...optionen, signal: abbruch.signal });
  } finally {
    clearTimeout(uhr);
  }
}

export async function kiStatus() {
  if (status) return status;
  status = { bild: false, stimmen: [] };
  try {
    const r = await mitZeit('api/status', { cache: 'no-store' }, 1500);
    if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) {
      const x = await r.json();
      status = { bild: x.bild === true, stimmen: Array.isArray(x.stimmen) ? x.stimmen : [] };
    }
  } catch { /* kein Server */ }
  return status;
}

export const kiStimme = (code) => Boolean(status?.stimmen.includes(code));

async function senden(pfad, daten, ms) {
  const r = await mitZeit(pfad, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(daten) }, ms);
  if (!r.ok) throw new Error(`${pfad}: ${r.status}`);
  return r;
}

// Foto an die eigene KI: Antwort { symptome: [ids], krankheit, sicherheit, gesund, bildUnklar }
export async function bildPruefen(kultur, foto) {
  const r = await senden('api/bild', { kultur, foto }, 300000);
  return r.json();
}

// Text als Sprache vom eigenen Server; gibt eine abspielbare Adresse zurück.
export async function stimmeHolen(sprache, text) {
  const r = await senden('api/stimme', { sprache, text }, 600000);
  return URL.createObjectURL(await r.blob());
}
