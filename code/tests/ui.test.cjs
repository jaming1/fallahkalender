// UI-Test: node tests/ui.test.cjs  (braucht Playwright; startet eigenen Server)
// Prüft den ganzen Ablauf auf Arabisch und Französisch (Handy/PC, hell/dunkel)
// und eine Kurzrunde auf Darija und Tamazight.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const PORT = 8799;
const URL = `http://127.0.0.1:${PORT}/`;
const OUT = path.join(__dirname, 'screenshots');
const SRC = path.join(__dirname, '..', 'src');
const sprache = (c) => JSON.parse(fs.readFileSync(path.join(SRC, 'sprachen', `${c}.json`), 'utf8'));
const BESCHREIBUNG = { ar: 'بقع بنية فيها حلقات على الأوراق السفلى', fr: 'taches brunes avec des cercles sur les feuilles du bas', dar: 'بقع قهويين فيهم دوائر فالورق اللي لتحت', zgh: '' };

let ok = true;
const fehlt = (text) => { ok = false; console.log('FEHLER', text); };

async function zuBreit(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

async function feldAusfuellen(page) {
  if (!(await page.locator('#ansicht-feld').isVisible())) await page.click('.reiter-knopf[data-ansicht=feld]');
  await page.fill('input[name=name]', 'Bir 1');
  await page.selectOption('#zone-wahl', 'souss');
  await page.fill('input[name=flaeche]', '1');
  await page.selectOption('#monat-wahl', '10');
  await page.check('input[value=tropf]');
  await page.fill('input[name=wasserMenge]', '60');
  await page.fill('input[name=wasserPh]', '7.6');
  await page.fill('input[name=wasserEc]', '2.5');
  await page.check('input[value=lehm]');
  await page.fill('input[name=bodenPh]', '7.8');
  await page.fill('input[name=humus]', '0.8');
  await page.selectOption('select[name=p]', 'niedrig');
  await page.selectOption('select[name=vj0]', 'tomate');
  await page.selectOption('select[name=vj1]', 'hartweizen');
}

// Sichtbarer Text darf keine Schlüssel (z. B. „feld.titel“), keine Ziffern ٠–٩ und kein Deutsch enthalten
async function textPruefen(page, wo) {
  const text = await page.evaluate(() => document.body.innerText);
  const schluessel = text.match(/\b(app|nav|feld|felder|sicher|tb|empf|kal|bef|hilfe|stufe|fehlt|typ|p\.a|e\.ff|d\.w)\.[a-zA-Z]+(\.[a-zA-Z]+)*\b/);
  if (schluessel) fehlt(`${wo}: Textschlüssel sichtbar: ${schluessel[0]}`);
  if (/[٠-٩۰-۹]/.test(text)) fehlt(`${wo}: östliche Ziffern`);
  const deutsch = text.match(/[äöüß]|Düngeplan|Kalender|Pflanze|Wasser/);
  if (deutsch) fehlt(`${wo}: deutscher Text „${deutsch[0]}“`);
}

// Wetter und Radar ohne Netz: feste Vorhersage ab heute (Regen, Hitze, Wind, feucht-warm)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
function wetterAntwort() {
  const tage = Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 864e5).toISOString().slice(0, 10));
  const stunden = Array.from({ length: 48 }, (_, i) => new Date(Date.now() + i * 36e5).toISOString().slice(0, 13) + ':00');
  return {
    current: { temperature_2m: 27.4, relative_humidity_2m: 71, weather_code: 2, wind_speed_10m: 12 },
    hourly: { time: stunden, precipitation: stunden.map((_, i) => (i > 20 && i < 30 ? 1.5 : 0)), precipitation_probability: stunden.map(() => 60) },
    daily: { time: tage, weather_code: [2, 61, 63, 0, 0, 1, 3], temperature_2m_max: [27, 26, 25, 36, 37, 38, 30], temperature_2m_min: [14, 16, 15, 20, 22, 23, 18],
      precipitation_sum: [0, 6, 24, 0, 0, 0, 0], precipitation_probability_max: [10, 80, 95, 0, 0, 0, 10], wind_speed_10m_max: [10, 18, 25, 12, 10, 14, 30],
      wind_gusts_10m_max: [20, 35, 65, 25, 22, 28, 50], et0_fao_evapotranspiration: [4, 2, 1, 7, 7, 8, 6], relative_humidity_2m_mean: [60, 88, 92, 40, 35, 30, 50] },
  };
}
async function wetterNachbilden(ctx) {
  await ctx.route('https://api.open-meteo.com/**', (r) => r.fulfill({ json: wetterAntwort(), headers: { 'access-control-allow-origin': '*' } }));
  await ctx.route('https://api.rainviewer.com/**', (r) => r.fulfill({ json: { host: 'https://tilecache.rainviewer.com', radar: { past: [{ time: 1762650000, path: '/v2/radar/1' }, { time: 1762650600, path: '/v2/radar/2' }], nowcast: [] } }, headers: { 'access-control-allow-origin': '*' } }));
  await ctx.route(/tile\.openstreetmap\.org|tilecache\.rainviewer\.com/, (r) => r.fulfill({ body: PNG, contentType: 'image/png' }));
}

