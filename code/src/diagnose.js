// Krankheitshilfe ohne KI: Symptome + Beschreibung → wahrscheinliche Ursachen, Kontrolltermine.
import { plusTage } from './datum.js';
import { t } from './i18n.js';


// Kleinbuchstaben, Umlaute ausschreiben, damit „Blätter“ und „Blaetter“ gleich gefunden werden.
export function normal(text) {
  return String(text ?? '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a').replace(/ç/g, 'c').replace(/[ïî]/g, 'i').replace(/ô/g, 'o')
    .replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

// Liste der Kultur-IDs, für die ein Eintrag gilt (Gruppen wie „kuerbis“ werden aufgelöst).
export function kulturenVon(eintrag, kat, alleIds) {
  const ids = new Set();
  for (const k of eintrag.k) {
    if (k === 'alle') alleIds.forEach((x) => ids.add(x));
    else if (kat.gruppenKulturen[k]) kat.gruppenKulturen[k].forEach((x) => ids.add(x));
    else ids.add(k);
  }
  return ids;
}

// Symptome, die im freien Text beschrieben sind.
export function symptomeAusText(text, kat) {
  const t = normal(text);
  if (!t.trim()) return [];
  return kat.symptome.filter((s) => s.kw.some((w) => t.includes(normal(w)))).map((s) => s.id);
}

// anfrage: { kultur, symptome: [ids], text, wetter: 'feucht'|'trocken'|'' }
// feld (optional): für Bodenhinweise (pH, Salz, frühere Probleme)
export function diagnose(anfrage, kat, kulturen, feld = {}) {
  const alleIds = kulturen.map((k) => k.id);
  const gewaehlt = new Set([...(anfrage.symptome ?? []), ...symptomeAusText(anfrage.text, kat)]);
  const text = normal(anfrage.text);
  const kultur = kulturen.find((k) => k.id === anfrage.kultur);
  const ergebnis = [];

  for (const kr of kat.krankheiten) {
    if (anfrage.kultur && !kulturenVon(kr, kat, alleIds).has(anfrage.kultur)) continue;
    let treffer = 0;
    const passend = [];
    for (const s of gewaehlt) if (kr.s[s]) { treffer += kr.s[s]; passend.push(s); }
    const fremd = gewaehlt.size - passend.length;
    const genannt = text && kr.kw.some((w) => text.includes(normal(w)));
    if (!treffer && !genannt) continue;

    let punkte = treffer + (genannt ? 3 : 0) - 0.5 * fremd;
    const warum = [];
    if (anfrage.wetter && kr.bed && anfrage.wetter === kr.bed) { punkte += 1; warum.push(t(kr.bed === 'feucht' ? 'd.w.feucht' : 'd.w.trocken')); }
    const b = feld.boden ?? {};
    if (kr.id === 'eisenmangel' && (b.ph > 7.5 || b.kalk === 'hoch')) { punkte += 1; warum.push(t('d.w.kalk')); }
    if (kr.id === 'salzschaden' && kultur && (feld.wasser?.ec > kultur.salzOhneVerlust || b.salz > kultur.salzOhneVerlust)) { punkte += 1; warum.push(t('d.w.salz')); }
    if (kr.id === 'nematoden' && feld.probleme?.includes('nematoden')) { punkte += 1; warum.push(t('d.w.nematoden')); }
    if (kr.id === 'fusarium' && feld.probleme?.includes('welke')) { punkte += 1; warum.push(t('d.w.welke')); }
    if (genannt) warum.push(t('d.w.genannt'));

    const maxW = Object.values(kr.s).reduce((x, y) => x + y, 0);
    const anteil = Math.min(1, treffer / maxW);
    const sicherheit = anteil >= 0.6 && fremd <= 1 ? 'hoch' : anteil >= 0.4 || genannt ? 'mittel' : 'niedrig';
    ergebnis.push({ krankheit: kr, punkte, anteil, sicherheit, passend, warum });
  }
  ergebnis.sort((a, b) => b.punkte - a.punkte || b.anteil - a.anteil);
  return { liste: ergebnis.slice(0, 5), symptome: [...gewaehlt] };
}

// Nachkontrollen: Tag 3, 7, 14, danach wöchentlich bis zum Ende (höchstens 16 Termine).
export function kontrollTermine(start, ende) {
  const tage = [3, 7, 14];
  const letzte = ende && ende > start ? Math.round((Date.parse(ende) - Date.parse(start)) / 86400000) : 56;
  for (let t = 21; t <= letzte && tage.length < 16; t += 7) tage.push(t);
  return tage.filter((t) => t <= Math.max(letzte, 14)).map((t) => ({ tag: t, datum: plusTage(start, t) }));
}

// Letzter erlaubter Einsatztag eines Mittels vor dem Erntebeginn.
export function letzterEinsatz(ernteBeginn, wartezeit) {
  return ernteBeginn ? plusTage(ernteBeginn, -wartezeit) : null;
}
