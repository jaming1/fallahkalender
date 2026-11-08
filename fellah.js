// Fellah-Kalender (julianisch, 13 Tage zurück – gilt 1900–2099), Amazigh-Jahr, Anwāʾ und Abschnitte.
import { parse, iso, TAG } from './datum.js';

export function fellahDatum(isoDatum, monate) {
  const j = new Date(parse(isoDatum).getTime() - 13 * TAG);
  return { tag: j.getUTCDate(), monat: j.getUTCMonth() + 1, monatName: monate[j.getUTCMonth()], jahr: j.getUTCFullYear() };
}

// Yennayer = 1. Januar fellahi = 14. Januar; Amazigh-Jahr = Jahr + 950 ab Yennayer.
export function amazighJahr(isoDatum) {
  const d = parse(isoDatum);
  const j = d.getUTCFullYear();
  const yennayer = Date.UTC(j, 0, 14);
  return d.getTime() >= yennayer ? j + 950 : j + 949;
}

const mmtt = (isoDatum) => isoDatum.slice(5);

// Liegt mm-tt im Bereich von..bis (auch über Jahreswechsel)?
function imBereich(t, von, bis) {
  return von <= bis ? t >= von && t <= bis : t >= von || t <= bis;
}

export function nawFuer(isoDatum, anwa) {
  const d = parse(isoDatum);
  const jahr = d.getUTCFullYear();
  // Start jedes Nawʾ im aktuellen und im Vorjahr prüfen
  let treffer = null;
  for (const versatz of [-1, 0]) {
    for (let i = 0; i < anwa.length; i++) {
      const [m, t] = anwa[i].start.split('-').map(Number);
      const start = Date.UTC(jahr + versatz, m - 1, t);
      const ende = start + (anwa[i].tage - 1) * TAG;
      if (d.getTime() >= start && d.getTime() <= ende) treffer = { ...anwa[i], nr: i + 1, von: iso(new Date(start)), bis: iso(new Date(ende)) };
    }
  }
  return treffer;
}

export function abschnittFuer(isoDatum, abschnitte) {
  const t = mmtt(isoDatum);
  return abschnitte.find((a) => imBereich(t, a.von, a.bis)) ?? null;
}
