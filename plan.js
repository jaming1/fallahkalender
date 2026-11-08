// Anbauplan: Aufgaben vom Boden bis zur Ernte und Düngeplan für das eigene Feld.
import { plusTage } from './datum.js';
import { t, zahl, datum } from './i18n.js';

const STUFE_PK = { niedrig: 1.3, mittel: 1, hoch: 0.5 };
const STUFE_N = { niedrig: 1.1, mittel: 1, hoch: 0.8 };

export function duengeplan(kulturId, feld, anbau, kulturen) {
  const a = anbau.kulturen[kulturId];
  const [nB, pB, kB] = a.bedarf;
  const b = feld.boden ?? {};
  let n = nB * (STUFE_N[b.n] ?? 1);
  const p = pB * (STUFE_PK[b.p] ?? 1);
  const k = kB * (STUFE_PK[b.k] ?? 1);
  const hinweise = [];
  const vor = kulturen.find((x) => x.id === feld.vorjahre?.[0]);
  if (vor?.familie === 'huelsen' && kulturen.find((x) => x.id === kulturId)?.familie !== 'huelsen') { n -= 30; hinweise.push(t('p.minusHuelsen')); }
  if ((b.humus ?? 0) > 2) { n -= 20; hinweise.push(t('p.minusHumus')); }
  if (!b.n && !b.p && !b.k) hinweise.push(t('p.ohneAnalyse'));
  n = Math.max(0, Math.round(n));
  const ha = feld.flaeche > 0 ? feld.flaeche : 1;
  const kalkig = (b.ph ?? 7) > 7.5;
  const nDuenger = anbau.duenger[kalkig ? 'ammonsulfat' : 'harnstoff'];
  if (kalkig) hinweise.push(t('p.kalkig'));

  // Aufteilung: P ganz zur Grunddüngung; K 40 % Grund, Rest auf K-Gaben; N 25 % Grund (Hülsen: alles Grund), Rest auf N-Gaben
  const gaben = [];
  const nGrund = a.nGaben.length ? Math.round(n * 0.25) : n;
  const kGrund = a.kGaben.length ? Math.round(k * 0.4) : Math.round(k);
  gaben.push({ tag: -7, titel: t('p.grund'), n: nGrund, p: Math.round(p), k: kGrund });
  const nRest = n - nGrund;
  a.nGaben.forEach((tg) => gaben.push({ tag: tg, titel: t('p.n'), n: Math.round(nRest / a.nGaben.length), p: 0, k: 0 }));
  const kRest = Math.round(k) - kGrund;
  a.kGaben.forEach((tg) => {
    const g = gaben.find((x) => x.tag === tg);
    const menge = Math.round(kRest / a.kGaben.length);
    if (g) { g.k += menge; g.titel = t('p.nk'); } else gaben.push({ tag: tg, titel: t('p.k'), n: 0, p: 0, k: menge });
  });
  gaben.sort((x, y) => x.tag - y.tag);

  const produkt = (nKg, pKg, kKg) => {
    const teile = [];
    if (pKg > 0) teile.push(t('p.menge', { kg: zahl(Math.round(pKg / anbau.duenger.tsp.p), 0), name: anbau.duenger.tsp.name }));
    if (nKg > 0) teile.push(t('p.menge', { kg: zahl(Math.round(nKg / nDuenger.n), 0), name: nDuenger.name }));
    if (kKg > 0) teile.push(t('p.menge', { kg: zahl(Math.round(kKg / anbau.duenger.kaliumsulfat.k), 0), name: anbau.duenger.kaliumsulfat.name }));
    return teile;
  };
  const nId = kalkig ? 'ammonsulfat' : 'harnstoff';
  for (const g of gaben) {
    g.produkte = [g.p > 0 && 'tsp', g.n > 0 && nId, g.k > 0 && 'kaliumsulfat'].filter(Boolean);
    g.jeHa = produkt(g.n, g.p, g.k);
    g.feld = produkt(g.n * ha, g.p * ha, g.k * ha);
  }
  const mistT = 25;
  const mist = { tonnenJeHa: mistT, n: Math.round(mistT * anbau.mist.n * anbau.mist.nWirkung), p: Math.round(mistT * anbau.mist.p), k: Math.round(mistT * anbau.mist.k) };
  return { gesamt: { n, p: Math.round(p), k: Math.round(k) }, ha, gaben, hinweise, mist };
}