async function ablauf(browser, code, name, vp, scheme, voll) {
  const spr = sprache(code);
  const basis = spr.daten.hilfe ? spr : sprache('ar');
  const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, reducedMotion: 'reduce' });
  await ctx.addInitScript((c) => { try { if (!sessionStorage.getItem('gesetzt')) { localStorage.setItem('fallahkalender.sprache', JSON.stringify(c)); sessionStorage.setItem('gesetzt', '1'); } } catch {} }, code);
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error') fehler.push(`${code}: ${m.text()}`); });
  page.on('pageerror', (e) => fehler.push(`${code}: ${e}`));
  const tag = `${code}-${name}-${scheme}`;
  await page.goto(URL);
  await page.waitForFunction(() => document.querySelectorAll('#zone-wahl option').length > 1);

  const dir = await page.evaluate(() => document.documentElement.dir);
  if (dir !== (code === 'ar' || code === 'dar' ? 'rtl' : 'ltr')) fehlt(`${tag}: falsche Schreibrichtung ${dir}`);
  if (code === 'ar' || code === 'dar') {
    const richtung = await page.evaluate(() => getComputedStyle(document.querySelector('.ansicht:not([hidden]) p')).direction);
    if (richtung !== 'rtl') fehlt(`${tag}: Absatz nicht rechtsläufig`);
  }

  if (!(await page.locator('#ansicht-heute').isVisible())) fehlt(`${tag}: App startet nicht mit „Heute“`);
  await feldAusfuellen(page);
  await page.screenshot({ path: `${OUT}/feld-${tag}.png`, fullPage: true });
  // Startseite mit Region: Wetter, Saat, Bäume/Tiere, Tipp, Neuigkeiten; dann Maschinen
  await page.click('.reiter-knopf[data-ansicht=heute]');
  await page.waitForSelector('#heute-inhalt .wetter-tage li', { timeout: 5000 }).catch(() => fehlt(`${tag}: Heute ohne Wetter`));
  if (!(await page.locator('#heute-inhalt .heute').count())) fehlt(`${tag}: Heute ohne Bauernkalender`);
  if (!(await page.locator('#heute-inhalt .jahr-liste li').count())) fehlt(`${tag}: Heute ohne Bäume/Tiere`);
  if (!(await page.locator('#h-tipp').count())) fehlt(`${tag}: kein Tipp des Tages`);
  if (!(await page.locator('.neu-liste li').count())) fehlt(`${tag}: keine Neuigkeiten`);
  if (await zuBreit(page)) fehlt(`${tag}: horizontales Scrollen Heute`);
  await page.screenshot({ path: `${OUT}/heute-${tag}.png`, fullPage: true });
  await textPruefen(page, `${tag} Heute`);
  await page.locator('.tipp .knopf-zweit').last().click();
  await page.waitForSelector('#maschinen-inhalt .maschine');
  if ((await page.locator('#maschinen-inhalt .maschine').count()) !== 12) fehlt(`${tag}: nicht 12 Maschinen`);
  await page.locator('#maschinen-inhalt details.maschine').first().locator('summary').click();
  if (await zuBreit(page)) fehlt(`${tag}: horizontales Scrollen Maschinen`);
  await page.screenshot({ path: `${OUT}/maschinen-${tag}.png`, fullPage: true });
  await textPruefen(page, `${tag} Maschinen`);
  await page.click('.reiter-knopf[data-ansicht=feld]');
  await textPruefen(page, `${tag} Feld`);
  if (await zuBreit(page)) fehlt(`${tag}: horizontales Scrollen Feld`);

  await page.click('button[type=submit]');
  await page.waitForSelector('.reihe');
  if (!(await page.locator('.g-ungeeignet .reihe[data-kultur=tomate]').count())) fehlt(`${tag}: Tomate nicht ungeeignet`);
  if (!voll) {
    await page.locator('.reihe[data-kultur=paprika] summary').click();
    await textPruefen(page, `${tag} Empfehlung`);
    await page.screenshot({ path: `${OUT}/empfehlung-${tag}.png`, fullPage: true });
    if (await zuBreit(page)) fehlt(`${tag}: horizontales Scrollen Empfehlung`);
    await page.click('.reiter-knopf[data-ansicht=befall]');
    await page.selectOption('#befall-kultur', 'tomate');
    await page.check('input[name=symptom][value=b-ringe]');
    await page.check('input[name=symptom][value=b-gelb-unten]');
    if (BESCHREIBUNG[code]) await page.fill('textarea[name=text]', BESCHREIBUNG[code]);
    await page.click('#befall-form button[type=submit]');
    await page.waitForSelector('.befund-karte');
    const erster = await page.locator('.befund-karte').first().getAttribute('data-krankheit');
    if (erster !== 'duerrflecken') fehlt(`${tag}: Befall erster Treffer ${erster}`);
    await page.screenshot({ path: `${OUT}/befall-${tag}.png`, fullPage: true });
    if (await zuBreit(page)) fehlt(`${tag}: horizontales Scrollen Befall`);
    await ctx.close();
    return fehler;
  }
  await page.locator('.g-sehr-gut .reihe summary, .g-gut .reihe summary').first().click();
  await page.screenshot({ path: `${OUT}/empfehlung-${tag}.png`, fullPage: true });
  await textPruefen(page, `${tag} Empfehlung`);

  const paprika = page.locator('.reihe[data-kultur=paprika]');
  await paprika.locator('summary').click();
  if (!(await paprika.locator('.machbar .schritte li').count())) fehlt(`${tag}: keine Maßnahmen bei Paprika`);
  await paprika.screenshot({ path: `${OUT}/machbar-${tag}.png` });

  await paprika.locator('.kal-knopf').click();
  await page.waitForSelector('.aufgabe');
  if (!(await page.locator('.heute .ar').count())) fehlt(`${tag}: Fellah-Datum fehlt`);
  await page.locator('.aufgabe input').first().check();
  await page.reload();
  await page.waitForSelector('#heute-inhalt .heute');
  await page.click('.reiter-knopf[data-ansicht=kalender]');
  await page.waitForSelector('.aufgabe');
  if (!(await page.locator('.aufgabe input').first().isChecked())) fehlt(`${tag}: Abhaken nicht gespeichert`);
  if ((await page.locator('.tagebuch li').count()) !== 1) fehlt(`${tag}: Abhaken steht nicht im Feldtagebuch`);
  await page.fill('#tb-notiz', code === 'fr' ? 'arrosé 2 heures' : 'سقيت ساعتين');
  await page.click('#tagebuch-form button[type=submit]');
  if ((await page.locator('.tagebuch li').count()) !== 2) fehlt(`${tag}: Notiz nicht im Feldtagebuch`);
  await page.locator('.duengeplan summary').click();
  await page.waitForSelector('#kalender .wetter-tage li', { timeout: 5000 }).catch(() => fehlt(`${tag}: Wetter fehlt`));
  if ((await page.locator('#kalender .wetter-tage li').count()) !== 7) fehlt(`${tag}: nicht 7 Wettertage`);
  if (!(await page.locator('.warnung.w-rot').count())) fehlt(`${tag}: keine rote Wetterwarnung`);
  if ((await page.locator('.wg-tabelle tbody tr').count()) !== 6) fehlt(`${tag}: Tabelle „Was geht“ unvollständig`);
  if (!(await page.locator('.krank-liste li').count())) fehlt(`${tag}: keine Krankheitswarnung nach Wetter`);
  await page.locator('.regen-karte .knopf-zweit').click();
  await page.waitForSelector('.radar img', { timeout: 5000 }).catch(() => fehlt(`${tag}: Regenradar fehlt`));
  await page.locator('.wetter').screenshot({ path: `${OUT}/wetter-${tag}.png` });
  await page.screenshot({ path: `${OUT}/kalender-${tag}.png`, fullPage: true });
  if (name === 'handy' && scheme === 'light') {
    await page.emulateMedia({ media: 'print' });
    await page.screenshot({ path: `${OUT}/druck-${code}.png`, fullPage: true });
    if (await page.locator('.reiter').isVisible()) fehlt(`${tag}: Reiter im Druck sichtbar`);
    await page.emulateMedia({ media: 'screen' });
  }
  await textPruefen(page, `${tag} Kalender`);
  if (await zuBreit(page)) fehlt(`${tag}: horizontales Scrollen Kalender`);

  await page.click('.reiter-knopf[data-ansicht=befall]');
  await page.selectOption('#befall-kultur', 'tomate');
  await page.check('input[name=symptom][value=b-ringe]');
  await page.check('input[name=symptom][value=b-gelb-unten]');
  if (BESCHREIBUNG[code]) await page.fill('textarea[name=text]', BESCHREIBUNG[code]);
  await page.click('#befall-form button[type=submit]');
  await page.waitForSelector('.befund-karte');
  const erster = await page.locator('.befund-karte').first().getAttribute('data-krankheit');
  if (erster !== 'duerrflecken') fehlt(`${tag}: Befall erster Treffer ${erster}`);
  await page.screenshot({ path: `${OUT}/befall-${tag}.png`, fullPage: true });
  await textPruefen(page, `${tag} Befall`);
  if (await zuBreit(page)) fehlt(`${tag}: horizontales Scrollen Befall`);
  await page.locator('.befund-karte .kontrollen-knopf').first().click();
  await page.waitForSelector('.typ-befall');
  if ((await page.locator('.typ-befall').count()) < 3) fehlt(`${tag}: zu wenige Kontrolltermine`);
  await page.locator('.hilfe-teil:has(#h-befall)').screenshot({ path: `${OUT}/kontrollen-${tag}.png` });

  await page.click('.reiter-knopf[data-ansicht=hilfe]');
  await page.waitForSelector('#f-tropf');
  const stelle = basis.daten.hilfe.regionen.souss.stellen[0];
  if (!(await page.getByText(stelle, { exact: false }).count())) fehlt(`${tag}: Region Souss fehlt`);
  await page.screenshot({ path: `${OUT}/hilfe-${tag}.png`, fullPage: true });
  await textPruefen(page, `${tag} Hilfe`);
  if (await zuBreit(page)) fehlt(`${tag}: horizontales Scrollen Hilfe`);

  await page.click('.reiter-knopf[data-ansicht=kalender]');
  await page.click('#kal-fertig');
  await page.waitForSelector('#kal-fertig', { state: 'detached' });
  if ((await page.locator('.tagebuch .tb-ernte').count()) !== 1) fehlt(`${tag}: Saisonende nicht im Feldtagebuch`);

  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#zone-wahl option').length > 1);
  if ((await page.evaluate(() => document.querySelector('#kopf-feld').textContent)) !== 'Bir 1') fehlt(`${tag}: nicht gespeichert`);
  const vj = await page.evaluate(() => ['vj0', 'vj1', 'vj2'].map((n) => document.querySelector(`select[name=${n}]`).value).join(','));
  if (vj !== 'paprika,tomate,hartweizen') fehlt(`${tag}: Vorjahre nach Saisonende falsch: ${vj}`);
  await page.click('.reiter-knopf[data-ansicht=feld]');
  if (name === 'handy') await page.locator('.felder-karte').screenshot({ path: `${OUT}/felder-${tag}.png` });
  if (name === 'handy') await page.locator('.extras').screenshot({ path: `${OUT}/sicherung-${tag}.png` });
  await ctx.close();
  return fehler;
}

