// Vorlesen: zuerst über die eigene Stimme vom Server (Darija, Tamazight …), sonst über die Stimme des Geräts.
import { t, info, sprache } from './i18n.js';
import { kiStimme, stimmeHolen } from './ki.js';

let aktiverKnopf = null;
let audio = null;
let auftrag = 0;

function stimmeFinden() {
  if (!('speechSynthesis' in window)) return null;
  const stimmen = window.speechSynthesis.getVoices();
  for (const code of info().stimme) {
    const v = stimmen.find((s) => s.lang.toLowerCase().replace('_', '-').startsWith(code.toLowerCase()));
    if (v) return v;
  }
  return null;
}

const geraet = () => 'speechSynthesis' in window && info().stimme.length > 0;

export function kannVorlesen() {
  return kiStimme(sprache()) || geraet();
}

function textVon(element) {
  const kopie = element.cloneNode(true);
  for (const x of kopie.querySelectorAll('button, select, input, textarea, .sr, .vorlesen, [hidden], [aria-hidden="true"]')) x.remove();
  return kopie.textContent.replace(/\s+/g, ' ').trim();
}

function stopp() {
  auftrag++;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (audio) { audio.pause(); URL.revokeObjectURL(audio.src); audio = null; }
  if (aktiverKnopf) {
    aktiverKnopf.setAttribute('aria-pressed', 'false');
    aktiverKnopf.querySelector('.vl-text').textContent = t('vorlesen');
    aktiverKnopf = null;
  }
}

// Knopf, der den Text des Ziels vorliest; zweiter Druck hält an.
export function vorleseKnopf(ziel) {
  if (!kannVorlesen()) return null;
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'vorlesen';
  knopf.setAttribute('aria-pressed', 'false');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const pfad = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pfad.setAttribute('d', 'M4 9v6h4l5 4V5L8 9zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12');
  svg.append(pfad);
  const text = document.createElement('span');
  text.className = 'vl-text';
  text.textContent = t('vorlesen');
  knopf.append(svg, text);
  knopf.addEventListener('click', () => {
    const war = aktiverKnopf === knopf;
    stopp();
    if (war) return;
    const element = typeof ziel === 'function' ? ziel() : ziel;
    const inhalt = element ? textVon(element) : '';
    if (!inhalt) return;
    aktiverKnopf = knopf;
    knopf.setAttribute('aria-pressed', 'true');
    if (kiStimme(sprache())) {
      eigeneStimme(knopf, inhalt);
      return;
    }
    geraetSprechen(knopf, inhalt);
  });
  return knopf;
}

// Kurze Stille als WAV: wird sofort beim Tippen abgespielt, damit Handys das spätere Abspielen erlauben.
function stille() {
  const b = new DataView(new ArrayBuffer(46));
  const txt = (o, x) => [...x].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
  txt(0, 'RIFF'); b.setUint32(4, 38, true); txt(8, 'WAVEfmt '); b.setUint32(16, 16, true);
  b.setUint16(20, 1, true); b.setUint16(22, 1, true); b.setUint32(24, 8000, true); b.setUint32(28, 16000, true);
  b.setUint16(32, 2, true); b.setUint16(34, 16, true); txt(36, 'data'); b.setUint32(40, 2, true);
  return URL.createObjectURL(new Blob([b.buffer], { type: 'audio/wav' }));
}

async function eigeneStimme(knopf, inhalt) {
  const nr = ++auftrag;
  const text = knopf.querySelector('.vl-text');
  text.textContent = t('vorlesen.laedt');
  knopf.classList.add('laedt');
  const spieler = new Audio(stille());
  audio = spieler;
  spieler.play().catch(() => { /* egal */ });
  try {
    const url = await stimmeHolen(sprache(), inhalt);
    knopf.classList.remove('laedt');
    if (nr !== auftrag) { URL.revokeObjectURL(url); return; }
    URL.revokeObjectURL(spieler.src);
    spieler.src = url;
    spieler.addEventListener('ended', () => { if (aktiverKnopf === knopf && audio === spieler) stopp(); });
    text.textContent = t('vorlesen.stopp');
    await spieler.play();
  } catch {
    knopf.classList.remove('laedt');
    if (nr !== auftrag) return;
    if (geraet()) geraetSprechen(knopf, inhalt); else stopp();
  }
}

function geraetSprechen(knopf, inhalt) {
  {
    if (audio) { audio.pause(); audio = null; }
    const text = knopf.querySelector('.vl-text');
    const satz = new SpeechSynthesisUtterance(inhalt);
    const stimme = stimmeFinden();
    satz.lang = stimme?.lang ?? info().stimme[0];
    if (stimme) satz.voice = stimme;
    satz.rate = 0.9;
    satz.addEventListener('end', () => { if (aktiverKnopf === knopf) stopp(); });
    satz.addEventListener('error', () => { if (aktiverKnopf === knopf) stopp(); });
    text.textContent = t('vorlesen.stopp');
    window.speechSynthesis.speak(satz);
    if (!stimme && sprache() !== 'fr') document.dispatchEvent(new CustomEvent('vorlesen-hinweis'));
  }
}

export function vorlesenStoppen() {
  stopp();
}
