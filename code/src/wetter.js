// Fallahkalender – Wetter: 7-Tage-Vorhersage von Open-Meteo (kostenlos, ohne Konto) und Warnregeln.
// Die Regeln sind reine Funktionen ohne Netz, damit sie getestet werden können.

export const WETTER_QUELLE = 'https://api.open-meteo.com/v1/forecast';
const TAGESWERTE = ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'precipitation_probability_max',
  'wind_speed_10m_max', 'wind_gusts_10m_max', 'et0_fao_evapotranspiration', 'relative_humidity_2m_mean'];

export function wetterAdresse(lat, lon) {
  const r = (x) => Math.round(x * 100) / 100;
  return `${WETTER_QUELLE}?latitude=${r(lat)}&longitude=${r(lon)}&daily=${TAGESWERTE.join(',')}`
    + '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=precipitation,precipitation_probability&forecast_hours=48&timezone=auto&forecast_days=7';
}

export async function wetterLaden(lat, lon) {
  const antwort = await fetch(wetterAdresse(lat, lon), { cache: 'no-store' });
  if (!antwort.ok) throw new Error(`Wetter ${antwort.status}`);
  return antwort.json();
}

// Antwort von Open-Meteo → Liste von Tagen
export function tageAus(j) {
  const d = j?.daily;
  if (!d?.time) return [];
  const z = (feld, i) => (Array.isArray(d[feld]) && typeof d[feld][i] === 'number' ? d[feld][i] : null);
  return d.time.map((datum, i) => ({
    datum,
    code: z('weather_code', i) ?? 0,
    tmax: z('temperature_2m_max', i),
    tmin: z('temperature_2m_min', i),
    regen: z('precipitation_sum', i) ?? 0,
    regenP: z('precipitation_probability_max', i),
    wind: z('wind_speed_10m_max', i) ?? 0,
    boeen: z('wind_gusts_10m_max', i) ?? 0,
    et0: z('et0_fao_evapotranspiration', i) ?? 0,
    feuchte: z('relative_humidity_2m_mean', i),
  }));
}

// WMO-Wettercode → Bildzeichen
export function wetterZeichen(code) {
  if (code >= 95) return 'wt-gewitter';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'wt-schnee';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'wt-regen';
  if (code === 45 || code === 48) return 'wt-nebel';
  if (code === 3) return 'wt-wolke';
  if (code === 1 || code === 2) return 'wt-wolkig';
  return 'wt-sonne';
}

// Grenzwerte
export const GRENZE = { frost: 2, frostHart: 0, hitze: 35, hitzeHart: 40, starkregen: 20, regen: 2, regenP: 50, sturm: 60, sturmHart: 80, spritzWind: 20, pilzFeuchte: 80 };

const frost = (d) => d.tmin !== null && d.tmin <= GRENZE.frost;
const hitze = (d) => d.tmax !== null && d.tmax >= GRENZE.hitze;
const starkregen = (d) => d.regen >= GRENZE.starkregen;
const regnet = (d) => d.regen >= GRENZE.regen && (d.regenP === null || d.regenP >= GRENZE.regenP);
const sturm = (d) => d.boeen >= GRENZE.sturm;
const pilzTag = (d) => d.tmax !== null && d.tmax >= 12 && d.tmax <= 28 && ((d.feuchte ?? 0) >= GRENZE.pilzFeuchte || d.regen >= 1);
// Ruhiger, trockener, nicht zu heißer Tag: gut zum Spritzen und Düngen
const gutTag = (d) => d.regen < 1 && (d.regenP === null || d.regenP < 40) && d.wind < GRENZE.spritzWind && d.boeen < 40 && (d.tmax ?? 20) < 32 && (d.tmin ?? 10) > 3;

