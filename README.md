# Fallahkalender

Web-App für Landwirte in Marokko: Aus Wasser-, Boden-, Lage- und Felddaten empfiehlt sie passende Kulturen, erstellt (ab Meilenstein 2) Anbauanleitung, Dünge- und Arbeitskalender bis zur Ernte und hilft (ab Meilenstein 3) bei Krankheiten.

**Stand:** Alle Meilensteine fertig (1–6). MS5: eigene Bild-KI und Stimmen auf deinem Mac, freie Fotos überall in der App (Feld, Empfehlung, Machbar machen, Hilfe & Förderung, Kalender mit Düngeplan und Fellah-/Anwāʾ-Kalender, Krankheitshilfe, Sprachen mit Vorlesen, Handy-App offline, mehrere Felder, Feldtagebuch, Drucken, Sicherung).

**Sprachen der App:** Arabisch (Standard), Français, الدارجة (Darija), ⵜⴰⵎⴰⵣⵉⵖⵜ (Tamazight, Entwurf). Umschalter oben rechts bzw. links. Knopf „Anhören“ liest jede Ansicht vor.

## Starten
1. Doppelklick auf `start.command` (Mac). Beim ersten Mal: Rechtsklick → „Öffnen“, weil macOS unbekannte Skripte blockiert.
2. Der Browser öffnet sich mit der App. Zum Beenden das Terminalfenster schließen.

Ohne Mac: im Ordner `code/server` `python3 server.py --port 8765` ausführen und `http://localhost:8765` öffnen (reiner Dateiserver geht auch, dann ohne KI und Server-Stimmen).

