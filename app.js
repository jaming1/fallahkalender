// Fallahkalender – Oberfläche. Speichert alles im Browser (localStorage). Texte kommen aus sprachen/<code>.json.
import { bewerte, feldHinweise, zoneAusKoordinaten, monatsliste, STUFEN, massnahmenFuer } from './engine.js';
import { aufgaben, vorschlagStart } from './plan.js';
import { fellahDatum, amazighJahr, nawFuer, abschnittFuer } from './fellah.js';
import { heuteIso, plusTage } from './datum.js';
import { diagnose, kontrollTermine, kulturenVon, letzterEinsatz } from './diagnose.js';
import { t, zahl, datum, monatJahr, monatName, setzeSprache, sprache, info, ueberlagere, SPRACHEN, STANDARD } from './i18n.js';
import { vorleseKnopf, vorlesenStoppen } from './vorlesen.js';
import { kiStatus, bildPruefen } from './ki.js';
import { wetterLaden, tageAus, wetterZeichen, warnungen, planAbgleich, stundenRegen, wasGeht, krankheitsRisiken, RADAR_INDEX, kachel } from './wetter.js';

// Mehrere Felder: jedes Feld hat eigene Schlüssel „fallahkalender.<id>.<teil>“, die Liste steht in SPEICHER_FELDER.
const SPEICHER_FELDER = 'fallahkalender.felder';
const SPEICHER_ANSICHT = 'fallahkalender.ansicht';
const SPEICHER_SPRACHE = 'fallahkalender.sprache';
const ALT = { feld: 'fallahkalender.feld.v1', plan: 'fallahkalender.plan.v1', befall: 'fallahkalender.befall.v1' };
const feldSchluessel = (id, teil) => `fallahkalender.${id}.${teil}`;
let SPEICHER, SPEICHER_PLAN, SPEICHER_BEFALL, SPEICHER_TAGEBUCH;
let felder = null;
let ki = { bild: false, stimmen: [] };
let bilder = {};

const $ = (sel, wurzel = document) => wurzel.querySelector(sel);
const form = $('#feld-form');
let daten = null;

function el(tag, attrs = {}, ...kinder) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else e.setAttribute(k, v);
  }
  for (const k of kinder) if (k !== null && k !== undefined && k !== false) e.append(k);
  return e;
}

// Bildzeichen aus assets/zeichen.svg
function zeichen(id, klasse = 'bz') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', klasse);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `assets/zeichen.svg#${id}`);
  svg.append(use);
  return svg;
}

// Foto aus daten/bilder.json (freie Fotos mit Nachweis). klein = nur Vorschaubild ohne Nachweis.
function foto(schluessel, alt, klein = false) {
  const b = bilder[schluessel];
  if (!b) return null;
  const img = el('img', { src: b.datei, alt: klein ? '' : alt, loading: 'lazy', decoding: 'async', width: b.breite ?? 480, height: b.hoehe ?? 360, 'data-gross': schluessel });
  if (klein) { img.className = 'mini-bild'; return img; }
  return el('figure', { class: 'foto' }, img,
    el('figcaption', { dir: 'ltr' }, `${b.autor} · `, el('a', { href: b.seite, target: '_blank', rel: 'noopener noreferrer' }, b.lizenz)));
}

// Reihe kleiner Fotos (z. B. Düngersäcke); leer = nichts anzeigen
function bilderReihe(schluessel) {
  const imgs = schluessel.map((k) => foto(k, '', true)).filter(Boolean);
  return imgs.length ? el('span', { class: 'bilder-reihe' }, ...imgs) : null;
}

function lesen(schluessel) {
  try { return JSON.parse(localStorage.getItem(schluessel)); } catch { return null; }
}
function schreiben(schluessel, wert) {
  try { localStorage.setItem(schluessel, JSON.stringify(wert)); return true; } catch { return false; }
}

function entfernen(schluessel) {
  try { localStorage.removeItem(schluessel); } catch { /* egal */ }
}

// ---------- Foto groß ansehen ----------
// Jedes Foto antippen: bildschirmfüllend, Lupe vergrößert weiter. Im Befall steht das eigene Foto zum Vergleich daneben.
function bildGrossZeigen(quelle) {
  const dlg = $('#bild-gross');
  const flaeche = $('#bg-flaeche');
  flaeche.classList.remove('zoom');
  const teile = [];
  const schluessel = quelle.dataset.gross;
  const b = schluessel ? bilder[schluessel] : null;
  const gross = el('img', { src: b ? (b.gross || b.datei) : quelle.src, alt: quelle.alt || '' });
  if (b?.gross) gross.addEventListener('error', () => { gross.src = b.datei; }, { once: true });
  teile.push(el('figure', { class: 'bg-bild' }, gross,
    b ? el('figcaption', { dir: 'ltr' }, `${b.autor} · ${b.lizenz}`) : null));
  const eigenes = befallFoto && !$('#ansicht-befall').hidden && quelle.src !== befallFoto;
  if (eigenes) teile.push(el('figure', { class: 'bg-bild' }, el('img', { src: befallFoto, alt: t('bild.deinFoto') }), el('figcaption', {}, t('bild.deinFoto'))));
  flaeche.classList.toggle('zwei', Boolean(eigenes));
  flaeche.replaceChildren(...teile);
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  $('#bg-zu').focus();
}

function bildGrossStart() {
  const dlg = $('#bild-gross');
  const zu = () => { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); };
  $('#bg-zu').addEventListener('click', zu);
  $('#bg-zoom').addEventListener('click', () => $('#bg-flaeche').classList.toggle('zoom'));
  $('#bg-flaeche').addEventListener('dblclick', () => $('#bg-flaeche').classList.toggle('zoom'));
  // Tipp neben das Bild schließt
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg || ev.target.id === 'bg-flaeche') zu(); });
  // Abfangen, bevor Auswahlfeld oder Aufklapper reagieren
  document.addEventListener('click', (ev) => {
    const img = ev.target.closest?.('img.mini-bild, .foto img, .foto-vorschau img, img.fall-foto');
    if (!img || dlg.contains(img)) return;
    ev.preventDefault();
    ev.stopPropagation();
    bildGrossZeigen(img);
  }, true);
}

// ---------- Felder ----------
function felderLaden() {
  let idx = lesen(SPEICHER_FELDER);
  if (!idx || !Array.isArray(idx.liste) || !idx.liste.length) {
    // Erster Start oder Daten aus Version 3: das bisherige Feld wird Feld „f1“.
    idx = { aktiv: 'f1', liste: [{ id: 'f1', name: '' }] };
    for (const [teil, alt] of Object.entries(ALT)) {
      try {
        const wert = localStorage.getItem(alt);
        if (wert !== null) { localStorage.setItem(feldSchluessel('f1', teil), wert); localStorage.removeItem(alt); }
      } catch { /* egal */ }
    }
    idx.liste[0].name = lesen(feldSchluessel('f1', 'feld'))?.roh?.name || '';
    schreiben(SPEICHER_FELDER, idx);
  }
  if (!idx.liste.some((f) => f.id === idx.aktiv)) idx.aktiv = idx.liste[0].id;
  felder = idx;
  SPEICHER = feldSchluessel(idx.aktiv, 'feld');
  SPEICHER_PLAN = feldSchluessel(idx.aktiv, 'plan');
  SPEICHER_BEFALL = feldSchluessel(idx.aktiv, 'befall');
  SPEICHER_TAGEBUCH = feldSchluessel(idx.aktiv, 'tagebuch');
}

const feldName = (f, i) => f.name || t('felder.ohneName', { n: zahl(i + 1, 0) });

function felderStart() {
  const wahl = $('#feld-wahl');
  felder.liste.forEach((f, i) => wahl.append(el('option', { value: f.id }, feldName(f, i))));
  wahl.value = felder.aktiv;
  wahl.addEventListener('change', () => {
    schreiben(SPEICHER_FELDER, { ...felder, aktiv: wahl.value });
    window.location.reload();
  });
  $('#feld-neu').addEventListener('click', () => {
    const id = `f${Date.now().toString(36)}`;
    schreiben(SPEICHER_FELDER, { aktiv: id, liste: [...felder.liste, { id, name: '' }] });
    schreiben(SPEICHER_ANSICHT, 'feld');
    window.location.reload();
  });
  $('#feld-loeschen').addEventListener('click', () => {
    const i = felder.liste.findIndex((f) => f.id === felder.aktiv);
    if (!window.confirm(t('felder.loeschen.frage', { name: feldName(felder.liste[i], i) }))) return;
    for (const teil of ['feld', 'plan', 'befall', 'tagebuch']) entfernen(feldSchluessel(felder.aktiv, teil));
    const rest = felder.liste.filter((f) => f.id !== felder.aktiv);
    if (rest.length) schreiben(SPEICHER_FELDER, { aktiv: rest[0].id, liste: rest });
    else entfernen(SPEICHER_FELDER);
    schreiben(SPEICHER_ANSICHT, 'feld');
    window.location.reload();
  });
}

function feldNameMerken(name) {
  const f = felder.liste.find((x) => x.id === felder.aktiv);
  if (!f || f.name === name) return;
  f.name = name;
  schreiben(SPEICHER_FELDER, felder);
  const i = felder.liste.indexOf(f);
  const opt = $(`#feld-wahl option[value="${f.id}"]`);
  if (opt) opt.textContent = feldName(f, i);
}

// ---------- Feldtagebuch ----------
function tagebuch() {
  const x = lesen(SPEICHER_TAGEBUCH);
  return Array.isArray(x) ? x : [];
}
function eintragen(eintrag) {
  const alle = tagebuch();
  alle.push({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, datum: heuteIso(), ...eintrag });
  schreiben(SPEICHER_TAGEBUCH, alle);
}
function austragen(ref) {
  schreiben(SPEICHER_TAGEBUCH, tagebuch().filter((x) => x.ref !== ref));
}

