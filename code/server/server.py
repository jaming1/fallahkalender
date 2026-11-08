#!/usr/bin/env python3
"""Fallahkalender-Server: liefert die App aus und verbindet sie mit der eigenen KI.

- Bild:   Ollama mit einem Bildmodell (Standard qwen2.5vl:7b) sucht sichtbare Symptome auf dem Foto.
- Stimme: Befehle aus stimmen.json erzeugen Sprache (z. B. Darija, Tamazight) als WAV.
Alles läuft auf dem eigenen Rechner. Nur Python-Standardbibliothek.

Start: python3 server.py [--port 8765] [--host 127.0.0.1]
Umgebung: FK_OLLAMA (http://127.0.0.1:11434), FK_BILD_MODELL (qwen2.5vl:7b)
"""
import argparse
import base64
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import threading
import urllib.error
import urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BASIS = Path(__file__).resolve().parent
SRC = BASIS.parent / 'src'
OLLAMA = os.environ.get('FK_OLLAMA', 'http://127.0.0.1:11434').rstrip('/')
BILD_MODELL = os.environ.get('FK_BILD_MODELL', 'qwen2.5vl:7b')
STIMMEN_DATEI = Path(os.environ.get('FK_STIMMEN', BASIS / 'stimmen.json'))
CACHE = Path(os.environ.get('FK_CACHE', BASIS / 'cache'))
MAX_ANFRAGE = 12 * 1024 * 1024
MAX_TEXT = 6000
SPRACHEN = {'ar', 'dar', 'fr', 'zgh'}
STIMME_SPERRE = threading.Lock()


def lade_json(pfad):
    with open(pfad, encoding='utf-8') as f:
        return json.load(f)


def stimmen():
    """Eingerichtete Stimmen: {sprache: {"befehl": [...], "aktiv": true}}."""
    try:
        roh = lade_json(STIMMEN_DATEI)
    except (OSError, ValueError):
        return {}
    return {k: v for k, v in roh.items() if k in SPRACHEN and isinstance(v, dict) and v.get('aktiv') and v.get('befehl')}


