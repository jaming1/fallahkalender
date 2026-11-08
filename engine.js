// Fallahkalender – Empfehlungs-Logik.
// Reine Funktionen ohne Browser-Abhängigkeit, damit sie mit Node getestet werden können.

import { t, zahl, monatName } from './i18n.js';

export { zahl };
const WIRKUNGSGRAD = { tropf: 0.9, beregnung: 0.75, furche: 0.6 };
export const STUFEN = ['sehr-gut', 'gut', 'eingeschraenkt', 'ungeeignet'];

function hat(wert) {
  return wert !== undefined && wert !== null && wert !== '' && !Number.isNaN(wert);
}

export function monatsliste(monate) {
  return [...monate].sort((a, b) => a - b).map((m) => monatName(m, false)).join(t('komma'));
}

// Nächster Ort aus der Liste → Klimazone (für GPS).
export function zoneAusKoordinaten(lat, lon, orte) {
  let best = null;
  let bestDist = Infinity;
  for (const [name, olat, olon, zone] of orte) {
    const d = (lat - olat) ** 2 + ((lon - olon) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestDist) { bestDist = d; best = { ort: name, zone }; }
  }
  return best;
}

// Ertragsanteil bei Salz (linear zwischen Schwelle und halbem Ertrag).
function salzBewertung(ec, ohne, halb, quelle) {
  const v = { ec: zahl(ec), ohne: zahl(ohne) };
  if (ec <= ohne) return { art: 'ok', id: `e.salz.ok.${quelle}`, text: t(`e.salz.ok.${quelle}`, v) };
  if (ec >= halb) return { art: 'bad', id: `e.salz.bad.${quelle}`, text: t(`e.salz.bad.${quelle}`, v) };
  v.verlust = Math.round((50 * (ec - ohne)) / (halb - ohne));
  return { art: 'warn', id: `e.salz.warn.${quelle}`, text: t(`e.salz.warn.${quelle}`, v) };
}
const grund = (art, id, werte = {}, key) => ({ art, id, key, text: t(id, werte) });