function tagebuchTeil() {
  const teil = el('section', { class: 'hilfe-teil', 'aria-labelledby': 'h-tagebuch' }, el('h2', { id: 'h-tagebuch' }, t('tb.titel')));
  const karte = el('div', { class: 'karte' }, el('p', { class: 'meta' }, t('tb.text')));
  const notiz = el('textarea', { id: 'tb-notiz', name: 'notiz', rows: '2', placeholder: t('tb.notiz.bsp') });
  const form = el('form', { class: 'tagebuch-form nicht-drucken', id: 'tagebuch-form' },
    el('label', { class: 'feld', for: 'tb-notiz' }, t('tb.notiz'), notiz),
    el('button', { type: 'submit', class: 'knopf-zweit' }, t('tb.hinzu')));
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const text = notiz.value.trim();
    if (!text) { notiz.focus(); return; }
    eintragen({ typ: 'notiz', text });
    zeigeKalender(formularLesen());
    $('#tb-notiz')?.focus();
  });
  karte.append(form);
  const alle = tagebuch().map((x, i) => ({ ...x, i })).sort((a, b) => (b.datum.localeCompare(a.datum)) || b.i - a.i);
  if (!alle.length) karte.append(el('p', { class: 'klein' }, t('tb.leer')));
  else {
    const ul = el('ul', { class: 'tagebuch' });
    for (const x of alle) {
      const weg = el('button', { type: 'button', class: 'link-knopf', 'aria-label': `${t('tb.weg')}: ${x.text}` }, t('tb.weg'));
      weg.addEventListener('click', () => {
        schreiben(SPEICHER_TAGEBUCH, tagebuch().filter((y) => y.id !== x.id));
        zeigeKalender(formularLesen());
      });
      ul.append(el('li', { class: `tb-${x.typ}` },
        zeichen(`t-${x.typ}`),
        el('span', { class: 'tb-datum' }, datum(x.datum)),
        el('span', { class: 'marke' }, t(`typ.${x.typ}`)),
        el('span', { class: 'tb-text' }, x.text),
        weg));
    }
    karte.append(ul);
  }
  teil.append(karte);
  return teil;
}

// ---------- Sicherung ----------
function sichernExport() {
  const inhalt = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('fallahkalender.')) inhalt[k] = localStorage.getItem(k);
    }
  } catch { /* egal */ }
  const blob = new Blob([JSON.stringify({ app: 'fallahkalender', version: 1, datum: heuteIso(), daten: inhalt })], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `fallahkalender-${heuteIso()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function sichernImport(ev) {
  const datei = ev.target.files?.[0];
  ev.target.value = '';
  if (!datei) return;
  const status = $('#sicher-status');
  let inhalt;
  try {
    const x = JSON.parse(await datei.text());
    if (x?.app !== 'fallahkalender' || !x.daten || typeof x.daten !== 'object') throw new Error('falsch');
    inhalt = Object.entries(x.daten).filter(([k, v]) => k.startsWith('fallahkalender.') && typeof v === 'string');
    if (!inhalt.length) throw new Error('leer');
  } catch {
    status.textContent = t('sicher.fehler');
    return;
  }
  if (!window.confirm(t('sicher.import.frage'))) return;
  try {
    const alt = [];
    for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i).startsWith('fallahkalender.')) alt.push(localStorage.key(i));
    for (const k of alt) localStorage.removeItem(k);
    for (const [k, v] of inhalt) localStorage.setItem(k, v);
  } catch {
    status.textContent = t('speichern.nein');
    return;
  }
  window.location.reload();
}

// ---------- App aufs Handy ----------
function swRegistrieren() {
  const sicher = window.isSecureContext;
  if (sicher && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { /* ohne Offline weiter */ });
}

function appStart() {
  const karte = $('#app-karte');
  const eigenstaendig = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (eigenstaendig) return;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) { karte.hidden = false; $('#app-ios').hidden = false; }
  let aufforderung = null;
  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();
    aufforderung = ev;
    karte.hidden = false;
    $('#app-installieren').hidden = false;
  });
  $('#app-installieren').addEventListener('click', async () => {
    if (!aufforderung) return;
    aufforderung.prompt();
    try { await aufforderung.userChoice; } catch { /* egal */ }
    aufforderung = null;
    karte.hidden = true;
  });
  window.addEventListener('appinstalled', () => { karte.hidden = true; });
}

// ---------- Drucken ----------
let geoeffnet = [];
function druckVorbereiten() {
  geoeffnet = [...document.querySelectorAll('.ansicht:not([hidden]) details:not([open])')];
  for (const d of geoeffnet) d.open = true;
}
function druckEnde() {
  for (const d of geoeffnet) d.open = false;
  geoeffnet = [];
}

async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url);
  return r.json();
}

async function ladeDaten(code) {
  const dateien = ['kulturen', 'zonen', 'massnahmen', 'hilfe', 'anbau', 'fellah', 'krankheiten'];
  // Darija und Tamazight liegen über dem Arabischen: was noch nicht übersetzt ist, erscheint auf Arabisch.
  const kette = [SPRACHEN[code]?.basis, code].filter(Boolean);
  const [basis, ...sprachDateien] = await Promise.all([
    Promise.all(dateien.map((d) => json(`daten/${d}.json`))),
    ...kette.map((c) => json(`sprachen/${c}.json`))
  ]);
  let d = Object.fromEntries(dateien.map((x, i) => [x, basis[i]]));
  let ui = {};
  for (const spr of sprachDateien) { d = ueberlagere(d, spr.daten ?? {}); ui = { ...ui, ...spr.ui }; }
  setzeSprache(code, ui);
  bilder = await json('daten/bilder.json').catch(() => ({}));
  return { kulturen: d.kulturen.kulturen, familien: d.kulturen.familien, zonen: d.zonen.zonen, orte: d.zonen.orte, massnahmen: d.massnahmen, hilfe: d.hilfe, anbau: d.anbau, fellah: d.fellah, krank: d.krankheiten };
}

// Statische Texte im HTML füllen
function texteSetzen() {
  document.documentElement.lang = sprache() === 'dar' ? 'ar-MA' : sprache();
  document.documentElement.dir = info().dir;
  document.title = t('app.titel');
  for (const e of document.querySelectorAll('[data-t]')) e.textContent = t(e.dataset.t);
  for (const e of document.querySelectorAll('[data-t-placeholder]')) e.placeholder = t(e.dataset.tPlaceholder);
  for (const e of document.querySelectorAll('[data-t-aria]')) e.setAttribute('aria-label', t(e.dataset.tAria));
  for (const e of document.querySelectorAll('[data-t-alt]')) e.alt = t(e.dataset.tAlt);
  const wahl = $('#sprache-wahl');
  for (const [code, s] of Object.entries(SPRACHEN)) wahl.append(el('option', { value: code, lang: code === 'dar' ? 'ar-MA' : code }, s.name));
  wahl.value = sprache();
  wahl.addEventListener('change', () => {
    schreiben(SPEICHER_SPRACHE, wahl.value);
    vorlesenStoppen();
    window.location.reload();
  });
  for (const a of document.querySelectorAll('.ansicht')) {
    const k = vorleseKnopf(() => a);
    if (k) a.querySelector('.titel-zeile').append(k);
  }
}

// ---------- Formular <-> Feld ----------
const num = (v) => (v === '' || v === null || v === undefined ? undefined : Number(String(v).replace(',', '.')));

function formularLesen() {
  const f = new FormData(form);
  const flaecheRoh = num(f.get('flaeche'));
  const mengeRoh = num(f.get('wasserMenge'));
  const roh = Object.fromEntries([...f.entries()].filter(([k]) => k !== 'probleme'));
  roh.probleme = f.getAll('probleme');
  return {
    roh,
    name: f.get('name')?.trim() || '',
    zone: f.get('zone') || '',
    lat: form.dataset.lat ? Number(form.dataset.lat) : undefined,
    lon: form.dataset.lon ? Number(form.dataset.lon) : undefined,
    flaeche: flaecheRoh === undefined ? undefined : f.get('flaecheEinheit') === 'm2' ? flaecheRoh / 10000 : flaecheRoh,
    startMonat: Number(f.get('startMonat')) || 0,
    wasser: {
      art: f.get('wasserArt') || '',
      ph: num(f.get('wasserPh')),
      ec: num(f.get('wasserEc')),
      menge: mengeRoh === undefined ? undefined : f.get('mengeEinheit') === 'ls' ? mengeRoh * 86.4 : mengeRoh
    },
    boden: {
      art: f.get('bodenArt') || '',
      ph: num(f.get('bodenPh')),
      humus: num(f.get('humus')),
      n: f.get('n'), p: f.get('p'), k: f.get('k'),
      kalk: f.get('kalk'),
      salz: num(f.get('bodenSalz'))
    },
    vorjahre: [f.get('vj0'), f.get('vj1'), f.get('vj2')],
    probleme: f.getAll('probleme')
  };
}

function formularFuellen(roh) {
  if (!roh) return;
  for (const [name, wert] of Object.entries(roh)) {
    const felder = form.elements.namedItem(name);
    if (!felder) continue;
    if (felder instanceof RadioNodeList) {
      for (const f of felder) f.checked = Array.isArray(wert) ? wert.includes(f.value) : f.value === wert;
    } else if (felder.type === 'checkbox') {
      felder.checked = Array.isArray(wert) && wert.includes(felder.value);
    } else {
      felder.value = wert;
    }
  }
  zoneBild();
}

// Foto der gewählten Region unter der Auswahl
function zoneBild() {
  const z = daten.zonen.find((x) => x.id === $('#zone-wahl').value);
  $('#zone-bild').replaceChildren(...(z ? [foto(`zone:${z.id}`, z.name)].filter(Boolean) : []));
}

const nachName = (a, b) => a.name.localeCompare(b.name, info().locale);

function auswahlFuellen() {
  const zone = $('#zone-wahl');
  for (const z of daten.zonen) zone.append(el('option', { value: z.id }, `${z.name} (${z.beispiele})`));
  zone.addEventListener('change', zoneBild);
  const monat = $('#monat-wahl');
  for (let m = 1; m <= 12; m++) monat.append(el('option', { value: String(m) }, monatName(m)));
  monat.value = String(new Date().getMonth() + 1);
  for (const s of document.querySelectorAll('.stufe-wahl')) {
    s.append(el('option', { value: '' }, t('weissNicht')));
    for (const st of ['niedrig', 'mittel', 'hoch']) s.append(el('option', { value: st }, t(s.name === 'kalk' ? `kalk.${st}` : `stufe.${st}`)));
  }
  for (const s of document.querySelectorAll('.vorjahr')) {
    s.append(el('option', { value: '' }, t('weissNicht')), el('option', { value: 'brache' }, t('brache')));
    for (const k of [...daten.kulturen].sort(nachName)) s.append(el('option', { value: k.id }, k.name));
    s.append(el('option', { value: 'andere' }, t('andere')));
  }
}

function bewaesserungUmschalten() {
  const art = new FormData(form).get('wasserArt');
  $('.nur-bewaessert').hidden = art === 'regen';
}

// ---------- Speichern ----------
let speicherTimer;
function speichern(zeigen = true) {
  const feld = formularLesen();
  const ok = schreiben(SPEICHER, { roh: feld.roh, lat: feld.lat, lon: feld.lon });
  $('#kopf-feld').textContent = feld.name || t('feld.neu');
  feldNameMerken(feld.name);
  if (zeigen) {
    $('#speicher-status').textContent = ok ? t('gespeichert') : t('speichern.nein');
    clearTimeout(speicherTimer);
    if (ok) speicherTimer = setTimeout(() => { $('#speicher-status').textContent = ''; }, 2000);
  }
  return feld;
}

// ---------- Ansichten ----------
function zeigeAnsicht(name, fokus = false) {
  vorlesenStoppen();
  for (const knopf of document.querySelectorAll('.reiter-knopf')) {
    const aktiv = knopf.dataset.ansicht === name;
    if (aktiv) knopf.setAttribute('aria-current', 'page'); else knopf.removeAttribute('aria-current');
  }
  for (const a of document.querySelectorAll('.ansicht')) a.hidden = a.id !== `ansicht-${name}`;
  if (name === 'empfehlung') zeigeErgebnis(formularLesen());
  if (name === 'hilfe') zeigeHilfe(formularLesen());
  if (name === 'kalender') zeigeKalender(formularLesen());
  if (name === 'befall') symptomeZeigen();
  schreiben(SPEICHER_ANSICHT, name);
  if (fokus) { $(`#ansicht-${name} h1`).setAttribute('tabindex', '-1'); $(`#ansicht-${name} h1`).focus(); }
  window.scrollTo({ top: 0 });
}