// Erster sinnvoller Starttermin: ab heute der nächste Pflanzmonat der Region.
export function vorschlagStart(heute, pflanzmonate) {
  if (!pflanzmonate?.length) return heute;
  const [j, m] = heute.split('-').map(Number);
  for (let i = 0; i < 12; i++) {
    const mon = ((m - 1 + i) % 12) + 1;
    if (pflanzmonate.includes(mon)) {
      if (i === 0) return heute;
      const jahr = j + Math.floor((m - 1 + i) / 12);
      return `${jahr}-${String(mon).padStart(2, '0')}-01`;
    }
  }
  return heute;
}

export function aufgaben(kulturId, start, feld, daten) {
  const a = daten.anbau.kulturen[kulturId];
  const k = daten.kulturen.find((x) => x.id === kulturId);
  const liste = [];
  const add = (tag, typ, titel, text, bilder = []) => liste.push({ id: `${typ}-${tag}-${liste.length}`, tag, datum: plusTage(start, tag), typ, titel, text, bilder });

  if (!feld.boden?.ph) add(-28, 'boden', t('p.a.probe'), t('p.a.probe.t'));
  if (a.art === 'pflanzung' && a.vorziehen > 0) add(-a.vorziehen, 'saat', t('p.a.jung'), t('p.a.jung.t', { kultur: k.name, wochen: Math.round(a.vorziehen / 7) }));
  add(-14, 'boden', t('p.a.boden'), t('p.a.boden.t'));
  if (feld.wasser?.art && feld.wasser.art !== 'regen') add(-3, 'wasser', t('p.a.wasser'), t('p.a.wasser.t'));

  const dp = duengeplan(kulturId, feld, daten.anbau, daten.kulturen);
  for (const g of dp.gaben) {
    const teile = [];
    if (g.n) teile.push(`\u2066${zahl(g.n, 0)} N\u2069`);
    if (g.p) teile.push(`\u2066${zahl(g.p, 0)} P₂O₅\u2069`);
    if (g.k) teile.push(`\u2066${zahl(g.k, 0)} K₂O\u2069`);
    add(g.tag, 'duenger', g.titel, t('p.a.duenger.t', { jeHa: `${teile.join(t('komma'))} ${t('einheit.kg')}`, ha: zahl(dp.ha, 2), feld: g.feld.join(' + ') }), g.produkte.map((id) => `duenger:${id}`));
  }
  add(0, 'saat', t(a.art === 'pflanzung' ? 'p.a.pflanzen' : 'p.a.saeen', { kultur: k.name }), t('p.a.saat.t', { abstand: a.abstand, tiefe: a.tiefe }));
  for (const [tag, titel, text] of a.pflege) add(tag, 'pflege', titel, text);
  for (let tg = 14; tg < a.ernte[0]; tg += 14) add(tg, 'kontrolle', t('p.a.kontrolle'), t('p.a.kontrolle.t'));
  const lang = a.ernte[1] - a.ernte[0] > 20;
  add(a.ernte[0], 'ernte', t('p.a.ernte'), lang ? t('p.a.ernte.bis', { datum: datum(plusTage(start, a.ernte[1])) }) : t('p.a.ernte.t'));
  if (lang) add(a.ernte[1], 'ernte', t('p.a.ernteEnde'), t('p.a.ernteEnde.t'));
  return { liste: liste.sort((x, y) => x.tag - y.tag || x.id.localeCompare(y.id)), duengeplan: dp, anleitung: a };
}