function bewerteKultur(k, feld, daten) {
  const g = [];
  const zone = daten.zonen.find((z) => z.id === feld.zone);
  const kulturName = (id) => daten.kulturen.find((x) => x.id === id)?.name ?? id;
  const famName = (f) => daten.familien[f] ?? f;
  let maxFlaeche = null;

  // 1. Boden-pH
  const bph = feld.boden?.ph;
  if (hat(bph)) {
    const [a, b] = k.ph;
    const [ga, gb] = k.phGrenze;
    const v = { ph: zahl(bph), a: zahl(a), b: zahl(b), ga: zahl(ga), gb: zahl(gb) };
    if (bph >= a && bph <= b) g.push(grund('ok', 'e.ph.ideal', v));
    else if (bph >= ga && bph <= gb) g.push(grund('warn', 'e.ph.geht', v, bph > b ? 'ph-hoch' : 'ph-niedrig'));
    else g.push(grund('bad', 'e.ph.nein', v, bph > gb ? 'ph-hoch' : 'ph-niedrig'));
  }

  // 2. Bodenart
  const art = feld.boden?.art;
  if (art && k.boden[art] !== undefined) {
    const p = k.boden[art];
    if (p === 2) g.push(grund('ok', `e.boden.gut.${art}`));
    else if (p === 1) g.push(grund('ok', `e.boden.geht.${art}`));
    else g.push(grund('warn', art === 'ton' ? (k.familie === 'doldenbluetler' || k.id === 'kartoffel' ? 'e.boden.ton.knolle' : 'e.boden.ton') : `e.boden.schlecht.${art}`, {}, `boden-${art}`));
  }

  // 3. Salz im Wasser und im Boden
  const bewaessert = feld.wasser?.art && feld.wasser.art !== 'regen';
  if (bewaessert && hat(feld.wasser?.ec)) g.push({ ...salzBewertung(feld.wasser.ec, k.salzOhneVerlust, k.salzHalbErtrag, 'wasser'), key: 'salz-wasser' });
  if (hat(feld.boden?.salz)) g.push({ ...salzBewertung(feld.boden.salz, k.salzOhneVerlust * 1.5, k.salzHalbErtrag * 1.5, 'boden'), key: 'salz-boden' });

  // 4. Wassermenge
  if (zone && feld.wasser?.art) {
    const regen = k.regenSaison === 'winter' ? zone.regenWinter : k.regenSaison === 'sommer' ? zone.regenSommer : zone.regenWinter + zone.regenSommer;
    const bedarfMm = Math.max(0, k.wasser - regen);
    if (!bewaessert) {
      const anteil = regen / k.wasser;
      if (k.regenfeldbau && anteil >= 0.6) g.push(grund('ok', 'e.regen.ok'));
      else if (k.regenfeldbau && anteil >= 0.4) g.push(grund('warn', 'e.regen.riskant', {}, 'regen-fehlt'));
      else g.push(grund('bad', 'e.regen.nein', { bedarf: zahl(k.wasser, 0), regen: zahl(regen, 0) }, 'regen-fehlt'));
    } else if (hat(feld.wasser?.menge) && hat(feld.flaeche) && feld.flaeche > 0) {
      const eff = WIRKUNGSGRAD[feld.wasser.art] ?? 0.7;
      const bedarfM3 = (bedarfMm * 10 * feld.flaeche) / eff;
      const angebot = feld.wasser.menge * k.tage;
      maxFlaeche = bedarfMm > 0 ? (angebot * eff) / (bedarfMm * 10) : Infinity;
      if (bedarfMm === 0 || angebot >= bedarfM3) {
        g.push(grund('ok', 'e.wasser.ok', { bedarf: zahl(bedarfM3, 0) }));
      } else if (angebot >= 0.6 * bedarfM3) {
        g.push(grund('warn', 'e.wasser.knapp', { max: zahl(maxFlaeche, 2), ha: zahl(feld.flaeche, 2) }, 'wasser-knapp'));
      } else {
        g.push(grund('bad', 'e.wasser.nein', { max: zahl(maxFlaeche, 2), bedarf: zahl(bedarfM3, 0), hast: zahl(angebot, 0) }, 'wasser-knapp'));
      }
    }
  }

  // 5. Pflanzzeit
  const monate = zone ? k.pflanzen[zone.id] ?? [] : [];
  if (zone && feld.startMonat) {
    const m = Number(feld.startMonat);
    const naechster = (m % 12) + 1;
    if (monate.includes(m)) g.push(grund('ok', 'e.saison.gut', { monat: monatName(m) }));
    else if (monate.includes(naechster)) g.push(grund('ok', 'e.saison.bald', { monat: monatName(naechster) }));
    else g.push(grund('warn', 'e.saison.nein', { monate: monatsliste(monate) }, 'saison'));
  }

  // 6. Fruchtfolge (Vorjahr = Index 0)
  const vorjahre = feld.vorjahre ?? [];
  const letztes = vorjahre[0];
  let ffGemeldet = false;
  if (letztes === k.id) {
    ffGemeldet = true;
    if (k.id === 'luzerne') g.push(grund('ok', 'e.ff.luzerne'));
    else if (k.pause <= 1) g.push(grund('warn', 'e.ff.wieder', { kultur: k.name }, 'fruchtfolge'));
    else g.push(grund('bad', 'e.ff.pause', { kultur: k.name, n: k.pause }, 'fruchtfolge'));
  }
  if (!ffGemeldet) {
    for (let i = 0; i < vorjahre.length; i++) {
      const v = daten.kulturen.find((x) => x.id === vorjahre[i]);
      if (!v || v.familie !== k.familie || i >= k.pause) continue;
      if (k.pause <= 1) continue; // Getreide nach anderem Getreide: üblich
      const wann = i === 0 ? t('e.ff.letztesJahr') : t('e.ff.vorJahren', { n: i + 1 });
      g.push(grund('warn', 'e.ff.familie', { vor: kulturName(v.id), familie: famName(v.familie), wann, kultur: k.name, n: k.pause }, 'fruchtfolge'));
      break;
    }
  }
  const vor = daten.kulturen.find((x) => x.id === letztes);
  if (vor?.familie === 'huelsen' && k.familie !== 'huelsen') {
    g.push(grund('plus', 'e.ff.huelsen', { vor: vor.name }));
  }

  // 7. Bekannte Probleme und Kalk
  const probleme = feld.probleme ?? [];
  if (probleme.includes('nematoden') && k.nematoden) g.push(grund('warn', 'e.nematoden', {}, 'nematoden'));
  if (probleme.includes('welke') && k.welke) g.push(grund('warn', 'e.welke', {}, 'welke'));
  if (feld.boden?.kalk === 'hoch' && k.kalk) {
    g.push(grund('warn', k.id === 'kartoffel' ? 'e.kalk.kartoffel' : 'e.kalk', { kultur: k.name }, 'kalk'));
  }

  const anzahl = (a) => g.filter((x) => x.art === a).length;
  const bad = anzahl('bad');
  const warn = anzahl('warn');
  const stufe = bad > 0 ? 'ungeeignet' : warn === 0 ? 'sehr-gut' : warn === 1 ? 'gut' : 'eingeschraenkt';
  const punkte = 100 - 50 * bad - 15 * warn + 5 * anzahl('plus');
  return { kultur: k, stufe, punkte, gruende: g, maxFlaeche, pflanzmonate: monate };
}