## Eigene KI und Stimmen (Mac, kostenlos)
Die App läuft auch ohne beides. Wenn der Server sie findet, erscheinen „Foto prüfen lassen“ im Befall und die Server-Stimme beim Vorlesen.
- **Bild-KI:** [Ollama](https://ollama.com) installieren, dann `ollama pull qwen2.5vl:7b`. `start.command` findet Ollama selbst. Auf einem Intel-Mac dauert ein Foto 2–3 Minuten; ein Mietserver mit Grafikkarte schafft es in Sekunden. Anderes Modell: Umgebungsvariable `FK_BILD_MODELL`.
- **Stimmen (Darija, Tamazight, Arabisch):** einmalig in `code/server`:
  `python3 -m venv .venv && .venv/bin/pip install "transformers>=4.40,<4.50" "numpy<2" torch uroman scipy`
  Welche Stimme für welche Sprache: `code/server/stimmen.json` (Vorlage `stimmen.beispiel.json`). Erzeugte Sätze werden in `code/server/cache` gespeichert.
- **Wichtig:** Die Stimmen-Modelle (Meta MMS, Darija-VITS) stehen unter **CC BY-NC 4.0**: nur nicht-kommerziell. Für einen Verkauf der App braucht es andere Stimmen.
- Tests: `python3 code/tests/server_test.py` (mit gespielter KI und Stimme).

## Fotos
117 freie Fotos (Wikimedia Commons, CC BY / CC BY-SA / gemeinfrei) zeigen Kulturen, Krankheiten, Anzeichen, Probleme, Maßnahmen, Regionen und Dünger. Nachweis unter jedem großen Foto und vollständig in „Hilfe“ → „Bildnachweise“. Austauschen: `code/werkzeuge/bilder_holen.py` lädt Kandidaten, `bilder_waehlen.py` übernimmt die gewählten nach `code/src/assets/bilder/` und schreibt `code/src/daten/bilder.json`.

## Aufs Handy legen
Die App ist eine installierbare Web-App (PWA) und läuft nach dem ersten Öffnen ohne Internet. Dafür muss sie über **HTTPS** erreichbar sein (z. B. kostenloses Hosting statischer Seiten); vom Mac über `start.command` geht das nur am Mac selbst. Dann im Handy-Browser öffnen:
- Android/Chrome: unter „Mein Feld“ auf „App installieren“ tippen (oder Menü → „Zum Startbildschirm hinzufügen“).
- iPhone/Safari: Teilen-Knopf → „Zum Home-Bildschirm“.

Neue Versionen lädt die App beim nächsten Öffnen im Hintergrund; ab dem übernächsten Öffnen sind sie sichtbar. Bei größeren Änderungen `VERSION` in `code/src/sw.js` erhöhen.

## Benutzen
- **Heute** (Startseite): Wetter der Woche, Fellah-Datum und Nawʾ, was jetzt bei Gemüse, Bäumen und Tieren ansteht (mit „heute passend / heute nicht“ nach Wetter), Tipp des Tages, Neuigkeiten.
- **Maschinen und Werkzeug** (über „Hilfe“ oder den Tipp des Tages): 12 Maschinen mit Bild, Zweck, Einstellungen, Einsatzzeit und Warnhinweisen.
- **Mein Feld:** Region, Fläche, Wasser, Boden und Vorgeschichte eintragen. Alles wird sofort auf dem Gerät gespeichert.
- **Was passt?:** Rangliste der 15 Kulturen mit Begründung. Antippen zeigt alle Gründe.
- **Machbar machen:** Bei jeder Kultur mit Problemen stehen Maßnahmen vom einfachsten zum schwierigsten, mit Kosten und Förderhinweis.
- **Hilfe & Förderung:** Ansprechpartner für deine Region, Ablauf eines Förderantrags, FDA-Sätze, zuständige Stellen. Nur zinsfreie Hilfen.
- **Kalender:** Bei einer Kultur „in den Kalender“ tippen. Es entsteht ein Plan vom Boden bis zur Ernte mit Düngemengen für deine Fläche, Aufgaben zum Abhaken, Fellah-Datum und Nawʾ bei jeder Aufgabe.
- **Wetter** (oben im Kalender): Vorhersage für 7 Tage am Ort des Feldes (GPS oder Region), Warnungen mit „Tun“ und „Lassen“, welche Arbeit an welchem Tag passt, Abgleich mit deinen Aufgaben, Krankheitsrisiko nach Wetter, Regen der nächsten 48 Stunden und Regenradar. Braucht Internet; ohne Netz erscheint der letzte Stand. Quellen: Open-Meteo (frei für nicht-kommerzielle Nutzung), RainViewer, OpenStreetMap.
- **Befall:** Kultur wählen, Symptome antippen, beschreiben, Foto. Die App nennt mögliche Ursachen mit Maßnahmen (zuerst biologisch, chemisch nur mit ONSSA-Zulassung und Wartezeit) und legt Nachkontrollen in den Kalender.
- **Mehrere Felder:** oben in „Mein Feld“ ein Feld wählen oder „Neues Feld“ anlegen. Plan, Befall und Tagebuch gehören jeweils zum Feld.
- **Feldtagebuch** (unten im Kalender): abgehakte Aufgaben und gemeldeter Befall stehen automatisch drin, eigene Notizen kommen dazu. „Saison beendet“ trägt die Kultur als Vorjahr ins Feld ein und schließt den Plan.
- **Drucken:** im Kalender „Plan drucken“ (oder als PDF speichern). Knöpfe und Menüs fallen dabei weg, alle Abschnitte werden aufgeklappt.
- **Sicherung:** unten in „Mein Feld“ alles in eine Datei speichern und auf einem anderen Gerät wiederherstellen.
- Tastatur: Alt+1 bis Alt+6 wechselt die Ansicht, Strg/Cmd+Enter zeigt die Empfehlung.

## Tests
- Rechenlogik: `cd code && node --test tests/*.test.mjs`
- Oberfläche mit Screenshots (braucht Playwright): `node code/tests/ui.test.cjs` → Bilder in `code/tests/screenshots/` (Arabisch und Französisch: Handy/PC, hell/dunkel, Druckansicht; Darija und Tamazight: Kurzrunde; dazu mehrere Felder, Übernahme alter Daten, Sicherung und Offline-Start)

## Daten erweitern
Kulturen in `code/src/daten/kulturen.json`, Klimazonen und Orte in `code/src/daten/zonen.json`, Maßnahmen in `massnahmen.json`, Anbaudaten und Nährstoffbedarf in `anbau.json`, Anwāʾ und Abschnitte in `fellah.json`, Krankheiten und Symptome in `krankheiten.json`, Förderungen und Stellen in `hilfe.json` (mit Quelle und Prüfmarke), Fotos in `bilder.json`, Jahresarbeiten (Bäume, Tiere, Tipps, Neuigkeiten) in `jahreslauf.json`, Maschinen in `maschinen.json`.

Texte und Übersetzungen: `code/src/sprachen/ar.json`, `fr.json`, `dar.json`, `zgh.json` (Teil `ui` = Oberfläche, Teil `daten` = übersetzte Fachdaten nach ID).

Dokumente: `docs/01_IDEE.md`, `docs/02_LASTENHEFT.md`, `docs/03_PLAN.md`, `docs/ENTSCHEIDUNGEN.md`