// Meilenstein 4: Übernahme alter Daten, mehrere Felder, Sicherung, offline
async function handyApp(browser) {
  const fehler = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  page.on('pageerror', (e) => fehler.push(`app: ${e}`));
  const bereit = () => page.waitForFunction(() => document.querySelectorAll('#zone-wahl option').length > 1);
  // Daten aus Version 3 (ein Feld) liegen schon im Browser
  await page.goto(URL + 'manifest.webmanifest');
  await page.evaluate(() => {
    localStorage.setItem('fallahkalender.feld.v1', JSON.stringify({ roh: { name: 'Bir 1', zone: 'souss', vj0: 'tomate' } }));
    localStorage.setItem('fallahkalender.plan.v1', JSON.stringify({ kultur: 'paprika', start: '2026-10-01', erledigt: {} }));
  });
  await page.goto(URL);
  await bereit();
  if ((await page.textContent('#kopf-feld')) !== 'Bir 1') fehlt('Altes Feld nicht übernommen');
  const alt = await page.evaluate(() => localStorage.getItem('fallahkalender.feld.v1'));
  if (alt !== null) fehlt('Alter Schlüssel nicht aufgeräumt');
  // Zweites Feld anlegen und zurückwechseln
  await page.click('.reiter-knopf[data-ansicht=feld]');
  await page.click('#feld-neu');
  await bereit();
  if ((await page.locator('#feld-wahl option').count()) !== 2) fehlt('Neues Feld fehlt in der Auswahl');
  await page.fill('input[name=name]', 'Bir 2');
  await page.waitForTimeout(100);
  if ((await page.textContent('#feld-wahl option:checked')) !== 'Bir 2') fehlt('Feldname nicht in der Auswahl');
  await page.selectOption('#feld-wahl', { index: 0 });
  await bereit();
  if ((await page.inputValue('input[name=name]')) !== 'Bir 1') fehlt('Wechsel zum ersten Feld klappt nicht');
  if ((await page.inputValue('select[name=vj0]')) !== 'tomate') fehlt('Felddaten nach Wechsel falsch');
  // Sicherung herunterladen
  await page.click('.reiter-knopf[data-ansicht=feld]');
  const [laden] = await Promise.all([page.waitForEvent('download'), page.click('#sicher-export')]);
  const datei = path.join(OUT, '..', 'sicherung-test.json');
  await laden.saveAs(datei);
  const sich = JSON.parse(fs.readFileSync(datei, 'utf8'));
  if (sich.app !== 'fallahkalender' || !sich.daten['fallahkalender.felder']) fehlt('Sicherung unvollständig');
  // Offline: Service Worker aktiv, Seite lädt ohne Netz
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return Boolean(r.active); });
  if (!sw) fehlt('Service Worker nicht aktiv');
  await page.reload();
  await bereit();
  await ctx.setOffline(true);
  await page.reload();
  await bereit().catch(() => fehlt('App lädt offline nicht'));
  await ctx.setOffline(false);
  await ctx.close();

  // Sicherung in einem leeren Browser wiederherstellen
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  p2.on('dialog', (d) => d.accept());
  await p2.goto(URL);
  await p2.waitForFunction(() => document.querySelectorAll('#zone-wahl option').length > 1);
  await p2.setInputFiles('#sicher-import', datei);
  await p2.waitForFunction(() => document.querySelector('#kopf-feld').textContent === 'Bir 1', null, { timeout: 5000 }).catch(() => fehlt('Wiederherstellen klappt nicht'));
  if ((await p2.locator('#feld-wahl option').count()) !== 2) fehlt('Nach Wiederherstellen nicht zwei Felder');
  // Falsche Datei wird abgelehnt
  fs.writeFileSync(datei, '{"etwas":"anderes"}');
  await p2.setInputFiles('#sicher-import', datei);
  await p2.waitForFunction(() => document.querySelector('#sicher-status').textContent, null, { timeout: 5000 }).catch(() => fehlt('Falsche Sicherungsdatei nicht gemeldet'));
  fs.unlinkSync(datei);
  // Manifest gültig
  const m = await (await p2.request.get(URL + 'manifest.webmanifest')).json();
  if (!m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable')) fehlt('Manifest ohne Maskable-Symbol');
  await ctx2.close();
  return fehler;
}

