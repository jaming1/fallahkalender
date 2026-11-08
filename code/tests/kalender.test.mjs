import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fellahDatum, amazighJahr, nawFuer, abschnittFuer } from '../src/fellah.js';
import { aufgaben, duengeplan, vorschlagStart } from '../src/plan.js';
import { setzeSprache } from '../src/i18n.js';
setzeSprache('fr', JSON.parse(readFileSync(new URL('../src/sprachen/fr.json', import.meta.url))).ui);

const lade = (f) => JSON.parse(readFileSync(new URL(`../src/daten/${f}`, import.meta.url)));
const fellah = lade('fellah.json');
const k = lade('kulturen.json');
const daten = { kulturen: k.kulturen, familien: k.familien, anbau: lade('anbau.json') };

test('Abnahme 5: 14.01. ist 1. يناير fellahi und neues Amazigh-Jahr', () => {
  const f = fellahDatum('2027-01-14', fellah.monate);
  assert.equal(f.tag, 1);
  assert.equal(f.monatName, 'يناير');
  assert.equal(amazighJahr('2027-01-14'), 2977);
  assert.equal(amazighJahr('2027-01-13'), 2976);
});

test('Abnahme 5: 07.07. liegt in العنصرة; jedes Datum des Jahres hat genau einen Nawʾ', () => {
  assert.equal(abschnittFuer('2026-07-07', fellah.abschnitte).name, 'العنصرة');
  assert.equal(abschnittFuer('2027-01-10', fellah.abschnitte).name, 'الليالي');
  assert.equal(fellah.anwa.reduce((s, a) => s + a.tage, 0), 365);
  for (let t = 0; t < 365; t++) {
    const d = new Date(Date.UTC(2026, 0, 1) + t * 86400000).toISOString().slice(0, 10);
    assert.ok(nawFuer(d, fellah.anwa), d);
  }
  assert.equal(nawFuer('2026-11-29', fellah.anwa).name, 'الشولة');
  assert.equal(nawFuer('2026-08-30', fellah.anwa).name, 'الصرفة');
});

test('Jede Kultur hat Anbaudaten und einen vollständigen Plan bis zur Ernte', () => {
  const feld = { flaeche: 0.5, boden: { ph: 7.8, p: 'niedrig' }, wasser: { art: 'tropf' }, vorjahre: [] };
  for (const kultur of k.kulturen) {
    const p = aufgaben(kultur.id, '2026-11-01', feld, daten);
    assert.ok(p.liste.some((a) => a.typ === 'saat' && a.tag === 0), kultur.id);
    assert.ok(p.liste.some((a) => a.typ === 'ernte'), kultur.id);
    assert.ok(p.liste.some((a) => a.typ === 'duenger'), kultur.id);
    assert.equal(new Set(p.liste.map((a) => a.id)).size, p.liste.length);
  }
});

test('Düngeplan: Summe der Gaben = Bedarf, kalkiger Boden → Ammoniumsulfat, Vorfrucht Hülsen spart N', () => {
  const feld = { flaeche: 2, boden: { ph: 8.0 }, vorjahre: ['kichererbse'] };
  const dp = duengeplan('hartweizen', feld, daten.anbau, daten.kulturen);
  assert.equal(dp.gesamt.n, 90);
  assert.ok(Math.abs(dp.gaben.reduce((s, g) => s + g.n, 0) - dp.gesamt.n) <= 1);
  assert.equal(dp.gaben.reduce((s, g) => s + g.p, 0), dp.gesamt.p);
  assert.ok(dp.gaben.some((g) => g.feld.some((t) => t.includes(daten.anbau.duenger.ammonsulfat.name))));
});

test('Startvorschlag: nächster Pflanzmonat', () => {
  assert.equal(vorschlagStart('2026-11-08', [11, 12]), '2026-11-08');
  assert.equal(vorschlagStart('2026-11-08', [3, 4]), '2027-03-01');
});
