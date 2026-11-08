import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { ueberlagere, SPRACHEN } from '../src/i18n.js';

const pfad = (f) => new URL(`../src/${f}`, import.meta.url);
const json = (f) => JSON.parse(readFileSync(pfad(f)));
// bilder.json enthält nur Bildnachweise (Namen von Fotografen, Lizenzen): wird nicht übersetzt
const basis = Object.fromEntries(readdirSync(pfad('daten')).filter((f) => f !== 'bilder.json').map((f) => [f.replace('.json', ''), json(`daten/${f}`)]));
const sprachen = Object.keys(SPRACHEN).filter((c) => { try { readFileSync(pfad(`sprachen/${c}.json`)); return true; } catch { return false; } });

// Felder, die keine sichtbaren Texte sind
const KEINE_TEXTE = new Set(['id', '_quelle', '_hinweis', 'stand', 'url', 'k', 'familie', 'typ', 'art', 'bed', 'fr', 'quelle', 'tel', 'mail', 'web', 'gruppenKulturen', 'zone', 'kultur', 'regionen', 'gruppe', 'saison']);
const DEUTSCH = /[äöüßÄÖÜ]|\b(und|oder|nicht|mit|für|wenn|Wasser|Boden|Feld|Woche|Pflanze|Blätter)\b/;

function texte(o, weg, aus = []) {
  if (typeof o === 'string') aus.push([weg, o]);
  else if (Array.isArray(o)) o.forEach((x, i) => texte(x, `${weg}[${i}]`, aus));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (!KEINE_TEXTE.has(k)) texte(v, `${weg}.${k}`, aus);
  return aus;
}

test('Alle vier Sprachen sind vorhanden', () => {
  assert.deepEqual(sprachen.sort(), ['ar', 'dar', 'fr', 'zgh']);
});

const ar = json('sprachen/ar.json');
for (const code of sprachen) {
  const sp = json(`sprachen/${code}.json`);
  test(`${code}: jeder Oberflächentext ist da`, () => {
    const fehlt = Object.keys(ar.ui).filter((k) => sp.ui[k] === undefined || sp.ui[k] === '');
    assert.deepEqual(fehlt, []);
    for (const [k, v] of Object.entries(sp.ui)) {
      const platz = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
      assert.equal(platz(v), platz(ar.ui[k]), `Platzhalter in ${k}`);
    }
  });
  test(`${code}: kein deutscher Text, keine Ziffern ٠–٩`, () => {
    const alle = [...texte(sp.ui, 'ui')];
    // Wie in der App: zuerst die Grundsprache (Arabisch), dann die gewählte Sprache
    const kette = [SPRACHEN[code].basis, code].filter(Boolean).map((c) => json(`sprachen/${c}.json`));
    for (const [name, b] of Object.entries(basis)) alle.push(...texte(kette.reduce((x, s) => ueberlagere(x, s.daten[name]), b), name));
    const deutsch = alle.filter(([, s]) => DEUTSCH.test(s));
    assert.deepEqual(deutsch.slice(0, 5), []);
    assert.ok(!alle.some(([, s]) => /[٠-٩۰-۹]/.test(s)), 'östliche Ziffern');
  });
  test(`${code}: nur halal und zinsfrei`, () => {
    // Der Grundsatz nennt das Ausgeschlossene ausdrücklich; „ohne Zinsen / ohne Kredit“ ist erlaubt.
    const ohneGrundsatz = { ...sp, daten: { ...sp.daten, hilfe: { ...sp.daten.hilfe, grundsatz: undefined } } };
    const roh = JSON.stringify(ohneGrundsatz)
      .replace(/(بدون|بلا|من غير|ب?لا) (فوائد|فايدة|فائدة|قرض|كريدي)|sans (intérêts?|crédit)|ⴰⵔ ⵜⵉⵎⵔⵉⴷⵉⵏ/gi, '');
    // Arabische Wörter nur als ganzes Wort (mit ال/و/ب/لل davor), damit z. B. „مخمر“ (gut verrotteter Mist) nicht auffällt
    const W = '(?<![\\u0600-\\u06FF])(?:و|ب|ف)?(?:ال|لل)?';
    const E = '(?![\\u0600-\\u06FF])';
    const arabisch = ['قرض', 'قروض', 'فوائد', 'بنك', 'بنوك', 'بانكة', 'كريدي', 'تأمين', 'تكافل', 'مرابحة', 'كحول', 'خمر', 'شراب', 'خنزير', 'حلوف'];
    const verboten = new RegExp(`${W}(?:${arabisch.join('|')})${E}|crédit|\\bprêts?\\b|banque|assurance|takaful|mourabaha|akhdar|tamwil|mamda|intérêt|alcool|\\bporc\\b|ⴰⴱⴰⵏⴽ|ⵜⴰⴱⴰⵏⴽⴰ`, 'i');
    assert.ok(!verboten.test(roh), roh.match(verboten)?.[0]);
  });
}
