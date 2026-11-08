// Datumshilfen: alle Daten als 'JJJJ-MM-TT' in UTC, damit Zeitzonen nichts verschieben.
export const TAG = 86400000;
export function parse(iso) { const [j, m, t] = iso.split('-').map(Number); return new Date(Date.UTC(j, m - 1, t)); }
export function iso(d) { return d.toISOString().slice(0, 10); }
export function plusTage(isoDatum, n) { return iso(new Date(parse(isoDatum).getTime() + n * TAG)); }
export function heuteIso(jetzt = new Date()) { return iso(new Date(Date.UTC(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate()))); }
export function deutsch(isoDatum) {
  return parse(isoDatum).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