// ---------- Ergebnis ----------
const ZEICHEN = { ok: '✓', plus: '+', warn: '!', bad: '✕' };

function kurztext(e) {
  const bad = e.gruende.find((g) => g.art === 'bad');
  if (bad) return t('empf.warumNicht', { text: bad.text });
  const warn = e.gruende.find((g) => g.art === 'warn');
  if (warn) return warn.text;
  const plus = e.gruende.find((g) => g.art === 'plus');
  return plus ? plus.text : e.gruende[0]?.text ?? t('empf.keineBedenken');
}

function pfeil() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'pfeil');
  svg.setAttribute('aria-hidden', 'true');
  const pfad = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pfad.setAttribute('d', 'M6 9l6 6 6-6');
  svg.append(pfad);
  return svg;
}

function reihe(e) {
  const liste = el('ul', { class: 'gruende' });
  for (const g of e.gruende) {
    liste.append(el('li', { class: `art-${g.art}` },
      el('span', { class: 'z', 'aria-hidden': 'true' }, ZEICHEN[g.art]),
      el('span', {}, el('span', { class: 'sr' }, `${t(`zeichen.${g.art}`)} `), g.text)));
  }
  const meta = [];
  if (e.pflanzmonate.length) meta.push(t('empf.pflanzzeit', { monate: monatsliste(e.pflanzmonate) }));
  meta.push(t('empf.dauer', { n: zahl(Math.round(e.kultur.tage / 30), 0) }));
  if (e.maxFlaeche && Number.isFinite(e.maxFlaeche)) meta.push(t('empf.wasserReicht', { ha: zahl(e.maxFlaeche, 2) }));

  const inhalt = el('div', { class: 'reihe-inhalt' }, liste, el('p', { class: 'meta' }, meta.join(' ')), kalenderKnopf(e), machbarBlock(e));
  const vl = vorleseKnopf(() => inhalt);
  if (vl) inhalt.prepend(el('p', { class: 'zeile-knopf' }, vl));
  return el('details', { class: 'reihe', 'data-kultur': e.kultur.id },
    el('summary', {},
      foto(`kultur:${e.kultur.id}`, '', true),
      el('span', { class: 'k-name' }, e.kultur.name),
      pfeil(),
      el('span', { class: 'k-kurz' }, kurztext(e))),
    inhalt);
}

function kalenderKnopf(e) {
  const knopf = el('button', { type: 'button', class: 'knopf-zweit kal-knopf' }, t('empf.inKalender', { kultur: e.kultur.name }));
  knopf.addEventListener('click', () => {
    const start = vorschlagStart(heuteIso(), e.pflanzmonate);
    schreiben(SPEICHER_PLAN, { kultur: e.kultur.id, start, erledigt: {} });
    zeigeAnsicht('kalender', true);
  });
  return el('p', { class: 'zeile-knopf' }, knopf);
}

function zeigeErgebnis(feld) {
  const ziel = $('#ergebnis');
  ziel.replaceChildren();
  const { hinweise, fehlt } = feldHinweise(feld);

  if (!feld.zone && !feld.boden.ph && !feld.wasser.art) {
    const knopf = el('button', { type: 'button', class: 'knopf-haupt' }, t('empf.leer.knopf'));
    knopf.addEventListener('click', () => zeigeAnsicht('feld', true));
    ziel.append(el('div', { class: 'hinweis-box leer' },
      el('h2', {}, t('empf.leer.titel')),
      el('p', {}, t('empf.leer.text')),
      knopf));
    return;
  }

  if (fehlt.length) {
    ziel.append(el('div', { class: 'hinweis-box' },
      el('h2', {}, t('empf.genauer')),
      el('p', {}, t('empf.genauer.text', { liste: fehlt.map((f) => t(`fehlt.${f}`)).join(t('komma')) }))));
  }
  if (hinweise.length) {
    const ul = el('ul');
    for (const h of hinweise) ul.append(el('li', {}, h));
    ziel.append(el('div', { class: 'hinweis-box' }, el('h2', {}, t('empf.hinweise')), ul));
  }

  const ergebnis = bewerte(feld, daten);
  for (const stufe of STUFEN) {
    const teil = ergebnis.filter((e) => e.stufe === stufe);
    if (!teil.length) continue;
    const gruppe = el('section', { class: `gruppe g-${stufe}`, 'aria-label': t(`stufe.${stufe}`) },
      el('h2', {}, t(`stufe.${stufe}`), el('span', { class: 'anzahl' }, ` ${zahl(teil.length, 0)}`)));
    for (const e of teil) gruppe.append(reihe(e));
    ziel.append(gruppe);
  }
}

// ---------- Machbar machen ----------
// Ohne Foto: gezeichnetes Bildzeichen für das Problem
const PROBLEM_ZEICHEN = { saison: 't-saat', 'salz-wasser': 'p-salz', 'salz-boden': 'p-salz', 'boden-sand': 'b-sand', 'boden-ton': 'b-ton', fruchtfolge: 't-saat', kalk: 'b-lehm', nematoden: 'p-nematoden', welke: 'p-welke' };

function machbarBlock(e) {
  const probleme = massnahmenFuer(e, daten.massnahmen);
  if (!probleme.length) return null;
  const block = el('div', { class: 'machbar' },
    el('h3', {}, t(e.stufe === 'ungeeignet' ? 'machbar.titel.doch' : 'machbar.titel.besser')),
    el('p', { class: 'meta' }, t('machbar.reihenfolge')));
  for (const p of probleme) {
    const ol = el('ol', { class: 'schritte' });
    for (const m of p.massnahmen) {
      const li = el('li', {},
        el('div', { class: 'm-kopf' },
          el('span', { class: `aufwand aufwand-${m.a}` }, t(`aufwand.${m.a}`)),
          el('span', { class: 'm-titel' }, m.t)),
        m.bild ? foto(m.bild, m.t) : null,
        el('p', { class: 'm-text' }, m.d),
        el('p', { class: 'm-meta' }, t('machbar.kosten', { k: m.k, z: m.z })));
      if (m.foerderung) {
        const f = daten.hilfe.foerderungen.find((x) => x.id === m.foerderung);
        if (f) {
          const knopf = el('button', { type: 'button', class: 'link-knopf' }, t('machbar.foerderung', { titel: f.titel }));
          knopf.addEventListener('click', () => zeigeFoerderung(f.id));
          li.append(knopf);
        }
      }
      ol.append(li);
    }
    const pb = daten.massnahmen.probleme[p.key]?.bild;
    block.append(el('div', { class: 'problem' }, el('p', { class: 'problem-titel' }, (pb && foto(pb, '', true)) || (PROBLEM_ZEICHEN[p.key] ? zeichen(PROBLEM_ZEICHEN[p.key], 'bz gross') : null), p.titel), ol));
  }
  return block;
}

function zeigeFoerderung(id) {
  zeigeAnsicht('hilfe');
  const ziel = document.getElementById(`f-${id}`);
  if (ziel) {
    ziel.open = true;
    ziel.scrollIntoView({ block: 'start' });
    ziel.querySelector('summary')?.focus();
  }
}

// ---------- Kalender ----------
function arabisch(text) { return el('span', { lang: 'ar', dir: 'rtl', class: 'ar' }, text); }

function fellahText(iso) {
  const f = fellahDatum(iso, daten.fellah.monate);
  return `${f.tag} ${f.monatName}`;
}

function heuteKarte() {
  const heute = heuteIso();
  const naw = nawFuer(heute, daten.fellah.anwa);
  const abs = abschnittFuer(heute, daten.fellah.abschnitte);
  const tagImNaw = naw ? Math.round((Date.parse(heute) - Date.parse(naw.von)) / 86400000) + 1 : 0;
  const karte = el('div', { class: 'heute' },
    el('p', { class: 'heute-datum' }, datum(heute, true)),
    el('p', { class: 'heute-fellah' }, `${t('kal.fellah')} `, arabisch(fellahText(heute)), ` · ${t('kal.amazighJahr', { j: amazighJahr(heute) })}`));
  if (naw) {
    karte.append(el('p', { class: 'heute-naw' }, `${t('kal.naw')} `, arabisch(naw.name), ` ${t('kal.nawTag', { tag: tagImNaw, von: naw.tage, bis: datum(naw.bis) })}`));
    if (naw.bedeutung) karte.append(el('p', { class: 'klein' }, naw.bedeutung));
  }
  if (abs) karte.append(el('p', { class: 'heute-abschnitt' }, arabisch(abs.name), ` ${abs.text}`));
  karte.append(el('p', { class: 'klein' }, t('kal.ueberlieferung')));
  return karte;
}