// Warnungen für die nächsten Tage. Jede Warnung: { id, stufe: 'rot'|'gelb'|'gruen', zeichen, tage: [datum], werte: {}, tun: n, lassen: n }
// tun/lassen = Anzahl der Texte w.<id>.tun1… bzw. w.<id>.lassen1…
export function warnungen(tage, { frostEmpfindlich = false } = {}) {
  const aus = [];
  const daten = (f) => tage.filter(f).map((d) => d.datum);
  const minWert = (f, feld) => Math.min(...tage.filter(f).map((d) => d[feld]));
  const maxWert = (f, feld) => Math.max(...tage.filter(f).map((d) => d[feld]));

  if (tage.some(frost)) {
    const t = minWert(frost, 'tmin');
    aus.push({ id: 'frost', stufe: t <= GRENZE.frostHart || frostEmpfindlich ? 'rot' : 'gelb', zeichen: 'wt-frost', tage: daten(frost), werte: { t: Math.round(t) }, tun: 2, lassen: 2 });
  }
  let lauf = 0; let welle = 0;
  for (const d of tage) { lauf = hitze(d) ? lauf + 1 : 0; welle = Math.max(welle, lauf); }
  if (welle >= 3) {
    aus.push({ id: 'hitzewelle', stufe: 'rot', zeichen: 'wt-hitze', tage: daten(hitze), werte: { t: Math.round(maxWert(hitze, 'tmax')), n: welle }, tun: 3, lassen: 2 });
  } else if (tage.some(hitze)) {
    const t = maxWert(hitze, 'tmax');
    aus.push({ id: 'hitze', stufe: t >= GRENZE.hitzeHart ? 'rot' : 'gelb', zeichen: 'wt-hitze', tage: daten(hitze), werte: { t: Math.round(t) }, tun: 2, lassen: 2 });
  }
  if (tage.some(starkregen)) {
    aus.push({ id: 'starkregen', stufe: 'rot', zeichen: 'wt-gewitter', tage: daten(starkregen), werte: { mm: Math.round(maxWert(starkregen, 'regen')) }, tun: 2, lassen: 3 });
  }
  const leichterRegen = (d) => regnet(d) && !starkregen(d);
  if (tage.some(leichterRegen)) {
    const summe = tage.filter(leichterRegen).reduce((s, d) => s + d.regen, 0);
    aus.push({ id: 'regnet', stufe: 'gelb', zeichen: 'wt-regen', tage: daten(leichterRegen), werte: { mm: Math.round(summe) }, tun: 2, lassen: 1 });
  }
  if (tage.some(sturm)) {
    const b = maxWert(sturm, 'boeen');
    aus.push({ id: 'sturm', stufe: b >= GRENZE.sturmHart ? 'rot' : 'gelb', zeichen: 'wt-wind', tage: daten(sturm), werte: { kmh: Math.round(b) }, tun: 2, lassen: 2 });
  }
  // Pilzwetter: mindestens zwei Tage hintereinander feucht und mild
  const pilzTage = [];
  tage.forEach((d, i) => { if (pilzTag(d) && ((i > 0 && pilzTag(tage[i - 1])) || (i + 1 < tage.length && pilzTag(tage[i + 1])))) pilzTage.push(d.datum); });
  if (pilzTage.length) aus.push({ id: 'pilz', stufe: 'gelb', zeichen: 'wt-pilz', tage: pilzTage, werte: {}, tun: 2, lassen: 2 });
  // Trocken: kaum Regen, hohe Verdunstung
  const regenSumme = tage.reduce((s, d) => s + d.regen, 0);
  const et0Summe = tage.reduce((s, d) => s + d.et0, 0);
  if (tage.length && regenSumme < 5 && et0Summe >= 25) {
    aus.push({ id: 'trocken', stufe: 'gelb', zeichen: 'e-trocken', tage: [], werte: { m3: Math.round(et0Summe - regenSumme) * 10 }, tun: 2, lassen: 1 });
  }
  const gute = daten(gutTag).slice(0, 4);
  if (gute.length) aus.push({ id: 'gut', stufe: 'gruen', zeichen: 'wt-gut', tage: gute, werte: {}, tun: 1, lassen: 0 });
  const rang = { rot: 0, gelb: 1, gruen: 2 };
  return aus.sort((a, b) => rang[a.stufe] - rang[b.stufe]);
}