// Meilenstein 5: eigene KI (gespielt) für Foto und Stimme
async function eigeneKi(browser) {
  const fehler = [];
  const wav = Buffer.alloc(8044); wav.write('RIFF', 0); wav.writeUInt32LE(8036, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(8000, 40);
  for (const code of ['dar', 'zgh']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript((c) => { try { localStorage.setItem('fallahkalender.sprache', JSON.stringify(c)); } catch {} }, code);
    let gesendet = null;
    let stimme = null;
    await ctx.route('**/api/status', (r) => r.fulfill({ json: { bild: true, stimmen: ['dar', 'zgh'] } }));
    await ctx.route('**/api/bild', async (r) => {
      gesendet = r.request().postDataJSON();
      await new Promise((x) => setTimeout(x, 300));
      r.fulfill({ json: { symptome: ['b-ringe', 'b-gelb-unten'], krankheit: 'duerrflecken', sicherheit: 'mittel', gesund: false, bildUnklar: false } });
    });
    await ctx.route('**/api/stimme', (r) => { stimme = r.request().postDataJSON(); r.fulfill({ body: wav, contentType: 'audio/wav' }); });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => fehler.push(`ki ${code}: ${e}`));
    await page.goto(URL);
    await page.waitForFunction(() => document.querySelectorAll('#zone-wahl option').length > 1);
    const knopf = page.locator('#ansicht-heute .titel-zeile .vorlesen');
    if (!(await knopf.count())) fehlt(`ki ${code}: kein Vorlese-Knopf mit eigener Stimme`);
    else {
      await knopf.click();
      await page.waitForTimeout(400);
      if (stimme?.sprache !== code || !stimme?.text) fehlt(`ki ${code}: Stimme nicht beim Server angefragt`);
      await knopf.click();
    }
    await page.click('.reiter-knopf[data-ansicht=befall]');
    await page.selectOption('#befall-kultur', 'tomate');
    await page.setInputFiles('#befall-foto', path.join(SRC, 'assets', 'icon-512.png'));
    await page.waitForSelector('#foto-vorschau:not([hidden])');
    await page.click('#befall-form button[type=submit]');
    await page.waitForSelector('.ki-karte');
    if (!gesendet?.foto?.startsWith('data:image/jpeg') || gesendet.kultur !== 'tomate') fehlt(`ki ${code}: Foto nicht richtig gesendet`);
    const erster = await page.locator('.befund-karte').first().getAttribute('data-krankheit');
    if (erster !== 'duerrflecken') fehlt(`ki ${code}: KI-Symptome nicht in der Rangliste (${erster})`);
    await textPruefen(page, `ki ${code}`);
    await page.screenshot({ path: `${OUT}/ki-befall-${code}.png`, fullPage: true });
    await ctx.close();
  }
  // Server meldet Fehler: Hinweis statt Absturz, Ergebnis aus den Symptomen bleibt
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/api/status', (r) => r.fulfill({ json: { bild: true, stimmen: [] } }));
  await ctx.route('**/api/bild', (r) => r.fulfill({ status: 503, json: { fehler: 'ki' } }));
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => document.querySelectorAll('#zone-wahl option').length > 1);
  await page.click('.reiter-knopf[data-ansicht=befall]');
  await page.selectOption('#befall-kultur', 'tomate');
  await page.check('input[name=symptom][value=b-ringe]');
  await page.setInputFiles('#befall-foto', path.join(SRC, 'assets', 'icon-512.png'));
  await page.waitForSelector('#foto-vorschau:not([hidden])');
  await page.click('#befall-form button[type=submit]');
  await page.waitForFunction(() => { const h = document.querySelector('#befund .hinweis-box[role=status]'); return h && !h.classList.contains('ki-laeuft'); }, null, { timeout: 5000 }).catch(() => fehlt('KI-Fehler nicht gemeldet'));
  if (!(await page.locator('.befund-karte').count())) fehlt('Ergebnis fehlt bei KI-Fehler');
  await ctx.close();
  return fehler;
}