function zeigeKalender(feld) {
  const ziel = $('#kalender');
  ziel.replaceChildren(heuteKarte());
  const plan = lesen(SPEICHER_PLAN);
  const kultur = plan && daten.kulturen.find((k) => k.id === plan.kultur);
  const offen = [];
  if (kultur) {
    const erl = plan.erledigt ?? {};
    for (const x of aufgaben(kultur.id, plan.start, feld, daten).liste) if (!erl[x.id]) offen.push(x);
  }
  ziel.append(wetterTeil(feld, kultur, offen));
  const befall = befallTeil();
  if (!kultur) {
    if (befall) ziel.append(befall);
    const knopf = el('button', { type: 'button', class: 'knopf-haupt' }, t('kal.leer.knopf'));
    knopf.addEventListener('click', () => zeigeAnsicht('empfehlung', true));
    ziel.append(el('div', { class: 'hinweis-box' }, el('h2', {}, t('kal.leer.titel')), el('p', {}, t('kal.leer.text')), knopf));
    ziel.append(tagebuchTeil());
    return;
  }
  const { liste, duengeplan: dp, anleitung: a } = aufgaben(kultur.id, plan.start, feld, daten);
  const heute = heuteIso();
  const erledigt = plan.erledigt ?? {};
  const fertig = liste.filter((x) => erledigt[x.id]).length;

  const startFeld = el('input', { type: 'date', id: 'plan-start', value: plan.start });
  startFeld.addEventListener('change', () => {
    if (!startFeld.value) return;
    schreiben(SPEICHER_PLAN, { ...plan, start: startFeld.value });
    zeigeKalender(formularLesen());
  });
  const loeschen = el('button', { type: 'button', class: 'link-knopf' }, t('kal.loeschen'));
  loeschen.addEventListener('click', () => {
    if (!window.confirm(t('kal.loeschen.frage', { kultur: kultur.name }))) return;
    entfernen(SPEICHER_PLAN);
    zeigeKalender(formularLesen());
  });
  const drucken = el('button', { type: 'button', class: 'knopf-zweit', id: 'kal-drucken' }, t('kal.drucken'));
  drucken.addEventListener('click', () => window.print());
  const abschluss = el('button', { type: 'button', class: 'knopf-zweit', id: 'kal-fertig' }, t('kal.fertig'));
  abschluss.addEventListener('click', () => {
    if (!window.confirm(t('kal.fertig.frage', { kultur: kultur.name }))) return;
    // Die Kultur rückt in die Vorgeschichte des Feldes: vor 1 Jahr → vor 2 Jahren usw.
    const g = lesen(SPEICHER) ?? {};
    const roh = { ...(g.roh ?? formularLesen().roh) };
    roh.vj2 = roh.vj1 ?? '';
    roh.vj1 = roh.vj0 ?? '';
    roh.vj0 = kultur.id;
    formularFuellen({ vj0: roh.vj0, vj1: roh.vj1, vj2: roh.vj2 });
    speichern(false);
    eintragen({ typ: 'ernte', text: t('tb.ernte', { kultur: kultur.name }) });
    entfernen(SPEICHER_PLAN);
    zeigeKalender(formularLesen());
  });
  ziel.append(el('div', { class: 'karte plan-kopf' },
    foto(`kultur:${kultur.id}`, kultur.name, true),
    el('h2', {}, t('kal.plan', { kultur: kultur.name })),
    el('p', { class: 'meta nur-druck' }, t('kal.druck.feld', { name: formularLesen().name || t('feld.neu') })),
    el('label', { class: 'feld nicht-drucken', for: 'plan-start' }, t(a.art === 'pflanzung' ? 'kal.pflanztag' : 'kal.saattag'), startFeld),
    el('p', { class: 'nur-druck' }, el('strong', {}, t(a.art === 'pflanzung' ? 'kal.pflanztag' : 'kal.saattag')), ' ', datum(plan.start)),
    el('p', { class: 'meta' }, t('kal.stand', { fertig: zahl(fertig, 0), alle: zahl(liste.length, 0), ernte: datum(plusTage(plan.start, a.ernte[0])) })),
    el('div', { class: 'plan-knoepfe' }, befallKnopf(kultur.id), drucken, abschluss),
    loeschen));

  const naechste = liste.find((x) => !erledigt[x.id]);
  if (naechste) {
    const ueberfaellig = naechste.datum < heute;
    ziel.append(el('div', { class: `hinweis-box naechste${ueberfaellig ? ' ueberfaellig' : ''}` },
      el('h2', {}, t(ueberfaellig ? 'kal.ueberfaellig' : 'kal.naechstes')),
      el('p', {}, el('strong', {}, naechste.titel), ` · ${datum(naechste.datum)}`),
      el('p', { class: 'klein' }, naechste.text)));
  }

  if (befall) ziel.append(befall);

  ziel.append(el('details', { class: 'karte' },
    el('summary', {}, el('strong', {}, t('kal.anleitung'))),
    el('ul', {},
      el('li', {}, `${t('kal.abstand')} ${a.abstand}`),
      el('li', {}, `${t('kal.tiefe')} ${a.tiefe}`),
      el('li', {}, `${t('kal.wasser')} ${a.wasser}`),
      el('li', {}, `${t('kal.tipp')} ${a.tipp}`))));

  const tab = el('table', { class: 'tabelle' },
    el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, t('kal.dp.wann')), el('th', { scope: 'col' }, t('kal.dp.jeHa')), el('th', { scope: 'col' }, t('kal.dp.feld', { ha: zahl(dp.ha, 2) })))));
  const tb = el('tbody');
  for (const g of dp.gaben) {
    tb.append(el('tr', {},
      el('td', { 'data-label': t('kal.dp.wann') }, datum(plusTage(plan.start, g.tag))),
      el('td', { 'data-label': t('kal.dp.jeHa') }, [g.n ? `\u2066${zahl(g.n, 0)} N\u2069` : '', g.p ? `\u2066${zahl(g.p, 0)} P₂O₅\u2069` : '', g.k ? `\u2066${zahl(g.k, 0)} K₂O\u2069` : ''].filter(Boolean).join(t('komma')) + ' ' + t('einheit.kg')),
      el('td', { 'data-label': t('kal.dp.deinFeld') }, el('span', {}, g.feld.join(' + ') || '–', bilderReihe(g.produkte.map((id) => `duenger:${id}`))))));
  }
  tab.append(tb);
  const dpHinweise = el('ul');
  for (const h of dp.hinweise) dpHinweise.append(el('li', {}, h));
  ziel.append(el('details', { class: 'karte duengeplan' },
    el('summary', {}, el('strong', {}, t('kal.dp.titel', { n: zahl(dp.gesamt.n, 0), p: zahl(dp.gesamt.p, 0), k: zahl(dp.gesamt.k, 0) }))),
    el('div', { class: 'tabelle-rahmen' }, tab),
    dp.hinweise.length ? dpHinweise : null,
    el('p', { class: 'klein mit-bild' }, foto('duenger:mist', '', true), t('kal.dp.mist', { t: zahl(dp.mist.tonnenJeHa, 0), n: zahl(dp.mist.n, 0), p: zahl(dp.mist.p, 0), k: zahl(dp.mist.k, 0) }))));

  const listeEl = el('section', { class: 'hilfe-teil', 'aria-labelledby': 'h-aufgaben' }, el('h2', { id: 'h-aufgaben' }, t('kal.aufgaben')));
  let monat = '';
  let ul = null;
  for (const x of liste) {
    const m = x.datum.slice(0, 7);
    if (m !== monat) {
      monat = m;
      listeEl.append(el('h3', { class: 'monat' }, monatJahr(m)));
      ul = el('ul', { class: 'aufgaben' });
      listeEl.append(ul);
    }
    const naw = nawFuer(x.datum, daten.fellah.anwa);
    const cb = el('input', { type: 'checkbox', id: `a-${x.id}` });
    cb.checked = Boolean(erledigt[x.id]);
    cb.addEventListener('change', () => {
      const p = lesen(SPEICHER_PLAN) ?? plan;
      p.erledigt = { ...(p.erledigt ?? {}), [x.id]: cb.checked };
      if (!cb.checked) delete p.erledigt[x.id];
      schreiben(SPEICHER_PLAN, p);
      const ref = `${p.kultur}|${p.start}|${x.id}`;
      if (cb.checked) eintragen({ typ: x.typ, ref, text: `${kultur.name}: ${x.titel}` }); else austragen(ref);
      zeigeKalender(formularLesen());
      document.getElementById(`a-${x.id}`)?.focus();
    });
    const zustand = erledigt[x.id] ? 'erledigt' : x.datum < heute ? 'ueberfaellig' : x.datum <= plusTage(heute, 7) ? 'bald' : '';
    ul.append(el('li', { class: `aufgabe typ-${x.typ} ${zustand}` },
      cb,
      el('label', { for: `a-${x.id}` },
        zeichen(`t-${x.typ}`, 'a-zeichen'),
        el('span', { class: 'a-datum' }, datum(x.datum), ' · ', arabisch(fellahText(x.datum)), naw ? ' · ' : '', naw ? arabisch(naw.name) : ''),
        el('span', { class: 'a-titel' }, x.titel, ' ', el('span', { class: 'marke' }, t(`typ.${x.typ}`))),
        el('span', { class: 'a-text' }, x.text),
        bilderReihe(x.bilder ?? []))));
  }
  ziel.append(listeEl);
  ziel.append(tagebuchTeil());
}

// ---------- Wetter ----------
const SPEICHER_WETTER = 'fallahkalender.wetter';
const WETTER_FRISCH = 3 * 60 * 60 * 1000; // 3 Stunden