// Welches Wetter stört welche Aufgabe? Gibt den Grund zurück oder null.
export function stoerung(typ, d, frostEmpfindlich = false) {
  if (!d) return null;
  if (typ === 'duenger') {
    if (starkregen(d) || d.regen >= 10) return 'regen';
    if (sturm(d)) return 'wind';
    if (d.tmax !== null && d.tmax >= 38) return 'hitze';
  }
  if (typ === 'saat') {
    if (frost(d) && (frostEmpfindlich || d.tmin <= GRENZE.frostHart)) return 'frost';
    if (d.tmax !== null && d.tmax >= 36) return 'hitze';
    if (starkregen(d)) return 'regen';
    if (sturm(d)) return 'wind';
  }
  if (typ === 'pflege' || typ === 'befall') {
    if (regnet(d)) return 'regen';
    if (d.wind >= GRENZE.spritzWind || sturm(d)) return 'wind';
  }
  if (typ === 'boden' && (starkregen(d) || d.regen >= 10)) return 'regen';
  if (typ === 'ernte' && (starkregen(d) || sturm(d))) return d.regen >= GRENZE.starkregen ? 'regen' : 'wind';
  return null;
}

// Offene Aufgaben in den Vorhersagetagen mit dem Wetter abgleichen.
// aufgaben: [{ id, datum, typ, titel }] → [{ aufgabe, grund, neu | null }]
export function planAbgleich(aufgaben, tage, frostEmpfindlich = false) {
  const nachDatum = new Map(tage.map((d) => [d.datum, d]));
  const aus = [];
  for (const a of aufgaben) {
    const d = nachDatum.get(a.datum);
    const grund = stoerung(a.typ, d, frostEmpfindlich);
    if (!grund) continue;
    // nächster passender Tag, zuerst danach, sonst davor (ab heute)
    const i = tage.indexOf(d);
    const reihe = [...tage.slice(i + 1), ...tage.slice(0, i).reverse()];
    const neu = reihe.find((x) => !stoerung(a.typ, x, frostEmpfindlich));
    aus.push({ aufgabe: a, grund, neu: neu ? neu.datum : null });
  }
  return aus;
}

// Stündlicher Regen der nächsten 48 Stunden: [{ zeit, mm, p }]
export function stundenRegen(j) {
  const h = j?.hourly;
  if (!h?.time) return [];
  return h.time.map((zeit, i) => ({ zeit, mm: h.precipitation?.[i] ?? 0, p: h.precipitation_probability?.[i] ?? null }));
}

// ---------- Was geht an welchem Tag? ----------
// Ergebnis je Tätigkeit und Tag: 'ja' | 'frueh' (nur früh morgens oder abends) | 'nein'
export const TAETIGKEITEN = [
  ['spritzen', 't-befall'], ['duengen', 't-duenger'], ['pflanzen', 't-saat'], ['boden', 't-boden'], ['ernte', 't-ernte'], ['giessen', 't-wasser'],
];
export function taetigkeit(art, d, vortag) {
  const nass = d.regen >= GRENZE.regen && (d.regenP === null || d.regenP >= GRENZE.regenP);
  const tmax = d.tmax ?? 20;
  switch (art) {
    case 'spritzen':
      if (nass || d.regen >= 1 || d.wind >= GRENZE.spritzWind || sturm(d)) return 'nein';
      return tmax >= 28 ? 'frueh' : 'ja';
    case 'duengen':
      if (d.regen >= 10 || sturm(d) || tmax >= 38) return 'nein';
      return tmax >= 32 ? 'frueh' : 'ja';
    case 'pflanzen':
      if (frost(d) || tmax >= 36 || starkregen(d) || sturm(d)) return 'nein';
      return tmax >= 30 ? 'frueh' : 'ja';
    case 'boden':
      if (d.regen >= 5 || (vortag && vortag.regen >= 10)) return 'nein';
      return 'ja';
    case 'ernte':
      if (nass || sturm(d)) return 'nein';
      return tmax >= 32 ? 'frueh' : 'ja';
    case 'giessen':
      if (d.regen >= 5) return 'nein';
      return tmax >= 28 ? 'frueh' : 'ja';
    default: return 'ja';
  }
}
export function wasGeht(tage) {
  return TAETIGKEITEN.map(([art, zeichen]) => ({ art, zeichen, tage: tage.map((d, i) => taetigkeit(art, d, tage[i - 1])) }));
}