def ollama(pfad, daten=None, zeit=10):
    anfrage = urllib.request.Request(OLLAMA + pfad, data=json.dumps(daten).encode() if daten is not None else None,
                                     headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(anfrage, timeout=zeit) as antwort:
        return json.load(antwort)


def bild_bereit():
    try:
        namen = [m.get('name', '') for m in ollama('/api/tags', zeit=2).get('models', [])]
    except (OSError, ValueError, urllib.error.URLError):
        return False
    gesucht = BILD_MODELL if ':' in BILD_MODELL else BILD_MODELL + ':latest'
    return gesucht in namen


def kulturen_von(eintrag, kat, alle):
    ids = set()
    for k in eintrag['k']:
        if k == 'alle':
            ids.update(alle)
        elif k in kat['gruppenKulturen']:
            ids.update(kat['gruppenKulturen'][k])
        else:
            ids.add(k)
    return ids


def kandidaten(kultur_id):
    """Krankheiten und Symptome, die bei dieser Kultur vorkommen können."""
    kat = lade_json(SRC / 'daten' / 'krankheiten.json')
    kulturen = lade_json(SRC / 'daten' / 'kulturen.json')['kulturen']
    alle = [k['id'] for k in kulturen]
    kultur = next((k for k in kulturen if k['id'] == kultur_id), None)
    if not kultur:
        return None, [], []
    krankheiten = [kr for kr in kat['krankheiten'] if kultur_id in kulturen_von(kr, kat, alle)]
    s_ids = {s for kr in krankheiten for s in kr['s']}
    symptome = [s for s in kat['symptome'] if s['id'] in s_ids]
    return kultur, krankheiten, symptome


def bild_pruefen(kultur_id, foto):
    kultur, krankheiten, symptome = kandidaten(kultur_id)
    if not kultur:
        raise ValueError('kultur')
    if ',' in foto:
        foto = foto.split(',', 1)[1]
    base64.b64decode(foto, validate=True)
    s_liste = '\n'.join(f"- {s['id']}: {s['t']}" for s in symptome)
    k_liste = '\n'.join(f"- {kr['id']}: {kr['name']} ({kr.get('fr', '')})" for kr in krankheiten)
    frage = (
        f"You are an experienced agronomist in Morocco. The photo shows a {kultur['name']} plant or field "
        f"(German name). Look only at what is clearly visible.\n\n"
        f"1. Which of these symptoms are clearly visible? Use only these ids:\n{s_liste}\n\n"
        f"2. Which single cause fits best? Use one of these ids or null:\n{k_liste}\n\n"
        "3. How sure are you: hoch, mittel or niedrig. If the plant looks healthy, set gesund to true. "
        "If the photo does not show a plant clearly, set bildUnklar to true. Answer only with JSON."
    )
    schema = {
        'type': 'object',
        'properties': {
            'symptome': {'type': 'array', 'items': {'type': 'string'}},
            'krankheit': {'type': ['string', 'null']},
            'sicherheit': {'type': 'string', 'enum': ['hoch', 'mittel', 'niedrig']},
            'gesund': {'type': 'boolean'},
            'bildUnklar': {'type': 'boolean'},
        },
        'required': ['symptome', 'krankheit', 'sicherheit', 'gesund', 'bildUnklar'],
    }
    antwort = ollama('/api/chat', {
        'model': BILD_MODELL, 'stream': False, 'format': schema,
        'options': {'temperature': 0},
        'messages': [{'role': 'user', 'content': frage, 'images': [foto]}],
    }, zeit=300)
    inhalt = json.loads(antwort['message']['content'])
    erlaubt_s = {s['id'] for s in symptome}
    erlaubt_k = {kr['id'] for kr in krankheiten}
    gesehen = [s for s in dict.fromkeys(inhalt.get('symptome') or []) if s in erlaubt_s]
    vermutung = inhalt.get('krankheit') if inhalt.get('krankheit') in erlaubt_k else None
    return {
        'symptome': gesehen,
        'krankheit': vermutung,
        'sicherheit': inhalt.get('sicherheit') if inhalt.get('sicherheit') in ('hoch', 'mittel', 'niedrig') else 'niedrig',
        'gesund': bool(inhalt.get('gesund')) and not gesehen,
        'bildUnklar': bool(inhalt.get('bildUnklar')),
        'modell': BILD_MODELL,
    }


def stimme_erzeugen(sprache, text):
    eintrag = stimmen().get(sprache)
    if not eintrag:
        raise LookupError(sprache)
    text = ' '.join(text.split())[:MAX_TEXT]
    if not text:
        raise ValueError('text')
    CACHE.mkdir(exist_ok=True)
    schluessel = hashlib.sha256(json.dumps([sprache, eintrag['befehl'], text], ensure_ascii=False).encode()).hexdigest()
    ziel = CACHE / f'{schluessel}.wav'
    if ziel.exists():
        return ziel.read_bytes()
    with STIMME_SPERRE, tempfile.TemporaryDirectory() as tmp:
        aus = Path(tmp) / 'aus.wav'
        befehl = [str(x).replace('{ausgabe}', str(aus)).replace('{basis}', str(BASIS)) for x in eintrag['befehl']]
        subprocess.run(befehl, input=text.encode('utf-8'), cwd=BASIS, timeout=int(eintrag.get('zeit', 600)),
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        daten = aus.read_bytes()
    ziel.write_bytes(daten)
    return daten


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.webmanifest': 'application/manifest+json',
                      '.js': 'text/javascript', '.json': 'application/json'}

    def log_message(self, fmt, *args):
        if os.environ.get('FK_LEISE') != '1':
            super().log_message(fmt, *args)

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        if self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def senden(self, code, inhalt, art='application/json; charset=utf-8'):
        if not isinstance(inhalt, bytes):
            inhalt = json.dumps(inhalt, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', art)
        self.send_header('Content-Length', str(len(inhalt)))
        self.end_headers()
        self.wfile.write(inhalt)

    def do_GET(self):
        if self.path.split('?')[0] == '/api/status':
            return self.senden(200, {'bild': bild_bereit(), 'stimmen': sorted(stimmen())})
        if self.path.startswith('/api/'):
            return self.senden(404, {'fehler': 'unbekannt'})
        return super().do_GET()

    def do_POST(self):
        laenge = int(self.headers.get('Content-Length') or 0)
        if laenge <= 0 or laenge > MAX_ANFRAGE:
            return self.senden(413, {'fehler': 'groesse'})
        if 'application/json' not in (self.headers.get('Content-Type') or ''):
            return self.senden(415, {'fehler': 'art'})
        try:
            daten = json.loads(self.rfile.read(laenge))
        except ValueError:
            return self.senden(400, {'fehler': 'json'})
        pfad = self.path.split('?')[0]
        try:
            if pfad == '/api/bild':
                return self.senden(200, bild_pruefen(str(daten.get('kultur', '')), str(daten.get('foto', ''))))
            if pfad == '/api/stimme':
                return self.senden(200, stimme_erzeugen(str(daten.get('sprache', '')), str(daten.get('text', ''))), 'audio/wav')
        except LookupError:
            return self.senden(404, {'fehler': 'keine-stimme'})
        except (ValueError, KeyError, base64.binascii.Error):
            return self.senden(400, {'fehler': 'eingabe'})
        except (OSError, urllib.error.URLError, subprocess.SubprocessError) as e:
            sys.stderr.write(f'KI-Fehler: {e}\n')
            return self.senden(503, {'fehler': 'ki'})
        return self.senden(404, {'fehler': 'unbekannt'})


def main():
    p = argparse.ArgumentParser(description='Fallahkalender-Server')
    p.add_argument('--port', type=int, default=8765)
    p.add_argument('--host', default='127.0.0.1')
    a = p.parse_args()
    server = ThreadingHTTPServer((a.host, a.port), partial(Handler, directory=str(SRC)))
    print(f'Fallahkalender läuft auf http://localhost:{a.port}  (Bildmodell: {BILD_MODELL}, Stimmen: {", ".join(sorted(stimmen())) or "keine"})', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