// Standort: GPS des Feldes, sonst erster Ort der gewählten Region
function wetterOrt(feld) {
  const g = lesen(SPEICHER);
  if (g?.lat && g?.lon) {
    const n = zoneAusKoordinaten(g.lat, g.lon, daten.orte);
    return { lat: g.lat, lon: g.lon, name: n?.ort ?? '' };
  }
  const o = daten.orte.find((x) => x[3] === feld?.zone);
  return o ? { lat: o[1], lon: o[2], name: o[0] } : null;
}

const wochentag = (iso) => t(`w.wt.${new Date(`${iso}T12:00:00Z`).getUTCDay()}`);
const tagKurz = (iso) => `${wochentag(iso)} ${Number(iso.slice(8, 10))}`;
const grad = (x) => `\u2066${zahl(Math.round(x), 0)}°\u2069`;

function wetterTeil(feld, kultur, offen) {
  const box = el('section', { class: 'hilfe-teil wetter', 'aria-labelledby': 'h-wetter' });
  const ort = wetterOrt(feld);
  box.append(el('h2', { id: 'h-wetter' }, zeichen('wt-wolkig', 'bz'), ' ', t('w.titel'), ort?.name ? ` · ${ort.name}` : ''));
  if (!ort) {
    const knopf = el('button', { type: 'button', class: 'link-knopf' }, t('w.ort.knopf'));
    knopf.addEventListener('click', () => zeigeAnsicht('feld', true));
    box.append(el('div', { class: 'karte' }, el('p', {}, t('w.keinOrt')), knopf));
    return box;
  }
  const inhalt = el('div', { class: 'wetter-inhalt' }, el('p', { class: 'meta' }, t('w.laedt')));
  box.append(inhalt);
  const alt = lesen(SPEICHER_WETTER);
  const passt = alt && Math.abs(alt.lat - ort.lat) < 0.01 && Math.abs(alt.lon - ort.lon) < 0.01;
  const zeigen = (eintrag, offline) => inhalt.replaceChildren(...wetterInhalt(eintrag, offline, kultur, offen));
  if (passt && Date.now() - alt.zeit < WETTER_FRISCH) { zeigen(alt, false); return box; }
  if (passt) zeigen(alt, true);
  wetterLaden(ort.lat, ort.lon).then((json) => {
    const eintrag = { zeit: Date.now(), lat: ort.lat, lon: ort.lon, json };
    schreiben(SPEICHER_WETTER, eintrag);
    if (box.isConnected) zeigen(eintrag, false);
  }).catch(() => {
    if (!passt) inhalt.replaceChildren(el('p', { class: 'meta' }, t('w.fehler')));
  });
  return box;
}

// Tabelle: welche Arbeit an welchem Tag (✓ / nur früh oder abends / ✗)
function wasGehtTeil(tage) {
  const kopf = el('tr', {}, el('th', { scope: 'col' }, ''));
  for (const d of tage) kopf.append(el('th', { scope: 'col' }, wochentag(d.datum)));
  const tb = el('tbody');
  const MARKE = { ja: '✓', frueh: '●', nein: '✗' };
  for (const z of wasGeht(tage)) {
    const tr = el('tr', {}, el('th', { scope: 'row' }, zeichen(z.zeichen, 'bz'), el('span', {}, t(`w.tg.${z.art}`))));
    z.tage.forEach((w, i) => tr.append(el('td', { class: `wg-${w}`, title: `${tagKurz(tage[i].datum)}: ${t(`w.wg.${w}`)}` }, el('span', { 'aria-hidden': 'true' }, MARKE[w]), el('span', { class: 'nur-vorlesen' }, t(`w.wg.${w}`)))));
    tb.append(tr);
  }
  return el('div', { class: 'karte was-geht' },
    el('h3', {}, t('w.wg.titel')),
    el('div', { class: 'tabelle-rahmen' }, el('table', { class: 'wg-tabelle' }, el('thead', {}, kopf), tb)),
    el('p', { class: 'klein wg-legende' }, el('span', { class: 'wg-ja' }, '✓'), ` ${t('w.wg.ja')}  `, el('span', { class: 'wg-frueh' }, '●'), ` ${t('w.wg.frueh')}  `, el('span', { class: 'wg-nein' }, '✗'), ` ${t('w.wg.nein')}`));
}

// Regen der nächsten 48 Stunden als Balken + Regenradar
function regenTeil(json, offline) {
  const stunden = stundenRegen(json).filter((h) => new Date(h.zeit) >= new Date(Date.now() - 3600e3)).slice(0, 48);
  const karte = el('div', { class: 'karte regen-karte' }, el('h3', {}, zeichen('wt-regen', 'bz'), ' ', t('w.regen.titel')));
  const summe = stunden.reduce((s, h) => s + h.mm, 0);
  if (stunden.length) {
    const max = Math.max(1, ...stunden.map((h) => h.mm));
    const balken = el('div', { class: 'regen-balken', role: 'img', 'aria-label': summe >= 0.5 ? t('w.regen.summe', { mm: zahl(Math.round(summe), 0) }) : t('w.regen.keiner') });
    stunden.forEach((h, i) => {
      const b = el('span', { class: 'rb', title: `${h.zeit.slice(11, 16)} · ${zahl(h.mm, 1)} mm` });
      b.style.setProperty('--h', `${Math.min(100, (h.mm / max) * 100)}%`);
      if (h.mm >= 0.1) b.classList.add('nass');
      if (h.zeit.endsWith('T00:00')) b.classList.add('mitternacht');
      balken.append(b);
      if (i % 6 === 0) b.dataset.uhr = h.zeit.slice(11, 13);
    });
    karte.append(balken, el('p', { class: 'meta' }, summe >= 0.5 ? t('w.regen.summe', { mm: zahl(Math.round(summe), 0) }) : t('w.regen.keiner')));
  }
  if (!offline) karte.append(radarTeil());
  return karte;
}

function radarTeil() {
  const ort = wetterOrt(formularLesen());
  const rahmen = el('div', { class: 'radar' });
  const knopf = el('button', { type: 'button', class: 'knopf-zweit' }, zeichen('wt-regen', 'bz'), ' ', t('w.radar.knopf'));
  const box = el('div', {}, knopf);
  if (!ort) return box;
  knopf.addEventListener('click', async () => {
    knopf.remove();
    box.append(el('p', { class: 'meta' }, t('w.laedt')));
    try {
      const idx = await (await fetch(RADAR_INDEX, { cache: 'no-store' })).json();
      const bilder = [...(idx.radar?.past ?? []), ...(idx.radar?.nowcast ?? [])];
      if (!bilder.length) throw new Error('leer');
      const z = 7;
      const k = kachel(ort.lat, ort.lon, z);
      const x0 = Math.floor(k.x) - 1; const y0 = Math.floor(k.y) - 1;
      const grund = el('div', { class: 'radar-gitter' });
      const regen = el('div', { class: 'radar-gitter oben' });
      const ebenen = [];
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
        grund.append(el('img', { src: `https://tile.openstreetmap.org/${z}/${x0 + dx}/${y0 + dy}.png`, alt: '', loading: 'lazy' }));
        const r = el('img', { alt: '' });
        ebenen.push([r, x0 + dx, y0 + dy]);
        regen.append(r);
      }
      const punkt = el('span', { class: 'radar-punkt' });
      punkt.style.left = `${((k.x - x0) / 3) * 100}%`;
      punkt.style.top = `${((k.y - y0) / 3) * 100}%`;
      const zeit = el('p', { class: 'radar-zeit' });
      rahmen.append(grund, regen, punkt);
      box.replaceChildren(rahmen, zeit, el('p', { class: 'klein' }, t('w.radar.hinweis'), ' ',
        el('a', { href: 'https://www.rainviewer.com/', target: '_blank', rel: 'noopener noreferrer' }, 'RainViewer'), ' · © ',
        el('a', { href: 'https://www.openstreetmap.org/copyright', target: '_blank', rel: 'noopener noreferrer' }, 'OpenStreetMap')));
      let i = Math.max(0, bilder.length - 1 - (idx.radar?.nowcast?.length ?? 0));
      const zeige = (n) => {
        const b = bilder[n];
        for (const [img, x, y] of ebenen) img.src = `${idx.host}${b.path}/256/${z}/${x}/${y}/2/1_1.png`;
        zeit.textContent = new Date(b.time * 1000).toLocaleTimeString(info().locale, { numberingSystem: 'latn', hour: '2-digit', minute: '2-digit' });
      };
      zeige(i);
      // Ablauf der letzten Bilder, solange die Karte sichtbar ist
      const lauf = setInterval(() => {
        if (!rahmen.isConnected) { clearInterval(lauf); return; }
        i = (i + 1) % bilder.length; zeige(i);
      }, 900);
    } catch {
      box.replaceChildren(el('p', { class: 'meta' }, t('w.radar.fehler')));
    }
  });
  return box;
}

// Krankheiten und Schädlinge, die das kommende Wetter fördert
function krankheitTeil(tage, kultur) {
  const kat = daten.krank;
  const karte = el('div', { class: 'karte krank-wetter' }, el('h3', {}, zeichen('wt-pilz', 'bz'), ' ', t('w.k.titel')));
  if (!kultur) { karte.append(el('p', { class: 'meta' }, t('w.k.ohnePlan'))); return karte; }
  const alleIds = daten.kulturen.map((k) => k.id);
  const risiken = krankheitsRisiken(tage, kat.krankheiten, (kr) => kulturenVon(kr, kat, alleIds).has(kultur.id));
  if (!risiken.length) { karte.append(el('p', {}, t('w.k.keine', { kultur: kultur.name }))); return karte; }
  karte.append(el('p', { class: 'meta' }, t('w.k.einleitung', { kultur: kultur.name })));
  const ul = el('ul', { class: 'krank-liste' });
  for (const r of risiken.slice(0, 6)) {
    const kr = kat.krankheiten.find((x) => x.id === r.id);
    const zeichenIds = Object.entries(kr.s).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => kat.symptome.find((s) => s.id === id)?.t).filter(Boolean);
    ul.append(el('li', { class: `risiko-${r.stufe}` },
      foto(`krankheit:${kr.id}`, kr.name, true) || zeichen('g-pflanze', 'bz gross'),
      el('div', {},
        el('p', { class: 'kw-name' }, el('strong', {}, kr.name), ' ', el('span', { class: `marke risiko-${r.stufe}` }, t(`w.k.${r.stufe}`))),
        el('p', { class: 'meta' }, t(`w.lage.${r.lage}`), ' · ', r.tage.map(tagKurz).join(t('komma'))),
        zeichenIds.length ? el('p', {}, el('strong', {}, t('w.k.achten')), ' ', zeichenIds.join(t('komma'))) : null,
        el('p', {}, el('strong', {}, t('w.k.kontrolle')), ' ', t(`w.kontrolle.${r.lage}`)))));
  }
  karte.append(ul, befallKnopf(kultur.id));
  return karte;
}