const REIHENFOLGE = STUFEN;

export function bewerte(feld, daten) {
  return daten.kulturen
    .map((k) => bewerteKultur(k, feld, daten))
    .sort((a, b) => REIHENFOLGE.indexOf(a.stufe) - REIHENFOLGE.indexOf(b.stufe) || b.punkte - a.punkte || a.kultur.name.localeCompare(b.kultur.name));
}

// Allgemeine Hinweise zum Feld, unabhängig von der Kultur.
export function feldHinweise(feld) {
  const h = [];
  const w = feld.wasser ?? {};
  const b = feld.boden ?? {};
  const bewaessert = w.art && w.art !== 'regen';
  if (bewaessert && hat(w.ph) && w.ph > 8.0) h.push(t('h.wasserPhHoch', { ph: zahl(w.ph) }));
  if (bewaessert && hat(w.ph) && w.ph < 6.0) h.push(t('h.wasserPhNiedrig', { ph: zahl(w.ph) }));
  if ((bewaessert && hat(w.ec) && w.ec > 3) || (feld.probleme ?? []).includes('salz')) h.push(t('h.salz'));
  if (hat(b.ph) && b.ph > 8.2) h.push(t('h.bodenPhHoch', { ph: zahl(b.ph) }));
  if (hat(b.humus) && b.humus < 1) h.push(t('h.humus', { humus: zahl(b.humus) }));
  if (b.p === 'niedrig') h.push(t('h.p'));
  if (b.k === 'niedrig') h.push(t('h.k'));
  if ((feld.probleme ?? []).includes('unkraut')) h.push(t('h.unkraut'));

  const fehlt = [];
  if (!feld.zone) fehlt.push('region');
  if (!hat(b.ph)) fehlt.push('bodenPh');
  if (!b.art) fehlt.push('bodenArt');
  if (!w.art) fehlt.push('wasserArt');
  if (bewaessert && !hat(w.ec)) fehlt.push('wasserEc');
  if (bewaessert && !hat(w.menge)) fehlt.push('wasserMenge');
  if (!hat(feld.flaeche)) fehlt.push('flaeche');
  return { hinweise: h, fehlt };
}

// Maßnahmen, damit eine Kultur machbar wird: je Problem, vom einfachsten zum schwierigsten.
export function massnahmenFuer(eintrag, katalog) {
  const gesehen = new Set();
  const liste = [];
  for (const g of eintrag.gruende) {
    if ((g.art !== 'warn' && g.art !== 'bad') || !g.key || gesehen.has(g.key)) continue;
    gesehen.add(g.key);
    const p = katalog.probleme[g.key];
    if (!p) continue;
    liste.push({ key: g.key, titel: p.titel, schwer: g.art === 'bad', massnahmen: [...p.massnahmen].sort((a, b) => a.a - b.a) });
  }
  // Schwere Probleme zuerst, dann nach Reihenfolge der Prüfung
  return liste.sort((a, b) => Number(b.schwer) - Number(a.schwer));
}
