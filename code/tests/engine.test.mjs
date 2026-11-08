import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bewerte, feldHinweise, zoneAusKoordinaten, massnahmenFuer } from '../src/engine.js';

const lade = (f) => JSON.parse(readFileSync(new URL(`../src/daten/${f}`, import.meta.url)));
const k = lade('kulturen.json');
const z = lade('zonen.json');
const daten = { kulturen: k.kulturen, familien: k.familien, zonen: z.zonen };

const souss = {
  zone: 'souss', flaeche: 1, startMonat: 10,
  wasser: { ph: 7.6, ec: 2.5, menge: 60, art: 'tropf' },
  boden: { ph: 7.8, art: 'lehm' },
  vorjahre: ['tomate', 'hartweizen', ''], probleme: []
};

const finde = (liste, id) => liste.find((e) => e.kultur.id === id);

test('Abnahme 2: Tomate nach Tomate ist ungeeignet, Kartoffel und Paprika abgewertet', () => {
  const r = bewerte(souss, daten);
  assert.equal(r.length, 15);
  assert.equal(finde(r, 'tomate').stufe, 'ungeeignet');
  for (const id of ['kartoffel', 'paprika']) {
    assert.ok(finde(r, id).gruende.some((g) => g.art === 'warn' && g.key === 'fruchtfolge'), id);
  }
});

test('Salziges Wasser: Gerste verträgt 2,5 dS/m, Erdbeere nicht', () => {
  const r = bewerte(souss, daten);
  assert.ok(finde(r, 'gerste').gruende.some((g) => g.art === 'ok' && g.id === 'e.salz.ok.wasser'));
  assert.equal(finde(r, 'erdbeere').stufe, 'ungeeignet');
});

test('Rangliste ist sortiert und jede Kultur hat Begründungen', () => {
  const r = bewerte(souss, daten);
  const ord = ['sehr-gut', 'gut', 'eingeschraenkt', 'ungeeignet'];
  for (let i = 1; i < r.length; i++) assert.ok(ord.indexOf(r[i - 1].stufe) <= ord.indexOf(r[i].stufe));
  for (const e of r) assert.ok(e.gruende.length > 0, e.kultur.id);
});

test('Zu wenig Wasser wird erkannt und maximale Fläche berechnet', () => {
  const feld = { ...souss, flaeche: 5, wasser: { ...souss.wasser, menge: 10 } };
  const mais = finde(bewerte(feld, daten), 'mais');
  assert.equal(mais.stufe, 'ungeeignet');
  assert.ok(mais.maxFlaeche > 0 && mais.maxFlaeche < 1);
});

test('Regenfeldbau: Hartweizen im Gharb ohne Bewässerung möglich, Tomate nicht', () => {
  const feld = { zone: 'gharb', flaeche: 2, wasser: { art: 'regen' }, boden: { ph: 7, art: 'ton' }, vorjahre: ['kichererbse'] };
  const r = bewerte(feld, daten);
  assert.notEqual(finde(r, 'hartweizen').stufe, 'ungeeignet');
  assert.ok(finde(r, 'hartweizen').gruende.some((g) => g.art === 'plus'));
  assert.equal(finde(r, 'tomate').stufe, 'ungeeignet');
});

test('Fehlende Angaben werden gemeldet, ohne Absturz', () => {
  const r = bewerte({}, daten);
  assert.equal(r.length, 15);
  assert.ok(feldHinweise({}).fehlt.includes('bodenPh'));
});

test('GPS: Koordinaten bei Agadir ergeben Souss, bei Ifrane Atlas', () => {
  assert.equal(zoneAusKoordinaten(30.4, -9.5, z.orte).zone, 'souss');
  assert.equal(zoneAusKoordinaten(33.5, -5.1, z.orte).zone, 'atlas');
});

const katalog = lade('massnahmen.json');
const hilfe = lade('hilfe.json');

test('Abnahme 6: Tomate im Souss mit salzigem Wasser – Maßnahmen vom einfachsten an, Tropf mit Förderung', () => {
  const feld = { ...souss, vorjahre: ['hartweizen'], wasser: { ...souss.wasser, ec: 3.5 } };
  const tomate = finde(bewerte(feld, daten), 'tomate');
  const m = massnahmenFuer(tomate, katalog);
  const salz = m.find((x) => x.key === 'salz-wasser');
  assert.ok(salz && salz.massnahmen.length >= 3);
  assert.equal(salz.massnahmen[0].a, 1);
  for (let i = 1; i < salz.massnahmen.length; i++) assert.ok(salz.massnahmen[i - 1].a <= salz.massnahmen[i].a);
  assert.ok(salz.massnahmen.some((x) => x.foerderung === 'tropf'));
});

test('Jeder Problem-Schlüssel der Logik hat Maßnahmen, jede Förder-ID existiert', () => {
  const keys = ['ph-hoch', 'ph-niedrig', 'boden-ton', 'boden-sand', 'salz-wasser', 'salz-boden', 'regen-fehlt', 'wasser-knapp', 'saison', 'fruchtfolge', 'nematoden', 'welke', 'kalk'];
  for (const k of keys) assert.ok(katalog.probleme[k], k);
  const ids = new Set(hilfe.foerderungen.map((f) => f.id));
  for (const p of Object.values(katalog.probleme)) for (const m of p.massnahmen) if (m.foerderung) assert.ok(ids.has(m.foerderung), m.foerderung);
});

test('Hilfe: nur zinsfreie Angebote, jede Region hat Stellen, Quellen existieren', () => {
  const text = JSON.stringify(hilfe).toLowerCase();
  for (const verboten of ['akhdar', 'tamwil', 'takaful', 'mourabaha', 'mikrokredit-anbieter', 'mamda']) assert.ok(!text.includes(verboten), verboten);
  for (const z of daten.zonen) assert.ok(hilfe.regionen[z.id]?.stellen.length, z.id);
  for (const f of [...hilfe.foerderungen, ...hilfe.stellen, ...hilfe.kontakte]) if (f.quelle) assert.ok(hilfe.quellen[f.quelle], f.quelle);
});