(async () => {
  // Eigener Server ohne erreichbare KI (Port 9): die App muss wie bisher ohne KI laufen
  const srv = spawn('python3', [path.join(__dirname, '..', 'server', 'server.py'), '--port', String(PORT)], { stdio: 'ignore', env: { ...process.env, FK_OLLAMA: 'http://127.0.0.1:9', FK_STIMMEN: '/nicht/da.json', FK_LEISE: '1' } });
  await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch();
  const neu = browser.newContext.bind(browser);
  browser.newContext = async (o) => { const c = await neu(o); await wetterNachbilden(c); return c; };
  const fehler = [];
  const geraete = [['handy', { width: 390, height: 844 }], ['pc', { width: 1440, height: 900 }]];
  try {
    for (const code of ['ar', 'fr']) {
      for (const scheme of ['light', 'dark']) {
        for (const [name, vp] of geraete) fehler.push(...await ablauf(browser, code, name, vp, scheme, true));
      }
    }
    for (const code of ['dar', 'zgh']) {
      for (const [name, vp] of geraete) fehler.push(...await ablauf(browser, code, name, vp, 'light', false));
    }
    // Ohne gespeicherte Wahl startet die App auf Arabisch; Wechsel über das Auswahlfeld
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForFunction(() => document.querySelectorAll('#sprache-wahl option').length === 4);
    if ((await page.evaluate(() => document.documentElement.lang)) !== 'ar') fehlt('Standardsprache ist nicht Arabisch');
    await page.selectOption('#sprache-wahl', 'fr');
    await page.waitForFunction(() => document.documentElement.lang === 'fr', null, { timeout: 5000 }).catch(() => fehlt('Sprachwechsel auf Französisch klappt nicht'));
    await ctx.close();
    fehler.push(...await handyApp(browser));
    fehler.push(...await eigeneKi(browser));
  } finally {
    await browser.close();
    srv.kill();
  }
  if (fehler.length) { ok = false; console.log('Konsolenfehler:', fehler); }
  console.log(ok ? 'UI-Test bestanden' : 'UI-Test fehlgeschlagen');
  process.exit(ok ? 0 : 1);
})();