// ---------- Krankheiten und Schädlinge nach Wetter ----------
// Wetterlagen, die eine Krankheit fördern. tmax-Bereich, nass (Regen ≥ 1 mm oder Luftfeuchte ≥ 80 %), Mindestzahl Tage.
export const WETTERLAGEN = {
  kuehlNass: { tmax: [10, 25], nass: true, tage: 2 },
  warmNass: { tmax: [22, 33], nass: true, tage: 2 },
  warmTrocken: { tmax: [22, 33], nass: false, tage: 3 },
  heissTrocken: { tmax: [29, 50], nass: false, tage: 3 },
  mild: { tmax: [15, 27], nass: false, tage: 3 },
  hitze: { tmax: [35, 55], nass: null, tage: 2 },
};
// Welche Krankheit bei welcher Wetterlage (IDs aus krankheiten.json)
export const KRANKHEIT_WETTER = {
  krautfaeule: 'kuehlNass', zw_falscher_mehltau: 'kuehlNass', kuerbis_falscher_mehltau: 'kuehlNass', grauschimmel: 'kuehlNass',
  schokoflecken: 'kuehlNass', ascochyta: 'kuehlNass', septoria: 'kuehlNass', rost: 'kuehlNass', netzflecken: 'kuehlNass',
  duerrflecken: 'warmNass', purpurflecken: 'warmNass', karotte_alternaria: 'warmNass', phytophthora_capsici: 'warmNass', wurzelfaeule: 'warmNass',
  echter_mehltau: 'warmTrocken', leveillula: 'warmTrocken', getreide_mehltau: 'warmTrocken',
  spinnmilben: 'heissTrocken', thripse: 'heissTrocken', weisse_fliege: 'heissTrocken', tuta: 'heissTrocken', helicoverpa: 'heissTrocken',
  kartoffelmotte: 'heissTrocken', minierfliege: 'heissTrocken', tylcv: 'heissTrocken',
  blattlaeuse: 'mild', erdraupen: 'mild', luzerneruessler: 'mild',
  bluetenendfaeule: 'hitze', wassermangel: 'hitze', salzschaden: 'hitze',
};
function lagePasst(lage, d) {
  if (d.tmax === null) return false;
  if (d.tmax < lage.tmax[0] || d.tmax > lage.tmax[1]) return false;
  const nass = d.regen >= 1 || (d.feuchte ?? 0) >= GRENZE.pilzFeuchte;
  return lage.nass === null || lage.nass === nass;
}
// Welche Wetterlagen kommen in den nächsten Tagen vor? → { lage: [datum] }
export function wetterlagen(tage) {
  const aus = {};
  for (const [name, lage] of Object.entries(WETTERLAGEN)) {
    const treffer = tage.filter((d) => lagePasst(lage, d)).map((d) => d.datum);
    if (treffer.length >= lage.tage) aus[name] = treffer;
  }
  return aus;
}
// Risiken für die Kultur(en): [{ id, lage, tage, stufe }]
export function krankheitsRisiken(tage, krankheiten, passt) {
  const lagen = wetterlagen(tage);
  const aus = [];
  for (const kr of krankheiten) {
    const lage = KRANKHEIT_WETTER[kr.id];
    if (!lage || !lagen[lage]) continue;
    if (!passt(kr)) continue;
    const n = lagen[lage].length;
    aus.push({ id: kr.id, lage, tage: lagen[lage], stufe: n >= WETTERLAGEN[lage].tage + 2 ? 'hoch' : 'mittel' });
  }
  return aus.sort((a, b) => (a.stufe === b.stufe ? 0 : a.stufe === 'hoch' ? -1 : 1));
}

// ---------- Regenradar (RainViewer, kostenlos) ----------
export const RADAR_INDEX = 'https://api.rainviewer.com/public/weather-maps.json';
export function kachel(lat, lon, z) {
  const n = 2 ** z;
  const x = ((lon + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  return { x, y };
}
