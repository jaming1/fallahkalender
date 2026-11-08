import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { diagnose, kontrollTermine, kulturenVon, letzterEinsatz, symptomeAusText } from '../src/diagnose.js';

const lade = (f) => JSON.parse(readFileSync(new URL(`../src/daten/${f}`, import.meta.url)));
const kat = lade('krankheiten.json');
const { kulturen } = lade('kulturen.json');
const ids = kulturen.map((k) => k.id);
const top3 = (r) => r.liste.slice(0, 3).map((x) => x.krankheit.id);

test('Abnahme 4: Tomate, braune Flecken mit Ringen auf unteren Blättern → Dürrflecken unter den ersten 3', () => {
  const geklickt = diagnose({ kultur: 'tomate', symptome: ['b-ringe', 'b-gelb-unten'] }, kat, kulturen);
  assert.equal(geklickt.liste[0].krankheit.id, 'duerrflecken');
  assert.equal(geklickt.liste[0].sicherheit, 'hoch');
  const nurText = diagnose({ kultur: 'tomate', text: 'Braune Flecken mit Ringen auf unteren Blättern' }, kat, kulturen);
  assert.ok(top3(nurText).includes('duerrflecken'), top3(nurText).join());
});

test('Typische Fälle werden erkannt', () => {
  const fall = (kultur, symptome, erwartet, text = '') => {
    const r = diagnose({ kultur, symptome, text }, kat, kulturen);
    assert.ok(top3(r).includes(erwartet), `${kultur}: ${top3(r).join()} statt ${erwartet}`);
  };
  fall('tomate', ['b-platzminen', 'f-loecher'], 'tuta');
  fall('tomate', ['f-ende'], 'bluetenendfaeule');
  fall('tomate', ['s-welke', 's-gefaesse'], 'fusarium');
  fall('melone', ['b-weiss-oben'], 'echter_mehltau');
  fall('zwiebel', ['b-silber', 't-thripse'], 'thripse');
  fall('hartweizen', ['b-rost'], 'rost');
  fall('hartweizen', ['p-zwerg', 't-puppen'], 'hessenfliege');
  fall('ackerbohne', ['s-parasit'], 'sommerwurz');
  fall('ackerbohne', [], 'schokoflecken', 'schokoladenbraune Punkte auf den Blättern');
  fall('erdbeere', [], 'grauschimmel', 'grauer Schimmel auf den Früchten');
  fall('paprika', ['b-gelb-jung'], 'eisenmangel');
  fall('luzerne', ['s-faeden'], 'seide');
});

test('Nur Krankheiten der gewählten Kultur, Bodenwerte erhöhen die Wahrscheinlichkeit', () => {
  const r = diagnose({ kultur: 'gerste', symptome: ['b-gelb-unten'] }, kat, kulturen);
  for (const x of r.liste) assert.ok(kulturenVon(x.krankheit, kat, ids).has('gerste'), x.krankheit.id);
  const ohne = diagnose({ kultur: 'tomate', symptome: ['b-gelb-jung'] }, kat, kulturen).liste.find((x) => x.krankheit.id === 'eisenmangel');
  const mit = diagnose({ kultur: 'tomate', symptome: ['b-gelb-jung'] }, kat, kulturen, { boden: { ph: 8.1 } }).liste.find((x) => x.krankheit.id === 'eisenmangel');
  assert.ok(mit.punkte > ohne.punkte);
  assert.deepEqual(symptomeAusText('', kat), []);
});

test('Kontrolltermine: Tag 3, 7, 14, dann wöchentlich bis zur Ernte; Wartezeit rückwärts', () => {
  const t = kontrollTermine('2026-11-08', '2026-12-31');
  assert.deepEqual(t.slice(0, 4).map((x) => x.tag), [3, 7, 14, 21]);
  assert.equal(t[0].datum, '2026-11-11');
  assert.ok(t.at(-1).datum <= '2026-12-31');
  assert.equal(kontrollTermine('2026-11-08').at(-1).tag, 56);
  assert.equal(letzterEinsatz('2027-03-01', 7), '2027-02-22');
});

test('Daten: jedes Symptom existiert, jede Kultur hat mindestens 3 Einträge, Maßnahmen vollständig', () => {
  const sym = new Set(kat.symptome.map((s) => s.id));
  const gruppen = new Set(kat.gruppen.map((g) => g.id));
  for (const s of kat.symptome) assert.ok(gruppen.has(s.g), s.id);
  const seen = new Set();
  for (const kr of kat.krankheiten) {
    assert.ok(!seen.has(kr.id), `doppelt ${kr.id}`); seen.add(kr.id);
    for (const s of Object.keys(kr.s)) assert.ok(sym.has(s), `${kr.id}: ${s}`);
    assert.ok(kat.arten[kr.art], kr.id);
    assert.ok(kr.e && kr.sofort.length && kr.vor.length && Array.isArray(kr.bio), kr.id);
    for (const c of kr.chem) assert.ok(c.w && Number.isInteger(c.wz), kr.id);
    for (const k of kulturenVon(kr, kat, ids)) assert.ok(ids.includes(k), `${kr.id}: ${k}`);
  }
  for (const id of ids) {
    const n = kat.krankheiten.filter((kr) => kulturenVon(kr, kat, ids).has(id) && !kr.k.includes('alle')).length;
    assert.ok(n >= 3, `${id} hat nur ${n}`);
  }
});

test('Halal: keine Banken, Kredite oder Versicherungen in den Krankheitsdaten', () => {
  const text = JSON.stringify(kat).toLowerCase();
  for (const w of ['kredit', 'bank', 'versicherung', 'takaful', 'assurance', 'crédit']) assert.ok(!text.includes(w), w);
});
