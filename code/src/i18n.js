// Sprachen: Texte nach Schlüssel, Zahlen und Daten immer mit Ziffern 0–9.
import { parse } from './datum.js';

export const SPRACHEN = {
  ar: { name: 'العربية', dir: 'rtl', locale: 'ar-MA-u-nu-latn', stimme: ['ar-MA', 'ar'] },
  dar: { name: 'الدارجة', dir: 'rtl', locale: 'ar-MA-u-nu-latn', stimme: ['ar-MA', 'ar'], basis: 'ar' },
  fr: { name: 'Français', dir: 'ltr', locale: 'fr-MA', stimme: ['fr-MA', 'fr-FR', 'fr'] },
  zgh: { name: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', dir: 'ltr', locale: 'fr-MA', stimme: [], basis: 'ar' }
};
export const STANDARD = 'ar';

let aktuell = STANDARD;
let texte = {};

export function setzeSprache(code, ui) {
  aktuell = SPRACHEN[code] ? code : STANDARD;
  texte = ui ?? {};
}
export function sprache() { return aktuell; }
export function info() { return SPRACHEN[aktuell]; }

// t('schluessel', { n: 3 }) → Text mit eingesetzten Werten; fehlt er, erscheint der Schlüssel (fällt im Test auf).
export function t(schluessel, werte = {}) {
  const roh = texte[schluessel];
  if (roh === undefined) return schluessel;
  return String(roh).replace(/\{(\w+)\}/g, (_, k) => (werte[k] === undefined ? '' : String(werte[k])));
}
export function hatText(schluessel) { return texte[schluessel] !== undefined; }

export function zahl(wert, stellen = 1) {
  return Number(wert).toLocaleString(SPRACHEN[aktuell].locale, { maximumFractionDigits: stellen });
}

// Monatsnamen kommen aus den Sprachdaten (monat.1 … monat.12), damit auch Tifinagh und Darija stimmen.
export function monatName(m, lang = true) {
  return t(lang ? `monat.${m}` : `monat.k.${m}`);
}
export function datum(isoDatum, lang = false) {
  const d = parse(isoDatum);
  return t('datum.format', { t: d.getUTCDate(), m: monatName(d.getUTCMonth() + 1, lang), j: d.getUTCFullYear() });
}
export function monatJahr(isoMonat) {
  const [j, m] = isoMonat.split('-').map(Number);
  return t('datum.monatJahr', { m: monatName(m), j });
}

// Sprachdaten über die Fachdaten legen: Objekte nach Schlüssel, Listen mit id nach id, sonst nach Stelle.
export function ueberlagere(basis, ueber) {
  if (ueber === undefined || ueber === null) return basis;
  if (typeof ueber !== 'object') return ueber;
  if (Array.isArray(basis)) {
    // Reine Textlisten (z. B. Suchwörter) ersetzen, alles andere nach Stelle überlagern
    if (Array.isArray(ueber)) return ueber.every((x) => typeof x === 'string') ? ueber : basis.map((x, i) => ueberlagere(x, ueber[i]));
    return basis.map((x) => (x && typeof x === 'object' && x.id !== undefined && ueber[x.id] !== undefined ? ueberlagere(x, ueber[x.id]) : x));
  }
  if (basis && typeof basis === 'object') {
    const neu = { ...basis };
    for (const [k, v] of Object.entries(ueber)) neu[k] = ueberlagere(basis[k], v);
    return neu;
  }
  return ueber;
}