function wetterInhalt(eintrag, offline, kultur, offen) {
  const heute = heuteIso();
  const tage = tageAus(eintrag.json).filter((d) => d.datum >= heute);
  const teile = [];
  if (offline) teile.push(el('p', { class: 'hinweis-klein' }, t('w.offline', { datum: datum(new Date(eintrag.zeit).toISOString().slice(0, 10)) })));
  const c = eintrag.json?.current;
  if (c && !offline) {
    teile.push(el('div', { class: 'wetter-jetzt' }, zeichen(wetterZeichen(c.weather_code ?? 0), 'bz gross'),
      el('span', { class: 'wj-temp' }, grad(c.temperature_2m ?? 0)),
      el('span', { class: 'meta' }, t('w.jetzt', { f: zahl(Math.round(c.relative_humidity_2m ?? 0), 0), w: zahl(Math.round(c.wind_speed_10m ?? 0), 0) }))));
  }
  // 7 Tage als Bildleiste
  const leiste = el('ol', { class: 'wetter-tage' });
  for (const d of tage) {
    leiste.append(el('li', { class: d.datum === heute ? 'heute-tag' : '' },
      el('span', { class: 'wt-tag' }, d.datum === heute ? t('w.heute') : wochentag(d.datum)),
      zeichen(wetterZeichen(d.code), 'bz'),
      el('span', { class: 'wt-max' }, d.tmax === null ? '–' : grad(d.tmax)),
      el('span', { class: 'wt-min' }, d.tmin === null ? '–' : grad(d.tmin)),
      d.regen >= 0.5 ? el('span', { class: 'wt-regen' }, `\u2066${zahl(Math.round(d.regen), 0)} mm\u2069`) : el('span', { class: 'wt-regen leer' }, '·')));
  }
  teile.push(leiste);
  const frostEmpfindlich = Boolean(kultur?.frost);
  // Eigene Aufgaben
  if (kultur && offen.length) {
    const abgleich = planAbgleich(offen.filter((x) => tage.some((d) => d.datum === x.datum)), tage, frostEmpfindlich);
    const ul = el('ul', { class: 'w-plan' });
    for (const a of abgleich) {
      ul.append(el('li', {}, zeichen(`t-${a.aufgabe.typ}`, 'bz'),
        el('span', {}, el('strong', {}, a.aufgabe.titel), ` · ${tagKurz(a.aufgabe.datum)}: ${t(`w.grund.${a.grund}`)}. `,
          a.neu ? t('w.plan.besser', { tag: tagKurz(a.neu) }) : t('w.plan.warten'))));
    }
    const kommende = offen.filter((x) => tage.some((d) => d.datum === x.datum));
    if (kommende.length) {
      teile.push(el('div', { class: 'karte w-plan-karte' }, el('h3', {}, t('w.plan.titel')),
        abgleich.length ? ul : el('p', {}, t('w.plan.passt', { n: zahl(kommende.length, 0) }))));
    }
  }
  const liste = warnungen(tage, { frostEmpfindlich });
  if (!liste.some((w) => w.stufe !== 'gruen')) teile.push(el('p', { class: 'wetter-ruhig' }, zeichen('wt-gut', 'bz'), t('w.ruhig')));
  for (const w of liste) {
    const tun = el('ul', { class: 'w-tun' });
    for (let i = 1; i <= w.tun; i++) tun.append(el('li', {}, t(`w.${w.id}.tun${i}`)));
    const lassen = el('ul', { class: 'w-lassen' });
    for (let i = 1; i <= w.lassen; i++) lassen.append(el('li', {}, t(`w.${w.id}.lassen${i}`)));
    const tageText = w.tage.length ? w.tage.map(tagKurz).join(t('komma')) : t('w.woche');
    teile.push(el('div', { class: `warnung w-${w.stufe}` },
      el('div', { class: 'w-kopf' }, zeichen(w.zeichen, 'bz gross'),
        el('div', {}, el('h3', {}, t(`w.${w.id}.titel`, Object.fromEntries(Object.entries(w.werte).map(([k, v]) => [k, zahl(v, 0)])))),
          el('p', { class: 'meta' }, tageText))),
      w.tun ? el('div', { class: 'w-block' }, el('p', { class: 'w-marke tun' }, '✓ ', t('w.tun')), tun) : null,
      w.lassen ? el('div', { class: 'w-block' }, el('p', { class: 'w-marke lassen' }, '✗ ', t('w.lassen')), lassen) : null));
  }
  teile.push(wasGehtTeil(tage));
  teile.push(regenTeil(eintrag.json, offline));
  teile.push(krankheitTeil(tage, kultur));
  teile.push(el('p', { class: 'klein' }, t('w.stand', { zeit: new Date(eintrag.zeit).toLocaleString(info().locale, { numberingSystem: 'latn', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' }) }), ' · ',
    el('a', { href: 'https://open-meteo.com/', target: '_blank', rel: 'noopener noreferrer' }, t('w.quelle'))));
  return teile;
}

// ---------- Befall erkennen ----------
const befallForm = $('#befall-form');
let befallFoto = '';
let befallFotoGross = '';
let kiAuftrag = 0;

function ernteFuer(kulturId) {
  const plan = lesen(SPEICHER_PLAN);
  if (!plan || plan.kultur !== kulturId) return null;
  const a = daten.anbau.kulturen[kulturId];
  return { beginn: plusTage(plan.start, a.ernte[0]), ende: plusTage(plan.start, a.ernte[1]) };
}

function befallKnopf(kulturId) {
  const knopf = el('button', { type: 'button', class: 'knopf-zweit' }, t('bef.melden'));
  knopf.addEventListener('click', () => {
    $('#befall-kultur').value = kulturId;
    zeigeAnsicht('befall', true);
  });
  return knopf;
}

function befallStart() {
  const wahl = $('#befall-kultur');
  for (const k of [...daten.kulturen].sort(nachName)) wahl.append(el('option', { value: k.id }, k.name));
  const plan = lesen(SPEICHER_PLAN);
  if (plan?.kultur) wahl.value = plan.kultur;
  wahl.addEventListener('change', () => { kiAuftrag++; symptomeZeigen(); $('#befund').replaceChildren(); });
  befallForm.addEventListener('submit', (ev) => { ev.preventDefault(); befundZeigen(); });
  $('#befall-foto').addEventListener('change', fotoLaden);
  $('#foto-weg').addEventListener('click', () => {
    befallFoto = '';
    befallFotoGross = '';
    $('#befall-foto').value = '';
    $('#foto-vorschau').hidden = true;
  });
}

function symptomeZeigen() {
  const kat = daten.krank;
  const kultur = $('#befall-kultur').value;
  const alleIds = daten.kulturen.map((k) => k.id);
  const relevant = new Set();
  for (const kr of kat.krankheiten) {
    if (kultur && !kulturenVon(kr, kat, alleIds).has(kultur)) continue;
    Object.keys(kr.s).forEach((s) => relevant.add(s));
  }
  const gewaehlt = new Set(new FormData(befallForm).getAll('symptom'));
  const ziel = $('#symptom-wahl');
  ziel.replaceChildren();
  for (const g of kat.gruppen) {
    const teil = kat.symptome.filter((s) => s.g === g.id && relevant.has(s.id));
    if (!teil.length) continue;
    const wahl = el('div', { class: 'wahl wahl-mehr' });
    for (const s of teil) {
      const cb = el('input', { type: 'checkbox', name: 'symptom', value: s.id });
      cb.checked = gewaehlt.has(s.id);
      wahl.append(el('label', {}, cb, el('span', {}, foto(`symptom:${s.id}`, '', true), s.t)));
    }
    ziel.append(el('div', { class: 'symptom-gruppe', role: 'group', 'aria-label': g.name }, el('h3', {}, zeichen(`g-${g.id}`), g.name), wahl));
  }
}

async function fotoLaden(ev) {
  const datei = ev.target.files?.[0];
  if (!datei) return;
  const status = $('#befall-status');
  try {
    const bild = await createImageBitmap(datei);
    const faktor = Math.min(1, 480 / Math.max(bild.width, bild.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bild.width * faktor);
    c.height = Math.round(bild.height * faktor);
    c.getContext('2d').drawImage(bild, 0, 0, c.width, c.height);
    befallFoto = c.toDataURL('image/jpeg', 0.72);
    befallFotoGross = '';
    if (ki.bild) {
      // Für die KI eine schärfere Fassung, die nur im Speicher bleibt
      const g = document.createElement('canvas');
      const fg = Math.min(1, 1024 / Math.max(bild.width, bild.height));
      g.width = Math.round(bild.width * fg);
      g.height = Math.round(bild.height * fg);
      g.getContext('2d').drawImage(bild, 0, 0, g.width, g.height);
      befallFotoGross = g.toDataURL('image/jpeg', 0.85);
    }
    $('#foto-bild').src = befallFoto;
    $('#foto-vorschau').hidden = false;
    status.textContent = '';
  } catch {
    befallFoto = '';
    befallFotoGross = '';
    status.textContent = t('bef.foto.fehler');
  }
}

function liste(eintraege) {
  const ul = el('ul');
  for (const x of eintraege) ul.append(el('li', {}, x));
  return ul;
}

// kiBefund: Antwort der eigenen KI zum Foto (oder null). Ohne Antwort wird sie hier angefragt.
function befundZeigen(kiBefund = null) {
  const f = new FormData(befallForm);
  const kulturId = f.get('kultur');
  const ziel = $('#befund');
  ziel.replaceChildren();
  if (!kiBefund) kiAuftrag++;
  if (!kulturId) {
    ziel.append(el('p', { class: 'hinweis-box' }, t('bef.erstKultur')));
    $('#befall-kultur').focus();
    return;
  }
  const anfrage = { kultur: kulturId, symptome: f.getAll('symptom'), text: f.get('text') ?? '', wetter: f.get('wetter') ?? '' };
  const mitKi = ki.bild && befallFoto;
  if (!anfrage.symptome.length && !anfrage.text.trim() && !mitKi) {
    ziel.append(el('p', { class: 'hinweis-box' }, t('bef.erstSymptom')));
    return;
  }
  if (kiBefund) anfrage.symptome = [...new Set([...anfrage.symptome, ...kiBefund.symptome])];
  const kat = daten.krank;
  const kultur = daten.kulturen.find((k) => k.id === kulturId);
  const { liste: treffer } = diagnose(anfrage, kat, daten.kulturen, formularLesen());
  ziel.append(el('h2', { id: 'h-befund', tabindex: '-1' }, t('bef.ursachen', { kultur: kultur.name })));
  if (kiBefund) ziel.append(kiKarte(kiBefund));
  else if (mitKi) kiAnfragen(kulturId, ziel);
  if (!treffer.length) {
    ziel.append(el('div', { class: 'hinweis-box' },
      el('p', {}, t('bef.keine')),
      el('p', {}, t('bef.keine.onca'))));
    if (!kiBefund) $('#h-befund').focus();
    return;
  }
  ziel.append(el('p', { class: 'meta' }, t('bef.reihenfolge')));
  const ernte = ernteFuer(kulturId);
  treffer.forEach((x, i) => ziel.append(befundKarte(x, kultur, ernte, i === 0)));
  const hilfeKnopf = el('button', { type: 'button', class: 'link-knopf' }, t('bef.zurHilfe'));
  hilfeKnopf.addEventListener('click', () => zeigeAnsicht('hilfe', true));
  ziel.append(el('div', { class: 'hinweis-box' },
    el('h2', {}, t('bef.unsicher')),
    el('p', {}, t('bef.unsicher.text')),
    hilfeKnopf));
  if (!kiBefund) $('#h-befund').focus();
}

function kiAnfragen(kulturId, ziel) {
  const nr = kiAuftrag;
  const hinweis = el('p', { class: 'hinweis-box ki-laeuft', role: 'status' }, t('ki.pruefen'));
  ziel.append(hinweis);
  bildPruefen(kulturId, befallFotoGross || befallFoto)
    .then((antwort) => { if (nr === kiAuftrag) befundZeigen(antwort); })
    .catch(() => { if (nr === kiAuftrag) { hinweis.classList.remove('ki-laeuft'); hinweis.textContent = t('ki.fehler'); } });
}

function kiKarte(antwort) {
  const kat = daten.krank;
  const karte = el('div', { class: 'karte ki-karte', role: 'status' }, el('h3', {}, t('ki.titel')));
  if (antwort.bildUnklar) karte.append(el('p', {}, t('ki.unklar')));
  else if (antwort.gesund) karte.append(el('p', {}, t('ki.gesund')));
  else if (!antwort.symptome.length) karte.append(el('p', {}, t('ki.nichts')));
  else {
    const namen = antwort.symptome.map((id) => kat.symptome.find((s) => s.id === id)?.t).filter(Boolean);
    karte.append(el('p', {}, t('ki.gesehen', { liste: namen.join(t('komma')) })));
  }
  const kr = antwort.krankheit && kat.krankheiten.find((x) => x.id === antwort.krankheit);
  if (kr && !antwort.gesund) {
    karte.append(el('p', {}, t('ki.vermutung', { name: kr.name }), ' ',
      el('span', { class: 'marke marke-sicherheit' }, t(`sicherheit.${antwort.sicherheit}`))));
  }
  karte.append(el('p', { class: 'klein' }, t('ki.hinweis')));
  return karte;
}

function befundKarte(treffer, kultur, ernte, offen) {
  const kr = treffer.krankheit;
  const kat = daten.krank;
  const karte = el('details', { class: `karte befund-karte sich-${treffer.sicherheit}`, 'data-krankheit': kr.id },
    el('summary', {},
      foto(`krankheit:${kr.id}`, '', true),
      el('strong', {}, kr.name),
      el('span', { class: 'marke marke-sicherheit' }, t(`sicherheit.${treffer.sicherheit}`)),
      el('span', { class: 'marke' }, kat.arten[kr.art])));
  if (offen) karte.open = true;
  const inhalt = el('div', { class: 'befund-inhalt' });
  const bild = foto(`krankheit:${kr.id}`, kr.name);
  if (bild) inhalt.append(bild);
  inhalt.append(el('p', {}, kr.e));
  if (treffer.warum.length) inhalt.append(el('p', { class: 'klein' }, treffer.warum.join(' ')));
  if (sprache() !== 'fr') inhalt.append(el('p', { class: 'klein' }, t('bef.franzoesisch'), ' ', el('span', { lang: 'fr', dir: 'ltr' }, kr.fr)));
  if (kr.hinweis) inhalt.append(el('p', { class: 'hinweis-box' }, kr.hinweis));

  inhalt.append(el('h3', {}, t('bef.sofort')), liste(kr.sofort));
  inhalt.append(el('h3', {}, t('bef.bio')), liste(kr.bio));
  if (kr.chem.length) {
    const ul = el('ul');
    for (const c of kr.chem) {
      let text = t('bef.chem.wz', { w: c.w, n: zahl(c.wz, 0) });
      if (c.h) text += ` ${c.h}`;
      const letzt = ernte && letzterEinsatz(ernte.beginn, c.wz);
      if (letzt) text += ` ${t('bef.chem.letzt', { datum: datum(letzt) })}`;
      ul.append(el('li', {}, text));
    }
    inhalt.append(el('div', { class: 'chem' },
      el('h4', {}, t('bef.chem')),
      el('p', { class: 'klein' }, kat.onssa.text),
      ul,
      el('p', { class: 'klein' }, `${t('bef.chem.zugelassen')} `, aussenLink(kat.onssa.url, 'ONSSA'), ` ${t('bef.chem.etikett')}`)));
  }
  inhalt.append(el('h3', {}, t('bef.vorbeugend')), liste(kr.vor));

  const knopf = el('button', { type: 'button', class: 'knopf-haupt kontrollen-knopf' }, t('bef.inKalender'));
  knopf.addEventListener('click', () => {
    fallSpeichern(kr.id, kultur.id);
    zeigeAnsicht('kalender', true);
    document.getElementById('h-befall')?.scrollIntoView({ block: 'start' });
  });
  const termine = kontrollTermine(heuteIso(), ernte?.ende);
  inhalt.append(el('p', { class: 'meta' }, t(ernte ? 'bef.termine.ernte' : 'bef.termine', { n: zahl(termine.length, 0), datum: datum(termine[0].datum) })),
    el('p', { class: 'zeile-knopf' }, knopf));
  const vl = vorleseKnopf(() => inhalt);
  if (vl) inhalt.prepend(el('p', { class: 'zeile-knopf' }, vl));
  karte.append(inhalt);
  return karte;
}

function faelle() {
  const f = lesen(SPEICHER_BEFALL);
  return Array.isArray(f) ? f : [];
}

function fallSpeichern(krankheit, kultur) {
  const alle = faelle();
  const vorhanden = alle.find((x) => x.krankheit === krankheit && x.kultur === kultur);
  if (vorhanden) {
    if (befallFoto) vorhanden.foto = befallFoto;
  } else {
    alle.push({ id: Date.now().toString(36), krankheit, kultur, start: heuteIso(), foto: befallFoto, erledigt: {} });
    const kr = daten.krank.krankheiten.find((x) => x.id === krankheit);
    const ku = daten.kulturen.find((x) => x.id === kultur);
    if (kr && ku) eintragen({ typ: 'befall', text: t('bef.fall', { name: kr.name, kultur: ku.name }) });
  }
  if (!schreiben(SPEICHER_BEFALL, alle) && befallFoto) {
    for (const x of alle) if (x.krankheit === krankheit && x.kultur === kultur) x.foto = '';
    schreiben(SPEICHER_BEFALL, alle);
  }
}

function befallTeil() {
  const alle = faelle();
  if (!alle.length) return null;
  const heute = heuteIso();
  const teil = el('section', { class: 'hilfe-teil', 'aria-labelledby': 'h-befall' }, el('h2', { id: 'h-befall' }, t('bef.kontrollen')));
  for (const fall of alle) {
    const kr = daten.krank.krankheiten.find((x) => x.id === fall.krankheit);
    const kultur = daten.kulturen.find((x) => x.id === fall.kultur);
    if (!kr || !kultur) continue;
    const ernte = ernteFuer(fall.kultur);
    const termine = kontrollTermine(fall.start, ernte?.ende);
    const fertig = termine.filter((x) => fall.erledigt?.[x.tag]).length;
    const abschluss = el('button', { type: 'button', class: 'link-knopf' }, t('bef.abschliessen'));
    abschluss.addEventListener('click', () => {
      if (!window.confirm(t('bef.abschliessen.frage', { name: kr.name, kultur: kultur.name }))) return;
      schreiben(SPEICHER_BEFALL, faelle().filter((x) => x.id !== fall.id));
      zeigeKalender(formularLesen());
    });
    const karte = el('div', { class: 'karte' },
      el('div', { class: 'fall-kopf' },
        el('div', {}, el('h3', {}, t('bef.fall', { name: kr.name, kultur: kultur.name })),
          el('p', { class: 'klein' }, t('bef.fall.stand', { datum: datum(fall.start), fertig: zahl(fertig, 0), alle: zahl(termine.length, 0) }))),
        abschluss));
    if (fall.foto) karte.append(el('img', { class: 'fall-foto', src: fall.foto, alt: t('bef.fall.foto', { datum: datum(fall.start), name: kr.name }) }));
    if (kr.chem.length && ernte) {
      const lang = kr.chem.reduce((m, c) => Math.max(m, c.wz), 0);
      karte.append(el('p', { class: 'klein' }, t('bef.fall.chem', { n: zahl(lang, 0), datum: datum(letzterEinsatz(ernte.beginn, lang)) })));
    }
    const ul = el('ul', { class: 'aufgaben' });
    for (const x of termine) {
      const id = `k-${fall.id}-${x.tag}`;
      const cb = el('input', { type: 'checkbox', id });
      cb.checked = Boolean(fall.erledigt?.[x.tag]);
      cb.addEventListener('change', () => {
        const alleNeu = faelle();
        const f = alleNeu.find((y) => y.id === fall.id);
        if (!f) return;
        f.erledigt = { ...(f.erledigt ?? {}) };
        if (cb.checked) f.erledigt[x.tag] = true; else delete f.erledigt[x.tag];
        schreiben(SPEICHER_BEFALL, alleNeu);
        zeigeKalender(formularLesen());
        document.getElementById(id)?.focus();
      });
      const zustand = cb.checked ? 'erledigt' : x.datum < heute ? 'ueberfaellig' : x.datum <= plusTage(heute, 7) ? 'bald' : '';
      ul.append(el('li', { class: `aufgabe typ-befall ${zustand}` }, cb,
        el('label', { for: id },
          zeichen('t-kontrolle', 'a-zeichen'),
          el('span', { class: 'a-datum' }, datum(x.datum), ' · ', arabisch(fellahText(x.datum))),
          el('span', { class: 'a-titel' }, t('bef.kontrolle.tag', { n: zahl(x.tag, 0) }), ' ', el('span', { class: 'marke' }, t('typ.befall'))),
          el('span', { class: 'a-text' }, t(x.tag === 3 ? 'bef.kontrolle.erste' : 'bef.kontrolle.weitere')))));
    }
    karte.append(ul);
    teil.append(karte);
  }
  return teil.childElementCount > 1 ? teil : null;
}

// ---------- Hilfe und Förderung ----------
function aussenLink(url, text) {
  return el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', dir: 'ltr' }, text ?? url.replace(/^https:\/\//, ''));
}

function quelleZeile(id) {
  const q = daten.hilfe.quellen[id];
  if (!q) return null;
  return el('p', { class: 'klein' }, `${t('hilfe.quelle')} `, aussenLink(q.url, q.name));
}

function zeigeHilfe(feld) {
  const h = daten.hilfe;
  const ziel = $('#hilfe');
  ziel.replaceChildren();

  ziel.append(el('div', { class: 'hinweis-box grundsatz' },
    el('h2', {}, t('hilfe.zinsfrei')),
    el('p', {}, h.grundsatz),
    el('p', { class: 'klein' }, t('hilfe.stand', { stand: h.stand }))));

  const zone = daten.zonen.find((z) => z.id === feld.zone);
  const region = el('section', { class: 'hilfe-teil', 'aria-labelledby': 'h-region' }, el('h2', { id: 'h-region' }, t('hilfe.ansprechpartner')));
  if (zone) {
    region.append(el('div', { class: 'karte' },
      el('h3', {}, zone.name),
      foto(`zone:${zone.id}`, zone.name),
      el('p', {}, t('hilfe.region.text')),
      liste(h.regionen[zone.id].stellen),
      el('p', { class: 'klein' }, t('hilfe.region.onca'))));
  } else {
    const knopf = el('button', { type: 'button', class: 'link-knopf' }, t('hilfe.region.waehlen'));
    knopf.addEventListener('click', () => zeigeAnsicht('feld', true));
    region.append(el('div', { class: 'karte' }, el('p', {}, t('hilfe.region.leer')), knopf));
  }
  ziel.append(region);

  const ablauf = el('ol', { class: 'ablauf' });
  for (const s of h.ablauf.schritte) ablauf.append(el('li', {}, el('div', {}, el('strong', {}, s.t), s.d)));
  ziel.append(el('section', { class: 'hilfe-teil', 'aria-labelledby': 'h-ablauf' },
    el('h2', { id: 'h-ablauf' }, t('hilfe.ablauf')),
    el('div', { class: 'karte' }, ablauf,
      el('h3', {}, t('hilfe.unterlagen')), liste(h.ablauf.unterlagen),
      el('p', {}, `${h.ablauf.online.name}: `, aussenLink(h.ablauf.online.url), ` ${h.ablauf.online.hinweis}`),
      quelleZeile(h.ablauf.quelle))));

  const foerd = el('section', { class: 'hilfe-teil', 'aria-labelledby': 'h-foerd' },
    el('h2', { id: 'h-foerd' }, t('hilfe.foerd')),
    el('p', { class: 'meta' }, t('hilfe.foerd.text')));
  for (const f of h.foerderungen) {
    foerd.append(el('details', { class: 'karte', id: `f-${f.id}` },
      el('summary', {}, el('strong', {}, f.titel)),
      liste(f.saetze),
      f.hinweis ? el('p', { class: 'klein' }, f.hinweis) : null,
      quelleZeile(f.quelle)));
  }
  ziel.append(foerd);

  const stellen = el('section', { class: 'hilfe-teil', 'aria-labelledby': 'h-stellen' }, el('h2', { id: 'h-stellen' }, t('hilfe.stellen')));
  for (const s of h.stellen) {
    stellen.append(el('div', { class: 'karte' },
      el('h3', {}, s.name, ' ', el('span', { class: 'marke' }, s.kosten)),
      el('p', {}, s.aufgabe),
      s.web ? el('p', { class: 'klein' }, `${t('hilfe.web')} `, aussenLink(s.web)) : null,
      s.geprueft ? quelleZeile(s.quelle) : el('p', { class: 'klein' }, el('span', { class: 'marke marke-pruefen' }, t('hilfe.pruefen')))));
  }
  ziel.append(stellen);

  const tel = el('ul');
  for (const k of h.kontakte) tel.append(el('li', {}, `${k.name}: `, el('a', { href: `tel:${k.tel.replace(/\s/g, '')}`, dir: 'ltr' }, k.tel)));
  ziel.append(el('section', { class: 'hilfe-teil', 'aria-labelledby': 'h-tel' },
    el('h2', { id: 'h-tel' }, t('hilfe.tel')),
    el('div', { class: 'karte' }, tel,
      el('p', { class: 'klein' }, t('hilfe.tel.text')),
      quelleZeile('cagor'))));

  const nachweise = Object.values(bilder).filter((b, i, a) => b.seite && a.findIndex((x) => x.seite === b.seite) === i);
  if (nachweise.length) {
    const ul = el('ul', { class: 'klein', dir: 'ltr' });
    for (const b of nachweise) ul.append(el('li', {}, `${b.autor} · `, el('a', { href: b.seite, target: '_blank', rel: 'noopener noreferrer' }, b.lizenz)));
    ziel.append(el('details', { class: 'karte' }, el('summary', {}, el('strong', {}, t('hilfe.bilder'))), ul));
  }
}

// ---------- GPS ----------
function standortErmitteln() {
  const status = $('#gps-status');
  if (!('geolocation' in navigator)) { status.textContent = t('gps.nein'); return; }
  status.textContent = t('gps.sucht');
  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude: lat, longitude: lon } = pos.coords;
    const treffer = zoneAusKoordinaten(lat, lon, daten.orte);
    form.dataset.lat = lat; form.dataset.lon = lon;
    $('#zone-wahl').value = treffer.zone;
    zoneBild();
    const z = daten.zonen.find((x) => x.id === treffer.zone);
    status.textContent = t('gps.gefunden', { ort: treffer.ort, zone: z.name });
    speichern(false);
  }, () => {
    status.textContent = t('gps.fehler');
  }, { timeout: 15000, maximumAge: 600000 });
}

// ---------- Start ----------
async function start() {
  swRegistrieren();
  felderLaden();
  const gewuenscht = lesen(SPEICHER_SPRACHE);
  const code = SPRACHEN[gewuenscht] ? gewuenscht : STANDARD;
  try {
    daten = await ladeDaten(code);
  } catch {
    $('main').prepend(el('p', { class: 'hinweis-box' }, 'تعذر تحميل البيانات. شغّل التطبيق عبر start.command · Impossible de charger les données : lancez l’application avec start.command.'));
    return;
  }
  ki = await kiStatus();
  bildGrossStart();
  texteSetzen();
  auswahlFuellen();
  felderStart();
  appStart();
  $('#sicher-export').addEventListener('click', sichernExport);
  $('#sicher-import').addEventListener('change', sichernImport);
  window.addEventListener('beforeprint', druckVorbereiten);
  window.addEventListener('afterprint', druckEnde);
  const gespeichert = lesen(SPEICHER);
  if (gespeichert) {
    formularFuellen(gespeichert.roh);
    if (gespeichert.lat) { form.dataset.lat = gespeichert.lat; form.dataset.lon = gespeichert.lon; }
  }
  $('#kopf-feld').textContent = gespeichert?.roh?.name || t('feld.neu');
  bewaesserungUmschalten();

  form.addEventListener('input', () => { bewaesserungUmschalten(); speichern(); });
  form.addEventListener('submit', (ev) => { ev.preventDefault(); speichern(false); zeigeAnsicht('empfehlung', true); });
  $('#gps-knopf').addEventListener('click', standortErmitteln);
  befallStart();
  for (const k of document.querySelectorAll('.reiter-knopf')) k.addEventListener('click', () => zeigeAnsicht(k.dataset.ansicht, true));
  const tasten = { 1: 'feld', 2: 'empfehlung', 3: 'kalender', 4: 'befall', 5: 'hilfe' };
  document.addEventListener('keydown', (ev) => {
    if (ev.altKey && tasten[ev.key]) zeigeAnsicht(tasten[ev.key], true);
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') form.requestSubmit();
  });
  document.addEventListener('vorlesen-hinweis', () => {
    const s = $('.ansicht:not([hidden]) .titel-zeile');
    if (s && !s.querySelector('.vl-hinweis')) s.append(el('p', { class: 'klein vl-hinweis', role: 'status' }, t('vorlesen.keineStimme')));
  });

  const letzte = lesen(SPEICHER_ANSICHT);
  zeigeAnsicht(['empfehlung', 'kalender', 'befall', 'hilfe'].includes(letzte) ? letzte : 'feld');
}

start();
