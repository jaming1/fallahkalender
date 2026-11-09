import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tageAus, warnungen, planAbgleich, wasGeht, krankheitsRisiken, wetterZeichen, kachel, KRANKHEIT_WETTER, wetterAdresse } from '../src/wetter.js';

const ar = JSON.parse(readFileSync(new URL('../src/sprachen/ar.json', import.meta.url))).ui;
const krank = JSON.parse(readFileSync(new URL('../src/daten/krankheiten.json', import.meta.url))).krankheiten;

const tag = (datum, x = {}) => ({ datum, code: 0, tmax: 24, tmin: 12, regen: 0, regenP: 0, wind: 8, boeen: 15, et0: 3, feuchte: 55, ...x });
const woche = (f) => Array.from({ length: 7 }, (_, i) => tag(`2026-11-${String(10 + i).padStart(2, '0')}`, f(i)));

test('Open-Meteo-Antwort wird gelesen', () => {
  const t = tageAus({ daily: { time: ['2026-11-10'], weather_code: [61], temperature_2m_max: [18], temperature_2m_min: [9], precipitation_sum: [4.2], precipitation_probability_max: [80], wind_speed_10m_max: [12], wind_gusts_10m_max: [30], et0_fao_evapotranspiration: [2], relative_humidity_2m_mean: [88] } });
  assert.equal(t[0].regen, 4.2);
  assert.equal(wetterZeichen(t[0].code), 'wt-regen');
  assert.match(wetterAdresse(30.42, -9.6), /latitude=30.42&longitude=-9.6/);
});

test('Ruhiges Wetter: nur gute Tage, keine Warnung', () => {
  const w = warnungen(woche(() => ({})));
  assert.deepEqual(w.map((x) => x.id), ['gut']);
});

test('Frost, Starkregen, Sturm und Hitzewelle werden erkannt', () => {
  const w = warnungen(woche((i) => (i === 0 ? { tmin: -1 } : i === 1 ? { regen: 35, regenP: 90 } : i === 2 ? { boeen: 85 } : { tmax: 41 })));
  const ids = w.map((x) => x.id);
  for (const id of ['frost', 'starkregen', 'sturm', 'hitzewelle']) assert.ok(ids.includes(id), id);
  assert.equal(w[0].stufe, 'rot');
});

test('Jede Warnung hat Titel und alle Tun-/Lassen-Texte in der Sprachdatei', () => {
  const alle = [
    ...warnungen(woche((i) => (i === 0 ? { tmin: 1 } : i === 1 ? { regen: 30 } : i === 2 ? { boeen: 65 } : { tmax: 37 }))),
    ...warnungen(woche(() => ({ tmax: 18, regen: 4, regenP: 80, feuchte: 90 }))),
    ...warnungen(woche(() => ({ tmax: 36, et0: 7 }))),
    ...warnungen(woche((i) => (i === 3 ? { tmax: 36 } : {}))),
  ];
  const ids = new Set(alle.map((w) => w.id));
  for (const id of ['frost', 'hitze', 'hitzewelle', 'starkregen', 'regnet', 'sturm', 'pilz', 'trocken', 'gut']) assert.ok(ids.has(id), `Regel ${id} nicht getroffen`);
  for (const w of alle) {
    assert.ok(ar[`w.${w.id}.titel`], `w.${w.id}.titel`);
    for (let i = 1; i <= w.tun; i++) assert.ok(ar[`w.${w.id}.tun${i}`], `w.${w.id}.tun${i}`);
    for (let i = 1; i <= w.lassen; i++) assert.ok(ar[`w.${w.id}.lassen${i}`], `w.${w.id}.lassen${i}`);
  }
});

test('Düngung vor Starkregen wird auf einen trockenen Tag verschoben', () => {
  const tage = woche((i) => (i === 1 ? { regen: 25 } : {}));
  const r = planAbgleich([{ id: 'd', datum: tage[1].datum, typ: 'duenger', titel: 'N' }], tage);
  assert.equal(r.length, 1);
  assert.equal(r[0].grund, 'regen');
  assert.equal(r[0].neu, tage[2].datum);
});

test('Was geht: Spritzen nicht bei Wind, nur früh bei Wärme', () => {
  const tage = [tag('2026-11-10', { wind: 30 }), tag('2026-11-11', { tmax: 30 }), tag('2026-11-12')];
  const spritzen = wasGeht(tage).find((x) => x.art === 'spritzen');
  assert.deepEqual(spritzen.tage, ['nein', 'frueh', 'ja']);
});

test('Kühl und nass fördert Kraut- und Knollenfäule bei Tomate', () => {
  const tage = woche(() => ({ tmax: 18, regen: 3, feuchte: 90 }));
  const r = krankheitsRisiken(tage, krank, (kr) => kr.k.includes('tomate'));
  assert.ok(r.some((x) => x.id === 'krautfaeule'));
  assert.ok(!r.some((x) => x.id === 'spinnmilben'));
});

test('Wetterregeln verweisen nur auf vorhandene Krankheiten und Texte', () => {
  const ids = new Set(krank.map((k) => k.id));
  for (const [id, lage] of Object.entries(KRANKHEIT_WETTER)) {
    assert.ok(ids.has(id), id);
    assert.ok(ar[`w.lage.${lage}`] && ar[`w.kontrolle.${lage}`], lage);
  }
});

test('Kachelrechnung für Agadir', () => {
  const k = kachel(30.42, -9.6, 7);
  assert.equal(Math.floor(k.x), 60);
  assert.equal(Math.floor(k.y), 52);
});
