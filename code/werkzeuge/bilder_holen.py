#!/usr/bin/env python3
"""Holt freie Fotos von Wikimedia Commons als Kandidaten (Werkzeug, läuft einmalig auf dem Mac).

Aufruf: python3 bilder_holen.py [suchdatei.json]   → kandidaten/<id>/<n>.jpg und kandidaten/kandidaten.json
Ohne Argument: bilder_suche.json. Bestehende Einträge in kandidaten.json bleiben erhalten (werden zusammengeführt).
Nur Lizenzen, die Nutzung mit Namensnennung erlauben: CC0, Public Domain, CC BY, CC BY-SA (kein NC/ND).
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

HIER = Path(__file__).resolve().parent
ZIEL = HIER / 'kandidaten'
UA = 'Fallahkalender-Bildersuche/1.0 (privates Lernprojekt)'
API = 'https://commons.wikimedia.org/w/api.php'
ERLAUBT = re.compile(r'^(cc0|public domain|pd|cc by(-sa)?( \d\.\d)?|cc-by(-sa)?-\d\.\d)', re.I)


def holen(url, roh=False):
    for versuch in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as r:
                daten = r.read()
            return daten if roh else json.loads(daten)
        except Exception:  # Netz wackelt: kurz warten
            time.sleep(2 ** versuch)
    return None


def text(html):
    return re.sub(r'<[^>]+>', '', html or '').strip()


def suchen(begriff, anzahl=6):
    q = urllib.parse.urlencode({
        'action': 'query', 'format': 'json', 'generator': 'search', 'gsrnamespace': 6,
        'gsrsearch': f'{begriff} filetype:bitmap', 'gsrlimit': anzahl,
        'prop': 'imageinfo', 'iiprop': 'url|extmetadata|mime|size', 'iiurlwidth': 480})
    x = holen(f'{API}?{q}') or {}
    seiten = sorted((x.get('query', {}).get('pages', {}) or {}).values(), key=lambda p: p.get('index', 99))
    for p in seiten:
        ii = (p.get('imageinfo') or [{}])[0]
        meta = ii.get('extmetadata', {})
        lizenz = text(meta.get('LicenseShortName', {}).get('value'))
        if ii.get('mime') not in ('image/jpeg', 'image/png') or not ERLAUBT.match(lizenz) or re.search(r'\bNC\b|\bND\b', lizenz):
            continue
        if ii.get('width', 0) < 400:
            continue
        yield {
            'titel': p['title'], 'bild': ii.get('thumburl') or ii.get('url'), 'seite': ii.get('descriptionurl'),
            'lizenz': lizenz, 'lizenzUrl': text(meta.get('LicenseUrl', {}).get('value')),
            'autor': text(meta.get('Artist', {}).get('value'))[:120] or 'Wikimedia Commons',
            'beschreibung': text(meta.get('ImageDescription', {}).get('value'))[:200],
        }


def main():
    datei_suche = Path(sys.argv[1]) if len(sys.argv) > 1 else HIER / 'bilder_suche.json'
    suche = json.loads(datei_suche.read_text(encoding='utf-8'))
    ZIEL.mkdir(exist_ok=True)
    alt = ZIEL / 'kandidaten.json'
    ergebnis = json.loads(alt.read_text(encoding='utf-8')) if alt.exists() else {}
    for i, (eid, e) in enumerate(suche.items(), 1):
        gesehen, liste = set(), []
        for begriff in e['suche']:
            for k in suchen(begriff):
                if k['titel'] in gesehen or len(liste) >= 4:
                    continue
                gesehen.add(k['titel'])
                daten = holen(k['bild'], roh=True)
                if not daten:
                    continue
                (ZIEL / eid).mkdir(exist_ok=True)
                endung = '.png' if k['bild'].lower().endswith('.png') else '.jpg'
                datei = ZIEL / eid / f'{len(liste) + 1}{endung}'
                datei.write_bytes(daten)
                liste.append({**k, 'datei': str(datei.relative_to(ZIEL))})
            time.sleep(0.3)
        ergebnis[eid] = liste
        print(f'{i}/{len(suche)} {eid}: {len(liste)} Kandidaten', flush=True)
    (ZIEL / 'kandidaten.json').write_text(json.dumps(ergebnis, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
