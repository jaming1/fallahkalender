"""Test des eigenen Servers mit einer gespielten Ollama-KI und einer gespielten Stimme.
Aufruf: python3 code/tests/server_test.py"""
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

CODE = Path(__file__).resolve().parent.parent
FOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k='
LETZTE = {}


class FalscheKI(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def antwort(self, daten):
        b = json.dumps(daten).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        self.antwort({'models': [{'name': 'testbild:latest'}]})

    def do_POST(self):
        LETZTE['anfrage'] = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        # Die KI nennt ein gültiges, ein erfundenes Symptom und eine gültige Ursache
        self.antwort({'message': {'content': json.dumps({'symptome': ['b-ringe', 'erfunden'], 'krankheit': 'duerrflecken', 'sicherheit': 'mittel', 'gesund': False, 'bildUnklar': False})}})


def anfrage(port, pfad, daten=None):
    req = urllib.request.Request(f'http://127.0.0.1:{port}{pfad}', data=json.dumps(daten).encode() if daten is not None else None,
                                 headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.headers.get('Content-Type'), r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get('Content-Type'), e.read()


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ki = ThreadingHTTPServer(('127.0.0.1', 0), FalscheKI)
        threading.Thread(target=cls.ki.serve_forever, daemon=True).start()
        cls.tmp = tempfile.TemporaryDirectory()
        stimme = Path(cls.tmp.name) / 'stimme.py'
        stimme.write_text('import sys,wave\nt=sys.stdin.read()\nw=wave.open(sys.argv[1],"wb");w.setnchannels(1);w.setsampwidth(2);w.setframerate(8000);w.writeframes(b"\\0\\0"*len(t));w.close()\n')
        stimmen = Path(cls.tmp.name) / 'stimmen.json'
        stimmen.write_text(json.dumps({'dar': {'aktiv': True, 'befehl': [sys.executable, str(stimme), '{ausgabe}']}, 'zgh': {'aktiv': False, 'befehl': ['x']}}))
        cls.port = 8798
        env = {**os.environ, 'FK_OLLAMA': f'http://127.0.0.1:{cls.ki.server_port}', 'FK_BILD_MODELL': 'testbild', 'FK_STIMMEN': str(stimmen), 'FK_CACHE': str(Path(cls.tmp.name) / 'cache'), 'FK_LEISE': '1'}
        cls.srv = subprocess.Popen([sys.executable, str(CODE / 'server' / 'server.py'), '--port', str(cls.port)], env=env, stdout=subprocess.DEVNULL)
        for _ in range(50):
            try:
                anfrage(cls.port, '/api/status')
                break
            except OSError:
                time.sleep(0.1)

    @classmethod
    def tearDownClass(cls):
        cls.srv.terminate()
        cls.srv.wait()
        cls.ki.shutdown()
        cls.tmp.cleanup()

    def test_app_wird_ausgeliefert(self):
        code, art, inhalt = anfrage(self.port, '/')
        self.assertEqual(code, 200)
        self.assertIn(b'app.js', inhalt)
        code, art, _ = anfrage(self.port, '/manifest.webmanifest')
        self.assertEqual(art, 'application/manifest+json')

    def test_kein_zugriff_ausserhalb(self):
        code, _, _ = anfrage(self.port, '/../server/server.py')
        self.assertNotEqual(code, 200)

    def test_status(self):
        code, _, inhalt = anfrage(self.port, '/api/status')
        self.assertEqual(json.loads(inhalt), {'bild': True, 'stimmen': ['dar']})

    def test_bild_nur_bekannte_ids(self):
        code, _, inhalt = anfrage(self.port, '/api/bild', {'kultur': 'tomate', 'foto': FOTO})
        self.assertEqual(code, 200)
        x = json.loads(inhalt)
        self.assertEqual(x['symptome'], ['b-ringe'])
        self.assertEqual(x['krankheit'], 'duerrflecken')
        msg = LETZTE['anfrage']['messages'][0]
        self.assertEqual(len(msg['images']), 1)
        self.assertNotIn('data:', msg['images'][0])
        self.assertIn('b-ringe', msg['content'])

    def test_bild_falsche_eingabe(self):
        self.assertEqual(anfrage(self.port, '/api/bild', {'kultur': 'gibtsnicht', 'foto': FOTO})[0], 400)
        self.assertEqual(anfrage(self.port, '/api/bild', {'kultur': 'tomate', 'foto': 'kein bild!'})[0], 400)

    def test_stimme(self):
        code, art, inhalt = anfrage(self.port, '/api/stimme', {'sprache': 'dar', 'text': 'السلام عليكم'})
        self.assertEqual(code, 200)
        self.assertEqual(art, 'audio/wav')
        self.assertTrue(inhalt.startswith(b'RIFF'))
        self.assertEqual(anfrage(self.port, '/api/stimme', {'sprache': 'zgh', 'text': 'ⴰⵣⵓⵍ'})[0], 404)


if __name__ == '__main__':
    unittest.main(verbosity=1)
